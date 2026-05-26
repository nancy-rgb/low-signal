import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPushToUser } from "./push.server";

// Exposes the VAPID public key to the client so it can subscribe.
// The public key is safe to expose (the private key stays server-side).
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
});

// Notify the OTHER participants on a request that a new message arrived.
// Called by the sender right after inserting a message. Auth-gated so we can
// confirm the caller is actually a participant.
export const notifyMessagePeers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ requestId: z.string().uuid() }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Confirm caller is a participant (RLS will also enforce this).
    const { data: req, error } = await supabase
      .from("requests")
      .select("id, requester_id, request_claims(volunteer_id, status)")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error || !req) return { delivered: 0 };

    const peers = new Set<string>();
    if (req.requester_id && req.requester_id !== userId) peers.add(req.requester_id);
    for (const c of (req.request_claims as Array<{ volunteer_id: string; status: string }> | null) ?? []) {
      if (c.status === "approved" && c.volunteer_id !== userId) peers.add(c.volunteer_id);
    }

    let delivered = 0;
    for (const peer of peers) {
      delivered += await sendPushToUser(peer, {
        title: "New message",
        body: "You have a new check-in message.",
        url: `/request/${data.requestId}`,
      });
    }
    return { delivered };
  });
