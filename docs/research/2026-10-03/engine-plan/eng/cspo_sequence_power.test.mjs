import assert from "node:assert/strict";
import { cspoSequencePower } from "./cspo_sequence_power.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("unit length returns exp(logRatio)", () => {
  const r = cspoSequencePower(Math.log(2), 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.sequencePower - 2) < 1e-12);
});

check("zero log-ratio is one", () => {
  const r = cspoSequencePower(0, 5);
  assert.equal(r.ok, true);
  assert.equal(r.sequencePower, 1);
});

check("non-finite log-ratio fails closed", () => {
  const r = cspoSequencePower(Number.NaN, 3);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_log_ratio");
});

check("non-positive length fails closed", () => {
  const r = cspoSequencePower(1, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_length");
});

check("non-integer length fails closed", () => {
  const r = cspoSequencePower(1, 2.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_length");
});

console.log("TEST_COUNT", passed);
