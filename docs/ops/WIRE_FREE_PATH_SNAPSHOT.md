# Wire free-path SNAPSHOT_OUTCOME into runner

**Status: wired** (see free-settlement-runner on the date-target + snapshot PR).

`apps/web/lib/settlement/free-path-snapshot.ts` provides:

- `recordFreePathSnapshot` — after free-path settle (never blocks)
- `drainPendingSnapshotOutcomes` — repair PENDING SNAPSHOT_OUTCOME

Runner also **date-targets** free scoreboards (`uniqueScoreboardDates` →
`fetchScoresMultiSource({ espnDateKeys, isoDateKeys })`) so overdue picks can
match historical finals. Undated ESPN boards are "now" only.

Return fields: `clvRepair`, `snapshotRepair`, `scoreDates`.
