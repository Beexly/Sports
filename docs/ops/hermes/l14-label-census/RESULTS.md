# L-14 label census (v3)

Queried 2026-08-19T17:31:57Z as `hermes_ro` on Neon branch `hermes-census-20260819` (created 2026-08-19T17:27:46Z, copy-on-write of gse-postgres/neondb; host prefix `ep-broad-forest-apo6xcmr`, not primary). SELECT-only. Source of truth is the live `odds` table (1,368,288 rows). Dedicated `odds_line_snapshots` archive exists and is empty (0 rows) — LINE_ARCHIVE_ENABLED has never persisted a snapshot.

**Market** = one `(game, odds.market)`. **Eligible** = at least 3 distinct pre-start timestamps, from at least 3 books, spanning at least 2 hours before start. **Clean close** = eligible, plus a book-quoted snapshot with age in `[0, 15]` minutes before start (the 30-minute stale bound is implied). Books observed: 11 sportsbooks plus `espn_public`. Dropping `espn_public` does not change any clean count. NFL preseason = `americanfootball_nfl` games whose UTC commence month is 7 or 8 (no `americanfootball_nfl_preseason` sport key exists).

## Go / no-go

1. **No.** There are not enough clean labels per sport to train a close-prediction model.
2. **MLB has the most:** 241 clean closes on each of spread, full-game total, and moneyline (eligible window 2026-05-22 to 2026-08-20).
3. **First-half totals are not ingested at all** (`OddsMarket` is only H2H / SPREADS / TOTALS; 0 rows match half / 1H / H1). E-5's "3 markets per NFL game" volume assumption is false on this corpus.
4. **NFL is two empty tracks today:** preseason has 48 games and 0 odds rows; regular season has 84 future games whose last snapshot is 2026-06-17, so 0 clean closes. Line history begins 2026-05-22 — no prior season.
5. **We do not hold true openers on the sports that have labels.** MLB's median first snapshot is ~25 hours before start; NFL/NCAAF first snapshots are futures (NFL ~127 days). Cadence is ~19 minutes on MLB/MLS and ~137 minutes on NFL.

## Counts

| Sport | Track | Market | With odds | Eligible | Clean close | First eligible | Last eligible | Median opener hours | Median cadence min |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | ---: | ---: |
| MLB | — | spread | 717 | 569 | 241 | 2026-05-22 | 2026-08-20 | 24.8 | 19.4 |
| MLB | — | full-game total | 717 | 569 | 241 | 2026-05-22 | 2026-08-20 | 25.1 | 19.4 |
| MLB | — | moneyline | 717 | 569 | 241 | 2026-05-22 | 2026-08-20 | 25.1 | 19.4 |
| MLB | — | first-half total | 0 | not ingested | — | — | — | — | 19.4 |
| MLS | — | spread | 111 | 79 | 23 | 2026-05-23 | 2026-08-24 | 89.7 | 18.9 |
| MLS | — | full-game total | 111 | 81 | 23 | 2026-05-23 | 2026-08-24 | 89.7 | 18.9 |
| MLS | — | moneyline | 111 | 81 | 24 | 2026-05-23 | 2026-08-24 | 89.7 | 18.9 |
| MLS | — | first-half total | 0 | not ingested | — | — | — | — | 18.9 |
| NBA | — | spread | 12 | 10 | 1 | 2026-05-23 | 2026-06-14 | 42.3 | 116.1 |
| NBA | — | full-game total | 12 | 10 | 1 | 2026-05-23 | 2026-06-14 | 42.3 | 116.1 |
| NBA | — | moneyline | 12 | 10 | 1 | 2026-05-23 | 2026-06-14 | 42.3 | 116.1 |
| NBA | — | first-half total | 0 | not ingested | — | — | — | — | 116.1 |
| NHL | — | spread | 12 | 12 | 0 | 2026-05-23 | 2026-06-15 | 42.5 | 110.3 |
| NHL | — | full-game total | 12 | 12 | 0 | 2026-05-23 | 2026-06-15 | 42.5 | 110.3 |
| NHL | — | moneyline | 12 | 12 | 0 | 2026-05-23 | 2026-06-15 | 42.5 | 110.3 |
| NHL | — | first-half total | 0 | not ingested | — | — | — | — | 110.3 |
| NCAAF | — | spread | 161 | 99 | 0 | 2026-08-29 | 2026-11-08 | 2391.4 | 48.7 |
| NCAAF | — | full-game total | 142 | 94 | 0 | 2026-08-29 | 2026-11-08 | 503.9 | 48.7 |
| NCAAF | — | moneyline | 124 | 65 | 0 | 2026-08-29 | 2026-11-08 | 503.9 | 48.7 |
| NCAAF | — | first-half total | 0 | not ingested | — | — | — | — | 48.7 |
| NFL | preseason | spread | 0 | 0 | 0 | — | — | — | — |
| NFL | preseason | full-game total | 0 | 0 | 0 | — | — | — | — |
| NFL | preseason | moneyline | 0 | 0 | 0 | — | — | — | — |
| NFL | preseason | first-half total | 0 | not ingested | — | — | — | — | — |
| NFL | regular | spread | 84 | 69 | 0 | 2026-09-10 | 2026-10-18 | 3056.1 | 136.6 |
| NFL | regular | full-game total | 84 | 69 | 0 | 2026-09-10 | 2026-10-18 | 3056.1 | 136.6 |
| NFL | regular | moneyline | 84 | 21 | 0 | 2026-09-10 | 2026-10-18 | 3056.1 | 136.6 |
| NFL | regular | first-half total | 0 | not ingested | — | — | — | — | 136.6 |
| NCAAB | — | (any) | 0 | 0 | 0 | — | — | — | — |

NFL preseason: 48 August games exist on `americanfootball_nfl` (16 already FINAL) and every one has zero `odds` rows. NFL regular-season odds were last fetched 2026-06-17. `opening_lines` holds first-seen SPREADS (1,099) and TOTALS (1,080) only — no moneyline opener table, and those rows are not timestamped history.

Every NFL clean-close count above is 0 on both tracks. The 241 MLB clean closes all had at least 3 books inside the 15-minute window.
