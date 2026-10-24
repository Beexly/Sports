import * as fs from "node:fs";

const content = fs.readFileSync("packages/prediction-engine/data/MIND_CORPUS_3000.jsonl", "utf8");
const lines = content.trim().split("\n");

let acoustic = 0;
let acwr = 0;
let fourth = 0;
let temp = 0;
let wind = 0;
let rest = 0;
let tz = 0;

for (const line of lines) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line);
  const fields = rec.applicable_context_fields || rec.applicable_contexts || [];
  const fieldsStr = fields.join(" ");
  if (/acoustic|crowd/i.test(fieldsStr)) acoustic++;
  if (/workload|acwr/i.test(fieldsStr)) acwr++;
  if (/fourth|coach/i.test(fieldsStr)) fourth++;
  if (/temp|ambient/i.test(fieldsStr)) temp++;
  if (/wind/i.test(fieldsStr)) wind++;
  if (/rest/i.test(fieldsStr)) rest++;
  if (/circadian|time_zone/i.test(fieldsStr)) tz++;
}

console.log("Counts of tags in MIND_CORPUS_3000:");
console.log({ acoustic, acwr, fourth, temp, wind, rest, tz });
