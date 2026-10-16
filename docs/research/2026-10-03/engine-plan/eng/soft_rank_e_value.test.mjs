import { softRankEValue } from "./soft_rank_e_value.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed
assert(softRankEValue(null, 1).ok === false, "null cal fail");
assert(softRankEValue([1], -1).ok === false, "neg test fail");
assert(softRankEValue([1, NaN], 1).ok === false, "nan cal fail");
assert(softRankEValue([0], 0).ok === false, "zero denom fail");

// success: n=1, cal=2, test=4; denom=(2+4)/2=3; E=4/3
const r = softRankEValue([2], 4);
assert(r.ok === true, "ok");
assert(Math.abs(r.eValue - 4/3) < 1e-12, "e=4/3");
assert(r.n === 1, "n");

console.log("soft_rank_e_value.test.mjs: all assertions passed");
