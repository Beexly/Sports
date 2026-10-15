# DFS GATE 07 — Thesis-to-roster audit

- census_id: C-070
- family: dfs-process
- kind: stamped reasoning template
- cadence: Saturday — after lineup build, before simulations and lock
- inputs: the week's written theses (game reads, stack theses) and the built rosters
- stamp_discipline: weekly slate lock timestamps (process record) — theses are stamped when written; the audit is stamped when run; a thesis written after the audit does not retroactively pass it
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: C-066 (GATE 03 stack rules)
- failure_lesson: Lessons log 05 (2026-09-27) — wrote "Detroit blows out the Jets," rostered zero Lions; Gibbs: 164 yards, 3 TDs.

## Rule

Every written thesis has a rostered player.

## Enforcement

The audit reads the week's own words back against the roster. A thesis with no roster expression is either rostered or explicitly withdrawn in the record — it may not simply be forgotten, because the forgotten thesis is the one that was right (see the failure lesson). The reverse also holds: a rostered player with no written reason is flagged as an orphan.

## Record

Per week: thesis list with stamps, roster mapping per thesis, withdrawals with reasons, orphan flags.
