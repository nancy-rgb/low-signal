// End-to-end encryption for request messages.
// Scheme: per-user long-term ECDH P-256 keypair.
//  - Public key: JWK, published to profiles.public_key (visible to authed users).
//  - Private key: JWK, stored only in this device's localStorage.
//  - Per-message: ECDH(my_priv, peer_pub) → HKDF-derived AES-GCM 256 → encrypt.
// Trade-offs (logged in BACKLOG): no forward secrecy yet (no ephemeral keys /
// double-ratchet), no PIN-wrapping of the private key on disk. Acceptable for
// v1; messages are still unreadable to the server, Supabase admins, and other
// users.

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { session, useSessionMode } from "@/lib/requests-store";

const PRIV_KEY_STORAGE = "lov_e2ee_priv_v1"; // legacy plaintext JWK
const PRIV_KEY_WRAPPED = "lov_e2ee_priv_v2"; // { v:2, iv, ct } — wrapped with PIN-derived AES key

interface WrappedPriv {
  v: 2;
  iv: string; // base64
  ct: string; // base64
}

// In-memory cache of the unwrapped private JWK, keyed by Supabase user id.
// Cleared on lock / duress / wipe / signout. Never written to disk.
const unlocked = new Map<string, JsonWebKey>();

// ---- key gen / storage ----

async function generateKeypair(): Promise<{ priv: JsonWebKey; pub: JsonWebKey }> {
  const kp = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pub = await crypto.subtle.exportKey("jwk", kp.publicKey);
  // strip private fields from pub for safety
  delete (pub as any).d;
  return { priv, pub };
}

function loadPlaintextPriv(userId: string): JsonWebKey | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PRIV_KEY_STORAGE}:${userId}`);
    return raw ? (JSON.parse(raw) as JsonWebKey) : null;
  } catch {
    return null;
  }
}

function savePlaintextPriv(userId: string, jwk: JsonWebKey) {
  localStorage.setItem(`${PRIV_KEY_STORAGE}:${userId}`, JSON.stringify(jwk));
}

function deletePlaintextPriv(userId: string) {
  localStorage.removeItem(`${PRIV_KEY_STORAGE}:${userId}`);
}

function loadWrappedPriv(userId: string): WrappedPriv | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PRIV_KEY_WRAPPED}:${userId}`);
    if (!raw) return null;
    const w = JSON.parse(raw) as WrappedPriv;
    return w?.v === 2 ? w : null;
  } catch {
    return null;
  }
}

function saveWrappedPriv(userId: string, w: WrappedPriv) {
  localStorage.setItem(`${PRIV_KEY_WRAPPED}:${userId}`, JSON.stringify(w));
}

function deleteWrappedPriv(userId: string) {
  localStorage.removeItem(`${PRIV_KEY_WRAPPED}:${userId}`);
}

// loadPrivJwk: prefer in-memory unlocked cache, then legacy plaintext on disk.
// Returns null when a wrapped key exists but the app is locked.
function loadPrivJwk(userId: string): JsonWebKey | null {
  const cached = unlocked.get(userId);
  if (cached) return cached;
  return loadPlaintextPriv(userId);
}

function savePrivJwk(userId: string, jwk: JsonWebKey) {
  // New keys land in the unlocked cache + appropriate slot based on PIN state.
  unlocked.set(userId, jwk);
  if (session.getActiveSlot() === "real" && session.getActiveKey()) {
    // PIN is set — wrap straight away.
    void wrapAndStore(userId, jwk, session.getActiveKey()!);
  } else {
    savePlaintextPriv(userId, jwk);
  }
}

async function importPriv(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"],
  );
}

async function importPub(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

// ---- ECDH → AES-GCM key ----

async function deriveAesKey(myPriv: CryptoKey, peerPub: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPub },
    myPriv,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ---- PIN-wrap helpers (uses the same AES-GCM key the app vault derives from
// the real PIN via PBKDF2 in src/lib/crypto.ts). The PIN itself never reaches
// this module — we only receive the already-derived CryptoKey.

async function wrapAndStore(userId: string, jwk: JsonWebKey, pinKey: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    pinKey,
    new TextEncoder().encode(JSON.stringify(jwk)) as BufferSource,
  );
  saveWrappedPriv(userId, { v: 2, iv: b64(iv), ct: b64(ct) });
}

async function unwrap(w: WrappedPriv, pinKey: CryptoKey): Promise<JsonWebKey> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(w.iv) as BufferSource },
    pinKey,
    unb64(w.ct) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(pt)) as JsonWebKey;
}

