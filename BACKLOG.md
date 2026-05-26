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
- Lovable Cloud wired: profiles, groups, requests, claims, offers tables with RLS
- Google OAuth + email/password auth
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

## Next up (Phase 5)
- PIN-wrap the local private key (currently plaintext in localStorage — fine for v1, weak vs device seizure).
- Forward secrecy: ephemeral per-conversation keys or double-ratchet.
- Key rotation flow + multi-device key sync (encrypted backup).
- Push notifications without sensitive content in payload.
- Background safety-timer alerts (notify trusted contact server-side if deadline passes).
- Attach Supabase auth to server functions (for admin/moderator routes).


## Backlog
- Volunteer skill tags (medical, legal, driver, translator) → smarter routing
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
