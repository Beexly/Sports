# Brier score optimization techniques (GSE ops)

Updated: **2026-08-10** · Live eligibility (remeasure): Brier **~0.2478** · ECE **~0.0357** · RES **~0.005** · floor **0.22**

## Murphy identity

\[
\mathrm{BS} = \mathbb{E}[(P-Y)^2] \approx \mathrm{REL} - \mathrm{RES} + \mathrm{UNC}
\]

| Term | Want | Live (~) | Lever |
|------|------|----------|-------|
| **UNC** | context | ~0.25 | base rate only |
| **REL** | low | ~0.004 | maps (apply OFF) |
| **RES** | high | ~0.005 | ranking + selective + pause |

**Gap:** need \(\mathrm{RES}-\mathrm{REL} \gtrsim \mathrm{UNC}-0.22 \approx 0.03\). With REL already small, **RES must rise ~6–10×**.

Calibrated shortcut: \(\mathrm{BS} = \mathrm{UNC} - \mathrm{Var}[P]\). Need \(\mathrm{Var}[P\mid A_\delta] \gtrsim 0.03\).

## Technique → code map

| Technique | Module | Live? |
|-----------|--------|-------|
| Independent trueProb / sport models | `build-independent-fair-values.ts`, backfill | **Yes** |
| Evidence shrink + market-anchor blend | `live-calibration-p.ts` | **Yes** (model def, not map) |
| Selective \(\|p-0.5\|\ge\delta\) dual-objective | `selective-publish.ts` | **Yes** (runtime ON) |
| Integrity-guarded δ / segmented Murphy | `segmented-murphy.ts` | **Ops** (RPCP surface) |
| Dead-group pause | `ranking-pause-apply.ts` | Code + durable founder-yes |
| Brier-OGD ensemble | `brier-ogd-ensemble.ts` | **Shadow** |
| Platt / Temp / Beta / Isotonic+CIR | `calibration-map*.ts`, bake-off | **Apply OFF** |
| Stretch / floor theater | forbidden in `brier-minimization-explore.ts` | Never |

## Integrity condition (do not skip)

On paused set \(A_\delta^c = \{|P-0.5|<\delta\}\) (plus paused groups):

- \(\mathrm{BS}_\mathrm{paused} \approx \mathrm{UNC}_\mathrm{paused} \approx 0.25\)
- \(\mathrm{BS}_\mathrm{paused} \ll 0.25\) → **discarding skill** (δ too large)
- \(\mathrm{BS}_\mathrm{paused} \gg 0.25\) → **hiding bad region** (fix model, don't hide)

RPCP fields: `integrityStatus`, `pausedBrier`, `publishedVarP`, `varPGap`.

## Dual objective (selective)

1. Max RES subject to Brier ≤ min(0.26, baseline+0.03)
2. Prefer integrity-ok candidates when RES comparable
3. Never recommend stretch

## What will **not** hit 0.22 alone

- Maps (REL only; live REL already ~0.004)
- More product surface / UI
- Inventing PROVEN or lowering floors
- Probability stretch \(p' = 0.5 + k(p-0.5)\)

## What will

1. More **independent-priced** settles under selective + pause discipline  
2. **Diverse** member signals → Brier-OGD when multi-model p exists  
3. Optional denser books (`THE_ODDS_API_KEY`) for market-anchor quality  
4. Founder Checkout (revenue) — orthogonal but largest product lever  
5. Re-measure calibration-metrics; chase **GREEN×3** only after live Brier ≤ 0.22  

## Law

`PERFORMANCE_STATS` OFF · maps OFF · `AUTO_PUBLISH` false · free-path ABSENT-only · no invent PROVEN.

See also: [MURPHY_RES_AND_BRIER_MIN.md](./MURPHY_RES_AND_BRIER_MIN.md) · [ISOTONIC_LOGLOSS_DEBUG_2026-08-10.md](./ISOTONIC_LOGLOSS_DEBUG_2026-08-10.md) · [CURRENT_STATE.md](./CURRENT_STATE.md)