// Reconcile on-disk state with current PIN/session state. Idempotent; safe to
// call any time the session mode or active key changes.
export async function rebindE2EEToPin(userId: string): Promise<void> {
  const mode = session.getMode();
  if (mode === "locked" || mode === "duress") {
    unlocked.delete(userId);
    return;
  }
  const key = session.getActiveKey();
  const slot = session.getActiveSlot();
  const plain = loadPlaintextPriv(userId);
  const wrapped = loadWrappedPriv(userId);

  if (slot === "real" && key) {
    // PIN active. Ensure wrapped form on disk and cached in memory.
    if (plain && !wrapped) {
      await wrapAndStore(userId, plain, key);
      unlocked.set(userId, plain);
      deletePlaintextPriv(userId);
    } else if (wrapped && !unlocked.has(userId)) {
      try {
        unlocked.set(userId, await unwrap(wrapped, key));
      } catch (e) {
        console.warn("[e2ee] unwrap failed (wrong key?)", e);
      }
    } else if (plain && wrapped) {
      // Defensive: prefer wrapped, remove leftover plaintext.
      deletePlaintextPriv(userId);
    }
  } else {
    // No real PIN. If we still hold a wrapped blob and the unlocked JWK, write
    // it back as plaintext so a fresh session can still read messages.
    if (wrapped && unlocked.has(userId)) {
      savePlaintextPriv(userId, unlocked.get(userId)!);
      deleteWrappedPriv(userId);
    }
  }
}

// Hook: keep the e2ee private key in sync with the app PIN / lock state.
export function useBindE2EEToPin() {
  const { user } = useAuth();
  const mode = useSessionMode();
  useEffect(() => {
    if (!user) return;
    void rebindE2EEToPin(user.id);
  }, [user, mode]);
}

// ---- encode helpers ----

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---- ensure-keypair hook ----
// On sign-in: if no local priv key, generate; if profile.public_key is missing
// or stale, publish. Idempotent.
export function useEnsureKeypair() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const local = loadPrivJwk(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("public_key")
          .eq("id", user.id)
          .maybeSingle();
        const remotePub = profile?.public_key as JsonWebKey | null;

        if (local && remotePub) return; // already set up

        if (local && !remotePub) {
          // republish derived pub
          const privKey = await importPriv(local);
          // Re-export as pub by importing same JWK with d removed:
          const pubJwk = { ...local } as any;
          delete pubJwk.d;
          pubJwk.key_ops = [];
          await supabase
            .from("profiles")
            .update({ public_key: pubJwk })
            .eq("id", user.id);
          return;
        }

        // Generate fresh
        const { priv, pub } = await generateKeypair();
        savePrivJwk(user.id, priv);
        await supabase
          .from("profiles")
          .update({ public_key: pub as any })
          .eq("id", user.id);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[e2ee] keypair setup failed", e);
      }
    })();
  }, [user]);
}

// ---- peer public key fetching ----
export function usePeerPublicKey(peerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["pubkey", peerUserId],
    enabled: !!peerUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("public_key")
        .eq("id", peerUserId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.public_key as JsonWebKey | null) ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

// ---- encrypt / decrypt ----

const ENC_VERSION = 1;

export interface E2EEEnvelope {
  v: 1;
  iv: string; // base64
  ct: string; // base64
}

export function isE2EEEnvelope(s: string): boolean {
  return s.startsWith('{"v":1');
}

export async function encryptForPeer(
  myUserId: string,
  peerPubJwk: JsonWebKey,
  plaintext: string,
): Promise<string> {
  const privJwk = loadPrivJwk(myUserId);
  if (!privJwk) throw new Error("missing local private key");
  const myPriv = await importPriv(privJwk);
  const peerPub = await importPub(peerPubJwk);
  const aes = await deriveAesKey(myPriv, peerPub);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    aes,
    new TextEncoder().encode(plaintext) as BufferSource,
  );
  const env: E2EEEnvelope = { v: ENC_VERSION, iv: b64(iv), ct: b64(ct) };
  return JSON.stringify(env);
}

export async function decryptFromPeer(
  myUserId: string,
  peerPubJwk: JsonWebKey,
  envelopeJson: string,
): Promise<string> {
  const privJwk = loadPrivJwk(myUserId);
  if (!privJwk) throw new Error("missing local private key");
  const env = JSON.parse(envelopeJson) as E2EEEnvelope;
  if (env.v !== ENC_VERSION) throw new Error("unsupported version");
  const myPriv = await importPriv(privJwk);
  const peerPub = await importPub(peerPubJwk);
  const aes = await deriveAesKey(myPriv, peerPub);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(env.iv) as BufferSource },
    aes,
    unb64(env.ct) as BufferSource,
  );
  return new TextDecoder().decode(pt);
}

// ---- cache invalidation on signout / wipe ----
export function clearLocalE2EEKey(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PRIV_KEY_STORAGE}:${userId}`);
}
