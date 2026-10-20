#!/usr/bin/env node
/**
 * Populate the lit.premise / lit.premise_vector / lit.corpus_item tables.
 *
 * Reads the repo corpora, embeds them via OpenRouter (bge-m3), and writes to
 * the dev branch's `lit` schema. Idempotent: re-running updates in place.
 *
 * Usage:
 *   node scripts/literature/build-index.cjs [--limit N] [--corpus-limit N] [--no-corpus]
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { execSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";
const MODEL = "baai/bge-m3";
const DIM = 1024;

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

function conn() {
  const url = execSync(
    `neonctl connection-string ${BRANCH} --project-id summer-brook-99380762 --role-name neondb_owner`,
    { encoding: "utf8" }
  ).trim().replace(/"/g, "");
  return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

// ---------- embedding ----------
const API_KEY =
  process.env.OPENROUTER_API_KEY2 ||
  process.env.OPENROUTER_API_KEY3 ||
  process.env.OPENROUTER_API_KEY;

async function embedBatch(texts) {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "HTTP-Referer": "https://github.com/Beexly/Sports",
      "X-Title": "GSE literature index",
    },
    body: JSON.stringify({ model: MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`embedding HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const byIndex = new Map();
  (json.data || []).forEach((d, idx) => {
    if (Array.isArray(d.embedding)) byIndex.set(d.index ?? idx, d.embedding);
  });
  return texts.map((_, idx) => {
    const raw = byIndex.get(idx);
    if (!raw || raw.length !== DIM) return null;
    let sum = 0;
    for (const x of raw) sum += x * x;
    const n = Math.sqrt(sum);
    if (!(n > 1e-12)) return null;
    return raw.map((x) => x / n);
  });
}

// ---------- pillars (mirrors the TS module) ----------
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

/**
 * A bridge premise is keyed on a SIGNAL, so its pillars are that signal's
 * pillars. Without this, all 285 probability-claim bridge premises get NO
 * pillars (their domain is "model_premise" and their title is a game id), and
 * a pillar-scoped retrieval can never surface them. Measured on the first
 * full build: 285 probability-claim premises, 0 ever activated.
 */
function bridgePremisePillars(signalId) {
  return pillarsForSignal(signalId) ?? [];
}

function derivePillars(p) {
  const hay = [p.domain || "", (p.applicable_contexts || []).join(" "), p.numeric_metric || "", p.principle || "", p.title || ""]
    .join(" ").toLowerCase();
  const out = [];
  for (const [pillar, kws] of PILLAR_KEYWORDS) {
    if (kws.some((k) => hay.includes(k))) out.push(pillar);
  }
  return out;
}

// ---------- corpus loading ----------
function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean);
}

function mindToPremise(rec) {
  const title = typeof rec.title === "string" ? rec.title.trim() : "";
  if (!title) return null;
  const numeric = rec.numeric_claim || null;
  const principle =
    (typeof rec.principle_or_feature === "string" && rec.principle_or_feature) ||
    (typeof rec.principle_name === "string" && rec.principle_name) || null;
  const contexts = Array.isArray(rec.applicable_contexts) ? rec.applicable_contexts : [];
  const howIt =
    (typeof rec.how_it_influences_reasoning === "string" && rec.how_it_influences_reasoning) ||
    (typeof rec.influence_description === "string" && rec.influence_description) || null;
  const itemId = typeof rec.item_id === "string" ? rec.item_id : "";
  return {
    premise_key: `mind:${itemId || title.slice(0, 24)}`,
    source: typeof rec.source === "string" ? rec.source : "unknown",
    source_ref: itemId || null,
    title,
    principle,
    domain: typeof rec.domain === "string" ? rec.domain : null,
    claim_type: typeof rec.claim_type === "string" ? rec.claim_type : null,
    numeric_value: typeof numeric?.value === "number" ? numeric.value : null,
    numeric_unit: typeof numeric?.unit === "string" ? numeric.unit : null,
    numeric_metric: typeof numeric?.metric === "string" ? numeric.metric : null,
    influence_direction: typeof rec.influence_direction === "string" ? rec.influence_direction : null,
    evidence_quote: typeof rec.evidence_quote === "string" ? rec.evidence_quote : null,
    how_it_influences: howIt,
    applicable_contexts: contexts,
    source_file: typeof rec.source_file === "string" ? rec.source_file : null,
    source_doc_hash: typeof rec.source_doc_hash === "string" ? rec.source_doc_hash : null,
    // CLASS-A EXCLUSIVITY (2026-10-20). The class travels with the
    // record from the corpus, so a premise that was verified against a
    // document on disk stays class-A citable in the index and one that
    // was not stays uncitable. A record with no class is uncitable --
    // the honest default for an unknown provenance is "unverified", and
    // the column's DEFAULT enforces the same thing at the database.
    record_class: typeof rec.record_class === "string" ? rec.record_class : null,
    verification_tier: typeof rec.verification_tier === "string" ? rec.verification_tier : null,
  };
}

