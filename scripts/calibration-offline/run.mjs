#!/usr/bin/env node
/**
 * Offline calibration pipeline dry-run (no DATABASE_URL, no live scoring).
 *
 * Demonstrates / guards the R&D path:
 *   JSONL settled samples → time hold-out → PAVA vs CIR → selected-slice ECE
 *   → CLV deflator gate message (portfolio Kelly still zero until ~50 CLV samples
 *   with real correlation — we only report the gate here without inventing ρ).
 *
 * Exit 0 if invariants hold. Cost $0.
 *
 * Usage:
 *   node scripts/calibration-offline/run.mjs
 *   node scripts/calibration-offline/run.mjs --in path/to.jsonl
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const inPath = arg(
  "--in",
  join(__dirname, "data/synthetic-settled.jsonl"),
);

if (!existsSync(inPath)) {
  console.error("calibration-offline: input missing", inPath);
  process.exit(2);
}

// Load prediction-engine pure modules via ts transpile is heavy; reimplement
// minimal PAVA/CIR/ECE here matching package semantics for the offline harness,
// and assert package source still exports the live symbols (file_contains style).
const calSrc = readFileSync(
  join(root, "packages/prediction-engine/src/probability-calibration.ts"),
  "utf8",
);
for (const sym of [
  "centeredIsotonicCalibration",
  "timeHoldoutSplit",
  "selectedSliceEce",
  "countDistinctPredictions",
]) {
  if (!calSrc.includes(`export function ${sym}`)) {
    console.error(`missing export function ${sym}`);
    process.exit(1);
  }
}

const kellySrc = readFileSync(
  join(root, "packages/prediction-engine/src/edge-lab/kelly.ts"),
  "utf8",
);
if (!kellySrc.includes("portfolioKellyStakes") || !kellySrc.includes("clvDeflator")) {
  console.error("portfolio Kelly / clvDeflator missing from edge-lab/kelly.ts");
  process.exit(1);
}

// ---- pure math mirror (must stay aligned with package; tests own correctness) ----
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function round(v, d = 4) {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}

function isotonic(samples) {
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  if (!sorted.length) return { points: [], predict: (p) => clamp01(p) };
  const groups = [];
  for (const s of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.xStart === s.p) {
      last.value = (last.value * last.weight + s.y) / (last.weight + 1);
      last.weight += 1;
    } else groups.push({ value: s.y, weight: 1, xStart: s.p });
  }
  const blocks = [];
  for (const g of groups) {
    let block = { ...g };
    while (blocks.length && blocks[blocks.length - 1].value > block.value) {
      const prev = blocks.pop();
      const w = prev.weight + block.weight;
      block = {
        value: (prev.value * prev.weight + block.value * block.weight) / w,
        weight: w,
        xStart: prev.xStart,
      };
    }
    blocks.push(block);
  }
  const points = blocks.map((b) => ({ x: b.xStart, calibrated: round(clamp01(b.value)) }));
  const predict = (p) => {
    let result = points[0].calibrated;
    for (const pt of points) {
      if (p >= pt.x) result = pt.calibrated;
      else break;
    }
    return result;
  };
  return { points, predict };
}

function cir(samples) {
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  if (!sorted.length) return { points: [], predict: (p) => clamp01(p) };
  const groups = [];
  for (const s of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.xStart === s.p) {
      last.value = (last.value * last.weight + s.y) / (last.weight + 1);
      last.weight += 1;
      last.massSum += s.p;
      last.xEnd = s.p;
    } else {
      groups.push({ value: s.y, weight: 1, xStart: s.p, xEnd: s.p, massSum: s.p });
    }
  }
  const blocks = [];
  for (const g of groups) {
    let block = { ...g };
    while (blocks.length && blocks[blocks.length - 1].value > block.value) {
      const prev = blocks.pop();
      const w = prev.weight + block.weight;
      block = {
        value: (prev.value * prev.weight + block.value * block.weight) / w,
        weight: w,
        xStart: prev.xStart,
        xEnd: block.xEnd,
        massSum: prev.massSum + block.massSum,
      };
    }
    blocks.push(block);
  }
  const points = blocks.map((b) => ({
    x: round(clamp01(b.massSum / b.weight)),
    calibrated: round(clamp01(b.value)),
  }));
  for (let i = 1; i < points.length; i++) {
    if (points[i].x <= points[i - 1].x) {
      points[i] = { x: round(Math.min(1, points[i - 1].x + 1e-6)), calibrated: points[i].calibrated };
    }
  }
  const predict = (p) => {
    const x = clamp01(p);
    if (!points.length) return x;
    if (x <= points[0].x) return points[0].calibrated;
    if (x >= points[points.length - 1].x) return points[points.length - 1].calibrated;
    for (let i = 1; i < points.length; i++) {
      const lo = points[i - 1];
      const hi = points[i];
      if (x <= hi.x) {
        const t = (x - lo.x) / (hi.x - lo.x || 1e-12);
        return round(clamp01(lo.calibrated + t * (hi.calibrated - lo.calibrated)));
      }
    }
    return points[points.length - 1].calibrated;
  };
  return { points, predict };
}

function ece(samples, bins = 10) {
  const n = samples.length;
  if (!n) return 0;
  const bc = new Array(bins).fill(0);
  const bf = new Array(bins).fill(0);
  const bo = new Array(bins).fill(0);
  for (const s of samples) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(s.p * bins)));
    bc[b]++;
    bf[b] += s.p;
    bo[b] += s.y;
  }
  let e = 0;
  for (let b = 0; b < bins; b++) {
    if (!bc[b]) continue;
    e += (bc[b] / n) * Math.abs(bf[b] / bc[b] - bo[b] / bc[b]);
  }
  return round(e);
}

function distinct(model) {
  const grid = Array.from({ length: 101 }, (_, i) => i / 100);
  return new Set(grid.map((p) => model.predict(p))).size;
}

// Load JSONL
const lines = readFileSync(inPath, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const stamped = lines.map((r) => ({
  p: Number(r.p_model),
  y: r.y === 1 ? 1 : 0,
  t: Number(r.settledAt),
  selected: Boolean(r.selected),
  decimalOdds: Number(r.decimalOdds),
}));

const sorted = [...stamped].sort((a, b) => a.t - b.t);
const frac = 0.7;
const cut = Math.max(1, Math.min(sorted.length - 1, Math.floor(sorted.length * frac)));
const train = sorted.slice(0, cut).map(({ p, y }) => ({ p, y }));
const test = sorted.slice(cut);

const pava = isotonic(train);
const cirM = cir(train);
const testRaw = test.map(({ p, y }) => ({ p, y }));
const testPava = test.map((s) => ({ p: pava.predict(s.p), y: s.y }));
const testCir = test.map((s) => ({ p: cirM.predict(s.p), y: s.y }));
const selected = test.map((s) => s.selected);
const selCir = testCir.filter((_, i) => selected[i]);
const fullEce = ece(testCir);
const selEce = ece(selCir);
const dPava = distinct(pava);
const dCir = distinct(cirM);

// CLV deflator gate: without real ρ + n>=50, stakes must be zero
const settledClvCount = lines.filter((r) => r.clvValue != null).length;
const clvFloor = 50;
const deflatorActive = settledClvCount >= clvFloor; // correlation still required live

const fails = [];
if (dCir < dPava) fails.push(`CIR distinct ${dCir} < PAVA ${dPava}`);
if (!(fullEce >= 0 && fullEce <= 1)) fails.push(`bad ECE ${fullEce}`);
if (train.length < 10) fails.push("train too small");
if (test.length < 5) fails.push("test too small");

const report = {
  input: inPath.replace(root + "/", ""),
  n: lines.length,
  train: train.length,
  test: test.length,
  trainFraction: frac,
  distinctPava: dPava,
  distinctCir: dCir,
  eceRaw: ece(testRaw),
  ecePava: ece(testPava),
  eceCir: fullEce,
  selectedCount: selected.filter(Boolean).length,
  selectedEceCir: selEce,
  paradoxGap: round(selEce - fullEce),
  clvSamples: settledClvCount,
  clvFloor,
  // Live portfolioKellyStakes multiplies by clvDeflator; without earned ρ keep stakes 0.
  portfolioKellyGate: deflatorActive
    ? "sample floor met — still need measured rhoClv before non-zero stakes"
    : "DISARMED: clvDeflator → 0 until ~50 settled CLV samples with measured ρ",
  packageExports: ["timeHoldoutSplit", "selectedSliceEce", "centeredIsotonicCalibration"],
  failed: fails,
};

console.log(JSON.stringify(report, null, 2));
if (fails.length) process.exit(1);
process.exit(0);
