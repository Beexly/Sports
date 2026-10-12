import { eloExperienceK } from "./elo_experience_k.mjs";
import assert from "node:assert/strict";

// Fail closed cases
assert.deepEqual(eloExperienceK(-1, [10, 20], [32, 16, 8]), { ok: false, reason: "non_negative_integer_games_required" });
assert.deepEqual(eloExperienceK(5, [10], [32, 16, 8]), { ok: false, reason: "two_thresholds_required" });
assert.deepEqual(eloExperienceK(5, [10, 20], [32, 16]), { ok: false, reason: "three_ks_required" });
assert.deepEqual(eloExperienceK(5, [10, 5], [32, 16, 8]), { ok: false, reason: "thresholds_non_increasing" });
assert.deepEqual(eloExperienceK(5, [10, 20], [16, 32, 8]), { ok: false, reason: "ks_not_nonincreasing_positive" });
assert.deepEqual(eloExperienceK(5, [10, 20], [32, 16, 0]), { ok: false, reason: "ks_not_nonincreasing_positive" });

// Success cases matching printed stepwise
assert.deepEqual(eloExperienceK(5, [10, 20], [32, 16, 8]), { ok: true, k: 32, nGames: 5, nc1: 10, nc2: 20 });
assert.deepEqual(eloExperienceK(15, [10, 20], [32, 16, 8]), { ok: true, k: 16, nGames: 15, nc1: 10, nc2: 20 });
assert.deepEqual(eloExperienceK(25, [10, 20], [32, 16, 8]), { ok: true, k: 8, nGames: 25, nc1: 10, nc2: 20 });
assert.deepEqual(eloExperienceK(10, [10, 20], [32, 16, 8]), { ok: true, k: 32, nGames: 10, nc1: 10, nc2: 20 });
assert.deepEqual(eloExperienceK(20, [10, 20], [32, 16, 8]), { ok: true, k: 16, nGames: 20, nc1: 10, nc2: 20 });

console.log("all tests passed");
