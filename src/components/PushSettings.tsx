import { useEffect, useState } from "react";
import { pushSupported, subscribeToPush, unsubscribeFromPush, getPushStatus } from "@/lib/push";

export function PushSettings() {
  const [status, setStatus] = useState<"unsupported" | "denied" | "granted" | "default" | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getPushStatus().then((s) => setStatus(s));
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    const r = await subscribeToPush();
    setStatus(await getPushStatus());
    if (!r.ok) setMsg(r.reason ?? "Could not enable notifications.");
    else setMsg("Notifications enabled on this device.");
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    await unsubscribeFromPush();
    setStatus(await getPushStatus());
    setMsg("Disabled on this device.");
    setBusy(false);
  }

  const supported = pushSupported();

  return (
    <section className="rounded-md border border-input bg-card p-3 text-sm" aria-labelledby="push-heading">
      <div id="push-heading" className="mb-1 font-medium">Notifications (this device)</div>
      <p className="text-xs text-muted-foreground">
        Get alerts for new messages, claim approvals, and safety check-ins. Notifications never contain message
        contents or location — just a tap-through.
      </p>

      {!supported && (
        <p className="mt-2 text-xs text-muted-foreground">
          Push isn't available here. Try the published app in your phone's browser, then add to home screen.
        </p>
      )}
      {supported && status === "denied" && (
        <p className="mt-2 text-xs text-destructive">
          Notifications blocked in your browser settings. Re-enable them there, then come back.
        </p>
      )}
      {supported && (status === "default" || status === "loading") && (
        <button
          onClick={enable}
          disabled={busy}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Enabling…" : "Enable notifications"}
        </button>
      )}
      {supported && status === "granted" && (
        <button
          onClick={disable}
          disabled={busy}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md border border-input px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "…" : "Disable on this device"}
        </button>
      )}
      {msg && <p className="mt-2 text-xs text-muted-foreground" role="status">{msg}</p>}
    </section>
  );
}
