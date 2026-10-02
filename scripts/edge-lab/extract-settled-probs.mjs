#!/usr/bin/env node
/**
 * Extract the settled (published probability, outcome) pairs an isotonic map is
 * fit from, so the fit is REPEATABLE by anyone and not just by whoever ran it
 * once and wrote the number in a comment.
 *
 * WHY THIS EXISTS
 * ---------------
 * `isotonic-calibration.ts` records that its map was fit on 1,823 settled picks
 * and states the Brier/ECE before and after. Those numbers are currently
 * reproducible by nobody: the measurement lived in an ad-hoc query whose SQL was
 * never kept. A calibration claim that cannot be re-run is not a measurement,
 * it is an anecdote, and it goes stale silently as picks settle.
 *
 * WHAT IT DOES
 * ------------
 * Reads settled production picks carrying a model probability, writes them as
 * JSONL to stdout or a file, and prints a summary (n, mean published, realized
 * rate, Brier) to stderr so the premise can be checked before any map is fit.
 *
 *   node scripts/edge-lab/extract-settled-probs.mjs > settled.jsonl
 *
 * WHAT IT WILL NOT DO
 * -------------------
 * It does not fit a map, does not pick a method, and does not decide whether the
 * relationship is worth correcting. `fitIsotonicMap` is the only thing that
 * fits, and it refuses a sample below its own floor. Pooling bet types is
 * unsound in general and `family-reliability.ts` documents why; this script
 * therefore reports pickType counts so a pooled fit is at least a visible
 * choice rather than a silent one.
 *
 * READ-ONLY. It issues one SELECT and writes nothing to the database.
 */
import { writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Nothing to extract.");
  process.exit(2);
}

const { default: pg } = await import("pg");

/**
 * The model probability lives at factorBreakdown->independentEdge->trueProb.
 * A row with a null there is not a zero and not a loss: it is a pick the engine
 * never priced, and it is EXCLUDED rather than coerced. Coercing absence to
 * zero is the single failure this repo's doctrine names first.
 *
 * THE COLUMN NAMES HERE WERE CHECKED AGAINST schema.prisma, and one of them was
 * wrong the first time this was written: settled picks carry `result`
 * (enum PickResult: PENDING | WIN | LOSS | PUSH | VOID), not `outcome` with
 * WON/LOST. A query written against `outcome` returns zero rows, and a script
 * that prints a summary over zero rows looks exactly like a script that ran
 * cleanly and found no miscalibration. Read the enum before trusting the count.
 *
 * PUSH and VOID are excluded rather than scored 0 or 0.5: a push is not a loss
 * and a void is not a decision the model made, so neither is a label this map
 * can learn from. Counting them would bias the fitted level toward 0.
 */
const SQL = `
  SELECT
    picks.id::text                AS pick_id,
    picks.pickType::text           AS pick_type,
    (picks."factorBreakdown"->'independentEdge'->>'trueProb')::float AS published,
    CASE WHEN picks.result = 'WIN' THEN 1.0
         WHEN picks.result = 'LOSS' THEN 0.0 END       AS outcome,
    picks."settledAt"::text        AS settled_at
  FROM picks
  WHERE picks.result IN ('WIN','LOSS')
    AND picks."factorBreakdown"->'independentEdge'->>'trueProb' IS NOT NULL
  ORDER BY picks."settledAt" DESC
`;

const client = new pg.Client({ connectionString: url });
await client.connect();
const res = await client.query(SQL);
await client.end();

const rows = res.rows.filter(
  (r) => Number.isFinite(r.published) && (r.outcome === 0 || r.outcome === 1),
);
if (rows.length === 0) {
  console.error("no settled picks carry a model probability; refusing to emit an empty corpus");
  process.exit(1);
}

const out = process.argv[2];
const body = rows
  .map((r) =>
    JSON.stringify({
      pickId: r.pick_id,
      pickType: r.pick_type,
      published: r.published,
      outcome: r.outcome,
      settledAt: r.settled_at,
    }),
  )
  .join("\n");

if (out) writeFileSync(out, body + "\n");
else process.stdout.write(body + "\n");

// Summary to stderr so piping stdout to a file stays clean.
const n = rows.length;
const meanPub = rows.reduce((s, r) => s + r.published, 0) / n;
const realized = rows.reduce((s, r) => s + r.outcome, 0) / n;
const brier = rows.reduce((s, r) => s + (r.published - r.outcome) ** 2, 0) / n;
const byType = {};
for (const r of rows) byType[r.pick_type] = (byType[r.pick_type] ?? 0) + 1;

console.error(`settled picks with a model probability : ${n}`);
console.error(`mean published                        : ${meanPub.toFixed(4)}`);
console.error(`realized win rate                     : ${realized.toFixed(4)}`);
console.error(`overconfidence (published - realized) : ${(meanPub - realized).toFixed(4)}`);
console.error(`Brier as published                    : ${brier.toFixed(4)}`);
console.error(`Brier of a constant 0.5               : 0.2500`);
console.error(`rows dropped as unusable              : ${res.rows.length - rows.length}`);
console.error(`per pickType                          : ${JSON.stringify(byType)}`);
console.error(
  "\nA positive overconfidence with a near-0.25 Brier is the fixable case: the ranking\n" +
    "carries information and the LEVEL is wrong, so a monotone map can correct it.\n" +
    "A Brier at or above 0.2500 is not that case, and no map should be fit to it.",
);
