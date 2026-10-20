import { describe, expect, it } from "vitest";
import {
  ACI_LEARNING_RATE,
  ACI_REFUSAL,
  DEFAULT_TRACE_MISCOVERAGE,
  ITCR_REFUSAL,
  MAX_NODE_VALIDITY,
  MAX_TRACE_NONCONFORMITY,
  MIN_CALIBRATION_SET_SIZE,
  MIN_NODE_VALIDITY,
  computeConformalThreshold,
  computeTraceNonconformity,
  evaluateItcrTrace,
  observeOrcaOutcome,
  shaferVovkRank,
  updateAciAlpha,
  type ItcrGateHalt,
  type ItcrGateResult,
  type ItcrTrace,
  type ItcrTraceNode,
  type ReasoningLayer,
} from "../itcr-orca-gate.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function node(
  id: string,
  layer: ReasoningLayer,
  parents: readonly string[],
  validity: number,
): ItcrTraceNode {
  return { id, layer, parents, validity };
}

/** 20 scores, all 0.30: at eps=0.1 the rank is 19, so tau is 0.30. */
const CAL_30: readonly number[] = Array.from({ length: 20 }, () => 0.3);

/** 20 uniformly spaced scores 0.01 .. 0.20, so the rank-th pick is checkable. */
const CAL_SPREAD: readonly number[] = Array.from({ length: 20 }, (_, i) => (i + 1) / 100);

