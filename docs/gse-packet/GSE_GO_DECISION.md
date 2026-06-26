# GSE — "Open It Up": the decision, the go-live, the fixes
**2026-06-24 · After the 5-lens review of `codex/intelligence-core`. Branch is verified real (grades: integration B−, math A−, tests A, safety A−, revenue A−), not merged, not deployed.**

You said: open it all up, get out of shadow mode, work autonomously. Here is the decision, split by what each piece actually is — because "open it up" means a green light for one half and a *false claim* for the other.

## 1. OPEN NOW — the revenue product (verified ready, runs on real cleared facts)

The $49/yr Fantasy tier on real nflverse data is end-to-end real: sell → gate → use all wired, server-side enforced, no fabricated data, no code blocker. It needs **zero shadow flags lifted** because it runs on cleared facts, not unproven projections. This is your money this week, during peak draft season.

**Owner go-live punch-list (only you can do these — config, not code):**
1. Create the LIVE Stripe prices and set `STRIPE_FANTASY_MONTHLY_PRICE_ID` ($4.99/mo) + `STRIPE_FANTASY_ANNUAL_PRICE_ID` ($49/yr).
2. Set live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, publishable key.
3. Register the Stripe webhook at `/api/webhooks/stripe` (without this, paid users stay gated as FREE).
4. Set `NEXT_PUBLIC_APP_URL` to the prod domain; confirm `PRICING_PHASE=FOUNDING` (default).
5. Optional for real projections: set `PROJECTIONS_PROVIDER`. Leaving it unset is honest — the badge says "illustrative." (First cold visitor may briefly see illustrative even after you set it; don't promise instant.)

Until step 1 is done, checkout returns a clean 503 (it does not crash). Do these and you are selling.

## 2. DO NOT FLIP ON FAITH — the prediction/projection engine

Flipping `canPublishProjections` / `priced=true` now would publish forecasts that are **unvalidated on real data** and, until the fix below propagates, carried a **real interval-coverage bug** (intervals too narrow while labeled "calibrated"). Publishing unproven numbers under a "calibrated/proven" label, to paying customers, under your name, is the exact tout behavior your brand is built against — and it breaks your own `model-freeze`/`trust-gate` guardrails. The shadow flags are not bureaucracy; they are the product.

**The honest path to opening it — and it's fast:** earn the flip with one backtest (§4). If the models beat the market out-of-sample, flip with the evidence in hand within days. "Backtested across 20+ seasons, here's the proof" is worth infinitely more than a switch flipped on a hunch.

## 3. FIXED NOW + the work order (make it genuinely better, not falsely live)

**Fixed by Claude this session (on-branch, needs the gate re-run before merge):**
- ✅ **Conformal coverage bug** — `conformal-intervals.ts` + `tweedie-aci.ts` now use the split-conformal `(n+1)` finite-sample order statistic. Intervals are correctly wider on small samples; verified against both test files by hand (assertions still hold).

**Work order for Codex (apply AND verify with the full gate — these need the test suite re-run, which I can't do from here):**
1. **Tweedie truth-in-labeling** — `tweedie-baseline.ts` trains stumps on L2 of `log1p(y)` and never uses `tweediePower` in the loss. Either implement the actual Tweedie deviance gradient in the boosting loss, or rename the export honestly (e.g. `boostedLog1pBaseline`) and document that true Tweedie-GLM fitting is a `[DATA]` follow-up. No false "Tweedie" claim may reach a public surface.
2. **Reconciliation yard coherence** — `market-anchored-reconciliation.ts` conserves a single merged yard pool (QB passing ÷25 and skill rush/rec ÷10 from one bucket). Split into pass-yard, rush-yard, and receiving-yard pools (use the C3 game-script pass/run split), conserve each separately, then derive fantasy points. Keep `priced=false`.
3. **Gate the leaky readiness endpoints** — ADMIN-gate `airwave/readiness`, `airwave/intelligence-readiness`, `airwave/intake-readiness`, `airwave/review-queue`, `media/readiness`, `health/synthetic-monitoring` (they disclose operational posture; payloads are booleans/counts only, but they should match the ADMIN gating on `cockpit/*`). Add rate-limiting to the unauthenticated `human/*` and `sleeper/league` reads.
4. **Doc the launch switch** — add `PROJECTIONS_PROVIDER` (and the `STRIPE_FANTASY_*` ids) to both `.env` templates; add the Fantasy tier to the `VALUE_TIERS` marketing strip.
5. **Activation wiring (the B− gap)** — the `LadderEvent` reducer and the engine compute layer have no app caller yet. Wire the reducer in **shadow** (it logs vs. the env flags, changes nothing) and surface the divergence/parliament/uncertainty readouts on the observatory behind their off-flags. This moves modules from "exported-only" toward "wired but still gated" — real activation, no truth-claim flipped.

Each item: one additive, flagged, tested commit; full gate green; ledger row; nothing priced/published.

## 4. THE FLIP-EARNING BACKTEST (the real "open it up")

This is the keystone and it can start now — the data exists. Load real nflverse regular-season rows (1999+) into the **replay harness that's already built** (`replay-harness.ts`), run the player projection through **purged + embargoed walk-forward** splits, and produce the **Clark-West** report vs. the market baseline (the gate is already coded: n≥30, t>1.64, lower MAE). Outcomes:
- **If it beats the market OOS:** author the calibration proposal, flip `canPublishProjections` **with the evidence**, and launch the headline. This is opening the engine — honestly, with proof.
- **If it doesn't:** you just avoided publicly shipping numbers that don't work. Iterate the model, not the marketing.

Either way you learn the one thing that matters and that no document can tell you: *is the engine actually smart?* That is the next move after the revenue switch.

## The one-line decision
**Open the revenue product today (it's real); earn the engine's flip with the backtest this week (it's fast); fix what the review caught (one's done, the rest is a tight Codex work order) — and never publish a number you can't prove, because that honesty is the entire company.**
