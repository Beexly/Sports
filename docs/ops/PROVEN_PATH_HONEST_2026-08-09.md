# Honest path to PROVEN — 2026-08-09

## Definition (hard)
PROVEN = ladder step when:
1. Canonical settled ≥ floor (met: 1017 ≥ 100)
2. Live eligibility **GREEN** for streak K=3
3. Publish policy effective (AUTO_PUBLISH or PUBLISHED)
4. `canExposePerformanceStats` = publishedEffective && GREEN

Floors (live): Brier ≤ 0.22 · ECE ≤ 0.05 · Murphy REL ≤ 0.05 · n ≥ 100

## Why we were stuck (RED)
Live class ~ Brier 0.275 / ECE 0.112 / RES 0.002.
Root causes (measured, not narrative):
1. **p = confidence/100 on SPREAD/TOTAL** treated rank scores as probabilities → artificial overconfidence.
2. **independentCoverage 0%** on historical sample → ranking cannot raise RES.
3. **Maps OFF** (correct) — cannot rewrite p with isotonic to invent GREEN.

## What we shipped this session
1. **Honest live p resolver** (`live-calibration-p.ts`):
   - prefer `marketFairProb` → independent `trueProb` → MONEYLINE confidence only
   - **exclude** SPREAD/TOTAL without fair p from absolute floors
2. Wired into `calibration-metrics` cron + durable metrics path
3. Signal slate generation (independents → future rankingP coverage)
4. Reliability chart component for ops/methodology
5. RPCP residual attribution (primary bottleneck: missing_independent)

## Progression ladder (no invent)
| Step | Action | Effect |
|------|--------|--------|
| A | Deploy honest p + re-run calibration-metrics | Recompute Brier/ECE without rank-as-p pollution |
| B | generate-signal-slate every 2h | New picks with independent rankingP |
| C | Settle + accumulate | RES rises when independents price |
| D | 3 consecutive GREEN runs | streak |
| E | AUTO_PUBLISH or founder PUBLISHED | performance surfaces open |

## Regression guards
- Never conf-echo rankingP as independent
- Never edge-as-p
- Maps remain OFF until offline bakeoff shows holdout improvement AND founder enables
- PERFORMANCE_STATS stays dark while RED

## Charts
Reliability diagram component: `components/calibration/reliability-chart.tsx`
Ops bakeoff methods offline: temperature / Platt / PAVA — research only until maps gate.

## Founder optional
- Restore THE_ODDS_API_KEY → market board + marketFairProb density
- After GREEN streak: AUTO_PUBLISH=true or set publish flag
