# Prop-board reconciliation — 3 sources, canonical stat vocabulary

Applied the id crosswalk and a stat-name canonicaliser to the prop boards from propfinder,
PrizePicks and Underdog (74,306 rows total).

## Results
- **98.4%** of rows resolved to an `nfl_id` via the crosswalk (73,083 of 74,306) — the id graph holds
  up at scale, not just on a sample.
- Before canonicalisation: 7,757 player-stat pairs, 764 on 2+ sources, **0** on all three (the
  vocabularies were disjoint: `H1passingYards` vs `1H Pass Yards`).
- After canonicalisation (period prefix + base stat): 5,502 pairs, **1,817 on 2+ sources, 674 on all
  three**. Output `extracted_data/UNIFIED_PROPS_canon.csv`.

## Caveat that matters
Each source offers *different lines* for the same player-stat, so equality of `(nfl_id, stat)` is
not equality of market. Comparison has to be against the line with a tolerance, not row-to-row.
Canonicalisation also collapses alternates (a 25.5 and a 49.5 receiving-yards row are the same pair),
so pair counts are expected to exceed distinct markets.

## Why it matters
674 three-source player-stat overlaps is the substrate for consensus pricing: three independent
books-of-record on one market, with the crosswalk guaranteeing identity. Before this cycle the boards
could not be joined at all.
