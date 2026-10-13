import assert from "node:assert/strict";
import { plackettLuceProbability } from "./plackett_luce_probability.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 1 two-item ranking, higher first", () => {
  const scores = [2, 1];
  const r = plackettLuceProbability(scores, [0, 1]);
  assert.equal(r.ok, true);
  assert.equal(r.probability, 2 / 3);
  assert.equal(r.k, 2);
});

check("eq 1 three-item ranking", () => {
  const scores = [3, 2, 1];
  const r = plackettLuceProbability(scores, [0, 1, 2]);
  assert.equal(r.ok, true);
  const expected = (3 / 6) * (2 / 3);
  assert.ok(Math.abs(r.probability - expected) < 1e-12);
  assert.equal(r.k, 3);
});

check("non-positive score fails closed", () => {
  const r = plackettLuceProbability([1, 0], [0, 1]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_positive_or_non_finite_score");
  assert.equal(r.probability, undefined);
});

check("order too short fails closed", () => {
  const r = plackettLuceProbability([1, 2], [0]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "order_too_short");
});

check("out-of-range index fails closed", () => {
  const r = plackettLuceProbability([1, 2], [0, 5]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "order_index_out_of_range");
});

console.log("TEST_COUNT", passed);
