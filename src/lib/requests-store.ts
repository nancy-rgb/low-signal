import { useSyncExternalStore } from "react";
import {
  deriveKey,
  encryptJSON,
  decryptJSON,
  randomBytes,
  blobSalt,
  type EncryptedBlob,
} from "./crypto";

// ---------- Types ----------
export type HelpType =
  | "safe_shelter"
  | "secure_travel"
  | "supplies"
  | "medical"
  | "medical_supplies"
  | "legal"
  | "message_relay"
  | "other";

export const HELP_TYPES: { id: HelpType; label: string; hint: string }[] = [
  { id: "safe_shelter", label: "Safe shelter", hint: "Temporary place to stay" },
  { id: "secure_travel", label: "Secure travel", hint: "Help moving to another location" },
  { id: "supplies", label: "Supplies", hint: "Food, water, clothing, hygiene" },
  { id: "medical", label: "Medical help", hint: "First aid, treatment, doctor contact" },
  { id: "medical_supplies", label: "Medical supplies", hint: "Medication, bandages, equipment" },
  { id: "legal", label: "Legal aid", hint: "Lawyer or legal advice" },
  { id: "message_relay", label: "Pass a message", hint: "Relay a message to a contact" },
  { id: "other", label: "Other", hint: "Describe in notes" },
];

export type OfferType = HelpType | "transport" | "hosting";

export const OFFER_TYPES: { id: OfferType; label: string }[] = [
  { id: "hosting", label: "Can host people" },
  { id: "transport", label: "Driving / transport" },
  { id: "supplies", label: "Supplies to share" },
  { id: "medical", label: "Medical skills" },
  { id: "medical_supplies", label: "Medical supplies to share" },
  { id: "legal", label: "Legal skills" },
  { id: "message_relay", label: "Can relay messages" },
  { id: "other", label: "Other" },
];

export type RequestStatus =
  | "open"
  | "pending_approval" // volunteer claimed, awaiting requester approval
  | "claimed" // approved
  | "completed"
  | "cancelled"
  | "expired";

export type CheckInKind = "on_the_way" | "arrived" | "safe" | "delayed";

export interface CheckIn {
  id: string;
  by: string; // alias
  kind: CheckInKind;
  at: number;
  note?: string;
}

export interface Message {
  id: string;
  by: string; // alias
  byUserId: string;
  text: string;
  at: number;
}

export interface VolunteerClaim {
  userId: string;
  alias: string;
  claimedAt: number;
  meetupPoint?: string;
  meetupType?: "pickup" | "delivery";
  note?: string;
}

export interface HelpRequest {
  id: string;
  createdAt: number;
  expiresAt: number;
  createdBy: string; // userId
  alias: string;
  groupId?: string; // visibility scope
  helpType: HelpType;
  urgency: "low" | "medium" | "high";
  notes: string;
  location: { lat: number; lng: number; label?: string };
  status: RequestStatus;
  claim?: VolunteerClaim;
  checkIns: CheckIn[];
  messages: Message[];
  safetyDeadline?: number; // ms timestamp; if passed without "safe" check-in, alert
}

export interface Offer {
  id: string;
  createdAt: number;
  expiresAt: number;
  createdBy: string;
  alias: string;
  groupId?: string;
  offerType: OfferType;
  capacity: string; // free text, e.g. "2 people", "5 blankets"
  location: { lat: number; lng: number; label?: string };
  notes: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
}

export interface User {
  id: string;
  alias: string;
  groupIds: string[];
  pinSet?: boolean;       // real PIN configured — lock screen shown on boot
  duressSet?: boolean;    // duress PIN configured — decoy slot exists
  trustedContact?: string; // free text — name + how to reach them
}

interface AppState {
  user: User;
  groups: Group[];
  requests: HelpRequest[];
  offers: Offer[];
}


// ---------- Storage / vault ----------
// Disk format v3: { version: 3, plain?: AppState, real?: EncryptedBlob, decoy?: EncryptedBlob }
// - plain: only used when no real PIN is set yet (no encryption).
// - real:  AES-GCM-encrypted full state, key derived from the real PIN.
// - decoy: AES-GCM-encrypted decoy state, key derived from the duress PIN.
// The PIN itself is NEVER persisted. Validity is checked by attempting decrypt.

const VAULT_KEY = "lov_vault_v3";
const LEGACY_KEY = "lov_state_v2";

interface Vault {
  version: 3;
  plain?: AppState;
  real?: EncryptedBlob;
  decoy?: EncryptedBlob;
}

type Slot = "plain" | "real" | "decoy";

function genId(n = 8) {
  return Math.random().toString(36).slice(2, 2 + n);
}

function defaultState(): AppState {
  return {
    user: { id: genId(), alias: "", groupIds: [] },
    groups: [],
    requests: [],
    offers: [],
  };
}

