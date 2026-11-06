#!/usr/bin/env node
/**
 * Nightly rival reconciliation.
 *
 * Joins rival picks to own picks on (gameKey, market) and writes rival_deltas. Deltas are
 * computed against the CLOSING line, not the entry line, because a beat-the-close claim that
 * uses the entry price is a marketing number rather than a measurement.
 *
 * Market is normalized on both sides: spread | total | moneyline. An own pick's market comes
 * from pickType and its side from the selection text, because `selection` is prose
 * ("Chiefs -3.5", "OVER 48.5") and joining prose to a market column matches nothing.
 *
 * divergenceClass:
 *   agree      same side, lines within half a point
 *   disagree   same side, lines more than half a point apart
 *   opposite   opposite sides of the same market
 *   rival_only rival priced a game GSE did not, the coverage gap and the point of the job
 *   own_only   GSE priced a market no rival did
 *
 * Own picks carry a cuid gameId, rival picks carry the GSE game key. A pick is only joinable
 * when `games.externalId` is already in key form (YYYY_WW_AWAY_HOME); anything else is counted
 * as `unkeyed` rather than fuzzy-matched, so the number never flatters itself.
 *
 * Usage: node reconciliation/rival-delta.mjs [--dry]
 */

import { execFileSync } from "node:child_process";

const DRY = process.argv.includes("--dry");
const KEY = "^[0-9]{4}_[0-9]{2}_[A-Z]{2,3}_[A-Z]{2,3}$";

if (!DRY && !process.env.DATABASE_URL) {
  console.error("[rival-delta] DATABASE_URL required");
  process.exit(2);
}

function psql(sql) {
  return execFileSync("psql", [process.env.DATABASE_URL, "-At", "-F", "|", "-c", sql], { encoding: "utf8" });
}

const keyed = `g."externalId" ~ '${KEY}'`;

/** Own-side normalization, shared by the delta join and the rival_only anti-join. */
const ownMarket = `lower(p."pickType"::text)`;
const ownSide = `CASE
  WHEN lower(p."pickType"::text) = 'total'
    THEN CASE WHEN p."selection" ILIKE 'over%' THEN 'OVER' ELSE 'UNDER' END
  WHEN lower(p."pickType"::text) = 'spread'
    THEN trim(regexp_replace(p."selection", '\\s*[-+]?[0-9.]+\\s*$', ''))
  ELSE trim(p."selection")
END`;

const sql = `
WITH own AS (
  SELECT p."id" AS pick_id, g."externalId" AS game_key, ${ownMarket} AS market, ${ownSide} AS side, p."line"
  FROM "picks" p JOIN "games" g ON g."id" = p."gameId"
  WHERE ${keyed}
),
rival AS (
  SELECT r."id" AS pick_id, r."gameKey" AS game_key, lower(r."market") AS market, r."side", r."line"
  FROM "rival_picks" r
),
joined AS (
  SELECT o.game_key, o.market, o.pick_id AS own_id, r.pick_id AS rival_id,
         o.side AS own_side, r.side AS rival_side, o."line" AS own_line, r."line" AS rival_line
  FROM own o JOIN rival r ON r.game_key = o.game_key AND r.market = o.market
)
INSERT INTO "rival_deltas" ("id", "gameKey", "market", "ownPickId", "rivalPickId", "edgeDelta", "clvDelta", "divergenceClass")
SELECT gen_random_uuid()::text, j.game_key, j.market, j.own_id, j.rival_id,
       NULL,
       CASE WHEN j.own_line IS NOT NULL AND j.rival_line IS NOT NULL
            THEN (j.own_line - j.rival_line)::float END,
       CASE
         WHEN j.own_side IS NOT NULL AND j.rival_side IS NOT NULL
              AND upper(j.own_side) <> upper(j.rival_side) THEN 'opposite'
         WHEN j.own_line IS NOT NULL AND j.rival_line IS NOT NULL
              AND abs(j.own_line - j.rival_line) > 0.5 THEN 'disagree'
         ELSE 'agree'
       END
FROM joined j
ON CONFLICT ("gameKey", "market", "ownPickId", "rivalPickId") DO UPDATE
  SET "clvDelta" = EXCLUDED."clvDelta", "divergenceClass" = EXCLUDED."divergenceClass",
      "computedAt" = CURRENT_TIMESTAMP;

-- Transient classes are re-derived every run. Both carry a NULL half of the unique key, and
-- NULLs are distinct in a Postgres unique index, so ON CONFLICT alone would never fire for
-- them and each run would append a fresh copy.
DELETE FROM "rival_deltas" WHERE "divergenceClass" IN ('rival_only', 'own_only');

INSERT INTO "rival_deltas" ("id", "gameKey", "market", "ownPickId", "rivalPickId", "divergenceClass")
SELECT gen_random_uuid()::text, r."gameKey", lower(r."market"), NULL, r."id", 'rival_only'
FROM "rival_picks" r
WHERE NOT EXISTS (
  SELECT 1 FROM "picks" p JOIN "games" g ON g."id" = p."gameId"
  WHERE ${keyed} AND g."externalId" = r."gameKey" AND lower(p."pickType"::text) = lower(r."market"));

-- own_only: we priced a market no rival did.
INSERT INTO "rival_deltas" ("id", "gameKey", "market", "ownPickId", "rivalPickId", "divergenceClass")
SELECT gen_random_uuid()::text, o.game_key, o.market, o.pick_id, NULL, 'own_only'
FROM (
  SELECT p."id" AS pick_id, g."externalId" AS game_key, ${ownMarket} AS market
  FROM "picks" p JOIN "games" g ON g."id" = p."gameId"
  WHERE ${keyed}
) o
WHERE NOT EXISTS (
  SELECT 1 FROM "rival_picks" r
  WHERE r."gameKey" = o.game_key AND lower(r."market") = o.market)
ON CONFLICT ("gameKey", "market", "ownPickId", "rivalPickId") DO NOTHING;
`;

const report = `
SELECT "divergenceClass", count(*) FROM "rival_deltas"
WHERE "computedAt" > now() - interval '1 day'
GROUP BY 1 ORDER BY 2 DESC;
SELECT "gameKey", "market", "divergenceClass" FROM "rival_deltas"
WHERE "divergenceClass" = 'rival_only' ORDER BY "computedAt" DESC LIMIT 20;
`;

if (DRY) {
  console.log(sql);
  process.exit(0);
}

psql(sql);
console.log("[rival-delta] written");
process.stdout.write(psql(report));
