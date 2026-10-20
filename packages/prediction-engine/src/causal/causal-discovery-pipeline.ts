/**
 * THE SPEC'S STAGE 2 AND STAGE 3, AS ONE FUNCTION.
 *
 * The spec's three-stage hybrid:
 *
 *   Stage 1  FCI discovers a Partial Ancestral Graph P. Its edges carry
 *            marks (tail / arrowhead / circle), and a CIRCLE means
 *            "arrowhead or tail" -- unresolved.
 *
 *   Stage 2  Scale-invariant DYNOTEARS resolves the circle marks and
 *            estimates the coefficient matrix W_0, with the trainable
 *            support RESTRICTED to the FCI-admissible edge set.
 *
 *   Stage 3  The PAG is projected to the game-specific ADMG:
 *
 *              directed:   |W_0,ij| > tau_edge  ->  V_i -> V_j
 *              bidirected: every FCI bidirected edge V_i <-> V_j, AND
 *                           any FCI circle-arrow V_i o-> V_j where
 *                           DYNOTEARS set W_0,ij = 0 while the residual
 *                           covariance Cov(r_i, r_j) stays significant
 *                           (|z| > 2.58).
 *
 * WHY THIS IS A SEPARATE FUNCTION. `pagToAdmg` (the subagent's) uses
 * the MAXIMALLY CONFOUNDED representative: any edge that is not a
 * definite tail->arrowhead becomes bidirected. That is sound, and it
 * is pessimistic by construction -- it can only make an effect HARDER
 * to identify, never easier, so it never over-claims.
 *
 * But it is not the spec's Stage 3, and it leaves the circle marks
 * unresolved: the PAG's ambiguity is carried into the ADMG wholesale
 * rather than being settled by the data where the data can settle it.
 * The spec's rule is the other direction -- it uses the estimated
 * weights AND the residual covariance to decide, and it only keeps a
 * bidirected edge when the data say the confounding is real.
 *
 * The difference matters in one direction that is not conservative:
 * the maximally-confounded rule can leave a bidirected edge that the
 * DATA says is not there. That is a false hedge, and a false hedge
 * refuses a real effect.
 *
 * So this is the spec's rule, and `pagToAdmg` stays for callers that
 * want the pessimistic representative.
 */
import {
  fci,
  pagToAdmg,
  dynotearsFit,
  acyclicityExact,
  type FciResult,
  type FciOptions,
  type PagAdmg,
  type DynotearsOptions,
  type DynotearsResult,
  type ClassALiteratureConstraint,
  type EdgePenalty,
} from "./fci-pag.js";

/** The spec's Stage 3 residual-covariance significance threshold. */
export const RESIDUAL_COVARIANCE_Z = 2.58;

export interface DiscoverOptions extends FciOptions {
  /** The Stage 2 DYNOTEARS options. */
  readonly dynotears?: DynotearsOptions;
  /** Stage 3's directed-edge threshold on |W_0,ij|. Default 0.05. */
  readonly tauEdge?: number;
  /** The significance threshold for the residual covariance. Default 2.58. */
  readonly residualCovarianceZ?: number;
  /**
   * The VERIFIED literature constraints (the spec's S_lit^ClassA).
   * Passed to Stage 2. Only CITABLE_VERIFIED premises may appear.
   */
  readonly classALiterature?: readonly ClassALiteratureConstraint[];
  /** The per-edge L1 penalties (the spec's lambda_{1,ij}). */
  readonly edgePenalties?: readonly EdgePenalty[];
}

export interface DiscoveredStructure {
  /** The Stage 1 PAG. */
  readonly pag: FciResult;
  /** The Stage 2 fit. Null when Stage 2 was not run. */
  readonly fit: DynotearsResult | null;
  /** The Stage 3 ADMG. */
  readonly admg: PagAdmg;
  /**
   * The Stage 3 decisions, one per PAG edge, so a reader can see WHY
   * each edge ended up where it did. A projection with no audit trail
   * is a projection nobody can check.
   */
  readonly decisions: readonly ProjectionDecision[];
}

/** Why one PAG edge became a directed edge, a bidirected edge, or nothing. */
export interface ProjectionDecision {
  readonly u: number;
  readonly v: number;
  readonly markU: string;
  readonly markV: string;
  /** "directed" | "bidirected" | "dropped". */
  readonly kind: "directed" | "bidirected" | "dropped";
  /** The direction, when kind is "directed": [from, to]. */
  readonly directed?: readonly [number, number];
  /** The absolute standardized coefficient, when Stage 2 ran. */
  readonly absW?: number;
  /** The residual covariance z, when Stage 2 ran. */
  readonly residualZ?: number;
  /** The human-readable reason. */
  readonly reason: string;
}

/**
 * The residual matrix of a contemporaneous DYNOTEARS fit:
 *   R = X - X*W
 * with one column per variable. The residual COVARIANCE between two
 * variables is what tells us the confounding survived the fit.
 */
