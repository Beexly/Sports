import { describe, expect, it } from "vitest";
import type { GateDecisionRow } from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import {
  evaluateBoardGate,
  isFullyUncalibrated,
  type GateOutcomeCode,
} from "@/lib/board/gate-consumer";

/**
 * The first production consumer of the selective gate.
 *
 * The honesty-critical property is the distinction between:
 *   NO_BET_LCB              — we evaluated this and declined
 *   INSUFFICIENT_CALIBRATION — we never had enough history to evaluate it
 *
 * Collapsing those two into one "no bet" would let the product claim a
 * considered judgement where the truth is an absence of evidence. That is the
 * exact failure this suite exists to prevent, so it is tested from both sides.
 */

/** Deterministic — no RNG, so these never flake. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Calibration rows whose score genuinely predicts the outcome. */
function calRows(n: number, stratum: string, seed = 1): GateDecisionRow[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const score = rand();
    return {
      rowId: `${stratum}-cal-${i}`,
      score,
      q: 0.5,
      stratum,
      y: (rand() < score ? 1 : 0) as 0 | 1,
    };
  });
}

function candidates(n: number, stratum: string, seed = 2): GateDecisionRow[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const score = rand();
    return {
      rowId: `${stratum}-eval-${i}`,
      score,
      q: 0.5,
      stratum,
      y: (rand() < score ? 1 : 0) as 0 | 1,
    };
  });
}

const codes = (r: { outcomes: readonly { code: GateOutcomeCode }[] }) =>
  new Set(r.outcomes.map((o) => o.code));

describe("board gate consumer — absence of evidence is never a confident refusal", () => {
  it("reports INSUFFICIENT_CALIBRATION when the stratum is under the threshold", () => {
    // 40 settled rows is well under MIN_STRATUM_CALIBRATION (100).
    const evaluation = evaluateBoardGate(calRows(40, "nfl|MONEYLINE"), candidates(10, "nfl|MONEYLINE"), 0);

    expect(codes(evaluation)).toEqual(new Set(["INSUFFICIENT_CALIBRATION"]));
    expect(isFullyUncalibrated(evaluation)).toBe(true);
    expect(evaluation.uncalibratedStrata).toEqual([
      { stratum: "nfl|MONEYLINE", calibrationRows: 40 },
    ]);
  });

  it("does NOT report INSUFFICIENT_CALIBRATION once the stratum is calibrated", () => {
    const evaluation = evaluateBoardGate(calRows(400, "nfl|MONEYLINE"), candidates(40, "nfl|MONEYLINE"), 0);

    expect(codes(evaluation)).not.toContain("INSUFFICIENT_CALIBRATION");
    expect(isFullyUncalibrated(evaluation)).toBe(false);
    expect(evaluation.uncalibratedStrata).toEqual([]);
  });

  it("classifies per-stratum, not globally — a calibrated stratum is unaffected by an uncalibrated one", () => {
    const evaluation = evaluateBoardGate(
      [...calRows(400, "nfl|MONEYLINE"), ...calRows(5, "nba|TOTAL", 7)],
      [...candidates(20, "nfl|MONEYLINE"), ...candidates(5, "nba|TOTAL", 8)],
      0,
    );

    const nba = evaluation.outcomes.filter((o) => o.stratum === "nba|TOTAL");
    const nfl = evaluation.outcomes.filter((o) => o.stratum === "nfl|MONEYLINE");

    expect(nba.every((o) => o.code === "INSUFFICIENT_CALIBRATION")).toBe(true);
    expect(nfl.every((o) => o.code !== "INSUFFICIENT_CALIBRATION")).toBe(true);
    expect(evaluation.uncalibratedStrata.map((s) => s.stratum)).toEqual(["nba|TOTAL"]);
  });
});

describe("board gate consumer — fired rows carry the gate's real numbers", () => {
  it("FIRE outcomes exist and carry lcbEdge, width, and the estimator", () => {
    const evaluation = evaluateBoardGate(calRows(400, "nfl|MONEYLINE"), candidates(60, "nfl|MONEYLINE"), 0);

    const fired = evaluation.outcomes.filter((o) => o.code === "FIRE");
    expect(fired.length).toBeGreaterThan(0);

    for (const f of fired) {
      expect(Number.isFinite(f.lcbEdge)).toBe(true);
      expect(Number.isFinite(f.width)).toBe(true);
      expect(f.width).toBeGreaterThanOrEqual(0);
      expect(f.multiprobSource).toBe("legacy-isotonic");
    }
  });

  it("never claims FIRE for a row the gate did not actually fire", () => {
    const evaluation = evaluateBoardGate(calRows(400, "nfl|MONEYLINE"), candidates(60, "nfl|MONEYLINE"), 0);

    const firedIds = new Set(evaluation.report.decisions.map((d) => d.rowId));
    for (const o of evaluation.outcomes) {
      expect(o.code === "FIRE").toBe(firedIds.has(o.rowId));
    }
  });

  it("an unreachable tau fires nothing and every outcome is a declared refusal", () => {
    const evaluation = evaluateBoardGate(calRows(400, "nfl|MONEYLINE"), candidates(30, "nfl|MONEYLINE"), 0.99);

    expect(evaluation.report.fired).toBe(0);
    expect(codes(evaluation)).toEqual(new Set(["NO_BET_LCB"]));
  });
});

