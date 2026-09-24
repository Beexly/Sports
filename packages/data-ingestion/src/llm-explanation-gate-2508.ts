/**
 * LLM explanation layer with deterministic numeric-consistency checking
 *
 * Research port: arXiv:2508.21622
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Pure port of the paper's LLM+optimizer pattern, adapted to GSE's serving
 * API: deterministic optimizers stay the sole source of numbers; one LLM
 * drafts role-specific copy from the optimizer JSON, and a deterministic
 * checker verifies numeric consistency before anything publishes. This module
 * implements the deterministic half in full (number extraction, grounding
 * against the optimizer JSON, faithfulness scoring, publish gating) plus the
 * pipeline harness; the LLM draft function is injected, since model access
 * is an external dependency. The gate's human-rating component (>=70%
 * publishable per Garrett) is evaluated outside this module.
 *
 * ACCEPTANCE GATE: ADAPT iff the LLM+checker pipeline achieves >=98%
 * numeric faithfulness on the 1-week DFS test set AND Garrett rates >=70% of
 * write-ups as publishable-with-minor-edits; reject the two-LLM reflection
 * if single-LLM + deterministic checker matches.
 */

export type ExplainerRole = "bettor" | "analyst" | "editor";

/** Deterministic optimizer output: the sole source of numbers. */
export type OptimizerJson = Record<string, number>;

/** An LLM draft function: optimizer JSON + role -> draft copy. Injected. */
export type DraftFn = (optimizer: OptimizerJson, role: ExplainerRole) => string;

export interface GroundedNumber {
  raw: string;
  value: number;
  /** optimizer key it grounds to, or null when hallucinated */
  groundedTo: string | null;
}

const NUMBER_RE = /-?\d+(?:\.\d+)?%?/g;

/** Extract numeric mentions from draft text (percentages normalized to 0-1 scale of the raw figure). */
export function extractNumbers(text: string): Array<{ raw: string; value: number }> {
  if (typeof text !== "string") return [];
  const out: Array<{ raw: string; value: number }> = [];
  for (const m of text.matchAll(NUMBER_RE)) {
    const raw = m[0] ?? "";
    const value = parseFloat(raw.replace("%", ""));
    if (Number.isFinite(value)) out.push({ raw, value });
  }
  return out;
}

export interface ConsistencyReport {
  numbers: GroundedNumber[];
  /** grounded numbers / total numbers; NaN when the draft has no numbers */
  faithfulness: number;
  hallucinated: GroundedNumber[];
  publishable: boolean;
}

/**
 * Deterministic numeric-consistency check: every number in the draft must
 * match some optimizer value within relative tolerance (percentages also
 * match against value*100). Returns the faithfulness score and the verdict.
 */
export function checkNumericConsistency(
  optimizer: OptimizerJson,
  draft: string,
  relTolerance = 0.01,
): ConsistencyReport {
  const entries = Object.entries(optimizer);
  const numbers: GroundedNumber[] = extractNumbers(draft).map(({ raw, value }) => {
    let groundedTo: string | null = null;
    for (const [key, opt] of entries) {
      if (!Number.isFinite(opt)) continue;
      const candidates = [opt, opt * 100];
      if (candidates.some((c) => Math.abs(c) < 1e-12 ? Math.abs(value - c) < 1e-9 : Math.abs(value - c) / Math.max(Math.abs(c), 1e-9) <= relTolerance)) {
        groundedTo = key;
        break;
      }
    }
    return { raw, value, groundedTo };
  });
  const hallucinated = numbers.filter((n) => n.groundedTo === null);
  const faithfulness = numbers.length === 0 ? Number.NaN : (numbers.length - hallucinated.length) / numbers.length;
  // a draft with no numbers at all fails the gate too: the explanation must
  // carry the optimizer's figures, and vacuous truth would auto-publish it
  return { numbers, faithfulness, hallucinated, publishable: numbers.length > 0 && hallucinated.length === 0 };
}

export interface PipelineResult {
  role: ExplainerRole;
  draft: string;
  report: ConsistencyReport;
  /** "publish" | "needs-edit" (checker found hallucinations) */
  decision: "publish" | "needs-edit";
}

/** Run the explanation pipeline: draft via the injected LLM, then check. */
export function runExplanationPipeline(
  optimizer: OptimizerJson,
  role: ExplainerRole,
  draftFn: DraftFn,
  relTolerance = 0.01,
): PipelineResult {
  const draft = draftFn(optimizer, role);
  const report = checkNumericConsistency(optimizer, draft, relTolerance);
  return { role, draft, report, decision: report.publishable ? "publish" : "needs-edit" };
}

export interface GateEvaluation {
  n: number;
  meanFaithfulness: number;
  /** share of drafts the checker passed */
  passRate: number;
  /** gate's numeric half: mean faithfulness >= 98% */
  numericGatePasses: boolean;
}

/** Evaluate the numeric half of the acceptance gate over a test set. */
export function evaluateNumericGate(
  cases: Array<{ optimizer: OptimizerJson; role: ExplainerRole }>,
  draftFn: DraftFn,
): GateEvaluation {
  const faithfulness: number[] = [];
  let passed = 0;
  for (const c of cases) {
    const res = runExplanationPipeline(c.optimizer, c.role, draftFn);
    if (Number.isFinite(res.report.faithfulness)) faithfulness.push(res.report.faithfulness);
    if (res.decision === "publish") passed++;
  }
  const mean = faithfulness.length === 0 ? Number.NaN : faithfulness.reduce((s, v) => s + v, 0) / faithfulness.length;
  return {
    n: cases.length,
    meanFaithfulness: mean,
    passRate: cases.length === 0 ? Number.NaN : passed / cases.length,
    numericGatePasses: Number.isFinite(mean) && mean >= 0.98,
  };
}

export const GSE_LLM_EXPLANATION_GATE_ENABLED = false;
