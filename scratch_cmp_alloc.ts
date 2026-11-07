import {
  allocateTargets,
  sinkhornTargetAllocation,
} from "./packages/prediction-engine/src/coach-sim/sinkhorn-targets.js";

const targets = [
  { playerId: "A", role: "WR1" as const, baseShare: 0.34, shadowRate: 0.1 },
  { playerId: "B", role: "WR2" as const, baseShare: 0.27, shadowRate: 0.05 },
  { playerId: "C", role: "SLOT" as const, baseShare: 0.22, contractMultiplier: 1.04 },
  { playerId: "D", role: "TE" as const, baseShare: 0.1 },
  { playerId: "E", role: "RB" as const, baseShare: 0.07, shadowRate: 0.2 },
];

const legacy = allocateTargets(targets);
const ot = sinkhornTargetAllocation(targets);
let maxDiff = 0;
for (let i = 0; i < targets.length; i++) {
  const d = Math.abs(legacy[i]!.share - ot[i]!.share);
  if (d > maxDiff) maxDiff = d;
  console.log(
    targets[i]!.playerId,
    "legacy", legacy[i]!.share.toFixed(12),
    "sinkhorn", ot[i]!.share.toFixed(12),
    "diff", d.toExponential(2),
  );
}
console.log("MAX ABS DIFF:", maxDiff.toExponential(3));
console.log("legacy total:", legacy.reduce((s, t) => s + t.share, 0).toFixed(12));
console.log("ot total    :", ot.reduce((s, t) => s + t.share, 0).toFixed(12));

const targets2 = targets.map((t) => ({ ...t, baseShare: 1.0 }));
const ot2 = sinkhornTargetAllocation(targets2);
console.log("\nbaseShare sensitivity (all baseShare=1.0):");
for (let i = 0; i < targets.length; i++) {
  console.log(
    targets[i]!.playerId,
    "ot", ot[i]!.share.toFixed(12),
    "ot2", ot2[i]!.share.toFixed(12),
    "delta", Math.abs(ot[i]!.share - ot2[i]!.share).toExponential(2),
  );
}
