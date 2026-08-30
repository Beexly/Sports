---
name: model-promotion-gate
description: Decide whether a challenger model may replace the champion — without re-labeling history or promoting noise.
---

# Model promotion gate

## Purpose
Decides whether challenger **K** may replace champion **C** for a market family.
The gate **outputs eligibility only** — it never flips `MODEL_VERSION` itself.
The switch stays founder-applied.

Frozen contract: `docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md`. Read it before
touching any promotion code; the numbered invariants there are load-bearing.

## Why this gate is paranoid
A previous promoter shipped with `computeClvMean()` returning `0.5` for every
input — it could never promote anything, and its tests asserted that tautology,
so it passed. The contract's anti-DEC-062 invariants exist to make that failure
class impossible to reintroduce:

1. **Identity fixed point** — K ≡ C ⇒ every dᵢ = 0 ⇒ `NOT_ELIGIBLE`.
2. **Oracle promotes Leg 1** — K = outcome oracle ⇒ Leg 1 passes. Proves the
   harness *can* clear the bar, killing "can never promote" outright.

Both are REQUIRED tests. A promotion change that does not run them is not done.

## The three legs
Promotion requires **Leg 1 AND Leg 2**; Leg 3 is procedural and always applies.

| Leg | What it establishes |
|---|---|
| 1 — paired calibration superiority | Brier differential on the **same events**, empirical-Bernstein LCB > δ_prac |
| 2 — CLV non-inferiority | Market-anchored: the edge is not an artifact of stale lines |
| 3 — procedural integrity | Pre-registered params, leak-free walk-forward, fixed event universe |

Paired on identical events is the point: unpaired comparison lets a favorable
schedule masquerade as skill.

## Commands
```bash
npm run guard:model-freeze     # MODEL_VERSION must have IMPLEMENTED calibration evidence
npm run calibrate              # calibration pipeline
npm test --workspace=packages/prediction-engine
npx tsx scripts/ops/verify-shadow-pipeline.ts    # read-only shadow status
npx tsx scripts/ops/compare-shadow-vs-live.ts    # posts win/lose/insufficient-sample
```

## Why `guard:model-freeze` blocks you
Bumping `MODEL_VERSION` without an `IMPLEMENTED` calibration artifact
**retroactively re-labels every historical confidence number** — yesterday's
picks silently claim to come from today's model. Resolve it honestly:

1. a `CalibrationProposal` row with `status: IMPLEMENTED`, or
2. `docs/calibration-proposals/<slug>.md` with `modelVersion` + `status: IMPLEMENTED`, or
3. `docs/calibration-proposals/FROZEN.md` with `frozen: <version>` — **only** if no
   scoring weights changed.

Never satisfy it by editing the guard.

## Related
- `packages/prediction-engine/src/` — `brier-ogd-ensemble.ts`,
  `earned-weight-ensemble.ts`, `calibration-drift.ts`, `elo-backtest.ts`, `clv.ts`
- `apps/web/lib/decision-genome/` — candidate generation (`candidate-ledger.ts`)
- `docs/agent-skills/calibration-pipeline/SKILL.md`
- `docs/agent-skills/autonomy-kernel/SKILL.md` — the kernel never promotes

## Do-not-dos
- Do **not** flip `MODEL_VERSION` from code, CI, or cron. Eligibility ≠ promotion.
- Do **not** promote on Leg 1 alone. Calibration without CLV can be a stale-line artifact.
- Do **not** compare on non-identical event sets, or re-tune δ_prac after seeing results.
- Do **not** weaken, skip, or `.skip()` the identity-fixed-point or oracle tests.
- Do **not** report a verdict below the minimum sample — `insufficient-sample` is a
  real, publishable answer, and `compare-shadow-vs-live` posts it either way.
  Posting only favorable verdicts is the cherry-picking the proof machinery exists
  to prevent.
- Do **not** treat shadow-engine output as a live pick. It is `status: "shadow"`,
  `priced: false`.
