# H-F7 archive liveness

Queried 2026-08-20 via `neonctl psql` as role `hermes_ro` on Neon project
`gse-postgres` (summer-brook-99380762), branch `main`. SELECT-only. SQL:
`docs/ops/hermes/hf7-archive/query.sql`.

| Scope | n |
| --- | ---: |
| `odds_line_snapshots` total | 37402 |
| MLB (`baseball_mlb`) | 11318 |
| NFL (`americanfootball_nfl`) | 9864 |

| Sport | phase | n |
| --- | --- | ---: |
| baseball_mlb | OPEN | 144 |
| baseball_mlb | INTERIM | 11174 |
| baseball_mlb | CLOSE | 0 |
| americanfootball_nfl | OPEN | 96 |
| americanfootball_nfl | INTERIM | 9768 |
| americanfootball_nfl | CLOSE | 0 |

A second total count 18 rows earlier in the same session was 37384, so the
table is still receiving writes. LINE_ARCHIVE_ENABLED is bound in production.
CLOSE-phase rows are absent for MLB and NFL at query time — the archive is
live on OPEN/INTERIM, not yet stamping CLOSE on these two sports.
