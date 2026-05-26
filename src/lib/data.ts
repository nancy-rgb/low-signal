import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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

export const OFFER_TYPES = [
  { id: "hosting", label: "Can host people" },
  { id: "transport", label: "Driving / transport" },
  { id: "supplies", label: "Supplies to share" },
  { id: "medical", label: "Medical skills" },
  { id: "medical_supplies", label: "Medical supplies to share" },
  { id: "legal", label: "Legal skills" },
  { id: "message_relay", label: "Can relay messages" },
  { id: "other", label: "Other" },
] as const;

export type RequestRow = {
  id: string;
  requester_id: string;
  group_id: string | null;
  help_type: HelpType;
  urgency: "low" | "medium" | "high";
  notes: string | null;
  area_label: string | null;
  lat_coarse: number | null;
  lng_coarse: number | null;
  lat_exact: number | null;
  lng_exact: number | null;
  status:
    | "open"
    | "pending_approval"
    | "claimed"
    | "completed"
    | "cancelled"
    | "expired";
  safety_deadline: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type ClaimRow = {
  id: string;
  request_id: string;
  volunteer_id: string;
  status: "pending" | "approved" | "declined" | "withdrawn";
  meetup_type: string | null;
  meetup_point: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

// ---------- Geo helpers ----------
export function coarsen(n: number) {
  // ~0.01° ≈ 1.1km
  return Math.round(n * 100) / 100;
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ---------- Auth-aware enabled flag ----------
function useUserId() {
  const { user } = useAuth();
  return user?.id ?? null;
}

// ---------- Profile ----------
export function useProfile() {
  const uid = useUserId();
  return useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (patch: { alias?: string }) => {
      if (!uid) throw new Error("not signed in");
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ---------- Groups ----------
export function useMyGroups() {
  const uid = useUserId();
  return useQuery({
    queryKey: ["groups", "mine", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(*)")
        .eq("user_id", uid!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.groups).filter(Boolean) as Array<{
        id: string;
        name: string;
        description: string | null;
        region_label: string | null;
        invite_code: string;
        created_by: string;
        created_at: string;
      }>;
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; region_label?: string }) => {
      if (!uid) throw new Error("not signed in");
      const { data, error } = await supabase
        .from("groups")
        .insert({ ...input, created_by: uid })
        .select()
        .single();
      if (error) throw error;
      // auto-join creator
      const { error: jErr } = await supabase
        .from("group_members")
        .insert({ group_id: data.id, user_id: uid, role: "coordinator" });
      if (jErr && !jErr.message.includes("duplicate")) throw jErr;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useJoinGroupByCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("join_group_by_code", {
        _code: code.toLowerCase().trim(),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!uid) throw new Error("not signed in");
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

// ---------- Requests ----------
export function useMyRequests() {
  const uid = useUserId();
  return useQuery({
    queryKey: ["requests", "mine", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("requester_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as RequestRow | null;
    },
  });
}

export function useVisibleOpenRequests(opts: {
  scope: "groups" | "public";
  groupIds: string[];
}) {
  const uid = useUserId();
  return useQuery({
    queryKey: ["requests", "visible", opts.scope, opts.groupIds.join(","), uid],
    enabled: !!uid,
    queryFn: async () => {
      let q = supabase
        .from("requests")
        .select("*")
        .in("status", ["open", "pending_approval"])
        .order("created_at", { ascending: false });
      if (opts.scope === "groups") {
        if (opts.groupIds.length === 0) return [];
        q = q.in("group_id", opts.groupIds);
      } else {
        q = q.is("group_id", null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as RequestRow[]).filter((r) => r.requester_id !== uid);
    },
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (input: {
      help_type: HelpType;
      urgency: "low" | "medium" | "high";
      notes?: string;
      area_label?: string;
      group_id?: string;
      lat?: number;
      lng?: number;
      ttl_hours: number;
      safety_deadline_minutes?: number;
    }) => {
      if (!uid) throw new Error("not signed in");
      const row: any = {
        requester_id: uid,
        help_type: input.help_type,
        urgency: input.urgency,
        notes: input.notes || null,
        area_label: input.area_label || null,
        group_id: input.group_id || null,
        expires_at: new Date(Date.now() + input.ttl_hours * 3600_000).toISOString(),
      };
      if (typeof input.lat === "number" && typeof input.lng === "number") {
        row.lat_exact = input.lat;
        row.lng_exact = input.lng;
        row.lat_coarse = coarsen(input.lat);
        row.lng_coarse = coarsen(input.lng);
      }
      if (input.safety_deadline_minutes) {
        row.safety_deadline = new Date(
          Date.now() + input.safety_deadline_minutes * 60_000,
        ).toISOString();
      }
      const { data, error } = await supabase
        .from("requests")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as RequestRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
}

export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<RequestRow> }) => {
      const { error } = await supabase
        .from("requests")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["request", v.id] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

// ---------- Claims ----------
export function useClaims(requestId: string) {
  return useQuery({
    queryKey: ["claims", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_claims")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClaimRow[];
    },
  });
}

export function useAliases(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  return useQuery({
    queryKey: ["aliases", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, alias")
        .in("id", ids);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.alias;
      return map;
    },
  });
}

export function useProposeClaim() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (input: {
      request_id: string;
      meetup_type?: "pickup" | "delivery";
      meetup_point?: string;
      note?: string;
    }) => {
      if (!uid) throw new Error("not signed in");
      const { data: claim, error } = await supabase
        .from("request_claims")
        .insert({
          request_id: input.request_id,
          volunteer_id: uid,
          meetup_type: input.meetup_type ?? null,
          meetup_point: input.meetup_point || null,
          note: input.note || null,
        })
        .select()
        .single();
      if (error) throw error;
      // bump request to pending_approval
      await supabase
        .from("requests")
        .update({ status: "pending_approval" })
        .eq("id", input.request_id);
      return claim;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["claims", v.request_id] });
      qc.invalidateQueries({ queryKey: ["request", v.request_id] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useDecideClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      claim_id: string;
      request_id: string;
      decision: "approved" | "declined";
    }) => {
      const { error } = await supabase
        .from("request_claims")
        .update({ status: input.decision })
        .eq("id", input.claim_id);
      if (error) throw error;
      await supabase
        .from("requests")
        .update({
          status: input.decision === "approved" ? "claimed" : "open",
        })
        .eq("id", input.request_id);
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["claims", v.request_id] });
      qc.invalidateQueries({ queryKey: ["request", v.request_id] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

// ---------- Offers ----------
export function useOffers() {
  const uid = useUserId();
  return useQuery({
    queryKey: ["offers", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateOffer() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (input: {
      offer_type: string;
      description: string;
      area_label?: string;
      group_id?: string;
    }) => {
      if (!uid) throw new Error("not signed in");
      const { error } = await supabase.from("offers").insert({
        offerer_id: uid,
        offer_type: input.offer_type,
        description: input.description,
        area_label: input.area_label || null,
        group_id: input.group_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
}

// ---------- Check-ins ----------
export type CheckInRow = {
  id: string;
  request_id: string;
  sender_id: string;
  kind: "on_the_way" | "arrived" | "delayed" | "safe" | "custom";
  note: string | null;
  created_at: string;
};

export function useCheckIns(requestId: string) {
  return useQuery({
    queryKey: ["check_ins", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CheckInRow[];
    },
  });
}

export function useSendCheckIn() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (input: {
      request_id: string;
      kind: CheckInRow["kind"];
      note?: string;
    }) => {
      if (!uid) throw new Error("not signed in");
      const { error } = await supabase.from("check_ins").insert({
        request_id: input.request_id,
        sender_id: uid,
        kind: input.kind,
        note: input.note || null,
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["check_ins", v.request_id] });
    },
  });
}

// ---------- Messages ----------
export type MessageRow = {
  id: string;
  request_id: string;
  sender_id: string;
  ciphertext: string;
  created_at: string;
};

export function useMessages(requestId: string) {
  return useQuery({
    queryKey: ["messages", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (input: {
      request_id: string;
      ciphertext: string;
    }) => {
      if (!uid) throw new Error("not signed in");
      const { error } = await supabase.from("messages").insert({
        request_id: input.request_id,
        sender_id: uid,
        ciphertext: input.ciphertext,
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["messages", v.request_id] });
    },
  });
}

// ---------- Realtime subscriptions ----------
export function useRealtimeRequest(requestId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!requestId) return;
    const ch = supabase
      .channel(`request:${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins", filter: `request_id=eq.${requestId}` },
        () => qc.invalidateQueries({ queryKey: ["check_ins", requestId] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", requestId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [requestId, qc]);
}

// ---------- Sign out ----------
export async function signOut() {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (user?.id) {
    const { clearLocalE2EEKey } = await import("@/lib/e2ee");
    clearLocalE2EEKey(user.id);
  }
}
