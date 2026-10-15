# DFS GATE 05 — Weather gate

- census_id: C-068
- family: dfs-process
- kind: stamped reasoning template
- cadence: Sunday AM — verification within hours of lock
- inputs: Weather.com game-day readings (numbers: wind, precipitation) from the locked sources (GATE 00)
- stamp_discipline: weekly slate lock timestamps (process record) — readings stamped with their pull time; a reading older than the Sunday AM window does not satisfy the gate
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: C-063 (GATE 00 data lock)
- failure_lesson: Lessons log 04 (2026-09-27) — "Verify weather with numbers — we built on a '24 mph wind' story in Buffalo; actual: sunny, 12 mph."

## Rule

Numbers verified within hours of lock; narratives rejected.

## Enforcement

Only numeric readings count. A weather claim entering the build without a number and a fresh pull timestamp is rejected as a narrative — the failure mode this gate exists for is a story ("24 mph wind") surviving into lineup decisions while the actual reading said otherwise.

## Record

Per game: wind + precipitation readings, source, pull timestamp, and any build change the verified numbers caused.
