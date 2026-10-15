# DFS GATE 08 — Garrett's calls

- census_id: C-071
- family: dfs-process
- kind: stamped reasoning template
- cadence: Friday — calls logged; scored post-slate in the weekly review
- inputs: Garrett's calls input zone (date, player, call: start/fade/prop, reason) — census C-078
- stamp_discipline: weekly slate lock timestamps (process record) — a call counts only if its log timestamp precedes the slate lock; post-slate scoring is a separate stamp, never an edit of the original
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: C-078 (Garrett's calls input zone — TEMPLATE-ONLY, zero entries ever at census time)
- failure_lesson: Lessons log 08 (2026-09-27, process gap) — "Log Garrett's calls pre-lock, score post-slate — his Mariota/Watson reads beat the model." And log 11, per his rule: Garrett's misses go in too.

## Rule

Logged pre-lock, scored post-slate, never ignored.

## Enforcement

The input zone is the dependency and it is empty: at census time the zone holds zero entries ever, so this gate has never been runnable. The gate's discipline is what makes the zone worth filling — every logged call is either expressed in the build or explicitly passed on with a reason, and every call is scored after the slate, hits and misses alike, per Garrett's rule that his misses go in the log too.

## Record

Per week: calls with pre-lock stamps, build disposition per call, post-slate results, running hit rate (feeds the weekly scorecard, C-078).