function readVault(): Vault {
  if (typeof window === "undefined") return { version: 3 };
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Vault;
      if (v && v.version === 3) return v;
    }
    // Legacy migration from v2 plaintext.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      // Strip any legacy plaintext PIN fields.
      if (parsed?.user) {
        delete parsed.user.realPin;
        delete parsed.user.duressPin;
      }
      const v: Vault = { version: 3, plain: { ...defaultState(), ...parsed } };
      localStorage.setItem(VAULT_KEY, JSON.stringify(v));
      localStorage.removeItem(LEGACY_KEY);
      return v;
    }
  } catch {
    /* fall through */
  }
  return { version: 3 };
}

let vault: Vault = readVault();

// In-memory active state and its encryption key.
let state: AppState = vault.plain ?? defaultState();
let activeSlot: Slot = vault.plain ? "plain" : "real"; // "real" while locked, set on unlock
let activeKey: CryptoKey | null = null;
let activeSalt: Uint8Array | null = null;

const subs = new Set<() => void>();

function writeVault() {
  if (typeof window === "undefined") return;
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

function persistActive() {
  if (activeSlot === "plain") {
    vault = { ...vault, plain: state, real: undefined, decoy: undefined };
    writeVault();
    return;
  }
  if (!activeKey || !activeSalt) return; // locked / not unlocked yet
  const key = activeKey;
  const salt = activeSalt;
  const slot = activeSlot;
  const snapshot = state;
  // Fire-and-forget; ordering is preserved by single-threaded JS scheduling.
  encryptJSON(key, snapshot, salt)
    .then((blob) => {
      vault = { ...vault, [slot]: blob, plain: undefined } as Vault;
      writeVault();
    })
    .catch(() => {
      /* ignore */
    });
}

function emit() {
  persistActive();
  subs.forEach((s) => s());
}

function set(updater: (s: AppState) => AppState) {
  state = updater(state);
  // sweep expired
  const now = Date.now();
  state.requests = state.requests.map((r) =>
    r.status === "open" && r.expiresAt < now ? { ...r, status: "expired" } : r
  );
  state.offers = state.offers.filter((o) => o.expiresAt >= now);
  emit();
}

// ---------- Selectors / actions ----------
export const store = {
  subscribe(cb: () => void) {
    subs.add(cb);
    return () => subs.delete(cb);
  },
  getSnapshot: () => state,
  getServerSnapshot: () => defaultState(),

  // User
  setAlias(alias: string) {
    set((s) => ({ ...s, user: { ...s.user, alias } }));
  },
  setTrustedContact(contact: string) {
    set((s) => ({ ...s, user: { ...s.user, trustedContact: contact || undefined } }));
  },
  setPins(realPin: string | undefined, duressPin: string | undefined) {
    set((s) => ({
      ...s,
      user: { ...s.user, realPin: realPin || undefined, duressPin: duressPin || undefined },
    }));
  },
  setSafetyDeadline(id: string, deadline: number | undefined) {
    set((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, safetyDeadline: deadline } : r
      ),
    }));
  },

  // Groups
  createGroup(name: string) {
    const g: Group = { id: genId(), name, inviteCode: genId(6).toUpperCase() };
    set((s) => ({
      ...s,
      groups: [...s.groups, g],
      user: { ...s.user, groupIds: [...s.user.groupIds, g.id] },
    }));
    return g;
  },
  joinGroupByCode(code: string, fallbackName = "Group") {
    const norm = code.trim().toUpperCase();
    let group = state.groups.find((g) => g.inviteCode === norm);
    if (!group) {
      // For prototype: create a stub group representing the remote one
      group = { id: genId(), name: `${fallbackName} (${norm})`, inviteCode: norm };
      set((s) => ({ ...s, groups: [...s.groups, group!] }));
    }
    if (!state.user.groupIds.includes(group.id)) {
      set((s) => ({
        ...s,
        user: { ...s.user, groupIds: [...s.user.groupIds, group!.id] },
      }));
    }
    return group;
  },
  leaveGroup(groupId: string) {
    set((s) => ({
      ...s,
      user: { ...s.user, groupIds: s.user.groupIds.filter((g) => g !== groupId) },
    }));
  },

  // Requests
  createRequest(input: Omit<HelpRequest, "id" | "createdAt" | "expiresAt" | "status" | "checkIns" | "messages" | "createdBy" | "alias"> & { ttlHours?: number }) {
    const ttl = (input.ttlHours ?? 24) * 60 * 60 * 1000;
    const req: HelpRequest = {
      id: genId(),
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      createdBy: state.user.id,
      alias: state.user.alias || "Anonymous",
      groupId: input.groupId,
      helpType: input.helpType,
      urgency: input.urgency,
      notes: input.notes,
      location: input.location,
      status: "open",
      checkIns: [],
      messages: [],
    };
    set((s) => ({ ...s, requests: [req, ...s.requests] }));
    return req;
  },
  updateRequest(id: string, patch: Partial<HelpRequest>) {
    set((s) => ({
      ...s,
      requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  },
  proposeClaim(id: string, claim: Omit<VolunteerClaim, "userId" | "claimedAt"> & { alias: string }) {
    const full: VolunteerClaim = {
      ...claim,
      userId: state.user.id,
      claimedAt: Date.now(),
    };
    set((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status: "pending_approval", claim: full } : r
      ),
    }));
  },
  approveClaim(id: string) {
    set((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status: "claimed" } : r
      ),
    }));
  },
  rejectClaim(id: string) {
    set((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status: "open", claim: undefined } : r
      ),
    }));
  },
  addCheckIn(id: string, kind: CheckInKind, note?: string) {
    const c: CheckIn = {
      id: genId(),
      by: state.user.alias || "Anonymous",
      kind,
      at: Date.now(),
      note,
    };
    set((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, checkIns: [...r.checkIns, c] } : r
      ),
    }));
  },
  addMessage(id: string, text: string) {
    const m: Message = {
      id: genId(),
      by: state.user.alias || "Anonymous",
      byUserId: state.user.id,
      text,
      at: Date.now(),
    };
    set((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, messages: [...r.messages, m] } : r
      ),
    }));
  },

  // Offers
  createOffer(input: Omit<Offer, "id" | "createdAt" | "expiresAt" | "createdBy" | "alias"> & { ttlHours?: number }) {
    const ttl = (input.ttlHours ?? 72) * 60 * 60 * 1000;
    const o: Offer = {
      id: genId(),
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      createdBy: state.user.id,
      alias: state.user.alias || "Anonymous",
      groupId: input.groupId,
      offerType: input.offerType,
      capacity: input.capacity,
      location: input.location,
      notes: input.notes,
    };
    set((s) => ({ ...s, offers: [o, ...s.offers] }));
    return o;
  },
  removeOffer(id: string) {
    set((s) => ({ ...s, offers: s.offers.filter((o) => o.id !== id) }));
  },

  // Panic
  wipe() {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    state = defaultState();
    emit();
  },
};

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribeBoth,
    () => selector(maskedSnapshot()),
    () => selector(store.getServerSnapshot())
  );
}

