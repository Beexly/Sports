import { mvOtcpEuclideanCost } from "./mv_otcp_euclidean_cost.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed cases
assert(mvOtcpEuclideanCost([], [1]).ok === false, "empty should fail");
assert(mvOtcpEuclideanCost([1], []).ok === false, "empty t fail");
assert(mvOtcpEuclideanCost([1, 2], [1]).ok === false, "dim mismatch fail");
assert(mvOtcpEuclideanCost([1, NaN], [1, 2]).ok === false, "non finite fail");
assert(mvOtcpEuclideanCost("not", [1]).ok === false, "non array fail");

// success case: s=[1,2], t=[1,2] cost=0; s=[1,2], t=[0,0] cost=1+4=5
const r0 = mvOtcpEuclideanCost([1, 2], [1, 2]);
assert(r0.ok === true, "should ok zero");
assert(r0.cost === 0, "zero cost");
assert(r0.dim === 2, "dim 2");

const r5 = mvOtcpEuclideanCost([1, 2], [0, 0]);
assert(r5.ok === true, "should ok");
assert(r5.cost === 5, "cost 5");

console.log("mv_otcp_euclidean_cost.test.mjs: all assertions passed");
