/**
 * READ-ONLY cross-check: does buildPerformanceSummaries produce the same numbers
 * the DATABASE produces for the same population?
 *
 * The unit tests prove the function is self-consistent. This proves it agrees
 * with Postgres on real production rows, which is the only claim that matters
 * before anything writes to performance_summaries.
 *
 * Run from apps/web so tsconfig path aliases resolve:
 *   DATABASE_URL=... npx tsx C:/.../verify-summaries.mts
 */
import { Client } from "pg";
import { buildPerformanceSummaries, type SummaryPickRow } from "@/lib/performance/build-performance-summaries";

const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// The TS rule is g >= c => in-play, and a NULL clock means "cannot tell" so the row
// is KEPT. SQL must therefore treat NULL commenceTime as pre-game, not as unknown:
// a bare `p."generatedAt" < g."commenceTime"` would drop those rows and silently
// produce a different population. That mismatch is exactly what this checks for.
const POPULATION = `
  FROM picks p JOIN games g ON g.id = p."gameId" JOIN sports s ON s.id = g."sportId"
  WHERE p."isPublished" = true
    AND p."isBootstrap" = false
    AND p."modelVersion" <> 'v5.0.0-seed'
    AND p.result IN ('WIN','LOSS','PUSH')
    AND s.key IS NOT NULL
    AND p."modelVersion" IS NOT NULL
    AND (g."commenceTime" IS NULL OR p."generatedAt" < g."commenceTime")`;

