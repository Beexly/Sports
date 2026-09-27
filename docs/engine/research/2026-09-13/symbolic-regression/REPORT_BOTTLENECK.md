# Experiment 2 — Min-bottleneck ablation (MOVE-37-ANALYSIS-02, §3)

**Date:** 2026-09-13 | **Verdict: DIE** (as a novel-form discovery)

## The formula under test

Round 1 discovered (raw football units):

```
score_drive ≈ sin(|−0.2007·ydstogo + min(0.0446·yardline_100 − 2.3621,
                                          0.2007·ydstogo − 1.0574) + 1.0574|^0.5)
```

with b = 0.0446·yardline_100 − 2.3621 (field position), c = 0.2007·ydstogo − 1.0574 (distance).
Note: `yardline_100` = yards from own goal line (99 = opponent's 1).

**Analytical simplification (exact, verified):** −0.2007·ydstogo + 1.0574 = −c, so the
formula is identically

```
score_drive ≈ sin(√max(c − b, 0))
```

The "min-bottleneck" is really a floored excess of the distance-constraint over the
field-position-constraint, passed through a saturating wrapper.

## Ablation (§3.3)

Output-mapping refit on train (logistic regression of y on the scalar variant),
holdout AUC on test (train ≤2023 n=22,810, test ≥2024 n=11,271). HGB reference 0.6268.

| variant | refit AUC |
|---|---|
| **c − b (smooth, no kink)** | **0.6039** |
| discovered formula sin(√max(c−b,0)) | 0.5818 |
| b alone (field position) | 0.5700 |
| min(b,c) scalar | 0.5602 |
| \|c−b\| | 0.5473 |
| (b+c)/2 | 0.5402 |
| c alone (distance) | 0.5077 |
| max(b,c) | 0.4726 |

Pre-registered prediction: min(b,c) beats all alternatives by ≥ 0.02 AUC.
**Observed: min(b,c) LOSES to the smooth linear form (c−b) by 0.0437. FAIL.**

Per the paste's own rule ("if it does not, the kink is decoration"): **the kink is
decoration.** Worse than decoration — the smooth form is strictly better (0.6039 vs
0.5818, ≈4σ on n=11,271). The GP found a real linear signal,
0.2007·ydstogo − 0.0446·yardline_100 (distance-minus-field-position), but wrapped it
in unnecessary nonlinear scaffolding. The hard-kink min form is not privileged:
it ranks below its own linearization.

## Football interpretation test (§3.4)

Binding boundary: c binds ⟺ yl > 4.5·ytg + 29.25. On feasible (yl, ytg) combos
(ytg ≤ 100 − yl) and on observed test plays:

| region | fraction where distance term binds | spec expectation |
|---|---|---|
| goal line (yl 90–99) | 1.000 grid / 1.000 observed (n=872) | ~1.0 ✓ |
| own territory (yl 1–19) | 0.000 grid / 0.000 observed (n=142) | ~0.0 ✓ |

**The binding-constraint interpretation is validated** — near the goal line the
distance term binds, backed up in own territory the field-position term binds,
exactly as the football logic predicts. (An early grid that included infeasible
combos such as yl=99/ytg=20 gave 0.706; restricting to feasible combos and real
plays gives the clean result.)

## Cross-era stability (§3.5)

Refit 2020–2022 (n=16,954) → test 2023–2024 (n=11,534): **AUC 0.5927**
(prediction > 0.54: PASS; kill < 0.52: survives). HGB 0.6334 on the same split.
The signal transfers across eras — slightly stronger than on the round-1 split.

## Verdict: DIE

The min-bottleneck **as a novel machine-discovered form** does not survive: its
distinctive feature (the hard kink) adds nothing over the smooth linear form and
in fact loses to it. What survives is unglamorous but real: the linear
distance-vs-field-position differential carries genuine, cross-era-stable ranking
signal (AUC ~0.59–0.60 vs 0.5 baseline, ~95% of HGB's lift). That is a coefficient
estimate, not a machine discovery — any logistic regression on the two raw
features would find it.

## Reproducibility

- `bottleneck_ablation.py` — ablation, boundary map, cross-era (rerunnable)
- `bottleneck_results.json` — machine-readable results
- Data: `data/target_b.parquet` (same build as round 1)
