import * as fs from "node:fs";

const content = fs.readFileSync("packages/prediction-engine/data/MIND_CORPUS_3000.jsonl", "utf8");
const lines = content.trim().split("\n");

const matches: any[] = [];
for (const line of lines) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line);
  const text = `${rec.title || ""} ${rec.principle_or_feature || rec.principle_name || ""} ${rec.evidence_quote || ""}`.toLowerCase();
  if (/aerodynamic|ball.*flight|wind|drag|friction|air.*density/i.test(text)) {
    matches.push(rec);
  }
}

console.log("Total aerodynamic/wind/flight matches:", matches.length);
matches.slice(0, 15).forEach(m => console.log("  *", m.item_id, m.principle_name || m.principle_or_feature, "->", m.evidence_quote?.slice(0, 90)));
