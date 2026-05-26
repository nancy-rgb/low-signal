import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { OFFER_TYPES, useCreateOffer, useMyGroups } from "@/lib/data";

export const Route = createFileRoute("/offers/new")({ component: NewOffer });

function NewOffer() {
  const navigate = useNavigate();
  const { data: groups = [] } = useMyGroups();
  const create = useCreateOffer();
  const [offerType, setOfferType] = useState<string>("hosting");
  const [description, setDescription] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (!description.trim()) {
      setErr("Add a short description");
      return;
    }
    try {
      await create.mutateAsync({
        offer_type: offerType,
        description: description.trim(),
        area_label: areaLabel.trim() || undefined,
        group_id: groupId || undefined,
      });
      navigate({ to: "/offers" });
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <Link to="/offers" className="text-sm text-muted-foreground">← Cancel</Link>
        <h1 className="text-xl font-semibold">Offer help</h1>
        {err && <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">{err}</div>}

        <label className="text-sm">
          <span className="mb-1 block">Type</span>
          <select value={offerType} onChange={(e) => setOfferType(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2">
            {OFFER_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. 2 beds for short-term stays, driving north Tuesdays"
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block">Area label (optional)</span>
          <input
            value={areaLabel}
            onChange={(e) => setAreaLabel(e.target.value)}
            maxLength={80}
            placeholder="e.g. North district"
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block">Visible to</span>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2">
            <option value="">Any signed-in user</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>

        <button
          onClick={submit}
          disabled={create.isPending}
          className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {create.isPending ? "Publishing…" : "Publish offer"}
        </button>
      </div>
    </AppShell>
  );
}
