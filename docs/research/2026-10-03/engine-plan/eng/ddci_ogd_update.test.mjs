import { ddciOgdUpdate } from "./ddci_ogd_update.mjs";
import assert from "node:assert/strict";

function testHappyPath() {
  const r = ddciOgdUpdate(0.5, 1, 0.1, 0.05);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.q - (0.5 + 0.05 * (1 - 0.1))) < 1e-12);
}

function testFailClosedBadErr() {
  const r = ddciOgdUpdate(0.5, 2, 0.1, 0.05);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "err_not_binary");
}

function testFailClosedBadAlpha() {
  const r = ddciOgdUpdate(0.5, 0, 1.5, 0.05);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "alpha_not_in_open_unit_interval");
}

function testFailClosedNegativeEta() {
  const r = ddciOgdUpdate(0.5, 0, 0.1, -0.01);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "eta_not_nonnegative_finite");
}

function testZeroEta() {
  const r = ddciOgdUpdate(0.3, 1, 0.05, 0);
  assert.equal(r.ok, true);
  assert.equal(r.q, 0.3);
}

testHappyPath();
testFailClosedBadErr();
testFailClosedBadAlpha();
testFailClosedNegativeEta();
testZeroEta();
console.log("5 tests passed");
