#!/usr/bin/env node
// measure-calibration.mjs — slice 10.
//
// Two different questions, and they do not have the same answer.
//
// 1. The engine's own calibration. The contract wants a settled vector of FAMILY
//    CONTRIBUTIONS plus outcomes, on seasons before 2025, at least 250 of them. The parts
//    registry holds signed values for exactly one game, 2026_03_LAC_BUF. There is no
//    historical per-game family-contribution vector anywhere on disk. So the engine's
//    calibration sample is n = 0, which is INSUFFICIENT_SAMPLE, and probability claims stay
//    disallowed. Nothing is fitted here for it.
//
// 2. The bridge premise probabilities. 285 out-of-sample probabilities exist for the 2025
//    holdout, produced by a model whose coefficients were fitted on 1999-2024. That clears
//    the 250-row bar, so ECE, Brier and log loss are computed and reported.
//
// Question 2 is a MEASUREMENT, not a product claim. These are not engine confidences, they
// are not publishable, and `probabilityClaimsAllowed` stays false. Reporting a number here
// does not move the calibration page.
//
// Drift is defined explicitly below rather than left to a reader's guess.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const DATA = join(ROOT, 'data', 'gse-dataset');

const MIN_SAMPLE = 250;
const MAX_ECE = 0.06;
const MAX_DRIFT = 0.10;

function rows(path) {
  return readFileSync(join(DATA, path), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

const games = new Map();
for (const g of rows('games.jsonl')) {
  if (typeof g.home_win === 'boolean') games.set(g.game_id, g);
}

const premises = rows('bridge-premises.jsonl');

const pairs = [];
let noOutcome = 0;
let outsideUnit = 0;
for (const p of premises) {
  const g = games.get(p.game_id);
  if (!g) { noOutcome += 1; continue; }
  if (!(p.probability > 0 && p.probability < 1)) { outsideUnit += 1; continue; }
  pairs.push({ p: p.probability, y: g.home_win ? 1 : 0 });
}

function brier(ps) { return ps.reduce((a, x) => a + (x.p - x.y) ** 2, 0) / ps.length; }

function logLoss(ps) {
  let total = 0;
  for (const x of ps) total += -(x.y * Math.log(x.p) + (1 - x.y) * Math.log(1 - x.p));
  return total / ps.length;
}

// Equal-width expected calibration error, 10 bins.
function ece(ps, bins = 10) {
  let total = 0;
  for (let b = 0; b < bins; b += 1) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    const inBin = ps.filter((x) => (b === bins - 1 ? x.p >= lo && x.p <= hi : x.p >= lo && x.p < hi));
    if (inBin.length === 0) continue;
    const meanP = inBin.reduce((a, x) => a + x.p, 0) / inBin.length;
    const actual = inBin.reduce((a, x) => a + x.y, 0) / inBin.length;
    total += (inBin.length / ps.length) * Math.abs(meanP - actual);
  }
  return total;
}

const n = pairs.length;

// Every metric below divides by n. With an empty population that is NaN, and writing NaN
// into the artifact would look like a measurement. No population means no measurement.
const insufficient = n < MIN_SAMPLE;
const empty = n === 0;

const metrics = empty
  ? null
  : {
      n,
      brier: brier(pairs),
      log_loss: logLoss(pairs),
      ece: ece(pairs),
      mean_predicted: pairs.reduce((a, x) => a + x.p, 0) / n,
      actual_home_win_rate: pairs.reduce((a, x) => a + x.y, 0) / n,
      // Drift = |mean predicted − realised rate|. Stated here so it is not a guess.
      drift: Math.abs(pairs.reduce((a, x) => a + x.p, 0) / n - pairs.reduce((a, x) => a + x.y, 0) / n),
    };

// Constant-0.5 reference, so the numbers mean something.
const reference = empty
  ? null
  : {
      brier: brier(pairs.map((x) => ({ p: 0.5, y: x.y }))),
      log_loss: Math.log(2),
      ece: ece(pairs.map((x) => ({ p: 0.5, y: x.y }))),
    };

const out = {
  generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  slice: 'measure-calibration',
  engine_family_calibration: {
    status: 'INSUFFICIENT_SAMPLE',
    n: 0,
    reason:
      'The contract wants a settled vector of family contributions plus outcomes on seasons before 2025. ' +
      'data/reasoning/parts-registry.jsonl holds signed values for exactly one game, 2026_03_LAC_BUF, and there is no ' +
      'historical per-game family-contribution vector on disk. The sample is 0, not 250.',
    probabilityClaimsAllowed: false,
    fit_run: false,
  },
  bridge_premise_calibration: {
    status: insufficient ? 'INSUFFICIENT_SAMPLE' : 'MEASURED',
    n,
    holdout_season: 2025,
    training_window: '1999-2024 (run-bridge.mjs excludes season >= 2025 from the fit)',
    source: 'data/gse-dataset/bridge-premises.jsonl',
    contract: { min_sample: MIN_SAMPLE, max_ece: MAX_ECE, max_drift: MAX_DRIFT },
    metrics,
    reference_constant_0_5: reference,
    passes_ece: empty ? null : metrics.ece <= MAX_ECE,
    passes_drift: empty ? null : metrics.drift <= MAX_DRIFT,
    note:
      'These are bridge premise probabilities, not engine confidences. They are not publishable and they do not ' +
      'move the calibration page. probabilityClaimsAllowed stays false for the product.',
    dropped_no_outcome: noOutcome,
    dropped_outside_unit_interval: outsideUnit,
  },
};

writeFileSync(join(ROOT, 'data', 'reasoning', 'calibration-holdout-2025.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
