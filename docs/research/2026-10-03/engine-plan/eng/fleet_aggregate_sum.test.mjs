import assert from "node:assert/strict";
import { fleetAggregateSum } from "./fleet_aggregate_sum.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq (2) fleet sum of positives", () => {
  const r = fleetAggregateSum([1.5, 2.0, 0.5]);
  assert.equal(r.ok, true);
  assert.equal(r.sum, 4.0);
});

check("includes zeros and negatives", () => {
  const r = fleetAggregateSum([10, -3, 0]);
  assert.equal(r.ok, true);
  assert.equal(r.sum, 7);
});

check("empty fails closed", () => {
  const r = fleetAggregateSum([]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_or_non_array");
});

check("non-array fails closed", () => {
  const r = fleetAggregateSum(null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_or_non_array");
});

check("non-finite component fails closed", () => {
  const r = fleetAggregateSum([1, Number.NaN, 2]);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_component");
  assert.equal(r.sum, undefined);
});

check("non-number fails closed", () => {
  assert.equal(fleetAggregateSum([1, "2", 3]).ok, false);
  assert.equal(fleetAggregateSum([1, null]).ok, false);
});

console.log("TEST_COUNT", passed);
