import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  HELP_TYPES,
  store,
  useStore,
  formatLoc,
  type CheckInKind,
} from "@/lib/requests-store";

export const Route = createFileRoute("/request/$id")({
  component: RequestDetail,
});

const CHECK_INS: { kind: CheckInKind; label: string }[] = [
  { kind: "on_the_way", label: "On the way" },
  { kind: "arrived", label: "Arrived" },
  { kind: "delayed", label: "Delayed" },
  { kind: "safe", label: "Safe" },
];

function RequestDetail() {
  const { id } = Route.useParams();
  const req = useStore((s) => s.requests.find((r) => r.id === id));
  const userId = useStore((s) => s.user.id);
  const [msg, setMsg] = useState("");

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

  const isOwner = req.createdBy === userId;
  const isVolunteer = req.claim?.userId === userId;
  const canParticipate = isOwner || isVolunteer;
  const typeLabel = HELP_TYPES.find((t) => t.id === req.helpType)?.label;

  function send() {
    if (!msg.trim()) return;
    store.addMessage(req!.id, msg.trim().slice(0, 500));
    setMsg("");
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <div>
          <h1 className="text-xl font-semibold">{typeLabel}</h1>
          <StatusBadge status={req.status} />
        </div>

        <section className="space-y-2 rounded-md border border-input bg-card p-3 text-sm">
          <Row label="From" value={req.alias} />
          <Row label="Urgency" value={req.urgency} />
          <Row
            label="Location"
            value={canParticipate ? formatLoc(req.location) : "Hidden until approved"}
          />
          {req.notes && <Row label="Notes" value={req.notes} />}
          <Row label="Created" value={new Date(req.createdAt).toLocaleString()} />
          <Row label="Expires" value={new Date(req.expiresAt).toLocaleString()} />
        </section>

        {/* Two-way approval */}
        {req.status === "pending_approval" && req.claim && (
          <section className="space-y-2 rounded-md border border-yellow-500 bg-yellow-500/10 p-3 text-sm">
            <div className="font-medium">Volunteer proposal</div>
            <Row label="Alias" value={req.claim.alias} />
            {req.claim.meetupType && <Row label="Method" value={req.claim.meetupType} />}
            {req.claim.meetupPoint && <Row label="Meetup" value={req.claim.meetupPoint} />}
            {req.claim.note && <Row label="Note" value={req.claim.note} />}
            {isOwner && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => store.rejectClaim(req.id)}
                  className="flex-1 rounded-md border border-input px-3 py-2"
                >Reject</button>
                <button
                  onClick={() => store.approveClaim(req.id)}
                  className="flex-1 rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground"
                >Approve & reveal details</button>
              </div>
            )}
            {isVolunteer && (
              <p className="text-xs text-muted-foreground">Waiting for requester to approve.</p>
            )}
          </section>
        )}

        {req.status === "claimed" && req.claim && (
          <section className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
            <div className="font-medium">Matched</div>
            <Row label="Volunteer" value={req.claim.alias} />
            {req.claim.meetupType && <Row label="Method" value={req.claim.meetupType} />}
            {req.claim.meetupPoint && <Row label="Meetup" value={req.claim.meetupPoint} />}
          </section>
        )}

        {/* Check-ins */}
        {canParticipate && (req.status === "claimed" || req.status === "pending_approval") && (
          <section className="space-y-2 rounded-md border border-input bg-card p-3">
            <div className="text-sm font-medium">Check in</div>
            <div className="grid grid-cols-2 gap-2">
              {CHECK_INS.map((c) => (
                <button
                  key={c.kind}
                  onClick={() => store.addCheckIn(req.id, c.kind)}
                  className="rounded-md border border-input px-3 py-2 text-sm"
                >{c.label}</button>
              ))}
            </div>
            {req.checkIns.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {[...req.checkIns].reverse().map((c) => (
                  <li key={c.id} className="text-muted-foreground">
                    {new Date(c.at).toLocaleTimeString()} · {c.by} · <span className="text-foreground">{c.kind.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Messages */}
        {canParticipate && (req.status === "claimed" || req.status === "pending_approval") && (
          <section className="rounded-md border border-input bg-card p-3">
            <div className="mb-2 text-sm font-medium">Messages</div>
            <ul className="mb-2 max-h-60 space-y-2 overflow-y-auto text-sm">
              {req.messages.length === 0 && (
                <li className="text-xs text-muted-foreground">No messages yet.</li>
              )}
              {req.messages.map((m) => (
                <li key={m.id} className={m.byUserId === userId ? "text-right" : ""}>
                  <div className="inline-block max-w-[85%] rounded-md bg-muted px-3 py-1.5 text-left">
                    <div className="text-[10px] text-muted-foreground">{m.by} · {new Date(m.at).toLocaleTimeString()}</div>
                    <div>{m.text}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                maxLength={500}
                placeholder="Message…"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button onClick={send} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Send</button>
            </div>
          </section>
        )}

        {/* Actions */}
        {isOwner && req.status !== "completed" && req.status !== "cancelled" && req.status !== "expired" && (
          <div className="flex gap-2">
            <button
              onClick={() => store.updateRequest(req.id, { status: "cancelled" })}
              className="flex-1 rounded-md border border-input px-4 py-3"
            >Cancel</button>
            {req.status === "claimed" && (
              <button
                onClick={() => store.updateRequest(req.id, { status: "completed" })}
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
  const colors: Record<string, string> = {
    open: "bg-yellow-500/20 text-yellow-700",
    pending_approval: "bg-orange-500/20 text-orange-700",
    claimed: "bg-blue-500/20 text-blue-700",
    completed: "bg-green-500/20 text-green-700",
    cancelled: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs ${colors[status]}`}>
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
