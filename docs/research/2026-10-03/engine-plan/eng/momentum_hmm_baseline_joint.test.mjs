import assert from "node:assert/strict";
import { momentumHmmBaselineJoint } from "./momentum_hmm_baseline_joint.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 1 product of 1s is 1", () => {
  const r = momentumHmmBaselineJoint(1, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.joint - 1) < 1e-12);
  assert.equal(r.eq, "1");
});

check("eq 1 product of midpoints is 0.25", () => {
  const r = momentumHmmBaselineJoint(0.5, 0.5);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.joint - 0.25) < 1e-12);
});

check("eq 1 zero is 0", () => {
  const r = momentumHmmBaselineJoint(0, 0.7);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.joint - 0) < 1e-12);
});

check("pmf1 outside [0,1] fails closed", () => {
  const r = momentumHmmBaselineJoint(1.1, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "pmf1_invalid");
  assert.equal(r.joint, undefined);
});

check("pmf2 outside [0,1] fails closed", () => {
  const r = momentumHmmBaselineJoint(0.4, -0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "pmf2_invalid");
});

check("non-finite fails closed", () => {
  const r = momentumHmmBaselineJoint(NaN, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "pmf1_invalid");
});

console.log("passed", passed);
