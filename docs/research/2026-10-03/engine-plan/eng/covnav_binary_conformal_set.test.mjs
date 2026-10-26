import assert from "node:assert/strict";
import { covnavBinaryConformalSet } from "./covnav_binary_conformal_set.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 2 singleton Yes when only pYes meets threshold", () => {
  const r = covnavBinaryConformalSet(0.85, 0.15, 0.2);
  assert.equal(r.ok, true);
  assert.deepEqual(r.set, ["Yes"]);
  assert.equal(r.size, 1);
  assert.equal(r.threshold, 0.8);
});

check("eq 2 doubleton when both meet threshold", () => {
  const r = covnavBinaryConformalSet(0.6, 0.7, 0.5);
  assert.equal(r.ok, true);
  assert.deepEqual(r.set, ["Yes", "No"]);
  assert.equal(r.size, 2);
});

check("eq 2 empty set when neither meets threshold", () => {
  const r = covnavBinaryConformalSet(0.4, 0.3, 0.3);
  assert.equal(r.ok, true);
  assert.deepEqual(r.set, []);
  assert.equal(r.size, 0);
});

check("invalid pYes fails closed", () => {
  const r = covnavBinaryConformalSet(1.1, 0.5, 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_p_yes");
  assert.equal(r.set, undefined);
});

check("invalid qHat fails closed", () => {
  const r = covnavBinaryConformalSet(0.5, 0.5, -0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_q_hat");
});

check("non-finite pNo fails closed", () => {
  const r = covnavBinaryConformalSet(0.5, NaN, 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_p_no");
});

console.log("TEST_COUNT", passed);
