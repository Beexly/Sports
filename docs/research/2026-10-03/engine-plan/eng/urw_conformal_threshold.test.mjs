import assert from "node:assert/strict";
import { urwConformalThreshold } from "./urw_conformal_threshold.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq (2) finite threshold is order statistic of scores", () => {
  const r = urwConformalThreshold([0.1, 0.4, 0.2, 0.3], 0.25);
  assert.equal(r.ok, true);
  assert.equal(r.n, 4);
  const expectedLevel = Math.ceil(0.75 * 5) / 4;
  assert.equal(r.level, expectedLevel);
  assert.equal(r.threshold, 0.4);
});

check("empty scores fails closed", () => {
  const r = urwConformalThreshold([], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_scores");
  assert.equal(r.threshold, undefined);
});

check("non-finite score fails closed", () => {
  const r = urwConformalThreshold([0.2, Number.NaN], 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_score");
});

check("alpha outside (0,1) fails closed", () => {
  assert.equal(urwConformalThreshold([1], 0).ok, false);
  assert.equal(urwConformalThreshold([1], 1).ok, false);
  assert.equal(urwConformalThreshold([1], 0).reason, "alpha_out_of_unit_interval");
});

console.log("TEST_COUNT", passed);
