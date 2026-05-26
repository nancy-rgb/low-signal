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

        return new Response(JSON.stringify({ expired: data?.expired_count ?? 0, safety_alerts: data?.safety_alert_count ?? 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
