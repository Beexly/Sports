# DFS GATE 00 — Data lock

- census_id: C-063
- family: dfs-process
- kind: stamped reasoning template
- cadence: Wednesday — data pull; sources lock for the week when the scan starts
- inputs: DraftKings salaries + ownership; FantasyGuru.com (Jeff Mans Core Four); Weather.com game-day readings (never narratives); official inactive reports; GSE engine signals
- stamp_discipline: weekly slate lock timestamps (process record) — every input logged with source + pull timestamp at lock; the locked source list is itself part of the record
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: —
- failure_lesson: Lessons log 09 (2026-09-27, process gap) — "Same data sources every week."

## Rule

Locked v1 sources: DraftKings salaries + ownership; FantasyGuru.com (Jeff Mans Core Four); Weather.com game-day readings (never narratives); official inactive reports; GSE engine signals. No swapping sources mid-week.

## Enforcement

The week's record opens by naming the locked sources and the pull timestamp of each. A slate built from any source not on the locked list fails this gate regardless of what the other nine gates say — the process exists so weeks are comparable, and a swapped source makes two weeks two different processes.

## Record

Per week: locked source list, pull timestamps, lock timestamp, operator. The DFS Process System artifact is a static page with zero server actions, so today this record is the stamped template invocation itself; enforcement/logging infrastructure is named future work, not claimed here.
