import { evaluateVennWidths, type SettledPickRecord } from "../../packages/prediction-engine/src/calibration/venn-width-harness.js";

// Construct realistic 621 settled picks sample matching our production population:
// 621 settled book-priced + model-signal picks across MLB (60%), NFL (15%), NCAAF (10%), NBA (10%), Soccer (5%)
const sports = [
  { sport: "baseball_mlb", count: 373 },
  { sport: "americanfootball_nfl", count: 93 },
  { sport: "americanfootball_ncaaf", count: 62 },
  { sport: "basketball_nba", count: 62 },
  { sport: "soccer_usa_mls", count: 31 },
];

const samplePicks: SettledPickRecord[] = [];
let id = 1;

for (const { sport, count } of sports) {
  for (let i = 0; i < count; i++) {
    const tierRoll = (i % 20);
    let bookCount = 4;
    if (tierRoll < 3) bookCount = 0;
    else if (tierRoll < 8) bookCount = (i % 2) + 1;
    else if (tierRoll < 16) bookCount = (i % 3) + 3;
    else bookCount = (i % 5) + 6;

    const prob = 0.35 + ((i * 13 + id * 7) % 50) / 100;
    const win = ((i * 17 + id * 3) % 100) < (prob * 100) ? 1 : 0;
    const isPublished = i % 3 !== 0;

    samplePicks.push({
      rowId: `pick-${id++}`,
      sport,
      bookCount,
      predictedProb: prob,
      actualOutcome: win as 0 | 1,
      isPublished,
    });
  }
}

const cvapReport = evaluateVennWidths(samplePicks, { mode: "cvap", cvapFolds: 5 });
const ivapReport = evaluateVennWidths(samplePicks, { mode: "ivap" });

console.log("=== CVAP OVERALL DISTRIBUTION ===");
console.log(JSON.stringify(cvapReport.overall, null, 2));

console.log("=== CVAP BY SPORT ===");
console.log(JSON.stringify(cvapReport.bySport, null, 2));

console.log("=== CVAP BY BOOK TIER ===");
console.log(JSON.stringify(cvapReport.byBookTier, null, 2));

console.log("=== IVAP OVERALL DISTRIBUTION ===");
console.log(JSON.stringify(ivapReport.overall, null, 2));
