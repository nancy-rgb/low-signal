import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HELP_TYPES, useMyRequests } from "@/lib/data";

export const Route = createFileRoute("/requests")({ component: MyRequests });

function MyRequests() {
  const { data: all = [] } = useMyRequests();

  return (
    <AppShell>
      <div className="flex flex-col p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="mt-2 text-xl font-semibold">My requests</h1>
        {all.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            No requests yet. <Link to="/request/new" className="underline">Create one</Link>.
          </p>
        )}
        <ul className="mt-4 flex flex-col gap-2">
          {all.map((r) => (
            <li key={r.id}>
              <Link
                to="/request/$id"
                params={{ id: r.id }}
                className="block rounded-md border border-input bg-card p-3"
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {HELP_TYPES.find((t) => t.id === r.help_type)?.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.area_label ??
                    (r.lat_coarse != null
                      ? `~${r.lat_coarse.toFixed(2)}, ${r.lng_coarse!.toFixed(2)}`
                      : "—")}{" "}
                  · {new Date(r.created_at).toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
