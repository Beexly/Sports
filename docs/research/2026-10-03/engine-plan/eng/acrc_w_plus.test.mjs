import { acrcWPlus } from "./acrc_w_plus.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed
assert(acrcWPlus(null, 0.1).ok === false, "null losses");
assert(acrcWPlus([], 0.1).ok === false, "empty");
assert(acrcWPlus([0.5], 0).ok === false, "alpha 0");
assert(acrcWPlus([0.5], 1).ok === false, "alpha 1");
assert(acrcWPlus([1.1], 0.4).ok === false, "loss >1");
assert(acrcWPlus([-0.1], 0.4).ok === false, "neg loss");
assert(acrcWPlus([NaN], 0.4).ok === false, "nan");

// paper example: n=2, alpha=0.4, losses [0.5, 0.5], w+ = 0.7
const r = acrcWPlus([0.5, 0.5], 0.4);
assert(r.ok === true, "ok");
assert(Math.abs(r.wPlus - 0.7) < 1e-4, "w+=0.7 approx");
assert(Math.abs(r.A - 1.2) < 1e-12, "A=1.2");

// another: all zero, a = A * 1, w=min(1,A)
const r0 = acrcWPlus([0, 0], 0.1);
assert(r0.ok === true, "zeros ok");
assert(Math.abs(r0.wPlus - Math.min(1, 0.1*3)) < 1e-6, "zeros w");

console.log("acrc_w_plus.test.mjs: all assertions passed");
