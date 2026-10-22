import { ogdQuantileUpdate } from "./ogd_quantile_tracker.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed
assert(ogdQuantileUpdate(NaN, 1, 0.1, 0.01).ok === false, "nan theta");
assert(ogdQuantileUpdate(1, -1, 0.1, 0.01).ok === false, "neg residual");
assert(ogdQuantileUpdate(1, 1, 0, 0.01).ok === false, "bad alpha");
assert(ogdQuantileUpdate(1, 1, 0.1, 0).ok === false, "bad eta");
assert(ogdQuantileUpdate(1, 1, 1.5, 0.01).ok === false, "alpha >1");

// success: residual > theta → increase
const up = ogdQuantileUpdate(1.0, 2.0, 0.1, 0.05);
assert(up.ok === true, "up ok");
assert(Math.abs(up.nextTheta - (1.0 + 0.05 * 0.9)) < 1e-12, "up step");
assert(up.step === 0.9, "step +");

// residual ≤ theta → decrease, floor at 0
const down = ogdQuantileUpdate(0.01, 0.005, 0.2, 0.1);
assert(down.ok === true, "down ok");
assert(down.nextTheta === 0, "floored");
assert(down.step === -0.2, "step -");

console.log("ogd_quantile_tracker.test.mjs: all assertions passed");
