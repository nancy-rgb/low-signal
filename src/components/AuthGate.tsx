import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import LowSignalLogo from "@/components/LowSignalLogo";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  return <>{children}</>;
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alias, setAlias] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { alias: alias.trim() || "Anonymous" },
          },
        });
        if (error) throw error;
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-background p-6">
      <div className="mb-2">
        <LowSignalLogo size={40} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Mutual aid for activists. Sign in to continue.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        {mode === "signup" && (
          <label className="text-sm">
            <span className="mb-1 block">Alias (shown to volunteers)</span>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={40}
              placeholder="e.g. River, M.K., Cell-7"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
        )}
        <label className="text-sm">
          <span className="mb-1 block">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>

        {err && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 text-xs text-muted-foreground underline"
      >
        {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
      </button>

      <p className="mt-6 text-xs text-muted-foreground">
        Tip: pair your account with a strong PIN inside the app for at-rest
        encryption and a duress decoy.
      </p>
    </div>
  );
}
