import * as fs from "node:fs";

const content = fs.readFileSync("packages/prediction-engine/data/MIND_CORPUS_3000.jsonl", "utf8");
const lines = content.trim().split("\n");

const targetIds = ["2102.03453", "2309.00756", "2104.11595", "2502.16313", "0706.0366"];

for (const line of lines) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line);
  for (const tid of targetIds) {
    if (rec.item_id.includes(tid)) {
      console.log(`=== ${rec.item_id} ===`);
      console.log("  title:", rec.title);
      console.log("  principle_name:", rec.principle_name);
      console.log("  numeric_claim:", rec.numeric_claim);
      console.log("  parsed_float_magnitude:", rec.parsed_float_magnitude);
      console.log("  evidence_quote:", rec.evidence_quote);
      console.log("  applicable_context_fields:", rec.applicable_context_fields);
      console.log("  influence_direction:", rec.influence_direction);
      console.log("  conditional_threshold:", rec.conditional_threshold);
    }
  }
}
