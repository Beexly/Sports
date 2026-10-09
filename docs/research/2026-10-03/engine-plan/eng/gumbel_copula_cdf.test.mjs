import assert from "node:assert/strict";
import { gumbelCopulaCdf } from "./gumbel_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 20 theta=1 is the product", () => {
  const r = gumbelCopulaCdf([0.5, 0.4], 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.2) < 1e-12);
  assert.equal(r.eq, "20");
});

check("eq 20 upper corner is 1", () => {
  const r = gumbelCopulaCdf([1, 1, 1], 1.7);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-12);
});

check("eq 20 printed outer exponent at theta=2", () => {
  const u = Math.exp(-1);
  const r = gumbelCopulaCdf([u, u], 2);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - Math.exp(-1)) < 1e-12);
});

check("u outside (0,1] fails closed", () => {
  const r = gumbelCopulaCdf([0, 0.5], 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("theta < 1 fails closed", () => {
  const r = gumbelCopulaCdf([0.4, 0.6], 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_below_gumbel_bound");
});

check("empty vector fails closed", () => {
  const r = gumbelCopulaCdf([], 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_not_nonempty_vector");
});

check("non-finite coordinate fails closed", () => {
  const r = gumbelCopulaCdf([0.4, Number.NaN], 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
