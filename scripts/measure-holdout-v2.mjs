/**
 * Distribution of reasonAbout after the bridge file exists.
 * Does not edit the trace. Does not pass home_win in.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { traceHoldoutGame } = await import(
  resolve(root, "packages/ingestion-pipeline/src/reasoning-trace/from-bridge.ts")
);

function rows(path) {
  return readFileSync(resolve(root, path), "utf8").split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
}

const holdout = rows("data/gse-dataset/holdout.jsonl");
const premises = rows("data/gse-dataset/bridge-premises.jsonl");
const counts = new Map();
const reasons = new Map();
const lines = [];
let example = null;

for (const row of holdout) {
  const result = traceHoldoutGame(
    {
      game_id: row.game_id,
      season: row.season,
      week: row.week,
      home_team: row.home_team,
      away_team: row.away_team,
      rest_diff: row.rest_diff,
      roof: row.roof,
    },
    premises,
  );
  if (!result.ok) throw new Error(result.reason);
  const data = result.data;
  if (data.publishablePick !== false) throw new Error("pick emitted");
  counts.set(data.conclusion, (counts.get(data.conclusion) ?? 0) + 1);
  reasons.set(data.reason, (reasons.get(data.reason) ?? 0) + 1);
  if (row.game_id === "2025_01_DAL_PHI") example = data;
  lines.push(`| ${row.game_id} | ${data.conclusion} | ${data.sourceCount} | ${data.agreementSummary ?? ""} | ${data.withheldReasons.join("; ")} |`);
}

const top = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
const body = `# 2025 holdout distribution v2

The bridge file supplied one pregame-context probability per game. \`home_win\` was not an input. One source is not agreement.

| Conclusion | Games |
|---|---|
| INSUFFICIENT | ${counts.get("INSUFFICIENT") ?? 0} |
| WITHHELD | ${counts.get("WITHHELD") ?? 0} |
| ASSOCIATION_ONLY | ${counts.get("ASSOCIATION_ONLY") ?? 0} |

Top reasons:

${top.map(([reason, n]) => `- ${n}: ${reason}`).join("\n")}

2025_01_DAL_PHI conclusion: ${example?.conclusion}. Sources: ${example?.sourceCount}. Summary: ${example?.agreementSummary}. Withheld reasons: ${(example?.withheldReasons ?? []).join("; ") || "none"}.

| game_id | conclusion | sources | summary | withheld reasons |
|---|---|---|---|---|
${lines.join("\n")}
`;
const out = resolve(root, "docs/reasoning/2025-holdout-distribution-v2.md");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, body);
console.log(JSON.stringify({ counts: Object.fromEntries(counts), top, dal: example && { conclusion: example.conclusion, summary: example.agreementSummary, sources: example.sourceCount } }, null, 2));
