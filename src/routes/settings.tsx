import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { store, useStore } from "@/lib/requests-store";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const user = useStore((s) => s.user);
  const [alias, setAlias] = useState(user.alias);
  const [confirmWipe, setConfirmWipe] = useState(false);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="text-xl font-semibold">Me</h1>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Alias</div>
          <div className="flex gap-2">
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={32}
              placeholder="e.g. Blue Fox"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => store.setAlias(alias.trim())}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >Save</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Never use your real name. This is shown to people who help you.
          </p>
        </section>

        <section className="rounded-md border border-input bg-card p-3 text-sm">
          <div className="mb-2 font-medium">Groups</div>
          <p className="text-xs text-muted-foreground">
            You're in {user.groupIds.length} group{user.groupIds.length === 1 ? "" : "s"}.
          </p>
          <Link to="/groups" className="mt-2 inline-block rounded-md border border-input px-3 py-1.5 text-xs">
            Manage groups
          </Link>
        </section>

        <section className="rounded-md border border-destructive bg-destructive/5 p-3">
          <div className="mb-1 text-sm font-medium text-destructive">Panic wipe</div>
          <p className="text-xs text-muted-foreground">
            Erases all requests, offers, messages, groups, and your alias from this device. Cannot be undone.
          </p>
          {!confirmWipe ? (
            <button
              onClick={() => setConfirmWipe(true)}
              className="mt-2 w-full rounded-md border border-destructive px-3 py-2 text-sm text-destructive"
            >Wipe everything</button>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setConfirmWipe(false)}
                className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
              >Cancel</button>
              <button
                onClick={() => { store.wipe(); setConfirmWipe(false); setAlias(""); }}
                className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground"
              >Confirm wipe</button>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Prototype · local-only · v0.2
        </p>
      </div>
    </AppShell>
  );
}
