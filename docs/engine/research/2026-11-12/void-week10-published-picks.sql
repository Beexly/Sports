-- VOID the 14 published NFL Week 10 picks.
-- Prepared 2026-11-12 by Hermes from a read-only Neon baseline.
-- NOT EXECUTED. Owner approval (Decision 1) covers marking VOID with reason and
-- timestamp; it does not cover deletion. Nothing here deletes a row.
--
-- Baseline that produced this list (read-only, hermes_ro):
--   sportId cmpg6t7v900031heri45v3d8s, commenceTime 2026-11-12 .. 2026-11-18
--   14 games, 17 picks, 14 published. All modelVersion v5.3.1, all result PENDING.
--   PickResult enum has VOID. No schema change needed.
--
-- Why: these were written by Path P (refresh-odds cron -> process-sport.ts ->
-- scoreGames v5.3.1) which never consults the walk-forward emission gate. They
-- are not engine verdicts and must not stand as public record.

BEGIN;

-- 1. Confirm the target set is exactly 14 rows before touching anything.
SELECT count(*) AS target_rows
FROM picks p
JOIN games g ON g.id = p."gameId"
WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
  AND g."commenceTime" >= '2026-11-12'
  AND g."commenceTime" <  '2026-11-18'
  AND p."isPublished"
  AND p.result = 'PENDING';
-- Expect: 14. If it is not 14, ROLLBACK and re-baseline.

-- 2. Mark VOID. Reason and timestamp go in the existing text/timestamp columns.
UPDATE picks p
SET result      = 'VOID',
    "settledAt" = now(),
    reasoning   = COALESCE(p.reasoning, '') ||
                  E'\n[VOID 2026-11-12] Written by Path P (refresh-odds cron -> process-sport.ts -> scoreGames v5.3.1), which does not consult the walk-forward emission gate. Not an engine verdict. Owner-approved Decision 1.'
WHERE p.id IN (
  'cmw8j1mtu1jvr229n73cxntyp', -- WSH @ NYG  SPREAD  NYG -1.5
  'cmw8urf40001y74il5elw2dyj', -- WSH @ NYG  TOTAL   UNDER 43.5
  'cmt4fffis091neat5ddon7kmi', -- JAX @ TEN  SPREAD  JAX -10.5
  'cmwbsopmw009x6uitf0ipjzt7', -- BUF @ NYJ  SPREAD  BUF -8.5
  'cmwbsopka009l6uitiynm6noc', -- CAR @ NO   TOTAL   OVER 48.5
  'cmwbsophq00996uitcctlxz3r', -- JAX @ TEN  TOTAL   OVER 46.5
  'cmwd09etm1jix14c48h0bviun', -- KC @ ATL   TOTAL   OVER 47.5
  'cmwcmbu2w00hdyqob8myne03b', -- MIN @ GB   TOTAL   UNDER 42.5
  'cmwcojt1902gmtvng22bm4hnq', -- BUF @ NYJ  TOTAL   OVER 50.5
  'cmwbsopj1009f6uitaomnxwt1', -- MIA @ IND  TOTAL   UNDER 38.5
  'cmwcfmh4f1lh413tj686v4kjl', -- HOU @ CLE  TOTAL   OVER 40.5
  'cmwbsopdj008s6uitj2d5lmyc', -- SF @ DAL   SPREAD  SF -4.5
  'cmwbsoplk009r6uitkroparkh', -- SF @ DAL   TOTAL   OVER 55.5
  'cmt4fffmb0925eat5fhwwkf91'  -- LAC @ BAL  SPREAD  BAL -4.5
)
  AND p.result = 'PENDING';

-- 3. Verify: 14 rows now VOID, 0 PENDING in the set.
SELECT p.result, count(*)
FROM picks p
JOIN games g ON g.id = p."gameId"
WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
  AND g."commenceTime" >= '2026-11-12'
  AND g."commenceTime" <  '2026-11-18'
  AND p."isPublished"
GROUP BY 1;

-- COMMIT;   -- left commented: the owner runs this, not an agent.
ROLLBACK;
