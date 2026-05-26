import { useState, useSyncExternalStore } from "react";
import { session } from "@/lib/requests-store";

export function LockScreen() {
  // Re-render when session mode changes so this component can self-mount.
  const mode = useSyncExternalStore(
    session.subscribe,
    () => session.getMode(),
    () => "normal" as const
  );
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (mode !== "locked" || !session.hasRealPin()) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await session.attemptUnlock(pin);
      setPin("");
      if (r === "invalid") setErr("Incorrect PIN");
    } catch {
      setErr("Unlock failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-background p-6">
      <h1 className="text-2xl font-bold">Locked</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your PIN</p>
      <form onSubmit={submit} className="mt-6 w-full max-w-xs">
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="w-full rounded-md border border-input bg-background px-3 py-3 text-center text-xl tracking-widest"
          placeholder="••••"
          disabled={busy}
        />
        {err && <p className="mt-2 text-center text-xs text-destructive">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-3 w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Data on this device is encrypted. The PIN never leaves the device.
      </p>
    </div>
  );
}
