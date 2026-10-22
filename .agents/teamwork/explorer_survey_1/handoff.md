# Handoff Report — explorer_survey_1
**Milestone**: Requirement 1 (R1) — Live Neon DB `team_game_logs` Backfill & Week 6 NFL Picks/Games Lock

---

## 1. Observation
- **Database Connection**:
  - `.env.production.local` contains `DATABASE_URL="[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"`. Connected successfully to Neon DB running PostgreSQL 17.11.
  - `.env.local` contains stale password `npg_1CTHlv3waXfo` which throws `password authentication failed for user 'neondb_owner'`.
- **`team_game_logs` Status**:
  - Total NFL rows: `58` (`SELECT count(*) FROM team_game_logs WHERE sport = 'americanfootball_nfl'`).
  - Preseason rows: 30 rows from August 21–24, 2026.
  - Regular season rows: 28 rows from October 11–13, 2026.
  - Zero rows exist for Weeks 1, 2, 3, 4, or early Week 5 (October 4–9, 2026).
  - Four teams had their most recent log entry in August 2026:
    - `Kansas City Chiefs`: 1 row on `2026-08-22 23:39:00`.
    - `Carolina Panthers`: 1 row on `2026-08-21 23:30:00`.
    - `Tampa Bay Buccaneers`: 1 row on `2026-08-22 23:39:00`.
    - `Dallas Cowboys`: 1 row on `2026-08-23 02:07:00`.
- **`games` Status**:
  - `77` settled regular season NFL games exist in `games` between `2026-09-01` and `2026-10-17` with `homeScore IS NOT NULL` and `awayScore IS NOT NULL`.
  - Four target games exist in `games` with status `FINAL` and high data quality (75–92):
    - `cmpg6tbr5003h1herakbz6qj1` (`KC @ LV` on 2026-10-04, score 27-30).
    - `cmpg6tbvu003l1heru1prtbin` (`DET @ CAR` on 2026-10-05, score 32-26).
    - `cmpg6tc0b003p1herbj2jxqco` (`TB @ DAL` on 2026-10-09, score 16-24).
    - `cmqfv6aik0041mk73cufbtdid` (`SEA @ DEN` on 2026-10-16, score 17-14).
  - Four Week 6 games in `games` have rest days of 56 or 57:
    - `cmqfv6aj20049mk73fb91n86f` (`CAR @ PHI`): `restDaysAway = 57`.
    - `cmt4fewkt00gkeat56ofx8wb5` (`PIT @ TB`): `restDaysHome = 56`.
    - `cmt4fewl700great5twovmya5` (`LAC @ KC`): `restDaysHome = 56`.
    - `cmt4fewlc00gteat5pomz642j` (`DAL @ GB`): `restDaysAway = 56`.
- **`picks` Status**:
  - 9 published picks in DB; 3 of them carry inflated `edgeScore` (`CAR @ PHI UNDER 39.5` edge 76.0, `KC -7.5` edge 76.0, `LAC @ KC UNDER 41.5` edge 77.0) due to 56/57-day rest days.
  - All 9 published picks lack `injuryEvidence` and `continuityDeltas`.
  - 4 unpublished picks for the remaining games carried negative edges (-2.1% to -2.7%) and were properly withheld from publication.

---

## 2. Logic Chain
1. When background ingestion workers executed `computeRestDays()` in `packages/data-ingestion/src/context-enrichment.ts` prior to commit `5a1e2c2a5`, the query only looked at `team_game_logs`.
2. Because `team_game_logs` had no entries for KC, CAR, TB, and DAL since late August 2026, the query evaluated `commenceTime (Oct 18/19) - 2026-08-22 = 56-57 days`.
3. Those 56-57 day rest values were persisted to `games.restDaysHome` and `games.restDaysAway`.
4. Downstream pick scoring engines read `restDaysHome` and `restDaysAway` from `games`, awarding maximum rest bonus points, inflating `edgeScore` up to `76.0`–`77.0`.
5. Although commit `5a1e2c2a5` updated `computeRestDays` to also check `games`, the database columns remained stale, and any component reading `team_game_logs` directly remains starved of 63 regular-season games.
6. Backfilling the 77 settled regular-season games (154 rows) into `team_game_logs` provides complete historical coverage for all 32 NFL teams (`count >= 4`, `maxDate >= 2026-10-04`).
7. Recalculating rest days against this backfill transforms CAR AwayRest from 57 to 13, TB HomeRest from 56 to 9, KC HomeRest from 56 to 14, and DAL AwayRest from 56 to 10, bringing all 14 Week 6 games to `<= 14` days of rest.
8. Evaluating the 5 remaining games with live market lines and the official Week 6 injury report (`espn_nfl_injuries_week6.json`) reveals high-value positive-edge plays: Baker Mayfield is OUT (Steelers ML / UNDER 42.5), Lamar Jackson is OUT (Browns +5.5 / UNDER 42.0), Lambeau shootout with defensive injuries (DAL@GB OVER 51.5), depleted Giants OT unit (Saints ML), and run-heavy script (TEN@IND UNDER 46.5).

---

## 3. Caveats
- `minDataQualityThreshold` in `context-enrichment.ts` defaults to 40. All 77 settled games have dataQualityScore between 50 and 96, clearing the threshold.
- To prevent any duplicate pick collisions, the backfill script uses `ON CONFLICT ("gameId", "teamName") DO UPDATE`.
- The dry-run validation script was executed inside a transaction and explicitly rolled back, leaving the database 100% untouched.

---

## 4. Conclusion
Requirement 1 is fully explored, root-caused, and de-risked. An implementer can immediately run the migration script detailed in `report.md` §8 to backfill `team_game_logs`, lock rest days on all 14 Week 6 games, normalize pick edgeScores, and publish verified positive-edge plays for the 5 remaining games.

---

## 5. Verification Method
1. **DB Inspection**:
   Run `python -c "import psycopg2; conn = psycopg2.connect('[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require'); cur = conn.cursor(); cur.execute('SELECT count(*) FROM team_game_logs WHERE sport = \'americanfootball_nfl\''); print(cur.fetchone())"` -> returns 58 before migration, will return >= 184 after migration.
2. **Target Teams Query**:
   `SELECT "teamName", count(*), max("gameDate") FROM team_game_logs WHERE "teamName" IN ('Kansas City Chiefs', 'Carolina Panthers', 'Tampa Bay Buccaneers', 'Dallas Cowboys') GROUP BY "teamName";` -> confirms count >= 4 and maxDate >= 2026-10-04.
3. **Week 6 Rest Days Check**:
   `SELECT count(*) FROM games WHERE "sportId" = 'cmpg6t7v900031heri45v3d8s' AND "commenceTime" >= '2026-10-15' AND "commenceTime" < '2026-10-21' AND ("restDaysHome" > 14 OR "restDaysAway" > 14);` -> must return 0.
4. **Dry Run Proof**:
   Run `python c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_1\test_plan_dryrun.py` -> exit code 0, 100% passed with rollback.
