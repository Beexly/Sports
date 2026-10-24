import assert from "node:assert/strict";
import { conformalKoopmanDeadline } from "./conformal_koopman_deadline.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 2 finite deadline is min k", () => {
  const r = conformalKoopmanDeadline([1.0, 0.8, 0.5, 0.3, 0.1], 0.4);
  assert.equal(r.ok, true);
  assert.equal(r.deadline, 3);
  assert.equal(r.threshold, 0.4);
});

check("empty disagreements fails closed", () => {
  const r = conformalKoopmanDeadline([], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_disagreements");
  assert.equal(r.deadline, undefined);
});

check("non-finite disagreement fails closed", () => {
  const r = conformalKoopmanDeadline([1.0, Number.NaN], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_or_negative_disagreement");
});

check("epsilon outside (0,1) fails closed", () => {
  assert.equal(conformalKoopmanDeadline([1], 0).ok, false);
  assert.equal(conformalKoopmanDeadline([1], 1).ok, false);
  assert.equal(conformalKoopmanDeadline([1], 0).reason, "epsilon_out_of_unit_interval");
});

check("never converged fails closed", () => {
  const r = conformalKoopmanDeadline([1.0, 0.9, 0.8], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "never_converged");
  assert.equal(r.n, 3);
});

console.log("TEST_COUNT", passed);
