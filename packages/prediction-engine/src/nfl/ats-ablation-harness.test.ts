import { describe, expect, it } from "vitest";
import {
  ablate,
  atsAblationPipeline,
  tierKill,
  type AblationResult,
  type TierSpec,
} from "./ats-ablation-harness.js";
import type { Sample } from "../eval/feature-construction-recipe.js";

function sample(over: Partial<Sample> = {}): Sample {
  return {
    features: { epa: 0.2, rest: 7, wind: 5 },
    outcome: 1,
    timestamp: "2026-09-25T20:00:00.000Z",
    ...over,
  };
}

// Simple logistic predictor on epa
const predict = (features: Record<string, number | null>): number => {
  const x = features.epa;
  if (x === null || x === undefined) return 0.5;
  return 1 / (1 + Math.exp(-3 * x));
};

const train: Sample[] = Array.from({ length: 12 }, (_, i) =>
  sample({
    features: { epa: 0.05 * i - 0.25, rest: 6 + (i % 3), wind: 2 + (i % 8) },
    outcome: i % 2,
    timestamp: `2026-08-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`,
  }),
);

const target: Sample[] = Array.from({ length: 8 }, (_, i) =>
  sample({
    features: { epa: 0.08 * i - 0.3, rest: 5 + (i % 4), wind: 1 + (i % 10) },
    outcome: i % 2,
    timestamp: `2026-09-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`,
  }),
);

const features = [
  { name: "epa", tier: "core" },
  { name: "rest", tier: "situational" },
  { name: "wind", tier: "situational" },
];

describe("W3 ablate", () => {
  it("computes drop-one Δlog-loss for every feature", () => {
    const r = ablate(features, target, train, predict);
    expect(r.n).toBe(8);
    expect(r.entries).toHaveLength(3);
    for (const e of r.entries) {
      expect(Number.isFinite(e.logLossWith)).toBe(true);
      expect(Number.isFinite(e.logLossWithout)).toBe(true);
      expect(e.deltaLogLoss).toBeCloseTo(e.logLossWithout - e.logLossWith, 5);
    }
    // epa drives the predictor — dropping it must hurt most
    const epa = r.entries.find((e) => e.feature === "epa")!;
    expect(epa.deltaLogLoss).toBeGreaterThan(0);
  });

  it("throws on empty inputs or out-of-range probs", () => {
    expect(() => ablate([], target, train, predict)).toThrow();
    expect(() => ablate(features, [], train, predict)).toThrow();
    expect(() => ablate(features, target, train, () => 1.5)).toThrow(/probability/);
  });
});

describe("W3 tierKill", () => {
  const tiers: TierSpec[] = [
    { tier: "core", features: ["epa"] },
    { tier: "situational", features: ["rest", "wind"] },
    { tier: "ghost", features: [] },
  ];

  it("kills tiers that fail to beat the threshold", () => {
    const ablation = ablate(features, target, train, predict);
    const results = tierKill(tiers, ablation, 0.001);
    expect(results).toHaveLength(3);

    const core = results.find((r) => r.tier === "core")!;
    expect(core.killed).toBe(false);
    expect(core.score).toBeGreaterThan(0);

    const ghost = results.find((r) => r.tier === "ghost")!;
    expect(ghost.killed).toBe(true);
    expect(ghost.reason).toContain("no ablation entries");
  });

  it("kills a tier whose best feature misses the threshold", () => {
    const ablation = ablate(features, target, train, predict);
    // Impossible threshold — everything dies
    const results = tierKill(tiers, ablation, 10);
    expect(results.every((r) => r.killed)).toBe(true);
    for (const r of results) {
      expect(r.reason).toMatch(/kill/);
    }
  });

  it("rejects non-finite threshold", () => {
    const ablation = ablate(features, target, train, predict);
    expect(() => tierKill(tiers, ablation, Number.NaN)).toThrow();
  });
});

describe("W3 atsAblationPipeline", () => {
  it("runs ablation then tier kill and lists survivors", () => {
    const tiers: TierSpec[] = [
      { tier: "core", features: ["epa"] },
      { tier: "situational", features: ["rest", "wind"] },
    ];
    const { ablation, tierResults, survivors } = atsAblationPipeline(
      tiers,
      target,
      train,
      predict,
      0.001,
    );
    expect(ablation.entries).toHaveLength(3);
    expect(tierResults).toHaveLength(2);
    expect(survivors).toContain("core");
  });
});
