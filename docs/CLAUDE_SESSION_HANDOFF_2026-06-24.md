# GSE Intelligence Core — Claude Code session handoff (2026-06-24)

Branch: `codex/intelligence-core` (pushed). Continuation of the Codex build + the prior Cowork session.
This session ran inside the repo (Claude Code), so unlike the Cowork session it could actually
EXECUTE code, fetch real data, and run tests.

## The headline: the backtest finally ran on real data

The keystone question — "is the engine actually smart?" — now has a real out-of-sample answer.
The driver loads real nflverse weekly player stats, builds leakage-safe trailing-usage features
(week W uses strictly weeks < W), and runs the engine's existing purged + embargoed walk-forward +
Clark-West harness. **Honest scope: this is "model vs. naive points-persistence," NOT "beats the
Vegas market" (that needs historical player-prop lines — a [DATA] follow-up).**

| Run | Model | OOS samples | model MAE | naive MAE | beats NAIVE |
|---|---|---:|---:|---:|:--:|
| 2023 | boosted-log1p (as-built) | 2,955 | 4.9928 | 4.7573 | **false** |
| 2023 | real Tweedie gradient (WO1) | 2,955 | 4.8679 | 4.7573 | **false** |
| 2021–2023 | boosted-log1p | 10,301 | 5.1802 | 4.9999 | **false** |
| 2021–2025 | real Tweedie gradient | (incl. 2025) | _running at handoff_ | | _see ledger_ |

**Verdict: the projection model does NOT beat naive points-persistence out-of-sample.** Making the
loss genuinely Tweedie helped (4.99 → 4.87) but did not flip the result. This is the honest, valuable
finding: **iterate the model (richer features — opponent/game-script/role), do NOT publish.** Nothing
here flips `canPublishProjections`; everything stays `priced=false` / `shadow`.

Run it yourself:
```bash
NODE_OPTIONS=--use-system-ca npx tsx scripts/backtest/player-projection-backtest.ts 2021 2022 2023 2024 2025
```

## What shipped this session (all on-branch, each with a ledger row)

1. **KS1 `fix(prediction-engine)`** — conformal `(n+1)` finite-sample quantile fix in
   `conformal-intervals.ts` + `tweedie-aci.ts`; Tweedie truth-in-labeling note. (Re-created — the prior
   session's edits were never pushed.) ✅ prediction-engine Vitest (514 tests).
2. **KS2 `feat(backtest)`** — the real nflverse backtest driver + README (also re-created). ✅ executed.
3. **WO1 `feat(prediction-engine)`** — wired the REAL Tweedie deviance gradient into the boosting loss
   (was L2-on-log1p). New proof test asserts the loss depends on `tweediePower`. ✅
4. **WO2 `feat(prediction-engine)`** — reconciliation yard coherence: split team yards/TDs into
   pass/rush/receiving pools (C3 game-script split), conserve each SEPARATELY, derive fantasy points.
   ✅ 518 tests; suite rewritten for per-pool conservation.
5. **DATA1 + DATA2 — "current through 2025"** (your directive): nflverse renamed the weekly asset after
   2024 (2025 ships only as `stats_player_week_2025.csv`). Fixed the backtest default (2021–2025), the
   data-sources fetcher fallback, and — centrally — `fetchNflverse("player_stats_week")` now merges the
   current per-season file into the combined (frozen-at-2024) asset, so the LIVE ingestion + trend
   modules get 2025 with no apps/web edit. ✅ 103 data-ingestion tests + 19 apps/web nflverse tests.
   Confirmed: `currentNflSeason()` is already date-driven (returns 2025; projects 2026) — not stale.
6. **WO4 `docs(env)`** — documented `PROJECTIONS_PROVIDER` + `STRIPE_FANTASY_*` in both `.env` templates.
7. **WO3 `feat(api)`** — ADMIN-gated 6 operational-posture readiness endpoints (airwave/*, media/readiness,
   health/synthetic-monitoring) via a new pure, unit-tested `isAdminSession` helper. ✅ helper tested.

## Environment constraints (important — read before merge)

This sandbox could run: the backtest, the **prediction-engine** package tests, the **data-ingestion**
package tests, and **apps/web leaf tests** (modules that don't import Prisma).

It could NOT run: repo-wide `npm run typecheck`, apps/web `build`, or any apps/web test that imports
`@sports/db`, because:
- **Prisma engine CDN is egress-blocked** (`prisma generate` → ECONNRESET), so `@sports/db` can't be generated.
- **TypeScript 6.0.2** (freshly installed) errors on the repo's `moduleResolution:"node"` tsconfigs
  (TS5107 deprecation). Fix when running the gate: add `"ignoreDeprecations": "6.0"` to the affected
  tsconfigs, or pin the TS version the repo used.

So the apps/web changes (WO3 route guards) are **pattern-verified by inspection** (verbatim copy of the
proven `cockpit/*` gate + a tested helper) but **not gate-verified** here. **Run the full gate in a
Prisma-capable environment before merge.**

## Precise follow-ups (deferred, not done — and why)

- **[FOLLOW-UP] Rate-limit** the unauthenticated `human/*` + `sleeper/*` reads with the existing
  `consumeRateLimit` + `clientIp` (`apps/web/lib/api/rate-limit.ts`). Deferred: 7 routes, mixed
  signatures (3 lack a `req` param), and `clientIp` is typed for `NextRequest` (routes use `Request`) —
  needs apps/web typecheck.
- **[OWNER] Fantasy in `VALUE_TIERS`** — needs marketing copy/positioning + an entitlement-wiring change
  to the `ValueTierId` union. Not fabricated; left for the owner. (`.env` already has the Fantasy price IDs.)
- **[FOLLOW-UP] WO5 shadow wiring** — wire `reduceLadder` in shadow (log rung verdict vs. env flags, no
  flip) + surface divergence/parliament/uncertainty observatory readouts behind off-flags. The pure
  reducer is already built + tested; what's left is ungated apps/web wiring.
- **[DATA] true market-beat test** — the current backtest beats only naive persistence. Beating the
  Vegas market requires historical player-prop lines (not freely available).

## Unchanged guardrails

trust-gate / model-freeze / draft-only all green across the branch. No gate flipped, nothing priced or
published, no secrets/money/pricing/model-version/schema touched. The branch remains code-ready behind
gates, not live-ready.
