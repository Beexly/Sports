import assert from "node:assert/strict";
import { unifyingConformalSetMembership } from "./unifying_conformal_set_membership.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 3 membership when test score <= empirical quantile", () => {
  const r = unifyingConformalSetMembership([0.1, 0.2, 0.3, 0.25], 0.25);
  assert.equal(r.ok, true);
  assert.equal(r.nPlus1, 4);
  assert.equal(r.k, Math.ceil(0.75 * 4));
  assert.equal(r.inSet, true);
});

check("empty scores fails closed", () => {
  const r = unifyingConformalSetMembership([], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_or_short_scores");
  assert.equal(r.inSet, undefined);
});

check("non-finite score fails closed", () => {
  const r = unifyingConformalSetMembership([0.2, Number.NaN], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_score");
});

check("alpha outside (0,1) fails closed", () => {
  assert.equal(unifyingConformalSetMembership([1], 0).ok, false);
  assert.equal(unifyingConformalSetMembership([1], 1).ok, false);
  assert.equal(unifyingConformalSetMembership([1], 0).reason, "alpha_out_of_unit_interval");
});

check("high test score may be out of set", () => {
  const r = unifyingConformalSetMembership([0.1, 0.2, 0.3, 1.0], 0.1);
  assert.equal(r.ok, true);
  assert.equal(r.inSet, false);
});

console.log("TEST_COUNT", passed);
