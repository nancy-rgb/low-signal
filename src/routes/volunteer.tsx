import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getCurrentLocation, type Coords } from "@/lib/geo";
import {
  HELP_TYPES,
  distanceKm,
  skillMatchesHelpType,
  useMyGroups,
  useProfile,
  useVisibleOpenRequests,
  type Skill,
} from "@/lib/data";

export const Route = createFileRoute("/volunteer")({ component: VolunteerHome });

function VolunteerHome() {
  const { data: groups = [] } = useMyGroups();
  const [me, setMe] = useState<Coords | null>(null);
  const [radius, setRadius] = useState(25);
  const [err, setErr] = useState("");
  const [scope, setScope] = useState<"groups" | "public">("groups");

  useEffect(() => {
    getCurrentLocation().then(setMe).catch((e) => setErr(e.message));
  }, []);

  const { data: open = [] } = useVisibleOpenRequests({
    scope,
    groupIds: groups.map((g) => g.id),
  });

  const list = me
    ? open
        .map((r) => ({
          r,
          km:
            r.lat_coarse != null
              ? distanceKm(me, { lat: r.lat_coarse, lng: r.lng_coarse! })
              : NaN,
        }))
        .filter((x) => Number.isNaN(x.km) || x.km <= radius)
        .sort((a, b) => (Number.isNaN(a.km) ? 1 : Number.isNaN(b.km) ? -1 : a.km - b.km))
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
          >My groups ({groups.length})</button>
          <button
            onClick={() => setScope("public")}
            className={`flex-1 rounded-md border px-3 py-2 ${scope === "public" ? "border-primary bg-primary/10" : "border-input"}`}
          >Public</button>
        </div>

        <label className="mt-3 text-sm">
          Radius: {radius} km
          <input type="range" min={1} max={200} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full" />
        </label>

        {mySkills.length > 0 && (
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={skillOnly}
              onChange={(e) => setSkillOnly(e.target.checked)}
              className="h-4 w-4"
            />
            Match my skills ({mySkills.join(", ")})
          </label>
        )}


        <ul className="mt-2 flex flex-col gap-2">
          {list.length === 0 && (
            <li className="text-sm text-muted-foreground">No open requests in range.</li>
          )}
          {list.map(({ r, km }) => (
            <li key={r.id}>
              <Link
                to="/volunteer/$id"
                params={{ id: r.id }}
                className="block rounded-md border border-input bg-card p-3"
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {HELP_TYPES.find((t) => t.id === r.help_type)?.label}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">{r.urgency}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.area_label ??
                    (r.lat_coarse != null
                      ? `~${r.lat_coarse.toFixed(2)}, ${r.lng_coarse!.toFixed(2)}`
                      : "Area not shared")}
                  {!Number.isNaN(km) && ` · ~${km.toFixed(1)} km`}
                </div>
                {r.notes && <div className="mt-1 line-clamp-2 text-xs">{r.notes}</div>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
