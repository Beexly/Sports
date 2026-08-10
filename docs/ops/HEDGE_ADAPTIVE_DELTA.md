# Hedge adaptive-δ — logic exploration

Updated: **2026-08-10** · **Shadow advisory** · does not write env

## Setup

Experts \(j=1..m\) each use threshold \(\delta_j\). On sample \((p,y)\):

- If \(|p-0.5|\ge\delta_j\): **publish**, loss = Brier \((p-y)^2\)
- Else: **sit-out**, loss = \(0.25 \approx \mathrm{UNC}\) (coin-flip)

Hedge / EG update:

\[
w_{t+1,j} \propto w_{t,j}\cdot\exp(-\eta\cdot\ell_{t,j})
\]

Regret \(O(\sqrt{T\ln m})\) vs best fixed \(\delta\) in hindsight.

## Live selective vs Hedge

| Layer | Role |
|-------|------|
| Runtime selective \(\delta=0.08\) | **Live** publish filter (default ON) |
| Hedge `recommendedDelta` | **Shadow** advice from regret-bounded experts |
| Integrity | Sit-out Brier ≈ UNC; if sit-out Brier ≪ UNC, middle has skill → don't raise δ |

## Analysis fields (bake-off)

| Field | Meaning |
|-------|---------|
| `recommendedDelta` | Argmax final Hedge weight |
| `bestFixedDelta` | Lowest cumulative expert loss |
| `regretVsBestFixed` | meanLossHedge − meanLossBestFixed (≤0 good) |
| `weightOnRecommended` | Concentration on chosen δ |
| `publishedBrier` / `sitOutBrier` | Realized Brier by action |
| `integrityStatus` | `ok` \| `warn_sitout_skill` \| `insufficient_n` |

## Decision matrix

| Condition | Action |
|-----------|--------|
| integrity `warn_sitout_skill` | Do **not** raise selective δ; fix mid-p ranking |
| recommended δ > live δ and integrity ok | Optional founder trial of higher δ after RES re-measure |
| recommended δ < live δ | Live may be too aggressive — re-check published Brier |
| n < 40 | Keep current live δ |

## Law

- Shadow only — never auto-writes `SELECTIVE_PUBLISH_DELTA`
- BS_paused ≈ UNC is the integrity condition (segmented Murphy)
- Dead-group pause is separate durable (`RANKING_PAUSE_APPLY`)

Modules: `adaptive-delta-hedge.ts`, `adaptive-delta-analysis.ts`, OCO pipeline step 3.
