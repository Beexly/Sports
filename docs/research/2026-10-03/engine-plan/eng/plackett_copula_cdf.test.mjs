import assert from "node:assert/strict";
import { plackettCopulaCdf } from "./plackett_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("theta=1 is independence", () => {
  const r = plackettCopulaCdf(0.3, 0.7, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.21) < 1e-12);
  assert.equal(r.eq, "independence_special_case");
});

check("positive dependence theta=2 u=v=0.5", () => {
  const r = plackettCopulaCdf(0.5, 0.5, 2);
  assert.equal(r.ok, true);
  // Manual: s=1+(2-1)*(0.5+0.5)=2; disc=4 - 4*0.5*0.5*2*1=4-2=2; sqrt~1.414; numer=2-1.414=0.586; denom=2; c~0.293
  assert.ok(r.c > 0.25 && r.c < 0.4);
});

check("upper corner is 1", () => {
  const r = plackettCopulaCdf(1, 1, 2);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-10);
});

check("u outside (0,1] fails closed", () => {
  const r = plackettCopulaCdf(0, 0.5, 2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("theta <= 0 fails closed", () => {
  const r = plackettCopulaCdf(0.4, 0.6, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_outside_plackett_domain");
});

check("non-finite v fails closed", () => {
  const r = plackettCopulaCdf(0.4, Number.NaN, 2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
