import assert from "node:assert/strict";
import { splitConformalThreshold } from "./split_conformal_threshold.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 2.1 finite threshold is k-th order statistic", () => {
  const r = splitConformalThreshold([0.4, 0.1, 0.3, 0.2], 0.25);
  assert.equal(r.ok, true);
  assert.equal(r.n, 4);
  assert.equal(r.k, Math.ceil(5 * 0.75));
  assert.equal(r.threshold, 0.4);
});

check("empty calibration fails closed", () => {
  const r = splitConformalThreshold([], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_calibration");
  assert.equal(r.threshold, undefined);
});

check("non-finite score fails closed", () => {
  const r = splitConformalThreshold([0.2, Number.NaN], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_score");
});

check("alpha outside (0,1) fails closed", () => {
  assert.equal(splitConformalThreshold([1], 0).ok, false);
  assert.equal(splitConformalThreshold([1], 1).ok, false);
  assert.equal(splitConformalThreshold([1], 0).reason, "alpha_out_of_unit_interval");
});

check("inflated index above n fails closed", () => {
  const r = splitConformalThreshold([0.2, 0.5], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "inflated_quantile_exceeds_n");
  assert.equal(r.k, 3);
  assert.equal(r.n, 2);
});

console.log("TEST_COUNT", passed);
