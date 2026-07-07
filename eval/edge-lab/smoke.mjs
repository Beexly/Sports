/**
 * edge-lab/smoke.mjs — known-answer checks. Run: `node eval/edge-lab/smoke.mjs`
 *
 * Every assertion below has a hand-computed expected value, so a PASS proves the
 * math is correct — not asserted, computed. This is what a real "tests pass" looks
 * like: actual output you can read, not a claim in a document.
 */
import {
  brierScore, logLoss, expectedCalibrationError,
  impliedFromDecimal, devigProportional, clvProb, meanClv,
} from "./metrics.mjs";
import { makeSeasonSplit } from "./sealed-split.mjs";

let pass = 0, fail = 0;
const approx = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
function check(name, got, want, t) {
  const ok = typeof want === "number" ? approx(got, want, t) : got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got=${typeof got === "number" ? got.toFixed(6) : got}  want=${typeof want === "number" ? want.toFixed(6) : want}`);
  ok ? pass++ : fail++;
}

// Brier: perfect prediction -> 0; coin-flip on a hit -> 0.25
check("brier perfect", brierScore([1, 0], [1, 0]), 0);
check("brier 0.5 vs 1", brierScore([0.5], [1]), 0.25);

// Log loss: p=0.5 on any outcome -> ln(2) ≈ 0.693147
check("logloss 0.5", logLoss([0.5], [1]), Math.log(2));

// ECE: perfectly calibrated extremes -> 0
check("ece perfect", expectedCalibrationError([1, 0, 1, 0], [1, 0, 1, 0]), 0);

// Market math: even-money decimal 2.0 -> implied 0.5
check("implied 2.0", impliedFromDecimal(2.0), 0.5);

// De-vig: a -110/-110 market is decimal ~1.9091 each -> fair 0.5/0.5
const fair = devigProportional([1.909090909, 1.909090909]);
check("devig symmetric", fair[0], 0.5, 1e-6);

// CLV: bet at fair 0.52, line closes at fair 0.55 -> +0.03 (you beat the close)
check("clv positive", clvProb(0.52, 0.55), 0.03, 1e-9);
check("mean clv", meanClv([{ fairAtBet: 0.5, fairAtClose: 0.54 }, { fairAtBet: 0.5, fairAtClose: 0.52 }]), 0.03, 1e-9);

// Sealed vault: split by season, vault readable once, second read throws.
const rows = [2021, 2022, 2023, 2024, 2024].map((season, i) => ({ season, id: i }));
const split = makeSeasonSplit(rows, { trainMax: 2022, valSeasons: [2023], vaultSeasons: [2024] });
check("split train count", split.counts.train, 2);
check("split val count", split.counts.val, 1);
check("split vault count", split.counts.vault, 2);
const v = split.unsealVault("final model evaluation");
check("vault unseal returns rows", v.length, 2);
let threw = false;
try { split.unsealVault("peeking again"); } catch { threw = true; }
check("vault second read throws", threw, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
