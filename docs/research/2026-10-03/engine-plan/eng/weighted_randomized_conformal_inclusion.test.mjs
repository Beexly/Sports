import { weightedRandomizedConformalInclusion } from "./weighted_randomized_conformal_inclusion.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

// fail-closed tests
assert(weightedRandomizedConformalInclusion(-1, 1, 2, 0.1, 0.5).ok === false, "neg A");
assert(weightedRandomizedConformalInclusion(1, -1, 2, 0.1, 0.5).ok === false, "neg B");
assert(weightedRandomizedConformalInclusion(1, 1, 0, 0.1, 0.5).ok === false, "zero W");
assert(weightedRandomizedConformalInclusion(1, 1, 2, -0.1, 0.5).ok === false, "neg alpha");
assert(weightedRandomizedConformalInclusion(1, 1, 2, 1.1, 0.5).ok === false, "alpha >1");
assert(weightedRandomizedConformalInclusion(1, 1, 2, 0.1, -0.1).ok === false, "neg U");
assert(weightedRandomizedConformalInclusion(1, 1, 2, 0.1, 1.1).ok === false, "U >1");
assert(weightedRandomizedConformalInclusion("a", 1, 2, 0.1, 0.5).ok === false, "non-num A");

// valid inclusion
const r1 = weightedRandomizedConformalInclusion(0.5, 1.0, 2.0, 0.1, 0.0);
assert(r1.ok === true && r1.included === true, "should include");
const r2 = weightedRandomizedConformalInclusion(0.1, 0.1, 10.0, 0.5, 0.5);
assert(r2.ok === true && r2.included === false, "should exclude");

console.log("weighted_randomized_conformal_inclusion tests passed");
