# CLV Findings — a real signal that did NOT survive settlement (the discipline working)

*Generated 2026-06-25 from real The Odds API historical line-movement data + free
nflverse scores. This is the honest output of the proof engine — published whether the
answer is yes or no. **Bottom line up front: we found a statistically real CLV signal
(line drifts to the under), got a 58.8% in-sample settlement rate, then DISPROVED it as
a profitable edge with an out-of-sample seasonality check — and caught a data bug that
was inflating the number along the way. No edge to stake. That self-correction is the
product.***

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

## Step 2 — settlement: does the CLV convert to profit? (`clv-under-settlement.ts`)

Bet the UNDER at the **opening** total, settle against the actual game total (cached
snapshots + nflverse scores, zero new credits):

| | UNDER at OPEN | UNDER at CLOSE (same games) |
|---|---|---|
| 2021–2023 wks 1–4, pooled | **58.8%** (n=182, p=0.018, 95% CI 51.5–65.7) | **57.3%** (n=185, p=0.047) |

58.8% clears break-even — but the **close also hit 57.3%** on the same games. That is the
tell: most of the win rate is "unders won in 2021–2023," not a beat-the-close timing edge.
The pure open-vs-close gain is only ~1.5 points. Time to test it out of sample.

## Step 3 — seasonality, out of sample: the edge does NOT survive (`under-seasonality-probe.ts`)

UNDER at the **close**, every nflverse regular-season game **1999–2025** (free data),
after excluding unplayed future games (a data bug initially inflated this by 61 phantom
2026 "under" wins — caught and fixed):

| Week bucket | n | under rate | significant? |
|---|---|---|---|
| **weeks 1–4** | 1,650 | **51.1%** | no (p=0.375) — **below 52.4%** |
| weeks 5–9 | 1,861 | 48.7% | no |
| weeks 10+ | 3,357 | 51.2% | no |

Only **5 of the last 12 seasons** had weeks-1–4 unders clear 52.4% (2016: 44.4%, 2020:
41.9%, 2025: 50.0%). **The 2021–2023 window was simply under-heavy.** Over 27 seasons,
early-season unders settle at a coin-flip 51.1% — under the −110 break-even.

## Verdict — read this part

- **The CLV microstructure signal is real:** NFL totals do drift toward the under from open
  to close (replicated 3/3 seasons). That part stands.
- **It does NOT convert to a profitable, repeatable edge.** The strong 2021–2023 settlement
  was a lucky sample; the 27-season early-season under rate is ~51%, below break-even and not
  significant. **Do not stake on it.**
- **This is the platform working exactly as designed.** Twenty minutes separated "58.8%, we
  found an edge!" from "no — out-of-sample it's a coin flip, and one number was a data bug."
  An honest "no edge" is the deliverable. The win rate we refuse to fake is worth more than
  any equation.

## What this proves about the method

The closing line is efficient (confirmed again). The only durable opportunity, if any, is
CLV *timing* against a closing line we can forecast — which is why the
`closing-line-forecaster` exists. But timing CLV only pays if the close is an efficient,
beatable target AND the drift exceeds vig + the limit you can actually bet at the open.
Future candidates run through this same gauntlet: pre-register → FDR → out-of-sample
replication → **settlement** → seasonality/robustness → liquidity. Most will die here. Good.

## Provenance

- Data: The Odds API historical endpoint (`/v4/historical/sports/americanfootball_nfl/odds`),
  markets=spreads,totals, region=us. Snapshots cached; re-runs cost zero.
- Schedule/teams: nflverse `games.csv` (free, public facts).
- Code: `packages/prediction-engine/src/clv-feasibility.ts` (pure, unit-tested) +
  `scripts/backtest/clv-feasibility.ts` (runner). Verdicts are deterministic and replayable.
