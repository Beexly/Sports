#!/usr/bin/env node
/**
 * scripts/factors/A8.mjs — C-372 numerical runner for docs/factors/A8.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A8.yaml):
 *   Brier of Boltzmann-calibrated p vs isotonic-calibrated p on identical
 *   PICKS-H1 rows. A transform of our own modelProb, not a new signal.
 *
 *   Boltzmann / temperature scaling: p_T = sigmoid(logit(p) / T), T fit by
 *   Brier minimisation on the train slice.
 *   Isotonic: PAVA of (modelProb → outcome) on the same train slice.
 *
 *   Train/validate: chronological split inside PICKS-H1 (first 40% train,
 *   last 60% validate) because a pre-holdout export does not exist. When
 *   only the committed synthetic fixture is available the run is BLOCKED
 *   (A2 precedent) — a fixture must never CANDIDATE/DEAD a pick factor.
 *
 * Uses packages/verifier holdout loader + brierScore. Re-execs under tsx.
 *
 * Usage:
 *   npx tsx scripts/factors/A8.mjs
 *   node scripts/factors/A8.mjs
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SELF), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A8.yaml");
const EVIDENCE_DIR = path.join(REPO_ROOT, "docs", "calibration-proposals", "evidence");
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "2026-09-15-a8-boltzmann-vs-isotonic.json");

const TRAIN_FRAC = 0.4;
const T_GRID = [];
for (let t = 0.4; t <= 3.01; t += 0.02) T_GRID.push(Math.round(t * 100) / 100);
const Z_95 = 1.959963984540054;
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;
const BOOTSTRAP_RESAMPLES = 1000;
const BOOTSTRAP_SEED = 20260915;

if (process.env["GSE_A8_TSX"] !== "1") {
  const r = spawnSync("npx", ["tsx", SELF], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, GSE_A8_TSX: "1" },
  });
  process.exit(r.status ?? 1);
}

const { loadPicksH1, selectPicksH1 } = await import("../../packages/verifier/src/holdout.ts");
const { brierScore, logit, sigmoid, pairedBootstrap, DEFAULT_BOOTSTRAP_RESAMPLES, DEFAULT_BOOTSTRAP_SEED } =
  await import("../../packages/verifier/src/stats.ts");

// ── helpers ─────────────────────────────────────────────────────────────────

function round(x, d = 5) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

function yamlQuote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function headSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function mean(a) {
  if (a.length === 0) return NaN;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

/** Boltzmann / temperature scaling of a probability. */
function boltzmann(p, T) {
  if (!(p > 0 && p < 1)) return null;
  if (!(T > 0)) return null;
  return sigmoid(logit(p) / T);
}

/** Fit T by Brier minimisation on train rows. */
function fitTemperature(rows) {
  let bestT = 1;
  let bestBrier = Infinity;
  for (const T of T_GRID) {
    let s = 0;
    let n = 0;
    for (const r of rows) {
      const p = boltzmann(r.modelProb, T);
      if (p == null) continue;
      s += brierScore(p, r.outcome);
      n += 1;
    }
    if (n === 0) continue;
    const b = s / n;
    if (b < bestBrier) {
      bestBrier = b;
      bestT = T;
    }
  }
  return { T: bestT, trainBrier: bestBrier };
}

/**
 * Isotonic regression (PAVA) mapping score → probability.
 * Returns a piecewise-constant interpolator over sorted unique scores.
 */
function fitIsotonic(rows) {
  const pts = rows
    .filter((r) => Number.isFinite(r.modelProb) && (r.outcome === 0 || r.outcome === 1))
    .map((r) => ({ x: r.modelProb, y: r.outcome }))
    .sort((a, b) => a.x - b.x);
  if (pts.length === 0) return null;
  // PAVA on y with unit weights
  const blocks = [];
  for (const p of pts) {
    let block = { sumY: p.y, n: 1, xs: [p.x] };
    while (blocks.length > 0) {
      const prev = blocks[blocks.length - 1];
      if (prev.sumY / prev.n <= block.sumY / block.n) break;
      block = {
        sumY: prev.sumY + block.sumY,
        n: prev.n + block.n,
        xs: prev.xs.concat(block.xs),
      };
      blocks.pop();
    }
    blocks.push(block);
  }
  // Build step function: for each block, value = mean(y), x-range = [min,max]
  const steps = blocks.map((b) => ({
    lo: Math.min(...b.xs),
    hi: Math.max(...b.xs),
    p: b.sumY / b.n,
  }));
  // Ensure monotone x coverage
  return function predict(x) {
    if (steps.length === 0) return 0.5;
    if (x <= steps[0].lo) return steps[0].p;
    for (const s of steps) {
      if (x >= s.lo && x <= s.hi) return s.p;
    }
    return steps[steps.length - 1].p;
  };
}

function scoreRows(rows, pred) {
  const losses = [];
  for (const r of rows) {
    const p = pred(r.modelProb);
    if (p == null || !Number.isFinite(p)) continue;
    losses.push(brierScore(p, r.outcome));
  }
  return losses;
}

