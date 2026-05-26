import { useSyncExternalStore } from "react";

export type HelpType =
  | "safe_shelter"
  | "secure_travel"
  | "supplies"
  | "medical"
  | "legal"
  | "message_relay"
  | "other";

export const HELP_TYPES: { id: HelpType; label: string; hint: string }[] = [
  { id: "safe_shelter", label: "Safe shelter", hint: "Temporary place to stay" },
  { id: "secure_travel", label: "Secure travel", hint: "Help moving to another location" },
  { id: "supplies", label: "Supplies", hint: "Food, water, clothing, hygiene" },
  { id: "medical", label: "Medical", hint: "First aid, medication, doctor contact" },
  { id: "legal", label: "Legal aid", hint: "Lawyer or legal advice" },
  { id: "message_relay", label: "Pass a message", hint: "Relay a message to a contact" },
  { id: "other", label: "Other", hint: "Describe in notes" },
];

export type RequestStatus = "open" | "claimed" | "completed" | "cancelled";

export interface Volunteer {
  alias: string;
  claimedAt: number;
  meetupPoint?: string;
  meetupType?: "pickup" | "delivery";
  note?: string;
}

export interface HelpRequest {
  id: string;
  createdAt: number;
  alias: string;
  helpType: HelpType;
  urgency: "low" | "medium" | "high";
  notes: string;
  location: { lat: number; lng: number; label?: string };
  status: RequestStatus;
  volunteer?: Volunteer;
}

const KEY = "lov_help_requests_v1";

function read(): HelpRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

let cache: HelpRequest[] = read();
const subs = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(cache));
  }
  subs.forEach((s) => s());
}

export const requestsStore = {
  subscribe(cb: () => void) {
    subs.add(cb);
    return () => subs.delete(cb);
  },
  getSnapshot() {
    return cache;
  },
  getServerSnapshot() {
    return [] as HelpRequest[];
  },
  all() {
    return cache;
  },
  get(id: string) {
    return cache.find((r) => r.id === id);
  },
  create(r: Omit<HelpRequest, "id" | "createdAt" | "status">): HelpRequest {
    const req: HelpRequest = {
      ...r,
      id: Math.random().toString(36).slice(2, 10),
      createdAt: Date.now(),
      status: "open",
    };
    cache = [req, ...cache];
    emit();
    return req;
  },
  update(id: string, patch: Partial<HelpRequest>) {
    cache = cache.map((r) => (r.id === id ? { ...r, ...patch } : r));
    emit();
  },
  claim(id: string, v: Volunteer) {
    cache = cache.map((r) =>
      r.id === id ? { ...r, status: "claimed", volunteer: v } : r
    );
    emit();
  },
};

export function useRequests() {
  return useSyncExternalStore(
    requestsStore.subscribe,
    requestsStore.getSnapshot,
    requestsStore.getServerSnapshot
  );
}

// Haversine km
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
