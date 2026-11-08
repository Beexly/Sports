import { pdeTvAdjustedCoverage } from "./pde_tv_adjusted_coverage.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed
assert(pdeTvAdjustedCoverage(0, [0.5], [0.1]).ok === false, "alpha 0");
assert(pdeTvAdjustedCoverage(1, [0.5], [0.1]).ok === false, "alpha 1");
assert(pdeTvAdjustedCoverage(0.1, [], []).ok === false, "empty");
assert(pdeTvAdjustedCoverage(0.1, [1.1], [0.1]).ok === false, "weight >1");
assert(pdeTvAdjustedCoverage(0.1, [0.5], [1.1]).ok === false, "tv >1");
assert(pdeTvAdjustedCoverage(0.1, [NaN], [0.1]).ok === false, "nan weight");

// simple case: equal weights 1, tv=0, lower = 1-alpha
const r0 = pdeTvAdjustedCoverage(0.1, [1,1], [0,0]);
assert(r0.ok === true, "ok");
assert(Math.abs(r0.lowerBound - 0.9) < 1e-12, "zero tv");

// with tv
const r1 = pdeTvAdjustedCoverage(0.05, [0.5, 0.5], [0.2, 0.1]);
assert(r1.ok === true, "ok tv");
// denom = 0.5+0.5 +1 = 2
// wtilde = 0.25 each
// sumTerm = 0.25*0.2 + 0.25*0.1 = 0.075
// lower = 0.95 - 0.075 = 0.875
assert(Math.abs(r1.lowerBound - 0.875) < 1e-12, "tv adjusted");

console.log("pde_tv_adjusted_coverage.test.mjs: all assertions passed");
