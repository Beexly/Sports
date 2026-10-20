/**
 * @file __tests__/gate-g3-integration.test.ts
 * GATE G3 must block a causal claim through the REAL intervention path.
 *
 * The gate module's own tests prove that `evaluateCausalClaim` refuses.
 * That is not enough: the question is whether the refusal REACHES the
 * engine's causal path. A gate that is correct in isolation and never
 * consulted is the same defect as the L1-L4 admission gate that
 * reported 67.4% admission by checking shape.
 *
 * So these tests drive `runInterventionTest` -- the function the causal
 * promotion sweep actually calls -- and assert that an unidentified
 * effect cannot come back as a causal PASS.
 *
 * The mock DB returns enough rows for the test to reach the gate, so a
 * test that passes because the function bailed out early would be
 * vacuous. Each test asserts on the reason string as well as the
 * verdict, so a refusal for the WRONG reason does not pass.
 */
import { describe, it, expect } from "vitest";
import { runInterventionTest } from "../literature-retrieval.js";

/**
 * A mock DB that answers the queries `runInterventionTest` makes.
 *
 * The residual rows are numerous and strongly separated, so the test
 * would reach a statistical PASS if the gate did not stop it first.
 * That is the point: the gate must be what makes the difference.
 */
function makeDb(opts?: { readonly residuals?: number[]; readonly cause?: string; readonly effect?: string }) {
  const inserted: Array<{ sql: string; params: unknown[] }> = [];
  const residuals = opts?.residuals ?? [
    ...Array(20).fill(0.4),
    ...Array(20).fill(-0.4),
  ];
  const db = {
    query: async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM lit.causal_edge")) {
        return {
          rows: [
            {
              id: "edge1",
              premise_id: "p1",
              status: "promoted",
              cause_signal: opts?.cause ?? "Scheme",
              effect_signal: opts?.effect ?? "PassEPA",
            },
          ],
        };
      }
      if (sql.includes("FROM lit.residual")) {
        return {
          rows: residuals.map((residual, i) => ({
            residual,
            // The treated arm (i < 20) is 90% correct and the control
            // arm is 10% correct. The rates must DIFFER, because the
            // E-value is computed from the OUTCOME RATE RATIO -- a
            // mock with the same rate in both arms has a rate ratio
            // of 1, an E-value of 1, and no effect to be robust
            // about. The test would then be measuring the gate
            // refusing everything, not the gate working.
            outcome_correct: i < 20 ? i % 10 !== 0 : i % 10 === 0,
            // The treated rows must be STRICTLY above doValue and the
            // control rows STRICTLY below it. The split test is
            // `activation_score >= doValue`, so a control row exactly at
            // doValue would land in the treated arm and leave the
            // control arm empty -- the test would then stop for the
            // wrong reason and prove nothing.
            activation_score: i < 20 ? 0.9 : 0.0001,
            similarity: 0.5,
          })),
        };
      }
      inserted.push({ sql, params });
      return { rows: [{ id: "test1" }] };
    },
  } as never;
  return { db, inserted };
}

