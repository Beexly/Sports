# Phase 15 Surface Sweep — Fantasy/DFS/Contest Periphery

**Task:** P15-05  
**Date:** 2026-08-17  
**Status:** COMPLETE — no ungated real-money path found. One consistency gap noted (not a leak).

## Scope

Directories inspected (all under `apps/web/`):

- **app pages:** `app/fantasy/`, `app/contests/`, `app/vault/`, `app/house/`, `app/gsn/`
- **lib modules:** `lib/dfs/`, `lib/contests/`, `lib/tournament/`, `lib/staking/`, `lib/sleeper/`, `lib/game-room/`, `lib/gsn/`, `lib/house/`, `lib/fantasy/` (all submodules: academy, adp-source, autopilot, bestball, competitive-baseline, dfs-optimizer, dfs-slate, draft, free-trial, gm-ledger, host, league-twin, lineup, players, props, scheme, studio, trade, waivers)
- **Supporting gates:** `lib/launch/public-surface-gate.ts`, `lib/api-entitlement.ts`, `lib/pricing/tier-access.ts`

## Gating mechanism reference

The codebase enforces real-money gating via two server-side helpers:

1. `requireFantasyApi()` / `requirePremiumApiRateLimited()` in `api-entitlement.ts` — page-level server-side entitlement gate (returns 401/403 HTTP deny, `null` = granted). Mirrors `getViewerEntitlements` (anonymous → FREE, DB-backed, fail-closed).
2. `getViewerEntitlements()` in `pricing/tier-access.ts` — resolves session (anonymous → FREE) and entitlements, fail-closed to FREE.
3. `isContestsPublic()` in `launch/public-surface-gate.ts` — env-gated public surface switch (default ON, emergency OFF via `CONTESTS_PUBLIC=false`).
4. `poolForViewer()` / `freeTrialPool()` in `lib/fantasy/free-trial.ts` — server-side pool trim for FREE viewers (never client-side only).

## Findings

### 1. CONTEST BAY — PASS (gated, free paper only)

- `app/fantasy/contests/page.tsx` + `app/contests/page.tsx` (redirect alias): explicitly "Free skill-only paper contest — no entry fee, no prize pool, no real money."
- `lib/contests/week.ts`: `slateKind: "methodology_paper"`, rules state "Free skill only — no entry fee, no prize pool, no real money."
- `lib/contacts/store.ts`: file/Postgres settlement only, no payment path.
- **API routes:** Both `app/api/contests/week/route.ts` and `app/api/contests/enter/route.ts` check `isContestsPublic()`. The enter route also enforces rate limiting (`consumePublicFormRateLimit`) and validates via `ContestEntrySchema` (honeypot, consent). No Stripe/payment code anywhere in the contests module.

### 2. STAKING — PASS (educational only)

- `lib/staking/kelly-investigation.ts`: `treatsPAsVerified: false` (hard-coded), `publicClaimAllowed: false` by default. Default fractional Kelly (≤0.25). Refuses stake when no edge. No real-money placement — pure educational sizing.

### 3. DFS SALARIES & OPTIMIZER — PASS with consistency note

- `lib/dfs/salaries.ts`: Data-source gated by provider API keys (`SPORTSDATAIO_API_KEY`, `FANTASYDATA_API_KEY`). When keys absent → `status: "gated"` with empty rows + list of required env vars. When keys present → `status: "live"` with real DraftKings-style salaries.
- `lib/fantasy/dfs-optimizer.ts`: Pure computational engine (exact DP 0/1-knapsack). Takes any `DfsPlayer[]` pool. No I/O, no payment logic.
- `app/fantasy/dfs/page.tsx`: Renders live salaries only when `loadDfsSalaries()` returns `status === "live"` AND has rows. Otherwise shows "feed not connected" + runs optimizer on sample pool. Note explicitly says "runs fully on the sample pool."
- **Consistency note (NOT a leak):** `app/api/dfs/salaries/route.ts` has NO `requireFantasyApi` / `requirePremiumApiRateLimited` check, unlike all other fantasy/analytics APIs. However, this is not a real-money exposure because:
  1. The data is only "live" when provider API keys (not user entitlement) are configured.
  2. DFS salaries are data (prices), not an entry/pay path — no wagering, no entry fee, no prize pool in this module.
  3. The pricing page (`app/pricing/page.tsx`) lists `FANTASY` as a paid tier using `STRIPE_FANTASY_*` env vars, but the DFS salary feed is gated on provider keys, not subscription tier.
  - **Recommendation:** If DFS salaries are intended as a FANTASY-tier paid feature, the API route should add `requireFantasyApi()`. If they're intended as free (sample-only without provider keys), the current data-source gate is sufficient. Owner decision — not fixed in this sweep.

