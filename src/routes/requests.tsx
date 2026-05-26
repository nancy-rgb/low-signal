import { createFileRoute, Link } from "@tanstack/react-router";
import { HELP_TYPES, useRequests } from "@/lib/requests-store";

export const Route = createFileRoute("/requests")({
  component: MyRequests,
});

function MyRequests() {
  const all = useRequests();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background p-4">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Home
      </Link>
      <h1 className="mt-2 text-xl font-semibold">My requests</h1>
      {all.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No requests yet.{" "}
          <Link to="/request/new" className="underline">
            Create one
          </Link>
          .
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
                  {HELP_TYPES.find((t) => t.id === r.helpType)?.label}
                </span>
                <span className="text-xs capitalize text-muted-foreground">
                  {r.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.location.label ||
                  `${r.location.lat.toFixed(2)}, ${r.location.lng.toFixed(2)}`}{" "}
                · {new Date(r.createdAt).toLocaleString()}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
