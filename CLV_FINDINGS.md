# CLV Findings — NFL early-season totals drift to the UNDER

*Generated 2026-06-25 from real The Odds API historical line-movement data. Method:
`scripts/backtest/clv-feasibility.ts` (open→close consensus, one-sample Student-t per
rule, Benjamini-Hochberg FDR at q=0.10). This is the honest output of the proof engine —
published whether the answer is yes or no.*

## The question

The market-efficiency scan proved there is no free edge in the NFL **closing** line
(0/16 angles, 27 seasons). The one open question was **CLV**: does the line move in a
predictable direction between the **opening** and **closing** number, so that a rule
decided at the open earns positive closing-line value?

## What we did

Reconstructed opening (≈T-120h) and closing (≈T-90min) **consensus** spread/total lines
(median across ~16 books) from historical snapshots, for NFL **weeks 1–4** of **three
independent seasons** (2021, 2022, 2023 — 186 games total). Tested a small, pre-registered
family of 11 entry rules; controlled the whole family with Benjamini-Hochberg FDR. Cost:
~2,600 credits, one-time, cached.

## The result

**One signal replicated across all three seasons; one did not.**

| Rule (bet at the OPEN) | 2021 | 2022 | 2023 | Verdict |
|---|---|---|---|---|
| **total: UNDER** | +0.254 pts, q=0.077 ✅ | +0.457 pts, q=0.015 ✅ | +0.348 pts, q=0.005 ✅ | **REPLICATED 3/3** |
| spread: UNDERDOG | +0.198, q=0.101 ✗ | +0.238, q=0.152 ✗ | +0.687, q=0.000 ✅ | **1/3 — dropped (2023 artifact)** |

In all three seasons, ~55–56% of games had positive under-CLV, and the totals line drifted
**down** (toward the under) from open to close by ~0.25–0.46 points on average. This is a
real, FDR-controlled, out-of-sample-replicated **closing-line-value** signal — consistent
with the well-documented market structure where the public favors overs, books open totals
high, and the number is bet down toward the under as the close forms.

**The discipline mattered:** the underdog-spread signal looked strong in 2023 (q=0.000) but
collapsed out-of-sample (2021/2022). Without the replication test we would have "discovered"
a fake edge. We dropped it.

## What this does and does NOT mean — read this part

**It IS:** a genuine, replicated CLV signal. Beating the close is the ESTABLISHED-rung
criterion, and these unders beat the close on average across three seasons.

**It is NOT (yet) proven profit.** Three honest caveats gate any reliance:

1. **CLV ≠ win rate.** +0.25–0.46 points of *total* CLV is a *leading* indicator. Whether
   betting unders at the open actually **settles** ≥52.4% (the −110 break-even) is a
   separate test we have **not** run. That validation is the next step.
2. **Early-season only.** All three tests are weeks 1–4, when totals are softest. The signal
   may be early-season-specific; it must be tested on mid/late-season slates.
3. **Opening-line liquidity.** "Open" here is ≈5 days out, where real NFL-total betting limits
   are low. The drift is real, but how much money can actually be placed at the opening number
   is a practical constraint on exploitability.

## Next steps (pre-registered, before any reliance)

1. **CLV→profit validation:** does "under at the open" hit ≥52.4% vs the closing total, and
   does it settle profitably net of vig? (Uses the same snapshots + final scores.)
2. **Seasonality:** re-run on weeks 5–18 to test whether the drift is early-season-only.
3. **Liquidity reality check:** how far from the open can the number still be had at usable limits?
4. Feed confirmed CLV samples into the `closing-line-forecaster` walk-forward to see if a
   *model* (not just a fixed rule) sharpens the entry.

## Provenance

- Data: The Odds API historical endpoint (`/v4/historical/sports/americanfootball_nfl/odds`),
  markets=spreads,totals, region=us. Snapshots cached; re-runs cost zero.
- Schedule/teams: nflverse `games.csv` (free, public facts).
- Code: `packages/prediction-engine/src/clv-feasibility.ts` (pure, unit-tested) +
  `scripts/backtest/clv-feasibility.ts` (runner). Verdicts are deterministic and replayable.
