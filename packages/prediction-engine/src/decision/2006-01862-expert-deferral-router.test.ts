// Tests for decision/2006-01862-expert-deferral-router.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  gceDeferralSurrogate,
  routerDecision,
  routedSystemUnits,
  deferralBiasAudit,
  deferralRouterGatePasses,
} from "./2006-01862-expert-deferral-router.js";

describe("gceDeferralSurrogate (2006.01862)", () => {
  it("is zero for the oracle route and positive otherwise", () => {
    const t = { modelUnits: 0.5, expertUnits: -0.2 };
    expect(gceDeferralSurrogate(t, "model")).toBeCloseTo(0, 10);
    expect(gceDeferralSurrogate(t, "expert")).toBeGreaterThan(0);
    // When both lose, abstain is the oracle route.
    const bad = { modelUnits: -0.5, expertUnits: -0.4 };
    expect(gceDeferralSurrogate(bad, "abstain")).toBeCloseTo(0, 10);
    expect(gceDeferralSurrogate(bad, "model")).toBeGreaterThan(0);
  });
  it("is denominated in units, not 0/1", () => {
    const t = { modelUnits: 1.5, expertUnits: 0.1 };
    // Regret = forgone model units (1.5) minus expert net (0.1 - 0.02):
    // the deferral operating cost makes the expert route worse, raising regret.
    expect(gceDeferralSurrogate(t, "expert")).toBeCloseTo(1.4 + 0.02, 10);
  });
});

describe("routerDecision", () => {
  it("routes model/expert/abstain", () => {
    expect(routerDecision(0.8, 0.5, 0.1, 0.7)).toBe("model");
    expect(routerDecision(0.5, 0.8, 0.1, 0.7)).toBe("expert");
    expect(routerDecision(0.9, 0.9, 0.75, 0.7)).toBe("abstain");
    expect(routerDecision(0.5, 0.5, 0.1, 0.7)).toBe("model"); // ties go to the model
  });
});

describe("routedSystemUnits", () => {
  it("sums realized units under the routed decisions", () => {
    const triples = [
      { modelUnits: 0.9, expertUnits: 0.9 },
      { modelUnits: -1, expertUnits: 0.9 },
      { modelUnits: -1, expertUnits: -1 },
    ];
    const units = routedSystemUnits(triples, ["model", "expert", "abstain"], 0.02);
    expect(units).toBeCloseTo(0.9 + 0.88 + 0, 10);
  });
});

describe("deferralBiasAudit", () => {
  it("flags groups with under-deferral where the expert was right", () => {
    const audits = [
      { group: "primetime", deferralRate: 0.05, expertWinRateWhenDeferred: 0.7, n: 40 },
      { group: "early", deferralRate: 0.3, expertWinRateWhenDeferred: 0.5, n: 200 },
      { group: "late", deferralRate: 0.3, expertWinRateWhenDeferred: 0.5, n: 200 },
    ];
    expect(deferralBiasAudit(audits)).toEqual(["primetime"]);
  });
  it("flags nothing when deferral is even", () => {
    const audits = [
      { group: "a", deferralRate: 0.25, expertWinRateWhenDeferred: 0.55, n: 100 },
      { group: "b", deferralRate: 0.25, expertWinRateWhenDeferred: 0.55, n: 100 },
    ];
    expect(deferralBiasAudit(audits)).toEqual([]);
  });
});

describe("deferralRouterGatePasses", () => {
  it("requires beating both baselines with a clean audit", () => {
    expect(deferralRouterGatePasses(10, 8, 9, [])).toBe(true);
    expect(deferralRouterGatePasses(8.5, 8, 9, [])).toBe(false);
    expect(deferralRouterGatePasses(10, 8, 9, ["primetime"])).toBe(false);
  });
});
