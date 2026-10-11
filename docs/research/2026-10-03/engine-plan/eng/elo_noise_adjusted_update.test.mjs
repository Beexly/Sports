import assert from "node:assert/strict";
import { eloNoiseAdjustedUpdate } from "./elo_noise_adjusted_update.mjs";

const fail = eloNoiseAdjustedUpdate(NaN, 1500, 1, 16);
assert.equal(fail.ok, false);
assert.equal(fail.reason, "non_finite_rating_home");

const badOutcome = eloNoiseAdjustedUpdate(1500, 1500, 0.5, 16);
assert.equal(badOutcome.ok, false);
assert.equal(badOutcome.reason, "outcome_not_binary");

const badStep = eloNoiseAdjustedUpdate(1500, 1500, 1, 0);
assert.equal(badStep.ok, false);
assert.equal(badStep.reason, "non_positive_step");

const ok = eloNoiseAdjustedUpdate(1500, 1500, 1, 16);
assert.equal(ok.ok, true);
assert.ok(Number.isFinite(ok.nextHome));
assert.ok(ok.nextHome > 1500);
assert.ok(ok.nextAway < 1500);
assert.equal(ok.expected, 0.5);

console.log("elo_noise_adjusted_update tests passed");
