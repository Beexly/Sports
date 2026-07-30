/**
 * Multi-source quote aggregator — odds-API-independent by design.
 */

import { medianConsensus } from "./devig/american";
import type {
  AggregatedQuote,
  QuoteFetchRequest,
  QuoteLine,
  QuoteProvider,
} from "./types";

export interface AggregateOptions {
  /** Prefer prediction markets + model before sportsbooks */
  readonly preferNonBook?: boolean;
  /** Allow model_prior as last resort */
  readonly allowModelFallback?: boolean;
  /** Drop synthetic_demo in production path */
  readonly allowDemo?: boolean;
}

const KIND_RANK: Record<string, number> = {
  prediction_market: 0,
  exchange: 1,
  sportsbook_aggregator: 2,
  closing_archive: 3,
  model_prior: 4,
  synthetic_demo: 5,
};

export async function fetchAllQuotes(
  providers: readonly QuoteProvider[],
  req: QuoteFetchRequest,
  opts: AggregateOptions = {},
): Promise<QuoteLine[]> {
  const results = await Promise.all(
    providers.map(async (p) => {
      try {
        return await p.fetchQuotes(req);
      } catch {
        return [] as QuoteLine[];
      }
    }),
  );
  let lines = results.flat();
  if (!opts.allowDemo) {
    lines = lines.filter((l) => l.sourceKind !== "synthetic_demo");
  }
  return lines;
}

function groupKey(l: QuoteLine): string {
  return `${l.eventId}|${l.market}|${l.selection}`;
}

/**
 * Propagate methodTag/modelVersion only when EVERY line in the pool carries a
 * non-empty tag/version AND they all agree. Partial tags must not mint a
 * false continuity claim (mixed tagged+untagged → leave unset → refuse CLV).
 */
export function uniformMethodTags(
  pool: readonly QuoteLine[],
): { methodTag?: string; modelVersion?: string } {
  if (!pool.length) return {};
  const allTagged = pool.every(
    (p) => Boolean(p.methodTag?.trim()) && Boolean(p.modelVersion?.trim()),
  );
  if (!allTagged) return {};
  const tags = new Set(pool.map((p) => p.methodTag!.trim()));
  const versions = new Set(pool.map((p) => p.modelVersion!.trim()));
  return {
    methodTag: tags.size === 1 ? [...tags][0] : undefined,
    modelVersion: versions.size === 1 ? [...versions][0] : undefined,
  };
}

export function aggregateLines(
  lines: readonly QuoteLine[],
  opts: AggregateOptions = {},
): AggregatedQuote[] {
  const map = new Map<string, QuoteLine[]>();
  for (const l of lines) {
    if (!opts.allowModelFallback && l.sourceKind === "model_prior") continue;
    const k = groupKey(l);
    const arr = map.get(k) ?? [];
    arr.push(l);
    map.set(k, arr);
  }

  const out: AggregatedQuote[] = [];
  for (const [, group] of map) {
    let pool = group;
    if (opts.preferNonBook) {
      const nonBook = group.filter(
        (g) =>
          g.sourceKind === "prediction_market" ||
          g.sourceKind === "exchange" ||
          g.sourceKind === "closing_archive",
      );
      if (nonBook.length) pool = nonBook;
    }

    // Prefer higher-confidence / better kind order for single
    pool = [...pool].sort(
      (a, b) =>
        (KIND_RANK[a.sourceKind] ?? 9) - (KIND_RANK[b.sourceKind] ?? 9) ||
        (b.confidence ?? 0) - (a.confidence ?? 0),
    );

    const qs = pool.map((p) => p.q);
    const method =
      qs.length > 1
        ? ("median" as const)
        : pool[0]!.sourceKind === "model_prior"
          ? ("model_fallback" as const)
          : ("single" as const);
    const q = qs.length > 1 ? medianConsensus(qs) : qs[0]!;
    const newest = pool.reduce((a, b) =>
      Date.parse(a.quoteAsOf) >= Date.parse(b.quoteAsOf) ? a : b,
    );

    const { methodTag, modelVersion } = uniformMethodTags(pool);

    out.push({
      eventId: pool[0]!.eventId,
      sport: pool[0]!.sport,
      market: pool[0]!.market,
      selection: pool[0]!.selection,
      q,
      quoteAsOf: newest.quoteAsOf,
      sources: pool,
      method,
      methodTag,
      modelVersion,
      independence: {
        oddsApiRequired: false,
        booksUsed: pool.filter((p) => p.sourceKind === "sportsbook_aggregator")
          .length,
        predictionMarketsUsed: pool.filter(
          (p) => p.sourceKind === "prediction_market",
        ).length,
        modelFallback: pool.some((p) => p.sourceKind === "model_prior"),
      },
    });
  }
  return out;
}

export async function getIndependentQuotes(
  providers: readonly QuoteProvider[],
  req: QuoteFetchRequest,
  opts: AggregateOptions = {},
): Promise<AggregatedQuote[]> {
  const lines = await fetchAllQuotes(providers, req, {
    allowDemo: opts.allowDemo ?? false,
    allowModelFallback: opts.allowModelFallback ?? true,
    preferNonBook: opts.preferNonBook ?? true,
  });
  return aggregateLines(lines, opts);
}

/** Phase-out health: can we produce q without The Odds API? */
export function oddsApiIndependenceReport(providers: readonly QuoteProvider[]) {
  const nonOdds = providers.filter((p) => p.id !== "the_odds_api");
  const free = nonOdds.filter((p) => !p.requiresApiKey);
  const primary = free.filter((p) => p.phaseOutRole === "primary_candidate");
  return {
    oddsApiRequired: false as const,
    freeProviders: free.map((p) => p.id),
    primaryCandidates: primary.map((p) => p.id),
    legacyEnrichment: providers
      .filter((p) => p.phaseOutRole === "legacy")
      .map((p) => p.id),
    readyForOfflineDemo: free.some((p) => p.kind === "synthetic_demo"),
    readyForProdWithoutOddsApi: primary.length >= 1,
  };
}
