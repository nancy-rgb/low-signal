import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PushSettings } from "@/components/PushSettings";
import { useAuth } from "@/hooks/use-auth";
import { session, store, useStore } from "@/lib/requests-store";
import {
  signOut,
  useMyGroups,
  useProfile,
  useUpdateProfile,
  useTrustedContacts,
  useAddTrustedContact,
  useDeleteTrustedContact,
} from "@/lib/data";
import { rebindE2EEToPin } from "@/lib/e2ee";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: groups = [] } = useMyGroups();
  const update = useUpdateProfile();
  const localUser = useStore((s) => s.user);
  const { data: trustedContacts = [] } = useTrustedContacts();
  const addContact = useAddTrustedContact();
  const delContact = useDeleteTrustedContact();
  const [newLabel, setNewLabel] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [contactErr, setContactErr] = useState("");

  const [alias, setAlias] = useState("");
  const [contact, setContact] = useState(localUser.trustedContact ?? "");
  const [aliasMsg, setAliasMsg] = useState("");

  useEffect(() => {
    if (profile?.alias) setAlias(profile.alias);
  }, [profile?.alias]);

  const [realPin, setRealPin] = useState("");
  const [duressPin, setDuressPin] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  async function savePins() {
    setPinErr(""); setPinMsg("");
    const r = realPin.trim();
    const d = duressPin.trim();
    if (r && (r.length < 4 || !/^\d+$/.test(r))) return setPinErr("Real PIN must be 4–8 digits.");
    if (d && (d.length < 4 || !/^\d+$/.test(d))) return setPinErr("Duress PIN must be 4–8 digits.");
    if (r && d && r === d) return setPinErr("Real and duress PIN must differ.");
    if (d && !r && !localUser.pinSet) return setPinErr("Set a real PIN before a duress PIN.");
    setPinBusy(true);
    try {
      await store.setPins(r || undefined, d || undefined);
      if (user?.id) await rebindE2EEToPin(user.id);
      setRealPin(""); setDuressPin("");
      setPinMsg("PINs saved.");
    } catch {
      setPinErr("Failed to save PINs.");
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="text-xl font-semibold">Me</h1>

        <section className="rounded-md border border-input bg-card p-3 text-xs">
          <div className="font-medium">Account</div>
          <div className="mt-1 text-muted-foreground">{user?.email ?? "—"}</div>
          <button
            onClick={signOut}
            className="mt-2 rounded-md border border-input px-3 py-1.5 text-xs"
          >Sign out</button>
        </section>

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
              onClick={async () => {
                setAliasMsg("");
                await update.mutateAsync({ alias: alias.trim() || "Anonymous" });
                setAliasMsg("Saved");
              }}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >Save</button>
          </div>
          {aliasMsg && <p className="mt-1 text-xs text-success">{aliasMsg}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Shown to people who help you. Never use your real name.
          </p>
        </section>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Trusted contact (on-device only)</div>
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
            Stays on this device only. Never sent to the server.
          </p>
        </section>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-2 text-sm font-medium">Safety-alert contacts (server-side)</div>
          <p className="mb-3 text-xs text-muted-foreground">
            If a safety check-in deadline lapses, these people get an alert email. Stored on the server. Email only — no message body.
          </p>
          {trustedContacts.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {trustedContacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.label}</div>
                    <div className="truncate text-muted-foreground">{c.email}</div>
                  </div>
                  <button
                    onClick={() => delContact.mutate(c.id)}
                    className="rounded-md border border-input px-2 py-1 text-xs text-destructive"
                  >Remove</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              maxLength={64}
              placeholder="Label (e.g. Sister M)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              maxLength={120}
              type="email"
              placeholder="email@example.com"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {contactErr && <p className="text-xs text-destructive">{contactErr}</p>}
            <button
              onClick={async () => {
                setContactErr("");
                const label = newLabel.trim();
                const email = newEmail.trim();
                if (!label || !email) return setContactErr("Label and email required.");
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setContactErr("Invalid email.");
                try {
                  await addContact.mutateAsync({ label, email });
                  setNewLabel(""); setNewEmail("");
                } catch (e) {
                  setContactErr(e instanceof Error ? e.message : "Failed to add.");
                }
              }}
              disabled={addContact.isPending}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >{addContact.isPending ? "Adding…" : "Add contact"}</button>
          </div>
        </section>

        <section className="rounded-md border border-input bg-card p-3">
          <div className="mb-1 text-sm font-medium">App PINs &amp; encryption (on-device)</div>
          <p className="mb-2 text-xs text-muted-foreground">
            Status: {localUser.pinSet ? "encrypted ✓" : "not encrypted"}
            {localUser.duressSet ? " · decoy set ✓" : ""}
          </p>
          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">
              Real PIN {localUser.pinSet ? "(re-enter to change)" : "(unlocks app)"}
            </span>
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
          {pinMsg && <p className="mt-2 text-xs text-success">{pinMsg}</p>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={savePins}
              disabled={pinBusy}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >{pinBusy ? "Saving…" : "Save PINs"}</button>
            {localUser.pinSet && (
              <button
                onClick={() => session.lock()}
                className="rounded-md border border-input px-3 py-2 text-sm"
              >Lock now</button>
            )}
          </div>
        </section>

        <PushSettings />


        <section className="rounded-md border border-input bg-card p-3 text-sm">
          <div className="mb-2 font-medium">Groups</div>
          <p className="text-xs text-muted-foreground">
            You're in {groups.length} group{groups.length === 1 ? "" : "s"}.
          </p>
          <Link to="/groups" className="mt-2 inline-block rounded-md border border-input px-3 py-1.5 text-xs">
            Manage groups
          </Link>
        </section>

        <section className="rounded-md border border-destructive bg-destructive/5 p-3">
          <div className="mb-1 text-sm font-medium text-destructive">Panic wipe (this device)</div>
          <p className="text-xs text-muted-foreground">
            Erases local data, PINs, and signs you out. Server data stays unless you also delete the account.
          </p>
          {!confirmWipe ? (
            <button
              onClick={() => setConfirmWipe(true)}
              className="mt-2 w-full rounded-md border border-destructive px-3 py-2 text-sm text-destructive"
            >Wipe everything on this device</button>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setConfirmWipe(false)}
                className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
              >Cancel</button>
              <button
                onClick={async () => {
                  store.wipe();
                  await signOut();
                  setConfirmWipe(false);
                }}
                className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground"
              >Confirm wipe</button>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">Prototype · v0.5</p>
      </div>
    </AppShell>
  );
}
