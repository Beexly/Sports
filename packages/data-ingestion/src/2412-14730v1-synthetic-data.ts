/**
 * Generative AI for Banks: Benchmarks and Algorithms for Synthetic Financial Transaction Data
 *
 * arXiv:2412.14730v1 · lane:synthetic_data · verdict:ADAPT · owner:Motif-lab · doctrine:INFRA
 *
 * Mechanism: Seeded synthetic tabular data: mulberry32 PRNG, Box-Muller Gaussian sampling, per-column normal specs, and a k-anonymity check over quasi-identifiers for privacy triage.
 *
 * Improvement (record):
 * Adopt the five-category evaluation framework (+ TSTR) as the lane's mandatory acceptance rubric for every GSE synthetic-data generator, and add an explicit graph-reconstruction auxiliary loss (GNN link-prediction head penalizing synthetic tables whose implied matchup graph diverges from the real schedule graph) so every synthetic NFL dataset ships with a NetSimile-vs-real-schedule score.
 *
 * ACCEPTANCE GATE:
 * ADOPT the five-category framework (+ TSTR) as the lane's mandatory acceptance rubric if: (a) the harness reproduces the paper's qualitative ranking on a finance-adjacent sanity dataset (FinDiff ≥ TVAE ≥ CTGAN on fidelity), AND (b) every lane generator can be scored end-to-end; graph experiment target: NetSimile ≤19 while holding column fidelity ≥0.90.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: synthetic fixture generator. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2412.14730v1" as const;
export const LANE = "synthetic_data" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the five-category framework (+ TSTR) as the lane's mandatory acceptance rubric if: (a) the harness reproduces the paper's qualitative ranking on a finance-adjacent sanity dataset (FinDiff ≥ TVAE ≥ CTGAN on fidelity), AND (b) every lane generator can be scored end-to-end; graph experiment target: NetSimile ≤19 while holding column fidelity ≥0.90.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Per-column normal-distribution spec for synthetic rows. */
export interface NormalSpec {
  mean: number;
  sd: number;
}

/** Seeded PRNG (mulberry32): deterministic across runs for the same seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box-Muller. */
export function gaussianSample(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** One synthetic tabular row from per-column normal specs. */
export function synthTabularRow(rng: () => number, spec: NormalSpec[]): number[] | null {
  if (spec.length === 0) return null;
  if (!spec.every((s) => isFiniteNumber(s.mean) && isFiniteNumber(s.sd) && s.sd >= 0)) return null;
  return spec.map((s) => s.mean + s.sd * gaussianSample(rng));
}

/**
 * k-anonymity check: every quasi-identifier group must contain >= k rows.
 * rows are string cells; quasiIds are the column indices forming the key.
 */
export function kAnonymityHolds(rows: string[][], quasiIds: number[], k: number): boolean | null {
  if (rows.length === 0 || !Number.isInteger(k) || k < 1) return null;
  const groups = new Map<string, number>();
  for (const r of rows) {
    const key = quasiIds.map((i) => r[i] ?? "").join("|");
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  for (const n of groups.values()) {
    if (n < k) return false;
  }
  return true;
}
