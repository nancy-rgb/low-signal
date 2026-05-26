import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getCurrentLocation, type Coords } from "@/lib/geo";
import { OFFER_TYPES, store, useStore, type OfferType } from "@/lib/requests-store";

export const Route = createFileRoute("/offers/new")({
  component: NewOffer,
});

function NewOffer() {
  const navigate = useNavigate();
  const groups = useStore((s) => s.groups.filter((g) => s.user.groupIds.includes(g.id)));
  const [offerType, setOfferType] = useState<OfferType>("hosting");
  const [capacity, setCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locLabel, setLocLabel] = useState("");
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "");
  const [ttlHours, setTtlHours] = useState(72);
  const [err, setErr] = useState("");

  async function locate() {
    try { setCoords(await getCurrentLocation()); } catch (e) { setErr((e as Error).message); }
  }

  function submit() {
    if (!coords) { setErr("Set a location first"); return; }
    store.createOffer({
      offerType,
      capacity: capacity.trim(),
      notes: notes.trim(),
      location: { lat: coords.lat, lng: coords.lng, label: locLabel || undefined },
      groupId: groupId || undefined,
      ttlHours,
    });
    navigate({ to: "/offers" });
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <Link to="/offers" className="text-sm text-muted-foreground">← Cancel</Link>
        <h1 className="text-xl font-semibold">Offer help</h1>
        {err && <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">{err}</div>}

        <label className="text-sm">
          <span className="mb-1 block">Type</span>
          <select value={offerType} onChange={(e) => setOfferType(e.target.value as OfferType)} className="w-full rounded-md border border-input bg-background px-3 py-2">
            {OFFER_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block">Capacity</span>
          <input value={capacity} onChange={(e) => setCapacity(e.target.value)} maxLength={80} placeholder="e.g. 2 people, 5 blankets, driving north Tue" className="w-full rounded-md border border-input bg-background px-3 py-2" />
        </label>

        <div className="text-sm">
          <span className="mb-1 block">Location</span>
          {coords ? (
            <div className="rounded-md border border-input bg-card p-2 text-xs">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </div>
          ) : (
            <button onClick={locate} className="w-full rounded-md border border-input px-3 py-2">Use current location</button>
          )}
          <input value={locLabel} onChange={(e) => setLocLabel(e.target.value)} placeholder="Area label (optional)" maxLength={80} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2" />
        </div>

        <label className="text-sm">
          <span className="mb-1 block">Visible to</span>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2">
            <option value="">Any nearby</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block">Expires after</span>
          <select value={ttlHours} onChange={(e) => setTtlHours(+e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2">
            <option value={24}>1 day</option>
            <option value={72}>3 days</option>
            <option value={168}>1 week</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2" />
        </label>

        <button onClick={submit} className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">Publish offer</button>
      </div>
    </AppShell>
  );
}
