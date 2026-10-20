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
function makeDb(opts?: { readonly residuals?: number[] }) {
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
              cause_signal: "Scheme",
              effect_signal: "PassEPA",
            },
          ],
        };
      }
      if (sql.includes("FROM lit.residual")) {
        return {
          rows: residuals.map((residual, i) => ({
            residual,
            outcome_correct: i % 2 === 0,
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
});
