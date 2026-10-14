// SIMULATE the staleness gate against the 158 real pending production rows.
//
// This is the test that matters: a gate that is green in unit tests but vetoes
// the whole board in production is worse than no gate. Every row here is a real
// solo-source-elo signal pick (the signal slate always sets marketFairProb
// null), so `isSoloSourceElo` is true for all of them and the ONLY variable
// is age relative to kickoff.

import { readFileSync } from "node:fs";
import { stalenessBlockers } from "../src/signal-staleness.js";

const RAW = process.argv[2];
const rows = readFileSync(RAW, "utf8")
  .split("\n")
  .filter((l) => l.trim().startsWith("{"))
  .map((l) => JSON.parse(l));

let vetoed = 0;
const vetoedRows = [];
for (const r of rows) {
  const blockers = stalenessBlockers({
    agreement: "SOLO",
    sources: ["elo"],
    bookPriced: false,
    generatedAt: r.gen,
    commenceTime: r.commence,
  });
  if (blockers.length > 0) {
    vetoed += 1;
    if (vetoedRows.length < 12) {
      const ageH = (Date.parse(r.commence) - Date.parse(r.gen)) / 3_600_000;
      vetoedRows.push(`${r.sel} | ${ageH.toFixed(2)}h before | ${blockers.join(",")} | published=${r.published}`);
    }
  }
}

console.log(`rows: ${rows.length}`);
console.log(`VETOED: ${vetoed}  (${((vetoed / rows.length) * 100).toFixed(1)}%)`);
console.log(`ALLOWED: ${rows.length - vetoed}`);
console.log("--- vetoed samples:");
for (const v of vetoedRows) console.log("  " + v);
