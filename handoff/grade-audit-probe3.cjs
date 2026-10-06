const { Client } = require("pg");

async function main(conn) {
  const c = new Client({ connectionString: conn });
  await c.connect();
  const q = async (sql) => (await c.query(sql)).rows;

  // Which pick types actually sit on the QUARTER grid? Only a quarter SPREAD
  // or TOTAL is graded wrong by the WIN|LOSS|PUSH result set.
  const qgrid = await q(`
    SELECT p."pickType" AS pt, sp.key AS sport,
      count(*)::int n, count(*) FILTER (WHERE p.result IN ('WIN','LOSS','PUSH'))::int decided,
      count(*) FILTER (WHERE p.result='VOID')::int voided
    FROM picks p JOIN games g ON g.id = p."gameId" JOIN sports sp ON sp.id = g."sportId"
    WHERE p."clvLockLine" IS NOT NULL
      AND abs(p."clvLockLine"*2 - round(p."clvLockLine"*2)) > 1e-9
      AND abs(p."clvLockLine"*4 - round(p."clvLockLine"*4)) < 1e-9
    GROUP BY 1,2 ORDER BY 3 DESC`);
  console.log("QUARTER-GRID ROWS BY TYPE:", JSON.stringify(qgrid, null, 1));

  // The half-line grading ERROR, measured on real rows: a quarter line can
  // never be exactly equal to an integer margin/total, so PUSH is structurally
  // impossible, and Asian settlement owes half the stake back on one side.
  // Count quarter rows whose result is decisive (the half that is wrong).
  const err = await q(`
    SELECT p."pickType" AS pt, sp.key AS sport, p.result, count(*)::int n
    FROM picks p JOIN games g ON g.id = p."gameId" JOIN sports sp ON sp.id = g."sportId"
    WHERE p."clvLockLine" IS NOT NULL
      AND abs(p."clvLockLine"*2 - round(p."clvLockLine"*2)) > 1e-9
      AND abs(p."clvLockLine"*4 - round(p."clvLockLine"*4)) < 1e-9
      AND p.result IN ('WIN','LOSS')
    GROUP BY 1,2,3 ORDER BY 4 DESC`);
  console.log("QUARTER ROWS GRADED DECISIVE (half wrong):", JSON.stringify(err, null, 1));

  // Pending rows still holding a MEAN lock: the only forward-looking exposure.
  const fwd = await q(`
    SELECT sp.key AS sport, count(*)::int n
    FROM picks p JOIN games g ON g.id = p."gameId" JOIN sports sp ON sp.id = g."sportId"
    WHERE p.result='PENDING' AND p."clvLockLine" IS NOT NULL
      AND abs(p."clvLockLine"*2 - round(p."clvLockLine"*2)) > 1e-9
      AND abs(p."clvLockLine"*4 - round(p."clvLockLine"*4)) > 1e-9
    GROUP BY 1 ORDER BY 2 DESC`);
  console.log("PENDING + MEAN-LOCK (grades wrong when settled):", JSON.stringify(fwd, null, 1));

  // VOID accounting: which lane actually mints VOID, and for what reason.
  const voids = await q(`
    SELECT p."rcaCode" AS rca, count(*)::int n
    FROM picks p WHERE p.result='VOID' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
  console.log("VOID ROWS BY RCA CODE:", JSON.stringify(voids));

  // Settlement-timing: how long does a pick sit PENDING, and do any settle
  // BEFORE their own kickoff? (Free path had a 12h clock binding.)
  const early = await q(`
    SELECT count(*)::int n
    FROM picks p JOIN games g ON g.id = p."gameId"
    WHERE p."settledAt" IS NOT NULL AND p."settledAt" < g."commenceTime"
      AND p.result IN ('WIN','LOSS','PUSH')`);
  console.log("SETTLED BEFORE OWN KICKOFF:", JSON.stringify(early[0]));

  const lag = await q(`
    SELECT round(avg(EXTRACT(EPOCH FROM (p."settledAt" - g."commenceTime"))/3600)::numeric, 2) AS avg_hours_after_kickoff,
      max(EXTRACT(EPOCH FROM (p."settledAt" - g."commenceTime"))/3600)::numeric(10,1) AS max_hours,
      count(*)::int n
    FROM picks p JOIN games g ON g.id = p."gameId"
    WHERE p."settledAt" IS NOT NULL`);
  console.log("SETTLEMENT LAG:", JSON.stringify(lag[0]));

  await c.end();
}

main(process.argv[2]).catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
