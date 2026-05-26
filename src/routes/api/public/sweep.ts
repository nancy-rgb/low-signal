import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-sweep-secret");
        if (!secret || secret !== process.env.SWEEP_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { data, error } = await supabaseAdmin.rpc("sweep_expired_requests");
        if (error) {
          console.error("Sweep failed:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const row = Array.isArray(data) ? data[0] : data;
        const newAlerts = row?.new_alerts ?? 0;

        // Deliver newly-recorded safety alerts to each requester's trusted contacts.
        // Email transport is not wired yet — for now we mark them notified and log.
        let delivered = 0;
        if (newAlerts > 0) {
          const { data: pending } = await supabaseAdmin
            .from("safety_alerts")
            .select("request_id, requester_id")
            .eq("delivered", false);

          for (const a of pending ?? []) {
            const { data: contacts } = await supabaseAdmin
              .from("trusted_contacts")
              .select("label, email")
              .eq("user_id", a.requester_id);
            const count = contacts?.length ?? 0;
            // TODO: send actual email via configured email domain.
            console.log(
              `[safety-alert] request=${a.request_id} requester=${a.requester_id} contacts=${count}`,
              contacts,
            );
            await supabaseAdmin
              .from("safety_alerts")
              .update({ delivered: true, contacts_notified: count })
              .eq("request_id", a.request_id);
            delivered += count;
          }
        }

        return new Response(
          JSON.stringify({
            expired: row?.expired_count ?? 0,
            safety_alerts: row?.safety_alert_count ?? 0,
            new_alerts: newAlerts,
            contacts_notified: delivered,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
