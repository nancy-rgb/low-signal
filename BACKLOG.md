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

## Next up
- Wire to Lovable Cloud
  - Auth (anonymous + magic link for recovery)
  - Real groups with server-enforced visibility (RLS)
  - Realtime requests, messages, check-ins
  - Cron sweep for expired requests / missed safety timers
- True end-to-end encryption for messages (libsignal or age-encryption style key exchange)
- Push notifications without sensitive content in payload
- Background safety-timer alerts (notify trusted contact server-side if deadline passes)

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
