import { describe, it, expect } from "vitest";
import {
  classifyGlobalMaxFetchedAt,
  classifyCandidateOddsAge,
  summarizeCandidateAges,
  FETCHEDAT_WARN_AFTER_MINUTES,
  FETCHEDAT_STALE_AFTER_MINUTES,
  FETCHEDAT_GATE_BUDGET_MINUTES,
} from "@/lib/data-reliability/odds-fetchedat-staleness";
import { MAX_CANDIDATE_ODDS_AGE_MS } from "@/lib/board/load-gate-slate";

const NOW = new Date("2026-07-28T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("gate budget is derived, never a second copy", () => {
  it("FETCHEDAT_GATE_BUDGET_MINUTES equals the gate's own MAX_CANDIDATE_ODDS_AGE_MS", () => {
    // Binding law: the 6h candidate-odds budget must never be widened. A
    // hardcoded duplicate is how it gets widened by accident — the gate is
    // retuned, the monitor keeps classifying against the stale number, and the
    // ops surface reports "within gate budget" for candidates the gate is
    // actually rejecting.
    expect(FETCHEDAT_GATE_BUDGET_MINUTES).toBe(MAX_CANDIDATE_ODDS_AGE_MS / 60_000);
    expect(FETCHEDAT_GATE_BUDGET_MINUTES).toBe(360); // 6h, as it stands today
  });

  it("the ops warn/stale thresholds sit strictly inside the gate budget", () => {
    expect(FETCHEDAT_WARN_AFTER_MINUTES).toBeLessThan(FETCHEDAT_STALE_AFTER_MINUTES);
    expect(FETCHEDAT_STALE_AFTER_MINUTES).toBeLessThan(FETCHEDAT_GATE_BUDGET_MINUTES);
  });
});

describe("classifyGlobalMaxFetchedAt — ops SLA scope", () => {
  it("is always scoped global_max so it can never be read as gate clearance", () => {
    expect(classifyGlobalMaxFetchedAt(minutesAgo(5), NOW).scope).toBe("global_max");
  });

  it("no rows at all is 'unknown' and alerts — absence of evidence, not health", () => {
    const r = classifyGlobalMaxFetchedAt(null, NOW);
    expect(r.status).toBe("unknown");
    expect(r.shouldAlert).toBe(true);
    expect(r.ageMinutes).toBeNull();
  });

  it("fresh is ok and does not alert", () => {
    const r = classifyGlobalMaxFetchedAt(minutesAgo(10), NOW);
    expect(r.status).toBe("ok");
    expect(r.shouldAlert).toBe(false);
  });

  it("even an 'ok' summary refuses to claim gate clearance", () => {
    const r = classifyGlobalMaxFetchedAt(minutesAgo(10), NOW);
    expect(r.summary).toMatch(/not a per-candidate gate clearance/i);
  });

  it("past the warn threshold is 'warn' but not yet an alert", () => {
    const r = classifyGlobalMaxFetchedAt(minutesAgo(FETCHEDAT_WARN_AFTER_MINUTES + 1), NOW);
    expect(r.status).toBe("warn");
    expect(r.shouldAlert).toBe(false);
  });

  it("past the stale threshold alerts", () => {
    const r = classifyGlobalMaxFetchedAt(minutesAgo(FETCHEDAT_STALE_AFTER_MINUTES + 1), NOW);
    expect(r.status).toBe("stale");
    expect(r.shouldAlert).toBe(true);
  });

  it("past the gate budget is gate_budget_exceeded and still points at per-candidate ages", () => {
    const r = classifyGlobalMaxFetchedAt(minutesAgo(FETCHEDAT_GATE_BUDGET_MINUTES + 1), NOW);
    expect(r.status).toBe("gate_budget_exceeded");
    expect(r.shouldAlert).toBe(true);
    expect(r.summary).toMatch(/per-candidate/i);
  });

  it("thresholds are exclusive: exactly at a boundary does not escalate", () => {
    expect(classifyGlobalMaxFetchedAt(minutesAgo(FETCHEDAT_WARN_AFTER_MINUTES), NOW).status).toBe("ok");
    expect(classifyGlobalMaxFetchedAt(minutesAgo(FETCHEDAT_STALE_AFTER_MINUTES), NOW).status).toBe("warn");
    expect(classifyGlobalMaxFetchedAt(minutesAgo(FETCHEDAT_GATE_BUDGET_MINUTES), NOW).status).toBe("stale");
  });
});

describe("classifyCandidateOddsAge — the scope Phase C actually measures", () => {
  it("is always scoped candidate", () => {
    expect(classifyCandidateOddsAge(minutesAgo(5), NOW).scope).toBe("candidate");
  });

  it("a missing fetchedAt is 'missing' and NOT within budget — never treated as fresh", () => {
    for (const absent of [null, undefined]) {
      const r = classifyCandidateOddsAge(absent, NOW);
      expect(r.status).toBe("missing");
      expect(r.withinGateBudget).toBe(false);
      expect(r.ageMinutes).toBeNull();
    }
  });

  it("inside the budget is fresh", () => {
    const r = classifyCandidateOddsAge(minutesAgo(FETCHEDAT_GATE_BUDGET_MINUTES - 1), NOW);
    expect(r.status).toBe("fresh");
    expect(r.withinGateBudget).toBe(true);
  });

  it("past the budget is stale and out of budget", () => {
    const r = classifyCandidateOddsAge(minutesAgo(FETCHEDAT_GATE_BUDGET_MINUTES + 1), NOW);
    expect(r.status).toBe("stale");
    expect(r.withinGateBudget).toBe(false);
  });

  it("exactly at the budget is still fresh (exclusive comparison, matching the gate)", () => {
    const r = classifyCandidateOddsAge(minutesAgo(FETCHEDAT_GATE_BUDGET_MINUTES), NOW);
    expect(r.status).toBe("fresh");
  });

  it("a caller-supplied maxAge can TIGHTEN the window", () => {
    const r = classifyCandidateOddsAge(minutesAgo(120), NOW, 60);
    expect(r.status).toBe("stale");
  });
});

describe("summarizeCandidateAges", () => {
  it("counts fresh / stale / missing and reports a stale rate", () => {
    const s = summarizeCandidateAges([
      classifyCandidateOddsAge(minutesAgo(10), NOW),
      classifyCandidateOddsAge(minutesAgo(10), NOW),
      classifyCandidateOddsAge(minutesAgo(FETCHEDAT_GATE_BUDGET_MINUTES + 1), NOW),
      classifyCandidateOddsAge(null, NOW),
    ]);
    expect(s).toEqual({ total: 4, fresh: 2, stale: 1, missing: 1, staleRate: 0.25 });
  });

  it("an empty batch reports a 0 stale rate rather than NaN", () => {
    const s = summarizeCandidateAges([]);
    expect(s.total).toBe(0);
    expect(s.staleRate).toBe(0);
    expect(Number.isNaN(s.staleRate)).toBe(false);
  });

  it("missing candidates count separately and are never folded into 'fresh'", () => {
    const s = summarizeCandidateAges([
      classifyCandidateOddsAge(null, NOW),
      classifyCandidateOddsAge(undefined, NOW),
    ]);
    expect(s.missing).toBe(2);
    expect(s.fresh).toBe(0);
  });
});
