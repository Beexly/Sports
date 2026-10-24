#!/usr/bin/env node
/* Run the discovery sweep: promote raw corpus items surfaced by REPEATED retrieval. */
const { Client } = require("pg");
const { execSync } = require("child_process");

const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";
const THRESHOLD = parseInt(process.env.DISCOVERY_THRESHOLD || "3", 10);

function conn() {
  const url = execSync(
    `neonctl connection-string ${BRANCH} --project-id summer-brook-99380762 --role-name neondb_owner`,
    { encoding: "utf8" }
  ).trim().replace(/"/g, "");
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

(async () => {
  const db = conn();
  await db.connect();

  const cands = await db.query(
    `SELECT c.id::text AS corpus_id, c.corpus_key, c.title, c.source, c.abstract, c.url,
            c.hit_count,
            COUNT(DISTINCT e.retrieval_event_id)::int AS distinct_events,
            MAX(e.similarity) AS max_similarity
       FROM lit.corpus_item c
       LEFT JOIN lit.discovery_hit e ON e.corpus_id = c.id
      GROUP BY c.id, c.corpus_key, c.title, c.source, c.abstract, c.url, c.hit_count
     HAVING COUNT(DISTINCT e.retrieval_event_id) >= $1
        AND c.structured_at IS NULL
      ORDER BY COUNT(DISTINCT e.retrieval_event_id) DESC, c.hit_count DESC
      LIMIT 100`,
    [THRESHOLD]
  );
  console.log(`DISCOVERY: ${cands.rows.length} raw items surfaced by >= ${THRESHOLD} DISTINCT retrieval events`);

  let promoted = 0;
  const errors = [];
  for (const c of cands.rows) {
    try {
      const premiseKey = `discovered:${c.corpus_key}`;
      const r = await db.query(
        `INSERT INTO lit.premise (
            premise_key, source, source_ref, title, principle, domain, claim_type,
            evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
            source_file, record_class, verification_tier, status,
            structure_state, content_hash, updated_at
         ) VALUES ($1,$2,$3,$4,$5,'discovered',$6,$7,$8,'{}','{}',$9,'HONESTLY_UNCITED_PRIOR','MSVH_S0_UNCITED','UNCITED_NO_SOURCE','structured',$10, now())
         ON CONFLICT (premise_key) DO UPDATE SET updated_at = now()
         RETURNING id`,
        [
          premiseKey,
          `discovered_${c.source}`,
          c.corpus_key,
          c.title || c.corpus_key,
          c.title,
          "discovered",
          c.abstract || null,
          "Surfaced by repeated retrieval from the raw corpus. Not parsed for a numeric claim; it earns activation weight only through residual feedback after it is graded.",
          c.url || c.corpus_key,
          `corpus:${c.corpus_key}`,
        ]
      );
      const id = r.rows[0].id;
      await db.query(
        `INSERT INTO lit.premise_vector (premise_id, embedding, embedding_model)
         SELECT $1, embedding, embedding_model FROM lit.corpus_item WHERE id = $2
         ON CONFLICT (premise_id) DO UPDATE SET embedding = EXCLUDED.embedding, embedded_at = now()`,
        [id, c.corpus_id]
      );
      await db.query(`UPDATE lit.corpus_item SET structured_at = now() WHERE id = $1`, [c.corpus_id]);
      promoted += 1;
    } catch (err) {
      errors.push(`${c.corpus_key}: ${err.message}`);
    }
  }
  console.log(`DISCOVERY: promoted ${promoted} raw items into structured premises`);
  if (errors.length) console.log("errors:", errors.slice(0, 5));

  const dist = await db.query(
    `SELECT COUNT(DISTINCT e.retrieval_event_id)::int AS events_that_hit_raw,
            COUNT(DISTINCT e.corpus_id)::int AS distinct_items_surfaced,
            (SELECT count(*)::int FROM lit.corpus_item WHERE structured_at IS NOT NULL) AS structured
       FROM lit.discovery_hit e`
  );
  console.log("DISCOVERY SUMMARY:", JSON.stringify(dist.rows[0]));

  await db.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
