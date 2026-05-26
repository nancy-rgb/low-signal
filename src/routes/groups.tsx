import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { store, useStore } from "@/lib/requests-store";

export const Route = createFileRoute("/groups")({
  component: Groups,
});

function Groups() {
  const user = useStore((s) => s.user);
  const groups = useStore((s) => s.groups);
  const mine = groups.filter((g) => user.groupIds.includes(g.id));
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="text-xl font-semibold">Groups / cells</h1>
        <p className="text-xs text-muted-foreground">
          Groups scope who sees your requests. Share the code only with people you trust.
        </p>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Your groups</div>
          {mine.length === 0 && (
            <p className="text-xs text-muted-foreground">Not in any group yet.</p>
          )}
          <ul className="space-y-2">
            {mine.map((g) => (
              <li key={g.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">Code: {g.inviteCode}</div>
                </div>
                <button
                  onClick={() => store.leaveGroup(g.id)}
                  className="rounded-md border border-input px-2 py-1 text-xs"
                >Leave</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Create a group</div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              maxLength={40}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                if (!name.trim()) return;
                const g = store.createGroup(name.trim());
                setName("");
                setLastCreated(g.inviteCode);
              }}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >Create</button>
          </div>
          {lastCreated && (
            <p className="mt-2 text-xs">
              New invite code: <strong>{lastCreated}</strong> — share securely.
            </p>
          )}
        </section>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Join with code</div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="INVITE CODE"
              maxLength={12}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
            />
            <button
              onClick={() => {
                if (!code.trim()) return;
                store.joinGroupByCode(code);
                setCode("");
              }}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >Join</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            In this prototype, codes only join locally. Real syncing comes with the backend.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
