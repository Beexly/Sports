/**
 * Credit-pool attribution for AI spend.
 *
 * Every call is recorded to the DB ledger (ClaudeApiCallRecord) with the resolved
 * `modelName`. Provider-shaped ids let us attribute spend to the credit pool that
 * paid for it WITHOUT a schema migration:
 *
 *   - Bedrock: anthropic.* / us.anthropic.* → AWS Activate
 *   - Vertex:  claude-…@version              → Google partner credit
 *   - Cerebras free-lane: gpt-oss-* / *cerebras* → free (reward programs / free tier)
 *   - plain claude-*                         → Anthropic direct (cash unless Claude Startups)
 *
 * This answers: "how much of AWS Activate vs Vertex vs free-lane vs cash?"
 */

export type CreditPool =
  | "aws_activate"
  | "vertex_partner"
  | "cerebras_free"
  | "anthropic_direct";

export interface CreditPoolMeta {
  readonly label: string;
  readonly provider: "bedrock" | "vertex" | "cerebras" | "anthropic";
  /** Whether this spend is offsettable by a free tier or cloud-program credit. */
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
    note: "Claude via Vertex Model Garden — billable to Google/Anthropic partner credits.",
  },
  cerebras_free: {
    label: "Cerebras free lane",
    provider: "cerebras",
    creditEligible: true,
    note: "Content free-lane (gpt-oss / Cerebras free tier) — $0 cash when lane enabled.",
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
 * Order: Vertex @ · Bedrock anthropic. · Cerebras free · Anthropic cash default.
 * Unknown shapes default to anthropic_direct (never over-claim credit coverage).
 */
export function creditPoolForModel(modelName: string): CreditPool {
  const id = modelName.trim();
  if (id.includes("@")) return "vertex_partner"; // e.g. claude-3-5-sonnet-v2@20241022
  // Bedrock: "anthropic.claude-..." or cross-region "us.anthropic.claude-..."
  if (/^(?:[a-z]{2,4}\.)?anthropic\./.test(id)) return "aws_activate";
  // Free-lane Cerebras (default gpt-oss-120b) and explicit cerebras ids
  if (/^gpt-oss/i.test(id) || /cerebras/i.test(id)) return "cerebras_free";
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
 * Roll up per-call ledger records by credit pool. Pure — unit-tested without DB.
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
 * Same rollup over pre-grouped rows (one row per model + call count).
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
