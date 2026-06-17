import { describe, it, expect } from "vitest";
// The decision logic is a plain .mjs lib so the same predicate the ops script
// runs is the one pinned here. Imported by relative path from the repo root.
import {
  evaluateGateFlip,
  evaluatePublicPicksFlip,
  evaluatePerformanceStatsFlip,
  evaluateAlwaysFailClosed,
  REFRESH_STALE_AFTER_MINUTES,
  MIN_SETTLED_PICKS_FOR_PERFORMANCE,
  SEED_MODEL_VERSION,
  GATE_TARGETS,
} from "../../../scripts/lib/gate-flip-readiness.mjs";

const cleanGates = {
  devFakeAdmin: false,
  demoPicksEnabled: false,
  derivedModelHistoryEnabled: true,
  publicPicksEnabled: true,
};

// A facts object that passes BOTH gates, so each test can subtract one condition.
function readyFacts() {
  return {
    seedCount: 0,
    settledCount: MIN_SETTLED_PICKS_FOR_PERFORMANCE,
    ingestionAgeMinutes: REFRESH_STALE_AFTER_MINUTES - 1,
    freePicksToday: 1,
    gates: { ...cleanGates },
  };
}

describe("gate-flip readiness constants", () => {
  it("mirrors the documented thresholds", () => {
    expect(REFRESH_STALE_AFTER_MINUTES).toBe(240);
    expect(MIN_SETTLED_PICKS_FOR_PERFORMANCE).toBe(100);
    expect(SEED_MODEL_VERSION).toBe("v5.0.0-seed");
    expect(GATE_TARGETS).toEqual(["public-picks", "performance-stats"]);
  });
});

describe("evaluateAlwaysFailClosed", () => {
  it("passes a clean env", () => {
    expect(evaluateAlwaysFailClosed({ devFakeAdmin: false, demoPicksEnabled: false })).toEqual([]);
  });
  it("fails on DEV_FAKE_ADMIN", () => {
    const f = evaluateAlwaysFailClosed({ devFakeAdmin: true, demoPicksEnabled: false });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/DEV_FAKE_ADMIN/);
  });
  it("fails on DEMO_PICKS_ENABLED", () => {
    const f = evaluateAlwaysFailClosed({ devFakeAdmin: false, demoPicksEnabled: true });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/DEMO_PICKS_ENABLED/);
  });
});

describe("evaluatePublicPicksFlip", () => {
  it("passes when every pre-flight condition is met", () => {
    const r = evaluatePublicPicksFlip(readyFacts());
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it("blocks on any seed row (seed-leak guard — /api/picks does not filter)", () => {
    const r = evaluatePublicPicksFlip({ ...readyFacts(), seedCount: 1 });
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /seed/i.test(m))).toBe(true);
  });

  it("blocks when DEMO_PICKS_ENABLED is on", () => {
    const facts = readyFacts();
    facts.gates.demoPicksEnabled = true;
    const r = evaluatePublicPicksFlip(facts);
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /DEMO_PICKS_ENABLED/.test(m))).toBe(true);
  });

  it("blocks when ingestion is older than the SLA", () => {
    const r = evaluatePublicPicksFlip({ ...readyFacts(), ingestionAgeMinutes: REFRESH_STALE_AFTER_MINUTES + 1 });
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /stale/i.test(m))).toBe(true);
  });

  it("treats exactly-at-SLA ingestion as fresh (boundary uses strict >)", () => {
    const r = evaluatePublicPicksFlip({ ...readyFacts(), ingestionAgeMinutes: REFRESH_STALE_AFTER_MINUTES });
    expect(r.ok).toBe(true);
  });

  it("blocks when no ingestion has ever succeeded", () => {
    const r = evaluatePublicPicksFlip({ ...readyFacts(), ingestionAgeMinutes: null });
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /no successful ingestion/i.test(m))).toBe(true);
  });

  it("blocks when there are no publishable FREE picks today (empty board)", () => {
    const r = evaluatePublicPicksFlip({ ...readyFacts(), freePicksToday: 0 });
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /FREE-tier/i.test(m))).toBe(true);
  });

  it("blocks when DERIVED_MODEL_HISTORY_ENABLED is off (sequencing)", () => {
    const facts = readyFacts();
    facts.gates.derivedModelHistoryEnabled = false;
    const r = evaluatePublicPicksFlip(facts);
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /DERIVED_MODEL_HISTORY_ENABLED/.test(m))).toBe(true);
  });
});

describe("evaluatePerformanceStatsFlip", () => {
  it("passes when settled count meets the floor, public picks on, no seed rows", () => {
    const r = evaluatePerformanceStatsFlip({
      seedCount: 0,
      settledCount: MIN_SETTLED_PICKS_FOR_PERFORMANCE,
      gates: { publicPicksEnabled: true },
    });
    expect(r.ok).toBe(true);
  });

  it("blocks below the settled-picks floor", () => {
    const r = evaluatePerformanceStatsFlip({
      seedCount: 0,
      settledCount: MIN_SETTLED_PICKS_FOR_PERFORMANCE - 1,
      gates: { publicPicksEnabled: true },
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /settled/i.test(m))).toBe(true);
  });

  it("blocks when PUBLIC_PICKS_ENABLED is off (sequencing)", () => {
    const r = evaluatePerformanceStatsFlip({
      seedCount: 0,
      settledCount: MIN_SETTLED_PICKS_FOR_PERFORMANCE,
      gates: { publicPicksEnabled: false },
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /PUBLIC_PICKS_ENABLED/.test(m))).toBe(true);
  });

  it("blocks on any seed row", () => {
    const r = evaluatePerformanceStatsFlip({
      seedCount: 3,
      settledCount: MIN_SETTLED_PICKS_FOR_PERFORMANCE,
      gates: { publicPicksEnabled: true },
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /seed/i.test(m))).toBe(true);
  });
});

describe("evaluateGateFlip (dispatcher)", () => {
  it("public-picks: green path", () => {
    expect(evaluateGateFlip("public-picks", readyFacts()).ok).toBe(true);
  });

  it("performance-stats: green path", () => {
    expect(evaluateGateFlip("performance-stats", readyFacts()).ok).toBe(true);
  });

  it("always fails closed on DEV_FAKE_ADMIN regardless of target", () => {
    const facts = readyFacts();
    facts.gates.devFakeAdmin = true;
    const pub = evaluateGateFlip("public-picks", facts);
    const perf = evaluateGateFlip("performance-stats", facts);
    expect(pub.ok).toBe(false);
    expect(perf.ok).toBe(false);
    expect(pub.failures.some((m: string) => /DEV_FAKE_ADMIN/.test(m))).toBe(true);
    expect(perf.failures.some((m: string) => /DEV_FAKE_ADMIN/.test(m))).toBe(true);
  });

  it("rejects an unknown target", () => {
    // @ts-expect-error — intentionally invalid target to exercise the runtime guard
    const r = evaluateGateFlip("not-a-gate", readyFacts());
    expect(r.ok).toBe(false);
    expect(r.failures.some((m: string) => /Unknown target/.test(m))).toBe(true);
  });
});
