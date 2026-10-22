# Crosswalk v2 — id join beats name join (3.5x)

Re-pointed the fuzzy name crosswalk at the universal id graph, via `sleeper_id` as the bridge.

- Before: 292 of 1,218 source rows carried a `gsis_id` (name-fuzzy, 98.9% best-case on propfinder).
- After: **1,036 of 1,218** resolve to a real `nfl_id` (and inherit `gsis_id`, `espn_id`, `pfr_id`,
  `pff_id`), i.e. **3.5x the coverage** with zero string matching at the second hop.
- 395 distinct players resolved; output `extracted_data/PLAYER_CROSSWALK_V2.csv`.

## Coverage caveat, from the dataset's own coverage.csv
Row counts per position group (aggregated over entry year × season): DB 142, OL 112, WR 107, DL 100,
LB 93, RB 54, TE 44, QB 23, SPEC 19. The thin QB number is roster arithmetic, not a data hole — there
are only ~32 starters — but it does mean QB joins need the weekly rosters rather than this file alone.

## Note on the residual 182 rows
They are names with no Sleeper match, mostly suffix/initial variants and practice-squad churn. Name
matching still catches a few but the id path is what scales; the right fix for them is rosters by
week, not more fuzzy logic.
