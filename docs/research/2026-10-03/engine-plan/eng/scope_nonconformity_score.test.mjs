import assert from "node:assert/strict";
import { scopeNonconformityScore } from "./scope_nonconformity_score.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("printed eq rho = -log density for positive finite density", () => {
  const r = scopeNonconformityScore(Math.exp(-1.5));
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.score - 1.5) < 1e-12);
});

check("density 1 yields score 0", () => {
  const r = scopeNonconformityScore(1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.score) < 1e-12);
});

check("non-positive density fails closed", () => {
  assert.equal(scopeNonconformityScore(0).ok, false);
  assert.equal(scopeNonconformityScore(0).reason, "non_positive_density");
  assert.equal(scopeNonconformityScore(-0.1).ok, false);
  assert.equal(scopeNonconformityScore(-0.1).reason, "non_positive_density");
});

check("non-finite density fails closed", () => {
  assert.equal(scopeNonconformityScore(Number.NaN).ok, false);
  assert.equal(scopeNonconformityScore(Number.POSITIVE_INFINITY).ok, false);
  assert.equal(scopeNonconformityScore(Number.NaN).reason, "non_finite_density");
});

check("missing density fails closed", () => {
  assert.equal(scopeNonconformityScore(undefined).ok, false);
  assert.equal(scopeNonconformityScore(null).ok, false);
  assert.equal(scopeNonconformityScore("0.5").ok, false);
});

console.log("tests", passed);