function residuals(X: number[][], W: number[][]): number[][] {
  const n = X.length;
  const d = X[0]!.length;
  const R: number[][] = Array.from({ length: n }, () => new Array(d).fill(0));
  for (let t = 0; t < n; t++) {
    for (let j = 0; j < d; j++) {
      let v = X[t]![j]!;
      for (let k = 0; k < d; k++) v -= X[t]![k]! * W[k]![j]!;
      R[t]![j] = v;
    }
  }
  return R;
}

/** The correlation of two residual columns, and the z of that correlation. */
function residualCorrelationZ(R: number[][], j: number, k: number): number {
  const n = R.length;
  const colJ = R.map((r) => r[j]!);
  const colK = R.map((r) => r[k]!);
  const meanJ = colJ.reduce((a, b) => a + b, 0) / n;
  const meanK = colK.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let varJ = 0;
  let varK = 0;
  for (let t = 0; t < n; t++) {
    const dj = colJ[t]! - meanJ;
    const dk = colK[t]! - meanK;
    cov += dj * dk;
    varJ += dj * dj;
    varK += dk * dk;
  }
  if (varJ <= 0 || varK <= 0) return 0;
  const r = cov / Math.sqrt(varJ * varK);
  const denom = Math.sqrt(n - 3);
  if (!(denom > 0)) return 0;
  // The Fisher-z transform, as in the FCI skeleton test.
  const z = 0.5 * Math.sqrt(n - 3) * Math.log((1 + r) / (1 - r));
  return Number.isFinite(z) ? z : 0;
}

/**
 * The full three-stage hybrid, per the spec.
 *
 * Stage 1  FCI -> PAG
 * Stage 2  DYNOTEARS restricted to the FCI skeleton, with the verified
 *          literature constraints and the per-edge penalties
 * Stage 3  PAG -> ADMG by the spec's projection rules
 */
