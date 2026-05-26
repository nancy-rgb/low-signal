import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getCurrentLocation, type Coords } from "@/lib/geo";
import { AppShell } from "@/components/AppShell";
import {
  HELP_TYPES,
  useCreateRequest,
  useMyGroups,
  useProfile,
  type HelpType,
} from "@/lib/data";

export const Route = createFileRoute("/request/new")({ component: NewRequest });

type Step = "locate" | "confirm" | "type" | "details" | "review";

function NewRequest() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: groups = [] } = useMyGroups();
  const createReq = useCreateRequest();

  const [step, setStep] = useState<Step>("locate");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locLabel, setLocLabel] = useState("");
  const [helpType, setHelpType] = useState<HelpType | null>(null);
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [ttlHours, setTtlHours] = useState(24);
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

  async function submit() {
    if (!coords || !helpType) return;
    try {
      const req = await createReq.mutateAsync({
        help_type: helpType,
        urgency,
        notes: notes.trim(),
        area_label: locLabel.trim() || undefined,
        group_id: groupId || undefined,
        lat: coords.lat,
        lng: coords.lng,
        ttl_hours: ttlHours,
      });
      navigate({ to: "/request/$id", params: { id: req.id } });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const stepIdx = ["locate", "confirm", "type", "details", "review"].indexOf(step);

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col p-4">
        <header className="flex items-center justify-between py-2">
          <Link to="/" className="text-sm text-muted-foreground">← Cancel</Link>
          <span className="text-xs text-muted-foreground">Step {stepIdx + 1} of 5</span>
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
              Volunteers see an approximate area until you approve them.
            </p>
            <button
              onClick={locate}
              disabled={loading}
              className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Locating…" : "Use my current location"}
            </button>
            <button
              onClick={() => { setCoords({ lat: 0, lng: 0 }); setStep("confirm"); }}
              className="text-sm text-muted-foreground underline"
            >
              Skip / enter area only
            </button>
          </section>
        )}

        {step === "confirm" && coords && (
          <section className="flex flex-1 flex-col gap-4">
            <h2 className="text-xl font-semibold">Confirm location</h2>
            <div className="rounded-md border border-input bg-card p-3 text-sm">
              <div>Lat: {coords.lat.toFixed(5)}</div>
              <div>Lng: {coords.lng.toFixed(5)}</div>
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
              <button onClick={() => setStep("locate")} className="flex-1 rounded-md border border-input px-4 py-3">Back</button>
              <button onClick={() => setStep("type")} className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">Confirm</button>
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
                  onClick={() => { setHelpType(t.id); setStep("details"); }}
                  className={`rounded-md border p-3 text-left ${helpType === t.id ? "border-primary bg-primary/10" : "border-input bg-card"}`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep("confirm")} className="mt-2 rounded-md border border-input px-4 py-3">Back</button>
          </section>
        )}

        {step === "details" && (
          <section className="flex flex-1 flex-col gap-4">
            <h2 className="text-xl font-semibold">Details</h2>

            <div className="text-sm">
              <span className="mb-1 block">Urgency</span>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    className={`flex-1 rounded-md border px-3 py-2 capitalize ${urgency === u ? "border-primary bg-primary/10" : "border-input"}`}
                  >{u}</button>
                ))}
              </div>
            </div>

            <label className="text-sm">
              <span className="mb-1 block">Visible to</span>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Any signed-in volunteer (broadest)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} (group)</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Scoping to a trusted group is safer.
              </span>
            </label>

            <label className="text-sm">
              <span className="mb-1 block">Auto-expire after</span>
              <select
                value={ttlHours}
                onChange={(e) => setTtlHours(+e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value={2}>2 hours</option>
                <option value={6}>6 hours</option>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Anything volunteers should know. Avoid identifying info."
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <div className="mt-auto flex gap-2">
              <button onClick={() => setStep("type")} className="flex-1 rounded-md border border-input px-4 py-3">Back</button>
              <button onClick={() => setStep("review")} className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">Review</button>
            </div>
          </section>
        )}

        {step === "review" && (
          <section className="flex flex-1 flex-col gap-3">
            <h2 className="text-xl font-semibold">Review &amp; send</h2>
            <div className="space-y-2 rounded-md border border-input bg-card p-3 text-sm">
              <Row label="Alias" value={profile?.alias ?? "Anonymous"} />
              <Row label="Help type" value={HELP_TYPES.find((t) => t.id === helpType)?.label ?? "—"} />
              <Row label="Urgency" value={urgency} />
              <Row label="Visible to" value={groups.find((g) => g.id === groupId)?.name ?? "Any signed-in"} />
              <Row label="Expires" value={`${ttlHours}h`} />
              <Row label="Location" value={locLabel || `${coords?.lat.toFixed(3)}, ${coords?.lng.toFixed(3)}`} />
              {notes && <Row label="Notes" value={notes} />}
            </div>
            <div className="mt-auto flex gap-2">
              <button onClick={() => setStep("details")} className="flex-1 rounded-md border border-input px-4 py-3">Back</button>
              <button
                onClick={submit}
                disabled={createReq.isPending}
                className="flex-1 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {createReq.isPending ? "Sending…" : "Send request"}
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
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
