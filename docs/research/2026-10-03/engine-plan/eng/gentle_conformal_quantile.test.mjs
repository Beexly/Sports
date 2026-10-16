import { gentleConformalQuantile } from "./gentle_conformal_quantile.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed cases
assert(gentleConformalQuantile([], 0.1).ok === false, "empty should fail");
assert(gentleConformalQuantile([1,2], 0).ok === false, "alpha 0 fail");
assert(gentleConformalQuantile([1,2], 1).ok === false, "alpha 1 fail");
assert(gentleConformalQuantile([1, NaN], 0.1).ok === false, "non finite fail");
assert(gentleConformalQuantile([1], 0.1).ok === false, "k exceeds n fail"); // k=ceil(2*0.9)=2 >1

// success case: n=4, alpha=0.25, k=ceil(5*0.75)=4, threshold=ordered[3]
const scores = [1, 3, 2, 4];
const r = gentleConformalQuantile(scores, 0.25);
assert(r.ok === true, "should ok");
assert(r.threshold === 4, "highest quantile");
assert(r.k === 4, "k=4");
assert(r.n === 4, "n=4");

console.log("gentle_conformal_quantile.test.mjs: all assertions passed");
