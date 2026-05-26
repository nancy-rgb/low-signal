import { Link, useRouterState } from "@tanstack/react-router";
import { useOnline } from "@/hooks/use-online";

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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      {!online && (
        <div className="bg-yellow-500/20 px-3 py-1 text-center text-xs text-yellow-800">
          Offline — actions saved on this device
        </div>
      )}
      <div className="flex-1 pb-16">{children}</div>
      <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 border-t border-input bg-card">
        {tabs.map((t) => {
          const active =
            t.to === "/" ? path === "/" : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex-1 py-3 text-center text-xs ${
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
