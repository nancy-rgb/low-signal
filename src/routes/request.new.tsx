import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getCurrentLocation, type Coords } from "@/lib/geo";
import {
  HELP_TYPES,
  requestsStore,
  type HelpType,
} from "@/lib/requests-store";

export const Route = createFileRoute("/request/new")({
  component: NewRequest,
});

type Step = "locate" | "confirm" | "type" | "details" | "review";

function NewRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("locate");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locLabel, setLocLabel] = useState("");
  const [helpType, setHelpType] = useState<HelpType | null>(null);
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function locate() {
    setError("");
    setLoading(true);
    try {
      const c = await getCurrentLocation();
      setCoords(c);
      setStep("confirm");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    if (!coords || !helpType) return;
    const req = requestsStore.create({
      alias: alias.trim() || "Anonymous",
      helpType,
      urgency,
      notes: notes.trim(),
      location: { lat: coords.lat, lng: coords.lng, label: locLabel || undefined },
    });
    navigate({ to: "/request/$id", params: { id: req.id } });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background p-4">
      <header className="flex items-center justify-between py-3">
        <Link to="/" className="text-sm text-muted-foreground">
          ← Cancel
        </Link>
        <span className="text-xs text-muted-foreground">
          Step {["locate", "confirm", "type", "details", "review"].indexOf(step) + 1} of 5
        </span>
      </header>

      {error && (
        <div className="mb-3 rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === "locate" && (
        <section className="flex flex-1 flex-col gap-4">
          <h2 className="text-xl font-semibold">Share your location</h2>
          <p className="text-sm text-muted-foreground">
            Volunteers need an approximate location to reach you. You can adjust
            the label in the next step.
          </p>
          <button
            onClick={locate}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Locating…" : "Use my current location"}
          </button>
          <button
            onClick={() => {
              setCoords({ lat: 0, lng: 0 });
              setStep("confirm");
            }}
            className="text-sm text-muted-foreground underline"
          >
            Enter manually instead
          </button>
        </section>
      )}

      {step === "confirm" && coords && (
        <section className="flex flex-1 flex-col gap-4">
          <h2 className="text-xl font-semibold">Confirm location</h2>
          <div className="rounded-md border border-input bg-card p-3 text-sm">
            <div>Lat: {coords.lat.toFixed(5)}</div>
            <div>Lng: {coords.lng.toFixed(5)}</div>
            {coords.accuracy && (
              <div className="text-muted-foreground">
                Accuracy ±{Math.round(coords.accuracy)} m
              </div>
            )}
          </div>
          <label className="text-sm">
            <span className="mb-1 block">Area label (optional)</span>
            <input
              value={locLabel}
              onChange={(e) => setLocLabel(e.target.value)}
              placeholder="e.g. North district, near market"
              maxLength={80}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <div className="mt-auto flex gap-2">
            <button
              onClick={() => setStep("locate")}
              className="flex-1 rounded-md border border-input px-4 py-3"
            >
              Back
            </button>
            <button
              onClick={() => setStep("type")}
              className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
            >
              Confirm
            </button>
          </div>
        </section>
      )}

      {step === "type" && (
        <section className="flex flex-1 flex-col gap-3">
          <h2 className="text-xl font-semibold">What kind of help?</h2>
          <div className="flex flex-col gap-2">
            {HELP_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setHelpType(t.id);
                  setStep("details");
                }}
                className={`rounded-md border p-3 text-left ${
                  helpType === t.id
                    ? "border-primary bg-primary/10"
                    : "border-input bg-card"
                }`}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.hint}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("confirm")}
            className="mt-2 rounded-md border border-input px-4 py-3"
          >
            Back
          </button>
        </section>
      )}

      {step === "details" && (
        <section className="flex flex-1 flex-col gap-4">
          <h2 className="text-xl font-semibold">Details</h2>
          <label className="text-sm">
            <span className="mb-1 block">Alias (no real names)</span>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={32}
              placeholder="e.g. Blue Fox"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <div className="text-sm">
            <span className="mb-1 block">Urgency</span>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={`flex-1 rounded-md border px-3 py-2 capitalize ${
                    urgency === u
                      ? "border-primary bg-primary/10"
                      : "border-input"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <label className="text-sm">
            <span className="mb-1 block">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Anything volunteers should know. Avoid identifying info."
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <div className="mt-auto flex gap-2">
            <button
              onClick={() => setStep("type")}
              className="flex-1 rounded-md border border-input px-4 py-3"
            >
              Back
            </button>
            <button
              onClick={() => setStep("review")}
              className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
            >
              Review
            </button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section className="flex flex-1 flex-col gap-3">
          <h2 className="text-xl font-semibold">Review & send</h2>
          <div className="space-y-2 rounded-md border border-input bg-card p-3 text-sm">
            <Row label="Alias" value={alias || "Anonymous"} />
            <Row
              label="Help type"
              value={HELP_TYPES.find((t) => t.id === helpType)?.label ?? "—"}
            />
            <Row label="Urgency" value={urgency} />
            <Row
              label="Location"
              value={
                locLabel ||
                `${coords?.lat.toFixed(3)}, ${coords?.lng.toFixed(3)}`
              }
            />
            {notes && <Row label="Notes" value={notes} />}
          </div>
          <div className="mt-auto flex gap-2">
            <button
              onClick={() => setStep("details")}
              className="flex-1 rounded-md border border-input px-4 py-3"
            >
              Back
            </button>
            <button
              onClick={submit}
              className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
            >
              Send request
            </button>
          </div>
        </section>
      )}
    </div>
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
