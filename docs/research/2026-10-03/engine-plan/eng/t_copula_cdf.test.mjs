import assert from "node:assert/strict";
import { tCopulaCdf } from "./t_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 6 valid domain fails closed not elementary", () => {
  const r = tCopulaCdf(0.5, 0.5, 0.3, 5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "bivariate_t_cdf_not_elementary");
});

check("eq 6 zeroish margin fails open interval", () => {
  const r = tCopulaCdf(0, 0.5, 0, 5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_open_unit_interval");
});

check("u outside (0,1) fails closed", () => {
  const r = tCopulaCdf(1.1, 0.5, 0, 5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_open_unit_interval");
});

check("v outside (0,1) fails closed", () => {
  const r = tCopulaCdf(0.4, -0.1, 0, 5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_open_unit_interval");
});

check("rho outside (-1,1) fails closed", () => {
  const r = tCopulaCdf(0.5, 0.5, 1, 5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "rho_outside_open_interval");
});

check("nu not positive fails closed", () => {
  const r = tCopulaCdf(0.5, 0.5, 0, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "nu_not_positive");
});

check("non-finite u fails closed", () => {
  const r = tCopulaCdf(Number.NaN, 0.5, 0, 5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_open_unit_interval");
});

console.log("TEST_COUNT", passed);
