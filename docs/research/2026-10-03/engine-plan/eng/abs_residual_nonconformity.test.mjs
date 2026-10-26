import assert from "node:assert/strict";
import { absoluteResidualNonconformity } from "./abs_residual_nonconformity.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq (2) absolute residual is finite", () => {
  const r = absoluteResidualNonconformity(3.5, 2.0);
  assert.equal(r.ok, true);
  assert.equal(r.alpha, 1.5);
});

check("equal values give zero", () => {
  const r = absoluteResidualNonconformity(1, 1);
  assert.equal(r.ok, true);
  assert.equal(r.alpha, 0);
});

check("non-finite y fails closed", () => {
  const r = absoluteResidualNonconformity(Number.NaN, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_y");
  assert.equal(r.alpha, undefined);
});

check("non-finite yhat fails closed", () => {
  const r = absoluteResidualNonconformity(1, Number.POSITIVE_INFINITY);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_yhat");
});

check("non-number fails closed", () => {
  assert.equal(absoluteResidualNonconformity("3", 1).ok, false);
  assert.equal(absoluteResidualNonconformity(3, null).ok, false);
});

console.log("TEST_COUNT", passed);