function bridgeToPremise(rec) {
  const gameId = typeof rec.game_id === "string" ? rec.game_id : "";
  const signalId = typeof rec.signal_id === "string" ? rec.signal_id : "";
  if (!gameId || !signalId) return null;
  const prob = typeof rec.probability === "number" ? rec.probability : null;
  const n = typeof rec.sample_count === "number" ? rec.sample_count : null;
  const method = typeof rec.method === "string" ? rec.method : "unknown";
  const outcome = typeof rec.outcome === "string" ? rec.outcome : "home";
  const sign = rec.home_sign && typeof rec.home_sign === "object" ? rec.home_sign : {};
  return {
    premise_key: `bridge:${gameId}:${signalId}`,
    source: "bridge_premise",
    source_ref: gameId,
    title: `${signalId} -> ${outcome} (${gameId})`,
    principle: `Model premise: ${signalId} predicts ${outcome}`,
    domain: "model_premise",
    claim_type: "model_fit",
    numeric_value: prob,
    numeric_unit: "probability",
    numeric_metric: signalId,
    influence_direction: outcome === "home" ? "positive" : "negative",
    evidence_quote: `Fitted by ${method} on n=${n ?? "?"}; logistic feature signs: ${JSON.stringify(sign)}`,
    how_it_influences: `Prior probability ${prob ?? "?"} for ${outcome}; sample count ${n ?? "?"}; method ${method}.`,
    applicable_contexts: [signalId],
    source_file: "data/gse-dataset/bridge-premises.jsonl",
    source_doc_hash: null,
  };
}

function premiseText(p) {
  const parts = [p.title];
  if (p.principle && p.principle !== p.title) parts.push(p.principle);
  if (p.domain) parts.push(`domain: ${p.domain}`);
  if (p.claim_type) parts.push(`claim type: ${p.claim_type}`);
  if (typeof p.numeric_value === "number") {
    parts.push(`numeric claim: ${p.numeric_value} ${p.numeric_unit || ""}`.trim() + (p.numeric_metric ? ` (${p.numeric_metric})` : ""));
  }
  if (p.influence_direction) parts.push(`influence: ${p.influence_direction}`);
  if (p.how_it_influences) parts.push(p.how_it_influences);
  if (p.applicable_contexts && p.applicable_contexts.length) parts.push(`applies when: ${p.applicable_contexts.join(", ")}`);
  if (p.evidence_quote) parts.push(p.evidence_quote.slice(0, 600));
  return parts.filter(Boolean).join("\n").trim();
}

// ---------- raw corpus discovery ----------
const CORPUS_FILES = [
  ["docs/arxiv-program/research/2026-10-17/ARXIV_OMNIBUS_SPORTS_AND_BETTING_CORPUS.json", "arXiv"],
  ["docs/arxiv-program/research/2026-10-17/ALL_FOOTBALL_PAPERS_CATEGORIZED.json", "arXiv"],
  ["docs/arxiv-program/research/2026-10-17/ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json", "arXiv"],
  ["docs/arxiv-program/research/2026-10-17/OPENALEX_NFL_MASTER_CORPUS.json", "OpenAlex"],
  ["docs/arxiv-program/research/2026-10-17/MASTER_NFL_SPORTS_PAPERS_DATABASE.json", "master"],
];