(async () => {
  await c.connect();

  const raw = await c.query(
    `SELECT s.key AS sport, p."pickType"::text AS pick_type, p.tier::text AS tier,
            p."modelVersion" AS model_version, p.result::text AS result,
            p."settledAt" AS settled_at, p."generatedAt" AS generated_at, g."commenceTime" AS commence_time
       ${POPULATION} AND (p."pickType" IS NOT NULL)`,
  );
  const allRows = await c.query(
    `SELECT s.key AS sport, p."pickType"::text AS pick_type, p.tier::text AS tier,
            p."modelVersion" AS model_version, p.result::text AS result,
            p."settledAt" AS settled_at, p."generatedAt" AS generated_at, g."commenceTime" AS commence_time
       ${POPULATION}`,
  );
  console.log("rows fetched (typed key):", raw.rows.length, " (all, incl. null pickType):", allRows.rows.length);

  const toRow = (r: Record<string, unknown>): SummaryPickRow => ({
    sport: (r.sport as string) ?? null,
    pickType: (r.pick_type as string) ?? null,
    tier: (r.tier as string) ?? null,
    modelVersion: (r.model_version as string) ?? null,
    result: String(r.result),
    settledAt: r.settled_at ? new Date(r.settled_at as string) : null,
    generatedAt: r.generated_at ? new Date(r.generated_at as string) : null,
    commenceTime: r.commence_time ? new Date(r.commence_time as string) : null,
  });

  const built = buildPerformanceSummaries(allRows.rows.map(toRow));
  console.log("built rows:", built.rows.length, "skipped:", JSON.stringify(built.skipped));

  const mine = built.rows.filter((r) => r.period === "all-time");
  const sqlAgg = await c.query(
    `SELECT s.key AS sport, p."pickType"::text AS pick_type, p.tier::text AS tier,
            p."modelVersion" AS model_version,
            COUNT(*)::int AS total, COUNT(*) FILTER (WHERE p.result='WIN')::int AS wins,
            COUNT(*) FILTER (WHERE p.result='LOSS')::int AS losses,
            COUNT(*) FILTER (WHERE p.result='PUSH')::int AS pushes
       ${POPULATION}
      GROUP BY 1,2,3,4 ORDER BY 1,2,3,4`,
  );

  const key = (s: string | null, p: string | null, t: string | null, m: string) => `${s}|${p ?? ""}|${t ?? ""}|${m}`;
  const mineMap = new Map(mine.map((r) => [key(r.sport, r.pickType, r.tier, r.modelVersion), r]));

  let mismatches = 0;
  const sqlKeys = new Set<string>();
  for (const r of sqlAgg.rows) {
    const k = key(r.sport, r.pick_type, r.tier, r.model_version);
    sqlKeys.add(k);
    const m = mineMap.get(k);
    if (!m) {
      console.log("MISSING in build:", k, JSON.stringify(r));
      mismatches += 1;
      continue;
    }
    if (m.wins !== r.wins || m.losses !== r.losses || m.pushes !== r.pushes || m.totalPicks !== r.total) {
      console.log("MISMATCH:", k, "build=", JSON.stringify({ w: m.wins, l: m.losses, p: m.pushes, t: m.totalPicks }),
        "sql=", JSON.stringify({ w: r.wins, l: r.losses, p: r.pushes, t: r.total }));
      mismatches += 1;
    }
  }
  for (const k of mineMap.keys()) if (!sqlKeys.has(k)) { console.log("EXTRA in build (not in sql):", k); mismatches += 1; }

  console.log("\nkeys compared:", sqlKeys.size, " mismatches:", mismatches);

  const totals = await c.query(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE p.result='WIN')::int AS wins,
            COUNT(*) FILTER (WHERE p.result='LOSS')::int AS losses,
            COUNT(*) FILTER (WHERE p.result='PUSH')::int AS pushes ${POPULATION}`,
  );
  const buildTotals = mine.reduce(
    (a, r) => ({ total: a.total + r.totalPicks, wins: a.wins + r.wins, losses: a.losses + r.losses, pushes: a.pushes + r.pushes }),
    { total: 0, wins: 0, losses: 0, pushes: 0 },
  );
  console.log("SQL  totals:", JSON.stringify(totals.rows[0]));
  console.log("build totals:", JSON.stringify(buildTotals));
  console.log("periods built:", built.periods.join(", "));

  // SECOND PASS — and the reason it exists: the query above pre-filtered the
  // in-play rows out in SQL, so the builder's OWN exclusion never had anything to
  // catch and `skipped.inPlay` was 0 by construction rather than by proof. This
  // pass hands it the unfiltered population so the production rows themselves
  // exercise the rule, and the totals must come out identical.
  const unfiltered = await c.query(
    `SELECT s.key AS sport, p."pickType"::text AS pick_type, p.tier::text AS tier,
            p."modelVersion" AS model_version, p.result::text AS result,
            p."settledAt" AS settled_at, p."generatedAt" AS generated_at, g."commenceTime" AS commence_time
       FROM picks p JOIN games g ON g.id = p."gameId" JOIN sports s ON s.id = g."sportId"
      WHERE p."isPublished" = true AND p."isBootstrap" = false
        AND p."modelVersion" <> 'v5.0.0-seed'
        AND p.result IN ('WIN','LOSS','PUSH')
        AND s.key IS NOT NULL AND p."modelVersion" IS NOT NULL`,
  );
  const unfBuilt = buildPerformanceSummaries(unfiltered.rows.map(toRow));
  const unfTotals = unfBuilt.rows
    .filter((r) => r.period === "all-time")
    .reduce(
      (a, r) => ({ total: a.total + r.totalPicks, wins: a.wins + r.wins, losses: a.losses + r.losses, pushes: a.pushes + r.pushes }),
      { total: 0, wins: 0, losses: 0, pushes: 0 },
    );
  console.log("\nUNFILTERED pass: rows", unfiltered.rows.length, " skipped", JSON.stringify(unfBuilt.skipped));
  console.log("UNFILTERED build totals:", JSON.stringify(unfTotals));
  console.log(
    "the builder's own in-play exclusion reproduces the SQL-filtered population:",
    JSON.stringify(unfTotals) === JSON.stringify(buildTotals),
  );

  await c.end().catch(() => {});
})();
