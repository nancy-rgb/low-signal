# Low Signal

Mutual aid for activists. Private by design.

A peer-to-peer help / offer platform where requesters describe what they need (shelter, transport, supplies, medical, legal, message relay), and volunteers in a trusted group claim and coordinate. Built around explicit privacy choices: client-side PIN encryption of the local vault, E2EE messaging between requester and approved volunteer, fuzzy location until claim approval, panic wipe, and a duress decoy PIN.

**Live:** https://low-signal.thecrabbshack.workers.dev

## Stack

- **Frontend / SSR:** [TanStack Start](https://tanstack.com/start) (React 19, file-based routing)
- **Hosting:** Cloudflare Workers (Git-integration auto-deploys from `main`)
- **Database / Auth:** Supabase (Postgres + GoTrue + RLS)
- **AI (voice intake):** Claude Haiku 4.5 via `@ai-sdk/anthropic` (Vercel AI SDK)
- **Push:** Web Push API via `@block65/webcrypto-web-push` (VAPID)
- **Styling:** Tailwind CSS 4 + Radix primitives
- **Build:** Vite 7 + Bun (lockfile) + Cloudflare's `vite-plugin`

## Local development

```bash
bun install
bun run dev   # vite dev on http://localhost:8080
```

Requires a populated `.env` in the repo root with at minimum:

```env
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_PROJECT_ID="<project-ref>"
```

`VITE_*` vars are baked into the client bundle at build time. Non-prefixed vars are read server-side via `process.env`.

## Deploy

`git push origin main` triggers a Cloudflare Workers build (`bun install --frozen-lockfile` + `bun run build` + auto-deploy to the `low-signal` worker).

Worker runtime secrets (set via `npx wrangler secret put <NAME> --name low-signal` or the Cloudflare dashboard):

| Secret | Used for |
|---|---|
| `SUPABASE_URL` | Server-side Supabase client |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side Supabase (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server ops (bypasses RLS) |
| `ANTHROPIC_API_KEY` | Voice intake parser |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push delivery |
| `SWEEP_SECRET` | Auth check for `/api/public/sweep` cron endpoint |

## Database

Schema lives in [`supabase/migrations/`](supabase/migrations). Apply to a fresh project with:

```bash
supabase login                                    # one-time
supabase link --project-ref <your-ref>
supabase db push
```

The first migration enables `pgcrypto` in the `extensions` schema and extends `search_path` so `gen_random_bytes()` resolves on a fresh Supabase project.

## Architecture notes

- **PIN encryption (`src/components/LockScreen.tsx`, `src/lib/session.ts`)** — Client-side only. PIN derives a PBKDF2 key that AES-GCM–encrypts the local vault in `localStorage` under `lov_vault_v3`. PIN never leaves the device. Lost PIN → wipe localStorage; no server-side recovery.
- **E2EE messaging (`src/lib/e2ee.ts`)** — Per-user ECDH P-256 keypair; public key published to `profiles.public_key`, private key wrapped with the PIN-derived key. Each message gets a per-pair AES-GCM envelope.
- **Sweep cron (`src/routes/api/public/sweep.ts`)** — Periodic auth-gated endpoint that expires stale requests, fires safety-deadline alerts, and prunes dead push subscriptions. Auth via `SWEEP_SECRET` header.
- **Server functions (`src/lib/*.functions.ts`)** — TanStack Start `createServerFn` handlers; run in the Cloudflare Worker.

## Roadmap

See [BACKLOG.md](BACKLOG.md) — tracks what's done by phase, what's queued, and the conscious non-goals (no real names, no persistent identity, no public reputation).