describe("GATE G3 through the real intervention path", () => {
  it("refuses a causal PASS when the effect is not identified in the graph", async () => {
    const { db, inserted } = makeDb();

    // The spec's Case 1: a confounded bow-arc. X -> Y with a latent
    // confounder X <-> Y. The effect is NOT identified, so no causal
    // verdict may be issued.
    const res = await runInterventionTest(db, "edge1", 0.001, {
      graph: { nodes: ["Scheme", "PassEPA"], directed: [["Scheme", "PassEPA"]], bidirected: [["Scheme", "PassEPA"]] },
    });

    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.g3_conclusion).toBe("ASSOCIATION_ONLY");
    expect(res.g3_refusal_code).toBe("REFUSED_G3_NON_IDENTIFIABLE_HEDGE");
    expect(res.reason).toContain("REFUSED_G3_NON_IDENTIFIABLE_HEDGE");
    // No statistical test may have been recorded: the gate stopped it.
    expect(inserted.some((x) => x.sql.includes("INSERT INTO lit.intervention_test"))).toBe(false);
  });

  it("allows a causal verdict when the effect IS identified in the graph", async () => {
    const { db, inserted } = makeDb();

    // A plain DAG: the effect is identified by the back-door criterion.
    const res = await runInterventionTest(db, "edge1", 0.001, {
      graph: { nodes: ["Scheme", "PassEPA"], directed: [["Scheme", "PassEPA"]], bidirected: [] },
    });

    // The gate let it through, so the statistical test ran.
    expect(res.g3_conclusion).toBe("CAUSAL");
    expect(res.g3_refusal_code).toBeNull();
    expect(inserted.some((x) => x.sql.includes("INSERT INTO lit.intervention_test"))).toBe(true);
    // The residuals are strongly separated, so the test is a PASS.
    expect(res.verdict).toBe("PASS");
  });

  it("refuses when NO graph is supplied (prevents an unchecked effect posing as a verified one)", async () => {
    const { db, inserted } = makeDb();

    const res = await runInterventionTest(db, "edge1", 0.001);

    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.g3_conclusion).toBe("ASSOCIATION_ONLY");
    expect(res.g3_refusal_code).toBe("REFUSED_G3_NO_GRAPH");
    expect(inserted.some((x) => x.sql.includes("INSERT INTO lit.intervention_test"))).toBe(false);
  });

  it("still refuses an edge that is not promoted, before the gate is consulted", async () => {
    const db = {
      query: async (sql: string) => {
        if (sql.includes("FROM lit.causal_edge")) {
          return { rows: [{ id: "e1", premise_id: "p1", status: "retired", cause_signal: "S", effect_signal: "Y" }] };
        }
        return { rows: [] };
      },
    } as never;

    const res = await runInterventionTest(db, "edge1", 0.001, {
      graph: { nodes: ["S", "Y"], directed: [["S", "Y"]], bidirected: [] },
    });
    expect(res.verdict).toBe("FAIL");
    expect(res.reason).toContain("not promoted");
  });

  // ======================================================================
  // THE CONDITIONAL PATH. The spec's section 4.1: almost every sports
  // question is P(y | do(x), z), not P(y | do(x)), because the
  // situational context is OBSERVED, not intervened upon.
  //
  // If the shock path could not carry a conditioning set, then every
  // real query would silently be answered as the UNCONDITIONAL one --
  // and the conditional question is not a special case of it. Adding
  // Z to the graph can REMOVE an identification: a set that is
  // d-separated without conditioning can be connected once you
  // condition on it, and then the effect stops being identified.
  //
  // The test below uses the spec's Case 3 graph, which is the point:
  //   W -> Z -> X -> Y,  with W <-> X and Z <-> Y
  // ======================================================================
  it("carries the conditioning set Z, and Z changes the estimand", async () => {
    // The confounded graph: Wind is a back-door confounder of Scheme
    // and PassEPA.
    //   Scheme -> PassEPA,  Wind -> PassEPA,  Scheme <-> Wind
    //
    // The node list is in topological order, which the ADMG type
    // REQUIRES -- a graph whose node list is not a topological order is
    // rejected outright, because every ancestor and every c-factor
    // computation depends on the order.
    const graph = {
      nodes: ["Scheme", "Wind", "PassEPA"],
      directed: [["Wind", "PassEPA"], ["Scheme", "PassEPA"]],
      bidirected: [["Scheme", "Wind"]],
    };

    const { db } = makeDb();

    // Unconditional: identified, but by FRONT-DOOR-style c-component
    // factorization -- the hedge over {PassEPA} is broken by
    // marginalizing, so the estimand is a weighted sum over the
    // confounder, not a plain adjustment.
    const uncond = await runInterventionTest(db, "edge1", 0.001, { graph });
    expect(uncond.g3_conclusion).toBe("CAUSAL");
    expect(uncond.g3_formula_class).toBe("FRONT_DOOR_OR_C_COMPONENT_FACTORIZATION");

    // CONDITIONAL on Wind -- the very node in the middle of the chain.
    // This is the question the spec's section 4.1 says is the real one:
    // P(Y | do(X), Z), with the situational context OBSERVED.
    //
    // And the conditional is NOT a special case of the unconditional:
    // conditioning on the confounder reduces the formula to the
    // back-door adjustment P(PassEPA | Scheme, Wind). Different
    // estimand, different formula class, different answer.
    const cond = await runInterventionTest(db, "edge1", 0.001, {
      graph,
      z: ["Wind"],
    });
    expect(cond.g3_conclusion).toBe("CAUSAL");
    expect(cond.g3_formula_class).toBe("CONDITIONAL_BACK_DOOR_OR_DIRECT_C_FACTOR");
    expect(cond.g3_formula).toBe("P(PassEPA|Scheme,Wind)");
  });

  it("the conditional path uses IDC, and the unconditional path does not", async () => {
    // The spec's Case 3 graph: the 4-node napkin/bugle graph.
    //   W -> Z -> X -> Y,  with W <-> X and Z <-> Y
    const graph = {
      nodes: ["W", "Z", "X", "Y"],
      directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
      bidirected: [["W", "X"], ["Z", "Y"]],
    };

    const { db } = makeDb({ cause: "X", effect: "Y" });

    // Unconditional: the spec's TIAN_C_FACTOR_RATIO.
    const uncond = await runInterventionTest(db, "edge1", 0.001, { graph });
    expect(uncond.g3_conclusion).toBe("CAUSAL");
    expect(uncond.g3_formula_class).toBe("TIAN_C_FACTOR_RATIO");

    // Conditional: IDC, and the class is the CONDITIONAL_ variant --
    // which is how you can tell from the outside that the Z set
    // actually reached the algorithm and was not silently dropped.
    const cond = await runInterventionTest(db, "edge1", 0.001, {
      graph,
      z: ["Z"],
    });
    expect(cond.g3_conclusion).toBe("CAUSAL");
    expect(cond.g3_formula_class).toBe("CONDITIONAL_FRONT_DOOR_OR_C_COMPONENT_FACTORIZATION");

    // And the two are not the same estimand: the conditional formula
    // carries a RATIO over Y, the unconditional does not.
    expect(cond.g3_formula).toContain("/");
    expect(uncond.g3_formula).not.toContain("/");
  });
});

