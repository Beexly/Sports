/**
 * Model Portfolio Router — deterministic lane policy.
 *
 * Version-pinned. Rules in priority order; the first match wins, and every
 * outcome carries its reason. Route policy is GSE intellectual property —
 * this file is the whole method, so it stays server-side and is never
 * exposed on a public surface.
 */

import type { RouteLane, RouteTaskProfile } from "./types";

export const ROUTING_POLICY_VERSION = "routing-policy/1.1.0";

/** Default budget ceilings per lane (USD per task). */
export const LANE_BUDGET_CEILINGS: Readonly<Record<RouteLane, number>> = {
  NO_MODEL: 0,
  PLAN_FRONTIER: 10,
  EXECUTE_BOUNDED: 2,
  EXTRACT_STRUCTURED: 1,
  VERIFY_INDEPENDENT: 3,
  LOCAL_PRIVATE: 0.5,
  PUBLIC_HIGH_STAKES: 10,
};

export interface LaneDecision {
  readonly lane: RouteLane;
  readonly reason: string;
}

export function selectLane(t: RouteTaskProfile): LaneDecision {
  // 1. Deterministic solutions never get a model — a model can only add
  //    variance to something code already answers.
  if (t.deterministicSolutionExists) {
    return { lane: "NO_MODEL", reason: "Deterministic code solves this task; a model adds risk, not value." };
  }
  // 2. Sensitive data stays on GSE-controlled compute, whatever the task.
  if (t.sensitivity === "SENSITIVE") {
    return {
      lane: "LOCAL_PRIVATE",
      reason: "Sensitive data class: must not leave GSE-controlled compute (no local endpoint is registered yet, so this blocks).",
    };
  }
  // 3. Public claims and critical-risk work take the high-stakes lane —
  //    never a cheap lane, whatever the budget says.
  if (t.publicVisibility || t.risk === "CRITICAL") {
    return {
      lane: "PUBLIC_HIGH_STAKES",
      reason: "Output feeds a public claim or carries critical risk: strongest approved model, full review gates.",
    };
  }
  // 4. Independent verification is its own lane so it can later pin a
  //    DIFFERENT endpoint than the one that produced the work.
  if (t.taskType === "verify" || t.taskType === "review") {
    return { lane: "VERIFY_INDEPENDENT", reason: "Second-opinion task: route to the verification lane." };
  }
  // 5. HIGH risk precedes every cheap-lane shortcut (G-15 / policy 1.1.0:
  //    a HIGH-risk task with structured output used to fall into the cheap
  //    EXTRACT lane because the structural rule ran first — risk outranks
  //    shape, always).
  if (t.risk === "HIGH") {
    return { lane: "PLAN_FRONTIER", reason: "High-risk task: frontier lane — risk precedes any structural shortcut." };
  }
  // 6. Schema-constrained extraction is cheaper than planning.
  if (t.requiresStructuredOutput && !t.requiresTools) {
    return { lane: "EXTRACT_STRUCTURED", reason: "Schema-constrained extraction without tools." };
  }
  // 7. Open-ended planning work takes the frontier lane.
  if (t.taskType === "plan" || t.taskType === "architecture") {
    return { lane: "PLAN_FRONTIER", reason: "Open-ended planning: frontier lane." };
  }
  // 8. Everything else is bounded execution.
  return { lane: "EXECUTE_BOUNDED", reason: "Bounded, well-specified task: execution lane." };
}
