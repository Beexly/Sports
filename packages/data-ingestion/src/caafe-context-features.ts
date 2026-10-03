/**
 * Large Language Models for Automated Data Science: Introducing CAAFE for Context-Aware Automated Feature Engineering
 *
 * arXiv:2305.03403 · lane:auto_feature_eng · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build 'GSE-CAAFE' as the semantic layer atop the OneBM relational engine: (1) context document
 * with curated schema descriptions of every nflverse/odds table, explicitly stating cutoff
 * semantics ('no column may use post-kickoff information'); (2) candidate generation - LLM
 * proposes <= 20 features/week as pandas code against the relational tables, proposals restricted
 * to pre-kickoff columns by an allowlist filter; (3) execution sandboxed, kept iff validation log-
 * loss improves with a DeLong-style paired test p < 0.05 AND the kickoff-cutoff replay leakage
 * audit passes; (4) analyst review queue with veto - with a sequential keep criterion (paired
 * permutation test with Holm correction) and pre-execution static AST checks rejecting any column
 * reference not in the pre-kickoff allowlist, plus the drift-quarantine list fed as negative
 * context.
 *
 * ACCEPTANCE GATE: ADAPT the layer iff (a) 2024 held-out log-loss improves >= 0.003, AND (b) semantic-blinding
 * ablation shows >= 0.002 of that gain is attributable to semantics (LLM > hashed-name run), AND
 * (c) zero leakage-audit failures across all kept features; REJECT if any kept feature fails
 * cutoff replay, if the blinding ablation matches the semantic run, or if > 30% of proposals are
 * faulty code; budget cap <= $50/month LLM spend.
 *
 * Ingest role: feature builder (CAAFE context-aware automated feature engineering: LLM-suggested transforms).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2305.03403" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT the layer iff (a) 2024 held-out log-loss improves >= 0.003, AND (b) semantic-blinding
 * ablation shows >= 0.002 of that gain is attributable to semantics (LLM > hashed-name run), AND
 * (c) zero leakage-audit failures across all kept features; REJECT if any kept feature fails
 * cutoff replay, if the blinding ablation matches the semantic run, or if > 30% of proposals are
 * faulty code; budget cap <= $50/month LLM spend.`;

export const CONFIG = {
  enabled: false,
  method: "CAAFE",
  llm: "offline suggestion pass; deterministic application here",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type CaafeOp = "ratio" | "diff" | "rolling_mean" | "rolling_max" | "zscore" | "interaction";

export interface CaafeSuggestion {
  readonly name: string;
  readonly op: CaafeOp;
  readonly parents: readonly string[];
  readonly rationale: string;
}

export function isCaafeSuggestion(x: unknown): x is CaafeSuggestion {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["name"] === "string" &&
    ["ratio", "diff", "rolling_mean", "rolling_max", "zscore", "interaction"].includes(o["op"] as string) &&
    Array.isArray(o["parents"]) && (o["parents"] as unknown[]).every((p) => typeof p === "string") &&
    typeof o["rationale"] === "string"
  );
}

/** Apply one CAAFE suggestion to named series. */
export function applySuggestion(
  sug: CaafeSuggestion,
  series: ReadonlyMap<string, readonly number[]>,
  window = 3,
): number[] | null {
  if (!isCaafeSuggestion(sug)) return null;
  const cols = sug.parents.map((p) => series.get(p));
  if (cols.some((c) => !c || c.length === 0)) return null;
  const A = cols[0] ?? [];
  const B = cols[1] ?? [];
  switch (sug.op) {
    case "ratio":
      if (B.length !== A.length) return null;
      return A.map((v, i) => {
        const d = B[i] ?? 0;
        return d === 0 ? 0 : v / d;
      });
    case "diff":
      if (B.length !== A.length) return null;
      return A.map((v, i) => v - (B[i] ?? 0));
    case "interaction":
      if (B.length !== A.length) return null;
      return A.map((v, i) => v * (B[i] ?? 0));
    case "rolling_mean":
    case "rolling_max": {
      if (!Number.isInteger(window) || window <= 0) return null;
      return A.map((_, i) => {
        const w = A.slice(Math.max(0, i - window + 1), i + 1);
        return sug.op === "rolling_mean" ? w.reduce((a, b) => a + b, 0) / w.length : Math.max(...w);
      });
    }
    case "zscore": {
      const m = A.reduce((a, b) => a + b, 0) / A.length;
      const sd = Math.sqrt(A.reduce((a, b) => a + (b - m) * (b - m), 0) / A.length);
      if (sd === 0) return null;
      return A.map((v) => (v - m) / sd);
    }
  }
}

/** Validate a suggestion batch: names unique, parents exist, no cycles. */
export function validateBatch(
  suggestions: readonly unknown[],
  available: ReadonlySet<string>,
): { valid: CaafeSuggestion[]; errors: string[] } {
  const valid: CaafeSuggestion[] = [];
  const errors: string[] = [];
  const names = new Set<string>();
  for (const s of suggestions) {
    if (!isCaafeSuggestion(s)) {
      errors.push("malformed suggestion");
      continue;
    }
    if (names.has(s.name)) {
      errors.push(`duplicate name: ${s.name}`);
      continue;
    }
    const missing = s.parents.filter((p) => !available.has(p) && !names.has(p));
    if (missing.length > 0) {
      errors.push(`missing parents for ${s.name}: ${missing.join(",")}`);
      continue;
    }
    names.add(s.name);
    valid.push(s);
  }
  return { valid, errors };
}
