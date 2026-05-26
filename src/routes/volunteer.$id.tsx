import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import {
  HELP_TYPES,
  useAliases,
  useClaims,
  useProposeClaim,
  useRequest,
} from "@/lib/data";

export const Route = createFileRoute("/volunteer/$id")({ component: VolunteerAccept });

function VolunteerAccept() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: req } = useRequest(id);
  const { data: claims = [] } = useClaims(id);
  const aliasMap = useAliases(req ? [req.requester_id] : []).data ?? {};
  const propose = useProposeClaim();
  const navigate = useNavigate();

  const [meetupType, setMeetupType] = useState<"pickup" | "delivery">("pickup");
  const [meetupPoint, setMeetupPoint] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  if (!req) {
    return (
      <AppShell>
        <div className="p-4">
          <p>Request not found.</p>
          <Link to="/volunteer" className="text-sm underline">← Back</Link>
        </div>
      </AppShell>
    );
  }

  const alreadyProposed = claims.some((c) => c.volunteer_id === user?.id);
  const isOpenish = ["open", "pending_approval"].includes(req.status);
  const typeLabel = HELP_TYPES.find((t) => t.id === req.help_type)?.label;

  async function send() {
    setErr("");
    try {
      await propose.mutateAsync({
        request_id: req!.id,
        meetup_type: meetupType,
        meetup_point: meetupPoint.trim() || undefined,
        note: note.trim() || undefined,
      });
      navigate({ to: "/request/$id", params: { id: req!.id } });
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <Link to="/volunteer" className="text-sm text-muted-foreground">← Back</Link>
        <h1 className="text-xl font-semibold">{typeLabel}</h1>

        <div className="space-y-1 rounded-md border border-input bg-card p-3 text-sm">
          <div><span className="text-muted-foreground">From: </span>{aliasMap[req.requester_id] ?? "—"}</div>
          <div><span className="text-muted-foreground">Urgency: </span><span className="capitalize">{req.urgency}</span></div>
          <div><span className="text-muted-foreground">Approx. area: </span>
            {req.area_label ??
              (req.lat_coarse != null
                ? `~${req.lat_coarse.toFixed(2)}, ${req.lng_coarse!.toFixed(2)}`
                : "—")}
          </div>
          {req.notes && <div><span className="text-muted-foreground">Notes: </span>{req.notes}</div>}
        </div>

        {!isOpenish ? (
          <p className="text-sm text-muted-foreground">No longer open ({req.status.replace("_", " ")}).</p>
        ) : alreadyProposed ? (
          <p className="text-sm">You've already sent a proposal. <Link to="/request/$id" params={{ id: req.id }} className="underline">View status</Link></p>
        ) : (
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Propose to help</h2>
            <p className="text-xs text-muted-foreground">
              The requester reviews your proposal before exact details are exchanged.
            </p>

            <div className="text-sm">
              <span className="mb-1 block">Method</span>
              <div className="flex gap-2">
                {(["pickup", "delivery"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMeetupType(m)}
                    className={`flex-1 rounded-md border px-3 py-2 capitalize ${meetupType === m ? "border-primary bg-primary/10" : "border-input"}`}
                  >{m}</button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Pickup: they come to you. Delivery: you go to them.</p>
            </div>

            <label className="text-sm">
              <span className="mb-1 block">Proposed meetup</span>
              <input
                value={meetupPoint}
                onChange={(e) => setMeetupPoint(e.target.value)}
                maxLength={120}
                placeholder="e.g. Bus stop on 5th, 18:00"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block">Message (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            {err && <p className="text-xs text-destructive">{err}</p>}

            <button
              onClick={send}
              disabled={propose.isPending}
              className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {propose.isPending ? "Sending…" : "Send proposal"}
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
