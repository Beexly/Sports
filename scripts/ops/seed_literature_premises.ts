/**
 * Seed literature_premises from the ingested source docs and prove the A→B route.
 *
 * Real text, real embeddings, real DB. No invented premises: every row is a sentence taken
 * from docs/engine/research/2026-10-28/. Masks are assigned from the sentence's own content
 * (wind, motion, pressure, separation, box count) so Stage A has something true to filter on.
 */

import { readFileSync } from "node:fs";
import { Client } from "pg";
import {
  buildContextMask,
  maskToArray,
  route,
  type Signal,
} from "../../packages/mcp-equations-server/src/mcp-cognitive-router.js";

const GATEWAY = process.env.NEON_AI_GATEWAY_BASE_URL!;
const TOKEN = process.env.NEON_AI_GATEWAY_TOKEN!;
const DB = process.env.DATABASE_URL!;

const DOCS = [
  "docs/engine/research/2026-10-28/gse-coach-brain-llm-engine.txt",
  "docs/engine/research/2026-10-28/gse-coach-simulation-audits.txt",
  "docs/engine/research/2026-10-28/gse-10-23.txt",
];

// family -> matcher. Families are the 279 signal slots; these are the ones the docs discuss.
const FAMILIES: Array<[number, RegExp]> = [
  [1, /\bwind\b/i],
  [2, /\bmotion\b/i],
  [3, /\bplay[- ]action\b/i],
  [4, /\bpressure\b|\bblitz/i],
  [5, /\bseparation\b/i],
  [6, /\bbox\b/i],
  [7, /\btemperature\b|\bcold\b/i],
  [8, /\bprecip|\brain\b/i],
  [9, /\bshadow\b/i],
  [10, /\btempo\b|\bpace\b/i],
];

function maskFor(text: string): Signal[] {
  return FAMILIES.filter(([, re]) => re.test(text)).map(([family]) => ({
    family,
    displacement: 1,
    n: 100,
  }));
}

async function embed(input: string, attempt = 1): Promise<number[]> {
  try {
    const r = await fetch(`${GATEWAY}/v1/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen3-embedding-0-6b", input }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`);
    const j = (await r.json()) as { data: Array<{ embedding: number[] }> };
    const v = j.data[0]?.embedding;
    if (!v || v.length !== 1024) throw new Error(`bad embedding (${v?.length ?? 0} dims)`);
    return v;
  } catch (e) {
    // One gateway hiccup must not abandon a 120-row seed run.
    if (attempt >= 3) throw e;
    await new Promise((res) => setTimeout(res, 500 * attempt));
    return embed(input, attempt + 1);
  }
}

function sentences(path: string): string[] {
  return readFileSync(path, "utf8")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 80 && s.length < 400);
}

async function main() {
  const db = new Client({ connectionString: DB });
  await db.connect();

  const seen = new Set<string>();
  let inserted = 0;
  for (const doc of DOCS) {
    // Prefer sentences that carry a signal family, then fill — otherwise the first 40 are
    // all architecture prose and Stage A has almost nothing to filter on.
    const all = sentences(doc);
    const ordered = [...all.filter((x) => maskFor(x).length > 0), ...all.filter((x) => maskFor(x).length === 0)];
    for (const s of ordered.slice(0, 40)) {
      if (seen.has(s)) continue;
      seen.add(s);
      const id = `P-SEED-${String(inserted + 1).padStart(3, "0")}`;
      // Build the mask once through the router's own function — the previous two-step
      // insert-zeros-then-update duplicated this logic and left rows invisible to Stage A
      // if the UPDATE failed.
      const mask = maskToArray(buildContextMask(maskFor(s)));
      const vec = await embed(s);
      await db.query(
        `INSERT INTO literature_premises (id, premise, cluster, context_mask, embedding)
         VALUES ($1,$2,$3,$4::int[],$5::vector) ON CONFLICT (id) DO NOTHING`,
        [id, s, "M1", mask, `[${vec.join(",")}]`],
      );
      inserted++;
    }
  }
  console.log(`seeded ${inserted} premises`);

  // Prove the route: a query about wind and pressure.
  const q = "how does outdoor wind change the pass rate and pressure rate";
  const qvec = await embed(q);
  const hits = await route(db, maskFor(q), qvec, { stageBLimit: 5 });
  console.log(`\nquery: ${q}`);
  console.log(`hits: ${hits.length}`);
  for (const h of hits) {
    console.log(`  ${h.similarity.toFixed(4)}  ${h.id}  ${h.premise.slice(0, 110)}`);
  }
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
