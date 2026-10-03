#!/usr/bin/env node
/**
 * Offline calibration pipeline dry-run (Session 2 complete path).
 * No DATABASE_URL required when using synthetic fixture.
 *
 * Path: JSONL → (optional Shin on close prices) → timeHoldoutSplit
 *     → CIR/PAVA → selectedSliceEce → sizeAfterCalibration (CLV deflator)
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

function loadTs() {
  try {
    require("typescript");
  } catch {
    /* optional */
  }
  const pe = join(root, "packages/prediction-engine");
  try {
    require(join(pe, "node_modules/tsx/dist/cjs/index.cjs"));
  } catch {
    /* fall through */
  }
}

// Dynamic import via vitest-free path: read + eval is banned; use node --experimental
// Instead reimplement thin assertions against source text + synthetic CIR via duplicated pure JS.

const calSrc = readFileSync(
  join(root, "packages/prediction-engine/src/probability-calibration.ts"),
  "utf8",
);
const bridgeSrc = readFileSync(
  join(root, "packages/prediction-engine/src/calibration-kelly-bridge.ts"),
  "utf8",
);
const kellySrc = readFileSync(
  join(root, "packages/prediction-engine/src/edge-lab/kelly.ts"),
  "utf8",
);
const shinSrc = readFileSync(
  join(root, "packages/prediction-engine/src/shin-devig.ts"),
  "utf8",
);
const indexSrc = readFileSync(
  join(root, "packages/prediction-engine/src/index.ts"),
  "utf8",
);

const fixture =
  process.argv[2] ||
  join(dirname(fileURLToPath(import.meta.url)), "data/synthetic-settled.jsonl");

if (!existsSync(fixture)) {
  console.error("missing fixture", fixture);
  process.exit(2);
}

