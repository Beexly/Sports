import assert from "node:assert/strict";
import { performativeEquilibriumCoverage } from "./performative_equilibrium_coverage.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq (1) coverage meets target", () => {
  const r = performativeEquilibriumCoverage(0.92, 0.1);
  assert.equal(r.ok, true);
  assert.equal(r.valid, true);
  assert.equal(r.target, 0.9);
});

check("coverage below target is not valid", () => {
  const r = performativeEquilibriumCoverage(0.85, 0.1);
  assert.equal(r.ok, true);
  assert.equal(r.valid, false);
});

check("non-finite coverage fails closed", () => {
  const r = performativeEquilibriumCoverage(Number.NaN, 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_or_invalid_coverage");
});

check("invalid alpha fails closed", () => {
  const r = performativeEquilibriumCoverage(0.9, 1.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_or_invalid_alpha");
});

check("boundary alpha fails closed", () => {
  assert.equal(performativeEquilibriumCoverage(0.9, 0).ok, false);
  assert.equal(performativeEquilibriumCoverage(0.9, 1).ok, false);
});

console.log("TEST_COUNT", passed);
