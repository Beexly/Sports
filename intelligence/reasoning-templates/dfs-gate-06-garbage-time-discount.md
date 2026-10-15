# DFS GATE 06 — Garbage-time discount

- census_id: C-069
- family: dfs-process
- kind: stamped reasoning template
- cadence: Wednesday–Thursday — pool construction, when recent-form windows are read
- inputs: recent player game logs with quarter/context splits (engine signals; play-by-play where the split is needed)
- stamp_discipline: weekly slate lock timestamps (process record) — each discounted line in a player's form window is recorded with the game state that produced it
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: C-064 (GATE 01 pool construction)
- failure_lesson: Lessons log 03 (2026-09-27) — Schultz's 14-target Week 2 was 8 fourth-quarter catches chasing Cincinnati; in a close 19-17 game Stroud threw for 167 total and Schultz vanished.

## Rule

4th-quarter trailing volume discounted hard.

## Enforcement

Production accumulated while trailing late is context, not form. When a player's recent window is cited in the build, the garbage-time share of that production is named and discounted before the window is treated as a projection input — a target count earned chasing a lost game does not project into a close one.

## Record

Per cited player window: raw line, garbage-time portion, discounted reading used.
