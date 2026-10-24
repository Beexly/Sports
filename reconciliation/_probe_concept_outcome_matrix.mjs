import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: process.env.PGCONN });

(async () => {
  await c.connect();

  // The grader's NextGenStat path derives BOTH the concept and the outcome
  // from the same next_gen_stats -> players -> player_game_stats join, so
  // the game_key comes from next_gen_stats on BOTH sides. Replicate that
  // exactly, and add an EFFICIENCY outcome (yards per target) alongside
  // the VOLUME outcome (targets) the grader currently uses.
  const q = await c.query(`
    WITH base AS (
      SELECT s.season::text||'_'||s.week::text||'_'||s.team AS gk,
             pl.id AS pid,
             AVG(s."avgSeparation"::numeric) AS sep,
             AVG(s."avgCushion"::numeric) AS cush,
             AVG(s."aggressiveness"::numeric) AS aggr,
             AVG(p."targets"::numeric) AS tgt,
             AVG(p."receivingYards"::numeric) AS ry,
             AVG(p."receptions"::numeric) AS rc
        FROM next_gen_stats s
        JOIN players pl ON pl."gsisId" = s."gsisId"
        JOIN player_game_stats p
          ON p."playerId" = pl.id AND p.season = s.season AND p.week = s.week
       WHERE p."targets" IS NOT NULL
       GROUP BY 1,2
    ),
    enriched AS (
      SELECT *, ry/NULLIF(tgt,0) AS ypt, rc/NULLIF(tgt,0) AS cpt FROM base
    )
    SELECT 'avgSeparation' AS concept, 'targets' AS outcome,
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep AND a.tgt<>b.tgt)::int AS pairs,
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep AND a.tgt<>b.tgt
                              AND sign(a.sep-b.sep)=sign(a.tgt-b.tgt))::int AS same
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'avgSeparation','ydsPerTarget',
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt),
           COUNT(*) FILTER (WHERE a.sep IS NOT NULL AND b.sep IS NOT NULL AND a.sep<>b.sep AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt
                              AND sign(a.sep-b.sep)=sign(a.ypt-b.ypt))
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'avgCushion','targets',
           COUNT(*) FILTER (WHERE a.cush IS NOT NULL AND b.cush IS NOT NULL AND a.cush<>b.cush AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.cush IS NOT NULL AND b.cush IS NOT NULL AND a.cush<>b.cush AND a.tgt<>b.tgt
                              AND sign(a.cush-b.cush)=sign(a.tgt-b.tgt))
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'avgCushion','ydsPerTarget',
           COUNT(*) FILTER (WHERE a.cush IS NOT NULL AND b.cush IS NOT NULL AND a.cush<>b.cush AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt),
           COUNT(*) FILTER (WHERE a.cush IS NOT NULL AND b.cush IS NOT NULL AND a.cush<>b.cush AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt
                              AND sign(a.cush-b.cush)=sign(a.ypt-b.ypt))
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'aggressiveness','targets',
           COUNT(*) FILTER (WHERE a.aggr IS NOT NULL AND b.aggr IS NOT NULL AND a.aggr<>b.aggr AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.aggr IS NOT NULL AND b.aggr IS NOT NULL AND a.aggr<>b.aggr AND a.tgt<>b.tgt
                              AND sign(a.aggr-b.aggr)=sign(a.tgt-b.tgt))
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'aggressiveness','ydsPerTarget',
           COUNT(*) FILTER (WHERE a.aggr IS NOT NULL AND b.aggr IS NOT NULL AND a.aggr<>b.aggr AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt),
           COUNT(*) FILTER (WHERE a.aggr IS NOT NULL AND b.aggr IS NOT NULL AND a.aggr<>b.aggr AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt
                              AND sign(a.aggr-b.aggr)=sign(a.ypt-b.ypt))
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'receivingYards','targets',
           COUNT(*) FILTER (WHERE a.ry IS NOT NULL AND b.ry IS NOT NULL AND a.ry<>b.ry AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.ry IS NOT NULL AND b.ry IS NOT NULL AND a.ry<>b.ry AND a.tgt<>b.tgt
                              AND sign(a.ry-b.ry)=sign(a.tgt-b.tgt))
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'receivingYards','ydsPerTarget',
           COUNT(*) FILTER (WHERE a.ry IS NOT NULL AND b.ry IS NOT NULL AND a.ry<>b.ry AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt),
           COUNT(*) FILTER (WHERE a.ry IS NOT NULL AND b.ry IS NOT NULL AND a.ry<>b.ypt*0 + b.ypt AND a.ypt IS NOT NULL AND b.ypt IS NOT NULL AND a.ypt<>b.ypt
                              AND sign(a.ry-b.ry)=sign(a.ypt-b.ypt))
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
    UNION ALL
    SELECT 'receptions','targets',
           COUNT(*) FILTER (WHERE a.rc IS NOT NULL AND b.rc IS NOT NULL AND a.rc<>b.rc AND a.tgt<>b.tgt),
           COUNT(*) FILTER (WHERE a.rc IS NOT NULL AND b.rc IS NOT NULL AND a.rc<>b.rc AND a.tgt<>b.tgt
                              AND sign(a.rc-b.rc)=sign(a.tgt-b.tgt))
      FROM enriched a JOIN enriched b ON a.gk=b.gk AND a.pid<>b.pid
  `);

  console.log('=== CONCEPT x OUTCOME, using the grader\'s own join shape ===');
  console.log('(the grader currently uses the VOLUME outcome "targets" for every measure)');
  console.log('');
  for (const r of q.rows) {
    const rate = r.pairs ? r.same / r.pairs : NaN;
    const edge = rate - 0.5;
    const verdict = !r.pairs ? 'no data'
      : Math.abs(edge) > 0.25 ? 'DEFINITIONAL'
      : Math.abs(edge) > 0.05 ? 'some association'
      : 'AT CHANCE';
    console.log('  ' + r.concept.padEnd(15) + ' vs ' + String(r.outcome).padEnd(13) +
      ' pairs=' + String(r.pairs).padStart(7) +
      ' rate=' + (isNaN(rate) ? '   n/a' : rate.toFixed(4)) +
      '  edge=' + (isNaN(edge) ? '  n/a' : (edge >= 0 ? '+' : '') + edge.toFixed(4)) +
      '  ' + verdict);
  }

  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
