import assert from "node:assert/strict";
import { conformalWinProbability } from "./conformal_win_probability.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 18 mid-p uses half for equals", () => {
  const r = conformalWinProbability([1, 2, 3, 2], 2, 0.5);
  assert.equal(r.ok, true);
  assert.equal(r.n, 4);
  // 1 < 2, 2==2 (0.5), 3>2, 2==2 (0.5) => 1 + 0.5 + 0.5 = 2
  assert.equal(r.pi, 2 / 5);
});

check("empty residuals fails closed", () => {
  const r = conformalWinProbability([], 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "empty_residuals");
  assert.equal(r.pi, undefined);
});

check("non-finite residual fails closed", () => {
  const r = conformalWinProbability([1, NaN], 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_residual");
});

check("tau outside [0,1] fails closed", () => {
  assert.equal(conformalWinProbability([1], 0, -0.1).ok, false);
  assert.equal(conformalWinProbability([1], 0, 1.1).ok, false);
  assert.equal(conformalWinProbability([1], 0, -0.1).reason, "tau_out_of_unit_interval");
});

check("all less gives pi = n/(n+1)", () => {
  const r = conformalWinProbability([1, 2, 3], 4);
  assert.equal(r.ok, true);
  assert.equal(r.pi, 3 / 4);
});

console.log("TEST_COUNT", passed);
