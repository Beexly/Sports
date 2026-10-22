import { grassmannAdaptiveNonconformity } from "./grassmann_adaptive_nonconformity.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed
assert(grassmannAdaptiveNonconformity(-1, 1).ok === false, "neg dist");
assert(grassmannAdaptiveNonconformity(1, 0).ok === false, "zero eta");
assert(grassmannAdaptiveNonconformity(1, NaN).ok === false, "nan eta");
assert(grassmannAdaptiveNonconformity(NaN, 1).ok === false, "nan dist");

// success
const r = grassmannAdaptiveNonconformity(2, 4);
assert(r.ok === true, "ok");
assert(Math.abs(r.score - 0.5) < 1e-12, "score 0.5");

console.log("grassmann_adaptive_nonconformity.test.mjs: all assertions passed");
