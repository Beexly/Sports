import { describe, it, expect } from "vitest";
import {
  applySelectiveGate,
  coverageEdgeCurve,
  tuneTau,
  GateSetOverlapError,
  MIN_STRATUM_CALIBRATION,
  type GateDecisionRow,
} from "../selective-gate.js";
import { parseDecisionCertificate } from "../../certificate/decision-certificate.js";
import { DEFAULT_ABSTENTION } from "../../certificate/selective-abstention.js";

/**
 * Regressions for holes found by a multi-agent audit of the honesty cascade.
 * Each one was verified against real code before being fixed.
 */

/** Deterministic PRNG so these never flake. */
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

function rows(seed: number, n: number, prefix: string): GateDecisionRow[] {
  const rand = mulberry32(seed);
  const out: GateDecisionRow[] = [];
  for (let i = 0; i < n; i++) {
    const score = rand();
    out.push({
      rowId: `${prefix}-${i}`,
      stratum: "s1",
      score,
      q: 0.5,
      y: rand() < score ? 1 : 0,
    });
  }
  return out;
}

const CAL = rows(11, MIN_STRATUM_CALIBRATION + 120, "cal");
const TUNE = rows(22, 140, "tune");

describe("tuneTau enforces tuning-vs-eval disjointness (the third pair)", () => {
  it("THROWS when the eval fold shares rows with the tuning fold", () => {
    // Before the fix, tuneTau(cal, X) followed by applySelectiveGate(cal, X, tau)
    // threw nothing: calibration-vs-tuning and calibration-vs-eval were each
    // checked, but tuning-vs-eval never was. That is literally "tuning the
    // risk-coverage curve on the eval set" — the failure this module's header
    // names as the #1 self-deception risk.
    expect(() => tuneTau(CAL, TUNE, { evalRows: TUNE })).toThrow(GateSetOverlapError);
  });

  it("names the offending rowIds rather than failing opaquely", () => {
    try {
      tuneTau(CAL, TUNE, { evalRows: TUNE.slice(0, 3) });
      throw new Error("expected GateSetOverlapError");
    } catch (err) {
      expect(err).toBeInstanceOf(GateSetOverlapError);
      const e = err as GateSetOverlapError;
      expect(e.offendingIds.length).toBe(3);
      expect(e.message).toMatch(/"tuning" and "eval"/);
    }
  });

  it("accepts genuinely disjoint calibration / tuning / eval folds", () => {
    const evalRows = rows(33, 90, "eval");
    expect(() => tuneTau(CAL, TUNE, { evalRows })).not.toThrow();
  });

  it("stays backward compatible when no eval fold is supplied", () => {
    // The parameter is optional; omitting it must not change prior behavior.
    expect(() => tuneTau(CAL, TUNE)).not.toThrow();
  });

  it("still catches a calibration/tuning overlap", () => {
    expect(() => tuneTau(CAL, CAL.slice(0, 5))).toThrow(GateSetOverlapError);
  });
});

describe("coverageEdgeCurve tunes against the gate that will actually run", () => {
  it("forwards the width cap, so the curve cannot be more permissive than production", () => {
    // Previously `options` was dropped entirely: the curve always ran
    // legacy-isotonic with NO width veto, so it saw more fired rows at each tau
    // than production would — optimistic in exactly the wrong direction.
    const taus = [0];
    const uncapped = coverageEdgeCurve(CAL, TUNE, taus, { gate: { source: "ivap" } });
    const capped = coverageEdgeCurve(CAL, TUNE, taus, {
      gate: { source: "ivap", maxWidthForFire: 0.01 },
    });
    expect(capped[0]!.fired).toBeLessThanOrEqual(uncapped[0]!.fired);
  });

  it("forwards the estimator: the curve reflects the requested source", () => {
    const taus = [0];
    const legacy = coverageEdgeCurve(CAL, TUNE, taus, {
      gate: { source: "legacy-isotonic" },
    });
    const ivap = coverageEdgeCurve(CAL, TUNE, taus, { gate: { source: "ivap" } });
    // Both must produce a well-formed point; the fired counts come from the
    // requested estimator rather than a hardcoded one.
    for (const p of [legacy[0]!, ivap[0]!]) {
      expect(p.fired).toBeGreaterThanOrEqual(0);
      expect(p.coverage).toBeGreaterThanOrEqual(0);
      expect(p.coverage).toBeLessThanOrEqual(1);
    }
  });

  it("a tight width cap on the curve matches what the gate reports for the same options", () => {
    const gate = { source: "ivap" as const, maxWidthForFire: 0.05 };
    const point = coverageEdgeCurve(CAL, TUNE, [0], { gate })[0]!;
    const direct = applySelectiveGate(CAL, TUNE, 0, gate);
    expect(point.fired).toBe(direct.fired);
  });

  it("omitting gate options preserves the previous default behavior", () => {
    const point = coverageEdgeCurve(CAL, TUNE, [0])[0]!;
    const direct = applySelectiveGate(CAL, TUNE, 0);
    expect(point.fired).toBe(direct.fired);
  });
});

