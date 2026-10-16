# Emission Gate Eval — 2026-10-16

> Frozen protocol: jev-emission-gate-eval-protocol-2026-10-16.md
> Dataset: emission-gate-eval-set-v2.jsonl — 3694 settled prod picks (period 2026-06→2026-10), split calib 1847 / test 1847 (temporal 50/50).
> Weights fitted on calib only; scored on test block. PROXY-CLV where noted.

## Arms (test block, n=1847)

| Arm | n | Cov | MeanUnits | 95%CI | WinRate | Brier | LogLoss | ECE | AUC | Dup | FalsePass | FalseReject |
|-----|---|-----|-----------|-------|---------|-------|---------|-----|-----|-----|-----------|-------------|
| gate | 351 | 19.0% | -0.1624 | [-0.2667,-0.0565] | 41.9% | 0.2496 | 0.6924 | 0.1172 | 0.6157 | 0.0% | 0.581 | 0.596 |
| ensemble+market | 1236 | 66.9% | 0.0137 | [-0.0438,0.0700] | 51.0% | 0.2627 | 0.7202 | 0.1151 | 0.5372 | 0.0% | 0.490 | 0.668 |
| market-only | 1303 | 70.5% | 0.0144 | [-0.0442,0.0731] | 52.7% | 0.2376 | 0.6658 | 0.0354 | 0.5975 | 0.0% | 0.473 | 0.645 |
| pass-all | 1847 | 100.0% | 0.0946 | [0.0467,0.1399] | 56.2% | 0.2998 | 0.8383 | 0.2070 | 0.4464 | 0.0% | 0.438 | — |
| edge-threshold>0 | 1236 | 66.9% | 0.0137 | [-0.0438,0.0700] | 51.0% | 0.3245 | 0.9112 | 0.2501 | 0.4890 | 0.0% | 0.490 | 0.668 |

## Weights (harness artifact, calib n=1847)

```json
{
  "weights": {
    "book_depth_norm": -0.7632141075437198,
    "consensus_norm": 0.2634071984409332,
    "ranking_p": 0.2797496925134988
  },
  "method": "logistic-stacking-l2",
  "fittedOn": "calib-50pct",
  "nRows": 1847,
  "lambda": 0.001,
  "harnessArtifact": true,
  "iterations": 5,
  "converged": true
}
```

## Frozen Bars — Gate Arm

| Bar | Measured | Pass |
|-----|----------|------|
| emitted mean >= +0.02 u/pick | -0.1624 | ❌ |
| 95% CI LB > -0.02 | -0.2667 | ❌ |
| beat-close >= 52.4% | 41.9% | ❌ |
| Brier <= 0.24 | 0.2496 | ❌ |
| Brier margin vs market-only >= 0.005 | -0.0119 | ❌ |
| ECE <= 0.07 | 0.1172 | ❌ |
| AUC >= 0.58 | 0.6157 | ✅ |
| false-pass <= 0.40 | 0.5812 | ❌ |
| emit rate in [15%, 85%] | 19.0% | ✅ |

**Verdict: KILLED**

Kills:
- bars failed: emitted mean >= +0.02 u/pick; 95% CI LB > -0.02; beat-close >= 52.4%; Brier <= 0.24; Brier margin vs market-only >= 0.005; ECE <= 0.07; false-pass <= 0.40


### gate — reliability (3 bins)

- 0.4-0.5: n=100 meanP=0.451 winRate=0.280 gap=0.171
- 0.5-0.6: n=248 meanP=0.569 winRate=0.476 gap=0.094
- 0.6-0.7: n=3 meanP=0.602 winRate=0.333 gap=0.268

Notes: clvDisagreement absent on every row (clv_available=false) -> disagreement term 0; PROXY-CLV; simulation layer not run on the proxy set -> tailVerdict not_run per candidate; stacking weights: harness artifact, fitted on calib-50pct (n=1847, 5 IRLS iterations)

### ensemble+market — reliability (5 bins)

- 0.3-0.4: n=4 meanP=0.352 winRate=0.500 gap=0.148
- 0.4-0.5: n=29 meanP=0.475 winRate=0.448 gap=0.027
- 0.5-0.6: n=341 meanP=0.561 winRate=0.469 gap=0.091
- 0.6-0.7: n=778 meanP=0.648 winRate=0.523 gap=0.125
- 0.7-0.8: n=84 meanP=0.719 winRate=0.571 gap=0.147

Notes: uniform base-signal mean blended 0.5 with market prior; emit iff edge > 0

### market-only — reliability (10 bins)

- 0.0-0.1: n=3 meanP=0.076 winRate=0.667 gap=0.590
- 0.1-0.2: n=1 meanP=0.113 winRate=0.000 gap=0.113
- 0.2-0.3: n=1 meanP=0.296 winRate=1.000 gap=0.704
- 0.3-0.4: n=128 meanP=0.367 winRate=0.305 gap=0.062
- 0.4-0.5: n=370 meanP=0.478 winRate=0.505 gap=0.027
- 0.5-0.6: n=707 meanP=0.510 winRate=0.535 gap=0.025
- 0.6-0.7: n=22 meanP=0.646 winRate=0.818 gap=0.172
- 0.7-0.8: n=24 meanP=0.754 winRate=0.708 gap=0.045
- 0.8-0.9: n=19 meanP=0.866 winRate=1.000 gap=0.134
- 0.9-1.0: n=28 meanP=0.945 winRate=0.929 gap=0.016

Notes: emits every row with a market prior; the floor the gate must beat by the frozen margins

### pass-all — reliability (6 bins)

- 0.4-0.5: n=439 meanP=0.431 winRate=0.620 gap=0.188
- 0.5-0.6: n=225 meanP=0.562 winRate=0.609 gap=0.047
- 0.6-0.7: n=251 meanP=0.649 winRate=0.546 gap=0.103
- 0.7-0.8: n=416 meanP=0.754 winRate=0.553 gap=0.201
- 0.8-0.9: n=460 meanP=0.848 winRate=0.520 gap=0.328
- 0.9-1.0: n=56 meanP=0.926 winRate=0.411 gap=0.516

Notes: Tier A reference from the design: pooled -0.0859 u/pick (Motif measurement)

### edge-threshold>0 — reliability (5 bins)

- 0.5-0.6: n=130 meanP=0.581 winRate=0.523 gap=0.058
- 0.6-0.7: n=211 meanP=0.648 winRate=0.493 gap=0.155
- 0.7-0.8: n=389 meanP=0.754 winRate=0.530 gap=0.224
- 0.8-0.9: n=450 meanP=0.848 winRate=0.509 gap=0.339
- 0.9-1.0: n=56 meanP=0.926 winRate=0.411 gap=0.516

Notes: known reference: pooled passed-set -0.1249 u/pick at this rule (Motif, worse than pass-all)

---
*Generated 2026-10-16T23:32:15.813Z by hermes on Windows host. No MODEL_VERSION change.*
