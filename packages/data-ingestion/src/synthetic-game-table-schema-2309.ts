/**
 * Embedding-diffusion synthetic game-table backbone: schema + fidelity metrics
 *
 * Research port: arXiv:2309.01472
 * Normalized lane: synthetic_data | Doctrine: INFRA
 *
 * Defines the nflverse game-level table schema used by the embedding-diffusion synthetic backbone (categorical columns with learned embeddings E in R^{D x C}, D in {8,16}), plus the Omega_col / Omega_row fidelity metrics used by the gate.
 *
 * ACCEPTANCE GATE: ADOPT as production backbone only if Omega_col >= 0.90 AND Omega_row >= 0.80 on the NFL table AND real+synthetic log-loss beats real-only. Live-data gate -> GSE_EMBEDDING_DIFFUSION_ENABLED flag (default false).
 */

export type GameTableColumnKind = "categorical" | "numeric" | "boolean";

export interface GameTableColumn {
  name: string;
  kind: GameTableColumnKind;
  /** cardinality for categoricals (teams, opponents, venue types, ...); undefined for numerics */
  cardinality?: number;
  /** embedding width D; paper grid {8, 16} */
  embeddingDim?: 8 | 16;
}

export const EMBEDDING_DIMS = [8, 16] as const;

export const SYNTHETIC_GAME_TABLE_SCHEMA: GameTableColumn[] = [
  { name: "team", kind: "categorical", cardinality: 32, embeddingDim: 16 },
  { name: "opponent", kind: "categorical", cardinality: 32, embeddingDim: 16 },
  { name: "venue_type", kind: "categorical", cardinality: 4, embeddingDim: 8 },
  { name: "surface", kind: "categorical", cardinality: 3, embeddingDim: 8 },
  { name: "weather_bin", kind: "categorical", cardinality: 5, embeddingDim: 8 },
  { name: "rest_category", kind: "categorical", cardinality: 4, embeddingDim: 8 },
  { name: "home_flag", kind: "boolean" },
  { name: "points_for", kind: "numeric" },
  { name: "points_against", kind: "numeric" },
  { name: "spread", kind: "numeric" },
  { name: "total", kind: "numeric" },
  { name: "elo_diff", kind: "numeric" },
];

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const x = (xs[i] ?? 0) - mx;
    const y = (ys[i] ?? 0) - my;
    num += x * y; dx += x ** 2; dy += y ** 2;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

function toNumeric(rows: Record<string, number | string>[], col: GameTableColumn): number[] {
  return rows.map((r) => {
    const v = r[col.name];
    if (col.kind === "numeric" || col.kind === "boolean") return Number(v);
    return Number(v); // categoricals arrive pre-encoded as integer codes
  });
}

/**
 * Omega_col: mean absolute correlation preservation across numeric column pairs.
 * 1.0 = identical correlation structure, 0.0 = unrelated.
 */
export function omegaCol(real: Record<string, number | string>[], synthetic: Record<string, number | string>[]): number {
  const cols = SYNTHETIC_GAME_TABLE_SCHEMA.filter((c) => c.kind !== "categorical");
  let sum = 0, pairs = 0;
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const ci = cols[i];
      const cj = cols[j];
      if (ci === undefined || cj === undefined) continue;
      const cr = pearson(toNumeric(real, ci), toNumeric(real, cj));
      const cs = pearson(toNumeric(synthetic, ci), toNumeric(synthetic, cj));
      sum += 1 - Math.abs(cr - cs);
      pairs++;
    }
  }
  return pairs === 0 ? 1 : sum / pairs;
}

/** Omega_row: fraction of synthetic rows whose nearest-real-neighbor distance is within the real self-distance distribution (simplified: mean feature match). */
export function omegaRow(real: Record<string, number | string>[], synthetic: Record<string, number | string>[]): number {
  if (real.length === 0 || synthetic.length === 0) return 0;
  const cols = SYNTHETIC_GAME_TABLE_SCHEMA;
  const norm = (r: Record<string, number | string>): number[] =>
    cols.map((c) => Number(r[c.name] ?? 0));
  const R = real.map(norm);
  const r0 = R[0] ?? [];
  const means = r0.map((_, j) => R.reduce((a, r) => a + (r[j] ?? 0), 0) / R.length);
  const sds = r0.map((_, j) => {
    const m = means[j] ?? 0;
    const v = R.reduce((a, r) => a + ((r[j] ?? 0) - m) ** 2, 0) / R.length;
    return Math.sqrt(v) || 1;
  });
  const z = (r: number[]): number[] => r.map((v, j) => (v - (means[j] ?? 0)) / (sds[j] ?? 1));
  const Rz = R.map(z);
  let within = 0;
  for (const s of synthetic.map(norm).map(z)) {
    let best = Infinity;
    for (const r of Rz) {
      const d = Math.sqrt(r.reduce((a, v, j) => a + (v - (s[j] ?? 0)) ** 2, 0));
      if (d < best) best = d;
    }
    if (best <= Math.sqrt(cols.length)) within++;
  }
  return within / synthetic.length;
}

/** Live-data gate: the fidelity numbers must clear on the real NFL table first. */
export const GSE_EMBEDDING_DIFFUSION_ENABLED = false;

