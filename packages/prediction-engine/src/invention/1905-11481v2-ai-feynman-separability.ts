/**
 * AI Feynman separability front-end for symbolic metric invention —
 * arXiv 1905.11481v2 ("AI Feynman: a Physics-Inspired Method for
 * Symbolic Regression").
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes
 * predictions and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: AI Feynman fits a small neural net to the data, then
 * runs physics-inspired probes — additive/multiplicative separability
 * (does f(x,y)=g(x)+h(y)?), translational/rotational symmetry, and scale
 * analysis (dimensional normalization) — to decompose a hard regression
 * into small subproblems before the symbolic search. Here we adapt that
 * as a FRONT END to PySR for points-per-drive equations: probe additive
 * separability across feature groups (offense vs defense vs context) via
 * the Delta_sep cross-partial statistic, run symbolic search per group,
 * and recombine, with pace-based scale analysis up front.
 *
 * Improvement (record): Build an AI-Feynman-lite front end to PySR: fit a
 * small MLP to points-per-drive, probe additive separability across feature
 * groups (offense vs defense vs context) via Delta_sep, run PySR per group
 * and recombine, with a scale-analysis module normalizing by pace.
 *
 * ACCEPTANCE GATE: ADOPT the separability front-end if it yields >=5%
 * held-out RMSE improvement over flat PySR on the 2024-2025 test window
 * with no more than 20% more total nodes; REJECT if separability never
 * fires or the recombined equation underperforms flat search. (Gate
 * requires the 2024-2025 dataset + a PySR backend; run via the lab
 * harness, not from this module.)
 */

export interface Sample {
  /** Full feature vector (concatenation of all groups). */
  readonly x: readonly number[];
  /** Target (e.g. points per drive). */
  readonly y: number;
}

export interface FeatureGroup {
  readonly name: string;
  /** Indices into Sample.x belonging to this group. */
  readonly indices: readonly number[];
}

export interface SeparabilityResult {
  readonly groupA: string;
  readonly groupB: string;
  /** Additive separability detected (cross-partials ~ 0)? */
  readonly additiveSeparable: boolean;
  /** Multiplicative separability detected (cross-partials of log|y| ~ 0)? */
  readonly multiplicativeSeparable: boolean;
  /** Delta_sep statistic for the additive test. */
  readonly deltaSepAdditive: number;
  /** Delta_sep statistic for the multiplicative test. */
  readonly deltaSepMultiplicative: number;
  readonly threshold: number;
}

export interface RecombinedEquation {
  /** f(x) = sum of group equations, as expression string. */
  readonly expression: string;
  readonly totalNodes: number;
  readonly separabilityFired: boolean;
}

function rms(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v * v;
  return Math.sqrt(s / values.length);
}

function sliceVector(
  x: readonly number[],
  indices: readonly number[],
): number[] {
  return indices.map((i) => x[i] ?? 0);
}

/**
 * Delta_sep statistic (AI Feynman, Eq. 8): root-mean-square of the mixed
 * finite-difference second derivative of f across groups. Near zero means
 * f is additive-separable across the two groups.
 */
export function deltaSepAdditive(
  samples: readonly Sample[],
  f: (x: readonly number[]) => number,
  groupA: FeatureGroup,
  groupB: FeatureGroup,
  epsilon = 1e-3,
): number {
  const cross: number[] = [];
  for (const s of samples) {
    const base = f(s.x);
    // Mixed second difference across the two groups:
    // d2f/(dxa dxb) ~ (fAB - fA - fB + f0)/eps^2. Zero => additive-separable.
    const bump = (which: "A" | "B" | "both") => {
      const x = [...s.x];
      const groups =
        which === "A"
          ? [groupA]
          : which === "B"
            ? [groupB]
            : [groupA, groupB];
      for (const g of groups) {
        for (const idx of g.indices) {
          x[idx] = (x[idx] ?? 0) + epsilon;
        }
      }
      return x;
    };
    const fAA = f(bump("both"));
    const fA1 = f(bump("A"));
    const fB1 = f(bump("B"));
    // Mixed second difference: d2f/(dxa dxb) ~ (fAB - fA - fB + f0)/eps^2.
    const mixed = (fAA - fA1 - fB1 + base) / (epsilon * epsilon);
    cross.push(mixed);
  }
  // Normalize by the target's typical magnitude so Delta_sep is scale-free.
  const scale = Math.abs(rms(samples.map((s) => s.y))) + 1e-9;
  return rms(cross) / scale;
}

