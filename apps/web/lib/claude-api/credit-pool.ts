/**
 * Credit-pool attribution for Claude spend.
 *
 * Every Claude call is already recorded to the DB ledger (ClaudeApiCallRecord)
 * with the resolved `modelName`. Because each provider returns a distinctly-shaped
 * model id — Bedrock ids carry an `anthropic.` / regional inference-profile prefix,
 * Vertex Model Garden ids carry an `@version`, and the direct Anthropic API returns
 * a plain `claude-*` id — we can attribute each dollar of spend to the credit pool
 * that paid for it WITHOUT a schema migration.
 *
 * This gives the visibility the credits strategy needs: "how much of AWS Activate
 * vs the Vertex partner credit vs the direct Anthropic bill have we burned?" — read
 * from the real ledger, not a parallel file. If we later add an explicit `provider`
 * column to the ledger, `creditPoolForModel` becomes a fallback rather than the
 * source of truth; until then the id shape is authoritative.
 */

export type CreditPool = "aws_activate" | "vertex_partner" | "anthropic_direct";

export interface CreditPoolMeta {
  readonly label: string;
  readonly provider: "bedrock" | "vertex" | "anthropic";
  /** Whether this spend is offsettable by cloud-program credits. */
  readonly creditEligible: boolean;
  readonly note: string;
}

export const CREDIT_POOL_META: Record<CreditPool, CreditPoolMeta> = {
  aws_activate: {
    label: "AWS Activate (Bedrock)",
    provider: "bedrock",
    creditEligible: true,
    note: "Claude via Bedrock InvokeModel — billable to AWS Activate GenAI credits.",
  },
  vertex_partner: {
    label: "Google Vertex partner credit",
    provider: "vertex",
    creditEligible: true,
    note: "Claude via Vertex Model Garden — billable to the $10k Anthropic partner credit.",
  },
  anthropic_direct: {
    label: "Anthropic direct",
    provider: "anthropic",
    creditEligible: false,
    note: "Direct Anthropic API — cash unless offset by Anthropic Claude-for-Startups credits.",
  },
};

/**
 * Classify a recorded model id to the credit pool that paid for it.
 *
 * Order matters: the Vertex `@` marker and the Bedrock `anthropic.` /
 * `<region>.anthropic.` prefixes are checked before the plain `claude-*`
 * direct-API shape. Unknown shapes default to anthropic_direct (the cash pool) —
 * the conservative choice, since it never over-claims credit coverage.
 */
export function creditPoolForModel(modelName: string): CreditPool {
  const id = modelName.trim();
  if (id.includes("@")) return "vertex_partner"; // e.g. claude-3-5-sonnet-v2@20241022
  // Bedrock: "anthropic.claude-..." or a cross-region inference profile
  // "us.anthropic.claude-...", "eu.anthropic.*", "apac.anthropic.*".
  if (/^(?:[a-z]{2,4}\.)?anthropic\./.test(id)) return "aws_activate";
  return "anthropic_direct";
}

export interface SpendRecord {
  readonly modelName: string;
  readonly estimatedCostUsd: number | string | { readonly toString: () => string };
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

export interface CreditPoolTotals {
  readonly pool: CreditPool;
  readonly label: string;
  readonly creditEligible: boolean;
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCostUsd: number;
}

function toNumber(value: SpendRecord["estimatedCostUsd"]): number {
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

/** Pre-grouped ledger rows (e.g. from a Prisma groupBy by modelName). */
export interface GroupedSpendRecord extends SpendRecord {
  readonly calls: number;
}

function finalize(
  acc: Map<CreditPool, { calls: number; input: number; output: number; usd: number }>,
): CreditPoolTotals[] {
  return [...acc.entries()]
    .map(([pool, b]) => ({
      pool,
      label: CREDIT_POOL_META[pool].label,
      creditEligible: CREDIT_POOL_META[pool].creditEligible,
      calls: b.calls,
      inputTokens: b.input,
      outputTokens: b.output,
      estimatedCostUsd: Math.round(b.usd * 1e6) / 1e6,
    }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);
}

/**
 * Roll up per-call ledger records by credit pool. Pure — the DB-reading wrapper
 * feeds it, so the aggregation logic is unit-tested without a database. Pools with
 * no spend are omitted; the result is sorted by descending spend (biggest first).
 */
export function rollupByCreditPool(records: readonly SpendRecord[]): CreditPoolTotals[] {
  const acc = new Map<CreditPool, { calls: number; input: number; output: number; usd: number }>();
  for (const record of records) {
    const pool = creditPoolForModel(record.modelName);
    const bucket = acc.get(pool) ?? { calls: 0, input: 0, output: 0, usd: 0 };
    bucket.calls += 1;
    bucket.input += record.inputTokens ?? 0;
    bucket.output += record.outputTokens ?? 0;
    bucket.usd += toNumber(record.estimatedCostUsd);
    acc.set(pool, bucket);
  }
  return finalize(acc);
}

/**
 * Same rollup, but over pre-grouped rows (one row per distinct model with its call
 * count) — lets the DB reader use an efficient groupBy instead of fetching every
 * call. Multiple model ids can map to the same pool, so rows are merged, not assumed
 * one-per-pool.
 */
export function rollupGroupedByCreditPool(groups: readonly GroupedSpendRecord[]): CreditPoolTotals[] {
  const acc = new Map<CreditPool, { calls: number; input: number; output: number; usd: number }>();
  for (const group of groups) {
    const pool = creditPoolForModel(group.modelName);
    const bucket = acc.get(pool) ?? { calls: 0, input: 0, output: 0, usd: 0 };
    bucket.calls += group.calls;
    bucket.input += group.inputTokens ?? 0;
    bucket.output += group.outputTokens ?? 0;
    bucket.usd += toNumber(group.estimatedCostUsd);
    acc.set(pool, bucket);
  }
  return finalize(acc);
}
