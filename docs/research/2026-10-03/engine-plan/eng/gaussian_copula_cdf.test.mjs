import assert from "node:assert/strict";
import { gaussianCopulaCdf } from "./gaussian_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 2 independence rho=0 product of midpoints is 0.25", () => {
  const r = gaussianCopulaCdf(0.5, 0.5, 0);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.25) < 1e-12);
  assert.equal(r.eq, "2");
  assert.equal(r.rho, 0);
});

check("eq 2 independence zeroish margin fails open interval", () => {
  const r = gaussianCopulaCdf(0, 0.5, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_open_unit_interval");
});

check("eq 2 non-zero rho fails closed", () => {
  const r = gaussianCopulaCdf(0.5, 0.5, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_zero_rho_requires_bivariate_normal_cdf_not_elementary");
});

check("u outside (0,1) fails closed", () => {
  const r = gaussianCopulaCdf(1.1, 0.5, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_open_unit_interval");
});

check("v outside (0,1) fails closed", () => {
  const r = gaussianCopulaCdf(0.4, -0.1, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_open_unit_interval");
});

check("rho outside (-1,1) fails closed", () => {
  const r = gaussianCopulaCdf(0.5, 0.5, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "rho_outside_open_interval");
});

check("non-finite u fails closed", () => {
  const r = gaussianCopulaCdf(Number.NaN, 0.5, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_open_unit_interval");
});

console.log("TEST_COUNT", passed);
