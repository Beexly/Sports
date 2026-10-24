# completionProbability is depth-independent at 140 rows — near-decisive

Found the volume path: `/api/leaders/expectation/completion/week?season=&week=` is a **weekly leaders**
endpoint serving the same `play`+`leader` structure, 20 rows per week. Harvested weeks 1–7 (280 rows total,
140 with a completion probability) to `extracted_data/ngs_expectation_leaders_2025_w1_7.csv`.

**The flatness holds, and if anything gets flatter.** Spearman(airYards, cp) = **−0.086, p = 0.32**.
Binned means: 5–15 yd 0.266 · 15–25 yd 0.272 · 25–60 yd 0.256.

Four times the sample, same answer, no monotonicity, and the deepest bin is the *lowest*. A 47-yard throw is
scored fractionally worse than a 9-yard one.

## What this now rules out
At 140 rows a moderately sized depth effect would have shown. So `completionProbability` as served is **not
a depth-driven xComp** and cannot be used as one. The remaining explanation is tracking conditioning:
probability is computed on the tracking frame (separation, closing speed, window), and because deep throws
are attempted only into open space, the depth term is offset almost exactly. Depth and openness trade off —
which is also why the surface still selects for highlight plays: they are the conversions of exactly those
open deep shots.

## Practical consequence
Treat `completionProbability` as a **play-class-conditional** probability, comparable within similar
depths, not across them. The BDB-derived xComp (which rose correctly with depth, AUC 0.746, separation
coefficient +0.29) remains the better forecast model and should be the default.

## Caveats
- Still highlight-only: 20 rows/week is a leaderboard cap, not all plays; selection toward spectacular
  completions persists.
- Only weeks 1–7 of 2025 harvested; single season.
- Single season means no check on whether this is a stable model property or a 2025 artefact.
- `ryoe`/`ery` leader surface answered 403 as a bare path and its weekly route returned 0 rows earlier, so
  the RYOE expectation remains unrecovered.
