/**
 * Prompto async multi-model LLM query harness + per-experiment spend tracking
 *
 * Research port: arXiv:2408.11847
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Adopts Prompto as GSE's standard async multi-model LLM query harness, extended with per-experiment spend tracking: tokens in/out per model, cost per 100 prompts reconciled against provider invoices. Spend math + harness config; no live model calls here.
 *
 * ACCEPTANCE GATE: ADOPT only if the 100-prompt x 2-model test completes >=5x faster than the synchronous baseline with zero dropped prompts and spend reconciles within 1%.
 */

export interface ModelSpend {
  model: string;
  tokensIn: number;
  tokensOut: number;
  costPer1kIn: number;
  costPer1kOut: number;
}

export interface PromptRun {
  runId: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  dropped: boolean;
}

/** Cost of one model's usage: (in/1000)*rateIn + (out/1000)*rateOut. */
export function modelCost(m: ModelSpend): number {
  return (m.tokensIn / 1000) * m.costPer1kIn + (m.tokensOut / 1000) * m.costPer1kOut;
}

/** Aggregate spend across models for one experiment. */
export function experimentSpend(runs: PromptRun[], rates: Record<string, { in: number; out: number }>): {
  totalCost: number;
  perModel: Record<string, number>;
  dropped: number;
} {
  const perModel: Record<string, number> = {};
  let totalCost = 0, dropped = 0;
  for (const r of runs) {
    if (r.dropped) { dropped++; continue; }
    const rate = rates[r.model] ?? { in: 0, out: 0 };
    const c = (r.tokensIn / 1000) * rate.in + (r.tokensOut / 1000) * rate.out;
    perModel[r.model] = (perModel[r.model] ?? 0) + c;
    totalCost += c;
  }
  return { totalCost, perModel, dropped };
}

/** Cost per 100 prompts (the invoice-reconciliation unit). */
export function costPer100Prompts(totalCost: number, promptCount: number): number {
  return promptCount === 0 ? 0 : (totalCost / promptCount) * 100;
}

/** Reconciliation: tracked spend within 1% of the provider invoice. */
export function reconciles(tracked: number, invoiced: number): boolean {
  if (invoiced === 0) return tracked === 0;
  return Math.abs(tracked - invoiced) / invoiced <= 0.01;
}

/** Gate: >=5x speedup, zero drops, spend reconciles. */
export function promptoGatePasses(
  syncMs: number, asyncMs: number, dropped: number, tracked: number, invoiced: number,
): boolean {
  return asyncMs > 0 && syncMs / asyncMs >= 5 && dropped === 0 && reconciles(tracked, invoiced);
}


/** Live-data gate: stays off until prompt-cost harness validated on GSE experiments. */
export const GSE_PROMPTO_HARNESS_ENABLED = false;
