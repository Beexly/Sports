import { loadVerifiedMindCorpus } from "../packages/prediction-engine/src/reasoning/mind-reasoning.js";

const corpus = loadVerifiedMindCorpus();
const tempPrinciples = corpus.filter(p => p.applicable_context_fields.includes("ambient_temp_fahrenheit"));
console.log("Total temp principles in corpus:", tempPrinciples.length);

const pos = tempPrinciples.filter(p => p.influence_direction === "positive");
const neg = tempPrinciples.filter(p => p.influence_direction === "negative");
const cond = tempPrinciples.filter(p => p.influence_direction === "conditional");
console.log(`Temp directions: pos=${pos.length}, neg=${neg.length}, cond=${cond.length}`);

console.log("\nSample positive temp principles:");
pos.slice(0, 5).forEach(p => console.log(" ", p.item_id, p.principle_name, "->", p.numeric_claim, p.evidence_quote.slice(0, 70)));

console.log("\nSample negative temp principles:");
neg.slice(0, 5).forEach(p => console.log(" ", p.item_id, p.principle_name, "->", p.numeric_claim, p.evidence_quote.slice(0, 70)));

const windPrinciples = corpus.filter(p => p.applicable_context_fields.includes("wind_speed_mph"));
console.log("\nTotal wind principles in corpus:", windPrinciples.length);
const wpos = windPrinciples.filter(p => p.influence_direction === "positive");
const wneg = windPrinciples.filter(p => p.influence_direction === "negative");
const wcond = windPrinciples.filter(p => p.influence_direction === "conditional");
console.log(`Wind directions: pos=${wpos.length}, neg=${wneg.length}, cond=${wcond.length}`);
console.log("\nSample positive wind principles:");
wpos.slice(0, 5).forEach(p => console.log(" ", p.item_id, p.principle_name, "->", p.numeric_claim, p.evidence_quote.slice(0, 70)));
