/**
 * C7 offline source-bias / feature hygiene (cat:C7).
 *
 * Flag suspicious feature columns before they poison the ensemble:
 * constant columns, near-zero variance, extreme missingness, and
 * market-correlated leakage candidates. Measurement only.
 */

export type FeatureColumnStats = {
  readonly name: string;
  readonly n: number;
  readonly missingRate: number;
  readonly variance: number | null;
  readonly mean: number | null;
  /** |corr| with a market-implied column when both finite; else null. */
  readonly absCorrVsMarket: number | null;
  readonly flags: readonly string[];
};

export type OfflineSourceBiasResult = {
  readonly columns: readonly FeatureColumnStats[];
  readonly notes: readonly string[];
};

export type FeatureMatrixRow = {
  readonly marketImplied: number | null;
  readonly features: Readonly<Record<string, number | null | undefined>>;
};

function meanVar(xs: number[]): { mean: number; variance: number } | null {
  if (xs.length === 0) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
  return { mean: m, variance: v };
}

function pearson(a: number[], b: number[]): number | null {
  if (a.length < 3 || a.length !== b.length) return null;
  const ma = a.reduce((x, y) => x + y, 0) / a.length;
  const mb = b.reduce((x, y) => x + y, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = a[i]! - ma;
    const xb = b[i]! - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

const MISSING_FLAG = 0.4;
const VAR_EPS = 1e-12;
const LEAK_CORR = 0.98;

export function runOfflineSourceBiasHygiene(
  rows: readonly FeatureMatrixRow[],
): OfflineSourceBiasResult {
  const names = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r.features)) names.add(k);
  }
  const sorted = [...names].sort();
  const columns: FeatureColumnStats[] = sorted.map((name) => {
    const raw = rows.map((r) => r.features[name]);
    const finite = raw.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const missingRate = rows.length === 0 ? 0 : 1 - finite.length / rows.length;
    const mv = meanVar(finite);
    const pairedA: number[] = [];
    const pairedB: number[] = [];
    for (const r of rows) {
      const f = r.features[name];
      const m = r.marketImplied;
      if (typeof f === "number" && Number.isFinite(f) && typeof m === "number" && Number.isFinite(m)) {
        pairedA.push(f);
        pairedB.push(m);
      }
    }
    const corr = pearson(pairedA, pairedB);
    const flags: string[] = [];
    if (missingRate >= MISSING_FLAG) flags.push("high_missingness");
    if (mv == null) flags.push("no_finite_values");
    else if (mv.variance <= VAR_EPS) flags.push("near_constant");
    if (corr != null && Math.abs(corr) >= LEAK_CORR) flags.push("market_leakage_suspect");
    return {
      name,
      n: finite.length,
      missingRate,
      variance: mv?.variance ?? null,
      mean: mv?.mean ?? null,
      absCorrVsMarket: corr == null ? null : Math.abs(corr),
      flags,
    };
  });
  return {
    columns,
    notes: [
      "Offline / measurement only — does not drop features from production.",
      `Flags: missing≥${MISSING_FLAG}, variance≤${VAR_EPS}, |corr(market)|≥${LEAK_CORR}.`,
      "Park/defense and source-bias features should clear these before C2 bake-off wiring.",
    ],
  };
}

export const OFFLINE_SOURCE_BIAS_FIXTURE: readonly FeatureMatrixRow[] = [
  { marketImplied: 0.55, features: { elo: 80, junk: 1, leak: 0.55, sparse: null } },
  { marketImplied: 0.48, features: { elo: -40, junk: 1, leak: 0.48, sparse: null } },
  { marketImplied: 0.5, features: { elo: 10, junk: 1, leak: 0.5, sparse: 0.1 } },
  { marketImplied: 0.52, features: { elo: -15, junk: 1, leak: 0.52, sparse: null } },
  { marketImplied: 0.38, features: { elo: -60, junk: 1, leak: 0.38, sparse: null } },
  { marketImplied: 0.4, features: { elo: -90, junk: 1, leak: 0.4, sparse: null } },
];
