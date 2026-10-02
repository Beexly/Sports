# P0-3 — Confidence-Inversion Ablation (2026-09-08)

Status: MEASUREMENT ONLY. No engine behavior changed. The v5.2.8 fix remains
founder-gated (LAUNCH/00 rule: fix forward as v5.2.8+; publish no numbers until
the 4-leg guard passes honestly after the fix).

## Sources and integrity

- Data: public proof API `GET /api/proof/receipts`, all 45 pages, 1,111 receipts
  harvested 2026-09-08 (snapshot: `docs/data/receipts-snapshot-2026-09-08.json`).
- Integrity: per-row `sha256("leaf:" + pickId + ":" + payload)` recomputed and
  compared to `contentHash`: **1,111/1,111 PASS, 0 mismatches**.
- Subset: valid American odds (`|entryOdds| >= 100`) and decided result
  (WIN/LOSS) → **n = 890** (excludes 199 invalid-odds rows, 19 VOID, 5 PUSH, 7
  unparseable). Overall realized WR on the subset: 51.7%.
- No database, no writes, no engine code touched. Read-only reproduction.

## Anchor: the audit table reproduces exactly

LAUNCH/10 §5 (valid-odds decided subset), reproduced to the decimal:

| conf band | n | realized WR |
|---|---|---|
| 50-54 | 457 | 57.1% |
| 55-59 | 220 | 51.8% |
| 60-64 | 84 | 44.0% |
| 65-69 | 67 | 37.3% |
| 70-74 | 37 | 40.5% |
| 75-79 | 9 | 22.2% |
| 80+ | 16 | 37.5% |

Within-version split (inversion is not a deploy artifact; it persists inside
every model version): v5.1.0 conf<60 55.8% vs >=60 42.5%; v5.2.6 64.9% vs
43.4%; v5.2.7 51.7% vs 32.8%. Within-sport split reproduces the audit's claim
(MLB 38.2% vs 52.5%, MLS 44.4% vs 55.8%, NCAAF 46.5% vs 67.9%, NFL 10% vs 50%).

## Ablation 1 — marketFairProb structure: CONFIRMED (primary suspect)

- `pearson(conf, marketFairProb) = −0.220` (spearman −0.218): committed
  confidence is HIGHEST exactly where the market disagrees most with the pick.
- Realized WR by marketFairProb quartile: 36.0% → 45.7% → 54.1% → 70.9%.
  The market component is strongly predictive in the right direction.
- Decisive: ranking by marketFairProb ALONE yields a monotone ladder
  (quintiles: 34.3% / 46.1% / 50.0% / 52.8% / 75.3%). The signal confidence
  should carry is already present in marketFairProb — and confidence points the
  other way.
- Logistic (Newton-Raphson, no external deps): `WIN ~ conf` gives
  beta(conf) = −0.0402 (se 0.0097, z = −4.13). Adding marketFairProb:
  beta(conf) = −0.0241 (z = −2.42), beta(mfp) = +3.93 (z = +7.32). Confidence
  keeps residual anti-predictive weight after controlling for the market, but
  most of the inversion is the market-disagreement structure itself.

## Ablation 2 — favorite-longshot: RULED OUT

| |entryOdds| bucket | n | realized WR | mean conf |
|---|---|---|---|
| 100-129 | 489 | 50.3% | 57.4 |
| 130-159 | 200 | 37.0% | 56.2 |
| 160-199 | 65 | 44.6% | 57.6 |
| 200-299 | 19 | 57.9% | 54.1 |
| 300+ | 117 | **85.5%** | **53.1 (lowest)** |

The longest prices win at the highest rate while carrying the LOWEST
confidence — the opposite of favorite-longshot bias. Longshots are not the
problem; confidence mis-ranks within the reachable price range.

## Ablation 3 — steam/movement chasing: PARTIAL (proxies only)

The frozen payloads carry no line-movement field, so this hypothesis is tested
by proxies only; it can be confirmed or excluded only with engine-side
commit-path instrumentation.

