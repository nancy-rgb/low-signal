import { useState } from "react";
import { session, useStore } from "@/lib/requests-store";

export function LockScreen() {
  const hasPin = useStore((s) => !!s.user.realPin);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  if (!hasPin) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = session.attemptUnlock(pin);
    setPin("");
    if (r === "invalid") setErr("Incorrect PIN");
    else setErr("");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-background p-6">
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
        />
        {err && <p className="mt-2 text-center text-xs text-destructive">{err}</p>}
        <button
          type="submit"
          className="mt-3 w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
