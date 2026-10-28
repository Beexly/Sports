import { sinkhornWithInfo } from "./src/coach-sim/sinkhorn-targets.js";

const r = [0.6, 0.4];
const c = [0.3, 0.7];
const C = [[0, 1], [1, 0]];

const H = (P: number[][]) => {
  let h = 0;
  for (const row of P) for (const p of row) if (p > 0) h -= p * Math.log(p);
  return h;
};
const maxCell = (P: number[][]) => Math.max(...P.flat());

for (const eps of [0.5, 0.1, 0.02]) {
  const { plan, info, scaling } = sinkhornWithInfo(r, c, C, eps);
  console.log(`eps=${eps} iters=${info.iterations} rowRes=${info.rowResidual.toExponential(2)} colRes=${info.colResidual.toExponential(2)} conv=${info.converged} H=${H(plan).toFixed(4)} max=${maxCell(plan).toFixed(4)} u=[${scaling.u.map(x=>x.toFixed(4))}] v=[${scaling.v.map(x=>x.toFixed(4))}]`);
  console.log("   plan=", JSON.stringify(plan.map(row=>row.map(x=>+x.toFixed(6)))));
}

const z = sinkhornWithInfo([0, 1], [0.4, 0.6], C, 0.1);
console.log("zero-r rowRes", z.info.rowResidual.toExponential(2), "conv", z.info.converged, "plan", JSON.stringify(z.plan.map(r=>r.map(x=>+x.toFixed(6)))), "alpha", JSON.stringify(z.scaling.alpha));

const I = [[0, 5], [5, 0]];
const idn = sinkhornWithInfo([0.6, 0.4], [0.6, 0.4], I, 0.1);
console.log("identity rowRes", idn.info.rowResidual.toExponential(2), "plan", JSON.stringify(idn.plan.map(r=>r.map(x=>+x.toFixed(6)))));

const one = sinkhornWithInfo([1], [1], [[0]], 0.05);
console.log("1x1", JSON.stringify(one.plan), one.info.converged);
