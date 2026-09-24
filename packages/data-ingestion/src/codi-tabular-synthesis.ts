/**
 * CoDi: Co-evolving Contrastive Diffusion Models for Mixed-type Tabular Synthesis
 *
 * arXiv:2304.12654v1 · lane:synthetic_data · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Stand up CoDi as the fallback/alternative synthetic-season generator if TabDDPM's cross-type
 * correlations gate fails: same nflverse game-level table but keeping discrete features native
 * (venue type, surface, weather bin, rest category, game-script regime) - continuous diffusion on
 * EPA/pace/market numerics, discrete diffusion on the categorical block, co-evolving conditioning
 * both directions, contrastive negatives via Method 3 (shuffle discrete blocks across games so the
 * triplet loss learns weather x efficiency pairings matter), quantile transform for long-tailed
 * margin/EPA features - with market-aware negatives: pair a game's efficiency vector with the
 * weather/discrete block of a game from a DIFFERENT spread bucket, teaching the model that
 * discrete-continuous correlations are regime-dependent.
 *
 * ACCEPTANCE GATE: ADOPT CoDi over TabDDPM if BOTH: (a) real+CoDi-synthetic beats real+TabDDPM-synthetic by >=0.002
 * log-loss on held-out 2024, OR ties within 0.001 while (b) cross-type correlation MAE is >=10%
 * lower for CoDi; REJECT (stay with TabDDPM) if neither holds, if training instability appears
 * (triplet loss non-convergence across 2+ seeds), or fidelity marginals breach the 5% TVD rule.
 *
 * Ingest role: feature builder (CoDi mixed-type tabular synthesis: schema + copula sampler core).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2304.12654v1" as const;
export const LANE = "synthetic_data" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT CoDi over TabDDPM if BOTH: (a) real+CoDi-synthetic beats real+TabDDPM-synthetic by >=0.002
 * log-loss on held-out 2024, OR ties within 0.001 while (b) cross-type correlation MAE is >=10%
 * lower for CoDi; REJECT (stay with TabDDPM) if neither holds, if training instability appears
 * (triplet loss non-convergence across 2+ seeds), or fidelity marginals breach the 5% TVD rule.`;

export const CONFIG = {
  enabled: false,
  method: "CoDi co-evolving contrastive diffusion",
  types: ["continuous", "categorical"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type ColType = "continuous" | "categorical";

export interface ColSpec {
  readonly name: string;
  readonly type: ColType;
  readonly categories?: readonly string[];
}

export function isColSpec(x: unknown): x is ColSpec {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o["name"] !== "string" || (o["type"] !== "continuous" && o["type"] !== "categorical")) return false;
  if (o["type"] === "categorical") {
    return Array.isArray(o["categories"]) && (o["categories"] as unknown[]).every((c) => typeof c === "string") && (o["categories"] as unknown[]).length > 0;
  }
  return true;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  return (rng() + rng() + rng() + rng() - 2) * 1.5;
}

/**
 * Gaussian-copula sampler core: correlate uniforms via a Cholesky factor,
 * then invert per-column marginals. Offline-calibrated on real tables.
 */
export function copulaSample(
  cols: readonly ColSpec[],
  chol: readonly number[][],
  marginals: ReadonlyArray<(u: number) => number | string | null>,
  seed = 7,
): Record<string, number | string> | null {
  const d = cols.length;
  if (d === 0 || chol.length !== d || marginals.length !== d) return null;
  if (!cols.every(isColSpec)) return null;
  const rng = mulberry32(seed);
  const z = Array.from({ length: d }, () => gaussian(rng));
  const y = z.map((_, i) => {
    let s = 0;
    for (let j = 0; j <= i; j++) {
      const c = chol[i]?.[j];
      if (!isFiniteNumber(c ?? NaN)) return NaN;
      s += (c ?? 0) * (z[j] ?? 0);
    }
    return s;
  });
  if (y.some((v) => !isFiniteNumber(v))) return null;
  const Phi = (v: number): number => 0.5 * (1 + erf(v / Math.SQRT2));
  const out: Record<string, number | string> = {};
  for (let i = 0; i < d; i++) {
    const v = marginals[i]?.(Phi(y[i] ?? 0));
    if (v === null || v === undefined) return null;
    out[cols[i]?.name ?? `c${i}`] = v;
  }
  return out;
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Empirical quantile marginal for a continuous column. */
export function quantileMarginal(values: readonly number[]): ((u: number) => number | null) | null {
  if (values.length === 0 || !values.every(isFiniteNumber)) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return (u: number) => {
    if (!isFiniteNumber(u) || u < 0 || u > 1) return null;
    const idx = Math.min(sorted.length - 1, Math.floor(u * sorted.length));
    return sorted[idx] ?? null;
  };
}
