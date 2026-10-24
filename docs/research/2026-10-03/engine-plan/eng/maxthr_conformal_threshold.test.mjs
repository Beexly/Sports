import assert from "node:assert/strict";
import { maxThrConformalThreshold } from "./maxthr_conformal_threshold.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("max of finite thresholds", () => {
  const r = maxThrConformalThreshold([0.2, 0.5, 0.3]);
  assert.equal(r.ok, true);
  assert.equal(r.threshold, 0.5);
  assert.equal(r.n, 3);
});

check("empty thresholds fails closed", () => {
  const r = maxThrConformalThreshold([]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_thresholds");
  assert.equal(r.threshold, undefined);
});

check("non-finite threshold fails closed", () => {
  const r = maxThrConformalThreshold([0.1, Number.NaN, 0.4]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_threshold");
});

check("negative threshold fails closed", () => {
  const r = maxThrConformalThreshold([0.2, -0.1]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "negative_threshold");
});

console.log("TEST_COUNT", passed);
