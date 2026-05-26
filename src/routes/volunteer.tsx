import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getCurrentLocation, type Coords } from "@/lib/geo";
import {
  HELP_TYPES,
  distanceKm,
  fuzzCoords,
  useStore,
} from "@/lib/requests-store";

export const Route = createFileRoute("/volunteer")({
  component: VolunteerHome,
});

function VolunteerHome() {
  const user = useStore((s) => s.user);
  const allRequests = useStore((s) => s.requests);
  const [me, setMe] = useState<Coords | null>(null);
  const [radius, setRadius] = useState(25);
  const [err, setErr] = useState("");
  const [scope, setScope] = useState<"groups" | "all">(
    user.groupIds.length ? "groups" : "all"
  );

  useEffect(() => {
    getCurrentLocation().then(setMe).catch((e) => setErr(e.message));
  }, []);

  const open = allRequests.filter((r) => {
    if (r.status !== "open") return false;
    if (r.createdBy === user.id) return false;
    if (scope === "groups") {
      return r.groupId && user.groupIds.includes(r.groupId);
    }
    return !r.groupId; // "all" only shows public requests
  });

  const list = me
    ? open
        .map((r) => ({ r, km: distanceKm(me, r.location) }))
        .filter((x) => x.km <= radius)
        .sort((a, b) => a.km - b.km)
    : open.map((r) => ({ r, km: NaN }));

  return (
    <AppShell>
      <div className="flex flex-col p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="mt-2 text-xl font-semibold">Nearby requests</h1>
        <p className="text-xs text-muted-foreground">
          {me
            ? `Your location: ${me.lat.toFixed(3)}, ${me.lng.toFixed(3)}`
            : err
              ? `Location error: ${err}`
              : "Locating…"}
        </p>

        <div className="mt-3 flex gap-2 text-xs">
          <button
            onClick={() => setScope("groups")}
            className={`flex-1 rounded-md border px-3 py-2 ${scope === "groups" ? "border-primary bg-primary/10" : "border-input"}`}
          >My groups ({user.groupIds.length})</button>
          <button
            onClick={() => setScope("all")}
            className={`flex-1 rounded-md border px-3 py-2 ${scope === "all" ? "border-primary bg-primary/10" : "border-input"}`}
          >Public</button>
        </div>

        <label className="mt-3 text-sm">
          Radius: {radius} km
          <input type="range" min={1} max={200} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full" />
        </label>

        <ul className="mt-2 flex flex-col gap-2">
          {list.length === 0 && (
            <li className="text-sm text-muted-foreground">No open requests in range.</li>
          )}
          {list.map(({ r, km }) => {
            const fuzzy = fuzzCoords(r.location);
            return (
              <li key={r.id}>
                <Link
                  to="/volunteer/$id"
                  params={{ id: r.id }}
                  className="block rounded-md border border-input bg-card p-3"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {HELP_TYPES.find((t) => t.id === r.helpType)?.label}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">{r.urgency}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.location.label ?? `~${fuzzy.lat.toFixed(2)}, ${fuzzy.lng.toFixed(2)}`}
                    {!Number.isNaN(km) && ` · ~${km.toFixed(1)} km`}
                  </div>
                  {r.notes && <div className="mt-1 line-clamp-2 text-xs">{r.notes}</div>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
