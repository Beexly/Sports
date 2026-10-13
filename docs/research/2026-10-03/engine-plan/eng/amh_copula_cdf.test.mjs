import assert from "node:assert/strict";
import { amhCopulaCdf } from "./amh_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 2.19 theta=0 is independence", () => {
  const r = amhCopulaCdf(0.3, 0.7, 0);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.21) < 1e-12);
  assert.equal(r.eq, "2.19");
});

check("eq 2.19 theta=0.5 u=v=0.5", () => {
  const r = amhCopulaCdf(0.5, 0.5, 0.5);
  assert.equal(r.ok, true);
  // denom = 1 - 0.5*0.5*0.5 = 1 - 0.125 = 0.875; c = 0.25 / 0.875 ≈ 0.285714
  assert.ok(Math.abs(r.c - 0.25 / 0.875) < 1e-12);
});

check("upper corner is 1", () => {
  const r = amhCopulaCdf(1, 1, 0.9);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-12);
});

check("u outside (0,1] fails closed", () => {
  const r = amhCopulaCdf(0, 0.5, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("theta >= 1 fails closed", () => {
  const r = amhCopulaCdf(0.4, 0.6, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_outside_amh_domain");
});

check("theta < -1 fails closed", () => {
  const r = amhCopulaCdf(0.4, 0.6, -1.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_outside_amh_domain");
});

check("non-finite v fails closed", () => {
  const r = amhCopulaCdf(0.4, Number.NaN, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
