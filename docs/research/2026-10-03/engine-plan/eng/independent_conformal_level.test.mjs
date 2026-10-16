import assert from "node:assert/strict";
import { independentConformalLevel } from "./independent_conformal_level.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("alpha=0.1 d=1 is 0.9", () => {
  const r = independentConformalLevel(0.1, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.level - 0.9) < 1e-12);
  assert.equal(r.eq, "independent_marginal");
});

check("alpha=0.1 d=2 is sqrt(0.9)", () => {
  const r = independentConformalLevel(0.1, 2);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.level - Math.sqrt(0.9)) < 1e-12);
});

check("alpha outside [0,1) fails closed", () => {
  const r = independentConformalLevel(1, 2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "alpha_outside_[0,1)");
  assert.equal(r.level, undefined);
});

check("d not positive integer fails closed", () => {
  const r = independentConformalLevel(0.05, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "d_not_positive_integer");
});

check("non-finite alpha fails closed", () => {
  const r = independentConformalLevel(Number.NaN, 3);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "alpha_outside_[0,1)");
});

console.log("TEST_COUNT", passed);
