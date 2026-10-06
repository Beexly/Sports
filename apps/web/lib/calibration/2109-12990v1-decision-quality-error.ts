// @ts-nocheck
/**
 * arXiv 2109.12990v1: Optimal Team Economic Decisions in Counter-Strike.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Decision Quality Error (DQE) for NFL coaching decisions: counterfactual substitution restricted to game states with overlap (propensity-trimmed, fixing the paper's causal flaw); decision types 4th-down go/kick, 2-point conversions, timeout usage, challenges; WP delta (optimal - actual) per occurrence aggregated to a team-season mean; 2-3 ply game-tree valuation tests whether tree-valued decisions disagree with myopic valuations in >=10% of cases.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Build a Decision Quality Error (DQE) metric for NFL coaching decisions: restrict counterfactual substitution to game states with overlap (only decisions where both actual and candidate choices have adequate support — propensity-trimmed, fixing the paper's causal flaw); decision types: 4th-down go/kick, 2-point conversions, timeout usage, challenges; compute WP delta (optimal - actual) per occurrence, aggregate to a team-season DQE (mean, fixing the paper's sum/mean ambiguity); serve as an offseason coaching-decision report — then model decision sequences with a lightweight game-tree (2-3 plies: decision -> outcome distribution -> next decision point), valuing decisions by full expected-WP rather than myopic round-WP, testing whether tree-valued 4th-down decisions disagree with myopic valuations in >=10% of cases and have better cross-season stability.
 *
 * ACCEPTANCE GATE:
 * Adopt the DQE metric into the coaching-decision product iff the trimmed version achieves cross-season stability r >= 0.3 AND adds Delta R^2 >= 0.02 to next-season wins over the EPA/luck baseline on 2022-2024 data.
 *
 * No ENABLED flag: offseason coaching-decision report metric, not a publish path.
 */


export type DecisionType = "fourth-down" | "two-point" | "timeout" | "challenge";

export interface CoachingDecision {
  readonly team: string;
  readonly season: number;
  readonly type: DecisionType;
  /** Propensity of the actual choice in this game state (for overlap trimming). */
  readonly propensity: number;
  /** Win probability under the actual decision. */
  readonly wpActual: number;
  /** Win probability under the optimal counterfactual decision. */
  readonly wpOptimal: number;
}

/** DQE per occurrence: WP delta (optimal - actual), floored at 0. */
export function occurrenceDQE(d: CoachingDecision): number {
  return Math.max(d.wpOptimal - d.wpActual, 0);
}

/**
 * Propensity trimming: keep only decisions where both actual and candidate
 * choices have adequate support (propensity in [trim, 1 - trim]).
 */
export function propensityTrimmed(
  decisions: readonly CoachingDecision[],
  trim = 0.05,
): CoachingDecision[] {
  return decisions.filter((d) => d.propensity >= trim && d.propensity <= 1 - trim);
}

/** Team-season DQE: mean (not sum) of occurrence DQEs. */
export function teamSeasonDQE(decisions: readonly CoachingDecision[]): number {
  if (decisions.length === 0) return 0;
  return (
    decisions.reduce((a, d) => a + occurrenceDQE(d), 0) / decisions.length
  );
}

export interface DQEByType {
  readonly type: DecisionType;
  readonly dqe: number;
  readonly n: number;
}

/** DQE broken out by decision type. */
export function dqeByType(decisions: readonly CoachingDecision[]): DQEByType[] {
  const types: DecisionType[] = ["fourth-down", "two-point", "timeout", "challenge"];
  return types.map((type) => {
    const ds = decisions.filter((d) => d.type === type);
    return { type, dqe: teamSeasonDQE(ds), n: ds.length };
  });
}

export interface TreeNode {
  /** Immediate WP of stopping here (myopic valuation). */
  readonly wp: number;
  /** Child outcomes: {prob, node} for the 2-ply lookahead. */
  readonly children?: readonly { prob: number; node: TreeNode }[];
}

/** Full expected-WP valuation of a decision node (2-3 ply game tree). */
export function treeValue(node: TreeNode, plies = 2): number {
  if (plies <= 0 || !node.children || node.children.length === 0) return node.wp;
  return node.children.reduce(
    (a, c) => a + c.prob * treeValue(c.node, plies - 1),
    0,
  );
}

/**
 * Disagreement test: fraction of cases where the tree-valued ranking of two
 * candidate decisions differs from the myopic ranking. Gate: >= 10%.
 */
export function treeMyopicDisagreement(
  cases: readonly { myopic: [number, number]; tree: [number, number] }[],
): number {
  if (cases.length === 0) return 0;
  const disagree = cases.filter(
    (c) =>
      Math.sign(c.myopic[0] - c.myopic[1]) !== Math.sign(c.tree[0] - c.tree[1]),
  ).length;
  return disagree / cases.length;
}
