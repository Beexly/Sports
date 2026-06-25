# Player-Prop Findings — a real bias worth tracking (rushing-yards UNDER)

*Generated 2026-06-25 from real The Odds API historical player-prop data (closing lines)
settled against nflverse actual stats. Same honesty gauntlet that killed the totals-under:
pre-register → FDR → replicate → settle. Player-prop history only exists from 2023-05-03,
so 2023 and 2024 are the ONLY two NFL seasons available — a hard ceiling on replication.*

## Why props

Sides/totals closing lines are efficient (0/16 angles over 27 seasons; the under "edge"
died on settlement). Player props are less shopped and less sharp, so a settleable bias is
more plausible. We pulled historical CLOSING prop lines, settled each against the player's
real stat, and FDR-tested over/under bias vs the 52.4% (−110) break-even.

## What died (the discipline working)

- **Passing yards:** UNDER 58.6% in 2024 wks 1–4 (looked great) → **OVER 51.6% in 2023**.
  Sign flipped out-of-sample. Pure noise. Dropped.
- **Receiving yards:** mild under both years (52.0%, 51.5%) but never significant and below
  break-even — efficient enough. No edge.

## What survived — rushing-yards UNDER

UNDER in **all four** independent samples (both seasons × early/mid weeks):

| Sample | rush UNDER % | n |
|---|---|---|
| 2024 wks 1–4 | 52.2% | 379 |
| 2024 wks 5–8 | 54.5% | 358 |
| 2023 wks 1–4 | 57.4% | 350 |
| 2023 wks 5–8 | 53.5% | 314 |
| **Pooled** | **54.4%** (p=0.001, 95% CI 51.8–57.0) | **1,401** |

Pooled, by pre-registered line-magnitude bucket (FDR q=0.10):

| Bucket | UNDER % | n | FDR discovery |
|---|---|---|---|
| line < 30 | 54.2% | 708 | ✅ |
| line 30–49.5 | **57.2%** | 299 | ✅ |
| line 50–69.5 | 50.6% | 310 | ✗ (coin flip) |
| line ≥ 70 | 59.5% | 84 | thin |

The bias is real, replicated, and FDR-significant — concentrated on **sub-50-yard lines**
(the cleanest subset, ~55–57%), not the highest lines as the naive "stars get over-bet"
theory predicted. It is consistent with the public favoring overs on the run game, books
shading rush lines up, and unders cashing.

## The honest verdict

- **This is the strongest candidate found.** It clears the vig break-even on the point
  estimate (54.4%, sub-50 lines ~57%), survives FDR, and replicates across every sample we
  have. That is a genuinely different result from everything else tested.
- **It is NOT a confirmed printer.** The 95% CI floor (~51.8%) dips below break-even; only
  two seasons of prop data exist (no third for true out-of-sample); the edge over −115 juice
  (53.5% break-even) is thin; and rush-prop limits are lower than main markets.
- **What would confirm it:** forward-test on the 2025 season as it settles (the one true OOS
  left); shop the best line across books (raises the realized rate above the median-line
  rate used here); check real limits; and re-confirm the sub-50-line concentration holds.

## Why this matters for the platform

This is the product working as designed: of everything tested tonight — closing-line angles
(dead), totals-under (died OOS), pass-yds (sign-flipped), receiving-yds (efficient) — exactly
**one** survived every gate, and it survived as a *modest, caveated* edge, not a fantasy.
That honesty — publishing the one real candidate with its confidence interval and its risks,
and killing the four that didn't make it — is worth more than any "lock of the week."

## Provenance

- Prop lines: `/v4/historical/sports/americanfootball_nfl/events/{id}/odds`, markets=
  player_rush_yds (+pass/reception in the efficiency probe), region=us, close ≈ T-90min.
  Cached; the deep-dive re-analysis cost zero credits.
- Settlement: nflverse `player_stats_{season}.csv` (free), matched on player+week.
- Code: `scripts/backtest/prop-efficiency-probe.ts` (pull+settle+FDR) and
  `prop-rush-deepdive.ts` (pooled bucket analysis). ~6,700 credits total spend, cached.