function pairedDeltaCi(candLoss, mktLoss) {
  const n = Math.min(candLoss.length, mktLoss.length);
  if (n < 2) return { n, delta: NaN, ci: [NaN, NaN], mde: NaN };
  const diffs = [];
  for (let i = 0; i < n; i += 1) diffs.push(candLoss[i] - mktLoss[i]);
  const delta = mean(diffs);
  let ss = 0;
  for (const d of diffs) ss += (d - delta) ** 2;
  const se = Math.sqrt(ss / (n * (n - 1)));
  return {
    n,
    delta,
    ci: [delta - Z_95 * se, delta + Z_95 * se],
    mde: Z_SUM_80PCT * se,
  };
}

function writeYamlResult({ status, number, ci, n, mde, runSha, runAt, notes, blockedOn = null }) {
  const existing = readFileSync(YAML_PATH, "utf8");
  const lines = existing.split(/\r?\n/);
  const out = [];
  let inNotes = false;
  let notesWritten = false;
  for (const line of lines) {
    if (/^notes:/.test(line)) {
      inNotes = true;
      out.push("notes: >");
      out.push(`  ${notes}`);
      notesWritten = true;
      continue;
    }
    if (inNotes) {
      if (line.trim().length === 0) continue;
      if (/^\s/.test(line)) continue;
      inNotes = false;
    }
    if (/^status:/.test(line)) { out.push(`status: ${status}`); continue; }
    if (/^number:/.test(line)) { out.push(`number: ${number === null ? "null" : round(number, 5)}`); continue; }
    if (/^ci:/.test(line)) {
      out.push(ci === null ? "ci: null" : `ci: [${round(ci[0], 5)}, ${round(ci[1], 5)}]`);
      continue;
    }
    if (/^n:/.test(line)) { out.push(`n: ${n === null ? "null" : n}`); continue; }
    if (/^mde_80pct_power:/.test(line)) {
      out.push(`mde_80pct_power: ${mde === null || !Number.isFinite(mde) ? "null" : round(mde, 5)}`);
      continue;
    }
    if (/^run_sha:/.test(line)) { out.push(`run_sha: ${runSha === null ? "null" : yamlQuote(runSha)}`); continue; }
    if (/^run_at:/.test(line)) { out.push(`run_at: ${runAt === null ? "null" : yamlQuote(runAt)}`); continue; }
    if (/^blocked_on:/.test(line)) {
      out.push(`blocked_on: ${blockedOn === null ? "null" : yamlQuote(blockedOn)}`);
      continue;
    }
    out.push(line);
  }
  if (!notesWritten) {
    out.push("notes: >");
    out.push(`  ${notes}`);
  }
  writeFileSync(YAML_PATH, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[A8] run_at=${runAt} run_sha=${runSha}`);

  let loaded;
  try {
    loaded = loadPicksH1(REPO_ROOT);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A8] BLOCKED — picks-h1 export unreadable: ${msg}`);
    writeYamlResult({
      status: "BLOCKED",
      number: null, ci: null, n: null, mde: null,
      runSha, runAt,
      notes: `picks-h1 export unreadable: ${msg}`,
      blockedOn: `picks-h1 export unreadable: ${msg}`,
    });
    return 2;
  }

  const holdout = selectPicksH1(loaded.export.rows).filter(
    (r) => r.modelProb != null && r.modelProb > 0 && r.modelProb < 1 && r.marketFairProb > 0 && r.marketFairProb < 1,
  );
  console.log(
    `[A8] source=${loaded.path} fromFixture=${loaded.fromFixture} PICKS-H1 n=${holdout.length}`,
  );

  if (holdout.length < 20) {
    writeYamlResult({
      status: "BLOCKED",
      number: null, ci: null, n: null, mde: null,
      runSha, runAt,
      notes: `too few PICKS-H1 rows with modelProb (n=${holdout.length})`,
      blockedOn: `too few PICKS-H1 rows with modelProb (n=${holdout.length})`,
    });
    return 2;
  }

  // Chronological split (generatedAt already sorted by selectPicksH1 order of export)
  const sorted = holdout.slice().sort((a, b) => String(a.generatedAt).localeCompare(String(b.generatedAt)));
  const nTrain = Math.max(8, Math.floor(sorted.length * TRAIN_FRAC));
  const train = sorted.slice(0, nTrain);
  const validate = sorted.slice(nTrain);
  console.log(`[A8] chronological split: train=${train.length} validate=${validate.length}`);

  if (validate.length < 8) {
    writeYamlResult({
      status: "BLOCKED",
      number: null, ci: null, n: null, mde: null,
      runSha, runAt,
      notes: `validate slice too small (n=${validate.length})`,
      blockedOn: `validate slice too small (n=${validate.length})`,
    });
    return 2;
  }

  const { T, trainBrier } = fitTemperature(train);
  const isotonic = fitIsotonic(train);
  if (!isotonic) {
    writeYamlResult({
      status: "BLOCKED",
      number: null, ci: null, n: null, mde: null,
      runSha, runAt,
      notes: "isotonic fit failed on train slice",
      blockedOn: "isotonic fit failed on train slice",
    });
    return 2;
  }

  const boltzPred = (p) => boltzmann(p, T);
  const isoPred = (p) => isotonic(p);
  const rawPred = (p) => p;

  const boltzLoss = scoreRows(validate, boltzPred);
  const isoLoss = scoreRows(validate, isoPred);
  const rawLoss = scoreRows(validate, rawPred);
  const mktLoss = validate.map((r) => brierScore(r.marketFairProb, r.outcome));

  const bB = mean(boltzLoss);
  const bI = mean(isoLoss);
  const bR = mean(rawLoss);
  const bM = mean(mktLoss);
  // number = ΔBrier Boltzmann − isotonic (negative = Boltzmann better)
  const paired = pairedDeltaCi(boltzLoss, isoLoss);

  console.log(
    `[A8] T=${T} trainBrier=${round(trainBrier, 5)} | validate Brier boltz=${round(bB, 5)} ` +
      `iso=${round(bI, 5)} raw=${round(bR, 5)} market=${round(bM, 5)}`,
  );
  console.log(
    `[A8] ΔBrier boltz−iso=${round(paired.delta, 5)} CI[${round(paired.ci[0], 5)}, ${round(paired.ci[1], 5)}] n=${paired.n}`,
  );

  const boot = pairedBootstrap(
    { candidateLoss: boltzLoss, marketLoss: isoLoss },
    { resamples: DEFAULT_BOOTSTRAP_RESAMPLES, seed: DEFAULT_BOOTSTRAP_SEED },
  );
  console.log(`[A8] P(boltz better than iso)=${round(boot.pBetter, 3)}`);

  const evidence = {
    factorId: "A8",
    runAt,
    runSha,
    source: loaded.path,
    fromFixture: loaded.fromFixture,
    nPicksH1: holdout.length,
    nTrain: train.length,
    nValidate: validate.length,
    temperature: T,
    trainBrier: trainBrier,
    validate: {
      brierBoltzmann: bB,
      brierIsotonic: bI,
      brierRaw: bR,
      brierMarket: bM,
      deltaBoltzMinusIso: paired.delta,
      ci95: paired.ci,
      mde80: paired.mde,
      pBetterBoltzVsIso: boot.pBetter,
    },
  };
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  console.log(`[A8] evidence: ${EVIDENCE_PATH}`);

  // kill_line: validate-era Brier >= isotonic Brier on PICKS-H1 → DEAD
  // Fixture runs must not CANDIDATE/DEAD (A2 precedent).
  let status;
  if (loaded.fromFixture) {
    status = "BLOCKED";
  } else if (!Number.isFinite(bB) || !Number.isFinite(bI)) {
    status = "BLOCKED";
  } else if (bB >= bI) {
    status = "DEAD";
  } else {
    status = "CANDIDATE";
  }
  console.log(`[A8] kill_line check → status=${status}`);

  const notes = [
    "A transform, not a new signal. Scored vs isotonic on PICKS-H1 only.",
    "Boltzmann p_T = sigmoid(logit(p)/T); isotonic via PAVA. Both fit on a",
    `chronological train slice (first ${Math.round(TRAIN_FRAC * 100)}%); scored on the remainder.`,
    "C-372.",
    `C-372 run ${runAt.slice(0, 10)}: source=${loaded.fromFixture ? "FIXTURE" : "export"} n=${validate.length}.`,
    `T=${round(T, 3)} trainBrier=${round(trainBrier, 5)}.`,
    `Validate Brier: boltz=${round(bB, 5)} iso=${round(bI, 5)} raw=${round(bR, 5)} market=${round(bM, 5)}.`,
    `ΔBrier boltz−iso=${round(paired.delta, 5)} CI[${round(paired.ci[0], 5)},${round(paired.ci[1], 5)}] ` +
      `MDE80=${round(paired.mde, 5)} P(better)=${round(boot.pBetter, 3)}.`,
    loaded.fromFixture
      ? "HONEST LIMIT: committed synthetic fixture. Fixture must not CANDIDATE/DEAD A8 (A2 precedent). Real-export scorecard is the DoD."
      : "Real PICKS-H1 export used.",
  ].join(" ");

  writeYamlResult({
    status,
    number: loaded.fromFixture ? paired.delta : paired.delta,
    ci: paired.ci,
    n: validate.length,
    mde: paired.mde,
    runSha,
    runAt,
    notes,
    blockedOn: loaded.fromFixture
      ? "verifier/picks-h1.json real export (fixture smoke only; synthetic rows must not kill A8)"
      : null,
  });
  console.log(`[A8] wrote ${YAML_PATH}`);
  console.log(
    `[A8] RESULT status=${status} number=${round(paired.delta, 5)} ` +
      `ci=[${round(paired.ci[0], 5)}, ${round(paired.ci[1], 5)}] n=${validate.length}`,
  );
  return status === "BLOCKED" ? 2 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A8] fatal:", err);
    process.exit(1);
  },
);
