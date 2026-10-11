import assert from "node:assert/strict";
import { conformalEloInterval } from "./conformal_elo_interval.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 4 finite interval uses k-th order statistic of S", () => {
  const r = conformalEloInterval([0.5, 1.0, 1.5, 2.0], 0.25, 1500, 20);
  assert.equal(r.ok, true);
  assert.equal(r.n, 4);
  assert.equal(r.k, Math.ceil(5 * 0.75));
  assert.equal(r.q, 2.0);
  assert.equal(r.lower, 1500 - 2.0 * 20);
  assert.equal(r.upper, 1500 + 2.0 * 20);
});

check("empty calibration fails closed", () => {
  const r = conformalEloInterval([], 0.1, 1500, 10);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_calibration");
  assert.equal(r.lower, undefined);
});

check("non-positive SE fails closed", () => {
  const r = conformalEloInterval([1], 0.1, 1500, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_positive_se");
});

check("alpha outside (0,1) fails closed", () => {
  assert.equal(conformalEloInterval([1], 0, 1500, 10).ok, false);
  assert.equal(conformalEloInterval([1], 1, 1500, 10).ok, false);
  assert.equal(conformalEloInterval([1], 0, 1500, 10).reason, "alpha_out_of_unit_interval");
});

check("inflated index above n fails closed", () => {
  const r = conformalEloInterval([0.5, 1.0], 0.1, 1500, 10);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "inflated_quantile_exceeds_n");
  assert.equal(r.k, 3);
  assert.equal(r.n, 2);
});

console.log("TEST_COUNT", passed);
