import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: process.env.PGCONN });
(async () => {
  await c.connect();
  console.log('=== IS THE OUTCOME (targets) AN INVOLVEMENT PROXY? ===');
  console.log('within-game same-sign rate of each concept column against targets:');
  const q = await c.query(`
    WITH pgs AS (
      SELECT season::text||'_'||week::text||'_'||team AS gk, "playerId" AS pid,
             AVG("targets"::numeric) AS tgt, AVG("receivingYards"::numeric) AS ry,
             AVG("receptions"::numeric) AS rc, AVG("rushingYards"::numeric) AS rsh
        FROM player_game_stats WHERE "targets" IS NOT NULL GROUP BY 1,2
    ),
    ngs AS (
      SELECT s.season::text||'_'||s.week::text||'_'||s.team AS gk, pl.id AS pid,
             AVG(s."avgSeparation"::numeric) AS sep, AVG(s."avgCushion"::numeric) AS cush
        FROM next_gen_stats s JOIN players pl ON pl."gsisId" = s."gsisId" GROUP BY 1,2
    ),
    sc AS (
      SELECT sc.season::text||'_'||sc.week::text||'_'||sc.team AS gk, pl.id AS pid,
             AVG(sc."offenseSnaps"::numeric) AS snaps
        FROM snap_counts sc JOIN players pl ON lower(pl."fullName"::text)=lower(sc."playerName"::text)
       GROUP BY 1,2
    ),
    joined AS (
      SELECT pgs.gk, pgs.pid, pgs.tgt, pgs.ry, pgs.rc, pgs.rsh, ngs.sep, ngs.cush, sc.snaps
        FROM pgs
        LEFT JOIN ngs ON ngs.gk=pgs.gk AND ngs.pid=pgs.pid
        LEFT JOIN sc  ON sc.gk=pgs.gk  AND sc.pid=pgs.pid
    )
    SELECT 'receivingYards' AS col,
           COUNT(*) FILTER (WHERE a.ry IS NOT NULL AND b.ry IS NOT NULL AND a.ry<>b.ry AND a.tgt<>b.tgt)::int AS pairs,
           COUNT(*) FILTER (WHERE a.ry IS NOT NULL AND b.ry IS NOT NULL AND a.ry<>b.ry AND a.tgt<>b.tgt
                              AND sign(a.ry-b.ry)=sign(a.tgt-b.tgt))::int AS same
      FROM joined a JOIN joined b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'receptions', COUNT(*) FILTER (WHERE a.rc IS NOT NULL AND b.rc IS NOT NULL AND a.rc<>b.rc AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.rc IS NOT NULL AND b.rc IS NOT NULL AND a.rc<>b.rc AND a.tgt<>b.tgt
                              AND sign(a.rc-b.rc)=sign(a.tgt-b.tgt))
      FROM joined a JOIN joined b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'rushingYards', COUNT(*) FILTER (WHERE a.rsh IS NOT NULL AND b.rsh IS NOT NULL AND a.rsh<>b.rsh AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.rsh IS NOT NULL AND b.rsh IS NOT NULL AND a.rsh<>b.rsh AND a.tgt<>b.tgt
                              AND sign(a.rsh-b.rsh)=sign(a.tgt-b.tgt))
      FROM joined a JOIN joined b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'avgSeparation', COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep),
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep
                              AND sign(a.sep-b.sep)=sign(a.tgt-b.tgt))
      FROM joined a JOIN joined b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'avgCushion', COUNT(*) FILTER (WHERE a.cush IS NOT NULL AND b.cush IS NOT NULL AND a.cush<>b.cush),
           COUNT(*) FILTER (WHERE a.cush IS NOT NULL AND b.cush IS NOT NULL AND a.cush<>b.cush
                              AND sign(a.cush-b.cush)=sign(a.tgt-b.tgt))
      FROM joined a JOIN joined b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'offenseSnaps', COUNT(*) FILTER (WHERE a.snaps IS NOT NULL AND b.snaps IS NOT NULL AND a.snaps<>b.snaps),
           COUNT(*) FILTER (WHERE a.snaps IS NOT NULL AND b.snaps IS NOT NULL AND a.snaps<>b.snaps
                              AND sign(a.snaps-b.snaps)=sign(a.tgt-b.tgt))
      FROM joined a JOIN joined b ON a.gk=b.gk AND a.pid<>b.pid
  `);
  for (const r of q.rows) {
    const rate = r.pairs ? r.same / r.pairs : 0;
    console.log('  %-16s pairs=%7d same_sign=%7d rate=%.4f  (edge over chance %+.4f)',
      r.col, r.pairs, r.same, rate, rate - 0.5);
  }
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
