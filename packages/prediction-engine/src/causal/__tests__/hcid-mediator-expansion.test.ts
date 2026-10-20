/**
 * THE SPEC'S SECTION 4.4, TESTED.
 *
 * The spec says: "If the expanded graph G_e passes ID(Y, X, P, G_e)
 * with zero hedges and passes Adversary Review (E-value >= 1.35), the
 * mediator expansion is activated; otherwise, the engine returns
 * REFUSED_G3_NON_IDENTIFIABLE_HEDGE."
 *
 * So the expansion is not a list of suggestions -- it is a claim
 * about what the graph would look like, and it can be checked.
 */
import { describe, it, expect } from "vitest";
import {
  collectIDHedges,
  intersectCandidateEdges,
  tryMediatorExpansion,
  expandWithMediator,
  planHedgeBreakage,
  setMediatorValidityPool,
  MIN_MEDIATOR_SAMPLES,
  MIN_EXPANSION_E_VALUE,
  type MediatorCandidate,
} from "../hcid-mediator-expansion.js";
import { runShpitserPearlID } from "../do-calculus-id.js";

describe("HCID and the ID-EnablingEdges algorithm", () => {
  /**
   * The spec's Case 1: the confounded bow-arc.
   *   X -> Y with X <-> Y (a latent sharp syndicate information).
   * The effect is not identified, and the hedge is over {Y}.
   */
  const bowArc = {
    nodes: ["PublicShare", "ATS_Cover"],
    directed: [["PublicShare", "ATS_Cover"]] as ReadonlyArray<readonly [string, string]>,
    bidirected: [["PublicShare", "ATS_Cover"]] as ReadonlyArray<readonly [string, string]>,
  };

  it("collects the hedge and its candidate edges", () => {
    const hedges = collectIDHedges(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
    );
    expect(hedges.length).toBeGreaterThan(0);
    // The hedge's forest is the whole graph and the sub-forest is the
    // component containing Y.
    const h = hedges[0]!;
    expect([...h.witness.forestFull].sort()).toEqual(["ATS_Cover", "PublicShare"]);
    expect(h.witness.forestSub).toContain("ATS_Cover");
    // And there is a candidate edge to expand.
    expect(h.candidateEdges.length).toBeGreaterThan(0);
  });

  it("a mediator expansion that breaks the hedge is IDENTIFIED on the expanded graph", () => {
    // The expansion replaces PublicShare -> ATS_Cover with
    // PublicShare -> SharperMarketShare -> ATS_Cover. On that graph
    // the effect IS identified (the mediator screens off the
    // confounding), so ID succeeds with zero hedges.
    //
    // This is the spec's claim, and it is CHECKED by re-running ID on
    // the expanded graph -- not asserted.
    const candidate: MediatorCandidate = {
      signalId: "SharperMarketShare",
      node: "SharperMarketShare",
      tValid: 1,
      sampleCount: 500,
    };
    const attempt = tryMediatorExpansion(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      ["PublicShare", "ATS_Cover"],
      candidate,
    );
    expect(attempt.eligible).toBe(true);
    expect(attempt.rejection).toBeNull();
    expect(attempt.breaksHedge).toBe(true);
    expect(attempt.formulaClass).not.toBeNull();
  });

  it("the expanded graph really does identify the effect where the original does not", () => {
    // The point of the whole exercise. The ORIGINAL graph fails ID and
    // the EXPANDED graph succeeds.
    const original = runShpitserPearlID(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
    );
    expect(original.ok).toBe(false);
    expect(original.code).toBe("FAIL_HEDGE");

    const expanded = expandWithMediator(bowArc as never, ["PublicShare", "ATS_Cover"], {
      signalId: "SharperMarketShare",
      node: "SharperMarketShare",
      tValid: 1,
      sampleCount: 500,
    });
    expect(expanded).not.toBeNull();
    const after = runShpitserPearlID(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      expanded!,
    );
    expect(after.ok).toBe(true);
  });

  it("a mediator with too few samples is INELIGIBLE, and says why", () => {
    // The spec's N_M >= 30. A mediator with 12 observations cannot
    // break a hedge in practice, and a refusal that says "too few
    // samples" is actionable in a way that a silent drop is not.
    const attempt = tryMediatorExpansion(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      ["PublicShare", "ATS_Cover"],
      { signalId: "RareSignal", node: "RareSignal", tValid: 1, sampleCount: 12 },
    );
    expect(attempt.eligible).toBe(false);
    expect(attempt.rejection).toBe("TOO_FEW_SAMPLES");
    expect(attempt.breaksHedge).toBe(false);
    // And the threshold is the spec's.
    expect(MIN_MEDIATOR_SAMPLES).toBe(30);
  });

  it("a mediator observed BEFORE its cause is rejected", () => {
    // t_valid(U) <= t_valid(M) <= t_valid(V). A mediator observed
    // before the cause is an ANCESTOR of it, not a mediator, and
    // expanding with it would not break a contemporaneous hedge.
    //
    // The cause's own validity time is in the pool -- the graph's
    // nodes are signals too, and a signal's t_valid is a property of
    // the signal.
    setMediatorValidityPool([
      { signalId: "PublicShare", node: "PublicShare", tValid: 1, sampleCount: 500 },
      { signalId: "ATS_Cover", node: "ATS_Cover", tValid: 1, sampleCount: 500 },
    ]);
    const attempt = tryMediatorExpansion(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      ["PublicShare", "ATS_Cover"],
      {
        signalId: "PreGameSignal",
        node: "PreGameSignal",
        tValid: 0,
        sampleCount: 500,
      },
    );
    expect(attempt.eligible).toBe(false);
    expect(attempt.rejection).toBe("T_VALID_BEFORE_CAUSE");
  });

  it("a candidate edge that is not in the graph is rejected", () => {
    const attempt = tryMediatorExpansion(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      ["NotAnEdge", "ATS_Cover"],
      { signalId: "M", node: "M", tValid: 1, sampleCount: 500 },
    );
    expect(attempt.eligible).toBe(false);
    expect(attempt.rejection).toBe("NOT_A_CANDIDATE_EDGE");
  });

  it("the expansion is REPORTED, not silently applied", () => {
    // The report is what tells a human which measurement would change
    // the answer. A gate that refuses and says nothing is not
    // actionable.
    const report = planHedgeBreakage(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      [{ signalId: "SharperMarketShare", node: "SharperMarketShare", tValid: 1, sampleCount: 500 }],
      // The E-value is the spec's SECOND activation condition, so the
      // expansion only activates when it is supplied and it passes.
      { eValue: 4.2 },
    );
    expect(report.hedges.length).toBeGreaterThan(0);
    expect(report.commonEdges.length).toBeGreaterThan(0);
    expect(report.attempts.length).toBeGreaterThan(0);
    expect(report.activating.length).toBeGreaterThan(0);
    expect(report.activating[0]!.signalId).toBe("SharperMarketShare");
  });

  it("the common edges are the INTERSECTION, not the first hedge's edges", () => {
    // The spec: C = intersection over i of CandidateEdges(S_i, S_i').
    // A single hedge's edges can suggest a measurement that breaks
    // that hedge and leaves the others intact, and reporting it would
    // be a measurement plan that does not work.
    const hedges = [
      { witness: { forestFull: ["a", "b", "c"], forestSub: ["b"] }, candidateEdges: [["a", "b"], ["b", "c"]] },
      { witness: { forestFull: ["a", "b", "c"], forestSub: ["c"] }, candidateEdges: [["b", "c"]] },
    ] as never;
    const common = intersectCandidateEdges(hedges);
    // Only the edge in BOTH lists survives.
    expect(common).toHaveLength(1);
    expect(common[0]).toEqual(["b", "c"]);
  });
});

