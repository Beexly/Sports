/**
 * Quantitative-probe release gate for causal graphs (arXiv 2209.03013v1).
 *
 * A versioned suite of quantitative probes encodes domain knowledge as
 * checkable claims about causal estimands, e.g.
 * ATE(pressure rate +10pp -> defensive EPA/play) negative with |effect|
 * > 0.05 EPA/play, or ATE(rest days -> offensive EPA) ~= 0 as a NULL
 * probe that must NOT be "discovered". After each causal-graph refresh,
 * probe estimands are identified from the graph and estimated with the
 * same outcome machinery; the release gate requires hit rate >= 0.8 AND
 * all null probes to hold. Probe-failure clusters localize graph errors
 * (offense vs defense subgraph).
 *
 * ACCEPTANCE GATE: ADOPT as a release gate iff (a) probe hit rate
 * correlates with downstream Brier improvement (Spearman rho <= -0.5),
 * (b) the flipped-knowledge adversarial test drops hit rate below 0.5,
 * (c) null probes hold at >= 90%; reject if hit rate is uncorrelated
 * with downstream performance (|rho| < 0.3) — then probes are theater.
 *
 * Research-only module. Not wired into any live causal path. The ATE
 * estimation machinery itself is out of scope; this module evaluates
 * estimated effects against the probe suite.
 */

export type ProbeKind = "sign" | "range" | "null";

export interface Probe {
  /** Stable identifier, e.g. "ate_pressure_epa". */
  id: string;
  /** Human-readable estimand, e.g. "ATE(pressure +10pp -> def EPA/play)". */
  estimand: string;
  kind: ProbeKind;
  /** Expected sign for "sign" probes: -1 or 1. */
  sign?: -1 | 1;
  /** [lo, hi] for "range" probes. */
  range?: readonly [number, number];
  /** Minimum |effect| for "sign" probes. */
  minAbs?: number;
  /** Tolerance around 0 for "null" probes. */
  nullTol?: number;
  /** Subgraph tag for failure clustering ("offense" | "defense" | ...). */
  subgraph: string;
}

export interface ProbeEstimate {
  probeId: string;
  effect: number;
}

export interface ProbeResult {
  probeId: string;
  subgraph: string;
  hit: boolean;
  isNull: boolean;
  detail: string;
}

/** Evaluate one estimated effect against its probe. */
export function checkProbe(probe: Probe, effect: number): ProbeResult {
  const base = { probeId: probe.id, subgraph: probe.subgraph, isNull: probe.kind === "null" };
  switch (probe.kind) {
    case "sign": {
      const s = probe.sign ?? 1;
      const minAbs = probe.minAbs ?? 0;
      const hit = Math.sign(effect) === s && Math.abs(effect) >= minAbs;
      return { ...base, hit, detail: `effect=${effect.toFixed(4)} sign=${s} minAbs=${minAbs}` };
    }
    case "range": {
      const [lo, hi] = probe.range ?? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
      const hit = effect >= lo && effect <= hi;
      return { ...base, hit, detail: `effect=${effect.toFixed(4)} range=[${lo},${hi}]` };
    }
    case "null": {
      const tol = probe.nullTol ?? 0.01;
      const hit = Math.abs(effect) <= tol;
      return { ...base, hit, detail: `effect=${effect.toFixed(4)} nullTol=${tol}` };
    }
  }
}

export interface ProbeSuiteReport {
  hitRate: number;
  nullHoldRate: number;
  hits: number;
  total: number;
  /** Hit rate per subgraph (localizes graph errors). */
  bySubgraph: Record<string, { hitRate: number; hits: number; total: number }>;
  results: ProbeResult[];
  /** Release verdict: hit rate >= 0.8 AND every null probe holds. */
  release: boolean;
}

/** Run the full probe suite over a set of estimates. */
export function runProbeSuite(
  probes: readonly Probe[],
  estimates: ReadonlyMap<string, number> | ReadonlyArray<ProbeEstimate>,
  releaseThreshold = 0.8,
): ProbeSuiteReport {
  if (probes.length === 0) throw new Error("runProbeSuite: no probes");
  const isMap = (e: unknown): e is ReadonlyMap<string, number> => e instanceof Map;
  const estMap = isMap(estimates)
    ? estimates
    : new Map(estimates.map((e) => [e.probeId, e.effect] as const));
  const results = probes.map((p) => {
    const effect = estMap.get(p.id);
    if (effect === undefined) {
      return {
        probeId: p.id,
        subgraph: p.subgraph,
        hit: false,
        isNull: p.kind === "null",
        detail: "missing estimate",
      } as ProbeResult;
    }
    return checkProbe(p, effect);
  });
  const hits = results.filter((r) => r.hit).length;
  const nulls = results.filter((r) => r.isNull);
  const nullHeld = nulls.filter((r) => r.hit).length;
  const bySubgraph: ProbeSuiteReport["bySubgraph"] = {};
  for (const r of results) {
    const e = bySubgraph[r.subgraph] ?? { hitRate: 0, hits: 0, total: 0 };
    e.total++;
    if (r.hit) e.hits++;
    bySubgraph[r.subgraph] = e;
  }
  for (const k of Object.keys(bySubgraph)) {
    const e = bySubgraph[k] as { hitRate: number; hits: number; total: number };
    e.hitRate = e.hits / Math.max(1, e.total);
  }
  return {
    hitRate: hits / results.length,
    nullHoldRate: nulls.length === 0 ? 1 : nullHeld / nulls.length,
    hits,
    total: results.length,
    bySubgraph,
    results,
    release: hits / results.length >= releaseThreshold && nullHeld === nulls.length,
  };
}

/**
 * Flipped-knowledge adversarial test: negate the sign/range expectations
 * and re-run; a discriminating suite must drop below 0.5 hit rate.
 */
export function adversarialFlip(probes: readonly Probe[]): Probe[] {
  return probes.map((p) => {
    if (p.kind === "sign") return { ...p, sign: ((p.sign ?? 1) * -1) as -1 | 1 };
    if (p.kind === "range" && p.range) {
      const [lo, hi] = p.range;
      const mid = (lo + hi) / 2;
      const w = (hi - lo) / 2;
      // Reflect the range around the origin.
      return { ...p, range: [-mid - w, -mid + w] as const };
    }
    return p; // null probes are symmetric already
  });
}

/** Spearman rank correlation (for the hit-rate vs Brier gate). */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 2) {
    throw new Error("spearman: need >= 2 paired observations");
  }
  const rank = (vs: readonly number[]): number[] => {
    const order = vs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(vs.length);
    order.forEach((o, k) => {
      r[o.i] = k + 1;
    });
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const mx = (n + 1) / 2;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (rx[i] as number) - mx;
    const dy = (ry[i] as number) - mx;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.max(1e-12, Math.sqrt(sxx * syy));
}
