/**
 * Parity vector generator.
 *
 * Runs the REAL GSE production calibration TypeScript over a fixed set of
 * adversarial fixtures and writes both inputs and outputs to vectors.json. The
 * Python port in gsecal/metrics.py is asserted against those outputs by
 * tests/test_metrics_parity.py — the difference between "I read the TS
 * carefully" and "the port provably agrees with the code that ships".
 *
 *   npx tsx gse-calibration-lab/parity/gen_vectors.ts
 *
 * WHY STATIC IMPORTS. An earlier version of this file transpiled the sources
 * with esbuild and then evaluated the generated source through a dynamic import
 * of an inline data URI — an eval-equivalent, correctly flagged by static
 * analysis, and guarded with an allow-list. tsx imports TypeScript directly, so none of that is needed:
 * the dependencies below are ordinary static imports a reviewer and a scanner
 * can both follow, there is no generated code, and no allow-list to keep in
 * sync. It also removes a transpilation step that could in principle differ
 * from what ships.
 *
 * Read-only with respect to the production sources. Writes only vectors.json.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  confidenceBuckets,
  expectedCalibrationError,
  maximumCalibrationError,
} from "../../apps/web/lib/calibration/ece.ts";
import { brierScore } from "../../apps/web/lib/calibration/brier.ts";
import { brierDecomposition } from "../../packages/prediction-engine/src/probability-calibration.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const SOURCES = {
  ece: "apps/web/lib/calibration/ece.ts",
  brier: "apps/web/lib/calibration/brier.ts",
  decomposition: "packages/prediction-engine/src/probability-calibration.ts",
};

/**
 * Deterministic PRNG (mulberry32). Fixtures must be byte-identical on every run,
 * otherwise a regenerated vectors.json produces a spurious parity diff.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomFixture(seed: number, n: number) {
  const rnd = mulberry32(seed);
  const out: { p: number; y: 0 | 1 }[] = [];
  for (let i = 0; i < n; i++) {
    const p = rnd();
    out.push({ p, y: rnd() < p ? 1 : 0 });
  }
  return out;
}

/** Every fixture is abstract (p, y) mathematics. No teams, no odds, no sports. */
const fixtures: Record<string, { p: number; y: 0 | 1 }[]> = {
  empty: [],
  single_win: [{ p: 0.7, y: 1 }],
  single_loss: [{ p: 0.7, y: 0 }],
  all_zero_prob: [
    { p: 0, y: 0 },
    { p: 0, y: 1 },
    { p: 0, y: 0 },
  ],
  // p === 1 must land in the LAST bin, not a phantom 11th bin.
  all_one_prob: [
    { p: 1, y: 1 },
    { p: 1, y: 1 },
    { p: 1, y: 0 },
  ],
  // Exact bin boundaries: the [lower, upper) vs [lower, upper] asymmetry.
  bin_boundaries: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((p, i) => ({
    p,
    y: (i % 2) as 0 | 1,
  })),
  // Floating point that does not land cleanly on a boundary.
  float_edges: [
    { p: 0.1 + 0.2, y: 1 },
    { p: 0.30000000000000004, y: 0 },
    { p: 0.7000000000000001, y: 1 },
    { p: 0.29999999999999993, y: 0 },
  ],
  perfectly_calibrated: [
    ...Array.from({ length: 10 }, () => ({ p: 0.5, y: 1 as const })),
    ...Array.from({ length: 10 }, () => ({ p: 0.5, y: 0 as const })),
  ],
  all_wins: Array.from({ length: 25 }, (_, i) => ({ p: (i % 10) / 10 + 0.05, y: 1 as const })),
  all_losses: Array.from({ length: 25 }, (_, i) => ({ p: (i % 10) / 10 + 0.05, y: 0 as const })),
  overconfident: Array.from({ length: 60 }, (_, i) => ({
    p: 0.9,
    y: (i % 5 === 0 ? 1 : 0) as 0 | 1,
  })),
  underconfident: Array.from({ length: 60 }, (_, i) => ({
    p: 0.55,
    y: (i % 5 === 0 ? 0 : 1) as 0 | 1,
  })),
  random_small: randomFixture(1, 17),
  random_mid: randomFixture(2, 143),
  random_large: randomFixture(3, 901),
};

const BIN_COUNTS = [5, 10, 20];

const cases = Object.entries(fixtures).map(([name, samples]) => {
  const pySamples = samples.map((s) => ({ p: s.p, y: s.y }));
  // ece.ts / brier.ts take { probability, outcome }; the engine takes { p, y }.
  const tsSamples = samples.map((s) => ({ probability: s.p, outcome: s.y }));

  const perBins: Record<number, unknown> = {};
  for (const bins of BIN_COUNTS) {
    perBins[bins] = {
      ece: expectedCalibrationError(tsSamples, bins),
      mce: maximumCalibrationError(tsSamples, bins),
      buckets: confidenceBuckets(tsSamples, bins).map((b) => ({
        lower: b.lower,
        upper: b.upper,
        count: b.count,
        avgConfidence: b.avgConfidence,
        accuracy: b.accuracy,
        gap: b.gap,
      })),
      decomposition: brierDecomposition(pySamples, bins),
    };
  }

  return { name, samples: pySamples, brier: brierScore(tsSamples), perBins };
});

const payload = {
  generatedBy: "gse-calibration-lab/parity/gen_vectors.ts",
  sources: SOURCES,
  note:
    "Outputs produced by importing and executing the production TypeScript directly (tsx). " +
    "Fixtures are abstract (p, y) mathematics — not picks, odds, or product data.",
  binCounts: BIN_COUNTS,
  cases,
};

const outPath = resolve(HERE, "vectors.json");
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`wrote ${outPath}`);
console.log(`cases: ${cases.length}, bin counts: ${BIN_COUNTS.join(", ")}`);