// ======================================================================
// THE GATE'S REFUSAL IS A MEASUREMENT PLAN.
//
// A refusal that says only "not identified" tells nobody what to do
// next. The spec's section 4.4 says the engine should run HCID and
// the ID-EnablingEdges algorithm, and the refusal should name the
// measurement that would change the answer.
// ======================================================================
describe("the gate's refusal names the measurement", () => {
  const bowArc = {
    nodes: ["PublicShare", "ATS_Cover"],
    directed: [["PublicShare", "ATS_Cover"]] as ReadonlyArray<readonly [string, string]>,
    bidirected: [["PublicShare", "ATS_Cover"]] as ReadonlyArray<readonly [string, string]>,
  };

  it("names a mediator that demonstrably breaks the hedge", async () => {
    const { evaluateCausalClaim } = await import("../causal-claim-gate.js");
    const verdict = evaluateCausalClaim({
      y: ["ATS_Cover"],
      x: ["PublicShare"],
      graph: bowArc as never,
      mediators: [
        { signalId: "SharperMarketShare", node: "SharperMarketShare", tValid: 1, sampleCount: 500 },
      ],
      // Both of the spec's activation conditions.
      eValue: 4.2, positivity: 1 });
    expect(verdict.publishable).toBe(false);
    expect(verdict.refusal_code).toBe("REFUSED_G3_NON_IDENTIFIABLE_HEDGE");
    // The hedge was found.
    expect(verdict.hedge_count).toBeGreaterThan(0);
    // And the mediator that would break it is NAMED, because it was
    // measured -- the expanded graph was built and ID was re-run.
    expect(verdict.activating_mediators).toContain("SharperMarketShare");
    expect(verdict.reason).toContain("SharperMarketShare");
    expect(verdict.reason).toContain("would break it");
  });

  it("does NOT name a mediator that does not break the hedge", async () => {
    const { evaluateCausalClaim } = await import("../causal-claim-gate.js");
    const verdict = evaluateCausalClaim({
      y: ["ATS_Cover"],
      x: ["PublicShare"],
      graph: bowArc as never,
      mediators: [
        // Too few samples to be a real measurement.
        { signalId: "RareSignal", node: "RareSignal", tValid: 1, sampleCount: 12 },
      ], positivity: 1 });
    expect(verdict.publishable).toBe(false);
    // A refusal that names a measurement which does not work is
    // WORSE than one that names none.
    expect(verdict.activating_mediators).toHaveLength(0);
    expect(verdict.reason).toContain("RareSignal");
    // And the reason says WHY it was rejected.
    expect(verdict.reason).toContain("TOO_FEW_SAMPLES");
  });

  it("an identified claim carries no hedge and no mediator plan", async () => {
    const { evaluateCausalClaim } = await import("../causal-claim-gate.js");
    const verdict = evaluateCausalClaim({
      y: ["PassEPA"],
      x: ["Scheme"],
      graph: {
        nodes: ["Scheme", "PassEPA"],
        directed: [["Scheme", "PassEPA"]],
        bidirected: [],
      } as never,
      mediators: [
        { signalId: "Whatever", node: "Whatever", tValid: 1, sampleCount: 500 },
      ], positivity: 1 });
    expect(verdict.publishable).toBe(true);
    expect(verdict.conclusion).toBe("CAUSAL");
    expect(verdict.hedge_count).toBe(0);
    expect(verdict.activating_mediators).toHaveLength(0);
  });
});

