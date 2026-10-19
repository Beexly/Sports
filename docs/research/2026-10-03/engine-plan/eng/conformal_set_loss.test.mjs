import assert from "node:assert/strict";
import { conformalSetLoss } from "./conformal_set_loss.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 5 covered set has loss equal to size", () => {
  const r = conformalSetLoss(3, true, 0.1);
  assert.equal(r.ok, true);
  assert.equal(r.loss, 3);
});

check("eq 5 uncovered set adds 1/lambda", () => {
  const r = conformalSetLoss(2, false, 0.5);
  assert.equal(r.ok, true);
  assert.equal(r.loss, 2 + 1 / 0.5);
});

check("negative set size fails closed", () => {
  const r = conformalSetLoss(-1, true, 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_set_size");
  assert.equal(r.loss, undefined);
});

check("lambda out of (0,1] fails closed", () => {
  assert.equal(conformalSetLoss(1, true, 0).ok, false);
  assert.equal(conformalSetLoss(1, true, 1.1).ok, false);
  assert.equal(conformalSetLoss(1, true, 0).reason, "lambda_out_of_range");
});

check("non-boolean coverage fails closed", () => {
  const r = conformalSetLoss(1, 1, 0.1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_coverage_flag");
});

console.log("TEST_COUNT", passed);
