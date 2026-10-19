import assert from "node:assert/strict";
import { sequentialConformalThreshold } from "./sequential_conformal_threshold.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("symmetric absolute-error quantile matches printed interval construction", () => {
  const r = sequentialConformalThreshold([0.1, 0.4, 0.2, 0.3], 0.25);
  assert.equal(r.ok, true);
  assert.equal(r.n, 4);
  assert.equal(r.k, Math.ceil(4 * 0.75));
  assert.equal(r.threshold, 0.3);
});

check("empty calibration fails closed", () => {
  const r = sequentialConformalThreshold([], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_calibration");
  assert.equal(r.threshold, undefined);
});

check("negative or non-finite score fails closed", () => {
  assert.equal(sequentialConformalThreshold([0.2, -0.1], 0.1).ok, false);
  assert.equal(sequentialConformalThreshold([0.2, Number.NaN], 0.1).reason, "non_finite_or_negative_score");
});

check("alpha outside (0,1) fails closed", () => {
  assert.equal(sequentialConformalThreshold([1], 0).ok, false);
  assert.equal(sequentialConformalThreshold([1], 1).ok, false);
  assert.equal(sequentialConformalThreshold([1], 0).reason, "alpha_out_of_unit_interval");
});

check("index out of range fails closed", () => {
  assert.equal(sequentialConformalThreshold([0.2], 1.5).ok, false);
});

console.log("TEST_COUNT", passed);
