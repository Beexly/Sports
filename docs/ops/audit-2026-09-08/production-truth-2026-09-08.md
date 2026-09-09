# Production truth surface, read live 2026-09-08 15:37-15:39 UTC

Source: `GET https://www.galaxysportsedge.com/api/ops/public-surface-truth` (public detail) and
`GET /api/picks` (anonymous). `generatedAt` is the surface's own timestamp, not mine. Read-only.

---

## 1. THE HEADLINE: our own platform reports that the market outscores every score we produce

The truth surface carries a field named `bestScore`. Its value right now is:

```
"bestScore": "marketFairProb"
"bestSeparation": 0.05494880426990467
```

That is not an inference of mine. The platform ran its own bake-off and named the market.
The pooled table it is computed from (`provenPath.scoreBakeoff`):

| score | n | Brier ↓ | ECE ↓ | Murphy resolution ↑ | separation ↑ | coverage |
|---|---|---|---|---|---|---|
| confidence | 1823 | 0.2620 | 0.1029 | 0.0023 | 0.0147 | 1.000 |
| independent_trueProb | 1132 | 0.2475 | 0.0838 | 0.0112 | 0.0505 | 0.844 |
| blend_indep_conf | 1132 | 0.2474 | 0.0902 | 0.0079 | 0.0330 | 0.844 |
| **marketFairProb** | **1039** | **0.2337** | **0.0280** | **0.0185** | **0.0673** | 0.774 |

The market's de-vigged probability wins on **every** metric: better Brier, three times better
calibrated (ECE 0.028 vs our best 0.0838), and — the one that matters most — **more Murphy
resolution than any score we generate**. Resolution is ranking power. The market discriminates
winners from losers better than our model does.

On MONEYLINE specifically (`provenPath.scoreBakeoffByMarket`):

| market | score | n | Brier | ECE | resolution | separation |
|---|---|---|---|---|---|---|
| MONEYLINE | confidence | 745 | 0.2332 | 0.1156 | 0.0118 | **-0.0018** |
| MONEYLINE | independent_trueProb | 712 | 0.2338 | 0.0858 | 0.0080 | 0.0056 |

**The confidence score's separation on moneylines is negative.** Mean forecast probability on the
picks that won is *lower* than on the picks that lost. At n 745 that is not a rounding artifact of
a handful of rows; it is the score having no usable discrimination on that market, pointing very
slightly the wrong way.

### The confounds, stated so nobody over-reads this

1. **Coverage differs.** `marketFairProb` is scored on 77.4% of rows, `confidence` on 100%. They
   are not the same row set. The market score is evaluated only where a market exists, which is
   plausibly a more liquid, better-covered, easier subset. Putting all four scores on an identical
   row set is a measurement nobody has run and it should be run before anyone acts on the size of
   the gap. The *direction* is unlikely to reverse; the magnitude is not established.
2. **The outcomes are contaminated.** C-247: settled results on this record are partly wrong,
   including 8 moneyline results recorded as the opposite of what happened. Every number in the
   table above is a measurement over those inputs.

Neither confound rescues the finding. A product whose premise is "we beat the market by reading
the math" reports, on its own surface, that it does not beat the market.

---

## 2. NFL Week 1 has essentially no board, on launch weekend

`marketCoverage`, window 72h from 2026-09-08 15:38 UTC:

| sport | games | MONEYLINE | SPREAD | TOTAL |
|---|---|---|---|---|
| americanfootball_nfl | 6 | **0 (none)** | 2 (covered) | **0 (none)** |
| americanfootball_ncaaf | 2 | **0 (none)** | 1 | 1 |
| baseball_mlb | 35 | 26 | 15 | 15 |
| soccer_usa_mls | 16 | 4 | 12 | 13 |

Six NFL games in the window and **two picks total**, both spreads, no moneylines, no totals. The
flagship sport of the launch weekend is effectively unpublished, while MLB carries the product.

---

## 3. What is CORRECTLY closed, verified live

- `gates`: `statsPublic false`, `contestsPublic false`, `canExposePerformanceStats false`,
  `envPerformanceStatsEnabled false`, `calibrationPublished false`, `isBootstrapMode false`,
  `demoPicksEnabled false`, `stubMode false`. Every unearned claim is dark.
- `pricingPhaseReadiness`: FOUNDING, `eligible: false`, unmet = "published calibration curve".
- `calibrationEligibility`: **RED**, single reason "Settlement not healthy",
  `consecutiveGreen 0 of 3`. Floors themselves pass (n 475, ECE 0.0466, Brier 0.1898,
  Murphy reliability 0.005) but the streak cannot start while settlement is DEGRADED.
- **The free-tier paywall is enforced server-side.** Anonymous `GET /api/picks` returns
  `{"tier":"FREE","total":2,"totalAvailableToday":42,"hitDailyLimit":true,
  "canSeeConfidence":false,"canSeeFactorBreakdown":false,"containsSeedData":false}` and exactly
  2 picks. The gate is real, not cosmetic.
- `settlement`: DEGRADED, `overduePending` 2 of 2694 — ordinary churn, not a stuck cohort.

---

## 4. One tension worth a founder answer

`selectiveRuntime.pause.planPauseGroups` contains `baseball_mlb|MONEYLINE` — the plan wants that
group paused for lack of ranking power. MLB moneyline is also the stratum carrying the entire
calibration pool (`bySport`: MLB n 373 of 475, ECE 0.0451, hit 0.654 against meanP 0.646). Only 2
of the 6 planned groups are durably applied (`pausedGroupCount: 2`, set by the founder
2026-08-10) and the surface does not print which 2, so **whether MLB moneyline is actually paused
is NOT established here**. If it is, the calibration claim rests on a group the plan calls dead.
That is a question, not a finding.

---

## 5. Deployment note carried by the surface itself

```
"sha": "8cc069585871d8a316714ce93bf1022a31b892eb",
"note": "Redeploy after main merges (honesty/Jynx/free-lane). Settlement CRITICAL or SHA lag → redeploy before matching code."
```

Whether that SHA is current `main` was NOT checked in this pass.