### 4. FANTASY TOOL PAGES — PASS (properly gated)

- `bestball`, `draft`, `lineup`, `trade`, `waivers` pages all call `getViewerEntitlements()` and gate premium projections behind `poolForViewer()` (server-side trim for FREE viewers).
- `free-trial.ts`: `freeTrialPool()` correctly trims the pool server-side before serialization to client — "A client-side `.slice()` does not enforce anything because the full pool would still be serialized."
- `autopilot` page: explicitly states "executing on a real ESPN/Yahoo/Sleeper account is gated behind your explicit consent, OAuth, and compliance review; there are no autonomous account actions or payments."

### 5. SLEEPPOR — PASS (read-only sentiment)

- `lib/sleeper/market-signal.ts`: "market sentiment, NOT our projection or betting pick — canPublishPicks stays false." Read-only GET via Sleeper API.
- `app/api/sleeper/league/` and `app/api/sleeper/market-signal/` routes: Sleeper sync is described as "read-only, GET-only." ESPN/Yahoo OAuth still founder-gated.

### 6. TOURNAMENT — PASS (draft-only, disabled)

- `lib/tournament/calibration-tournament.ts`: `status: "DRAFT_ONLY"`, `enabled: false`, `priced: false`, `eligibleForRecognition: false`. "Community calibration tournament scoring is scaffolded for review only; recognition and public display remain disabled."

### 7. GAME ROOM — PASS (read-only with entitlement gating)

- `lib/game-room/load.ts`: "The Game Room is a PUBLIC read-only surface, but two of its panels carry the platform's paid metrics." Premium fields (pre-mortem factor trail, Market Pulse line movement) built ONLY past `viewer.canSeeFactorBreakdown` / `viewer.canSeeLineMovement`. Fail-closed by default (`FAIL_CLOSED_VIEWER`).

### 8. GSN — PASS (content/narrative only)

- `lib/gsn/transmission.ts`: "Not a blog, a daily mission-control TRANSMISSION." Methodology fallback is illustrative structure language only — never fabricated track-record numbers.
- `lib/gsn/beex-weekly.ts`: `status` can never be "published" without `ownerApproved: true`. "this module never synthesizes audio, never posts, never publishes."
- `lib/gsn/build-transmission.ts`: Falls back to `SAMPLE_TRANSMISSION` with `illustrative: true` when board is empty/suppressed. No real-money component.

### 9. HOUSE — PASS (community hub)

- `app/house/page.tsx`: "Live rooms open when we can protect them." Staged community rooms. No payment/entry paths.
- `lib/house/weekly-ritual.ts`: Weekly beat map / content schedule. No monetary logic.

### 10. VAULT — PASS (archive placeholder)

- `app/vault/page.tsx`: "Collecting" state. "The Vault opens once enough canonical picks have settled." No real-money entry path.
- `lib/vault/` directory: does not exist (no vault lib module).

### 11. PROJECTIONS API — PASS (tier-gated)

- `app/api/projections/route.ts`: Gated by `requirePremiumApiRateLimited("projections")`. Comment: "Premium-gated (forecasts, not free-public)."

### 12. LINEUP TOOL API — PASS (tier-gated)

- `app/api/tools/lineup/route.ts`: Gated by `requirePremiumApiRateLimited("tools/lineup")`.

## VERIFY

- `npm run typecheck` across all 22 workspaces — PASSED (exit 0)
- `npm run lint` (eslint, `--max-warnings=0`) — PASSED (exit 0)
- `npx vitest run apps/web/__tests__/fantasy-real-data-surface.test.ts apps/web/__tests__/fantasy-pool-gating.test.ts` — 19/19 PASSED

## CONCLUSION

No ungated real-money or forward-projection path was found in the inspected periphery. All real-money surfaces are behind either:

- Env-gated founder switches (`isContestsPublic`, `PUBLIC_PICKS`, `STATS_PUBLIC`, etc.)
- Tier-based entitlement checks (`requirePremiumApiRateLimited`, `getViewerEntitlements`, `poolForViewer`)
- Provider API key gates (DFS salaries)
- Owner-only publish-readiness gates (`assessPublishReadiness`, `advanceEpisode`)

**One consistency gap** (not a security finding): the DFS salaries API route (`app/api/dfs/salaries/route.ts`) lacks user-tier entitlement gating, while every other fantasy/analytics API uses `requirePremiumApiRateLimited`. This is not a real-money leak (salaries are data, gated by provider keys; no entry/pay path), but it is an inconsistency in the gating pattern. Per task instructions ("do not fix it yourself — owner decision"), this is documented here as a recommendation, not fixed.

No code changes were made. No commit required (per task: "Commit only if you changed a genuine bug, not a gate").
