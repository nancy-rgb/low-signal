import { createFileRoute, Link } from "@tanstack/react-router";
import { HELP_TYPES, requestsStore, useRequests } from "@/lib/requests-store";

export const Route = createFileRoute("/request/$id")({
  component: RequestDetail,
});

function RequestDetail() {
  const { id } = Route.useParams();
  const all = useRequests();
  const req = all.find((r) => r.id === id);

  if (!req) {
    return (
      <div className="mx-auto max-w-md p-4">
        <p>Request not found.</p>
        <Link to="/" className="text-sm underline">
          ← Home
        </Link>
      </div>
    );
  }

  const typeLabel = HELP_TYPES.find((t) => t.id === req.helpType)?.label;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background p-4">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Home
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{typeLabel}</h1>
      <StatusBadge status={req.status} />

      <div className="mt-4 space-y-2 rounded-md border border-input bg-card p-3 text-sm">
        <Row label="From" value={req.alias} />
        <Row label="Urgency" value={req.urgency} />
        <Row
          label="Location"
          value={
            req.location.label ||
            `${req.location.lat.toFixed(3)}, ${req.location.lng.toFixed(3)}`
          }
        />
        {req.notes && <Row label="Notes" value={req.notes} />}
        <Row
          label="Created"
          value={new Date(req.createdAt).toLocaleString()}
        />
      </div>

      {req.volunteer && (
        <div className="mt-4 space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
          <div className="font-medium">Volunteer matched</div>
          <Row label="Alias" value={req.volunteer.alias} />
          {req.volunteer.meetupType && (
            <Row label="Method" value={req.volunteer.meetupType} />
          )}
          {req.volunteer.meetupPoint && (
            <Row label="Meetup" value={req.volunteer.meetupPoint} />
          )}
          {req.volunteer.note && <Row label="Note" value={req.volunteer.note} />}
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-4">
        {req.status !== "completed" && req.status !== "cancelled" && (
          <>
            <button
              onClick={() => requestsStore.update(req.id, { status: "cancelled" })}
              className="flex-1 rounded-md border border-input px-4 py-3"
            >
              Cancel request
            </button>
            {req.status === "claimed" && (
              <button
                onClick={() =>
                  requestsStore.update(req.id, { status: "completed" })
                }
                className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
              >
                Mark complete
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-yellow-500/20 text-yellow-700",
    claimed: "bg-blue-500/20 text-blue-700",
    completed: "bg-green-500/20 text-green-700",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs capitalize ${colors[status]}`}
    >
      {status}
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
