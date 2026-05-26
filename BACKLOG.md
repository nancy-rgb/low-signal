# Backlog

Tracking what's planned, in progress, and intentionally deferred.

## Done (v0.2 prototype, local-only)
- Ask-for-help flow (locate → confirm → bucketed type → details → review)
- Bucketed help types incl. medical & medical supplies
- Groups / cells with invite codes (local-only join)
- Two-way claim confirmation (proposal → approve → reveal)
- In-request messaging + check-ins (on the way / arrived / delayed / safe)
- Offers (supply side): hosting, transport, supplies, medical/legal skills, message relay
- Static help directory (hotlines, legal, medical, shelter, press)
- TTL / auto-expire for requests and offers
- Fuzzy location (~500m grid) shown to volunteers until approval
- Bottom tab nav + offline banner
- Panic wipe (clears all local data)
- Duress mode (decoy empty state via duress PIN) — v0.3
- Safety timer (per-request check-in deadline + trusted contact) — v0.3

## Done (Phase 1 — Cloud auth & schema)
- Supabase wired: profiles, groups, requests, claims, offers tables with RLS
- Email/password auth (Google OAuth removed during Lovable decoupling — see Phase 6)
- Auto-profile creation on signup
- AuthGate component + useAuth hook

## Done (Phase 2 — Live data)
- React Query data layer (`src/lib/data.ts`) for all entities
- All routes fetch from Supabase instead of local store
- Nearby volunteer discovery with coarse location privacy
- Group join via invite code (server-enforced)

## Done (Phase 3 — Realtime, check-ins, messages, sweep)
- `check_ins` table with RLS + realtime (on_the_way, arrived, delayed, safe, custom)
- `messages` table with RLS + realtime (client-encrypted ready)
- Check-in buttons + history in request detail
- Message thread (chat UI) in request detail
- Safety timer banner with overdue alerts
- Realtime subscriptions for live updates on request detail
- `/api/public/sweep` cron endpoint for expired requests + safety deadline alerts

## Done (Phase 4 — E2EE messaging)
- Per-user ECDH P-256 long-term keypair; public key published to `profiles.public_key`, private key stored locally (`localStorage`).
- ECDH → AES-GCM 256 envelope `{v:1, iv, ct}` for each message; encrypt before insert, decrypt on read.
- Graceful fallback for legacy plaintext messages; "decrypting…" / "[cannot decrypt]" states.
- `useEnsureKeypair()` runs on auth; idempotent setup / republish.

## Done (Phase 5a — PIN-wrapped E2EE key)
- E2EE private key wrapped with AES-GCM key derived from real PIN; in-memory cache cleared on lock / duress / sign-out.

## Done (Phase 5b — Server-side safety alerts)
- `trusted_contacts` table (per-user, RLS-scoped) for safety-alert recipients.
- `safety_alerts` table — idempotent log, one row per request whose safety deadline lapsed without a "safe" check-in.
- `sweep_expired_requests` RPC now records new alerts atomically; sweep route fetches contacts and marks delivered.
- Settings UI to add/remove server-side trusted contacts.
- Email transport stub: alerts are logged + counted; actual email send wires in once an email domain is configured.

## Done (Phase 5c — Push notifications, client opt-in)
- `push_subscriptions` table (per-user, RLS-scoped, unique by endpoint).
- `/sw.js` service worker — push + notificationclick handlers; payloads strictly `{title, body, url}`, no PII.
- `src/lib/push.ts` — feature-detects, skips iframes/Lovable preview, subscribes via VAPID, saves on auth.
- Settings → "Notifications (this device)" enable/disable toggle.
- `attachSupabaseAuth` registered in `src/start.ts` `functionMiddleware` (5b leftover).

## Done (Branding + a11y)
- Animated `LowSignalLogo` across auth, home header, splash; app renamed to **Low Signal**.
- Sessionscoped splash screen on first load.
- Single `<main>` landmark in AppShell, `nav aria-label`, `aria-current` on active tab.
- `min-h-screen` → `min-h-dvh` for mobile viewport correctness.
- Tap targets bumped to `min-h-11` on primary nav.

