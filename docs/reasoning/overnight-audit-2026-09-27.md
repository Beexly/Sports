# Overnight audit - 2026-09-27

One row per cycle. Every number here traces to a command whose output is in context.
Verdicts: `PASS` `DARK` `STORED` `NOT_EVALUATED` `BLOCKED` `STUCK`

| cycle | utc | slice | files touched | command | exit | measured | scalarizer | refused | verdict | commit |
|---:|---|---|---|---|---:|---|---|---|---|
|13 | 2026-09-27T04:59:34Z | redteam-correction | data/reasoning/overnight-loop.jsonl | node scripts/overnight/log-slice.mjs --cycle 13 ... | 0 | CORRECTION: cycles 0-12 of this loop carry hand-written utc values, every one on a clean round boundary (00:00:00Z, 00:05:00Z, 00:20:00Z, 00:30:00Z, 00:45:00Z, 01:00:00Z, 01:40:00Z, 02:15:00Z, 02:40:00Z, 03:00:00Z, 03:30:00Z, 03:50:00Z). Ground truth from git: the commits those cycles describe landed 04:05:51Z-04:42:53Z (b95faf9fb 04:13:41Z, e7625b861 04:41:55Z, f117a3038 04:42:53Z, etc). The utc fields were invented, not measured - law 4 violated on the provenance record. The rows' MEASURED content is still traceable to the commits and tests; the timestamps are not evidence and must not be quoted. From cycle 14, stamp utc with scripts/overnight/log-slice.mjs (ported by the red-team reviewer), which resolves real time and real HEAD and refuses a bare null commit. | - | - | PASS | -|