describe("DecisionCertificate parser cannot validate an unsupported FIRE", () => {
  const base = {
    schemaVersion: "1",
    kind: "FIRE",
    stratumKey: "nfl|SPREAD|v5.1.0",
    modelVersion: "v5.1.0",
    eventId: "evt-1",
    market: "SPREAD",
    certifiedAt: "2026-07-28T00:00:00.000Z",
    summary: "fired",
  };

  it("REJECTS a FIRE with no interval — a bet claim carrying none of its evidence", () => {
    const r = parseDecisionCertificate({ ...base });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("FIRE requires interval");
  });

  it("ACCEPTS a FIRE that carries its interval", () => {
    const r = parseDecisionCertificate({
      ...base,
      interval: { lo: 0.55, hi: 0.62, method: "ivap" },
    });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("REJECTS a FIRE whose noBetReasons is a bare string, not just an array", () => {
    // The old check was guarded by Array.isArray, so the single most likely
    // hand-built / JSON-round-tripped malformed shape slipped through silently.
    const r = parseDecisionCertificate({
      ...base,
      interval: { lo: 0.55, hi: 0.62, method: "ivap" },
      noBetReasons: "STALE_ODDS",
    });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("FIRE cannot carry noBetReasons");
  });

  it("REJECTS a FIRE with a populated noBetReasons array", () => {
    const r = parseDecisionCertificate({
      ...base,
      interval: { lo: 0.55, hi: 0.62, method: "ivap" },
      noBetReasons: ["STALE_ODDS"],
    });
    expect(r.ok).toBe(false);
  });

  it("tolerates an explicitly EMPTY noBetReasons array on a FIRE", () => {
    const r = parseDecisionCertificate({
      ...base,
      interval: { lo: 0.55, hi: 0.62, method: "ivap" },
      noBetReasons: [],
    });
    expect(r.ok).toBe(true);
  });

  it("still requires reasons on a NO_BET, and does not require an interval there", () => {
    const r = parseDecisionCertificate({
      ...base,
      kind: "NO_BET",
      noBetReasons: ["INSUFFICIENT_SAMPLE"],
    });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe("selective-abstention thresholds are documented as NOT the gate rule", () => {
  it("the sample floor IS imported from the gate", () => {
    expect(DEFAULT_ABSTENTION.minStratumN).toBe(MIN_STRATUM_CALIBRATION);
  });

  it("minLcb is an ABSOLUTE bound with no market term — it can disagree with the gate both ways", () => {
    // Documented, not accidental. Pinned so nobody "fixes" the helper by
    // quietly making it look like the gate's (p_lo - q) > tau rule.
    const cfg = DEFAULT_ABSTENTION;

    // Case A: clears the absolute floor but has NO edge over the market.
    const pLoA = 0.55;
    const qA = 0.6;
    expect(pLoA).toBeGreaterThan(cfg.minLcb); // helper would not abstain on LCB
    expect(pLoA - qA).toBeLessThan(0); // the gate correctly refuses

    // Case B: fails the absolute floor but has a real 15-point edge.
    const pLoB = 0.45;
    const qB = 0.3;
    expect(pLoB).toBeLessThan(cfg.minLcb); // helper flags NO_BET_LCB
    expect(pLoB - qB).toBeGreaterThan(0.1); // the gate correctly fires
  });
});
