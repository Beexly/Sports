import assert from "node:assert/strict";
import { momentCalibratedConformalQuantile } from "./moment_calibrated_conformal_quantile.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("uniform weights match inflated quantile", () => {
  const scores = [0.1, 0.2, 0.3, 0.4];
  const r = momentCalibratedConformalQuantile(scores, 0.25);
  assert.equal(r.ok, true);
  assert.equal(r.threshold, 0.4);
});

check("weighted mass shortfall fails closed", () => {
  const scores = [1, 2, 3];
  const weights = [0.1, 0.2, 0.7];
  const r = momentCalibratedConformalQuantile(scores, 0.05, weights);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "weighted_quantile_exceeds_mass");
});

check("empty fails closed", () => {
  const r = momentCalibratedConformalQuantile([], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_calibration");
});

check("bad alpha fails closed", () => {
  assert.equal(momentCalibratedConformalQuantile([1], 0).ok, false);
  assert.equal(momentCalibratedConformalQuantile([1], 1.5).reason, "alpha_out_of_unit_interval");
});

check("invalid weights fail closed", () => {
  const r = momentCalibratedConformalQuantile([1, 2], 0.1, [0.5, 0.6]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "weights_not_normalized");
});

check("negative weight fails closed", () => {
  const r = momentCalibratedConformalQuantile([1], 0.1, [-0.1]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_weight");
});

console.log("TEST_COUNT", passed);
