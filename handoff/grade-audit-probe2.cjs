const { Client } = require("pg");

// CORRECTION to the first pass: comparing the DISPLAYED number to the stored
// lock SIGNED produced 1,346 rows, essentially all of them "X -1.5" vs lock
// 1.5. That is the SPREAD convention, not a violation: `line` is stored from
// the HOME perspective, so a pick laid on the away team displays the negation of
// the stored value. The rule the repo states is about the displayed LINE, i.e.
// the magnitude. Comparing magnitudes here.
const DISPLAYED = `(substring(p.selection from '(-?[0-9]+\\.?[0-9]*)\\s*$'))::numeric`;

async function main(conn) {
  const c = new Client({ connectionString: conn });
  await c.connect();
  const q = async (sql) => (await c.query(sql)).rows;

  const m = await q(`
    SELECT p.selection, p."clvLockLine" AS lock, sp.key AS sport, count(*)::int n,
      count(*) FILTER (WHERE p.result IN ('WIN','LOSS','PUSH'))::int decided
    FROM picks p
    JOIN games g ON g.id = p."gameId"
    JOIN sports sp ON sp.id = g."sportId"
    WHERE p."clvLockLine" IS NOT NULL
      AND p."pickType" IN ('SPREAD','TOTAL')
      AND ${DISPLAYED} IS NOT NULL
      AND abs( abs(${DISPLAYED}) - abs(p."clvLockLine") ) > 0.001
    GROUP BY 1,2,3 ORDER BY 4 DESC LIMIT 12`);
  console.log("DISPLAYED-vs-GRADED MAGNITUDE MISMATCH (top 12):");
  console.log(JSON.stringify(m, null, 1));

  const tot = await q(`
    SELECT count(*)::int n,
      count(*) FILTER (WHERE p.result IN ('WIN','LOSS','PUSH'))::int decided,
      count(*) FILTER (WHERE p.result = 'PENDING')::int pending
    FROM picks p
    WHERE p."clvLockLine" IS NOT NULL
      AND p."pickType" IN ('SPREAD','TOTAL')
      AND ${DISPLAYED} IS NOT NULL
      AND abs( abs(${DISPLAYED}) - abs(p."clvLockLine") ) > 0.001`);
  console.log("MISMATCH TOTAL (magnitude):", JSON.stringify(tot[0]));

  // How many picks are DISPLAYING a number no book ever posted, i.e. the
  // published-line rule was violated at mint (legacy rows predate it).
  const meanLocked = await q(`
    SELECT count(*)::int n,
      count(*) FILTER (WHERE p.result IN ('WIN','LOSS','PUSH'))::int decided
    FROM picks p
    WHERE p."clvLockLine" IS NOT NULL
      AND abs(p."clvLockLine"*2 - round(p."clvLockLine"*2)) > 1e-9
      AND abs(p."clvLockLine"*4 - round(p."clvLockLine"*4)) > 1e-9
      AND ${DISPLAYED} IS NOT NULL
      AND abs( abs(${DISPLAYED}) - abs(p."clvLockLine") ) > 0.001`);
  console.log("MEAN-LOCKED **AND** displayed differently:", JSON.stringify(meanLocked[0]));

  // PUSH incidence: does the record ever grade a push?
  const pushes = await q(`
    SELECT sp.key AS sport, p."pickType" AS pt, p.result, count(*)::int n
    FROM picks p
    JOIN games g ON g.id = p."gameId"
    JOIN sports sp ON sp.id = g."sportId"
    WHERE p.result = 'PUSH'
    GROUP BY 1,2,3 ORDER BY 4 DESC LIMIT 20`);
  console.log("PUSH rows in the whole record:", JSON.stringify(pushes, null, 1));

  const tots = await q(`
    SELECT p.result, count(*)::int n FROM picks p GROUP BY 1 ORDER BY 2 DESC`);
  console.log("RESULT CENSUS (all picks):", JSON.stringify(tots));

  await c.end();
}

main(process.argv[2]).catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