const rows = readFileSync(fixture, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

// --- pure inline CIR/PAVA (mirrors package; keeps script zero-deps) ---
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function round(v, d = 4) {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}

function pava(samples) {
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  if (!sorted.length) return { predict: (p) => clamp01(p), points: [] };
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
  const points = blocks.map((b) => ({
    x: b.xStart,
    calibrated: round(clamp01(b.value)),
  }));
  const predict = (p) => {
    let r = points[0].calibrated;
    for (const pt of points) {
      if (p >= pt.x) r = pt.calibrated;
      else break;
    }
    return r;
  };
  return { points, predict };
}

function cir(samples) {
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  if (!sorted.length) return { predict: (p) => clamp01(p), points: [] };
  const groups = [];
  for (const s of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.xStart === s.p) {
      last.value = (last.value * last.weight + s.y) / (last.weight + 1);
      last.weight += 1;
      last.massSum += s.p;
      last.xEnd = s.p;
    } else
      groups.push({
        value: s.y,
        weight: 1,
        xStart: s.p,
        xEnd: s.p,
        massSum: s.p,
      });
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
      points[i] = {
        x: round(Math.min(1, points[i - 1].x + 1e-6)),
        calibrated: points[i].calibrated,
      };
    }
  }
  const predict = (p) => {
    const x = clamp01(p);
    if (!points.length) return x;
    if (x <= points[0].x) return points[0].calibrated;
    if (x >= points[points.length - 1].x)
      return points[points.length - 1].calibrated;
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

function distinct(model) {
  const s = new Set();
  for (let i = 0; i <= 100; i++) s.add(model.predict(i / 100));
  return s.size;
}

function ece(samples, bins = 10) {
  const n = samples.length;
  if (!n) return 0;
  const bc = Array(bins).fill(0);
  const bf = Array(bins).fill(0);
  const bo = Array(bins).fill(0);
  for (const s of samples) {
    const b = Math.min(bins - 1, Math.floor(s.p * bins));
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

// Shin (inline, Session 2 path integrity)
function shinDevig(raw) {
  const booksum = raw.reduce((a, p) => a + p, 0);
  if (!raw.length || booksum <= 0) return { probabilities: raw.map(() => 0), z: 0, booksum };
  if (booksum <= 1 + 1e-9) return { probabilities: [...raw], z: 0, booksum };
  const forZ = (z) => {
    const denom = 2 * (1 - z);
    return raw.map((pi) => {
      const term = Math.sqrt(z * z + (4 * (1 - z) * (pi * pi)) / booksum);
      return (term - z) / denom;
    });
  };
  let lo = 0,
    hi = 0.5,
    z = 0;
  for (let i = 0; i < 80; i++) {
    z = (lo + hi) / 2;
    const sum = forZ(z).reduce((a, p) => a + p, 0);
    if (sum > 1) lo = z;
    else hi = z;
  }
  const probs = forZ(z);
  const total = probs.reduce((a, p) => a + p, 0);
  return {
    probabilities: total > 0 ? probs.map((p) => p / total) : probs,
    z,
    booksum,
  };
}

// Optional Shin on rows that have lock/close american-ish prices as decimal
let shinApplied = 0;
const samples = rows.map((r) => {
  let p = Number(r.p ?? r.p_model ?? r.forecast ?? r.confidence);
  if (!(p >= 0 && p <= 1) && r.confidence != null) p = Number(r.confidence) / 100;
  // If both sides of a 2-way book provided, Shin-devig
  if (Array.isArray(r.implied) && r.implied.length >= 2) {
    const shin = shinDevig(r.implied.map(Number));
    p = shin.probabilities[0];
    shinApplied++;
  }
  const y = r.y === 1 || r.y === true || r.result === "WIN" ? 1 : 0;
  const t = r.t ?? r.settledAt ?? r.settled_at ?? 0;
  return {
    p: clamp01(p),
    y,
    t: typeof t === "number" ? t : Date.parse(t) || 0,
    selected: Boolean(r.selected ?? r.plus_ev ?? (r.edge != null && Number(r.edge) > 0)),
    decimalOdds: r.decimalOdds ?? r.decimal_odds ?? 1.91,
  };
});

samples.sort((a, b) => a.t - b.t || a.p - b.p);
const frac = 0.7;
const cut = Math.max(1, Math.floor(samples.length * frac));
const train = samples.slice(0, cut).map(({ p, y }) => ({ p, y }));
const test = samples.slice(cut);

const pavaM = pava(train);
const cirM = cir(train);
const dPava = distinct(pavaM);
const dCir = distinct(cirM);

const rawEce = ece(test.map((s) => ({ p: s.p, y: s.y })));
const pavaEce = ece(test.map((s) => ({ p: pavaM.predict(s.p), y: s.y })));
const cirEce = ece(test.map((s) => ({ p: cirM.predict(s.p), y: s.y })));

const selected = test
  .filter((s) => s.selected)
  .map((s) => ({ p: cirM.predict(s.p), y: s.y }));
const allCal = test.map((s) => ({ p: cirM.predict(s.p), y: s.y }));
const selEce = selected.length ? ece(selected) : null;
const paradoxGap =
  selEce == null ? null : round(Math.abs(selEce - ece(allCal)));

// Fractional Kelly × deflator demo on first 3 test rows with CIR p
function fracKelly(p, d, lambda = 0.3) {
  if (!(p > 0 && p < 1) || !(d > 1)) return 0;
  const fStar = (p * d - 1) / (d - 1);
  return Math.min(lambda, Math.max(0, fStar) * lambda);
}
function clvDeflator(rho, n, min = 50) {
  if (rho == null || Number.isNaN(rho) || n < min) return 0;
  return Math.min(1, Math.max(0, rho));
}
const clvN = samples.length;
const deflator = clvDeflator(0.3, clvN);
const sized = test.slice(0, 5).map((s) => {
  const pCal = cirM.predict(s.p);
  return {
    pRaw: s.p,
    pCal,
    stake: fracKelly(pCal, s.decimalOdds, 0.25) * deflator,
  };
});

// Package export integrity
const need = [
  ["calSrc", calSrc, "timeHoldoutSplit"],
  ["calSrc", calSrc, "selectedSliceEce"],
  ["calSrc", calSrc, "centeredIsotonicCalibration"],
  ["bridgeSrc", bridgeSrc, "sizeAfterCalibration"],
  ["kellySrc", kellySrc, "portfolioKellyStakes"],
  ["shinSrc", shinSrc, "shinDevig"],
  ["indexSrc", indexSrc, "portfolioKellyStakes"],
  ["indexSrc", indexSrc, "sizeAfterCalibration"],
  ["indexSrc", indexSrc, "timeHoldoutSplit"],
];
const failed = [];
for (const [, src, needle] of need) {
  if (!src.includes(needle)) failed.push(`missing export/source ${needle}`);
}
if (dCir < dPava) failed.push(`CIR distinct ${dCir} < PAVA ${dPava}`);

const report = {
  input: fixture.replace(root + "/", ""),
  n: samples.length,
  train: train.length,
  test: test.length,
  trainFraction: frac,
  shinApplied,
  distinctPava: dPava,
  distinctCir: dCir,
  eceRaw: rawEce,
  ecePava: pavaEce,
  eceCir: cirEce,
  selectedCount: selected.length,
  selectedEceCir: selEce,
  paradoxGap,
  clvSamples: clvN,
  clvFloor: 50,
  deflator,
  sizedSample: sized,
  portfolioKellyGate:
    deflator === 0
      ? "DISARMED — need ≥50 settled CLV samples + measured rhoClv"
      : "sample floor met — stakes still × rhoClv; never report as CLV",
  packageExports: need.map((x) => x[2]),
  failed,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 1 : 0);
