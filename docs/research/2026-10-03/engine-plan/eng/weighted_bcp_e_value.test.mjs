import { weightedBcpEValue } from "./weighted_bcp_e_value.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed
assert(weightedBcpEValue(null, [1], 1, 1).ok === false, "null cal fail");
assert(weightedBcpEValue([1], [1], -1, 1).ok === false, "neg test fail");
assert(weightedBcpEValue([1], [1], 1, 0).ok === false, "zero test weight fail");
assert(weightedBcpEValue([1, NaN], [1, 1], 1, 1).ok === false, "nan cal fail");
assert(weightedBcpEValue([0], [1], 0, 1).ok === false, "zero denom fail");
assert(weightedBcpEValue([1], [1, 2], 1, 1).ok === false, "len mismatch fail");

// success: n=1, calS=2, calW=1, testS=4, testW=1; W=2, denom=1*2 +1*4=6; E=2*4/6=8/6=4/3
const r = weightedBcpEValue([2], [1], 4, 1);
assert(r.ok === true, "ok");
assert(Math.abs(r.eValue - 4/3) < 1e-12, "e=4/3");
assert(r.n === 1, "n");

console.log("weighted_bcp_e_value.test.mjs: all assertions passed");
