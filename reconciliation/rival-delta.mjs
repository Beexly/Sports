#!/usr/bin/env node
/**
 * Nightly rival reconciliation.
 *
 * Joins rival picks to own picks on (gameKey, market) and writes rival_deltas. Deltas are
 * computed against the CLOSING line, not the entry line, because a beat-the-close claim that
 * uses the entry price is a marketing number rather than a measurement.
 *
 * divergenceClass:
 *   agree      same side, same direction, within half a point
 *   disagree   same side, line differs by more than half a point
 *   opposite   opposite sides of the same market
 *   rival_only rival priced a game GSE did not, the coverage gap and the point of the job
 *   own_only   GSE priced a game no rival did
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

if (!process.env.DATABASE_URL) {
  console.error("[rival-delta] DATABASE_URL required");
  process.exit(2);
}

function psql(sql) {
  return execFileSync("psql", [process.env.DATABASE_URL, "-At", "-F", "|", "-c", sql], { encoding: "utf8" });
}

const keyed = `g."externalId" ~ '${KEY}'`;

const sql = `
WITH own AS (
  SELECT p."id" AS pick_id, g."externalId" AS game_key, p."selection" AS market, p."line", p."confidence"
  FROM "picks" p JOIN "games" g ON g."id" = p."gameId"
  WHERE ${keyed}
),
rival AS (
  SELECT r."id" AS pick_id, r."gameKey" AS game_key, r."market", r."line", r."orgId"
  FROM "rival_picks" r
),
joined AS (
  SELECT o.game_key, o.market, o.pick_id AS own_id, r.pick_id AS rival_id, o."line" AS own_line, r."line" AS rival_line
  FROM own o JOIN rival r ON r.game_key = o.game_key AND r.market = o.market
)
INSERT INTO "rival_deltas" ("id", "gameKey", "market", "ownPickId", "rivalPickId", "edgeDelta", "clvDelta", "divergenceClass")
SELECT gen_random_uuid()::text, j.game_key, j.market, j.own_id, j.rival_id,
       NULL,
       (COALESCE(j.own_line, 0) - COALESCE(j.rival_line, 0))::float,
       CASE
         WHEN j.own_line IS NOT NULL AND j.rival_line IS NOT NULL
              AND sign(j.own_line - j.rival_line) <> 0 THEN 'opposite'
         WHEN j.own_line IS NOT NULL AND j.rival_line IS NOT NULL
              AND abs(j.own_line - j.rival_line) > 0.5 THEN 'disagree'
         ELSE 'agree'
       END
FROM joined j
ON CONFLICT ("gameKey", "market", "ownPickId", "rivalPickId") DO UPDATE
  SET "clvDelta" = EXCLUDED."clvDelta", "divergenceClass" = EXCLUDED."divergenceClass",
      "computedAt" = CURRENT_TIMESTAMP;

INSERT INTO "rival_deltas" ("id", "gameKey", "market", "ownPickId", "rivalPickId", "divergenceClass")
SELECT gen_random_uuid()::text, r."gameKey", r."market", NULL, r."id", 'rival_only'
FROM "rival_picks" r
WHERE NOT EXISTS (
  SELECT 1 FROM "picks" p JOIN "games" g ON g."id" = p."gameId"
  WHERE ${keyed} AND g."externalId" = r."gameKey" AND p."selection" = r."market")
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
