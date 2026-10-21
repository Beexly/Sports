import assert from "node:assert/strict";
import { censoringCompatibleMinReduction } from "./censoring_compatible_min_reduction.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 4 identity min of [3,1,4] is 1", () => {
  const r = censoringCompatibleMinReduction([3, 1, 4]);
  assert.equal(r.ok, true);
  assert.equal(r.s, 1);
  assert.equal(r.eq, "4");
  assert.equal(r.d, 3);
});

check("eq 4 single coordinate returns itself", () => {
  const r = censoringCompatibleMinReduction([2.5]);
  assert.equal(r.ok, true);
  assert.equal(r.s, 2.5);
});

check("empty array fails closed", () => {
  const r = censoringCompatibleMinReduction([]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_or_non_array");
  assert.equal(r.s, undefined);
});

check("non-finite fails closed", () => {
  const r = censoringCompatibleMinReduction([1, NaN, 3]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_coordinate");
});

console.log("passed", passed);
