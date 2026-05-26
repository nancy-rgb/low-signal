import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { HELP_TYPES, requestsStore, useRequests } from "@/lib/requests-store";

export const Route = createFileRoute("/volunteer/$id")({
  component: VolunteerAccept,
});

function VolunteerAccept() {
  const { id } = Route.useParams();
  const all = useRequests();
  const req = all.find((r) => r.id === id);
  const navigate = useNavigate();

  const [alias, setAlias] = useState("");
  const [meetupType, setMeetupType] = useState<"pickup" | "delivery">("pickup");
  const [meetupPoint, setMeetupPoint] = useState("");
  const [note, setNote] = useState("");

  if (!req) {
    return (
      <div className="mx-auto max-w-md p-4">
        <p>Request not found.</p>
        <Link to="/volunteer" className="text-sm underline">
          ← Back
        </Link>
      </div>
    );
  }

  function accept() {
    if (!req) return;
    requestsStore.claim(req.id, {
      alias: alias.trim() || "Volunteer",
      claimedAt: Date.now(),
      meetupType,
      meetupPoint: meetupPoint.trim(),
      note: note.trim(),
    });
    navigate({ to: "/volunteer" });
  }

  const isOpen = req.status === "open";
  const typeLabel = HELP_TYPES.find((t) => t.id === req.helpType)?.label;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background p-4">
      <Link to="/volunteer" className="text-sm text-muted-foreground">
        ← Back
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{typeLabel}</h1>
      <div className="mt-2 space-y-1 rounded-md border border-input bg-card p-3 text-sm">
        <div>
          <span className="text-muted-foreground">From: </span>
          {req.alias}
        </div>
        <div>
          <span className="text-muted-foreground">Urgency: </span>
          <span className="capitalize">{req.urgency}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Location: </span>
          {req.location.label ||
            `${req.location.lat.toFixed(3)}, ${req.location.lng.toFixed(3)}`}
        </div>
        {req.notes && (
          <div>
            <span className="text-muted-foreground">Notes: </span>
            {req.notes}
          </div>
        )}
      </div>

      {!isOpen ? (
        <p className="mt-4 text-sm text-muted-foreground">
          This request is no longer open ({req.status}).
        </p>
      ) : (
        <section className="mt-4 flex flex-1 flex-col gap-3">
          <h2 className="font-semibold">Confirm you can help</h2>
          <label className="text-sm">
            <span className="mb-1 block">Your alias</span>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={32}
              placeholder="e.g. Red Hawk"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>

          <div className="text-sm">
            <span className="mb-1 block">Method</span>
            <div className="flex gap-2">
              {(["pickup", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMeetupType(m)}
                  className={`flex-1 rounded-md border px-3 py-2 capitalize ${
                    meetupType === m
                      ? "border-primary bg-primary/10"
                      : "border-input"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pickup: requester comes to you. Delivery: you go to them.
            </p>
          </div>

          <label className="text-sm">
            <span className="mb-1 block">
              {meetupType === "pickup" ? "Pickup point" : "Delivery point"}
            </span>
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

          <button
            onClick={accept}
            className="mt-auto rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            Confirm & claim request
          </button>
        </section>
      )}
    </div>
  );
}
