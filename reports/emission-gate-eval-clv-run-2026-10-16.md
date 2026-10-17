# Emission Gate Eval — CLV-BEARING RUN — 2026-10-16

> Frozen protocol: jev-emission-gate-eval-protocol-2026-10-16.md §7. Dataset: emission-gate-eval-set-v2.jsonl rebuilt 2026-10-16 (row set identical to the proxy run: 3694 rows; this run scores the **CLV cut only**: 2404 rows with finite clvValue; proxy cut NOT re-scored — its KILLED verdict stands).
> Split: temporal 50/50 calib 1202 / test 1202. Weights fitted on calib only (1202 rows, 5 IRLS iterations, converged=true).
> Arms identical to the proxy run: gate threshold 0.03 / band 0.01, ensemble blend 0.5 edge>0, market-only emits every row with a market prior.

## Weights (calib, clv cut)

```json
{
  "book_depth_norm": -1.253160218643833,
  "consensus_norm": 0.4868816506645752,
  "ranking_p": 0.696566450351226
}
```

## Arm metrics (test block, n=1202)

| Arm | n | Cov | MeanUnits | 95%CI | WinRate | Brier | ECE | AUC |
|-----|---|-----|-----------|-------|---------|-------|-----|-----|
| gate | 318 | 26.5% | -0.1258 | [-0.2332,-0.0189] | 43.7% | 0.2580 | 0.1404 | 0.5889 |
| ensemble+market | 1143 | 95.1% | 0.0006 | [-0.0592,0.0631] | 50.3% | 0.2653 | 0.1233 | 0.5328 |
| market-only | 1202 | 100.0% | -0.0001 | [-0.0595,0.0573] | 51.9% | 0.2396 | 0.0359 | 0.5883 |
| pass-all | 1202 | 100.0% | -0.0001 | [-0.0595,0.0573] | 51.9% | 0.3214 | 0.2441 | 0.4838 |

## CLV metrics — the primary metric per protocol §7 (emitted sets, test block)

| Arm | n emitted | Beat-close rate | Mean CLV (POINTS kind, n) | Mean CLV (PROBABILITY kind, n) | Markets |
|-----|-----------|-----------------|---------------------------|-------------------------------|----------|
| gate | 318 | 23.6% (75/318) | -0.6514 (318) | — | {"SPREAD":276,"TOTAL":42} |
| ensemble+market | 1143 | 33.6% (384/1143) | -0.2811 (1127) | -0.0396 (16) | {"SPREAD":566,"TOTAL":561,"MONEYLINE":16} |
| market-only | 1202 | 33.0% (397/1202) | -0.2989 (1136) | -0.0539 (66) | {"SPREAD":568,"TOTAL":568,"MONEYLINE":66} |
| pass-all | 1202 | 33.0% (397/1202) | -0.2989 (1136) | -0.0539 (66) | {"SPREAD":568,"TOTAL":568,"MONEYLINE":66} |

**Never pooled across kinds** (repo hard rule): POINTS = spread/total line-value points; PROBABILITY = moneyline implied-prob delta. The two are different units.

**ML price corruption caveat (carried from the 2026-09-28 audit, re-measured today):** of the 252 MONEYLINE rows in the CLV cut, 124 carry clvLockPrice outside a sane −800..+800 band (e.g. −21200, −15000) — prices extrapolated from model probability, never offered by a book. ML beat-close/CLV figures above are contaminated by that defect and are reported as **unreliable**; SPREAD/TOTAL figures carry no such defect (0 insane locks; those rows grade at −110-equivalent flat stakes).

## Read

- Gate emitted beat-close **23.6%** vs market-only **33.0%** vs pass-all **33.0%** — the protocol bar (gate ≥ market-only + 2 pts) is NOT MET.
- Gate emitted meanUnits on the CLV cut: -0.1258 (proxy run: −0.1624). CI [-0.2332, -0.0189].
- Verdict context: the gate's verdict was **KILLED** on the proxy run (2026-10-16, 7 of 9 frozen bars failed). This CLV-bearing run is the protocol's corroboration on true CLV — it cannot resurrect the seat; a SHADOW_SEAT requires the full frozen bars, which were already failed.
- clvDisagreement remains 0 in the gate's decision inputs by design: realized clvValue is a post-settlement label and feeding it into emission decisions would be look-ahead. True CLV enters this evaluation as a SCORED metric, not a gate input.

## Frozen bars — gate arm (CLV-bearing run)

| Bar | Measured | Pass |
|-----|----------|------|
| emitted mean >= +0.02 u/pick | -0.1258 | ❌ |
| 95% CI LB > -0.02 | -0.2332 | ❌ |
| beat-close >= 52.4% | 43.7% | ❌ |
| Brier <= 0.24 | 0.2580 | ❌ |
| Brier margin vs market-only >= 0.005 | -0.0184 | ❌ |
| ECE <= 0.07 | 0.1404 | ❌ |
| AUC >= 0.58 | 0.5889 | ✅ |
| false-pass <= 0.40 | 0.5629 | ❌ |
| emit rate in [15%, 85%] | 26.5% | ✅ |

**Verdict: KILLED**

Kills:
- bars failed: emitted mean >= +0.02 u/pick; 95% CI LB > -0.02; beat-close >= 52.4%; Brier <= 0.24; Brier margin vs market-only >= 0.005; ECE <= 0.07; false-pass <= 0.40

## POINTS-kind only (the reliable cut)

- Gate-emitted spread/total rows: beat-close **23.6%** (75/318), mean CLV -0.6514 pts.
- All POINTS-kind rows (market floor): beat-close 30.6% (658/2153), mean CLV -0.1888 pts. The gate emitted SPREAD/TOTAL rows with CLV -0.4627 pts WORSE than the floor it passed over.

---
*Generated 2026-10-17T00:13:39.497Z by hermes on Windows host. No MODEL_VERSION change. CLV = closing line value.*
