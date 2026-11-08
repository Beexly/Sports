import { d2dSplitConformalQuantile } from "./d2d_split_conformal_quantile.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed
assert(d2dSplitConformalQuantile(null, 0.1).ok === false, "null");
assert(d2dSplitConformalQuantile([], 0.1).ok === false, "empty");
assert(d2dSplitConformalQuantile([1], 0).ok === false, "gamma 0");
assert(d2dSplitConformalQuantile([1], 1).ok === false, "gamma 1");
assert(d2dSplitConformalQuantile([NaN], 0.1).ok === false, "nan");
assert(d2dSplitConformalQuantile([1, Infinity], 0.1).ok === false, "inf");

// example: n=5, gamma=0.2, (5+1)*(0.8)=4.8, ceil=5, 5th order stat
const scores = [1, 3, 2, 5, 4];
const r = d2dSplitConformalQuantile(scores, 0.2);
assert(r.ok === true, "ok");
assert(r.k === 5, "k=5");
assert(r.q === 5, "q=5");
assert(r.n === 5, "n=5");

// n=10, gamma=0.1, (11)*0.9=9.9, ceil=10
const r2 = d2dSplitConformalQuantile([1,2,3,4,5,6,7,8,9,10], 0.1);
assert(r2.ok === true, "ok2");
assert(r2.k === 10, "k=10");
assert(r2.q === 10, "q=10");

// out of range fails closed: very small gamma
const r3 = d2dSplitConformalQuantile([0.1, 0.5], 0.01);
assert(r3.ok === false, "small gamma out of range");
assert(r3.reason === "quantile_index_out_of_range", "reason");

console.log("d2d_split_conformal_quantile.test.mjs: all assertions passed");
