import assert from "node:assert/strict";
import { studentCopulaPairwiseMarkov } from "./student_copula_pairwise_markov.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq (2) equal products hold", () => {
  const r = studentCopulaPairwiseMarkov(2, 3, 1, 6);
  assert.equal(r.ok, true);
  assert.equal(r.equal, true);
  assert.equal(r.eq, "(2)");
  assert.ok(Math.abs(r.left - 6) < 1e-12);
  assert.ok(Math.abs(r.right - 6) < 1e-12);
});

check("eq (2) unequal products fail equality", () => {
  const r = studentCopulaPairwiseMarkov(2, 3, 1, 5);
  assert.equal(r.ok, true);
  assert.equal(r.equal, false);
});

check("non-positive density fails closed", () => {
  const r = studentCopulaPairwiseMarkov(0, 1, 1, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_density");
});

check("non-finite density fails closed", () => {
  const r = studentCopulaPairwiseMarkov(Number.NaN, 1, 1, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_density");
});

check("negative tol fails closed", () => {
  const r = studentCopulaPairwiseMarkov(1, 1, 1, 1, -1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_tol");
});

check("within tolerance holds", () => {
  const r = studentCopulaPairwiseMarkov(1.000000001, 1, 1, 1, 1e-8);
  assert.equal(r.ok, true);
  assert.equal(r.equal, true);
});

console.log("TEST_COUNT", passed);
