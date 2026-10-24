import * as fs from "node:fs";

const content = fs.readFileSync("packages/prediction-engine/data/MIND_CORPUS_3000.jsonl", "utf8");
const lines = content.trim().split("\n");

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("md:kicker-defense-props.md") || line.includes("Bates kicking points")) {
    console.log(`Found line ${i}:`);
    console.log(line);
  }
}
