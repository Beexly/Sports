# The BDB 2027 tracking files are subject-only — full separation is NOT computable from them

Discovered the competition ships tracking we never downloaded: `game_tracking_2023.csv` (320 MB),
2024 (718 MB), 2025 (1.02 GB), plus `combine_tracking.csv`. Downloaded 2023 and inspected.

## The constraint
3.67 M rows, 31,690 plays. Rows per play mean 115.7, but **distinct players per play median 1**, mean 1.61,
max 6. Distribution: 17,738 plays track exactly ONE player, 9,662 track two, and only 873 track four or more.
Median rows per frame: **1.0**.

So these are not 22-man frames. The file follows *subject* players (the 2027 task is player-centric, and
`combine_tracking.csv` points the same way). Every play is a handful of tracked individuals over ~70 frames at
10 Hz.

## What that broke
Computed "separation at pass forward" as nearest tracked non-subject player distance on 864 plays and got a
mean of **15.5 yd** — versus NGS's 3.0–3.2 for true separation. The gap is not a units bug: with one or two
players tracked per play, the covering defender is usually not in the frame, so the nearest tracked body is
whoever else happened to be followed.

Direction still held (completed passes 14.8 vs incomplete 17.0, i.e. wider = worse), but only as a curiosity.

## What it means
- **Ghosts-style 2D density is out of reach from BDB 2027 alone.** It needs full-22 frames, which this
  competition does not ship. The NGS gamecenter aggregates (avgSeparation, avgCushion) remain the only true
  separation numbers available here.
- The subject tracking is still valuable for what it is: per-player kinematics — speed, acceleration,
  orientation, direction — for the specific players the task targets.
- Anyone assuming BDB 2027 includes play-level tracking for modelling coverage will lose a cycle. Documented so
  we do not.

## Caveats
- Checked 2023 only; the 2024/2025 files are larger but the schema and the 1–6 player structure are the same by
  design, so the conclusion likely carries (unverified).
- The 864-play separation sample is small and, per above, systematically over-dispersed.
- Event coverage (`pass_forward`, `pass_outcome_*`) is complete per play, so outcomes join cleanly even where
  only one player is tracked.
