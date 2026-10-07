import assert from "node:assert/strict";
import { scoreDrivenEloUpdate } from "./score_driven_elo_update.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

check("eq 2 equal ratings, A wins, K=16", () => {
  const r = scoreDrivenEloUpdate(1200, 1200, 1, 0);
  assert.equal(r.ok, true);
  assert.equal(r.expectedA, 0.5);
  assert.equal(r.expectedB, 0.5);
  assert.equal(r.nextA, 1208);
  assert.equal(r.nextB, 1192);
  assert.equal(r.k, 16);
});

check("eq 2 zero-sum on the printed pair", () => {
  const r = scoreDrivenEloUpdate(1400, 1200, 0, 1);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.nextA + r.nextB - (1400 + 1200)) < 1e-9);
  assert.ok(r.nextB > 1200);
  assert.ok(r.nextA < 1400);
});

check("non-finite rating fails closed", () => {
  const r = scoreDrivenEloUpdate(Number.NaN, 1200, 1, 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "non_finite_rating_a");
  assert.equal(r.nextA, undefined);
});

check("draw or other outcome fails closed", () => {
  const r = scoreDrivenEloUpdate(1200, 1200, 0.5, 0.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "outcome_not_win_loss_pair");
});

check("both-win pair fails closed", () => {
  const r = scoreDrivenEloUpdate(1200, 1100, 1, 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "outcome_not_win_loss_pair");
});

console.log("TEST_COUNT", passed);
