import assert from "node:assert/strict";
import { celrExpectedLocalRadius } from "./celr_expected_local_radius.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq finite radius on sorted distances", () => {
  const r = celrExpectedLocalRadius([0.1, 0.2, 0.3, 0.4], 0.5);
  assert.equal(r.ok, true);
  assert.equal(r.n, 4);
  assert.equal(r.beta, 0.5);
  assert.ok(Number.isFinite(r.radius));
  assert.ok(r.radius >= 0.1 && r.radius <= 0.2);
});

check("empty distances fails closed", () => {
  const r = celrExpectedLocalRadius([], 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_distances");
  assert.equal(r.radius, undefined);
});

check("negative distance fails closed", () => {
  const r = celrExpectedLocalRadius([0.1, -0.2], 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_or_negative_distance");
});

check("beta outside (0,1] fails closed", () => {
  assert.equal(celrExpectedLocalRadius([0.1], 0).ok, false);
  assert.equal(celrExpectedLocalRadius([0.1], 1.1).ok, false);
  assert.equal(celrExpectedLocalRadius([0.1], 0).reason, "beta_out_of_unit_interval");
});

check("non-finite distance fails closed", () => {
  const r = celrExpectedLocalRadius([0.1, Number.NaN], 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_or_negative_distance");
});

console.log("TEST_COUNT", passed);
