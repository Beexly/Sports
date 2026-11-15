#!/usr/bin/env node
/**
 * T-01 — Board Quarantine & W9/TNF Settlement (WP-7 gate, fail-closed).
 *
 * PASS requires ALL of:
 *   1. public.pick_quarantine_audit exists with the WP-0 batch (>= 113 rows).
 *   2. Zero live (published/featured) future picks lacking a valid
 *      fiveStageReceipt (schemaVersion 2026-11-13-v1) — the Q1 predicate.
 *   3. Zero past-game PENDING picks (settlement fully drained).
 *   4. Every Week 9 NFL game row FINAL (2026-11-05..2026-11-11 window).
 *   5. TNF WSH@NYG row FINAL and its pick(s) settled (result != PENDING).
 *
 * Read-only. DATABASE_URL from env, else neonctl hermes_ro.
 */
import pg from "pg";
import { execSync } from "node:child_process";

const RECEIPT_VERSION = "2026-11-13-v1";
const BATCH = "hermes-wp0-2026-11-13";
const NFL_SPORT = "cmpg6t7v900031heri45v3d8s";
const TNF_GAME = "cmt4fewrc00jbeat5nq9eauqo";

let url = (process.env.DATABASE_URL ?? "").trim();
if (!url) {
  url = execSync(
    "neonctl connection-string main --project-id summer-brook-99380762 --role-name hermes_ro",
    { encoding: "utf8" },
  ).trim();
}

const client = new pg.Client({ connectionString: url });
await client.connect();
const failures = [];
const ok = (name, cond, detail) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures.push(name);
};

try {
  const audit = await client.query(
    `SELECT count(*)::int AS n FROM public.pick_quarantine_audit WHERE batch_id = $1`,
    [BATCH],
  ).catch(() => ({ rows: [{ n: -1 }] }));
  ok("quarantine audit batch present", audit.rows[0].n >= 113, `${audit.rows[0].n} rows`);

  const liveUngated = await client.query(`
    SELECT count(*)::int AS n
    FROM public.picks p JOIN public.games g ON g.id = p."gameId"
    WHERE g."commenceTime" > NOW()
      AND (p."isPublished" = TRUE OR p."isFeatured" = TRUE)
      AND COALESCE(p."factorBreakdown"->'fiveStageReceipt'->>'schemaVersion', '') <> $1`,
    [RECEIPT_VERSION],
  );
  ok("no live un-receipted future picks", liveUngated.rows[0].n === 0, `${liveUngated.rows[0].n} live`);

  const pastPending = await client.query(`
    SELECT count(*)::int AS n
    FROM public.picks p JOIN public.games g ON g.id = p."gameId"
    WHERE g."commenceTime" <= NOW() AND p.result = 'PENDING'`,
  );
  ok("settlement drained (0 past PENDING)", pastPending.rows[0].n === 0, `${pastPending.rows[0].n} pending`);

  const w9 = await client.query(`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status = 'FINAL')::int AS final
    FROM public.games
    WHERE "sportId" = $1
      AND "commenceTime" >= '2026-11-05T00:00:00Z'
      AND "commenceTime" < '2026-11-11T00:00:00Z'`,
    [NFL_SPORT],
  );
  ok("Week 9 NFL all FINAL", w9.rows[0].total > 0 && w9.rows[0].total === w9.rows[0].final,
    `${w9.rows[0].final}/${w9.rows[0].total}`);

  const tnf = await client.query(`
    SELECT g.status,
           (SELECT count(*) FROM public.picks p WHERE p."gameId" = g.id AND p.result = 'PENDING')::int AS pending
    FROM public.games g WHERE g.id = $1`,
    [TNF_GAME],
  );
  ok("TNF WSH@NYG FINAL + settled", tnf.rows.length === 1 && tnf.rows[0].status === "FINAL" && tnf.rows[0].pending === 0,
    tnf.rows[0] ? `${tnf.rows[0].status}, ${tnf.rows[0].pending} pending` : "row missing");
} catch (err) {
  failures.push(`query error: ${err.message}`);
} finally {
  await client.end();
}

if (failures.length > 0) {
  console.error(`T-01 FAIL: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("T-01 PASS");