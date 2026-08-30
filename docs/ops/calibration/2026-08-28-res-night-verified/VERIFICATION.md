# Cross-model verification (2026-08-28)

Per the no-unverified-numbers rule (F-13 spirit), the backtest in RESULTS.md was
independently replicated by a DIFFERENT model (Opus) in a clean room: spec only,
explicitly forbidden from reading res_backtest.py or RESULTS.md, own code
written from scratch (pure stdlib, separate scripts).

## Exact agreement (4 decimals)

| metric | original | replication |
|---|---|---|
| Evaluation set (2018–2024, both MLs, no ties) | 1,935 | 1,935 |
| Market Brier | 0.2107 | 0.2107 |
| REL / RES / UNC / ECE | .0013 / .0380 / .2480 / .0308 | .0013 / .0380 / .2480 / .0308 |
| Per-season Brier (all 7 seasons) | — | identical to 4 decimals |
| Spread orientation | home favored when spread_line>0 (WR .675) | same (WR .6747; home = ML favorite in 99.47% of those games) |

## Replication went further (all strengthening the verdict)

- Five Elo parameterizations tried (incl. MOV/538-style, K∈{12,20,32}); best
  still loses to pure market by +0.0119. Fine λ sweep is monotone — optimum is
  λ=1.0 (pure market). Paired t=+1.25 against the best blend; bootstrap
  P(blend beats market)=0.108 over 2,000 resamples. Verdict unchanged:
  market alone wins; blends add noise, not information.
- Binned Murphy identity residual (0.00047) decomposed exactly into within-bin
  variance/covariance terms — closes to 6 decimals; methodology sound.
- Calibration is flat precisely in the well-populated 0.55–0.80 probability
  range (942 games) — the range a selective high-probability board fires in.
  Market p_home observed up to 0.937: genuine ~70%+ probability events exist
  in volume. (Basis for the Green Board: fire only at calibrated p ≥ 0.70.)
- Forensic reproduction of the rejected hermes/res-night-1 figure: flipping
  the spread sign on the 1999–2017 era with divisor 15 scores 0.3378 —
  matching the reported 0.337. That number is now CONFIRMED (not just argued)
  to be an inverted-sign artifact; correct-sign spread CDF scores 0.2112,
  in line with the moneyline market.

## Standing rule

No performance/calibration number enters this evidence directory, the ops
truth surface, or any public copy without an independent clean-room
replication by a second implementation (different model or different author).