// ======================================================================
// THE ADVERSARY REVIEW. Identifiability is not robustness: a graph can
// identify an effect perfectly and the effect can still be explainable
// by an unmeasured confounder. The two checks are independent, so both
// must pass.
// ======================================================================
describe("the adversary review (E-value gate)", () => {
  const graph = { nodes: ["Scheme", "PassEPA"], directed: [["Scheme", "PassEPA"]], bidirected: [] };

  it("reports the E-value on a claim it lets through", async () => {
    const { db } = makeDb();
    const res = await runInterventionTest(db, "edge1", 0.001, { graph });

    expect(res.g3_conclusion).toBe("CAUSAL");
    expect(res.verdict).toBe("PASS");
    // The E-value is reported, not merely checked.
    expect(res.e_value_point).not.toBeNull();
    expect(res.e_value_ci).not.toBeNull();
    expect(res.adversary_refusal_code).toBeNull();
    // The mock has a 90% vs 10% outcome rate, so the rate ratio is 9
    // and the E-value is well above 1.
    expect(res.e_value_point!).toBeGreaterThan(1.35);
  });

  it("refuses a claim whose effect is too fragile to state as causal", async () => {
    // Same graph, but the E-value is REQUIRED to be enormous. The
    // effect is still identified and still statistically significant;
    // it is only not robust enough to publish as causal.
    const { db, inserted } = makeDb();
    const res = await runInterventionTest(db, "edge1", 0.001, { graph, minEValue: 1000 });

    // The identification still happened -- the gate is not the
    // identifiability check failing.
    expect(res.g3_conclusion).toBe("CAUSAL");
    expect(res.g3_refusal_code).toBeNull();
    // But the adversary review blocked publication.
    expect(res.adversary_refusal_code).toBe("REFUSED_ADVERSARY_E_VALUE_TOO_LOW");
    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.reason).toContain("REFUSED_ADVERSARY_E_VALUE_TOO_LOW");
    // The E-value is still reported, so a reader can see what it was.
    expect(res.e_value_ci).not.toBeNull();
  });

  it("a claim that is NOT identified is refused before the E-value matters", async () => {
    // The confounded bow-arc: the effect is not identified, so there
    // is nothing to be robust about. The adversary review must not
    // even be reached.
    const { db } = makeDb();
    const res = await runInterventionTest(db, "edge1", 0.001, {
      graph: { nodes: ["Scheme", "PassEPA"], directed: [["Scheme", "PassEPA"]], bidirected: [["Scheme", "PassEPA"]] },
    });
    expect(res.g3_refusal_code).toBe("REFUSED_G3_NON_IDENTIFIABLE_HEDGE");
    expect(res.adversary_refusal_code).toBeNull();
    expect(res.e_value_point).toBeNull();
  });
});

