/**
 * @file literature-causal.ts
 * Promote high-performing premises into causal edges and test them.
 *
 * TWO SEPARATE THINGS, KEPT SEPARATE ON PURPOSE
 *
 *   1. A CAUSAL EDGE is a promoted premise: a claim that premise P moves
 *      outcome O, with enough graded evidence to be worth testing.
 *   2. A DO-CALCULUS INTERVENTION TEST asks what happens to O when the cause
 *      is set to a value. It runs on PROMOTED EDGES ONLY.
 *
 * The separation matters because the repo already has a full causal module
 * family that is switched off: every file under
 * packages/prediction-engine/src/causal/ carries `export const ENABLED = false`
 * (1803-01422v2-notears-dag.ts:16, 2001-04197v4-rcd-quarantine-layer.ts:23,
 * 2003-03685v2-pcmci-team-panel.ts:23, 2007-00267v1-regime-dependent-causal-discovery.ts:23,
 * 2110-00637v4-ml4c-supervised-orienter.ts:23). Running do-calculus on
 * unpromoted premises would be running those modules' logic with the gate
 * removed, which is exactly the failure the repo's own law prevents.
 *
 * THE LAW
 *   Do-calculus tests run on promoted edges only. An edge is promoted only by
 *   evidence: graded activations, a positive activation score, and a numeric
 *   claim big enough to be an effect.
 */

import {
  promotePremisesToCausalEdges,
  runInterventionTest,
  type SqlClient,
} from "./literature-retrieval.js";

export interface CausalEdgeRecord {
  readonly edge_key: string;
  readonly premise_key: string;
  readonly premise_title: string;
  readonly cause_signal: string;
  readonly effect_signal: string;
  readonly effect_estimate: number | null;
  readonly effect_unit: string | null;
  readonly support_n: number;
  readonly activation_score: number;
  readonly status: string;
}

export interface InterventionOutcome {
  readonly edge_key: string;
  readonly verdict: "PASS" | "FAIL" | "INCONCLUSIVE";
  readonly estimate: number | null;
  readonly ci_low: number | null;
  readonly ci_high: number | null;
  readonly p_value: number | null;
  readonly n: number;
  readonly method: string;
  readonly reason: string | null;
}

export interface CausalPromotionReport {
  readonly promoted: number;
  readonly edges: readonly CausalEdgeRecord[];
  readonly tests: readonly InterventionOutcome[];
  readonly tested: number;
  readonly passed: number;
  readonly failed: number;
  readonly inconclusive: number;
  readonly errors: readonly string[];
}

/**
 * The promotion criteria.
 *
 * These are the repo's own standard, not a new one:
 *   - MIN_SETTLED_PICKS_FOR_LEARNING is 100 elsewhere in the engine; for a
 *     single premise the support requirement is lower because a premise
 *     fires on a subset of games, but it is not 1.
 *   - The activation score must be positive: a premise that has been graded
 *     and been WRONG does not get promoted.
 */
export const PROMOTION_CRITERIA = {
  minGraded: 5,
  minActivationScore: 0.01,
  minAbsNumericClaim: 0.01,
  maxEdgesPerSweep: 500,
} as const;

/**
 * List the promoted edges with their premise context.
 */
export async function listPromotedEdges(
  db: SqlClient,
  limit = 500,
): Promise<CausalEdgeRecord[]> {
  const res = await db.query(
    `SELECT e.edge_key,
            p.premise_key,
            p.title          AS premise_title,
            e.cause_signal,
            e.effect_signal,
            e.effect_estimate,
            e.effect_unit,
            e.support_n,
            s.activation_score,
            e.status
       FROM lit.causal_edge e
       JOIN lit.premise p ON p.id = e.premise_id
       LEFT JOIN lit.premise_score s ON s.premise_id = p.id
      WHERE e.status = 'promoted'
      ORDER BY s.activation_score DESC NULLS LAST
      LIMIT $1`,
    [limit],
  );
  return res.rows as CausalEdgeRecord[];
}

