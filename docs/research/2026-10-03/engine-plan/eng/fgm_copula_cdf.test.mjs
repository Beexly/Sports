import assert from "node:assert/strict";
import { fgmCopulaCdf } from "./fgm_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 10 theta=0 is independence", () => {
  const r = fgmCopulaCdf(0.3, 0.7, 0);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.21) < 1e-12);
  assert.equal(r.eq, "10");
});

check("eq 10 theta=0.5 u=v=0.5", () => {
  const r = fgmCopulaCdf(0.5, 0.5, 0.5);
  assert.equal(r.ok, true);
  // c = 0.25 * (1 + 0.5*0.5*0.5) = 0.25 * 1.125 = 0.28125
  assert.ok(Math.abs(r.c - 0.28125) < 1e-12);
});

check("upper corner is 1", () => {
  const r = fgmCopulaCdf(1, 1, 0.9);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-12);
});

check("u outside (0,1] fails closed", () => {
  const r = fgmCopulaCdf(0, 0.5, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("theta > 1 fails closed", () => {
  const r = fgmCopulaCdf(0.4, 0.6, 1.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_outside_fgm_domain");
});

check("theta < -1 fails closed", () => {
  const r = fgmCopulaCdf(0.4, 0.6, -1.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_outside_fgm_domain");
});

check("non-finite v fails closed", () => {
  const r = fgmCopulaCdf(0.4, Number.NaN, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
