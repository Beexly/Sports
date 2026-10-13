import assert from "node:assert/strict";
import { movdaExpectedMargin } from "./movda_expected_margin.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 4 zero deltaR home, identity coeffs", () => {
  const r = movdaExpectedMargin(1200, 1200, 1, 10, 0.01, 2, 3);
  assert.equal(r.ok, true);
  assert.equal(r.deltaR, 0);
  assert.ok(Math.abs(r.tanhTerm) < 1e-12);
  assert.ok(Math.abs(r.eMov - (0 + 2 + 3)) < 1e-9);
});

check("eq 4 positive deltaR saturates via tanh", () => {
  const r = movdaExpectedMargin(1600, 1200, 0, 5, 0.01, 0, 0);
  assert.equal(r.ok, true);
  assert.equal(r.deltaR, 400);
  assert.ok(r.tanhTerm > 0.99);
  assert.ok(r.eMov > 4.9 && r.eMov < 5.1);
});

check("non-finite rating fails closed", () => {
  const r = movdaExpectedMargin(Number.POSITIVE_INFINITY, 1200, 1, 1, 1, 0, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_rating_a");
  assert.equal(r.eMov, undefined);
});

check("invalid home indicator fails closed", () => {
  const r = movdaExpectedMargin(1200, 1200, 2, 1, 1, 0, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_home_indicator");
});

check("non-finite coefficient fails closed", () => {
  const r = movdaExpectedMargin(1200, 1200, 1, Number.NaN, 1, 0, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_coefficient");
});

console.log("passed", passed);
