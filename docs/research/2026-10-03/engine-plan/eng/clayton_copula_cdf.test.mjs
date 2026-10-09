import assert from "node:assert/strict";
import { claytonCopulaCdf } from "./clayton_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 35 theta=1 u=v=0.5 is 1/3", () => {
  const r = claytonCopulaCdf(0.5, 0.5, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1 / 3) < 1e-12);
  assert.equal(r.eq, "35");
});

check("eq 35 upper corner is 1", () => {
  const r = claytonCopulaCdf(1, 1, 1.81);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-12);
});

check("u outside (0,1] fails closed", () => {
  const r = claytonCopulaCdf(0, 0.5, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("theta <= 0 fails closed", () => {
  const r = claytonCopulaCdf(0.4, 0.6, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_not_positive");
});

check("non-finite v fails closed", () => {
  const r = claytonCopulaCdf(0.4, Number.NaN, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
