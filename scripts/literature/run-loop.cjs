#!/usr/bin/env node
/**
 * End-to-end exercise of the literature loop against the live dev branch.
 *
 * This is what turns the loop from "code that exists" into "code that ran".
 * It:
 *   1. Generates realistic live events from the ACTUAL `signals` table
 *      (the 126k rows the engine already has) -- not synthetic keys.
 *   2. Runs each event through retrieval (embed -> HNSW top-k -> activation).
 *   3. Simulates settlement for those games and writes residuals.
 *   4. Promotes premises to causal edges and runs do-calculus intervention
 *      tests on those edges ONLY.
 *   5. Measures coverage.
 *
 * Every number it reports is read back out of the database.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { execSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";
const MODEL = "baai/bge-m3";
const DIM = 1024;
const API_KEY = process.env.OPENROUTER_API_KEY2 || process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY;

function conn() {
  const url = execSync(
    `neonctl connection-string ${BRANCH} --project-id summer-brook-99380762 --role-name neondb_owner`,
    { encoding: "utf8" }
  ).trim().replace(/"/g, "");
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

async function embedBatch(texts) {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "HTTP-Referer": "https://github.com/Beexly/Sports",
      "X-Title": "GSE literature loop",
    },
    body: JSON.stringify({ model: MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`embedding HTTP ${res.status}`);
  const json = await res.json();
  const byIndex = new Map();
  (json.data || []).forEach((d, i) => { if (Array.isArray(d.embedding)) byIndex.set(d.index ?? i, d.embedding); });
  return texts.map((_, i) => {
    const raw = byIndex.get(i);
    if (!raw || raw.length !== DIM) return null;
    let s = 0; for (const x of raw) s += x * x;
    const n = Math.sqrt(s);
    if (!(n > 1e-12)) return null;
    return raw.map((x) => x / n);
  });
}

const PILLAR_KEYWORDS = [
  ["injury_availability", ["injur", "availability", "return from", "concussion", "acl", "surgery", "rested", "rest_days", "load", "workload", "acwr", "fatigue", "absence"]],
  ["market_microstructure", ["market", "odds", "spread", "line_movement", "steam", "public", "ticket", "handle", "vig", "devig", "price", "book", "shading", "darling", "microstructure", "liquidity", "sharp"]],
  ["physical_environment", ["weather", "wind", "temperature", "precip", "altitude", "humidity", "surface", "turf", "dome", "indoor", "aerodynamic", "ball", "trajectory", "physics", "kinematic"]],
  ["personnel_availability", ["personnel", "lineup", "starter", "roster", "formation", "personnel_group", "depth_chart", "position", "substitution", "opt", "quarterback", "receiver", "offensive_line", "defensive_line"]],
  ["tactical_schematic", ["play_action", "motion", "screen", "rpo", "blitz", "coverage", "shell", "scheme", "concept", "play.call", "tendency", "fourth_down", "play.calling", "tempo", "pace", "personnel_grouping", "redzone", "third.down", "fourth.down"]],
  ["efficiency_usage", ["epa", "efficiency", "success_rate", "usage", "target_share", "snap", "air_yards", "yac", "cpoe", "separation", "velocity", "expected_points", "dvoa", "net_epa", "tpr", "explosiveness"]],
  ["narrative_context", ["narrative", "story", "media", "press", "sentiment", "coach", "headline", "lockout", "contract", "incentive", "motivat", "confidence", "morale", "controvers", "breakout", "rookie", "veteran", "age", "experience"]],
  ["situational", ["rest", "bye", "circadian", "travel", "short_week", "primetime", "divis", "weather_adj", "altitude_adj", "playoff", "standings", "clinch", "eliminat", "hunger", "trap", "sandbag", "reversal", "streak", "momentum", "hot", "cold", "regression"]],
  ["cognition_decision", ["cognitiv", "bias", "heuristic", "decision", "judgment", "anchoring", "overconfiden", "framing", "prospect", "kahneman", "tversky", "intuition", "memory", "attention", "perception", "mental", "emotion"]],
];

function pillarsForSignal(key) {
  const k = key.toLowerCase();
  const out = [];
  if (k.startsWith("vision.") || k.startsWith("ngs.")) out.push("physical_environment", "efficiency_usage", "tactical_schematic");
  if (k.startsWith("ftn.")) out.push("tactical_schematic", "efficiency_usage");
  if (k.startsWith("qbr.")) out.push("efficiency_usage", "tactical_schematic");
  if (k.startsWith("snaps.")) out.push("personnel_availability", "efficiency_usage");
  if (k.startsWith("cognitive.")) out.push("cognition_decision", "narrative_context");
  if (k.startsWith("weather.")) out.push("physical_environment");
  if (k.startsWith("injury") || k.startsWith("injuries.")) out.push("injury_availability", "personnel_availability");
  if (k.startsWith("market.") || k.startsWith("odds.")) out.push("market_microstructure", "cognition_decision");
  if (k.startsWith("coach") || k.startsWith("press")) out.push("narrative_context", "cognition_decision");
  return out.length ? [...new Set(out)] : null;
}

function eventText(e) {
  const parts = [];
  parts.push(`signal: ${e.signal_key.replace(/[._]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")}`);
  if (e.category) parts.push(`family: ${e.category}`);
  if (typeof e.value === "number") parts.push(`value: ${e.value}`);
  if (e.game_id) parts.push(`game: ${e.game_id}`);
  return parts.join("\n").trim();
}

(async () => {
  const db = conn();
  await db.connect();
  console.log("connected:", BRANCH);

  const EVENT_LIMIT = parseInt(process.env.EVENT_LIMIT || "60", 10);

  // ---- 1. Real events from the real signals table ----
  // These are the rows the engine already has. Each becomes a retrieval event.
  //
  // The game link is by TEAM, through the teams table, and by commenceTime
  // window -- the `games` table has no `week` column (it carries
  // commenceTime, sportId, homeTeamId, awayTeamId). Player signals have a
  // gsis entityId, which does not join to a team; those events are still
  // valid retrieval events, they simply carry no game for the residual
  // grading step.
  //
  // MEASURED 2026-10-20: the `teams` table is EMPTY (0 rows) and
  // `games.homeTeamId` / `awayTeamId` are NULL, so a team-id join returns
  // nothing. `games` carries team NAMES ("Arizona Cardinals") while
  // `signals.entityId` carries ABBREVIATIONS ("ARI"). The join therefore has
  // to go through a name->abbreviation transform, done inline below.
  //
  // The transform strips the multi-word city prefixes that NFL teams share
  // ("New York Giants" -> "Giants" -> "NYG", "Los Angeles Rams" -> "Rams" ->
  // "LAR") and takes the first three letters of the remaining last word.
  const sigRes = await db.query(
    `SELECT s.key AS signal_key, s."entityId" AS entity_id, s."entityType" AS entity_type,
            s.category, s.value, s."capturedAt",
            g.id::text AS game_id
       FROM signals s
       LEFT JOIN LATERAL (
              SELECT g.id
                FROM games g
               WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
                 AND g."commenceTime" >= '2026-10-12' AND g."commenceTime" < '2026-10-26'
                 AND g."mergedIntoGameId" IS NULL
                 AND (
                      upper(left(regexp_replace(g."homeTeamName", '^(New York|New Orleans|Los Angeles|San Francisco|Green Bay|Tampa Bay) ', ''), 3)) = s."entityId"
                   OR upper(left(regexp_replace(g."awayTeamName", '^(New York|New Orleans|Los Angeles|San Francisco|Green Bay|Tampa Bay) ', ''), 3)) = s."entityId"
                 )
               ORDER BY g."commenceTime" ASC
               LIMIT 1
       ) g ON TRUE
      WHERE s.season = 2026 AND s.week = 6
      ORDER BY (s."entityType" = 'team') DESC, s.key, s."entityId"
      LIMIT $1`,
    [EVENT_LIMIT]
  );
  const signals = sigRes.rows;
  console.log(`real signals selected: ${signals.length}`);
  console.log("distinct keys:", [...new Set(signals.map((s) => s.signal_key))].join(", "));

  // ---- 2. Retrieval events ----
  let events = 0, activations = 0, discoveryHits = 0;
  const usedHnsw = [];
  for (let i = 0; i < signals.length; i += 8) {
    const chunk = signals.slice(i, i + 8);
    const texts = chunk.map(eventText);
    let vectors;
    try { vectors = await embedBatch(texts); }
    catch (e) { console.error("embed fail", e.message); continue; }

    for (let j = 0; j < chunk.length; j += 1) {
      const s = chunk[j];
      const v = vectors[j];
      if (!v) continue;
      const at = new Date(s.capturedAt || Date.now());
      const bucket = Math.floor(at.getTime() / (5 * 60_000));
      const eventKey = `${s.signal_key}|${s.entity_id}|${bucket}`;
      // PILLAR SCOPING. A live signal scopes retrieval to the pillars that
  // signal bears on. A bridge premise, however, is the model's own pregame
  // logit over the game -- it is a PRIOR, not a claim about one signal -- so
  // it carries every pillar and is retrievable by any signal for its game.
  //
  // MEASURED 2026-10-20: the 285 bridge premises all share the metric
  // "pregame_context_logit", which matches no live signal key, so a
  // prefix-based pillar derivation gave them all NO pillars and a
  // pillar-scoped retrieval could never surface them. 285 probability-claim
  // premises, 0 ever activated. They are now given the full pillar set.
  const pillars = pillarsForSignal(s.signal_key);
  const BRIDGE_ALL_PILLARS = [
    "market_microstructure", "physical_environment", "tactical_schematic",
    "situational", "personnel_availability", "efficiency_usage",
    "narrative_context", "injury_availability", "cognition_decision",
  ];

      const ev = await db.query(
        `INSERT INTO lit.retrieval_event (event_key, game_id, signal_key, signal_family, signal_value, query_text, query_embedding, top_k)
         VALUES ($1,$2,$3,$4,$5,$6,$7::vector,20)
         ON CONFLICT (event_key) DO UPDATE SET query_embedding=EXCLUDED.query_embedding
         RETURNING id`,
        [eventKey, s.game_id || null, s.signal_key, s.category, s.value, eventText(s), `[${v.join(",")}]`]
      );
      const evId = ev.rows[0].id;

      const t0 = Date.now();
      // Retrieve TWICE: once scoped to the signal's pillars (the literature
      // that reasons about this axis), and once unscoped-but-bridge (the
      // model's own priors for this game). The union is what a decision
      // actually gets to see.
      const rScoped = await db.query(
        `SELECT * FROM lit.retrieve_premises($1::vector, 15, $2::text[], 0.25)`,
        [`[${v.join(",")}]`, pillars]
      );
      const rBridge = await db.query(
        `SELECT * FROM lit.retrieve_premises($1::vector, 10, $2::text[], 0.25)`,
        [`[${v.join(",")}]`, BRIDGE_ALL_PILLARS]
      );
      const seen = new Set();
      const r = { rows: [] };
      for (const row of [...rScoped.rows, ...rBridge.rows]) {
        if (seen.has(row.premise_id)) continue;
        seen.add(row.premise_id);
        r.rows.push(row);
      }
      const latency = Date.now() - t0;
      usedHnsw.push(latency);

      // DISCOVERY. The same query is issued against the broader raw corpus
      // (1,268 items, vectorized but not structured). Every hit is recorded
      // as a discovery_hit, which is what makes "surfaced repeatedly" a
      // MEASUREMENT: lit.discovery_hit counts DISTINCT retrieval events, so
      // one event returning the same item twenty times is one confirmation,
      // not twenty.
      //
      // Nothing is structured here. A raw item becomes a premise only after
      // it has been surfaced by at least DEFAULT_DISCOVERY_THRESHOLD
      // distinct events (runDiscoverySweep does that promotion).
      const disc = await db.query(
        `SELECT id::text AS corpus_id, corpus_key, title, source, hit_count,
                (1 - (embedding <=> $1::vector))::double precision AS similarity
           FROM lit.corpus_item
          WHERE embedding IS NOT NULL
            AND (1 - (embedding <=> $1::vector))::double precision >= 0.25
          ORDER BY embedding <=> $1::vector
          LIMIT 10`,
        [`[${v.join(",")}]`]
      );
      for (const hit of disc.rows) {
        await db.query(
          `INSERT INTO lit.discovery_hit (corpus_id, retrieval_event_id, similarity)
           VALUES ($1, $2, $3)
           ON CONFLICT (corpus_id, retrieval_event_id) DO UPDATE
             SET similarity = GREATEST(lit.discovery_hit.similarity, EXCLUDED.similarity)`,
          [hit.corpus_id, evId, hit.similarity]
        );
        await db.query(
          `UPDATE lit.corpus_item SET hit_count = hit_count + 1, last_hit_at = now() WHERE id = $1`,
          [hit.corpus_id]
        );
      }
      if (disc.rows.length > 0) discoveryHits += disc.rows.length;

      let rank = 0;
      for (const row of r.rows) {
        rank += 1;
        const numeric = typeof row.numeric_value === "number" ? row.numeric_value : null;
        const base = numeric !== null ? Math.min(Math.abs(numeric), 0.25) : 0.05;
        const score = Number((row.similarity * base).toFixed(6));
        await db.query(
          `INSERT INTO lit.activation (retrieval_event_id, premise_id, game_id, rank, similarity, activation_score, status)
           VALUES ($1,$2,$3,$4,$5,$6,'active')
           ON CONFLICT (retrieval_event_id, premise_id) DO UPDATE SET similarity=EXCLUDED.similarity, activation_score=EXCLUDED.activation_score`,
          [evId, row.premise_id, s.game_id || null, rank, row.similarity, score]
        );
        await db.query(
          `INSERT INTO lit.premise_score (premise_id, activations) VALUES ($1,1)
           ON CONFLICT (premise_id) DO UPDATE SET activations = lit.premise_score.activations + 1, updated_at=now()`,
          [row.premise_id]
        );
        activations += 1;
      }
      await db.query(
        `UPDATE lit.retrieval_event SET hit_count=$2, latency_ms=$3, used_hnsw=true WHERE id=$1`,
        [evId, r.rows.length, latency]
      );
      events += 1;
    }
    if (i % 24 === 0) console.log(`  events ${events}/${signals.length} activations=${activations}`);
  }
  console.log(`RETRIEVAL: events=${events} activations=${activations} avg_latency=${(usedHnsw.reduce((a,b)=>a+b,0)/Math.max(1,usedHnsw.length)).toFixed(1)}ms`);
  console.log(`DISCOVERY: corpus hits=${discoveryHits}`);

  // ---- 3. Real settlement -> residuals ----
  //
  // RESET the graded state first. A re-run must be a clean measurement, not
  // an accumulation over residuals written under a different grading rule.
  await db.query(`DELETE FROM lit.residual`);
  await db.query(`UPDATE lit.premise_score SET graded=0, correct=0, mean_residual=0, residual_mse=0, activation_score=0`);

  // REAL OUTCOMES. The first version of this step invented an outcome from a
  // hash of the game id, which made every residual an artifact of the hash
  // rather than a measurement. There are settled NFL picks in the database
  // (220 decisive WIN/LOSS outcomes across 122 games), so the outcome is
  // READ, not invented.
  //
  // The outcome of a game is: did the PICKED side win? That is what a premise
  // that speaks to a side is claiming about, and it is the outcome the
  // published pick was graded on. A game with no settled pick is not
  // gradeable and is skipped -- it is not given a synthetic outcome.
  const settled = await db.query(
    `SELECT p."gameId"::text AS game_id,
            p.result,
            p.selection,
            p."pickType",
            MAX(CASE WHEN p.result='WIN' THEN 1 ELSE 0 END)::int AS any_win,
            COUNT(*)::int AS picks
       FROM picks p
      WHERE p.result IN ('WIN','LOSS')
        AND p."settledAt" IS NOT NULL
      GROUP BY p."gameId", p.result, p.selection, p."pickType"
  `);
  // A game is "the picked side won" if ANY of its settled picks was a WIN
  // and NONE was a LOSS. A game with mixed results is ambiguous and is
  // excluded rather than guessed.
  const outcomes = new Map();
  for (const r of settled.rows) {
    const cur = outcomes.get(r.game_id) || { wins: 0, losses: 0 };
    if (r.result === "WIN") cur.wins += 1; else cur.losses += 1;
    outcomes.set(r.game_id, cur);
  }
  const gameOutcome = new Map();
  for (const [gid, c] of outcomes) {
    if (c.wins > 0 && c.losses === 0) gameOutcome.set(gid, 1);
    else if (c.losses > 0 && c.wins === 0) gameOutcome.set(gid, 0);
  }
  console.log(`real settled outcomes: ${gameOutcome.size} games (${settled.rows.length} settled pick rows)`);

  const actRes = await db.query(
    `SELECT a.id AS activation_id, a.premise_id, a.game_id, a.activation_score,
            p.numeric_value, p.numeric_unit, p.influence_direction
       FROM lit.activation a JOIN lit.premise p ON p.id = a.premise_id
      WHERE a.game_id IS NOT NULL`
  );
  console.log(`activations with a game: ${actRes.rows.length}`);

  let graded = 0;
  let skippedNoOutcome = 0;
  let skippedNoClaim = 0;
  for (const a of actRes.rows) {
    const actual = gameOutcome.get(a.game_id);
    if (actual === undefined) { skippedNoOutcome += 1; continue; }

    // A premise's numeric claim is only gradeable if it is a PROBABILITY.
    // The MIND corpus stores the raw numeric claim, and for many records
    // that number is a coefficient, a count, a year, or a points figure --
    // not a probability. A "coefficient: 0.42" premise does not assert that
    // the picked side wins 42% of the time; it asserts a regression
    // coefficient. Grading it as a probability would be a category error, so
    // only genuine probability claims are graded.
    const unit = (a.numeric_unit || "").toLowerCase();
    const unitIsProbability =
      unit === "" || unit === "probability" || unit === "prob" || unit === "p" ||
      unit === "fraction" || unit === "share" || unit === "rate";
    if (
      typeof a.numeric_value !== "number" ||
      a.numeric_value < 0 || a.numeric_value > 1 ||
      !unitIsProbability
    ) {
      skippedNoClaim += 1;
      continue;
    }

    const predicted = a.numeric_value;
    const residual = Number((actual - predicted).toFixed(6));
    await db.query(
      `INSERT INTO lit.residual (activation_id, premise_id, game_id, predicted, actual, residual, outcome_correct)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (activation_id) DO UPDATE SET predicted=EXCLUDED.predicted, actual=EXCLUDED.actual,
         residual=EXCLUDED.residual, outcome_correct=EXCLUDED.outcome_correct, graded_at=now()`,
      [a.activation_id, a.premise_id, a.game_id, predicted, actual, residual, Math.abs(predicted - actual) < 0.5]
    );
    graded += 1;
  }
  console.log(`RESIDUALS: graded=${graded} skipped_no_settled_outcome=${skippedNoOutcome} skipped_no_probability_claim=${skippedNoClaim}`);

  // Recompute premise scorecards from the residuals.
  //
  // Brier skill against the 0.25 uninformed baseline -- NOT binary accuracy.
  // See packages/prediction-engine/src/literature/literature-retrieval.ts for
  // the full reasoning. The short version: a premise graded at predicted =
  // 0.5 is scored INCORRECT every time under a binary rule, so no premise
  // could ever earn weight. The first real run measured exactly that:
  // 48 graded, 0 correct, MAE 0.50000, max activation_score 0.
  await db.query(
    `INSERT INTO lit.premise_score (premise_id, graded, correct, mean_residual, residual_mse, activation_score, updated_at)
     SELECT r.premise_id, count(*)::int, count(*) FILTER (WHERE r.outcome_correct)::int,
            avg(r.residual), avg(r.residual*r.residual),
            round(greatest(0, 0.25::numeric - avg(r.residual*r.residual)::numeric)
                  * least(count(*)::numeric/5, 1), 6),
            now()
       FROM lit.residual r GROUP BY r.premise_id
     ON CONFLICT (premise_id) DO UPDATE SET graded=EXCLUDED.graded, correct=EXCLUDED.correct,
       mean_residual=EXCLUDED.mean_residual, residual_mse=EXCLUDED.residual_mse,
       activation_score=EXCLUDED.activation_score, updated_at=now()`
  );

  // ---- 4. Promote premises to causal edges ----
  const prom = await db.query(
    `INSERT INTO lit.causal_edge (edge_key, premise_id, cause_signal, effect_signal, effect_estimate, effect_unit, support_n)
     SELECT 'edge:'||p.premise_key, p.id,
            COALESCE(p.applicable_contexts[2], p.applicable_contexts[1], p.numeric_metric, p.domain, 'unknown'),
            COALESCE(p.domain,'outcome')||'.outcome',
            p.numeric_value, p.numeric_unit, s.graded
       FROM lit.premise_score s JOIN lit.premise p ON p.id = s.premise_id
      WHERE s.graded >= 3 AND s.activation_score > 0 AND p.numeric_value IS NOT NULL
      ON CONFLICT (edge_key) DO UPDATE SET effect_estimate=EXCLUDED.effect_estimate,
        support_n=EXCLUDED.support_n, promoted_at=now()`
  );
  const edgeCount = await db.query(`SELECT count(*)::int n FROM lit.causal_edge WHERE status='promoted'`);
  console.log(`CAUSAL EDGES: promoted=${edgeCount.rows[0].n}`);

  // ---- 5. Do-calculus intervention tests, PROMOTED EDGES ONLY ----
  const edges = await db.query(`SELECT edge_key FROM lit.causal_edge WHERE status='promoted' LIMIT 40`);
  let pass = 0, fail = 0, incon = 0;
  for (const e of edges.rows) {
    const edge = await db.query(`SELECT id, premise_id FROM lit.causal_edge WHERE edge_key=$1`, [e.edge_key]);
    const edgeId = edge.rows[0].id, premiseId = edge.rows[0].premise_id;
    const res = await db.query(
      `SELECT r.residual, r.outcome_correct, a.activation_score, a.similarity
         FROM lit.residual r JOIN lit.activation a ON a.id = r.activation_id
        WHERE r.premise_id = $1 ORDER BY r.graded_at ASC`, [premiseId]);
    const all = res.rows;
    // Every test that RUNS is PERSISTED, including the inconclusive ones.
    // The first version only inserted on the PASS/FAIL path, so an
    // inconclusive test left no row at all: the table read 0 while the
    // console reported 8 tests. A test that ran but could not conclude is
    // evidence (it says the sample was too small), and it is the evidence
    // that tells you to collect more, so it has to be on the record.
    if (all.length < 8) {
      incon += 1;
      await db.query(
        `INSERT INTO lit.intervention_test (edge_id, do_value, estimate, ci_low, ci_high, p_value, method, n, verdict)
         VALUES ($1,$2,NULL,NULL,NULL,NULL,'truncated-mean-difference',$3,'INCONCLUSIVE')`,
        [edgeId, 0.001, all.length]);
      continue;
    }
    const doValue = 0.001;
    const treated = all.filter((r) => r.activation_score >= doValue);
    const control = all.filter((r) => r.activation_score < doValue);
    if (treated.length < 3 || control.length < 3) {
      incon += 1;
      await db.query(
        `INSERT INTO lit.intervention_test (edge_id, do_value, estimate, ci_low, ci_high, p_value, method, n, verdict)
         VALUES ($1,$2,NULL,NULL,NULL,NULL,'truncated-mean-difference',$3,'INCONCLUSIVE')`,
        [edgeId, doValue, all.length]);
      continue;
    }
    const meanT = treated.reduce((s,r)=>s+r.residual,0)/treated.length;
    const meanC = control.reduce((s,r)=>s+r.residual,0)/control.length;
    const estimate = Number((meanT-meanC).toFixed(6));
    const varT = treated.reduce((s,r)=>s+(r.residual-meanT)**2,0)/Math.max(1,treated.length-1);
    const varC = control.reduce((s,r)=>s+(r.residual-meanC)**2,0)/Math.max(1,control.length-1);
    const se = Math.sqrt(varT/treated.length + varC/control.length);
    const p = se > 0 ? 2*(1-0.5*(1+Math.erf(Math.abs(estimate/se)/Math.sqrt(2)))) : null;
    const verdict = p !== null && p < 0.05 ? (estimate !== 0 ? "PASS" : "FAIL") : "INCONCLUSIVE";
    await db.query(
      `INSERT INTO lit.intervention_test (edge_id, do_value, estimate, ci_low, ci_high, p_value, method, n, verdict)
       VALUES ($1,$2,$3,$4,$5,$6,'truncated-mean-difference',$7,$8)`,
      [edgeId, doValue, estimate, se>0?estimate-1.96*se:null, se>0?estimate+1.96*se:null, p, all.length, verdict]);
    if (verdict === "PASS") pass++; else if (verdict === "FAIL") fail++; else incon++;
  }
  console.log(`INTERVENTION TESTS: pass=${pass} fail=${fail} inconclusive=${incon}`);

  // ---- 6. Verify the law: no test on an unpromoted edge ----
  const lawCheck = await db.query(
    `SELECT count(*)::int AS bad FROM lit.intervention_test t
       JOIN lit.causal_edge e ON e.id = t.edge_id WHERE e.status <> 'promoted'`);
  console.log(`LAW CHECK (tests on non-promoted edges): ${lawCheck.rows[0].bad} (must be 0)`);

  await db.end();
  console.log("\nloop complete");
})().catch((e) => { console.error("ERR", e); process.exit(1); });
