import { ghRectangularizedMaxScore } from "./gh_rectangularized_max_score.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// fail closed
assert(ghRectangularizedMaxScore(null).ok === false, "null");
assert(ghRectangularizedMaxScore([]).ok === false, "empty");
assert(ghRectangularizedMaxScore([1, NaN]).ok === false, "nan");
assert(ghRectangularizedMaxScore([1, Infinity]).ok === false, "inf");
assert(ghRectangularizedMaxScore([1, -Infinity]).ok === false, "neg inf");

// example: max of coordinate scores
const r = ghRectangularizedMaxScore([0.3, 1.2, 0.8]);
assert(r.ok === true, "ok");
assert(r.max === 1.2, "max=1.2");
assert(r.d === 3, "d=3");

// single
const r2 = ghRectangularizedMaxScore([-0.5]);
assert(r2.ok === true, "ok2");
assert(r2.max === -0.5, "max=-0.5");

// all equal
const r3 = ghRectangularizedMaxScore([2, 2, 2]);
assert(r3.ok === true, "ok3");
assert(r3.max === 2, "max=2");

console.log("gh_rectangularized_max_score.test.mjs: all assertions passed");