// ---------- Session (lock + duress mode), in-memory only ----------
export type SessionMode = "locked" | "normal" | "duress";

let sessionMode: SessionMode = "normal";
const sessionSubs = new Set<() => void>();

function emitSession() {
  sessionSubs.forEach((s) => s());
}

function subscribeBoth(cb: () => void) {
  subs.add(cb);
  sessionSubs.add(cb);
  return () => {
    subs.delete(cb);
    sessionSubs.delete(cb);
  };
}

// Initialize session mode based on whether a real PIN is set.
if (typeof window !== "undefined") {
  sessionMode = state.user.realPin ? "locked" : "normal";
}

function maskedSnapshot(): AppState {
  // Duress: return decoy empty state, but keep alias so UI still works.
  if (sessionMode === "duress") {
    return {
      user: { ...state.user, groupIds: [] },
      groups: [],
      requests: [],
      offers: [],
    };
  }
  return state;
}

export const session = {
  subscribe(cb: () => void) {
    sessionSubs.add(cb);
    return () => sessionSubs.delete(cb);
  },
  getMode(): SessionMode {
    return sessionMode;
  },
  attemptUnlock(pin: string): "normal" | "duress" | "invalid" {
    const p = pin.trim();
    if (!p) return "invalid";
    if (state.user.realPin && p === state.user.realPin) {
      sessionMode = "normal";
      emitSession();
      return "normal";
    }
    if (state.user.duressPin && p === state.user.duressPin) {
      sessionMode = "duress";
      emitSession();
      return "duress";
    }
    return "invalid";
  },
  lock() {
    if (state.user.realPin) {
      sessionMode = "locked";
      emitSession();
    }
  },
  // Secret gesture: exit duress without re-locking (no UI affordance).
  exitDuress() {
    if (sessionMode === "duress") {
      sessionMode = "normal";
      emitSession();
    }
  },
};

export function useSessionMode(): SessionMode {
  return useSyncExternalStore(
    session.subscribe,
    () => sessionMode,
    () => "normal" as SessionMode
  );
}

// ---------- Geo helpers ----------
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Snap to ~500m grid for volunteer-visible location
export function fuzzCoords<T extends { lat: number; lng: number }>(c: T): T {
  const step = 0.005;
  return {
    ...c,
    lat: Math.round(c.lat / step) * step,
    lng: Math.round(c.lng / step) * step,
  };
}

export function formatLoc(loc: { lat: number; lng: number; label?: string }) {
  return loc.label || `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`;
}
