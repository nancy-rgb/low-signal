import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OFFER_TYPES, store, useStore, formatLoc } from "@/lib/requests-store";

export const Route = createFileRoute("/offers")({
  component: Offers,
});

function Offers() {
  const offers = useStore((s) => s.offers);
  const userId = useStore((s) => s.user.id);

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Offers</h1>
          <Link to="/offers/new" className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
            + New
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          What people in your area can provide — shelter, transport, supplies, skills.
        </p>

        {offers.length === 0 && (
          <p className="text-sm text-muted-foreground">No offers yet.</p>
        )}

        <ul className="flex flex-col gap-2">
          {offers.map((o) => {
            const label = OFFER_TYPES.find((t) => t.id === o.offerType)?.label ?? o.offerType;
            const mine = o.createdBy === userId;
            return (
              <li key={o.id} className="rounded-md border border-input bg-card p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{label}</span>
                  {mine && (
                    <button
                      onClick={() => store.removeOffer(o.id)}
                      className="text-xs text-muted-foreground underline"
                    >Remove</button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {o.alias} · {formatLoc(o.location)} · expires {new Date(o.expiresAt).toLocaleString()}
                </div>
                {o.capacity && <div className="mt-1">Capacity: {o.capacity}</div>}
                {o.notes && <div className="mt-1 text-xs">{o.notes}</div>}
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
