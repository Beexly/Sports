import { evaluateBelichickTenMetrics } from "./packages/prediction-engine/src/nfl/belichick-ten-metrics.js";

// Plan's exact ablation fixture.
const inputs = {
  pressureSnaps: [
    ...Array.from({ length: 10 }, () => ({ rushers: 4, coverage: "zone" as const, timeToThrow: 2.9, sack: false, pressure: false })),
    ...Array.from({ length: 2 }, () => ({ rushers: 5, coverage: "man" as const, timeToThrow: 1.5, sack: true, pressure: true })),
    ...Array.from({ length: 2 }, () => ({ rushers: 5, coverage: "man" as const, timeToThrow: 2.2, sack: false, pressure: true })),
  ],
};

const bundle = evaluateBelichickTenMetrics(inputs as any);
console.log("packages:");
for (const p of bundle.pressurePackages) {
  console.log(" ", p.key, "snaps=" + p.snaps, "sackRate=" + p.sackRate, "quickPressureRate=" + p.quickPressureRate);
}

// Variant A — plan's snippet: prefer quickPressureRate per package when > 0.
let aSacks = 0, aTrips = 0;
for (const p of bundle.pressurePackages) {
  const snaps = p.snaps ?? 0;
  if (snaps <= 0) continue;
  const rate = p.quickPressureRate !== undefined && p.quickPressureRate > 0 ? p.quickPressureRate : (p.sackRate ?? 0);
  aSacks += rate * snaps;
  aTrips += snaps;
}
console.log("A quickPressure-preferred: sacks=" + aSacks, "trips=" + aTrips, "rate=" + (aSacks / aTrips).toFixed(4));

// Variant B — measured sack count only.
let bSacks = 0, bTrips = 0;
for (const p of bundle.pressurePackages) {
  const snaps = p.snaps ?? 0;
  if (snaps <= 0) continue;
  bSacks += (p.sackRate ?? 0) * snaps;
  bTrips += snaps;
}
console.log("B sackRate-weighted:      sacks=" + bSacks, "trips=" + bTrips, "rate=" + (bSacks / bTrips).toFixed(4));

// Variant C — top-package max by snaps order (pre-patch behavior).
const top = bundle.pressurePackages[0]!;
console.log("C top-package[0]:        ", top.key, "sackRate=" + top.sackRate, "quick=" + top.quickPressureRate);
