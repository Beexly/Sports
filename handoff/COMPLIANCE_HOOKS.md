# Compliance Hooks — Integration-Point Map (read-only)

**Phase:** 1c, item 2 of 3 (P1c-2). **Author:** Hermes continuous run.
**Companion ADR:** `docs/adr/007-user-compliance-state.md` (proposes the
`UserCompliance` + `SelfExclusionEvent` models this map would wire in).
**This is a map only. It proposes no code.** Each entry says where a gate hook
would go and what it must do. A missed entry point is a hole in the eventual gate,
so completeness is the deliverable.

## Account-creation paths

Registration is delegated to NextAuth (no bespoke signup route — the user row is
created by the OAuth provider callback). The attestation checkbox from ADR 007 would
attach here.

- `apps/web/app/auth/signin/page.tsx:76-113` — Google OAuth `signIn("google", …)`
  server-action form. **Hook point:** after a successful OAuth handoff (or in the
  `jwt`/`session` callback that first sees the new user), check
  `UserCompliance.ageAttestedAt`; if null, force the attestation step before the
  session is usable. This is where a first-time user is cheapest to gate.
- `apps/web/lib/auth.ts:40-75` — NextAuth `jwt` + `session` callbacks. The `session`
  callback (`:68`) is where `session.user.id`/role are stamped; the natural place to
  inject `complianceState` (attested / excluded) into the session object so every
  downstream `auth()` read sees it without a second DB hit.

## Checkout entry points

- `apps/web/app/api/subscriptions/checkout/route.ts:49-58` — `POST` handler.
  Already calls `auth()` (`:50`) and a rate limit; **hook point:** before Stripe
  customer/session creation (the `requireDurableWriteStore("stripe-checkout")` guard
  at `:109` is the right neighbor), assert the user is not self-excluded and has
  attested age. A blocked user must get a 403 with the responsible-play messaging,
  not a Stripe error.
- Callers of that route (client `fetch` to `/api/subscriptions/checkout`) inherit the
  server-side gate; no client change is the compliance surface — the gate is
  server-authoritative.

## Session-establishment points (where an exclusion check must run)

The gate must be checked on **every** authenticated request, so the cheap place is
the session object (set once in `lib/auth.ts:68`) read everywhere via `auth()`.
Locations that establish or consume a session:

- `apps/web/lib/auth.ts:107` — `export const auth` (the `Session | null` resolver
  used app-wide). **Hook point:** the single choke point — if exclusion is stamped
  into the session at `:68`, this resolver can short-circuit excluded users. This is
  preferred over per-route checks.
- `apps/web/middleware.ts:31` — `export function middleware`. Currently does
  cookie-based auth redirects only (`:72-82` notes a dev bypass). **Hook point:** a
  site-wide exclusion redirect could live here (redirect excluded users to
  `/responsible-play`), but middleware runs on the edge without the DB session
  object — so it should *complement*, not *replace*, the session-object gate. Do not
  put policy thresholds here.

## What each hook must do (uniform contract)

1. Read compliance state from the session (populated at `lib/auth.ts:68`) — never
   re-derive policy in the hook.
2. If `selfExcludedAt` set and `now < selfExclusionExpiresAt`: refuse (403 / redirect
   to `/responsible-play`). Reversal is **owner-only** — the hook must never honor a
   self-service un-exclude.
3. If age not attested: for new accounts, force attestation; for checkout, 403 until
   attested.
4. Log denials to the `SelfExclusionEvent`/audit trail — do not silently pass.

## Explicitly out of scope (per ADR 007)

Identity verification, geolocation, state-by-state permitted-region logic, and any
vendor integration. This map covers only the in-product hooks for the two mechanisms
ADR 007 proposes.

## Verification note

No code was changed. This map is complete against a `grep` of `auth()`,
`signIn(`, the checkout route, and `middleware.ts` on the
`claude/fable-5-ultracode-plan-ptru4e` branch at commit HEAD. Re-run those greps
after any auth refactor and update this file.
