/**
 * SMARTFEAT loop: versioned data agenda + AST-safe operator registry (LLM-free core)
 *
 * Research port: arXiv:2309.07856
 * Normalized lane: auto_feature_eng | Doctrine: PROPRIETARY_EDGE
 *
 * Implements the automatable core of the SMARTFEAT loop: a versioned dataset description ('data agenda': column names, dtypes, domain notes, prediction class, downstream model) and an operator registry restricted to AST-safe, auditable transforms (groupby aggregates, diffs, rolling means, ratios, z-scores). The zero-shot LLM operator SELECTOR is intentionally out of scope: operators are chosen from the typed whitelist only. Enforces <=30 generated features.
 *
 * ACCEPTANCE GATE: ADAPT only if >=0.003 held-out NFL log-loss improvement on 2025 games vs the raw-features baseline, with <=30 generated features, all AST-safe. Live-data gate -> GSE_SMARTFEAT_ENABLED flag (default false).
 */

export type DType = "int" | "float" | "bool" | "category" | "datetime";

export interface AgendaColumn {
  name: DType extends never ? never : string;
  dtype: DType;
  domainNote: string;
}

export interface DataAgenda {
  version: string;
  predictionClass: "binary" | "regression" | "multiclass";
  downstreamModel: string;
  columns: AgendaColumn[];
}

export type SafeOperator =
  | "groupby_mean" | "groupby_std" | "groupby_count"
  | "diff" | "rolling_mean_3" | "rolling_mean_5"
  | "ratio" | "zscore";

export const SAFE_OPERATORS: SafeOperator[] = [
  "groupby_mean", "groupby_std", "groupby_count",
  "diff", "rolling_mean_3", "rolling_mean_5",
  "ratio", "zscore",
];

export const MAX_GENERATED_FEATURES = 30;

export function buildAgenda(
  version: string,
  predictionClass: DataAgenda["predictionClass"],
  downstreamModel: string,
  columns: AgendaColumn[],
): DataAgenda {
  return { version, predictionClass, downstreamModel, columns };
}

/** Reject anything outside the AST-safe whitelist; enforce the <=30 feature cap. */
export function validateOperators(ops: string[], featureCount: number): { ok: boolean; rejected: string[]; reason?: string } {
  const rejected = ops.filter((o) => !(SAFE_OPERATORS as string[]).includes(o));
  if (rejected.length > 0) return { ok: false, rejected, reason: "operator outside AST-safe whitelist" };
  if (featureCount > MAX_GENERATED_FEATURES) {
    return { ok: false, rejected: [], reason: `feature cap exceeded: ${featureCount} > ${MAX_GENERATED_FEATURES}` };
  }
  return { ok: true, rejected: [] };
}

export type Row = Record<string, number | string | null>;

/** Apply one whitelisted operator to numeric columns of a row set (pure). */
export function applyOperator(op: SafeOperator, rows: Row[], colA: string, colB?: string): Row[] {
  const nums = (r: Row, c: string): number => Number(r[c] ?? 0);
  switch (op) {
    case "diff":
      return rows.map((r, i) => ({ ...r, [`${colA}_diff`]: i === 0 ? 0 : nums(r, colA) - nums(rows[i - 1] ?? {}, colA) }));
    case "ratio": {
      const b = colB ?? colA;
      return rows.map((r) => ({ ...r, [`${colA}_div_${b}`]: nums(r, b) === 0 ? 0 : nums(r, colA) / nums(r, b) }));
    }
    case "zscore": {
      const vals = rows.map((r) => nums(r, colA));
      const m = vals.reduce((a, x) => a + x, 0) / (vals.length || 1);
      const sd = Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / (vals.length || 1)) || 1;
      return rows.map((r) => ({ ...r, [`${colA}_z`]: (nums(r, colA) - m) / sd }));
    }
    case "rolling_mean_3":
    case "rolling_mean_5": {
      const w = op === "rolling_mean_3" ? 3 : 5;
      return rows.map((r, i) => {
        const slice = rows.slice(Math.max(0, i - w + 1), i + 1);
        return { ...r, [`${colA}_roll${w}`]: slice.reduce((a, x) => a + nums(x, colA), 0) / slice.length };
      });
    }
    case "groupby_mean":
    case "groupby_std":
    case "groupby_count": {
      const key = colB ?? "team";
      const groups = new Map<string, number[]>();
      for (const r of rows) {
        const k = String(r[key] ?? "na");
        const list = groups.get(k);
        if (list) list.push(nums(r, colA));
        else groups.set(k, [nums(r, colA)]);
      }
      const agg = (vs: number[]): number => {
        if (op === "groupby_count") return vs.length;
        const m = vs.reduce((a, x) => a + x, 0) / vs.length;
        if (op === "groupby_mean") return m;
        return Math.sqrt(vs.reduce((a, x) => a + (x - m) ** 2, 0) / vs.length);
      };
      return rows.map((r) => ({ ...r, [`${colA}_${op}_${String(r[key] ?? "na")}`]: agg(groups.get(String(r[key] ?? "na")) ?? []) }));
    }
  }
}

/** Live-data gate: >=0.003 log-loss improvement on 2025 holdout before adoption. */
export const GSE_SMARTFEAT_ENABLED = false;

