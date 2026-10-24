import * as fs from "node:fs";

const content = fs.readFileSync("packages/prediction-engine/data/MIND_CORPUS_3000.jsonl", "utf8");
const lines = content.trim().split("\n");
console.log("Total records in MIND_CORPUS_3000:", lines.length);

const fourthDown: any[] = [];
const acwr: any[] = [];
const crowd: any[] = [];
const cold: any[] = [];
const rest: any[] = [];

for (const line of lines) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line);
  const text = `${rec.title || ""} ${rec.principle_or_feature || rec.principle_name || ""} ${rec.evidence_quote || ""} ${rec.applicable_contexts?.join(" ") || ""}`.toLowerCase();
  
  if (/4th|fourth|romer|coach.*aggress/i.test(text)) fourthDown.push(rec);
  if (/workload|acwr|gabbett|acute.*chronic|training.*load|soft.*tissue/i.test(text)) acwr.push(rec);
  if (/acoustic|crowd.*noise|decibel|sound.*level|spl/i.test(text)) crowd.push(rec);
  if (/sub.*freez|temperature.*threshold|cold.*penalty|freezing|thermal.*drag/i.test(text)) cold.push(rec);
  if (/rest.*differential|circadian|time.*zone|short.*rest/i.test(text)) rest.push(rec);
}

console.log("Fourth down papers found:", fourthDown.length);
fourthDown.slice(0, 3).forEach(p => console.log("  [4th]", p.item_id, p.principle_or_feature || p.principle_name, "->", p.evidence_quote?.slice(0, 80)));

console.log("\nWorkload / ACWR papers found:", acwr.length);
acwr.slice(0, 3).forEach(p => console.log("  [ACWR]", p.item_id, p.principle_or_feature || p.principle_name, "->", p.evidence_quote?.slice(0, 80)));

console.log("\nAcoustic Crowd papers found:", crowd.length);
crowd.slice(0, 3).forEach(p => console.log("  [Crowd]", p.item_id, p.principle_or_feature || p.principle_name, "->", p.evidence_quote?.slice(0, 80)));

console.log("\nCold / Freezing Threshold papers found:", cold.length);
cold.slice(0, 3).forEach(p => console.log("  [Cold]", p.item_id, p.principle_or_feature || p.principle_name, "->", p.evidence_quote?.slice(0, 80)));

console.log("\nRest / Circadian papers found:", rest.length);
rest.slice(0, 3).forEach(p => console.log("  [Rest]", p.item_id, p.principle_or_feature || p.principle_name, "->", p.evidence_quote?.slice(0, 80)));