/**
 * Full promotion + intervention sweep.
 *
 * Step 1: promote the premises that have earned it.
 * Step 2: for each promoted edge, run the do-calculus intervention test.
 *
 * The test's `doValue` is the activation-score threshold that separates
 * "the premise was strongly activated" (treated) from "it was weakly
 * activated" (control). A premise that genuinely carries information should
 * show different residual behavior under strong activation.
 */
export async function runCausalPromotionSweep(
  db: SqlClient,
  opts?: {
    readonly minGraded?: number;
    readonly minActivationScore?: number;
    readonly maxEdges?: number;
    readonly doValue?: number;
    readonly testLimit?: number;
  },
): Promise<CausalPromotionReport> {
  const errors: string[] = [];

  const promo = await promotePremisesToCausalEdges(db, {
    minGraded: opts?.minGraded ?? PROMOTION_CRITERIA.minGraded,
    minScore: opts?.minActivationScore ?? PROMOTION_CRITERIA.minActivationScore,
    minAbsClaim: PROMOTION_CRITERIA.minAbsNumericClaim,
    limit: opts?.maxEdges ?? PROMOTION_CRITERIA.maxEdgesPerSweep,
  });

  const edges = await listPromotedEdges(db, opts?.testLimit ?? 200);
  const tests: InterventionOutcome[] = [];
  let passed = 0;
  let failed = 0;
  let inconclusive = 0;

  for (const e of edges) {
    try {
      const out = await runInterventionTest(db, e.edge_key, opts?.doValue ?? 0.001);
      tests.push({
        edge_key: out.edge_key,
        verdict: out.verdict,
        estimate: out.estimate,
        ci_low: out.ci_low,
        ci_high: out.ci_high,
        p_value: out.p_value,
        n: out.n,
        method: out.method,
        reason: out.reason,
      });
      if (out.verdict === "PASS") passed += 1;
      else if (out.verdict === "FAIL") failed += 1;
      else inconclusive += 1;
    } catch (err) {
      errors.push(`${e.edge_key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    promoted: promo.promoted,
    edges,
    tests,
    tested: tests.length,
    passed,
    failed,
    inconclusive,
    errors,
  };
}

/**
 * Retire a promoted edge that has failed its intervention test.
 *
 * A promoted edge whose do-calculus test FAILS is evidence against the
 * premise. Retiring it removes it from the reasoning path's future retrieval
 * scoring without deleting the record (the failure IS the evidence).
 */
export async function retireFailedEdges(
  db: SqlClient,
  opts?: { readonly maxFailures?: number },
): Promise<{ retired: number }> {
  const res = await db.query(
    `UPDATE lit.causal_edge e
        SET status = 'retired', retired_at = now()
      WHERE e.status = 'promoted'
        AND EXISTS (
          SELECT 1 FROM lit.intervention_test t
           WHERE t.edge_id = e.id AND t.verdict = 'FAIL'
        )
      RETURNING e.edge_key`,
    []
  );
  await markTestsOfRetiredEdges(db);
  return { retired: res.rows.length };
}

/**
 * Mark the intervention tests of a retired edge as superseded.
 *
 * HONESTY (2026-10-20). The schema's LAW 4 is "do-calculus tests run on
 * PROMOTED EDGES ONLY". The run-loop's law check asserts that no test
 * exists on an edge whose status is not 'promoted'.
 *
 * Retiring an edge without retiring its tests breaks that law on the
 * record: the measured run retired 16 edges and left 38 intervention
 * tests pointing at them, so the law check read 38 violations. The check
 * was right; the stale rows were the problem.
 *
 * The tests are not deleted -- the test IS the evidence, and it is kept so
 * a retired edge's history stays readable. They are MARKED superseded, and
 * the law check then counts only the tests that are still live.
 */
export async function markTestsOfRetiredEdges(
  db: SqlClient,
): Promise<{ superseded: number }> {
  const res = await db.query(
    `UPDATE lit.intervention_test t
        SET superseded = true
      WHERE t.superseded = false
        AND EXISTS (
          SELECT 1 FROM lit.causal_edge e
           WHERE e.id = t.edge_id AND e.status <> 'promoted'
        )
      RETURNING t.id`,
    []
  );
  return { superseded: res.rows.length };
}
