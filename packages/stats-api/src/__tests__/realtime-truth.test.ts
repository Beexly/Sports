import { describe, expect, it } from "vitest";
import {
  computeDualAsOfEdge,
  marketFreshnessBudgetMs,
  isMarketQuoteFresh,
  scoreTopologyHealth,
  describeRealtimeTopology,
  GSE_TRUTH_PLANES,
  DEFAULT_CONSISTENCY_BUDGET_MS,
} from "../hydration/realtime-truth.js";

const HOUR = 3_600_000;

describe("marketFreshnessBudgetMs", () => {
  it("tightens near kickoff", () => {
    const now = Date.parse("2025-11-01T15:00:00.000Z");
    const kick = now + 2 * HOUR;
    const far = now + 48 * HOUR;
    expect(marketFreshnessBudgetMs(kick, now)).toBe(2 * HOUR);
    expect(marketFreshnessBudgetMs(far, now)).toBe(12 * HOUR);
  });
  it("clamps to ceiling", () => {
    const now = Date.parse("2025-11-01T15:00:00.000Z");
    const far = now + 48 * HOUR;
    expect(marketFreshnessBudgetMs(far, now, 3 * HOUR)).toBe(3 * HOUR);
  });
});

describe("computeDualAsOfEdge", () => {
  const base = {
    p: 0.55,
    q: 0.5,
    featureAsOf: "2025-11-01T17:00:00.000Z",
    quoteAsOf: "2025-11-01T17:05:00.000Z",
    decisionAsOf: "2025-11-01T17:10:00.000Z",
    commenceTime: "2025-11-01T20:00:00.000Z",
  };

  it("computes e = p - q when planes align", () => {
    const r = computeDualAsOfEdge(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.edge).toBeCloseTo(0.05);
      expect(r.formula).toContain("featureAsOf");
      expect(r.consistencyGapMs).toBe(5 * 60_000);
    }
  });

  it("refuses feature after decision", () => {
    const r = computeDualAsOfEdge({
      ...base,
      featureAsOf: "2025-11-01T18:00:00.000Z",
      decisionAsOf: "2025-11-01T17:10:00.000Z",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("feature_after_decision");
  });

  it("refuses consistency window breach", () => {
    const r = computeDualAsOfEdge({
      ...base,
      featureAsOf: "2025-11-01T12:00:00.000Z",
      quoteAsOf: "2025-11-01T17:05:00.000Z",
      consistencyBudgetMs: DEFAULT_CONSISTENCY_BUDGET_MS,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("consistency_window");
  });

  it("refuses stale quote near kickoff", () => {
    // decision 1h before kickoff → 2h budget; quote 3h old → stale
    const r = computeDualAsOfEdge({
      p: 0.55,
      q: 0.5,
      featureAsOf: "2025-11-01T18:55:00.000Z",
      quoteAsOf: "2025-11-01T16:00:00.000Z",
      decisionAsOf: "2025-11-01T19:00:00.000Z",
      commenceTime: "2025-11-01T20:00:00.000Z",
      consistencyBudgetMs: 4 * HOUR,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("quote_stale");
  });

  it("refuses invalid probabilities", () => {
    const r = computeDualAsOfEdge({ ...base, p: 1.5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("invalid_p");
  });
});

describe("isMarketQuoteFresh", () => {
  it("fresh within budget", () => {
    const r = isMarketQuoteFresh({
      quoteAsOf: "2025-11-01T16:00:00.000Z",
      now: "2025-11-01T17:00:00.000Z",
      commenceTime: "2025-11-02T20:00:00.000Z",
    });
    expect(r.fresh).toBe(true);
  });
});

describe("scoreTopologyHealth", () => {
  it("scores and blocks empty markets", () => {
    const h = scoreTopologyHealth({
      now: "2025-11-01T18:00:00.000Z",
      liveBoardEnabled: false,
      planes: {
        markets: { lastAsOf: null, rowsAvailable: 0, errorRate: 0 },
        box_advanced: {
          lastAsOf: "2025-11-01T12:00:00.000Z",
          rowsAvailable: 100,
          errorRate: 0,
        },
        optical: { lastAsOf: null, rowsAvailable: 0, errorRate: 0 },
        cockpit_ui: { lastAsOf: null, rowsAvailable: 0, errorRate: 0 },
      },
    });
    expect(h.blockers.some((b) => b.includes("markets"))).toBe(true);
    expect(h.readyForEdgeFire).toBe(false);
    expect(h.planeScores.optical).toBe(100); // dark is correct
  });

  it("ready when markets + box healthy", () => {
    const h = scoreTopologyHealth({
      now: "2025-11-01T18:00:00.000Z",
      liveBoardEnabled: false,
      planes: {
        markets: {
          lastAsOf: "2025-11-01T17:50:00.000Z",
          rowsAvailable: 50,
          errorRate: 0,
        },
        box_advanced: {
          lastAsOf: "2025-11-01T12:00:00.000Z",
          rowsAvailable: 200,
          errorRate: 0.01,
        },
        edge_gate: {
          lastAsOf: "2025-11-01T17:00:00.000Z",
          rowsAvailable: 10,
          errorRate: 0,
        },
        weather: {
          lastAsOf: "2025-11-01T17:30:00.000Z",
          rowsAvailable: 1,
          errorRate: 0,
        },
      },
    });
    expect(h.readyForEdgeFire).toBe(true);
    expect(h.score).toBeGreaterThan(50);
  });
});

describe("describeRealtimeTopology", () => {
  it("exposes planes and law", () => {
    const d = describeRealtimeTopology();
    expect(d.planes.length).toBe(GSE_TRUTH_PLANES.length);
    expect(d.law.some((l) => l.includes("featureAsOf"))).toBe(true);
  });
});
