# GSE 2026 — Forecasting Toolkit & Scoreline Model (Sprint 4)

Continued R&D: deepen the **calibration moat** (the core differentiator the whole competitive field
markets but never exposes) and **expand sport coverage** to soccer. All pure, dependency-free, tested.

## 1. Forecasting toolkit (`apps/web/lib/gse/forecasting.ts`)

The scoring, recalibration, and selection methods that make honest probability the product's edge.
Complements `packages/prediction-engine` (Brier/ECE) and the Sprint-2/3 primitives — no duplication.

| Function | What it does | Why it matters |
|---|---|---|
| `logLoss` | Cross-entropy proper score | The honest forecast metric; rewards confident-correct, punishes confident-wrong |
| `brierDecomposition` | Murphy split: reliability − resolution + uncertainty | Separates *calibration* (reliability) from *discrimination* (resolution); verified identity holds to 1e-9 |
| `crpsGaussian` / `crpsEnsemble` | CRPS for full predictive distributions | Grades projection *ranges*, not just point error — a sharp, centered forecast wins |
| `plattScale` / `applyPlatt` | Logistic recalibration via IRLS (Newton) | Turn raw scores into calibrated probabilities |
| `temperatureScale` / `applyTemperature` | Single-temperature recalibration via golden-section | Soften an over-confident model (T>1); never increases log loss vs T=1 |
| `kalmanFilterSeries` / `kalmanStep` | 1D state-space "form" tracking | In-season form that reacts to results without overreacting to noise |
| `ucb1Select` | Deterministic UCB1 bandit | Choose which model/strategy to trust as evidence accrues — feeds the self-learning loop |

## 2. Scoreline model (`apps/web/lib/gse/scoreline-model.ts`)

A Dixon-Coles-corrected bivariate-Poisson model for soccer, composing the `dixonColesTau` primitive
from Sprint 3. Plain Poisson independence misprices low-scoring draws; the τ correction fixes it.

- `dixonColesScorelineGrid(λ, μ, ρ)` → normalised home×away scoreline probability grid.
- `matchOutcomeProbs` → 1X2 (coherent: sums to 1). `overUnderProbs(grid, line)` → over/under/push.
- `bttsProbs` → both-teams-to-score. `topScorelines` → most likely correct scores.
- `dixonColesMatch(λ, μ, ρ)` → the full coherent summary from expected goals.

Verified invariants: grid normalises to 1; 1X2 sums to 1; higher xG side is favoured; **negative ρ
lifts the 0-0 / draw mass** vs independence (the whole point of the correction); over/under sums to 1.

Strategic note: soccer is the largest global market and a competitor blind spot after FBref lost its
advanced Opta feed (Jan 2026). This is a coverage wedge — paired with the rights-aware open-source
ledger (OpenFootball is public-domain; Understat/StatsBomb are rights-gated).

## 3. Cockpit

`/cockpit/forecasting-lab` runs all of it on illustrative inputs: a Dixon-Coles match (1X2 / O/U /
BTTS / top scores), Platt recalibration, a Kalman form curve, UCB1 model selection, and a Brier
decomposition. Numbers are illustrative and labeled.

## 4. Registry + what remains

`analytics-methods.ts` now marks the built methods (glicko2, dixon_coles, opinion pools, extremize,
isotonic, conformal, PSI, Black-Litterman, CRPS, Platt, Kalman, bandit) **partial** — implemented as
primitives, not yet wired into the live decision path. Remaining `gap`: hierarchical Bayes, Ledoit-
Wolf shrinkage, risk-parity exposure, matrix-factorization comps, gradient boosting (these belong in
a Python training worker + ONNX inference, per the open-source ledger).

## 5. Verification

`tsc --noEmit` exit 0 (whole app); `gse-forecasting-scoreline.test.ts` (15) pass; full GSE + cockpit-
gating suites green with the new `/cockpit/forecasting-lab` page; ESLint clean. No live data, no
fabricated track record.
