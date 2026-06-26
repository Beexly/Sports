# GSE — Backtest stood up + fixes applied (session status)
**2026-06-24 · Branch `codex/intelligence-core` (worktree `C:\Users\Garrett\Sports-intelligence-core`). Not merged, not deployed.**

Honest constraint this session: the Linux sandbox VM was down, so I could **not execute code or run the test gate from here**. I did the maximum real work that doesn't require execution: wrote the backtest as runnable code, and made fixes I could verify by reasoning. The one command that produces real numbers is below — it runs wherever the toolchain works (your machine, or Codex's env, which we've seen execute your full vitest/build).

## What I changed on the branch (file edits — pending one gate run)

1. **Conformal coverage bug — FIXED** (`packages/prediction-engine/src/conformal-intervals.ts`, `tweedie-aci.ts`). The split-conformal quantile now uses the `(n+1)` finite-sample order statistic, so "calibrated" intervals are no longer systematically too narrow on small samples. Verified by hand against both test files — existing assertions still hold (the change only widens intervals, and the tests' identical-residual fixtures yield the same indices).
2. **Tweedie truth-in-labeling — HONESTY NOTE ADDED** (`tweedie-baseline.ts`). Documents that `fitTweedieBaseline` currently boosts stumps on L2 of `log1p(actual)` — a Tweedie-*flavored* scaffold, not a fitted Tweedie GLM — and forbids any public surface from calling it a fitted Tweedie model until the deviance gradient is wired (a `[DATA]` follow-up). Comment-only; no logic change.
3. **Backtest driver — STOOD UP** (`scripts/backtest/player-projection-backtest.ts` + `README.md`). Real, runnable: fetches real nflverse weekly player stats, builds leakage-safe trailing-usage features, runs the engine's existing purged/embargoed walk-forward + Clark-West harness, prints an OOS report.

All edits are additive and reversible. Because I couldn't run the gate, treat them as **"pending verification"** — Codex/you run the gate once before merge (it's part of the normal flow anyway).

## Run the backtest (one command)

From the repo root, with `node_modules` installed + network:
```bash
NODE_OPTIONS=--use-system-ca npx tsx scripts/backtest/player-projection-backtest.ts 2021 2022 2023
```
It prints model MAE vs. naive-baseline MAE, the Clark-West stat, and `beats NAIVE = true/false`.

**Read the result honestly:** this tests "model vs. naive points-persistence" on real games — the right first bar. `beats NAIVE = true` means the engine adds real signal OOS and is worth continuing. It is **not** "beats the Vegas market" (that needs historical player props — a `[DATA]` follow-up). Either way, you learn the one thing no document can tell you: whether the engine is actually smart. Nothing here flips a public gate.

## Verify my edits (one command)
```bash
npm run typecheck && npm run lint && (cd apps/web && npx vitest run) && npm run build \
  && node scripts/guardrails/trust-gate.mjs && node scripts/guardrails/model-freeze.mjs && node scripts/guardrails/draft-only.mjs
```
If green, the conformal fix + honesty note are good to keep. (I expect green — the conformal change was checked against its tests by hand.)

## Still specced for Codex to apply + verify (need the gate, which I can't run here)
From `GSE_GO_DECISION.md` §3 — the heavier fixes I won't make blind:
- **Reconciliation yard coherence** — split pass/rush/receiving yard pools (use the C3 game-script split), conserve each separately. `priced=false`.
- **Gate the leaky readiness endpoints** — ADMIN-gate the `airwave/*` + `media/readiness` + `health/synthetic-monitoring` reads; rate-limit the open `human/*` + `sleeper/league` routes.
- **Env docs** — add `PROJECTIONS_PROVIDER` + `STRIPE_FANTASY_*` to both `.env` templates; add Fantasy to the `VALUE_TIERS` strip.
- **Shadow wiring** — wire the `LadderEvent` reducer in shadow (logs vs. env flags) and surface the divergence/parliament/uncertainty readouts behind their off-flags.

## The two things that still matter most
1. **Revenue (this week, your hands):** the $49 Fantasy launch is verified-ready. Do the Stripe punch-list in `GSE_GO_DECISION.md` §1 and you're selling into draft season.
2. **The backtest (this week):** run the command above. If it beats naive, that's the green light to keep pushing the engine toward an honest public flip — with evidence.