export function discoverCausalStructure(
  data: number[][],
  opts: DiscoverOptions = {},
): DiscoveredStructure {
  const tauEdge = opts.tauEdge ?? 0.05;
  const zThresh = opts.residualCovarianceZ ?? RESIDUAL_COVARIANCE_Z;
  if (!(tauEdge >= 0)) throw new Error("discoverCausalStructure: tauEdge must be >= 0");
  if (!(zThresh > 0)) throw new Error("discoverCausalStructure: residualCovarianceZ must be > 0");

  // ---- Stage 1: FCI ----
  const pag = fci(data, {
    ...(opts.alpha === undefined ? {} : { alpha: opts.alpha }),
    ...(opts.maxConditioningSetSize === undefined
      ? {}
      : { maxConditioningSetSize: opts.maxConditioningSetSize }),
  });

  // ---- Stage 2: DYNOTEARS on the FCI-admissible support ----
  //
  // The support restriction is the whole point: NOTEARS may only put
  // weight on an edge the PAG did not rule out. The skeleton is
  // undirected, so BOTH directions are allowed -- the PAG's marks are
  // what resolve the direction, and that is Stage 3's job.
  const skeletonEdges: [number, number][] = [];
  for (const e of pag.edges) {
    skeletonEdges.push([e.u, e.v]);
    skeletonEdges.push([e.v, e.u]);
  }

  const fit = dynotearsFit(data, {
    ...(opts.dynotears ?? {}),
    allowedEdges: skeletonEdges,
    ...(opts.classALiterature ? { classALiterature: opts.classALiterature } : {}),
    ...(opts.edgePenalties ? { edgePenalties: opts.edgePenalties } : {}),
  });

  // The residual covariance, computed in the ORIGINAL data units --
  // the standardized fit's residuals would give the same correlation
  // (a correlation is scale-free), but the original units are what a
  // reader can check by hand.
  const R = residuals(data, fit.W);
  const nodeIndex = new Map<number, number>();
  fit.W.forEach((_, j) => nodeIndex.set(j, j));

  // ---- Stage 3: the projection rules ----
  const directed: [number, number][] = [];
  const bidirected: [number, number][] = [];
  const decisions: ProjectionDecision[] = [];

  for (const e of pag.edges) {
    const { u, v, markU, markV } = e;
    const wUV = fit.Wstandardized[u]?.[v] ?? 0;
    const wVU = fit.Wstandardized[v]?.[u] ?? 0;
    const absW = Math.max(Math.abs(wUV), Math.abs(wVU));
    const z = residualCorrelationZ(R, u, v);
    const absZ = Math.abs(z);

    // The PAG's own verdict on the direction. A definite tail at u and
    // a definite arrowhead at v means u -> v, and the data cannot
    // reverse it.
    const pagSaysUV = markU === "tail" && markV === "arrowhead";
    const pagSaysVU = markU === "arrowhead" && markV === "tail";

    // RULE 1: the PAG's marks RESOLVE the direction -- a definite tail
    // at one end and a definite arrowhead at the other. The data
    // cannot reverse it, and the weight confirms it.
    if ((pagSaysUV || pagSaysVU) && absW > tauEdge) {
      const from = pagSaysUV ? u : v;
      const to = pagSaysUV ? v : u;
      directed.push([from, to]);
      decisions.push({
        u, v, markU, markV, kind: "directed", directed: [from, to], absW, residualZ: z,
        reason: `the PAG orients ${from}->${to} and |W| = ${absW.toFixed(4)} > ${tauEdge}`,
      });
      continue;
    }

    // RULE 2: the PAG's marks resolve the direction, but the weight is
    // not there. The PAG is a statement about the data, and a zero
    // weight means the data say the edge is not there. So the edge is
    // DROPPED -- not demoted to bidirected, which would invent
    // confounding the data do not show.
    if ((pagSaysUV || pagSaysVU) && absW <= tauEdge) {
      decisions.push({
        u, v, markU, markV, kind: "dropped", absW, residualZ: z,
        reason: `the PAG orients the edge but |W| = ${absW.toFixed(4)} <= ${tauEdge}; the data do not support it`,
      });
      continue;
    }

    // RULE 3: THE PAG'S MARKS ARE UNRESOLVED (a circle at both ends),
    // so the direction is NOT identified by the PAG. The question is
    // whether the CONFOUNDING is real -- and the answer decides
    // between a directed edge and a hedge.
    //
    // A significant residual correlation means the two variables share
    // something the model cannot express. The direction is then NOT
    // identified, whatever the coefficient says.
    //
    // AND THE ORDER MATTERS. A LARGE COEFFICIENT IS THE SIGNATURE OF
    // CONFOUNDING, NOT EVIDENCE OF DIRECTION: a common cause induces
    // a direct-looking coefficient between its effects, and the larger
    // the confounding, the larger the induced coefficient. So testing
    // |W| first and calling the edge directed is an OVER-CLAIM --
    // measured on a two-variable latent-confounder SCM, the residual
    // z was 49.5 (the confounding is overwhelming) and |W| was 0.39,
    // and the edge was reported as 0->1: a DIRECTION THE DATA CANNOT
    // IDENTIFY, on a graph that would then let do-calculus mint a
    // causal claim about it.
    //
    // The spec's rule for the circle-arrow case is the special case
    // "DYNOTEARS set W_0,ij = 0 while the residual covariance stays
    // significant". This rule is the generalisation: the confounding
    // being real is what matters, whether the coefficient happened to
    // be estimated at zero or not.
    if (absZ > zThresh) {
      bidirected.push([u, v]);
      decisions.push({
        u, v, markU, markV, kind: "bidirected", absW, residualZ: z,
        reason:
          `the PAG leaves the direction open and the residuals stay correlated ` +
          `(|z| = ${absZ.toFixed(3)} > ${zThresh}), so the confounding is real and the ` +
          `direction is not identified (|W| = ${absW.toFixed(4)})`,
      });
      continue;
    }

    // RULE 4: no residual confounding and the PAG did not orient it.
    // The weight is the only thing left that can settle the
    // direction.
    if (absW > tauEdge) {
      const from = wUV >= wVU ? u : v;
      const to = wUV >= wVU ? v : u;
      directed.push([from, to]);
      decisions.push({
        u, v, markU, markV, kind: "directed", directed: [from, to], absW, residualZ: z,
        reason:
          `the PAG leaves the direction open, the residuals are not correlated ` +
          `(|z| = ${absZ.toFixed(3)} <= ${zThresh}), and |W| = ${absW.toFixed(4)} > ${tauEdge}, ` +
          `so ${from}->${to}`,
      });
      continue;
    }

    // RULE 5: nothing supports the edge.
    decisions.push({
      u, v, markU, markV, kind: "dropped", absW, residualZ: z,
      reason:
        `no weight (|W| = ${absW.toFixed(4)}) and the residuals are not correlated ` +
        `(|z| = ${absZ.toFixed(3)} <= ${zThresh})`,
    });
  }

  // A bidirected edge that ALSO got a directed edge would be a
  // contradiction -- the graph would say both. The bidirected wins,
  // because a bidirected edge is the weaker claim: it says the
  // direction is not identified, which is compatible with the
  // direction being right.
  const directedSet = new Set(directed.map(([a, b]) => `${a}->${b}`));
  for (let i = bidirected.length - 1; i >= 0; i--) {
    const [u, v] = bidirected[i]!;
    if (directedSet.has(`${u}->${v}`) || directedSet.has(`${v}->${u}`)) bidirected.splice(i, 1);
  }

  directed.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  bidirected.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  return {
    pag,
    fit,
    admg: { nodes: [...pag.nodes].sort((a, b) => a - b), directed, bidirected },
    decisions,
  };
}

/**
 * The pessimistic representative, for callers that want it.
 * Exposed so the two can be compared -- the difference between them
 * is the value of running Stage 2, and it should be measurable.
 */
export function discoverCausalStructurePessimistic(
  data: number[][],
  opts: FciOptions = {},
): { readonly pag: FciResult; readonly admg: PagAdmg } {
  const pag = fci(data, opts);
  return { pag, admg: pagToAdmg(pag) };
}