function expectHalt(result: ItcrGateResult): ItcrGateHalt {
  if (result.status !== "HALT") {
    throw new Error(`expected HALT, received ${result.status}: ${result.reason}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// The gate: allow / halt
// ---------------------------------------------------------------------------

describe("ITCR gate: halt-or-continue", () => {
  it("allows a trace whose alpha_ITCR is at or below tau_conformal", () => {
    // root contributes 0 (empty ancestor product); child contributes
    // 1 - 0.9 = 0.1, which is below tau = 0.30.
    const trace: ItcrTrace = {
      nodes: [node("a", "L2", [], 0.9), node("b", "L4", ["a"], 0.9)],
      conclusion_node_id: "b",
    };
    const result = evaluateItcrTrace({ trace, calibration_scores: CAL_30 });

    expect(result.status).toBe("ALLOW");
    if (result.status !== "ALLOW") {
      throw new Error(`expected ALLOW, received ${result.status}: ${result.reason}`);
    }
    expect(result.conformal_Stop_triggered).toBe(false);
    expect(result.refusal_code).toBeNull();
    expect(result.alpha_ITCR).toBeCloseTo(0.1, 12);
    expect(result.tau_conformal).toBeCloseTo(0.3, 12);
    expect(result.shafer_vovk_rank).toBe(19);
    expect(result.unbounded_prediction_set).toBe(false);
    expect(result.pruned_nodes).toEqual([]);
    expect(result.conformal_Stop_triggered).not.toBe(true);
  });

  it("halts with conformal_Stop_triggered = true when alpha_ITCR exceeds tau_conformal", () => {
    // alpha: root 0, mid 1-0.5 = 0.5, conclusion 1-0.5*0.9 = 0.55.
    const trace: ItcrTrace = {
      nodes: [
        node("root", "L2", [], 0.5),
        node("mid", "L4", ["root"], 0.9),
        node("concl", "L5", ["mid"], 0.9),
      ],
      conclusion_node_id: "concl",
    };
    const result = expectHalt(evaluateItcrTrace({ trace, calibration_scores: CAL_30 }));

    expect(result.conformal_Stop_triggered).toBe(true);
    expect(result.halt_reason).toBe("ABOVE_CONFORMAL_THRESHOLD");
    expect(result.alpha_ITCR).toBeCloseTo(0.55, 12);
    expect(result.tau_conformal).toBeCloseTo(0.3, 12);
    expect(result.offender_node_id).toBe("concl");
    // The offending branch is the conclusion itself, so pruning removes it.
    expect(result.pruned_nodes).toEqual(["concl"]);
    expect(result.alternative_subgraph.conclusion_survives).toBe(false);
    expect(result.alternative_subgraph.found).toBe(false);
  });

  it("prunes the offending branch and finds an alternative subgraph when the conclusion survives", () => {
    // "weakchain" scores 1 - 0.99*0.4 = 0.604 and sits OFF the conclusion's
    // ancestor path, so pruning it leaves the conclusion intact at 0.01.
    const trace: ItcrTrace = {
      nodes: [
        node("root", "L2", [], 0.99),
        node("weak", "L2", ["root"], 0.4),
        node("weakchain", "L4", ["weak"], 0.95),
        node("concl", "L5", ["root"], 0.95),
      ],
      conclusion_node_id: "concl",
    };
    const result = expectHalt(evaluateItcrTrace({ trace, calibration_scores: CAL_30 }));

    expect(result.offender_node_id).toBe("weakchain");
    expect(result.pruned_nodes).toEqual(["weakchain"]);
    expect(result.alternative_subgraph.found).toBe(true);
    expect(result.alternative_subgraph.conclusion_survives).toBe(true);
    expect(result.alternative_subgraph.surviving_nodes).toEqual(["concl", "root", "weak"]);
    expect(result.alternative_subgraph.alpha_after_prune).toBeCloseTo(0.01, 12);
  });

  it("halts above MAX_TRACE_NONCONFORMITY even when tau_conformal is higher", () => {
    // 1 - 0.05 = 0.95 > 0.9, while the calibration set's threshold is 0.99.
    const trace: ItcrTrace = {
      nodes: [node("root", "L2", [], 0.05), node("concl", "L5", ["root"], 0.9)],
      conclusion_node_id: "concl",
    };
    const permissive: readonly number[] = Array.from({ length: 20 }, () => 0.99);
    const result = expectHalt(evaluateItcrTrace({ trace, calibration_scores: permissive }));

    expect(result.alpha_ITCR).toBeCloseTo(0.95, 12);
    expect(result.alpha_ITCR).toBeGreaterThan(MAX_TRACE_NONCONFORMITY);
    expect(result.halt_reason).toBe("ABOVE_MAX_TRACE_NONCONFORMITY");
    expect(result.conformal_Stop_triggered).toBe(true);
    // No calibration set was consulted, and the verdict says so.
    expect(result.tau_conformal).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Shafer-Vovk arithmetic
// ---------------------------------------------------------------------------

describe("Shafer-Vovk rank and threshold", () => {
  it("computes rank as exactly ceil((n+1)(1-eps)) and picks that order statistic", () => {
    const n = 20;
    expect(shaferVovkRank(n, 0.1)).toBe(19); // ceil(21 * 0.9) = ceil(18.9)
    expect(shaferVovkRank(n, 0.05)).toBe(20); // ceil(21 * 0.95) = ceil(19.95)

    const threshold = computeConformalThreshold(CAL_SPREAD, 0.1);
    expect(threshold.ok).toBe(true);
    if (!threshold.ok) return;
    expect(threshold.rank).toBe(19);
    expect(threshold.unbounded).toBe(false);
    expect(threshold.threshold).toBeCloseTo(0.19, 12); // 19th smallest of 0.01..0.20
    expect(threshold.calibration_set_size).toBe(n);
  });

  it("reports the prediction set as UNBOUNDED when rank exceeds n, without clamping", () => {
    // eps = 0.02 over n = 20: ceil(21 * 0.98) = ceil(20.58) = 21 > 20.
    expect(shaferVovkRank(20, 0.02)).toBe(21);

    const threshold = computeConformalThreshold(CAL_SPREAD, 0.02);
    expect(threshold.ok).toBe(true);
    if (!threshold.ok) return;
    expect(threshold.rank).toBe(21);
    expect(threshold.unbounded).toBe(true);
    // The standard convention: the maximum score is reported, and labelled
    // as an unbounded set rather than presented as a 98% threshold.
    expect(threshold.threshold).toBeCloseTo(0.2, 12);
    expect(threshold.guarantee).toContain("UNBOUNDED");
    expect(threshold.guarantee).toContain("NOT a 98.0% conformal threshold");
  });

  it("refuses to certify a trace when the prediction set is unbounded", () => {
    const trace: ItcrTrace = {
      nodes: [node("root", "L2", [], 0.9), node("concl", "L5", ["root"], 0.9)],
      conclusion_node_id: "concl",
    };
    const result = evaluateItcrTrace({
      trace,
      calibration_scores: CAL_SPREAD,
      miscoverage: 0.02,
    });

    expect(result.status).toBe("REFUSED");
    expect(result.refusal_code).toBe(ITCR_REFUSAL.unboundedPredictionSet);
    expect(result.unbounded_prediction_set).toBe(true);
    expect(result.shafer_vovk_rank).toBe(21);
    expect(result.conformal_Stop_triggered).toBe(false);
    expect(result.reason).toContain("unbounded");
  });

  it("refuses a calibration set below MIN_CALIBRATION_SET_SIZE instead of using it", () => {
    const small = CAL_30.slice(0, MIN_CALIBRATION_SET_SIZE - 1);
    const threshold = computeConformalThreshold(small, DEFAULT_TRACE_MISCOVERAGE);
    expect(threshold.ok).toBe(false);
    if (threshold.ok) return;
    expect(threshold.refusal_code).toBe(ITCR_REFUSAL.calibrationSetTooSmall);

    const trace: ItcrTrace = {
      nodes: [node("root", "L2", [], 0.9), node("concl", "L5", ["root"], 0.9)],
      conclusion_node_id: "concl",
    };
    const result = evaluateItcrTrace({ trace, calibration_scores: small });
    expect(result.status).toBe("REFUSED");
    expect(result.refusal_code).toBe(ITCR_REFUSAL.calibrationSetTooSmall);
    expect(result.tau_conformal).toBeNull();
    expect(result.calibration_set_size).toBe(MIN_CALIBRATION_SET_SIZE - 1);
  });

  it("refuses a node whose validity falls outside the calibrated band", () => {
    const trace: ItcrTrace = {
      nodes: [
        node("root", "L2", [], 0.9),
        node("concl", "L5", ["root"], MIN_NODE_VALIDITY / 2),
      ],
      conclusion_node_id: "concl",
    };
    const result = evaluateItcrTrace({ trace, calibration_scores: CAL_30 });
    expect(result.status).toBe("REFUSED");
    expect(result.refusal_code).toBe(ITCR_REFUSAL.nodeValidityOutsideBand);
    expect(result.reason).toContain("concl");
  });
});

// ---------------------------------------------------------------------------
// The score itself
// ---------------------------------------------------------------------------

describe("ITCR score", () => {
  it("multiplies validity over PROPER ancestors, so a root contributes zero", () => {
    // a is a premise (empty product = 1), b sees 0.8, c sees 0.8 * 0.8.
    const trace: ItcrTrace = {
      nodes: [
        node("a", "L2", [], 0.8),
        node("b", "L3", ["a"], 0.8),
        node("c", "L5", ["b"], 0.8),
      ],
      conclusion_node_id: "c",
    };
    const score = computeTraceNonconformity(trace);
    const byId = new Map(score.per_node.map((n) => [n.node_id, n]));

    expect(byId.get("a")?.ancestors).toEqual([]);
    expect(byId.get("a")?.nonconformity).toBe(0);
    expect(byId.get("b")?.ancestors).toEqual(["a"]);
    expect(byId.get("b")?.nonconformity).toBeCloseTo(0.2, 12);
    expect(byId.get("c")?.ancestors).toEqual(["a", "b"]);
    expect(byId.get("c")?.nonconformity).toBeCloseTo(1 - 0.64, 12);
    expect(score.alpha_ITCR).toBeCloseTo(0.36, 12);
    expect(score.offender_node_id).toBe("c");
  });
});

// ---------------------------------------------------------------------------
// ORCA: node validity and ACI
// ---------------------------------------------------------------------------

describe("ORCA ACI update", () => {
  it("moves alpha UP when the realised error rate is below target", () => {
    const update = updateAciAlpha({ alpha_t: 0.1, target_miscoverage: 0.1, err_t: 0 });
    expect(update.status).toBe("UPDATED");
    if (update.status !== "UPDATED") return;
    expect(update.direction).toBe("UP");
    expect(update.learning_rate).toBe(ACI_LEARNING_RATE);
    expect(update.step).toBeCloseTo(0.005, 12);
    expect(update.alpha_next).toBeCloseTo(0.105, 12);
    expect(update.alpha_next).toBeGreaterThan(0.1);
  });

  it("moves alpha DOWN when the realised error rate is above target", () => {
    const update = updateAciAlpha({ alpha_t: 0.1, target_miscoverage: 0.1, err_t: 0.4 });
    expect(update.status).toBe("UPDATED");
    if (update.status !== "UPDATED") return;
    expect(update.direction).toBe("DOWN");
    expect(update.step).toBeCloseTo(-0.015, 12);
    expect(update.alpha_next).toBeCloseTo(0.085, 12);
    expect(update.alpha_next).toBeLessThan(0.1);
  });

  it("leaves alpha unchanged when the error rate hits the target exactly", () => {
    const update = updateAciAlpha({ alpha_t: 0.1, target_miscoverage: 0.1, err_t: 0.1 });
    expect(update.status).toBe("UPDATED");
    if (update.status !== "UPDATED") return;
    expect(update.direction).toBe("UNCHANGED");
    expect(update.step).toBe(0);
    expect(update.alpha_next).toBe(0.1);
  });

  it("rejects rather than clamps an ACI step that leaves (0,1)", () => {
    const update = updateAciAlpha({ alpha_t: 0.995, target_miscoverage: 0.1, err_t: 0 });
    expect(update.status).toBe("REJECTED");
    if (update.status !== "REJECTED") return;
    expect(update.refusal_code).toBe(ACI_REFUSAL.alphaOutOfRange);
    expect(update.reason).toContain("re-anchored");
  });

  it("updates node validity online and reports when the band clamps it", () => {
    const first = observeOrcaOutcome(
      { node_id: "n1", n_valid: 3, n_invalid: 0, validity: 0.5 },
      { node_id: "n1", realised: "VALID" },
    );
    expect(first.n_valid).toBe(4);
    expect(first.validity_after).toBeCloseTo(5 / 6, 12); // (4+1)/(4+2)
    expect(first.clamped).toBe(false);

    const many = observeOrcaOutcome(
      { node_id: "n2", n_valid: 200, n_invalid: 0, validity: 0.5 },
      { node_id: "n2", realised: "VALID" },
    );
    expect(many.clamped).toBe(true);
    expect(many.validity_after).toBe(MAX_NODE_VALIDITY);
  });
});

// ---------------------------------------------------------------------------
// Determinism and validation
// ---------------------------------------------------------------------------

describe("determinism and input validation", () => {
  it("returns identical verdicts for identical input, regardless of node order", () => {
    const nodes = [
      node("root", "L2", [], 0.99),
      node("weak", "L2", ["root"], 0.4),
      node("weakchain", "L4", ["weak"], 0.95),
      node("concl", "L5", ["root"], 0.95),
    ];
    const forward = evaluateItcrTrace({
      trace: { nodes, conclusion_node_id: "concl" },
      calibration_scores: CAL_30,
    });
    const again = evaluateItcrTrace({
      trace: { nodes, conclusion_node_id: "concl" },
      calibration_scores: CAL_30,
    });
    const reversed = evaluateItcrTrace({
      trace: { nodes: [...nodes].reverse(), conclusion_node_id: "concl" },
      calibration_scores: CAL_30,
    });

    const forwardHalt = expectHalt(forward);
    const reversedHalt = expectHalt(reversed);

    expect(again).toEqual(forward);
    expect(reversedHalt.alpha_ITCR).toBeCloseTo(forwardHalt.alpha_ITCR, 12);
    expect(reversedHalt.status).toBe(forwardHalt.status);
    expect(reversedHalt.offender_node_id).toBe(forwardHalt.offender_node_id);
    expect(reversedHalt.pruned_nodes).toEqual(forwardHalt.pruned_nodes);
  });

  it("throws on a malformed trace", () => {
    const good = node("root", "L2", [], 0.9);
    expect(() => computeTraceNonconformity({ nodes: [], conclusion_node_id: "x" })).toThrow();
    expect(() =>
      computeTraceNonconformity({
        nodes: [good, { ...good }],
        conclusion_node_id: "root",
      }),
    ).toThrow(/duplicate/);
    expect(() =>
      computeTraceNonconformity({
        nodes: [node("b", "L4", ["missing"], 0.9)],
        conclusion_node_id: "b",
      }),
    ).toThrow(/not in the trace/);
    expect(() =>
      computeTraceNonconformity({
        nodes: [node("a", "L2", ["b"], 0.9), node("b", "L4", ["a"], 0.9)],
        conclusion_node_id: "a",
      }),
    ).toThrow(/cycle/);
    expect(() =>
      computeTraceNonconformity({
        nodes: [node("a", "L2", [], Number.NaN)],
        conclusion_node_id: "a",
      }),
    ).toThrow(/finite/);
    expect(() =>
      computeTraceNonconformity({
        nodes: [node("a", "L2", [], 1)],
        conclusion_node_id: "a",
      }),
    ).toThrow(/strictly inside \(0,1\)/);
    expect(() =>
      computeTraceNonconformity({
        nodes: [node("a", "L2", [], 0.9)],
        conclusion_node_id: "nope",
      }),
    ).toThrow(/conclusion_node_id/);
  });

  it("throws on malformed calibration scores and miscoverage values", () => {
    expect(() => computeConformalThreshold(CAL_30, 0)).toThrow(/miscoverage/);
    expect(() => computeConformalThreshold(CAL_30, 1)).toThrow(/miscoverage/);
    expect(() => computeConformalThreshold(CAL_30, 0.2)).toThrow(/looser than the engine default/);
    expect(() => computeConformalThreshold(CAL_30, Number.NaN)).toThrow(/finite/);
    expect(() => computeConformalThreshold([0.1, 0.2], 0.1)).not.toThrow(); // refused, not thrown
    expect(() => computeConformalThreshold([Number.NaN], 0.1)).toThrow(/finite/);
    expect(() => computeConformalThreshold([1.5], 0.1)).toThrow(/\[0,1\]/);
    expect(() => shaferVovkRank(0, 0.1)).toThrow(/positive integer/);
    expect(() => shaferVovkRank(2.5, 0.1)).toThrow(/positive integer/);
  });

  it("throws on malformed ACI and ORCA arguments", () => {
    expect(() =>
      updateAciAlpha({ alpha_t: 0, target_miscoverage: 0.1, err_t: 0 }),
    ).toThrow(/alpha_t/);
    expect(() =>
      updateAciAlpha({ alpha_t: 0.1, target_miscoverage: 0.1, err_t: 1.4 }),
    ).toThrow(/err_t/);
    expect(() =>
      updateAciAlpha({
        alpha_t: 0.1,
        target_miscoverage: 0.1,
        err_t: 0,
        learning_rate: 0,
      }),
    ).toThrow(/learning_rate/);
    expect(() =>
      observeOrcaOutcome(
        { node_id: "n1", n_valid: 1, n_invalid: 0, validity: 0.5 },
        { node_id: "other", realised: "VALID" },
      ),
    ).toThrow(/node/);
    expect(() =>
      observeOrcaOutcome(
        { node_id: "n1", n_valid: -1, n_invalid: 0, validity: 0.5 },
        { node_id: "n1", realised: "VALID" },
      ),
    ).toThrow(/non-negative integer/);
  });
});
