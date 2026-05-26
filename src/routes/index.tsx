import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMyRequests, useMyGroups, useProfile } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lifeline — Mutual aid for activists" },
      { name: "description", content: "Request and offer mutual aid locally." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: profile } = useProfile();
  const { data: requests = [] } = useMyRequests();
  const { data: groups = [] } = useMyGroups();

  const myActive = requests.filter((r) =>
    ["open", "pending_approval", "claimed"].includes(r.status),
  );
  const needsApproval = myActive.filter((r) => r.status === "pending_approval");

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <header className="py-2">
          <h1 className="text-2xl font-bold">Lifeline</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {profile?.alias ?? "…"}
          </p>
        </header>

        {needsApproval.length > 0 && (
          <Link
            to="/request/$id"
            params={{ id: needsApproval[0].id }}
            className="rounded-md border border-primary bg-primary/10 p-3 text-sm"
          >
            <strong>Volunteer waiting.</strong> Tap to review.
          </Link>
        )}

        <Link
          to="/request/new"
          className="rounded-lg bg-primary px-4 py-6 text-center text-lg font-semibold text-primary-foreground"
        >
          Ask for help
        </Link>
        <Link
          to="/offers/new"
          className="rounded-lg border border-input bg-card px-4 py-4 text-center text-base font-medium"
        >
          Offer help / resources
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/requests" className="rounded-md border border-input bg-card p-3 text-sm">
            My requests
            <div className="text-xs text-muted-foreground">{myActive.length} active</div>
          </Link>
          <Link to="/groups" className="rounded-md border border-input bg-card p-3 text-sm">
            Groups
            <div className="text-xs text-muted-foreground">{groups.length} joined</div>
          </Link>
        </div>

        <div className="mt-2 rounded-md border border-input bg-muted/40 p-3 text-xs text-muted-foreground">
          <strong className="block text-foreground">Safety note</strong>
          Use aliases, never real names. Approve volunteers before sharing details.
        </div>
      </div>
    </AppShell>
  );
}
