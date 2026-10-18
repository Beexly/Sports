import assert from "node:assert/strict";
import { smsCpCutoff } from "./sms_cp_cutoff.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq (8) finite cutoff is m-th order statistic of matched scores", () => {
  const r = smsCpCutoff([0.4, 0.1, 0.3, 0.2], 0.25);
  assert.equal(r.ok, true);
  assert.equal(r.k, 4);
  assert.equal(r.m, Math.ceil(5 * 0.75));
  assert.equal(r.cutoff, 0.4);
});

check("empty matched set fails closed", () => {
  const r = smsCpCutoff([], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_matched_set");
  assert.equal(r.cutoff, undefined);
});

check("non-finite score fails closed", () => {
  const r = smsCpCutoff([0.2, Number.NaN], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_score");
});

check("alpha outside (0,1) fails closed", () => {
  assert.equal(smsCpCutoff([1], 0).ok, false);
  assert.equal(smsCpCutoff([1], 1).ok, false);
  assert.equal(smsCpCutoff([1], 0).reason, "alpha_out_of_unit_interval");
});

check("order statistic index above k fails closed", () => {
  const r = smsCpCutoff([0.2, 0.5], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "order_statistic_index_exceeds_k");
  assert.equal(r.m, 3);
  assert.equal(r.k, 2);
});

console.log("TEST_COUNT", passed);
