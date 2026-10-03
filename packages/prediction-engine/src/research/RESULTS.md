# R-9 RESULTS — synthetic-first NB-RBPF (shadow)

Status: **shadow / priced:false**. Not a pick input. Not a public claim.
Grok sandbox artifacts were spec references only; they are not imported
and are not cited as evidence.

## Engine

- Location: `packages/prediction-engine/src/research/` (new, non-sealed).
- Extends house conventions from `team-strength-filter.ts`: required seed,
  mulberry32, snapshot/restore (incl. rngState), log-space weights with
  max-re-centre, ESS-triggered systematic resampling, degeneracy → uniform
  (never NaN), `priced: false` / `status: "shadow"`.
- Layering (order is load-bearing):
  1. particles carry discrete type assignments (team / pitcher / park / umpire),
  2. Laplace (warm-started Newton, analytic Hessian) on the NB linear
     coefficients given those assignments,
  3. Liu-West on log-scale variance components (`log φ`, `log ridge`)
     **after weighting and before resampling**.
- Primary e-process: fractional, **fixed λ = 0.3**. Adaptive-λ is a
  comparison arm only (predictable `min(0.3, 1/√(t+1))`).
- Data: `generateSyntheticGames` only. No odds archive, no DB, no env reads.

## Acceptance (observed, this run)

Command: `npx vitest run --root packages/prediction-engine src/research/null-acceptance.test.ts`

1. **NULL TEST** — 200 pure-noise seeds, nGames=80, market line = generating mean.
   - seeds with max fixed-λ capital > 20: **0 / 200**
   - rate: **0.0000**
   - bar: ≤ 0.05
   - **PASS** — engine is not discarded.

2. **PLANTED-EDGE vs OPEN-LOOP** — 40 seeds.
   - engine median max capital: **2.1385**
   - open-loop median max capital: **1.0000**
   - **beats open-loop: yes**

## What this does not claim

Passing the synthetic null test is a licence to keep the engine in the
shadow research directory. It is not evidence of an MLB (or any sport)
edge. Track E remains closed. Nothing here is wired to publish, price,
or a public page.
