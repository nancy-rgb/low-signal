// Server-only Web Push delivery helper. Imported only from server functions
// and server routes. Uses @block65/webcrypto-web-push which works on the
// Cloudflare Workers runtime.
import { buildPushPayload, type PushMessage, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PushPayload = { title: string; body: string; url?: string };

function getVapid(): VapidKeys | null {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
}

/**
 * Send a push notification to every active subscription for a user.
 * Returns number of successful deliveries. Prunes dead endpoints (404/410).
 * Payload is intentionally minimal — no PII or message content.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  const vapid = getVapid();
  if (!vapid) {
    console.warn("[push] VAPID secrets not configured — skipping send");
    return 0;
  }

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) {
    console.error("[push] failed to load subscriptions", error);
    return 0;
  }
  if (!subs || subs.length === 0) return 0;

  const message: PushMessage = {
    data: JSON.stringify(payload),
    options: { ttl: 60 * 60 * 12, urgency: "high" },
  };

  let delivered = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      const subscription: PushSubscription = {
        endpoint: s.endpoint,
        expirationTime: null,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        const req = await buildPushPayload(message, subscription, vapid);
        const res = await fetch(subscription.endpoint, {
          method: req.method,
          headers: req.headers,
          body: new Uint8Array(req.body).buffer as ArrayBuffer,
        });
        if (res.status >= 200 && res.status < 300) {
          delivered += 1;
        } else if (res.status === 404 || res.status === 410) {
          dead.push(s.endpoint);
        } else {
          console.warn(`[push] ${res.status} from ${new URL(s.endpoint).host}`);
        }
      } catch (e) {
        console.warn("[push] send failed", e);
      }
    }),
  );

  if (dead.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", dead);
  }
  return delivered;
}
