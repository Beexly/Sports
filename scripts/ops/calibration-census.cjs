// Read-only calibration census against prod. SELECT-only, no writes.
// Prints JSON so nothing needs re-parsing by hand.
const fs = require('fs');
const { Client } = require('pg');

// Parse .env.local without printing any secret.
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}

async function main() {
  const c = new Client({ connectionString: env.DATABASE_URL_UNPOOLED || env.DIRECT_URL });
  await c.connect();
  const out = {};

  // 1. Population: settled picks with a live probability source.
  const q = async (label, sql) => {
    const r = await c.query(sql);
    out[label] = r.rows;
    console.log('\n=== ' + label + ' ===');
    console.log(JSON.stringify(r.rows, null, 1));
  };

  await q('brier_and_count', `
    SELECT count(*)::int                                        AS n,
           round(avg(power(p - o, 2))::numeric, 6)               AS brier,
           round(avg(p)::numeric, 6)                            AS mean_pred,
           round(avg(o)::numeric, 6)                            AS mean_actual
      FROM (
        SELECT (factorBreakdown->'independentEdge'->>'trueProb')::float AS p,
               CASE WHEN settlementResult='WIN' THEN 1.0 ELSE 0.0 END    AS o
          FROM picks
         WHERE status='SETTLED'
           AND factorBreakdown->'independentEdge'->>'trueProb' IS NOT NULL
           AND settlementResult IN ('WIN','LOSS')
      ) t`);

  // 2. Calibration buckets — does the model discriminate, and is it honest?
  await q('buckets', `
    SELECT width_bucket(p, 0, 1, 10) AS bucket,
           count(*)::int              AS n,
           round(avg(p)::numeric, 4)  AS said,
           round(avg(o)::numeric, 4)  AS was
      FROM (
        SELECT (factorBreakdown->'independentEdge'->>'trueProb')::float AS p,
               CASE WHEN settlementResult='WIN' THEN 1.0 ELSE 0.0 END    AS o
          FROM picks
         WHERE status='SETTLED'
           AND factorBreakdown->'independentEdge'->>'trueProb' IS NOT NULL
           AND settlementResult IN ('WIN','LOSS')
      ) t
     GROUP BY 1 ORDER BY 1`);

  // 3. Can the market be beaten? Compare model vs closing line.
  await q('vs_market', `
    SELECT count(*)::int AS n,
           round(avg(CASE WHEN p > m THEN o - p ELSE p - o END)::numeric, 4) AS model_logloss,
           round(avg(CASE WHEN m > p THEN o - m ELSE m - o END)::numeric, 4) AS market_logloss
      FROM (
        SELECT (factorBreakdown->'independentEdge'->>'trueProb')::float AS p,
               (factorBreakdown->'independentEdge'->>'marketProb')::float AS m,
               CASE WHEN settlementResult='WIN' THEN 1.0 ELSE 0.0 END      AS o
          FROM picks
         WHERE status='SETTLED'
           AND factorBreakdown->'independentEdge'->>'trueProb' IS NOT NULL
           AND factorBreakdown->'independentEdge'->>'marketProb' IS NOT NULL
           AND settlementResult IN ('WIN','LOSS')
      ) t`);

  await c.end();
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });