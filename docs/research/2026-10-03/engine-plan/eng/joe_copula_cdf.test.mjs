import assert from "node:assert/strict";
import { joeCopulaCdf } from "./joe_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 6.4 alpha=1 is independence", () => {
  const r = joeCopulaCdf(0.5, 0.5, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.25) < 1e-12);
  assert.equal(r.eq, "6.4");
});

check("eq 6.4 upper corner is 1", () => {
  const r = joeCopulaCdf(1, 1, 2);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-12);
});

check("u outside [0,1] fails closed", () => {
  const r = joeCopulaCdf(-0.1, 0.5, 1.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("alpha < 1 fails closed", () => {
  const r = joeCopulaCdf(0.4, 0.6, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "alpha_less_than_one");
});

check("non-finite v fails closed", () => {
  const r = joeCopulaCdf(0.4, Number.NaN, 2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
