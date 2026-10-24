/**
 * Drives the REAL retrieval path against the REAL database, so the
 * verifier can ask what activations it wrote.
 *
 * Run directly to see its output:
 *
 *   node node_modules/tsx/dist/cli.mjs reconciliation/_retrieval_probe.mts
 *
 * The vector is a real one, taken from a premise that already has an
 * embedding, so the query is a real query against the real HNSW
 * index -- not a stub that would pass regardless.
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { retrieveForEvent } from "../packages/prediction-engine/src/literature/literature-retrieval.js";

const require = createRequire(import.meta.url);
const { Client } = require("../node_modules/pg");

const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";
const conn = execSync(
  `neonctl connection-string ${BRANCH} --project-id summer-brook-99380762 --role-name neondb_owner`,
  { encoding: "utf8" },
)
  .trim()
  .replace(/"/g, "");

const db = new Client({ connectionString: conn });
await db.connect();

// A real vector from the index.
const emb = await db.query(`SELECT embedding FROM lit.premise_vector LIMIT 1`);
if (emb.rows.length === 0) {
  console.log(JSON.stringify({ error: "no vectors" }));
  await db.end();
  process.exit(0);
}
const ev = emb.rows[0].embedding;
// pgvector returns either a string ("[1,2,3]") or an array, depending
// on the driver. The Embedder's contract wants number[].
const asNumbers: number[] =
  typeof ev === "string" ? ev.replace(/^\[|\]$/g, "").split(",").map(Number) : ev;

const out = await retrieveForEvent(
  db as never,
  (async () => ({ ok: true, embedding: asNumbers })) as never,
  {
    eventKey: `verify:repopulation:${Date.now()}`,
    gameId: "verify_game",
    signalKey: "Scheme",
    // signal_value is a DOUBLE PRECISION column, so it must be a
    // number. A string here is a type error at the database, not a
    // validation error -- the column is the contract.
    signalValue: 0.5,
    signalFamily: "play_calling",
    contextFields: [],
  } as never,
  { topK: 20, minSimilarity: 0.0 },
);

console.log(
  JSON.stringify({
    retrieval_event_id: out.retrieval_event_id,
    hit_count: out.hit_count,
    refused: out.refused,
    refusal_reason: out.refusal_reason,
    activated: out.activated.length,
  }),
);
await db.end();
