import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getVapidPublicKey } from "./push.functions";

// Cache the VAPID public key once fetched.
let vapidPublicCache: string | null | undefined;
async function loadVapidPublic(): Promise<string | null> {
  if (vapidPublicCache !== undefined) return vapidPublicCache;
  try {
    const { publicKey } = await getVapidPublicKey();
    vapidPublicCache = publicKey ?? null;
  } catch {
    vapidPublicCache = null;
  }
  return vapidPublicCache;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Avoid registering SW in iframes / Lovable preview to keep dev sane.
function shouldRegister(): boolean {
  if (!pushSupported()) return false;
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  const host = window.location.hostname;
  if (host.includes("lovable.app") && host.includes("id-preview")) return false;
  if (host.includes("lovableproject.com")) return false;
  return true;
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!shouldRegister()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.warn("SW register failed", e);
    return null;
  }
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string }; endpoint?: string };
  const endpoint = sub.endpoint;
  const p256dh = json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh"));
  const auth = json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth"));
  if (!endpoint || !p256dh || !auth) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
}

export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "Push not supported on this device/browser." };
  const vapidPublic = await loadVapidPublic();
  if (!vapidPublic) return { ok: false, reason: "Push not configured yet." };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Permission denied." };

  const reg = await ensureRegistration();
  if (!reg) return { ok: false, reason: "Service worker unavailable here." };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic).buffer as ArrayBuffer,
    });
  }
  await saveSubscription(sub);
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
}

export async function getPushStatus(): Promise<"unsupported" | "denied" | "granted" | "default"> {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as "granted" | "denied" | "default";
}

/** Silently refresh subscription on sign-in if user already opted in. */
export function usePushAutoResubscribe() {
  const { session } = useAuth();
  useEffect(() => {
    if (!session) return;
    if (!shouldRegister()) return;
    if (Notification.permission !== "granted") return;
    (async () => {
      const reg = await ensureRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) await saveSubscription(sub);
    })();
  }, [session]);
}
