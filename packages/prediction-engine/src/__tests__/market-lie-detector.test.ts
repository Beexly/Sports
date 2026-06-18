import { describe, it, expect } from "vitest";
import {
  classifyLineMove,
  antiModel,
  LM_MIN_MEANINGFUL_NET_MOVE,
  LM_STEAM_MIN_NET_MOVE,
  LM_NEWS_DISPERSION_SPIKE,
  LM_VIG_MAX_NET_MOVE,
  LM_VIG_MAX_DISPERSION_DELTA,
  LM_CHOP_MIN_REVERSALS,
  ANTI_STRONG_GRAVITY_THRESHOLD,
  ANTI_WEAK_CLV_BEAT_RATE,
  ANTI_MIN_CLV_SAMPLE,
  ANTI_HIGH_DISPERSION_THRESHOLD,
  type LineMoveFacts,
  type AntiModelInput,
} from "../market-lie-detector.js";

// ── classifyLineMove — helpers ────────────────────────────────────────────────

const baseFacts: LineMoveFacts = {
  netMove: 0,
  pathLength: 0,
  reversals: 0,
  dispersionDelta: 0,
  movedWithMajority: null,
  hoursToGame: null,
};

// ── classifyLineMove — structural invariants ──────────────────────────────────

describe("classifyLineMove — structural invariants", () => {
  it("always returns isHypothesis: true", () => {
    const cases: LineMoveFacts[] = [
      { ...baseFacts },
      { ...baseFacts, netMove: 0.06, movedWithMajority: false },
      { ...baseFacts, netMove: 0.06, dispersionDelta: 0.02 },
      { ...baseFacts, netMove: 0.06, movedWithMajority: true },
      { ...baseFacts, netMove: 0.005, dispersionDelta: 0.002 },
      { ...baseFacts, reversals: 5 },
    ];
    for (const f of cases) {
      expect(classifyLineMove(f).isHypothesis).toBe(true);
    }
  });

  it("confidence is in [0, 1] for all cases", () => {
    const cases: LineMoveFacts[] = [
      { ...baseFacts },
      { ...baseFacts, netMove: 0.08, movedWithMajority: false },
      { ...baseFacts, netMove: 0.06, dispersionDelta: 0.02 },
      { ...baseFacts, reversals: 10 },
      { ...baseFacts, netMove: 0.01, dispersionDelta: 0.005 },
    ];
    for (const f of cases) {
      const c = classifyLineMove(f);
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("reasoning string is always non-empty and does not assert certainty", () => {
    const r = classifyLineMove(baseFacts);
    expect(r.reasoning.length).toBeGreaterThan(0);
    // Should use hedged language
    expect(r.reasoning).toMatch(/consistent with|pattern suggest|candidate|hypothesis/i);
  });

  it("same input → same output (pure function)", () => {
    const f: LineMoveFacts = { ...baseFacts, netMove: 0.06, movedWithMajority: false };
    expect(classifyLineMove(f)).toEqual(classifyLineMove(f));
  });
});

// ── classifyLineMove — chop ───────────────────────────────────────────────────

describe("classifyLineMove — chop", () => {
  it("reversals at LM_CHOP_MIN_REVERSALS → chop", () => {
    const r = classifyLineMove({ ...baseFacts, reversals: LM_CHOP_MIN_REVERSALS });
    expect(r.cause).toBe("chop");
  });

  it("high reversals → chop with higher confidence than minimum", () => {
    const r3 = classifyLineMove({ ...baseFacts, reversals: LM_CHOP_MIN_REVERSALS });
    const r6 = classifyLineMove({ ...baseFacts, reversals: 6 });
    expect(r6.confidence).toBeGreaterThanOrEqual(r3.confidence);
  });

  it("chop confidence is capped at 0.8 (no certainty claim)", () => {
    const r = classifyLineMove({ ...baseFacts, reversals: 100 });
    expect(r.confidence).toBeLessThanOrEqual(0.8);
  });

  it("chop takes priority over other causes when reversals are high enough", () => {
    // Even with a large netMove, chop fires first when reversals >= threshold
    const r = classifyLineMove({
      ...baseFacts,
      netMove: 0.10,
      reversals: LM_CHOP_MIN_REVERSALS,
      movedWithMajority: false,
    });
    expect(r.cause).toBe("chop");
  });
});

// ── classifyLineMove — sharp-reverse ─────────────────────────────────────────

describe("classifyLineMove — sharp-reverse", () => {
  it("meaningful netMove against majority → sharp-reverse", () => {
    const r = classifyLineMove({
      ...baseFacts,
      netMove: LM_MIN_MEANINGFUL_NET_MOVE,
      movedWithMajority: false,
    });
    expect(r.cause).toBe("sharp-reverse");
  });

  it("larger netMove against majority increases confidence", () => {
    const small = classifyLineMove({ ...baseFacts, netMove: 0.025, movedWithMajority: false });
    const large = classifyLineMove({ ...baseFacts, netMove: 0.08, movedWithMajority: false });
    expect(large.confidence).toBeGreaterThan(small.confidence);
  });

  it("sharp-reverse confidence capped at 0.85 (no certainty claim)", () => {
    const r = classifyLineMove({ ...baseFacts, netMove: 1.0, movedWithMajority: false });
    expect(r.confidence).toBeLessThanOrEqual(0.85);
  });

  it("move against majority below minimum netMove does not trigger sharp-reverse", () => {
    // netMove below threshold even with movedWithMajority: false
    const r = classifyLineMove({ ...baseFacts, netMove: 0.005, movedWithMajority: false });
    // Should fall through to vig-rebalance or indeterminate
    expect(r.cause).not.toBe("sharp-reverse");
  });

  it("reasoning mentions OPPOSITE direction", () => {
    const r = classifyLineMove({ ...baseFacts, netMove: 0.04, movedWithMajority: false });
    expect(r.reasoning).toMatch(/OPPOSITE|reverse/i);
  });
});

// ── classifyLineMove — news-reaction-candidate ────────────────────────────────

describe("classifyLineMove — news-reaction-candidate", () => {
  it("large move + dispersion spike → news-reaction-candidate", () => {
    const r = classifyLineMove({
      ...baseFacts,
      netMove: LM_STEAM_MIN_NET_MOVE,
      dispersionDelta: LM_NEWS_DISPERSION_SPIKE,
    });
    expect(r.cause).toBe("news-reaction-candidate");
  });

  it("news-reaction-candidate reasoning MUST state we cannot confirm without a news feed", () => {
    const r = classifyLineMove({
      ...baseFacts,
      netMove: 0.06,
      dispersionDelta: 0.03,
    });
    expect(r.cause).toBe("news-reaction-candidate");
    // Must explicitly say we cannot confirm
    expect(r.reasoning).toMatch(/cannot verify|cannot confirm|unconfirmed/i);
    // Must mention news-timestamp or news feed (K3)
    expect(r.reasoning).toMatch(/news|K3/i);
  });

  it("news-reaction-candidate confidence is moderate (not overconfident)", () => {
    const r = classifyLineMove({
      ...baseFacts,
      netMove: 0.07,
      dispersionDelta: 0.025,
    });
    expect(r.confidence).toBeLessThan(0.6); // Explicitly hedged confidence
  });

  it("large move without dispersion spike → steam, not news", () => {
    const r = classifyLineMove({
      ...baseFacts,
      netMove: LM_STEAM_MIN_NET_MOVE + 0.01,
      dispersionDelta: 0, // no spike
      movedWithMajority: true,
    });
    expect(r.cause).toBe("steam");
  });
});

// ── classifyLineMove — steam ──────────────────────────────────────────────────

describe("classifyLineMove — steam", () => {
  it("large move with majority → steam", () => {
    const r = classifyLineMove({
      ...baseFacts,
      netMove: LM_STEAM_MIN_NET_MOVE + 0.01,
      movedWithMajority: true,
    });
    expect(r.cause).toBe("steam");
  });

  it("known majority direction increases steam confidence vs unknown", () => {
    const withMajority = classifyLineMove({
      ...baseFacts, netMove: 0.06, movedWithMajority: true,
    });
    const unknownMajority = classifyLineMove({
      ...baseFacts, netMove: 0.06, movedWithMajority: null,
    });
    expect(withMajority.confidence).toBeGreaterThan(unknownMajority.confidence);
  });

  it("steam reasoning mentions it cannot be confirmed without ticket/handle data", () => {
    const r = classifyLineMove({
      ...baseFacts, netMove: 0.06, movedWithMajority: true,
    });
    expect(r.reasoning).toMatch(/cannot be confirmed|consistent with/i);
  });
});

// ── classifyLineMove — vig-rebalance ──────────────────────────────────────────

describe("classifyLineMove — vig-rebalance", () => {
  it("small move, flat dispersion → vig-rebalance", () => {
    const r = classifyLineMove({
      ...baseFacts,
      netMove: LM_VIG_MAX_NET_MOVE - 0.001,
      dispersionDelta: 0,
    });
    expect(r.cause).toBe("vig-rebalance");
  });

  it("vig-rebalance: absolute dispersionDelta must be within LM_VIG_MAX_DISPERSION_DELTA", () => {
    const r = classifyLineMove({
      ...baseFacts,
      netMove: 0.008,
      dispersionDelta: LM_VIG_MAX_DISPERSION_DELTA, // exactly at limit
    });
    expect(r.cause).toBe("vig-rebalance");
  });
});

// ── classifyLineMove — indeterminate ──────────────────────────────────────────

describe("classifyLineMove — indeterminate", () => {
  it("zero move, zero path, zero reversals, no majority info → indeterminate or vig-rebalance", () => {
    const r = classifyLineMove(baseFacts);
    // Zero move and zero dispersion → vig-rebalance (small move, flat dispersion)
    expect(["vig-rebalance", "indeterminate"]).toContain(r.cause);
  });

  it("indeterminate confidence is 0", () => {
    // Construct a case that reaches indeterminate:
    // netMove > LM_VIG_MAX but too small for steam, no majority info, small dispersion above threshold
    const r = classifyLineMove({
      ...baseFacts,
      netMove: 0.02,        // above vig threshold, below steam threshold
      dispersionDelta: 0.02, // above vig dispersion threshold, below news spike (if netMove < steam)
    });
    // This should reach indeterminate since it doesn't fit steam (netMove < LM_STEAM_MIN_NET_MOVE)
    // and not vig (dispersionDelta > LM_VIG_MAX_DISPERSION_DELTA)
    // and no majority info and no chop
    expect(r.cause).toBe("indeterminate");
    expect(r.confidence).toBe(0);
  });
});

// ── antiModel — structural invariants ────────────────────────────────────────

const baseAntiInput: AntiModelInput = {
  edgeDecision: "SPEAK",
  agreement: "CONFIRMS",
  calibrated: true,
  marketGravityAgainstUs: 20,
  clvBeatRate: 0.55,
  clvSampleSize: ANTI_MIN_CLV_SAMPLE + 10,
  dispersion: 0.02,
};

describe("antiModel — structural invariants", () => {
  it("is always weight 0 (inert, never priced)", () => {
    expect(antiModel(baseAntiInput).weight).toBe(0);
    expect(antiModel({ ...baseAntiInput, edgeDecision: "PASS" }).weight).toBe(0);
  });

  it("always has survivingIsNotSufficient: true", () => {
    const cases: AntiModelInput[] = [
      baseAntiInput,
      { ...baseAntiInput, edgeDecision: "PASS" },
      { ...baseAntiInput, agreement: "CONTRADICTS" },
    ];
    for (const input of cases) {
      expect(antiModel(input).survivingIsNotSufficient).toBe(true);
    }
  });

  it("same input → same output (pure function)", () => {
    expect(antiModel(baseAntiInput)).toEqual(antiModel(baseAntiInput));
  });
});

// ── antiModel — hard falsifiers → FALSIFIED ───────────────────────────────────

describe("antiModel — hard falsifiers → FALSIFIED", () => {
  it("edgeDecision PASS → FALSIFIED", () => {
    const r = antiModel({ ...baseAntiInput, edgeDecision: "PASS" });
    expect(r.verdict).toBe("FALSIFIED");
    expect(r.counterArguments.length).toBeGreaterThan(0);
    expect(r.strongestCounter).not.toBeNull();
  });

  it("agreement CONTRADICTS → FALSIFIED", () => {
    const r = antiModel({ ...baseAntiInput, agreement: "CONTRADICTS" });
    expect(r.verdict).toBe("FALSIFIED");
    expect(r.counterArguments.join(" ")).toMatch(/CONTRADICTS|sides with/i);
  });

  it("uncalibrated + strong gravity against → FALSIFIED", () => {
    const r = antiModel({
      ...baseAntiInput,
      calibrated: false,
      marketGravityAgainstUs: ANTI_STRONG_GRAVITY_THRESHOLD,
    });
    expect(r.verdict).toBe("FALSIFIED");
    expect(r.counterArguments.join(" ")).toMatch(/calibrat|gravity/i);
  });

  it("PASS is the strongest counter when present", () => {
    const r = antiModel({ ...baseAntiInput, edgeDecision: "PASS" });
    // The strongest counter should mention PASS or no demonstrable edge
    expect(r.strongestCounter).toMatch(/PASS|no demonstrable edge/i);
  });

  it("CONTRADICTS counterArgument mentions independent estimator sides with market", () => {
    const r = antiModel({ ...baseAntiInput, agreement: "CONTRADICTS" });
    expect(r.counterArguments.join(" ")).toMatch(/independent estimator|sides with/i);
  });
});

// ── antiModel — soft falsifiers → WEAKENED ────────────────────────────────────

describe("antiModel — soft falsifiers → WEAKENED", () => {
  it("strong gravity against (calibrated) → WEAKENED", () => {
    const r = antiModel({
      ...baseAntiInput,
      marketGravityAgainstUs: ANTI_STRONG_GRAVITY_THRESHOLD,
    });
    expect(r.verdict).toBe("WEAKENED");
  });

  it("thin CLV sample → WEAKENED", () => {
    const r = antiModel({
      ...baseAntiInput,
      clvBeatRate: 0.55,
      clvSampleSize: ANTI_MIN_CLV_SAMPLE - 5,
    });
    expect(r.verdict).toBe("WEAKENED");
    expect(r.counterArguments.join(" ")).toMatch(/thin|fewer|minimum/i);
  });

  it("weak CLV beat-rate → WEAKENED", () => {
    const r = antiModel({
      ...baseAntiInput,
      clvBeatRate: ANTI_WEAK_CLV_BEAT_RATE - 0.05,
      clvSampleSize: ANTI_MIN_CLV_SAMPLE + 10,
    });
    expect(r.verdict).toBe("WEAKENED");
    expect(r.counterArguments.join(" ")).toMatch(/CLV|beat-rate/i);
  });

  it("no CLV history → WEAKENED (unverified claim)", () => {
    const r = antiModel({ ...baseAntiInput, clvBeatRate: null, clvSampleSize: null });
    expect(r.verdict).toBe("WEAKENED");
    expect(r.counterArguments.join(" ")).toMatch(/no CLV history|unverified/i);
  });

  it("high dispersion → WEAKENED", () => {
    const r = antiModel({
      ...baseAntiInput,
      dispersion: ANTI_HIGH_DISPERSION_THRESHOLD,
    });
    expect(r.verdict).toBe("WEAKENED");
    expect(r.counterArguments.join(" ")).toMatch(/dispersion|unsure/i);
  });

  it("multiple soft falsifiers accumulate in counterArguments", () => {
    const r = antiModel({
      ...baseAntiInput,
      clvBeatRate: 0.45,
      clvSampleSize: 5,
      dispersion: ANTI_HIGH_DISPERSION_THRESHOLD,
    });
    expect(r.verdict).toBe("WEAKENED");
    expect(r.counterArguments.length).toBeGreaterThanOrEqual(2);
  });
});

// ── antiModel — SURVIVES ──────────────────────────────────────────────────────

describe("antiModel — SURVIVES", () => {
  it("all signals supportive → SURVIVES with no counter arguments", () => {
    const r = antiModel(baseAntiInput);
    expect(r.verdict).toBe("SURVIVES");
    expect(r.strongestCounter).toBeNull();
  });

  it("SURVIVES means counterArguments is empty", () => {
    const r = antiModel(baseAntiInput);
    expect(r.counterArguments).toHaveLength(0);
  });

  it("survivingIsNotSufficient: true even when SURVIVES", () => {
    // The key honesty check: surviving ≠ certainty
    const r = antiModel(baseAntiInput);
    expect(r.verdict).toBe("SURVIVES");
    expect(r.survivingIsNotSufficient).toBe(true);
  });
});

// ── antiModel — LEAN edge ─────────────────────────────────────────────────────

describe("antiModel — LEAN edge handling", () => {
  it("LEAN edge with good everything → SURVIVES (LEAN is not PASS)", () => {
    const r = antiModel({ ...baseAntiInput, edgeDecision: "LEAN" });
    expect(r.verdict).toBe("SURVIVES");
  });
});

// ── antiModel — edge cases ────────────────────────────────────────────────────

describe("antiModel — edge cases and missing inputs", () => {
  it("uncalibrated alone (no strong gravity) → WEAKENED (no CLV history)", () => {
    const r = antiModel({
      ...baseAntiInput,
      calibrated: false,
      marketGravityAgainstUs: 30, // below strong threshold
    });
    // Not hard-falsified, but CLV history may still weaken it
    expect(["WEAKENED", "SURVIVES"]).toContain(r.verdict);
  });

  it("undefined optional fields do not crash", () => {
    const minimal: AntiModelInput = {
      edgeDecision: "SPEAK",
      agreement: "CONFIRMS",
      calibrated: true,
    };
    expect(() => antiModel(minimal)).not.toThrow();
  });

  it("null optional fields treated as absent (no fabricated falsifiers)", () => {
    const r = antiModel({
      ...baseAntiInput,
      marketGravityAgainstUs: null,
      clvBeatRate: null,
      clvSampleSize: null,
      dispersion: null,
    });
    // clvBeatRate null → "no CLV history" weak falsifier fires
    expect(r.verdict).toBe("WEAKENED");
  });
});
