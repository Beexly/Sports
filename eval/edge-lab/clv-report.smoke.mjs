/**
 * clv-report.smoke.mjs — known-answer checks for the CLV aggregation.
 * Run: `node eval/edge-lab/clv-report.smoke.mjs`
 */
import { clvReport } from "./clv-report.mjs";

let pass = 0, fail = 0;
const approx = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
function check(name, got, want, t) {
  const ok = typeof want === "number" ? approx(got, want, t) : got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got=${JSON.stringify(got)}  want=${JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}

// Three settled 2024 picks: CLV +0.02, +0.04, -0.03 -> mean +0.01; 2 of 3 beat close.
const picks = [
  { season: "2024", result: "WIN",  clvValue: 0.02, clvVerdict: "BEAT_CLOSE",   modelProb: 0.6 },
  { season: "2024", result: "LOSS", clvValue: 0.04, clvVerdict: "BEAT_CLOSE",   modelProb: 0.55 },
  { season: "2024", result: "WIN",  clvValue: -0.03, clvVerdict: "LOST_TO_CLOSE", modelProb: 0.7 },
  { season: "2024", result: "PENDING", clvValue: null, clvVerdict: null }, // excluded (unsettled)
];
const r = clvReport(picks);

check("overall n (settled+graded only)", r.overall.n, 3);
check("overall mean CLV", r.overall.meanClv, 0.01, 1e-9);
check("beat-close rate 2/3", r.overall.beatCloseRate, 2 / 3, 1e-9);
check("sample flagged INSUFFICIENT", r.overall.sampleAdequacy.startsWith("INSUFFICIENT"), true);
check("calibration computed (has modelProb)", r.calibration.n, 3);

// No modelProb anywhere -> calibration must REFUSE to compute, not fabricate.
const noProb = [{ season: "2024", result: "WIN", clvValue: 0.01, clvVerdict: "BEAT_CLOSE", modelProb: null }];
const r2 = clvReport(noProb);
check("no-modelProb -> brier not computed", r2.calibration.n, 0);
check("no-modelProb -> honest note present", typeof r2.calibration.note === "string", true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
