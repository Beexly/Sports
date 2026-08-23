# Archive recheck

Queried: 2026-08-20T17:51:58Z
Tool: neonctl as hermes_ro
Command exit: 0

## Counts (from stdout)

| scope | n |
|---|---|
| odds_line_snapshots total | 102736 |
| baseball_mlb | 23726 |
| americanfootball_nfl | 31636 |

| sport | phase | n |
|---|---|---|
| baseball_mlb | OPEN | 144 |
| baseball_mlb | INTERIM | 23582 |
| baseball_mlb | CLOSE | 0 |
| americanfootball_nfl | OPEN | 96 |
| americanfootball_nfl | INTERIM | 31540 |
| americanfootball_nfl | CLOSE | 0 |

## Verdict

- NFL real-data e-process this overnight: BLOCKED — CLOSE=0, n_close=0
- MLB CLOSE: 0
- Do not run an NFL MVE. T05/T06 are shadow/prereg only.