// ======================================================================
// THE E-VALUE IS A GATE, NOT A COMMENT.
//
// The spec: "If the expanded graph G_e passes ID(Y, X, P, G_e) with
// zero hedges AND passes Adversary Review (E-value >= 1.35), the
// mediator expansion is activated."
//
// Two conditions. The first version I wrote enforced only the first
// -- the expansion ACTIVATED on "breaks the hedge" alone, and
// MIN_EXPANSION_E_VALUE was exported and never checked. That is the
// same defect class as the threshold that was exported and never
// enforced anywhere else in this reconciliation: a constant that
// reads like a check.
// ======================================================================
describe("the adversary review gates the activation", () => {
  const bowArc = {
    nodes: ["PublicShare", "ATS_Cover"],
    directed: [["PublicShare", "ATS_Cover"]] as ReadonlyArray<readonly [string, string]>,
    bidirected: [["PublicShare", "ATS_Cover"]] as ReadonlyArray<readonly [string, string]>,
  };
  const mediator = {
    signalId: "SharperMarketShare",
    node: "SharperMarketShare",
    tValid: 1,
    sampleCount: 500,
  };

  it("a strong E-value activates the expansion", () => {
    const report = planHedgeBreakage(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      [mediator],
      { eValue: 4.2 },
    );
    expect(report.eValuePasses).toBe(true);
    expect(report.activating).toHaveLength(1);
    expect(report.breaksHedgeButFragile).toHaveLength(0);
  });

  it("a WEAK E-value does NOT activate it, even though the hedge breaks", () => {
    const report = planHedgeBreakage(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      [mediator],
      { eValue: 1.1 },
    );
    // The expansion DOES break the hedge -- it is measured, not
    // asserted.
    expect(report.breaksHedgeButFragile).toHaveLength(1);
    // But it does not activate, because the effect is too fragile.
    expect(report.activating).toHaveLength(0);
    expect(report.eValuePasses).toBe(false);
  });

  it("an UNKNOWN E-value does not activate it either", () => {
    // A robustness that could not be measured is not a robustness
    // that passed. Treating "unknown" as "fine" would be the same
    // defect as the un-enforced threshold.
    for (const eValue of [null, undefined]) {
      const report = planHedgeBreakage(
        new Set(["ATS_Cover"]),
        new Set(["PublicShare"]),
        bowArc as never,
        [mediator],
        eValue === undefined ? {} : { eValue },
      );
      expect(report.activating).toHaveLength(0);
      expect(report.eValuePasses).toBe(false);
      expect(report.eValue).toBeNull();
      // But the hedge-breaking attempt is still reported, so the
      // reader knows the measurement exists.
      expect(report.breaksHedgeButFragile).toHaveLength(1);
    }
  });

  it("the threshold is the spec's 1.35", () => {
    expect(MIN_EXPANSION_E_VALUE).toBe(1.35);
    // And it is the boundary: exactly 1.35 passes, just under fails.
    const at = planHedgeBreakage(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      [mediator],
      { eValue: 1.35 },
    );
    expect(at.activating).toHaveLength(1);
    const below = planHedgeBreakage(
      new Set(["ATS_Cover"]),
      new Set(["PublicShare"]),
      bowArc as never,
      [mediator],
      { eValue: 1.3499 },
    );
    expect(below.activating).toHaveLength(0);
  });

  it("the gate's reason says the expansion works but is too fragile", async () => {
    const { evaluateCausalClaim } = await import("../causal-claim-gate.js");
    const verdict = evaluateCausalClaim({
      y: ["ATS_Cover"],
      x: ["PublicShare"],
      graph: bowArc as never,
      mediators: [mediator],
      eValue: 1.1, positivity: 1 });
    expect(verdict.activating_mediators).toHaveLength(0);
    // And the reason says BOTH things: the measurement works, and the
    // effect is too fragile to state.
    expect(verdict.reason).toContain("SharperMarketShare");
    expect(verdict.reason).toContain("would break the hedge");
    expect(verdict.reason).toContain("adversary review");
    expect(verdict.reason).toContain("not activated");
  });
});