// ======================================================================
// THE WHOLE CHAIN, END TO END: a refused shock test carries the
// measurement plan.
//
// The spec's section 4.4 says the engine should say WHICH MEASUREMENT
// would make the question answerable. That has to survive the whole
// path -- the gate, the refusal, and the retrieval function's own
// return -- or it is a comment.
// ======================================================================
describe("the shock path carries the measurement plan", () => {
  it("a refused shock test names the mediator that would break the hedge", async () => {
    const { db } = makeDb();
    const res = await runInterventionTest(db, "edge1", 0.001, {
      // The confounded bow-arc: the effect is not identified.
      graph: {
        nodes: ["Scheme", "PassEPA"],
        directed: [["Scheme", "PassEPA"]],
        bidirected: [["Scheme", "PassEPA"]],
      },
      mediators: [
        { signalId: "SharperMarketShare", node: "SharperMarketShare", tValid: 1, sampleCount: 500 },
      ],
    });

    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.g3_refusal_code).toBe("REFUSED_G3_NON_IDENTIFIABLE_HEDGE");
    // The plan survived the whole path.
    expect(res.expansion_activating_mediators.length + res.expansion_breaks_hedge_but_fragile.length)
      .toBeGreaterThan(0);
    // And the reason names it.
    expect(res.reason).toContain("SharperMarketShare");
  });

  it("a refused shock test with NO mediators still refuses cleanly", async () => {
    const { db } = makeDb();
    const res = await runInterventionTest(db, "edge1", 0.001, {
      graph: {
        nodes: ["Scheme", "PassEPA"],
        directed: [["Scheme", "PassEPA"]],
        bidirected: [["Scheme", "PassEPA"]],
      },
    });
    expect(res.verdict).toBe("INCONCLUSIVE");
    expect(res.expansion_activating_mediators).toHaveLength(0);
    expect(res.expansion_breaks_hedge_but_fragile).toHaveLength(0);
  });

  it("an IDENTIFIED shock test has no plan, and says so", async () => {
    const { db } = makeDb();
    const res = await runInterventionTest(db, "edge1", 0.001, {
      graph: { nodes: ["Scheme", "PassEPA"], directed: [["Scheme", "PassEPA"]], bidirected: [] },
    });
    expect(res.g3_conclusion).toBe("CAUSAL");
    expect(res.expansion_activating_mediators).toHaveLength(0);
    expect(res.expansion_breaks_hedge_but_fragile).toHaveLength(0);
  });
});
