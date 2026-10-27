import assert from "node:assert/strict";
import { khoudrajiClaytonCdf } from "./khoudraji_clayton_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 2 alpha=beta=1 recovers Clayton", () => {
  const r = khoudrajiClaytonCdf(0.5, 0.5, 1, 1, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - (1 / 3)) < 1e-12);
  assert.equal(r.eq, "2");
});

check("eq 2 alpha=beta=0 recovers independence", () => {
  const r = khoudrajiClaytonCdf(0.4, 0.6, 0, 0, 2);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.4 * 0.6) < 1e-12);
});

check("upper corner is 1", () => {
  const r = khoudrajiClaytonCdf(1, 1, 0.3, 0.7, 1.5);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-12);
});

check("u outside fails closed", () => {
  const r = khoudrajiClaytonCdf(0, 0.5, 0.5, 0.5, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("alpha outside fails closed", () => {
  const r = khoudrajiClaytonCdf(0.5, 0.5, 1.1, 0.5, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "alpha_outside_unit_interval");
});

check("theta <= 0 fails closed", () => {
  const r = khoudrajiClaytonCdf(0.5, 0.5, 0.5, 0.5, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "theta_not_positive");
});

console.log("TEST_COUNT", passed);
