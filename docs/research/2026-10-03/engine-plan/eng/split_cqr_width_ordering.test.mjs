import assert from "node:assert/strict";
import { splitCqrWidthOrdering } from "./split_cqr_width_ordering.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("remark 1 width equals base plus twice qHat", () => {
  const r = splitCqrWidthOrdering(1.0, 3.0, 0.5);
  assert.equal(r.ok, true);
  assert.equal(r.baseWidth, 2.0);
  assert.equal(r.width, 2.0 + 1.0);
  assert.equal(r.delta, 1.0);
});

check("zero qHat recovers base width", () => {
  const r = splitCqrWidthOrdering(0, 4, 0);
  assert.equal(r.ok, true);
  assert.equal(r.width, 4);
});

check("non-finite qLo fails closed", () => {
  const r = splitCqrWidthOrdering(NaN, 1, 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_q_lo");
  assert.equal(r.width, undefined);
});

check("negative qHat fails closed", () => {
  const r = splitCqrWidthOrdering(1, 2, -0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_or_negative_q_hat");
});

check("qHi below qLo fails closed", () => {
  const r = splitCqrWidthOrdering(3, 1, 0.2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "q_hi_below_q_lo");
});

console.log("TEST_COUNT", passed);
