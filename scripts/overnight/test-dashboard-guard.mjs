// Self-test for the dashboard prohibition guard.
//
// A guard that silently misses half the phrasings it exists to catch is worse
// than no guard, because it buys false assurance. This asserts BOTH directions:
// the forbidden phrasings are caught, and the legitimate calibration statistics
// this dashboard is required to report are not false-positived.
//
// Run: node scripts/overnight/test-dashboard-guard.mjs

const NOUN = String.raw`(?:hit[- ]rate|win(?:ning)?[- ]rate|accuracy|pick[- ]rate|success[- ]rate)`;
const NUM = String.raw`\d+(?:\.\d+)?\s*%?`;
const BANNED = [
  new RegExp(`${NUM}\\s*${NOUN}`, "i"),
  new RegExp(`${NOUN}\\s*(?:of|is|was|at|:)?\\s*${NUM}`, "i"),
  new RegExp(String.raw`\b(?:hits|hit|beats|beat|wins|win)\s+\d+(?:\.\d+)?\s*%`, "i"),
  new RegExp(String.raw`\d+(?:\.\d+)?\s*units?\b`, "i"),
  new RegExp(String.raw`${NUM}\s*ROI\b`, "i"),
  new RegExp(String.raw`\bprojected\s+(?:hit|win|accuracy)`, "i"),
];

const MUST_CATCH = [
  "the engine hits 80%",
  "win rate 62%",
  "accuracy of 71%",
  "the model has an 80% hit rate",
  "5.2 units staked",
  "12% ROI",
  "projected hit rate of 78%",
  "pick rate 41%",
  "success rate 0.66",
];

const MUST_PASS = [
  "95% CI on that skill",
  "ECE (10 bins) | 0.051868",
  "no hit-rate projection, no units, no public win rate",
  "255 target line",
  "| 255.0 | 250.000 | `39e5a5ce1ec35a83` |",
  "Brier skill vs base rate | 0.026190",
  "matchRate 0.6613",
  "8 LIVE parts",
  "No push, on any branch.",
];

let failures = 0;

for (const s of MUST_CATCH) {
  const caught = BANNED.some((re) => re.test(s));
  if (!caught) failures += 1;
  console.log(`${caught ? "CAUGHT " : "MISSED!"}  ${JSON.stringify(s)}`);
}

for (const s of MUST_PASS) {
  const caught = BANNED.some((re) => re.test(s));
  if (caught) failures += 1;
  console.log(`${caught ? "FALSE+" : "ok     "}  ${JSON.stringify(s)}`);
}

console.log(
  failures === 0
    ? `\nPASS: ${MUST_CATCH.length} forbidden phrasings caught, ${MUST_PASS.length} legitimate statements allowed.`
    : `\nFAIL: ${failures} problem(s). A guard this leaky is worse than none.`,
);
process.exit(failures === 0 ? 0 : 1);
