import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { session, store, useStore } from "@/lib/requests-store";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const user = useStore((s) => s.user);
  const [alias, setAlias] = useState(user.alias);
  const [contact, setContact] = useState(user.trustedContact ?? "");
  const [realPin, setRealPin] = useState(user.realPin ?? "");
  const [duressPin, setDuressPin] = useState(user.duressPin ?? "");
  const [pinErr, setPinErr] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);

  function savePins() {
    setPinErr("");
    const r = realPin.trim();
    const d = duressPin.trim();
    if (r && (r.length < 4 || !/^\d+$/.test(r))) {
      setPinErr("Real PIN must be 4–8 digits.");
      return;
    }
    if (d && (d.length < 4 || !/^\d+$/.test(d))) {
      setPinErr("Duress PIN must be 4–8 digits.");
      return;
    }
    if (r && d && r === d) {
      setPinErr("Real and duress PIN must differ.");
      return;
    }
    if (d && !r) {
      setPinErr("Set a real PIN before setting a duress PIN.");
      return;
    }
    store.setPins(r || undefined, d || undefined);
  }

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
            Never use your real name. Shown to people who help you.
          </p>
        </section>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Trusted contact</div>
          <div className="flex gap-2">
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={120}
              placeholder="e.g. Sister M — Signal +XX..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => store.setTrustedContact(contact.trim())}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >Save</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Reminded to alert this person if a safety timer expires. Stored locally.
          </p>
        </section>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">App PINs</div>
          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">Real PIN (unlocks app)</span>
            <input
              type="password"
              inputMode="numeric"
              value={realPin}
              onChange={(e) => setRealPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="4–8 digits"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tracking-widest"
            />
          </label>
          <label className="mt-2 block text-xs">
            <span className="mb-1 block text-muted-foreground">Duress PIN (opens decoy)</span>
            <input
              type="password"
              inputMode="numeric"
              value={duressPin}
              onChange={(e) => setDuressPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Different 4–8 digits"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tracking-widest"
            />
          </label>
          {pinErr && <p className="mt-2 text-xs text-destructive">{pinErr}</p>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={savePins}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >Save PINs</button>
            {user.realPin && (
              <button
                onClick={() => session.lock()}
                className="rounded-md border border-input px-3 py-2 text-sm"
              >Lock now</button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Entering the duress PIN opens an empty, clean-looking version of the app.
            Real data isn't shown until you re-enter the real PIN.
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
            Erases all requests, offers, messages, groups, alias, and PINs from this device. Cannot be undone.
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
                onClick={() => {
                  store.wipe();
                  setConfirmWipe(false);
                  setAlias(""); setContact(""); setRealPin(""); setDuressPin("");
                }}
                className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground"
              >Confirm wipe</button>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Prototype · local-only · v0.3
        </p>
      </div>
    </AppShell>
  );
}
