const { Client } = require("pg");

const Q = "SELECT 1"; // placeholder so the file is a module

async function main(conn) {
  const c = new Client({ connectionString: conn });
  await c.connect();
  const q = async (sql) => (await c.query(sql)).rows;

  // Classify every locked line onto a grid:
  //   half    = x.0 / x.5   (NFL/NBA/MLB standard)
  //   quarter = x.25 / x.75 (soccer Asian lines — a real posted number)
  //   neither = anything else -> a MEAN, not a line any book posted
  const census = await q(`
    WITH x AS (
      SELECT p.result, sp.key AS sport,
        CASE
          WHEN abs(p."clvLockLine"*2 - round(p."clvLockLine"*2)) < 1e-9 THEN 'half'
          WHEN abs(p."clvLockLine"*4 - round(p."clvLockLine"*4)) < 1e-9 THEN 'quarter'
          ELSE 'neither'
        END AS grid
      FROM picks p
      JOIN games g ON g.id = p."gameId"
      JOIN sports sp ON sp.id = g."sportId"
      WHERE p."clvLockLine" IS NOT NULL
    )
    SELECT grid, count(*)::int n,
      count(*) FILTER (WHERE result = 'PENDING')::int pending,
      count(*) FILTER (WHERE result IN ('WIN','LOSS','PUSH'))::int decided
    FROM x GROUP BY 1 ORDER BY 2 DESC`);
  console.log("LOCKED-LINE GRID CENSUS:");
  console.log(JSON.stringify(census, null, 1));

  const bySport = await q(`
    WITH x AS (
      SELECT sp.key AS sport, p.result
      FROM picks p
      JOIN games g ON g.id = p."gameId"
      JOIN sports sp ON sp.id = g."sportId"
      WHERE p."clvLockLine" IS NOT NULL
        AND abs(p."clvLockLine"*2 - round(p."clvLockLine"*2)) > 1e-9
        AND abs(p."clvLockLine"*4 - round(p."clvLockLine"*4)) > 1e-9
    )
    SELECT sport, count(*)::int n,
      count(*) FILTER (WHERE result IN ('WIN','LOSS','PUSH'))::int decided,
      count(*) FILTER (WHERE result = 'PENDING')::int pending
    FROM x GROUP BY 1 ORDER BY 2 DESC`);
  console.log("MEAN-LOCKED (no book posted it) BY SPORT:");
  console.log(JSON.stringify(bySport, null, 1));

  // Does the DISPLAYED selection disagree with the graded line? The repo's
  // own hard rule: "Never publish a pick whose displayed line differs from its
  // clvLockLine." Measure the violation, not the intent.
  const mism = await q(`
    SELECT p.selection, p."clvLockLine" AS lock, count(*)::int n,
      count(*) FILTER (WHERE p.result IN ('WIN','LOSS','PUSH'))::int decided
    FROM picks p
    WHERE p."clvLockLine" IS NOT NULL
      AND p."pickType" IN ('SPREAD','TOTAL')
      AND (substring(p.selection from '(-?[0-9]+\\.?[0-9]*)\\s*$'))::numeric IS NOT NULL
      AND abs( (substring(p.selection from '(-?[0-9]+\\.?[0-9]*)\\s*$'))::numeric - p."clvLockLine" ) > 0.001
    GROUP BY 1,2 ORDER BY 3 DESC LIMIT 12`);
  console.log("DISPLAYED-vs-GRADED LINE MISMATCH (top 12):");
  console.log(JSON.stringify(mism, null, 1));

  const mismTotal = await q(`
    SELECT count(*)::int n,
      count(*) FILTER (WHERE result IN ('WIN','LOSS','PUSH'))::int decided
    FROM picks p
    WHERE p."clvLockLine" IS NOT NULL
      AND p."pickType" IN ('SPREAD','TOTAL')
      AND (substring(p.selection from '(-?[0-9]+\\.?[0-9]*)\\s*$'))::numeric IS NOT NULL
      AND abs( (substring(p.selection from '(-?[0-9]+\\.?[0-9]*)\\s*$'))::numeric - p."clvLockLine" ) > 0.001`);
  console.log("MISMATCH TOTAL:", JSON.stringify(mismTotal[0]));

  await c.end();
}

main(process.argv[2]).catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
