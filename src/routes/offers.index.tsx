import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import {
  OFFER_TYPES,
  useAliases,
  useDeleteOffer,
  useOffers,
} from "@/lib/data";

export const Route = createFileRoute("/offers/")({ component: Offers });

function Offers() {
  const { data: offers = [] } = useOffers();
  const { user } = useAuth();
  const del = useDeleteOffer();
  const aliasMap = useAliases(offers.map((o: any) => o.offerer_id)).data ?? {};

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
          What people can provide — shelter, transport, supplies, skills.
        </p>

        {offers.length === 0 && (
          <p className="text-sm text-muted-foreground">No offers yet.</p>
        )}

        <ul className="flex flex-col gap-2">
          {offers.map((o: any) => {
            const label = OFFER_TYPES.find((t) => t.id === o.offer_type)?.label ?? o.offer_type;
            const mine = o.offerer_id === user?.id;
            return (
              <li key={o.id} className="rounded-md border border-input bg-card p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{label}</span>
                  {mine && (
                    <button
                      onClick={() => del.mutate(o.id)}
                      className="text-xs text-muted-foreground underline"
                    >Remove</button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {aliasMap[o.offerer_id] ?? "—"}
                  {o.area_label ? ` · ${o.area_label}` : ""}
                </div>
                {o.description && <div className="mt-1 text-xs">{o.description}</div>}
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
