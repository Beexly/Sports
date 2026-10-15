# DFS GATE 04 — Injury gate

- census_id: C-067
- family: dfs-process
- kind: stamped reasoning template
- cadence: Saturday build; re-verified Sunday AM against official inactive reports before final lock
- inputs: official inactive reports + injury/practice flags from the locked sources (GATE 00)
- stamp_discipline: weekly slate lock timestamps (process record) — flag state is recorded as of the Sunday AM verification, not as of the Saturday build
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: C-063 (GATE 00 data lock)
- failure_lesson: Lessons log 06 (2026-09-27) — "Injury flags are disqualifiers, not footnotes — Coker's ankle stayed in the lineup."

## Rule

Any flag = player removed, no exceptions.

## Scope note

This is the DFS process injury gate. It is distinct from the engine's G-02 injury-pull gate and from the census §A injury-context rows — three different records that share a word, kept separate here for the same reason the census separates them.

## Enforcement

No discretion and no severity judgment: a flagged player leaves the pool, and the removal is recorded with the flag and its source timestamp. A player removed Saturday who clears by Sunday AM re-enters only through the same stamped verification, never by memory.

## Record

Per week: flagged players, flag source + timestamp, removal/reinstatement stamps.
