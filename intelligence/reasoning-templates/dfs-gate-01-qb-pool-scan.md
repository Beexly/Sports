# DFS GATE 01 — QB pool scan

- census_id: C-064
- family: dfs-process
- kind: stamped reasoning template
- cadence: Wednesday — full scan before any QB is locked; Thursday position pools follow from it
- inputs: the week's full starting-QB pool with DraftKings salaries (GATE 00 locked sources); rushing-floor indicators from engine signals
- stamp_discipline: weekly slate lock timestamps (process record) — scan completion timestamp precedes any QB lock timestamp in the record
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: C-063 (GATE 00 data lock)
- failure_lesson: Lessons log 01 (2026-09-27) — Mariota (~21 DK pts, min salary) and Watson (~18, cheap) both beat the locked $8,300 Allen (~19.4) and $6,400 Young (~14.6); neither was in the pool because the scan never ran.

## Rule

Every starter priced/tiered; cheap QBs with rushing floors flagged as value. No QB locks before the scan completes.

## Enforcement

The scan is a completeness gate, not a ranking: every starting QB on the slate appears in the record, priced and tiered, before any lineup work begins. A QB absent from the scan cannot be rostered (he was never evaluated) and a QB locked before the scan timestamp voids the week's process record.

## Record

Per week: full QB pool with salary + tier + rushing-floor flag, scan timestamp, lock timestamps for any rostered QB (each strictly after the scan).
