import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lifeline — Mutual aid for activists" },
      {
        name: "description",
        content:
          "Request and offer mutual aid: shelter, secure travel, supplies, messages.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background p-4">
      <header className="py-6">
        <h1 className="text-2xl font-bold">Lifeline</h1>
        <p className="text-sm text-muted-foreground">
          Mutual aid for people on the ground.
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-3">
        <Link
          to="/request/new"
          className="rounded-lg bg-primary px-4 py-6 text-center text-lg font-semibold text-primary-foreground"
        >
          Ask for help
        </Link>
        <Link
          to="/volunteer"
          className="rounded-lg border border-input bg-card px-4 py-6 text-center text-lg font-semibold"
        >
          Volunteer to help
        </Link>
        <Link
          to="/requests"
          className="rounded-lg border border-input bg-card px-4 py-4 text-center text-sm"
        >
          My requests
        </Link>

        <div className="mt-6 rounded-md border border-input bg-muted/40 p-3 text-xs text-muted-foreground">
          <strong className="block text-foreground">Safety note</strong>
          This is a functional prototype. Data is stored on this device only. Do
          not use real identifying information.
        </div>
      </main>
    </div>
  );
}
