import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DIRECTORY } from "@/lib/directory";

export const Route = createFileRoute("/directory")({
  component: Directory,
});

function Directory() {
  const [q, setQ] = useState("");
  const filtered = DIRECTORY.filter((d) => {
    const s = q.toLowerCase();
    return !s || d.name.toLowerCase().includes(s) || d.category.includes(s) || d.region.toLowerCase().includes(s);
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-3 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="text-xl font-semibold">Help directory</h1>
        <p className="text-xs text-muted-foreground">
          Vetted hotlines, legal aid, and emergency services. Works without volunteers.
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (legal, medical, region…)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <ul className="flex flex-col gap-2">
          {filtered.map((d) => (
            <li key={d.id} className="rounded-md border border-input bg-card p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{d.name}</span>
                <span className="text-xs uppercase text-muted-foreground">{d.category}</span>
              </div>
              <div className="text-xs text-muted-foreground">{d.region}</div>
              <div className="mt-1 break-words">{d.contact}</div>
              {d.notes && <div className="mt-1 text-xs text-muted-foreground">{d.notes}</div>}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
