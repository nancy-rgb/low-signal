import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  useCreateGroup,
  useJoinGroupByCode,
  useLeaveGroup,
  useMyGroups,
} from "@/lib/data";

export const Route = createFileRoute("/groups")({ component: Groups });

function Groups() {
  const { data: mine = [] } = useMyGroups();
  const create = useCreateGroup();
  const join = useJoinGroupByCode();
  const leave = useLeaveGroup();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function doCreate() {
    setErr(""); setMsg("");
    if (!name.trim()) return;
    try {
      const g = await create.mutateAsync({ name: name.trim() });
      setName("");
      setMsg(`Created. Invite code: ${g.invite_code}`);
    } catch (e) { setErr((e as Error).message); }
  }
  async function doJoin() {
    setErr(""); setMsg("");
    if (!code.trim()) return;
    try {
      await join.mutateAsync(code);
      setCode("");
      setMsg("Joined.");
    } catch (e) { setErr((e as Error).message); }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="text-xl font-semibold">Groups / cells</h1>
        <p className="text-xs text-muted-foreground">
          Groups scope who sees your requests. Share invite codes only with trusted people.
        </p>

        {err && <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">{err}</div>}
        {msg && <div className="rounded-md border border-success bg-success/10 p-2 text-xs">{msg}</div>}

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Your groups</div>
          {mine.length === 0 && <p className="text-xs text-muted-foreground">Not in any group yet.</p>}
          <ul className="space-y-2">
            {mine.map((g) => (
              <li key={g.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">Code: {g.invite_code}</div>
                </div>
                <button
                  onClick={() => leave.mutate(g.id)}
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
              onClick={doCreate}
              disabled={create.isPending}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >Create</button>
          </div>
        </section>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Join with code</div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="invite code"
              maxLength={24}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={doJoin}
              disabled={join.isPending}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >Join</button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
