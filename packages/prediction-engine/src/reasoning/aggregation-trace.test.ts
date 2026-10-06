import { describe, expect, it } from "vitest";
import { aggregateSignals, type AggregationTrace, type SignalObservation } from "./aggregation-trace.js";
import { interpretSituation, type SituationalReading } from "./situational-engine.js";

const decision = "2026-01-10T18:00:00.000Z";
const fresh = "2026-01-10T12:00:00.000Z";
const old = "2025-12-01T12:00:00.000Z";
const windowMs = 24 * 60 * 60 * 1000;

function signal(over: Partial<SignalObservation> & Pick<SignalObservation, "signalId" | "probability">): SignalObservation {
  return {
    sourceModule: "test",
    family: "EFFICIENCY",
    reasoningPath: "epa",
    outcome: "home",
    declaredWeight: 1,
    evidenceTimestamp: fresh,
    provenance: ["test"],
    ...over,
  };
}

describe("aggregateSignals", () => {
  it("classifies all four disagreement states", () => {
    const result = aggregateSignals({
      decisionTimestamp: decision,
      decisionWindowMs: windowMs,
      signals: [
        signal({ signalId: "a1", probability: 0.6, reasoningPath: "epa" }),
        signal({ signalId: "a2", probability: 0.62, reasoningPath: "epa" }),
        signal({ signalId: "b1", probability: 0.61, reasoningPath: "rest", family: "SITUATIONAL" }),
        signal({ signalId: "c1", probability: 0.9, reasoningPath: "epa" }),
        signal({ signalId: "d1", probability: 0.2, reasoningPath: "market", family: "MARKET" }),
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const state = (a: string, b: string) =>
      result.data.conflicts.find((pair) => pair.a === a && pair.b === b)?.state;
    expect(state("a1", "a2")).toBe("CONVERGENT_AGREEMENT");
    expect(state("a1", "b1")).toBe("DIVERGENT_AGREEMENT");
    expect(state("a1", "c1")).toBe("CONVERGENT_DISAGREEMENT");
    expect(state("a1", "d1")).toBe("DIVERGENT_DISAGREEMENT");
    expect(result.data.confidenceIsProbability).toBe(false);
    expect(result.data.publishablePick).toBe(false);
    expect(result.data.confidence).toBeGreaterThan(0);
    expect(result.data.confidence).toBeLessThanOrEqual(1);
  });

  it("keeps a stale signal and halves its weight", () => {
    const result = aggregateSignals({
      decisionTimestamp: decision,
      decisionWindowMs: windowMs,
      signals: [signal({ signalId: "old", probability: 0.55, evidenceTimestamp: old, declaredWeight: 2 })],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.signals[0]?.stale).toBe(true);
    expect(result.data.signals[0]?.effectiveWeight).toBe(1);
    expect(result.data.signals).toHaveLength(1);
  });

  it("fails consistency when provenance names a blocked module", () => {
    const result = aggregateSignals({
      decisionTimestamp: decision,
      decisionWindowMs: windowMs,
      blockedProvenance: ["glmf"],
      signals: [signal({ signalId: "g", probability: 0.55, provenance: ["glmf"] })],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.consistency.passed).toBe(false);
    expect(result.data.consistency.violations[0]).toContain("blocked");
  });

  it("refuses a probability outside (0, 1) instead of clamping it", () => {
    const result = aggregateSignals({
      decisionTimestamp: decision,
      decisionWindowMs: windowMs,
      signals: [signal({ signalId: "bad", probability: 1.4 })],
    });
    expect(result.ok).toBe(false);
  });

  it("does not carry a pick field", () => {
    const keys: (keyof AggregationTrace)[] = [
      "signals",
      "conflicts",
      "consistency",
      "confidence",
      "confidenceIsProbability",
      "publishablePick",
      "traceSummary",
    ];
    expect(keys).not.toContain("pick");
    expect(keys).not.toContain("value_edge");
  });
});

describe("interpretSituation", () => {
  const context = {
    homeTeam: "PHI",
    awayTeam: "DAL",
    venue: "Lincoln Financial Field",
    restDaysHome: 7,
    restDaysAway: 7,
    weather: "clear",
    marketLine: -425,
    marketImpliedProbability: 0.78,
    outcome: "home",
    decisionTimestamp: decision,
    decisionWindowMs: windowMs,
    relevantFamilies: ["EFFICIENCY", "SITUATIONAL"] as const,
  };

  it("excludes a stale signal from the implied number and still names it", () => {
    const result = interpretSituation(context, [
      signal({ signalId: "fresh", probability: 0.6, declaredWeight: 1 }),
      signal({ signalId: "stale", probability: 0.9, evidenceTimestamp: old }),
      signal({ signalId: "luck", probability: 0.4, family: "LUCK" }),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.activeSignals).toEqual(["fresh"]);
    expect(result.data.dormantSignals.map((item) => item.signalId).sort()).toEqual(["luck", "stale"]);
    expect(result.data.signalImplied).toBeCloseTo(0.6, 10);
    expect(result.data.divergence).toBeCloseTo(0.6 - 0.78, 10);
    expect(result.data.divergenceIsEdge).toBe(false);
    expect(result.data.publishablePick).toBe(false);
    expect(result.data.reasoningTrace).toContain("not an edge");
  });

  it("does not invent a signal-implied number when nothing is active", () => {
    const result = interpretSituation(context, [signal({ signalId: "stale", probability: 0.9, evidenceTimestamp: old })]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.signalImplied).toBeNull();
    expect(result.data.divergence).toBeNull();
  });

  it("refuses an out-of-range market probability", () => {
    const result = interpretSituation(
      { ...context, marketImpliedProbability: 1.4 },
      [signal({ signalId: "fresh", probability: 0.6 })],
    );
    expect(result.ok).toBe(false);
  });

  it("does not carry a value-edge field", () => {
    const keys: (keyof SituationalReading)[] = [
      "context",
      "trace",
      "activeSignals",
      "dormantSignals",
      "marketImplied",
      "signalImplied",
      "divergence",
      "divergenceIsEdge",
      "consistency",
      "reasoningTrace",
      "publishablePick",
    ];
    expect(keys).not.toContain("value_edge");
    expect(keys).not.toContain("valueEdge");
  });
});
