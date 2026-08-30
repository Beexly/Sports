/**
 * Credit-pool attribution for AI spend.
 *
 * Ledger `modelName` shapes map to pools without a schema migration:
 *   - Bedrock: anthropic.* / us.anthropic.*     → aws_activate
 *   - Vertex:  claude-…@version                 → vertex_partner
 *   - Azure Foundry: azure-foundry/*            → azure_foundry
 *   - Cerebras free-lane: gpt-oss-* / *cerebras* → cerebras_free
 *   - plain claude-*                            → anthropic_direct (cash)
 */

export type CreditPool =
  | "aws_activate"
  | "vertex_partner"
  | "azure_foundry"
  | "cerebras_free"
  | "anthropic_direct";

export interface CreditPoolMeta {
  readonly label: string;
  readonly provider: "bedrock" | "vertex" | "azure" | "cerebras" | "anthropic";
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
  azure_foundry: {
    label: "Azure AI Foundry",
    provider: "azure",
    creditEligible: true,
    note: "Claude via Foundry Messages API — bills Azure subscription; verify credit SKU covers Claude.",
  },
  cerebras_free: {
    label: "Open free lane (Cerebras / Gemma / Nemotron hosts)",
    provider: "cerebras",
    creditEligible: true,
    note: "Content free-lane: Cerebras gpt-oss and/or secondary free OpenAI-compat hosts — $0 cash.",
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
 * Unknown shapes default to anthropic_direct (never over-claim credit coverage).
 */
export function creditPoolForModel(modelName: string): CreditPool {
  const id = modelName.trim();
  if (id.startsWith("azure-foundry/")) return "azure_foundry";
  if (id.includes("@")) return "vertex_partner";
  if (/^(?:[a-z]{2,4}\.)?anthropic\./.test(id)) return "aws_activate";
  if (/^gpt-oss/i.test(id) || /cerebras/i.test(id)) return "cerebras_free";
  if (id.startsWith("free-secondary/") || id.startsWith("free-groq/") || id.startsWith("free-nim/") || id.startsWith("free-compat/")) return "cerebras_free";
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
