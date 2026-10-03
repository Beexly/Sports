/**
 * Model-as-q fallback — when no market quote is available.
 * Honest: rights=internal_synthetic, lower confidence, never pretend it's a book.
 */

import type { QuoteFetchRequest, QuoteLine, QuoteProvider } from "../types";
import { clamp01 } from "../devig/american";

export interface ModelPriorInput {
  readonly eventId: string;
  readonly sport: string;
  readonly selection: string;
  /** Raw model probability (p) — used as q only in no-book mode */
  readonly p: number;
  readonly asOf?: string;
}

/**
 * Provider that accepts injected model priors (call site supplies p).
 * For fetchQuotes without injection, returns [].
 */
export function createModelPriorProvider(
  priors: readonly ModelPriorInput[] = [],
  now: () => Date = () => new Date(),
): QuoteProvider {
  return {
    id: "gse.model_prior",
    kind: "model_prior",
    rights: "internal_synthetic",
    requiresApiKey: false,
    phaseOutRole: "primary_candidate",
    async fetchQuotes(req: QuoteFetchRequest): Promise<QuoteLine[]> {
      const asOf = (req.asOf ? new Date(req.asOf) : now()).toISOString();
      return priors
        .filter((pr) => {
          if (req.sport && pr.sport !== req.sport && req.sport !== "MULTI")
            return false;
          if (req.eventId && pr.eventId !== req.eventId) return false;
          return true;
        })
        .map((pr) => ({
          eventId: pr.eventId,
          sport: pr.sport,
          market: "model" as const,
          selection: pr.selection,
          q: clamp01(pr.p),
          quoteAsOf: pr.asOf ?? asOf,
          sourceId: "gse.model_prior",
          sourceKind: "model_prior" as const,
          rights: "internal_synthetic" as const,
          confidence: 0.55,
          notes:
            "Model prior as q — no book dependency. Edge interpretation changes (model vs self).",
          methodTag: "model_prior_v1",
          modelVersion: "quote.model_prior.v1",
        }));
    },
  };
}
