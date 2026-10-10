import assert from "node:assert/strict";
import { independenceCopulaCdf } from "./independence_copula_cdf.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 2.4 product of unit corners is 1", () => {
  const r = independenceCopulaCdf(1, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 1) < 1e-12);
  assert.equal(r.eq, "2.4");
});

check("eq 2.4 product of midpoints is 0.25", () => {
  const r = independenceCopulaCdf(0.5, 0.5);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0.25) < 1e-12);
});

check("eq 2.4 zero margin is 0", () => {
  const r = independenceCopulaCdf(0, 0.7);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.c - 0) < 1e-12);
});

check("u outside [0,1] fails closed", () => {
  const r = independenceCopulaCdf(1.1, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
  assert.equal(r.c, undefined);
});

check("v outside [0,1] fails closed", () => {
  const r = independenceCopulaCdf(0.4, -0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "v_outside_unit_interval");
});

check("non-finite u fails closed", () => {
  const r = independenceCopulaCdf(Number.NaN, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "u_outside_unit_interval");
});

console.log("TEST_COUNT", passed);