- Lead time (asOf → commenceTime): mean confidence peaks in the 6-12h window
  (61.7) which realizes only 29.0% (n=62); picks committed >12h out (n=658)
  realize 49.4%. Spearman(conf, minutesToStart) = +0.022 overall — the window
  effect is localized, not a global lead-time gradient.
- Price-vs-fair residual (`marketFairProb − impliedRaw(entryOdds)`) correlates
  +0.018 with confidence; its quartile gradient (71.2% → 39.9%) mirrors
  Ablation 1 and is an artifact of the same market-disagreement structure, not
  independent evidence of steam chasing.

## Mechanism (what the data supports)

`edgeScore` closes the loop:

- `pearson(edgeScore, marketFairProb) = −0.511` — the edge score is essentially
  a market-DISAGREEMENT measure: the further the pick's fair prob sits from the
  market's, the higher the edge.
- Realized WR by edgeScore quartile: **70.3% → 48.0% → 47.3% → 41.3%**
  (monotone decreasing). The "edge" is anti-predictive at the top end.
- WIN vs LOSS means: meanMfp 0.576 (W) vs 0.488 (L); meanConf 55.5 (W) vs 57.6
  (L); meanEdge 24.3 (W) vs 29.1 (L).
- `pearson(conf, edgeScore) = +0.175` — confidence shares the disagreement
  signal (and correlates −0.220 with marketFairProb directly).

Unified statement: the pipeline's market column (marketFairProb) is genuinely
predictive, but the confidence/edge layer is built to reward deviation from
the market. In this regime (sample sizes where model-vs-market divergence is
mostly model noise), deviation is anti-predictive, so realized win rate falls
as committed confidence rises. This is the LAUNCH/10 "marketFairProb leak"
hypothesis, refined: it is not a leak of the probability value into confidence —
it is disagreement-as-edge driving the confidence ordering.

## Recommended fix direction (v5.2.8, founder-gated — NOT applied here)

1. Reorder confidence to be monotone non-decreasing in the calibrated win
   probability (marketFairProb or a properly devigged/calibrated model prob),
   not in model-vs-market disagreement. Sanity target: the mfp-alone ladder
   above (34% → 75%) is what an honest confidence ordering should approximate.
2. Treat edgeScore's disagreement term as a bet-sizing input at most, never as
   a confidence input, until it demonstrates positive resolution out-of-sample.
3. Instrument the commit path (engine-side) to log line movement between
   asOf and commence so the steam-chase hypothesis can be settled with direct
   evidence, not proxies.
4. Acceptance stays as governed: calibration contract (ECE <= 0.06 over >= 250
   settled) evaluated POST-fix on new receipts; ledger shows the fix arc.
   Publish no numbers until the 4-leg guard passes honestly.

## Caveats (stated plainly)

- n = 890; top confidence bands are thin (n = 9-37 in 70+ bands). The band
  table is directionally strong (logistic z = −4.13 univariate) but individual
  top-band percentages are noisy.
- After controlling for marketFairProb, confidence retains significant
  anti-predictive weight (z = −2.42) — but the practical fix is the ordering,
  not the residual coefficient.
- Steam-chase remains unconfirmed/unexcluded (no movement data in payloads).

## Reproduction

```
# harvest + verify (Python, stdlib only):
#   GET https://www.galaxysportsedge.com/api/proof/receipts (cursor-paginated)
#   sha256("leaf:" + pickId + ":" + payload) == contentHash, per row
# snapshot: docs/data/receipts-snapshot-2026-09-08.json (1,111 rows, sha 1111/1111)
# analysis: parse pipe-delimited payload → conf/marketFairProb/entryOdds/edgeScore
#           + row.result, row.game.sport, row.game.commenceTime
```

All numbers in this document were produced by fresh runs over the snapshot on
2026-09-08 (harvest, anchor reproduction, ablations, logistic fit).
