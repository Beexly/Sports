// Coverage simulation for bcaMeanCi / studentizedMeanCi on SPORTS-SHAPED per-bet returns.
// Run: cd C:\Users\Garrett\Sports && npx tsx handoff/claude/overnight-2026-07-01/coverage-sim-sports-shaped.mjs
import { bcaMeanCi, studentizedMeanCi } from 'file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/performance-ci.ts';

// ---------- seeded PRNG (mulberry32) for DATA generation ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- sports return model ----------
// Bet types: [winReturn, lossReturn=-1]
const BET_TYPES = [
  { name: 'fav -110', win: 0.909 },
  { name: 'dog +150', win: 1.5 },
  { name: 'longshot +400', win: 4.0 },
];

const SCENARIOS = [
  { name: 'S1 balanced-slight-edge', w: [0.6, 0.3, 0.1], p: [0.54, 0.42, 0.22] },
  { name: 'S2 longshot-heavy',       w: [0.3, 0.3, 0.4], p: [0.53, 0.41, 0.21] },
  { name: 'S3 break-even-ish',       w: [0.6, 0.3, 0.1], p: [0.524, 0.40, 0.20] },
];

function trueMean(sc) {
  let m = 0;
  for (let i = 0; i < 3; i++) {
    m += sc.w[i] * (sc.p[i] * BET_TYPES[i].win + (1 - sc.p[i]) * -1);
  }
  return m;
}

function drawReturn(sc, rng) {
  const u = rng();
  let idx = 0;
  if (u < sc.w[0]) idx = 0;
  else if (u < sc.w[0] + sc.w[1]) idx = 1;
  else idx = 2;
  return rng() < sc.p[idx] ? BET_TYPES[idx].win : -1;
}

// ---------- sim config ----------
const NS = [25, 50, 100];
const NSIM = 600;
const B = 1000;
const ALPHA = 0.05;
const DATA_SEED_BASE = 424242;

const rows = [];
const falseProfit = {}; // scenario -> { n -> { and: count, bcaOnly: count } }

const t0 = Date.now();
for (const sc of SCENARIOS) {
  const mu = trueMean(sc);
  console.log(`\n${sc.name}: TRUE mean = ${mu.toFixed(6)} units/bet  (w=[${sc.w}], p=[${sc.p}])`);
  for (const n of NS) {
    let bcaCover = 0;
    let studCover = 0;
    let bothLowGtZero = 0; // shipped clearsProfit AND-gate false-claim (in S3)
    let bcaLowGtZero = 0;  // old BCa-only gate
    let bcaNull = 0;
    let studNull = 0;
    for (let s = 0; s < NSIM; s++) {
      // independent data stream per (scenario, n, sim)
      const dataSeed = (DATA_SEED_BASE + SCENARIOS.indexOf(sc) * 1000003 + NS.indexOf(n) * 7919 + s) >>> 0;
      const rng = mulberry32(dataSeed);
      const data = new Array(n);
      for (let i = 0; i < n; i++) data[i] = drawReturn(sc, rng);

      const ciSeed = 5000 + s;
      const bca = bcaMeanCi(data, { alpha: ALPHA, resamples: B, seed: ciSeed });
      const stud = studentizedMeanCi(data, { alpha: ALPHA, resamples: B, seed: ciSeed });

      if (bca) {
        if (bca.low <= mu && mu <= bca.high) bcaCover++;
        if (bca.low > 0) bcaLowGtZero++;
      } else bcaNull++;
      if (stud) {
        if (stud.low <= mu && mu <= stud.high) studCover++;
      } else studNull++;
      if (bca && stud && bca.low > 0 && stud.low > 0) bothLowGtZero++;
    }
    const bcaPct = (100 * bcaCover) / NSIM;
    const studPct = (100 * studCover) / NSIM;
    rows.push({ scenario: sc.name, n, nsim: NSIM, trueMean: mu, bcaCoverage: bcaPct, studCoverage: studPct, bcaNull, studNull, andGateFalseProfit: (100 * bothLowGtZero) / NSIM, bcaOnlyFalseProfit: (100 * bcaLowGtZero) / NSIM });
    if (!falseProfit[sc.name]) falseProfit[sc.name] = {};
    falseProfit[sc.name][n] = { and: bothLowGtZero, bcaOnly: bcaLowGtZero };
    console.log(`  n=${String(n).padStart(3)}  BCa coverage=${bcaPct.toFixed(1)}%  studentized coverage=${studPct.toFixed(1)}%  (nulls: bca=${bcaNull}, stud=${studNull})  lower>0: AND=${((100 * bothLowGtZero) / NSIM).toFixed(1)}% BCa-only=${((100 * bcaLowGtZero) / NSIM).toFixed(1)}%`);
  }
}

console.log('\n================ SUMMARY TABLE (95% nominal, NSIM=' + NSIM + ', B=' + B + ') ================');
console.log('scenario                    n    trueMean   BCa-cov%  Stud-cov%  AND lower>0%  BCa-only lower>0%');
for (const r of rows) {
  console.log(
    `${r.scenario.padEnd(26)} ${String(r.n).padStart(4)}  ${r.trueMean.toFixed(5).padStart(9)}  ${r.bcaCoverage.toFixed(1).padStart(8)}  ${r.studCoverage.toFixed(1).padStart(9)}  ${r.andGateFalseProfit.toFixed(1).padStart(12)}  ${r.bcaOnlyFalseProfit.toFixed(1).padStart(17)}`,
  );
}

console.log('\n---- S3 (break-even-ish) FALSE-PROFIT gate comparison ----');
const s3 = SCENARIOS[2];
console.log(`S3 true mean = ${trueMean(s3).toFixed(6)} (near zero; any lower-bound>0 claim is a false profit claim in expectation)`);
for (const n of NS) {
  const f = falseProfit[s3.name][n];
  console.log(
    `  n=${String(n).padStart(3)}: AND-gate (shipped) false-claim = ${f.and}/${NSIM} = ${((100 * f.and) / NSIM).toFixed(2)}%   BCa-only (old) = ${f.bcaOnly}/${NSIM} = ${((100 * f.bcaOnly) / NSIM).toFixed(2)}%   delta = ${(((f.bcaOnly - f.and) * 100) / NSIM).toFixed(2)} pts`,
  );
}

console.log(`\nRuntime: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
