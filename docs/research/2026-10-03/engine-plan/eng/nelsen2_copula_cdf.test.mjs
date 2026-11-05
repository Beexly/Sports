import assert from "node:assert/strict";
import { nelsen2CopulaCdf } from "./nelsen2_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq N2 theta=1 u=v=0.5 is 0", () => {
  const r = nelsen2CopulaCdf(0.5, 0.5, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0) < 1e-12);
  assert.equal(r.eq, "N2");
});

check("eq N2 upper corner is 1", () => {
  const r = nelsen2CopulaCdf(1, 1, 2);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-12);
});

check("u outside [0,1] fails closed", () => {
  const r = nelsen2CopulaCdf(-0.1, 0.5, 2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("theta < 1 fails closed", () => {
  const r = nelsen2CopulaCdf(0.4, 0.6, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_less_than_one");
});

check("non-finite v fails closed", () => {
  const r = nelsen2CopulaCdf(0.4, Number.NaN, 2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
