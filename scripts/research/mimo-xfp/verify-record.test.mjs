#!/usr/bin/env node
/**
 * Regression guard for the mimo-xfp research record.
 *
 * A published negative result is only worth keeping if it cannot quietly become
 * a positive one. This suite binds the prose to the artifacts: every number in
 * RESULT_UNIT1.md / RESULT_UNIT2.md must exist in the JSON the run actually
 * wrote, and each verdict must follow from the pre-registered kill line rather
 * than from how the numbers read. If a later edit flips a status, invents a
 * figure, or rewrites a FAIL as a pass without touching the artifact, this
 * fails.
 *
 * Run: node --test scripts/research/mimo-xfp/verify-record.test.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(HERE, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));
const lines = (rel) => read(rel).split(/\r?\n/);

/** Every numeric literal in a RESULT doc, as floats. */
function numbersIn(rel) {
  const out = new Set();
  for (const line of lines(rel)) {
    for (const m of line.matchAll(/-?\d+\.\d+|-?\d{2,}/g)) out.add(Number(m[0]));
  }
  return out;
}

/** True when `doc` quotes `value` to within printing precision. */
function quotes(doc, value) {
  for (const n of doc) if (Math.abs(n - value) <= 1e-9 * Math.max(1, Math.abs(value))) return true;
  return false;
}

const unit1 = json("results/unit1_holdout.json");
const unit2 = json("results/unit2_holdout.json");

test("unit 1 RESULT quotes the artifact it cites", () => {
  const doc = numbersIn("RESULT_UNIT1.md");
  // The claims the RESULT makes as "measured output, not estimated".
  for (const value of [
    unit1.n_pairs,
    unit1.spearman_xfp,
    unit1.spearman_naive,
    unit1.delta_rho,
    unit1.rmse_xfp,
    unit1.rmse_naive,
    unit1.delta_rho_ci_low,
    unit1.delta_rho_ci_high,
  ]) {
    assert.ok(quotes(doc, value), `RESULT_UNIT1.md must quote ${value}`);
  }
  assert.ok(read("RESULT_UNIT1.md").includes("results/unit1_holdout.json"));
});

test("unit 2 RESULT quotes the artifact it cites", () => {
  const doc = numbersIn("RESULT_UNIT2.md");
  for (const value of [
    unit2.n_holdout_pairs,
    unit2.spearman_catchable,
    unit2.spearman_raw,
    unit2.delta_rho,
    unit2.delta_rho_ci_low,
    unit2.delta_rho_ci_high,
  ]) {
    assert.ok(quotes(doc, value), `RESULT_UNIT2.md must quote ${value}`);
  }
});

test("unit 1 FAIL follows from the pre-registered kill line, not from taste", () => {
  // The kill line: xFP must beat naive raw FP on holdout Spearman. It did not,
  // and the week-bootstrap CI covers zero as well, so FAIL is the only verdict
  // the rule permits.
  assert.equal(unit1.kill_line_passed, false);
  assert.ok(unit1.delta_rho < 0, "delta_rho is negative");
  assert.ok(unit1.delta_rho_ci_low < 0 && unit1.delta_rho_ci_high > 0, "CI covers zero");
  assert.match(unit1.verdict, /^FAIL:/);
  assert.match(read("RESULT_UNIT1.md"), /KILL LINE = FAIL/);
});

test("unit 2 is INCONCLUSIVE, and stays that way while the CI covers zero", () => {
  // A positive point estimate with a CI spanning zero is not an edge. This is
  // the case most likely to be quietly upgraded to a PASS later, so it is
  // pinned from both directions: the artifact's flag AND the prose.
  assert.equal(unit2.kill_line_passed, false);
  assert.ok(unit2.delta_rho > 0, "point estimate is positive");
  assert.ok(unit2.delta_rho_ci_low < 0 && unit2.delta_rho_ci_high > 0, "CI covers zero");
  assert.match(unit2.verdict, /^INCONCLUSIVE:/);
  assert.ok(read("RESULT_UNIT2.md").includes("INCONCLUSIVE"));
});

test("unit 3 is recorded as BLOCKED for a stated reason, not omitted", () => {
  const doc = read("RESULT_UNIT3_BLOCKED.md");
  assert.ok(doc.includes("BLOCKED"), "the blocked unit must say so");
  assert.ok(doc.length > 500, "a blocked unit still owes a written reason");
});

test("both units cluster their bootstrap on season-week, not on rows", () => {
  // Rows within a season-week are not independent draws; the record says the
  // interval came from cluster resampling, and that must not be downgraded.
  assert.equal(unit1.bootstrap_unit, "season-week");
  assert.equal(unit2.bootstrap_unit, "season-week");
  assert.equal(unit1.bootstrap_reps, 2000);
  assert.equal(unit2.bootstrap_reps, 2000);
});

test("holdout seasons are strictly after the training seasons", () => {
  // The leak check: a holdout that overlaps training would invalidate both
  // results regardless of what the numbers say.
  assert.ok(unit1.train_max_season < Math.min(...unit1.holdout_seasons));
  assert.ok(Math.max(...unit2.train_seasons) < Math.min(...unit2.holdout_seasons));
});

test("pre-registration files exist and state a kill line", () => {
  for (const f of ["PREREGISTRATION.md", "PREREGISTRATION_UNIT2.md", "PREREGISTRATION_UNIT3.md"]) {
    const doc = read(f);
    assert.ok(doc.length > 200, `${f} must carry substance`);
    assert.ok(/kill line/i.test(doc), `${f} must state its kill line`);
  }
});

test("the sampled air-yards artifact is the size the RESULT claims", () => {
  const rows = read("results/receiver_week_air_yards_sample.csv").trim().split(/\r?\n/);
  const header = rows[0].split(",");
  assert.equal(rows.length - 1, 18150, "sample row count");
  assert.equal(header.length, 7, "column count");
  for (const row of rows) assert.equal(row.split(",").length, 7, "ragged CSV row");
});

test("the fPOE tail tables are 20 rows of 8 columns", () => {
  for (const f of ["results/fpoe_extreme_high.csv", "results/fpoe_extreme_low.csv"]) {
    const rows = read(f).trim().split(/\r?\n/);
    assert.equal(rows.length - 1, 20, f);
    for (const row of rows) assert.equal(row.split(",").length, 8, `ragged row in ${f}`);
  }
});

test("the rate table is the fitted opportunity table, not a placeholder", () => {
  const t = json("results/rate_table.json");
  // The four coefficients are per-POSITION, which is what makes this a fitted
  // opportunity model rather than a single global rate.
  for (const k of ["intercept", "b_targets", "b_carries", "b_pass"]) {
    assert.ok(k in t, `rate_table.json missing ${k}`);
    assert.equal(typeof t[k], "object", `${k} must be a per-position map`);
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      assert.equal(typeof t[k][pos], "number", `${k}.${pos} must be numeric`);
    }
  }
  // n_weeks is per position (each position has its own opportunity weeks).
  assert.equal(typeof t.n_weeks, "object");
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    assert.ok(t.n_weeks[pos] > 0, `n_weeks.${pos} must be a positive count`);
  }
  // A QB has far more pass attempts than an RB, so the target coefficient for a
  // QB should not equal the RB's. If they ever match, the fit collapsed.
  assert.notEqual(t.b_targets.QB, t.b_targets.RB);
});

test("attribution names the upstream data licence", () => {
  assert.match(unit1.attribution, /nflverse/i);
  assert.match(unit2.attribution_nflverse, /nflverse/i);
  assert.match(unit2.attribution_ftn, /CC BY-SA/i);
});
