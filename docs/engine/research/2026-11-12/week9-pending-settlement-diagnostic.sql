-- Week 9 NFL published picks still PENDING after a 23-day settlement stall.
-- Read-only diagnostic. Prepared 2026-11-12 by Hermes. NOT EXECUTED.
--
-- Baseline (hermes_ro, 2026-11-12):
--   sportId cmpg6t7v900031heri45v3d8s, commenceTime 2026-11-02 .. 2026-11-10
--   11 published PENDING, 8 unpublished PENDING.
--   Last SettlementRun: cmvgo10if0004grr2z7pxarai, source the-odds-api,
--   sport americanfootball_nfl, window 2026-10-20T12Z, started 2026-10-20 12:34Z.
--   NFL settlement has not run in 23 days.
--
-- Why this matters: Stage H (learn) cannot score anything until these settle.
-- Closing-line value, per-layer Brier and the promotion registry all depend on
-- a settled outcome. This query names the rows; it does not change them.

-- 1. The stalled rows.
SELECT p.id,
       g."awayTeamName" || ' @ ' || g."homeTeamName" AS game,
       g."commenceTime",
       p."pickType",
       p.selection,
       p.line,
       p."modelVersion",
       p."generatedAt"
  FROM picks p
  JOIN games g ON g.id = p."gameId"
 WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
   AND g."commenceTime" >= '2026-11-02'
   AND g."commenceTime" <  '2026-11-10'
   AND p."isPublished"
   AND p.result = 'PENDING'
 ORDER BY g."commenceTime", p."pickType";

-- 2. How long the settlement has been stalled, in days.
SELECT id,
       source,
       sport,
       "scheduledWindow",
       "startedAt",
       now() - "startedAt" AS stalled_for
  FROM settlement_runs
 WHERE sport = 'americanfootball_nfl'
 ORDER BY "startedAt" DESC
 LIMIT 5;

-- 3. Whether closing lines exist for those games at all. If they do, the rows
--    can be graded; if they do not, the stall is upstream of settlement.
SELECT g.id,
       g."awayTeamName" || ' @ ' || g."homeTeamName" AS game,
       count(o.id) AS odds_rows,
       max(o."fetchedAt") AS last_odds
  FROM games g
  LEFT JOIN odds o ON o."gameId" = g.id
 WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
   AND g."commenceTime" >= '2026-11-02'
   AND g."commenceTime" <  '2026-11-10'
 GROUP BY g.id, g."awayTeamName", g."homeTeamName"
 ORDER BY g."commenceTime";