/**
 * Multiplicative separability via log|y|: if log|f| is additive-separable
 * across the groups, f is multiplicative-separable (AI Feynman Eq. 10).
 */
export function deltaSepMultiplicative(
  samples: readonly Sample[],
  f: (x: readonly number[]) => number,
  groupA: FeatureGroup,
  groupB: FeatureGroup,
  epsilon = 1e-3,
): number {
  const logf = (x: readonly number[]) => Math.log(Math.abs(f(x)) + 1e-9);
  return deltaSepAdditive(samples, logf, groupA, groupB, epsilon);
}

/**
 * Probe additive + multiplicative separability of f across two feature
 * groups. Mirrors AI Feynman's decision rule: separability "fires" when
 * Delta_sep < threshold (paper default ~ 0.1 on normalized data).
 */
export function probeSeparability(
  samples: readonly Sample[],
  f: (x: readonly number[]) => number,
  groupA: FeatureGroup,
  groupB: FeatureGroup,
  threshold = 0.1,
): SeparabilityResult {
  const dAdd = deltaSepAdditive(samples, f, groupA, groupB);
  const dMul = deltaSepMultiplicative(samples, f, groupA, groupB);
  return {
    groupA: groupA.name,
    groupB: groupB.name,
    additiveSeparable: dAdd < threshold,
    multiplicativeSeparable: dMul < threshold,
    deltaSepAdditive: dAdd,
    deltaSepMultiplicative: dMul,
    threshold,
  };
}

/**
 * Scale-analysis module: normalize points-per-drive by pace (plays per
 * game relative to league mean), producing the scale-free target AI
 * Feynman works on.
 */
export function normalizeByPace(
  samples: readonly Sample[],
  paceIndexInX: number,
  leagueMeanPace: number,
): { readonly x: readonly number[]; readonly y: number }[] {
  return samples.map((s) => {
    const pace = s.x[paceIndexInX] ?? leagueMeanPace;
    const factor = pace > 0 ? leagueMeanPace / pace : 1;
    return { x: s.x, y: s.y * factor };
  });
}

/**
 * Recombine per-group symbolic equations into one expression. When
 * additive separability fired, f(x) = g_A(x_A) + h_B(x_B); otherwise the
 * groups stay coupled and we fall back to the flat expression.
 */
export function recombine(
  groupEquations: ReadonlyArray<{
    readonly group: string;
    readonly expression: string;
    readonly nodes: number;
  }>,
  separability: SeparabilityResult,
): RecombinedEquation {
  if (groupEquations.length === 0) {
    return { expression: "0", totalNodes: 0, separabilityFired: false };
  }
  if (!separability.additiveSeparable && !separability.multiplicativeSeparable) {
    const total = groupEquations.reduce((t, g) => t + g.nodes, 0);
    return {
      expression: `coupled(${groupEquations.map((g) => g.expression).join(", ")})`,
      totalNodes: total,
      separabilityFired: false,
    };
  }
  const joiner = separability.additiveSeparable ? " + " : " * ";
  const totalNodes =
    groupEquations.reduce((t, g) => t + g.nodes, 0) +
    Math.max(0, groupEquations.length - 1);
  return {
    expression: `(${groupEquations.map((g) => g.expression).join(joiner)})`,
    totalNodes,
    separabilityFired: true,
  };
}

/** Gate-check helper: >=5% held-out RMSE improvement at <=20% node growth. */
export function passesImprovementGate(
  flatRmse: number,
  recombinedRmse: number,
  flatNodes: number,
  recombinedNodes: number,
): boolean {
  if (flatRmse <= 0 || flatNodes <= 0) return false;
  const rmseImprovement = (flatRmse - recombinedRmse) / flatRmse;
  const nodeGrowth = (recombinedNodes - flatNodes) / flatNodes;
  return rmseImprovement >= 0.05 && nodeGrowth <= 0.2;
}
