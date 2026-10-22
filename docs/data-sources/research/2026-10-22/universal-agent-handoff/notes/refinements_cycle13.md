# Two refinements: PropFinder avg sub-scores characterised, theScore rosters found

## PropFinder `l5Avg` / `seasonAvg` — characterised, not fully solved
The values are near-binary (0 or 100) and the direction depends on the market, so a single global
fit was never going to work. Measured on 62,217 rows, split by which side of the line the average
falls, rate of value=100:

| category | below line | above line | reading |
|---|---|---|---|
| Q1anytimeTouchdownScorer | — | 1.000 (378) | deterministic step, higher is better |
| H2touchdowns | — | 0.929 (370) | near-deterministic step |
| passingAndRushingYards | 0.86 | | strong |
| Q1passingYards | 0.825 | | strong |
| H1passingYards | 0.832 | | strong |
| receivingYards | 0.448 (16,959) | 0.506 (6,809) | diluted: both sides ~50% |
| rushingYards | 0.447 (7,642) | 0.510 (2,617) | diluted |
| touchdowns | 0.288 (1,595) | 0.505 (101) | step-like, skewed |

So: TD and combo markets score "average beats the line" as an almost hard gate; high-line yardage
markets are weak on both sides, which is why the pooled correlation collapsed to ~0.05. Median
separation across 28 well-populated categories is 0.49. The remaining unknown is the exact knee for
the yardage markets, and that genuinely needs a second-day snapshot (same games, re-priced lines).

## theScore rosters — path found
`/nfl/teams/{id}/rosters` 404s, but **`/nfl/teams/{id}/players`** returns 200 (268 KB for ARI).
Pulled across team ids 1-34: **1,680 players**, with position and player ids.
`extracted_data/thescore_nfl_rosters_2026-10-22.csv`.
Caveats: `jersey_number`, `status` and `depth_chart_position` are null on these rows — it is a roster
list, not a depth chart, so it establishes team membership and position and nothing deeper.