describe("board gate consumer — width veto surfaces as its own reason", () => {
  it("reports NO_BET_WIDTH when a width cap suppresses rows that cleared tau", () => {
    const evaluation = evaluateBoardGate(
      calRows(400, "nfl|MONEYLINE"),
      candidates(60, "nfl|MONEYLINE"),
      0,
      { source: "ivap", maxWidthForFire: 0 },
    );

    expect(evaluation.report.widthNoBets).toBeGreaterThan(0);
    expect(codes(evaluation)).toContain("NO_BET_WIDTH");
  });

  it("without a width cap, no outcome is ever attributed to width", () => {
    const evaluation = evaluateBoardGate(calRows(400, "nfl|MONEYLINE"), candidates(60, "nfl|MONEYLINE"), 0);

    expect(evaluation.report.widthNoBets).toBe(0);
    expect(codes(evaluation)).not.toContain("NO_BET_WIDTH");
  });
});

describe("board gate consumer — every outcome carries user-safe language", () => {
  it("each outcome has a non-empty plain-language reason", () => {
    const evaluation = evaluateBoardGate(calRows(40, "nfl|MONEYLINE"), candidates(6, "nfl|MONEYLINE"), 0);
    for (const o of evaluation.outcomes) {
      expect(o.reason.length).toBeGreaterThan(20);
    }
  });

  it("refusal reasons never imply a performance claim", () => {
    const evaluation = evaluateBoardGate(calRows(400, "nfl|MONEYLINE"), candidates(30, "nfl|MONEYLINE"), 0.99);
    for (const o of evaluation.outcomes) {
      // No win rates, percentages, or "proven"-style language may leak into a
      // reason string — these render publicly on every tier.
      expect(o.reason).not.toMatch(/\d+(\.\d+)?%/);
      expect(o.reason.toLowerCase()).not.toContain("proven");
      expect(o.reason.toLowerCase()).not.toContain("guaranteed");
    }
  });
});

describe("board gate consumer — excluded candidates are reported, never dropped", () => {
  it("emits NOT_EVALUATED_MISSING_INPUTS with the missing field named", () => {
    const evaluation = evaluateBoardGate(
      calRows(400, "nfl|MONEYLINE"),
      candidates(10, "nfl|MONEYLINE"),
      0,
      {},
      [{ rowId: "no-odds-1", stratum: "nfl|SPREAD", missing: ["q (no two-sided odds)"] }],
    );

    const excluded = evaluation.outcomes.filter(
      (o) => o.code === "NOT_EVALUATED_MISSING_INPUTS",
    );
    expect(excluded).toHaveLength(1);
    expect(excluded[0]!.rowId).toBe("no-odds-1");
    expect(excluded[0]!.reason).toContain("q (no two-sided odds)");
    // It must NOT read as a judgement about the game.
    expect(excluded[0]!.reason).toContain("not a judgement");
  });

  it("an excluded candidate never appears as FIRE or as a refusal", () => {
    const evaluation = evaluateBoardGate(
      calRows(400, "nfl|MONEYLINE"),
      candidates(10, "nfl|MONEYLINE"),
      0,
      {},
      [{ rowId: "no-odds-1", stratum: "nfl|SPREAD", missing: ["q"] }],
    );

    const row = evaluation.outcomes.find((o) => o.rowId === "no-odds-1")!;
    expect(row.code).toBe("NOT_EVALUATED_MISSING_INPUTS");
    expect(row.lcbEdge).toBeUndefined();
    expect(row.width).toBeUndefined();
    // And the gate itself never saw it.
    expect(evaluation.report.decisions.some((d) => d.rowId === "no-odds-1")).toBe(false);
  });

  it("missing-input rows do NOT make the board look like a calibration problem", () => {
    // Every gate-reaching row fires; the only other rows are exclusions.
    const evaluation = evaluateBoardGate(
      calRows(400, "nfl|MONEYLINE"),
      candidates(40, "nfl|MONEYLINE"),
      0,
      {},
      [{ rowId: "x1", stratum: "nfl|SPREAD", missing: ["q"] }],
    );

    expect(isFullyUncalibrated(evaluation)).toBe(false);
  });

  it("stays true-to-cause when gate-reaching rows ARE all uncalibrated", () => {
    const evaluation = evaluateBoardGate(
      calRows(10, "nfl|MONEYLINE"),
      candidates(5, "nfl|MONEYLINE"),
      0,
      {},
      [{ rowId: "x1", stratum: "nfl|SPREAD", missing: ["q"] }],
    );

    expect(isFullyUncalibrated(evaluation)).toBe(true);
  });
});