## Done (Phase 5d — Push delivery)
- VAPID secrets configured (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- `src/lib/push.server.ts` — Web Push delivery via `@block65/webcrypto-web-push` (edge-compatible). Prunes dead 404/410 endpoints.
- `getVapidPublicKey` serverFn exposes public key to the client (no env-prefix needed).
- Sweep route pushes the requester when their safety check-in lapses.
- `useSendMessage` fires `notifyMessagePeers` to push the other request participants on each new message.

## Done (Phase 6 — Lovable decoupling)
- Hosting moved from Lovable to Cloudflare Workers (Workers Builds Git integration; `wrangler.jsonc` worker `low-signal`).
- AI provider swapped: `@lovable.dev/cloud-auth-js` AI gateway → `@ai-sdk/anthropic` (Claude Haiku 4.5) in `intake.functions.ts` + `ai-gateway.server.ts`.
- Supabase project migrated from Lovable-managed to user-owned (`bhyrzuuzcbydqxaungrc.supabase.co`); 11 migrations applied; pgcrypto extension enabled in `extensions` schema with search_path fix.
- Worker secrets moved to Cloudflare: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SWEEP_SECRET.
- Google OAuth button removed from `AuthGate.tsx` (depended on Lovable's `/~oauth/initiate` broker). Email/password sign-in retained.

## Lovable dependencies still present (Phase 6 follow-ups)
- ~~`@lovable.dev/cloud-auth-js`~~ **(done — `src/integrations/lovable/` deleted, package dropped, `@ai-sdk/openai-compatible` orphan also removed; bundle ~28 KB smaller)**
- `@lovable.dev/vite-tanstack-config` is still the project's Vite preset (`vite.config.ts`). It bundles ~8 plugins (cloudflare, tanstack-start, viteReact, tailwindcss, tsConfigPaths, componentTagger, VITE_* env injection, dedupe). Removing it = rewriting `vite.config.ts` to register each plugin manually + verifying dev/build/Cloudflare bundling still works. **Next** (when ready for a dedicated session): replace the preset.
- Migrations still carry `Lovable-Edit-ID` metadata in commit messages from earlier history. Cosmetic only.
- No native Supabase Google OAuth wired yet. **Deferred per user.** When wanted: configure Google OAuth in Google Cloud Console → Supabase Auth → swap call site to `supabase.auth.signInWithOAuth({ provider: "google" })`.

## Next up (Phase 5e — Advanced E2EE)
- Forward secrecy: ephemeral per-conversation keys or double-ratchet.
- Key rotation flow + multi-device key sync (encrypted backup).
- Push email transport: hook actual email send into safety alerts (needs email domain).


## Backlog
- Volunteer skill tags (medical, legal, driver, translator, shelter, supplies) → smarter routing **(done — profile.skills + "Match my skills" filter on volunteer page)**
- Voice dictation on request form (per-field mic, Web Speech API) **(done)**
- Conversational voice intake — AI-parsed free-form speech fills the whole request form **(done — `VoiceIntake` on request form; Claude Haiku 4.5 via `@ai-sdk/anthropic`; PII-stripping system prompt)**
- Capacity hints on volunteers (can host N, has vehicle)
- Multi-volunteer chains (travel handoff across cells)
- Manual map-pin entry (avoid live GPS share)
- Saved safe places (markets, clinics) as preset meetup options
- Region-specific directory data (replace static seed)
- i18n + RTL (Arabic, Farsi, Russian, Belarusian, Burmese, Mandarin, etc.)
- Accessibility audit (screen reader labels, contrast, tap targets ≥44px)
- Low-bandwidth toggle (truly minimal mode, no JS bundles for read-only views)
- Plausible deniability: app icon/name disguise on home screen
- Tor / .onion support consideration
- Vouching / trust tiers within groups
- Escalation: open request escalates from group → wider group → public after N min unclaimed
- Resource matching: auto-suggest matching offers for a request

## Conscious non-goals
- Real names, profile photos, social graph
- Public ratings or reputation tied to identity
- Push notifications that contain request content in the body
- Mandatory phone number / SMS verification
- Persistent stable handles across requests by default

## Phase 2 deferred (v0.5)
- Column-level location guard: enforce server-side that lat_exact/lng_exact only resolve for requester + approved volunteer (currently enforced in app code).
- Geohash bucketing in DB to scale nearby filtering past prototype size.
- Group request feed = group_id IS NOT NULL but requires `lat_coarse` filtering by region.
- E2EE per-conversation keys, sealed inside each user's encrypted vault.
