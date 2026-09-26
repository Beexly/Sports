/**
 * Measure reasonAbout on the sealed 2025 holdout.
 *
 * The rows are schedule fields. They are not bridge results. This script
 * does not invent a probability, a sample size, or a side. Scores and
 * home_win are not passed in. The trace is not modified.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// Node 22 strips types on import of the .ts module.
const { reasonAbout } = await import(
  resolve(root, "packages/ingestion-pipeline/src/reasoning-trace.ts")
);

const rows = readFileSync(resolve(root, "data/gse-dataset/holdout.jsonl"), "utf8")
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line));

const counts = new Map();
const lines = [];

for (const row of rows) {
  if (row.season !== 2025 || row.partition !== "holdout") {
    throw new Error(`row ${row.game_id} is not the sealed 2025 holdout`);
  }
  const premises = [
    {
      id: "rest",
      readingKind: "PHYSICAL_MODIFIER",
      claim: `rest_diff ${row.rest_diff} is context, not a probability`,
    },
    {
      id: "roof",
      readingKind: "CATEGORICAL",
      claim: `roof ${row.roof} is context, not a probability`,
    },
  ];
  const result = reasonAbout(
    {
      question: `What do the stored bridge results say about ${row.away_team} at ${row.home_team}?`,
      unit: "game",
      interference: "UNKNOWN",
      targetFitOnQuestionSample: false,
      blockedKernels: [
        {
          name: "glmf",
          reason: "Gaussian ALS on a binomial matrix, mu is the sample mean",
        },
      ],
    },
    premises,
  );
  if (!result.ok) throw new Error(result.reason);
  const data = result.data;
  if (data.publishablePick !== false || data.beatsBookClaim !== false) {
    throw new Error("trace emitted a claim it is not allowed to emit");
  }
  counts.set(data.conclusion, (counts.get(data.conclusion) ?? 0) + 1);
  lines.push(
    `| ${row.game_id} | ${row.week} | ${row.away_team} at ${row.home_team} | ${data.conclusion} | ${data.sourceCount} | ${data.reason} |`,
  );
}

const total = rows.length;
const insufficient = counts.get("INSUFFICIENT") ?? 0;
const withheld = counts.get("WITHHELD") ?? 0;
const associated = counts.get("ASSOCIATION_ONLY") ?? 0;

const body = `# 2025 holdout trace distribution

Measured ${new Date().toISOString()} by calling \`reasonAbout\` once per sealed holdout row. The trace source was not edited. The holdout manifest was not edited. No pick was written.

## What was actually on the row

285 games, season 2025, partition holdout, all settled. Every row has a home moneyline, an away moneyline, a spread, a total, scores, and rest. None of those are a bridge result. There is no stored signal probability, no sample count behind a model, and no \`reasonAbout\` premise file.

Scores and \`home_win\` were not passed in. Moneylines were not converted into probabilities. Assigning them a sample size would have been a fabricated premise.

Each call received two context premises (rest, roof) and the blocked GLMF kernel. Context is not a forecast.

## Distribution

| Conclusion | Games |
|---|---|
| INSUFFICIENT | ${insufficient} |
| WITHHELD | ${withheld} |
| ASSOCIATION_ONLY | ${associated} |
| Total | ${total} |

${insufficient} / ${total} games were INSUFFICIENT. That is not a withhold for disagreement. The trace never received a probability premise, so it never agreed and never conflicted.

There is no confidence field on the trace. A reliability diagram and a Brier score of confidence were not computed, because that number is not emitted.

## Per game

| game_id | week | matchup | conclusion | sources | reason |
|---|---|---|---|---|---|
${lines.join("\n")}
`;

const out = resolve(root, "docs/reasoning/2025-holdout-trace-distribution.md");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, body);
console.log(JSON.stringify({ total, insufficient, withheld, associated, out }, null, 2));
