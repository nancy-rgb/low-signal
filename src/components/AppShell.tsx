import { Link, useRouterState } from "@tanstack/react-router";
import { useOnline } from "@/hooks/use-online";
import { LockScreen } from "@/components/LockScreen";
import { session, useSessionMode } from "@/lib/requests-store";
import { useRef } from "react";

const tabs = [
  { to: "/", label: "Home" },
  { to: "/volunteer", label: "Nearby" },
  { to: "/offers", label: "Offers" },
  { to: "/directory", label: "Help" },
  { to: "/settings", label: "Me" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const online = useOnline();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const mode = useSessionMode();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (mode === "locked") return <LockScreen />;

  // Secret 5-tap gesture on the offline-banner spot exits duress mode.
  function maybeExitDuress() {
    if (mode !== "duress") return;
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => (tapCount.current = 0), 2000);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      session.exitDuress();
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      {!online ? (
        <div role="status" className="bg-yellow-500/20 px-3 py-1 text-center text-xs text-yellow-800">
          Offline — actions saved on this device
        </div>
      ) : (
        // invisible tap target for the secret duress-exit gesture
        <div onClick={maybeExitDuress} className="h-1 w-full" aria-hidden />
      )}
      <main className="flex-1 pb-16">{children}</main>
      <nav aria-label="Primary" className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 border-t border-input bg-card">
        {tabs.map((t) => {
          const active = t.to === "/" ? path === "/" : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? "page" : undefined}
              className={`flex-1 py-3 text-center text-xs min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                active ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