function loadRawCorpus() {
  const out = [];
  const seen = new Set();
  for (const [rel, source] of CORPUS_FILES) {
    const file = path.join(REPO, rel);
    if (!fs.existsSync(file)) continue;
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(file, "utf8")); } catch { continue; }
    // Recurse: some dumps are a bare array, some are a dict of named
    // category arrays, some are a dict with a single results array. Walking
    // the whole structure finds every record regardless of shape.
    //
    // A record is an object that carries a title or an abstract. Anything
    // else is a CONTAINER and gets walked into. Conflating the two is what
    // made an earlier version of this loader return zero records: a record's
    // field values are strings, so pushing the record back onto the stack
    // and only descending into array/object values walked straight past it.
    const stack = [parsed];
    while (stack.length > 0) {
      const node = stack.pop();
      if (Array.isArray(node)) {
        for (const rec of node) {
          if (rec && typeof rec === "object") stack.push(rec);
        }
        continue;
      }
      if (!node || typeof node !== "object") continue;

      const title = node.title || node.name || null;
      const abstract = node.abstract || node.description || node.summary || null;
      const looksLikeRecord = Boolean(title || abstract) &&
        (node.arxiv_id || node.id || node.doi || node.ref || node.url || node.published || node.date || node.year);

      if (looksLikeRecord) {
        const id = node.arxiv_id || node.id || node.doi || node.ref || node.url || title;
        const key = `${source}:${id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            corpus_key: key,
            source,
            title: title ? String(title) : null,
            abstract: abstract ? String(abstract).slice(0, 4000) : null,
            url: node.url || node.doi || null,
            authors: Array.isArray(node.authors) ? node.authors.join(", ").slice(0, 400) : (typeof node.authors === "string" ? node.authors.slice(0, 400) : null),
            published_date: isoDate(node.date || node.published || node.published_date || node.year),
          });
        }
        continue;
      }

      for (const v of Object.values(node)) {
        if (Array.isArray(v) || (v && typeof v === "object")) stack.push(v);
      }
    }
  }
  return out;
}

/**
 * Normalize a date-ish value to an ISO date (YYYY-MM-DD) or null.
 *
 * The corpus dumps carry dates in several shapes ("8 October, 2025",
 * "2025-10-08", 2025). Passing a non-ISO string to a Postgres date column
 * fails the write, and a failed write on 429 of 991 items is a silent hole
 * in the index. Anything not cleanly parseable becomes null.
 */
function isoDate(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    const y = v > 1e9 ? new Date(v * 1000) : new Date(v);
    return Number.isNaN(y.getTime()) ? null : y.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  // Already ISO.
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // Bare year.
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  // "8 October, 2025" / "October 8, 2025"
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/);
  if (m) {
    const months = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
    const mo = months[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
  }
  const m2 = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m2) {
    const months = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
    const mo = months[m2[1].toLowerCase()];
    if (mo) return `${m2[3]}-${String(mo).padStart(2, "0")}-${String(Number(m2[2])).padStart(2, "0")}`;
  }
  return null;
}

// ---------- main ----------
(async () => {
  const limit = arg("limit", null);
  const corpusLimit = arg("corpus-limit", null);
  const doCorpus = arg("no-corpus", false) !== true;
  const dryRun = arg("dry-run", false) === true;
  const batch = 24;

  const db = conn();
  await db.connect();
  console.log("connected:", BRANCH);

  const mind = readJsonl(path.join(REPO, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl")).map(mindToPremise).filter(Boolean);
  const bridge = readJsonl(path.join(REPO, "data/gse-dataset/bridge-premises.jsonl")).map(bridgeToPremise).filter(Boolean);
  console.log(`corpora: mind=${mind.length} bridge=${bridge.length}`);
  if (limit) console.log(`LIMIT: premises=${limit} corpus=${corpusLimit}`);

  let all = [...mind, ...bridge];
  if (limit) all = all.slice(0, parseInt(limit, 10));

  // DRY RUN: report what WOULD be embedded, and stop. Used to validate the
  // corpus loader and the date parser without spending API calls.
  if (dryRun) {
    const raw = loadRawCorpus();
    const bySource = {};
    for (const it of raw) bySource[it.source] = (bySource[it.source] || 0) + 1;
    console.log(`DRY RUN: ${all.length} premises, ${raw.length} raw corpus items`);
    console.log("  raw by source:", JSON.stringify(bySource));
    console.log("  raw with a parseable date:", raw.filter((x) => x.published_date).length);
    console.log("  raw with a title:", raw.filter((x) => x.title).length);
    console.log("  sample:", JSON.stringify(raw[0]).slice(0, 300));
    await db.end();
    return;
  }

  // RESUME: skip premises already present with a vector, unless --force.
  // The build is idempotent but re-embedding 5,434 records costs real API
  // time and money; a resumed build should only pay for what is missing.
  if (arg("only-missing", false) === true) {
    const have = await db.query(
      `SELECT p.premise_key FROM lit.premise_vector v JOIN lit.premise p ON p.id = v.premise_id`
    );
    const haveSet = new Set(have.rows.map((r) => r.premise_key));
    const before = all.length;
    all = all.filter((p) => !haveSet.has(p.premise_key));
    console.log(`RESUME: ${before - all.length} already embedded, ${all.length} to do`);
  }
  console.log(`premises to index: ${all.length}`);

  let written = 0, embedded = 0, failed = 0;
  for (let i = 0; i < all.length; i += batch) {
    const chunk = all.slice(i, i + batch);
    const texts = chunk.map(premiseText);
    let vectors;
    try {
      vectors = await embedBatch(texts);
    } catch (e) {
      console.error("EMBED FAIL", e.message);
      failed += chunk.length;
      continue;
    }
    for (let j = 0; j < chunk.length; j += 1) {
      const p = chunk[j];
      const v = vectors[j];
      const pillars = p.source === "bridge_premise" && p.numeric_metric
        ? bridgePremisePillars(p.numeric_metric)
        : derivePillars(p);
      try {
        const r = await db.query(
          `INSERT INTO lit.premise (
              premise_key, source, source_ref, title, principle, domain, claim_type,
              numeric_value, numeric_unit, numeric_metric, influence_direction,
              evidence_quote, how_it_influences, applicable_contexts, pillar_tags,
              source_file, source_doc_hash, record_class, verification_tier,
              structure_state, content_hash, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'structured',$20, now())
           ON CONFLICT (premise_key) DO UPDATE SET
              title=EXCLUDED.title, principle=EXCLUDED.principle, domain=EXCLUDED.domain,
              claim_type=EXCLUDED.claim_type, numeric_value=EXCLUDED.numeric_value,
              numeric_unit=EXCLUDED.numeric_unit, numeric_metric=EXCLUDED.numeric_metric,
              influence_direction=EXCLUDED.influence_direction,
              evidence_quote=EXCLUDED.evidence_quote, how_it_influences=EXCLUDED.how_it_influences,
              applicable_contexts=EXCLUDED.applicable_contexts, pillar_tags=EXCLUDED.pillar_tags,
              source_file=EXCLUDED.source_file, source_doc_hash=EXCLUDED.source_doc_hash,
              record_class=EXCLUDED.record_class, verification_tier=EXCLUDED.verification_tier,
              content_hash=EXCLUDED.content_hash, updated_at=now()
           RETURNING id`,
          [p.premise_key, p.source, p.source_ref, p.title, p.principle, p.domain, p.claim_type,
           p.numeric_value, p.numeric_unit, p.numeric_metric, p.influence_direction,
           p.evidence_quote, p.how_it_influences, p.applicable_contexts, pillars,
           p.source_file, p.source_doc_hash,
           // CLASS-A EXCLUSIVITY. A premise with no class is NOT citable.
           p.record_class || "HONESTLY_UNCITED_PRIOR",
           p.verification_tier || "MSVH_S0_UNCITED",
           JSON.stringify(p)]
        );
        const id = r.rows[0].id;
        written++;
        if (v) {
          await db.query(
            `INSERT INTO lit.premise_vector (premise_id, embedding, embedding_model)
             VALUES ($1, $2::vector, $3)
             ON CONFLICT (premise_id) DO UPDATE SET embedding=EXCLUDED.embedding, embedding_model=EXCLUDED.embedding_model, embedded_at=now()`,
            [id, `[${v.join(",")}]`, MODEL]
          );
          embedded++;
        }
      } catch (e) {
        failed++;
        if (failed < 4) console.error("WRITE FAIL", p.premise_key, e.message.slice(0, 120));
      }
    }
    if (i % (batch * 10) === 0) console.log(`  premises ${Math.min(i + batch, all.length)}/${all.length} written=${written} embedded=${embedded} failed=${failed}`);
  }
  console.log(`PREMISES DONE: written=${written} embedded=${embedded} failed=${failed}`);

  if (doCorpus) {
    const raw = loadRawCorpus();
    let limited = corpusLimit ? raw.slice(0, parseInt(corpusLimit, 10)) : raw;
    // RESUME the corpus too: skip items that already carry a vector.
    if (arg("only-missing", false) === true) {
      const have = await db.query(
        `SELECT corpus_key FROM lit.corpus_item WHERE embedding IS NOT NULL`
      );
      const haveSet = new Set(have.rows.map((r) => r.corpus_key));
      const before = limited.length;
      limited = limited.filter((c) => !haveSet.has(c.corpus_key));
      console.log(`CORPUS RESUME: ${before - limited.length} already embedded, ${limited.length} to do`);
    }
    console.log(`raw corpus items: ${raw.length} (embedding ${limited.length})`);
    let cw = 0, ce = 0, cf = 0;
    for (let i = 0; i < limited.length; i += batch) {
      const chunk = limited.slice(i, i + batch);
      const texts = chunk.map((c) => [c.title || "", c.abstract || ""].filter(Boolean).join("\n").trim() || c.corpus_key);
      let vectors;
      try { vectors = await embedBatch(texts); } catch (e) { console.error("CORPUS EMBED FAIL", e.message); cf += chunk.length; continue; }
      for (let j = 0; j < chunk.length; j += 1) {
        const c = chunk[j];
        const v = vectors[j];
        try {
          await db.query(
            `INSERT INTO lit.corpus_item (corpus_key, source, title, abstract, url, authors, published_date, embedding, embedding_model)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector,$9)
             ON CONFLICT (corpus_key) DO UPDATE SET
                title=EXCLUDED.title, abstract=EXCLUDED.abstract, url=EXCLUDED.url,
                authors=EXCLUDED.authors, published_date=EXCLUDED.published_date,
                embedding=EXCLUDED.embedding, embedding_model=EXCLUDED.embedding_model`,
            [c.corpus_key, c.source, c.title, c.abstract, c.url, c.authors, c.published_date, v ? `[${v.join(",")}]` : null, MODEL]
          );
          cw++; if (v) ce++;
        } catch (e) { cf++; if (cf < 4) console.error("CORPUS WRITE FAIL", c.corpus_key, e.message.slice(0, 120)); }
      }
      if (i % (batch * 10) === 0) console.log(`  corpus ${Math.min(i + batch, limited.length)}/${limited.length} written=${cw}`);
    }
    console.log(`CORPUS DONE: written=${cw} embedded=${ce} failed=${cf}`);
  }

  // ANALYZE so the planner has fresh stats for the HNSW index.
  await db.query("ANALYZE lit.premise_vector");
  await db.query("ANALYZE lit.corpus_item");
  console.log("analyzed");

  const cnt = await db.query(
    `SELECT (SELECT count(*) FROM lit.premise)::int premises,
            (SELECT count(*) FROM lit.premise_vector)::int vectors,
            (SELECT count(*) FROM lit.corpus_item)::int corpus,
            (SELECT count(*) FROM lit.corpus_item WHERE embedding IS NOT NULL)::int corpus_vec`
  );
  console.log("FINAL:", JSON.stringify(cnt.rows[0]));

  // CLASS-A EXCLUSIVITY (2026-10-20). Report the class breakdown, so
  // the index's own summary says how many premises are citable and how
  // many are not. A count that only reported the total would hide the
  // number that decides whether the index can produce a causal claim
  // at all.
  const cls = await db.query(
    `SELECT record_class, count(*)::int n
       FROM lit.premise GROUP BY 1 ORDER BY n DESC`
  );
  console.log("BY CLASS:", JSON.stringify(cls.rows));

  await db.end();
})().catch((e) => { console.error("ERR", e); process.exit(1); });
