# DFS GATE 03 — Stack rules

- census_id: C-066
- family: dfs-process
- kind: stamped reasoning template
- cadence: Saturday — lineup build; re-checked at final lock
- inputs: candidate lineups against the locked slate (salaries from GATE 00 sources)
- stamp_discipline: weekly slate lock timestamps (process record) — each submitted lineup is stamped with its stack composition and total salary at lock
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: C-063 (GATE 00 data lock)
- failure_lesson: Lessons log 07 (2026-09-27) — "No fragile concentration — never ~35% of salary in one road-favorite stack (Allen L2)."

## Rule

QB + max 2 same-team pass-catchers; no TE at FLEX; full $50,000 spent.

## Enforcement

Structural, therefore checkable mechanically: a lineup violating the stack cap, the FLEX restriction, or the spend rule does not ship, and the concentration lesson caps how much of the cap a single stack may carry. The repo's lineup validation (`apps/web/lib/fantasy/dfs-lineup-validation.ts`) is the natural enforcement surface when the process record is wired to it; until then the stamped lineup record is the audit trail.

## Record

Per lineup: stack composition, FLEX position, total salary, lock timestamp.
