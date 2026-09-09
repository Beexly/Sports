/**
 * Parity vector generator.
 *
 * Transpiles the REAL GSE production calibration TypeScript with the repo's own
 * esbuild and runs it over a fixed set of adversarial fixtures, writing both the
 * inputs and the outputs to vectors.json.
 *
 * The Python port in gsecal/metrics.py is then asserted against those outputs by
 * tests/test_metrics_parity.py. This is the difference between "I read the TS
 * carefully" and "the port provably agrees with the code that ships".
 *
 * All three source files are dependency-free (no imports), which is why they can
 * be transpiled and evaluated in isolation.
 *
 *   node gse-calibration-lab/parity/gen_vectors.mjs
 *
 * Read-only with respect to the TypeScript sources. Writes only vectors.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

const SOURCES = {
  ece: "apps/web/lib/calibration/ece.ts",
  brier: "apps/web/lib/calibration/brier.ts",
  decomposition: "packages/prediction-engine/src/probability-calibration.ts",
};

/**
 * Transpile a dependency-free TS module and evaluate it to its exports.
 *
 * SECURITY: this dynamically executes code (esbuild output imported from a
 * data: URI) — an eval-equivalent, and static analysis is right to flag it. It
 * is inherent to the design: proving parity REQUIRES running the real
 * production implementation, and a hand-copied JS transcription would prove
 * nothing about the TypeScript that actually ships.
 *
 * What is NOT inherent is letting it run anything. Two constraints below:
 *   1. relPath must be one of the four allow-listed production sources.
 *   2. the resolved absolute path must stay inside the repo.
 * Together those mean this can only ever execute checked-in repo source that a
 * reviewer has already seen, never an arbitrary or attacker-supplied file.
 *
 * This is a developer-only harness. It is not imported by any shipped code, is
 * not on any request path, and takes no external input.
 */
const ALLOWED_SOURCES = new Set(Object.values(SOURCES));

async function loadTs(relPath) {
  if (!ALLOWED_SOURCES.has(relPath)) {
    throw new Error(
      `refusing to transpile-and-execute ${relPath}: not in the allow-list ` +
        `(${[...ALLOWED_SOURCES].join(", ")})`,
    );
  }
  const abs = resolve(REPO, relPath);
  if (!abs.startsWith(REPO + "/")) {
    throw new Error(`refusing to load ${abs}: resolves outside the repo`);
  }
  const source = readFileSync(abs, "utf8");
  const { code } = transformSync(source, {
    loader: "ts",
    format: "esm",
    target: "es2022",
  });
  const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  return import(url);
}

/**
 * Deterministic PRNG (mulberry32). Fixtures must be byte-identical on every run,
 * otherwise a regenerated vectors.json produces a spurious parity diff.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomFixture(seed, n) {
  const rnd = mulberry32(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = rnd();
    out.push({ p, y: rnd() < p ? 1 : 0 });
  }
  return out;
}

/** Every fixture is abstract (p, y) mathematics. No teams, no odds, no sports. */
const fixtures = {
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
    y: i % 2,
  })),
  // Floating point that does not land cleanly on a boundary.
  float_edges: [
    { p: 0.1 + 0.2, y: 1 },
    { p: 0.30000000000000004, y: 0 },
    { p: 0.7000000000000001, y: 1 },
    { p: 0.29999999999999993, y: 0 },
  ],
  perfectly_calibrated: [
    ...Array.from({ length: 10 }, () => ({ p: 0.5, y: 1 })),
    ...Array.from({ length: 10 }, () => ({ p: 0.5, y: 0 })),
  ],
  all_wins: Array.from({ length: 25 }, (_, i) => ({ p: (i % 10) / 10 + 0.05, y: 1 })),
  all_losses: Array.from({ length: 25 }, (_, i) => ({ p: (i % 10) / 10 + 0.05, y: 0 })),
  overconfident: Array.from({ length: 60 }, (_, i) => ({ p: 0.9, y: i % 5 === 0 ? 1 : 0 })),
  underconfident: Array.from({ length: 60 }, (_, i) => ({ p: 0.55, y: i % 5 === 0 ? 0 : 1 })),
  random_small: randomFixture(1, 17),
  random_mid: randomFixture(2, 143),
  random_large: randomFixture(3, 901),
};

const ece = await loadTs(SOURCES.ece);
const brier = await loadTs(SOURCES.brier);
const decomp = await loadTs(SOURCES.decomposition);

const BIN_COUNTS = [5, 10, 20];

const cases = Object.entries(fixtures).map(([name, samples]) => {
  const pySamples = samples.map((s) => ({ p: s.p, y: s.y }));
  // ece.ts / brier.ts take { probability, outcome }; the engine takes { p, y }.
  const tsSamples = samples.map((s) => ({ probability: s.p, outcome: s.y }));

  const perBins = {};
  for (const bins of BIN_COUNTS) {
    perBins[bins] = {
      ece: ece.expectedCalibrationError(tsSamples, bins),
      mce: ece.maximumCalibrationError(tsSamples, bins),
      buckets: ece.confidenceBuckets(tsSamples, bins).map((b) => ({
        lower: b.lower,
        upper: b.upper,
        count: b.count,
        avgConfidence: b.avgConfidence,
        accuracy: b.accuracy,
        gap: b.gap,
      })),
      decomposition: decomp.brierDecomposition(pySamples, bins),
    };
  }

  return {
    name,
    samples: pySamples,
    brier: brier.brierScore(tsSamples),
    perBins,
  };
});

const payload = {
  generatedBy: "gse-calibration-lab/parity/gen_vectors.mjs",
  sources: SOURCES,
  note:
    "Outputs produced by transpiling and executing the production TypeScript. " +
    "Fixtures are abstract (p, y) mathematics — not picks, odds, or product data.",
  binCounts: BIN_COUNTS,
  cases,
};

const outPath = resolve(HERE, "vectors.json");
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`wrote ${outPath}`);
console.log(`cases: ${cases.length}, bin counts: ${BIN_COUNTS.join(", ")}`);
