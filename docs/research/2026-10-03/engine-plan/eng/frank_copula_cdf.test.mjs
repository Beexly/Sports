import assert from "node:assert/strict";
import { frankCopulaCdf } from "./frank_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("Definition1 independence theta->0 approx u*v", () => {
  // For small theta, Frank approaches independence C=u*v
  const r = frankCopulaCdf(0.5, 0.5, 0.0001);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.25) < 1e-4);
  assert.equal(r.eq, "Definition1");
});

check("Definition1 upper corner is 1", () => {
  const r = frankCopulaCdf(1, 1, 2);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-10);
});

check("u outside (0,1] fails closed", () => {
  const r = frankCopulaCdf(0, 0.5, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("theta = 0 fails closed", () => {
  const r = frankCopulaCdf(0.4, 0.6, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_zero_or_nonfinite");
});

check("non-finite v fails closed", () => {
  const r = frankCopulaCdf(0.4, Number.NaN, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
