# Player-Prop Findings — a real bias worth tracking (rushing-yards UNDER)

*Generated 2026-06-25 from real The Odds API historical player-prop data (closing lines)
settled against nflverse actual stats. Same honesty gauntlet that killed the totals-under:
pre-register → FDR → replicate → settle. Player-prop history exists from 2023-05-03, so the
THREE completed NFL seasons 2023, 2024 and 2025 are all testable (2026 will add a 4th as it
plays). The rushing-yards UNDER survived all three.*

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
- **Receptions:** tested across all three seasons (wks 1–4) — 2023 leaned slightly OVER
  (50.7%), 2024/2025 leaned UNDER (53.1%, 53.9%). Direction not stable; pooled ~52.1%, below
  break-even. The over-bias is specific to rushing YARDS, not catches. No reliable edge.

## What survived — rushing-yards UNDER (3-season replication)

UNDER in **every** independent sample — three seasons, early and mid weeks:

| Season (wks 1–8) | rush UNDER % | n |
|---|---|---|
| 2023 | 55.6% | 664 |
| 2024 | 53.3% | 737 |
| 2025 (true OOS) | 53.6% | 660 |
| **Pooled** | **54.1%** (p<0.001, 95% CI 52.0–56.3) | **2,061** |

Pooled across all three seasons, by pre-registered line-magnitude bucket (FDR q=0.10):

| Bucket | UNDER % | n | FDR discovery |
|---|---|---|---|
| line < 30 | 53.0% | 1,056 | ✅ |
| line 30–49.5 | **56.6%** | 426 | ✅ |
| line 50–69.5 | 52.0% | 435 | ✗ (efficient) |
| **line ≥ 70** | **61.8%** | 144 | ✅ (p=0.005) |

With the third season the **high-line theory confirmed**: lines ≥ 70 yards (the star RBs
the public piles overs on) cash UNDER at **61.8%** — comfortably profitable even against
−150 juice — while the 50–70 "fair-line" range is efficient (52%). The edge is real,
replicated, FDR-significant, and theory-consistent.

## The honest verdict

- **This is a genuine, three-season-replicated market inefficiency** — the only thing tested
  all session that survived every gate (pre-register → FDR → 3-season replication → settle).
  Overall rush-UNDER 54.1% (n=2,061, p<0.001); the **bankable subset is high lines** (≥70:
  ~62%, 30–49.5: ~57%), avoiding the efficient 50–70 band.
- **It is still not a license to bet the mortgage.** The *overall* 54.1% is only marginally
  above the −110 break-even and roughly break-even vs −115 juice; the high-line subset is
  strong but n=144 is moderate; rush-prop limits are lower than main markets. Bet the subset,
  shop for −110 or better, and size small.
- **What sharpens it further:** forward-test 2026 as it plays; line-shop (the median close
  used here understates a best-line strategy); confirm real limits; and test refinements
  (favored-team RBs, specific books) under the same FDR discipline before trusting them.

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
- Settlement for 2025 uses nflverse `stats_player/stats_player_week_2025.csv` (the season is
  complete as of this writing); 2023/2024 use `player_stats/player_stats_{season}.csv`.
- Code: `scripts/backtest/prop-efficiency-probe.ts` (pull+settle+FDR) and
  `prop-rush-deepdive.ts` (pooled 3-season bucket analysis). ~9,000 credits total spend across
  CLV + prop research this session, all cached (re-runs cost zero).
