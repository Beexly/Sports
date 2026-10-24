import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: process.env.PGCONN });

(async () => {
  await c.connect();

  console.log('=== IS THE MEASURE->OUTCOME ASSOCIATION DEFINITIONAL OR DISCOVERED? ===');
  console.log('Within-game same-sign rate of concept X against outcome Y.');
  console.log('A rate near 1.0 (or near 0.0) means X and Y are the SAME quantity measured twice.');
  console.log('');

  const q = await c.query(`
    WITH pgs AS (
      SELECT season::text||'_'||week::text||'_'||team AS gk, "playerId" AS pid,
             AVG("targets"::numeric) AS tgt,
             AVG("receivingYards"::numeric) AS ry,
             AVG("receptions"::numeric) AS rc,
             AVG("rushingYards"::numeric) AS rsh
        FROM player_game_stats
       WHERE "targets" IS NOT NULL
       GROUP BY 1,2
    ),
    ngs AS (
      SELECT s.season::text||'_'||s.week::text||'_'||s.team AS gk, pl.id AS pid,
             AVG(s."avgSeparation"::numeric) AS sep,
             AVG(s."avgCushion"::numeric) AS cush,
             AVG(s."aggressiveness"::numeric) AS aggr
        FROM next_gen_stats s JOIN players pl ON pl."gsisId" = s."gsisId"
       GROUP BY 1,2
    ),
    sc AS (
      SELECT sc.season::text||'_'||sc.week::text||'_'||sc.team AS gk, pl.id AS pid,
             AVG(sc."offenseSnaps"::numeric) AS snaps
        FROM snap_counts sc
        JOIN players pl ON lower(pl."fullName"::text)=lower(sc."playerName"::text)
       GROUP BY 1,2
    ),
    j AS (
      SELECT pgs.gk, pgs.pid, pgs.tgt, pgs.ry, pgs.rc, pgs.rsh, ngs.sep, ngs.cush, ngs.aggr, sc.snaps,
             CASE WHEN pgs.tgt > 0 THEN pgs.ry / pgs.tgt END AS yds_per_target
        FROM pgs
        LEFT JOIN ngs ON ngs.gk=pgs.gk AND ngs.pid=pgs.pid
        LEFT JOIN sc  ON sc.gk=pgs.gk  AND sc.pid=pgs.pid
    )
    SELECT 'receivingYards' AS concept, 'targets' AS outcome,
           COUNT(*) FILTER (WHERE a.ry IS NOT NULL AND b.ry IS NOT NULL AND a.ry<>b.ry AND a.tgt<>b.tgt)::int AS pairs,
           COUNT(*) FILTER (WHERE a.ry IS NOT NULL AND b.ry IS NOT NULL AND a.ry<>b.ry AND a.tgt<>b.tgt
                              AND sign(a.ry-b.ry)=sign(a.tgt-b.tgt))::int AS same
      FROM j a JOIN j b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'receptions','targets',
           COUNT(*) FILTER (WHERE a.rc IS NOT NULL AND b.rc IS NOT NULL AND a.rc<>b.rc AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.rc IS NOT NULL AND b.rc IS NOT NULL AND a.rc<>b.rc AND a.tgt<>b.tgt
                              AND sign(a.rc-b.rc)=sign(a.tgt-b.tgt))
      FROM j a JOIN j b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'rushingYards','targets',
           COUNT(*) FILTER (WHERE a.rsh IS NOT NULL AND b.rsh IS NOT NULL AND a.rsh<>b.rsh AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.rsh IS NOT NULL AND b.rsh IS NOT NULL AND a.rsh<>b.rsh AND a.tgt<>b.tgt
                              AND sign(a.rsh-b.rsh)=sign(a.tgt-b.tgt))
      FROM j a JOIN j b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'offenseSnaps','targets',
           COUNT(*) FILTER (WHERE a.snaps IS NOT NULL AND b.snaps IS NOT NULL AND a.snaps<>b.snaps AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.snaps IS NOT NULL AND b.snaps IS NOT NULL AND a.snaps<>b.snaps AND a.tgt<>b.tgt
                              AND sign(a.snaps-b.snaps)=sign(a.tgt-b.tgt))
      FROM j a JOIN j b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'avgSeparation','targets',
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep AND a.tgt<>b.tgt
                              AND sign(a.sep-b.sep)=sign(a.tgt-b.tgt))
      FROM j a JOIN j b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'avgSeparation','ydsPerTarget',
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt),
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt
                              AND sign(a.sep-b.sep)=sign(a.ypt-b.ypt))
      FROM (SELECT *, ry/NULLIF(tgt,0) AS ypt FROM j) a
      JOIN (SELECT *, ry/NULLIF(tgt,0) AS ypt FROM j) b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'avgCushion','targets',
           COUNT(*) FILTER (WHERE a.cush IS NOT NULL AND b.cush IS NOT NULL AND a.cush<>b.cush AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.cush IS NOT NULL AND b.cush IS NOT NULL AND a.cush<>b.cush AND a.tgt<>b.tgt
                              AND sign(a.cush-b.cush)=sign(a.tgt-b.tgt))
      FROM j a JOIN j b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'aggressiveness','targets',
           COUNT(*) FILTER (WHERE a.aggr IS NOT NULL AND b.aggr IS NOT NULL AND a.aggr<>b.aggr AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.aggr IS NOT NULL AND b.aggr IS NOT NULL AND a.aggr<>b.aggr AND a.tgt<>b.tgt
                              AND sign(a.aggr-b.aggr)=sign(a.tgt-b.tgt))
      FROM j a JOIN j b ON a.gk=b.gk AND a.pid<>b.pid
  `);

  const rows = q.rows.map(r => ({
    concept: r.concept, outcome: r.outcome, pairs: r.pairs, same: r.same,
    rate: r.pairs ? r.same / r.pairs : NaN,
  }));
  for (const r of rows) {
    const verdict = !r.pairs ? 'NO DATA'
      : Math.abs(r.rate - 0.5) > 0.25 ? 'DEFINITIONAL (same quantity)'
      : Math.abs(r.rate - 0.5) > 0.05 ? 'some association'
      : 'AT CHANCE (no signal)';
    console.log('  %-16s vs %-14s pairs=%7d  rate=%.4f  edge=%+.4f  %s',
      r.concept, r.outcome, r.pairs, r.rate, r.rate - 0.5, verdict);
  }

  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
