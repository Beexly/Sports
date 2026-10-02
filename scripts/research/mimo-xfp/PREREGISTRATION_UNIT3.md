# MIMO Program Unit 3 Pre-Registration

Written 2026-09-18 BEFORE any props-backtest score was computed.

## What Unit 3 tests

Do projection gaps predict closing prop-line error out of sample?
If yes, leans can graduate to edges. If no, they were never edges.

## Method that must be reproduced (not reinvented)

1. Base prior: 2025 full-season per-game means.
2. 2026 Week 1 is a role check only. Efficiency is never blended from a
   one-game sample.
3. Garbage-time correction: filtered per-game means understate full-game volume
   because roughly 11 percent of plays are excluded. Each volume projection is
   multiplied by the measured unfiltered-to-filtered ratio for that exact stat.
   Published ratios in the repo record include Allen attempts 1.025 / yards 1.031,
   Goff attempts 1.105 / yards 1.094, targets spanning 1.042 to 1.195. Use the
   measured ratio for the stat; do not invent a new global fudge.
4. Script-adjusted volume from 2025 dropback rates bucketed by possession win
   probability (example rates in record: Buffalo 50.0 leading / 57.2 neutral /
   61.8 trailing; Detroit 54.2 / 57.1 / 68.2).
5. Split-half stability gating for receptions; injury-game players may use
   when-active share plus role confirmation, and that path must be recorded
   separately, not smoothed over.

## Deliberate nulls (must stay null)

- Individual sack props: refused (pressure-to-sack R^2 under 0.005)
- Longest reception: noise
- Rotational tackle props: noise
A backtest that scores these is measuring its noise floor. Exclude them from
the primary sample and report the exclusion counts.

## Pre-registered primary test

- Horizon: 2025 Weeks 1 through 18 closing prop lines
- Unit of resampling: **week** (not player-prop), because props inside a week
  share game script
- Primary metric: association between projection gap (projection minus closing
  line) and realized closing-line error / grading outcome, with a week-bootstrap
  interval
- Population: props the method actually projects; nulls excluded by name
- Reporting: n, population definition, every exclusion count (no public rate
  without its denominator)

## KILL LINE (binding)

If there is no out-of-sample relationship between projection gap and realized
closing-line error (week-bootstrap CI on the primary association includes 0,
or the association is non-finite), Unit 3 FAILS.
"No relationship at n equals X" is a complete result.

If Unit 3 FAILS, Unit 4 does not start. A better matchup input cannot save
projections that do not predict line error.

## Data requirement (hard)

Closing prop lines for 2025 Weeks 1-18 are required. Free public nflverse data
does not ship sportsbook closing player-prop prices. If no authorized local
export of closing lines exists, Unit 3 is BLOCKED with that exact gap. We do
not fabricate lines. We do not invent a market. We do not use production
credentials or the production database for this research lane.

## Attribution if any number ships

Derived by GSE from licensed/exported line data when available; nflverse
CC BY 4.0 for any play/box inputs. Never republish proprietary charts as ours.
