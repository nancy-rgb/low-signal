import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import {
  HELP_TYPES,
  useAliases,
  useClaims,
  useDecideClaim,
  useRequest,
  useUpdateRequest,
} from "@/lib/data";

export const Route = createFileRoute("/request/$id")({ component: RequestDetail });

function RequestDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: req, isLoading } = useRequest(id);
  const { data: claims = [] } = useClaims(id);
  const aliasMap = useAliases([
    ...(req ? [req.requester_id] : []),
    ...claims.map((c) => c.volunteer_id),
  ]).data ?? {};
  const decide = useDecideClaim();
  const update = useUpdateRequest();

  if (isLoading) return <AppShell><div className="p-4 text-sm">Loading…</div></AppShell>;
  if (!req) {
    return (
      <AppShell>
        <div className="p-4">
          <p>Request not found.</p>
          <Link to="/" className="text-sm underline">← Home</Link>
        </div>
      </AppShell>
    );
  }

  const isOwner = req.requester_id === user?.id;
  const approvedClaim = claims.find((c) => c.status === "approved");
  const isApprovedVolunteer = approvedClaim?.volunteer_id === user?.id;
  const canSeeExact = isOwner || isApprovedVolunteer;
  const typeLabel = HELP_TYPES.find((t) => t.id === req.help_type)?.label;

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <div>
          <h1 className="text-xl font-semibold">{typeLabel}</h1>
          <StatusBadge status={req.status} />
        </div>

        <section className="space-y-2 rounded-md border border-input bg-card p-3 text-sm">
          <Row label="From" value={aliasMap[req.requester_id] ?? "—"} />
          <Row label="Urgency" value={req.urgency} />
          <Row
            label="Location"
            value={
              canSeeExact && req.lat_exact != null
                ? `${req.lat_exact.toFixed(5)}, ${req.lng_exact!.toFixed(5)}${req.area_label ? ` · ${req.area_label}` : ""}`
                : req.area_label ??
                  (req.lat_coarse != null
                    ? `~${req.lat_coarse.toFixed(2)}, ${req.lng_coarse!.toFixed(2)}`
                    : "Area not shared")
            }
          />
          {req.notes && <Row label="Notes" value={req.notes} />}
          <Row label="Created" value={new Date(req.created_at).toLocaleString()} />
          <Row label="Expires" value={new Date(req.expires_at).toLocaleString()} />
        </section>

        {/* Pending volunteer proposals */}
        {isOwner && claims.filter((c) => c.status === "pending").map((c) => (
          <section key={c.id} className="space-y-2 rounded-md border border-warning bg-warning/10 p-3 text-sm">
            <div className="font-medium">Volunteer proposal</div>
            <Row label="Alias" value={aliasMap[c.volunteer_id] ?? "—"} />
            {c.meetup_type && <Row label="Method" value={c.meetup_type} />}
            {c.meetup_point && <Row label="Meetup" value={c.meetup_point} />}
            {c.note && <Row label="Note" value={c.note} />}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() =>
                  decide.mutate({ claim_id: c.id, request_id: req.id, decision: "declined" })
                }
                className="flex-1 rounded-md border border-input px-3 py-2"
              >Decline</button>
              <button
                onClick={() =>
                  decide.mutate({ claim_id: c.id, request_id: req.id, decision: "approved" })
                }
                className="flex-1 rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground"
              >Approve &amp; reveal exact location</button>
            </div>
          </section>
        ))}

        {/* If you're a volunteer with a pending claim */}
        {!isOwner && claims.some((c) => c.volunteer_id === user?.id && c.status === "pending") && (
          <p className="rounded-md border border-input bg-card p-3 text-xs text-muted-foreground">
            Waiting for requester to approve your proposal.
          </p>
        )}

        {approvedClaim && (
          <section className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
            <div className="font-medium">Matched</div>
            <Row label="Volunteer" value={aliasMap[approvedClaim.volunteer_id] ?? "—"} />
            {approvedClaim.meetup_type && <Row label="Method" value={approvedClaim.meetup_type} />}
            {approvedClaim.meetup_point && <Row label="Meetup" value={approvedClaim.meetup_point} />}
          </section>
        )}

        {isOwner && !["completed", "cancelled", "expired"].includes(req.status) && (
          <div className="flex gap-2">
            <button
              onClick={() => update.mutate({ id: req.id, patch: { status: "cancelled" } })}
              className="flex-1 rounded-md border border-input px-4 py-3"
            >Cancel</button>
            {req.status === "claimed" && (
              <button
                onClick={() => update.mutate({ id: req.id, patch: { status: "completed" } })}
                className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
              >Mark complete</button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-warning/20 text-warning-foreground",
    pending_approval: "bg-warning/30 text-warning-foreground",
    claimed: "bg-accent/20 text-accent-foreground",
    completed: "bg-success/20 text-success-foreground",
    cancelled: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs ${map[status] ?? "bg-muted"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
