/**
 * Multi-source quote plane — THE_ODDS_API is one provider, not the law.
 * Phase-out: books optional; prediction markets + model prior + archives first-class.
 */

export type QuoteSourceKind =
  | "sportsbook_aggregator" // The Odds API, SharpAPI, etc.
  | "prediction_market" // Polymarket Gamma, Kalshi
  | "exchange" // Betfair (future)
  | "model_prior" // GSE model as q when no market
  | "closing_archive" // historical close for CLV
  | "synthetic_demo"; // offline product demos only

export type QuoteRights =
  | "api_tos"
  | "public_market"
  | "internal_synthetic"
  | "licensed_odds"
  | "research_only";

export interface QuoteLine {
  readonly eventId: string;
  readonly sport: string;
  readonly market: "h2h" | "spreads" | "totals" | "binary_pm" | "model";
  readonly selection: string; // e.g. home team / Over / Yes
  readonly q: number; // fair probability in (0,1) after de-vig when applicable
  readonly rawAmerican?: number;
  readonly rawDecimal?: number;
  readonly quoteAsOf: string; // ISO
  readonly sourceId: string;
  readonly sourceKind: QuoteSourceKind;
  readonly rights: QuoteRights;
  readonly bookId?: string;
  readonly overround?: number;
  readonly confidence?: number; // source quality 0-1
  readonly notes?: string;
}

export interface QuoteFetchRequest {
  readonly sport: string;
  readonly eventId?: string;
  readonly market?: QuoteLine["market"];
  readonly asOf?: string;
  readonly maxAgeMs?: number;
}

export interface QuoteProvider {
  readonly id: string;
  readonly kind: QuoteSourceKind;
  readonly rights: QuoteRights;
  readonly requiresApiKey: boolean;
  readonly phaseOutRole: "primary_candidate" | "enrichment" | "legacy" | "demo";
  fetchQuotes(req: QuoteFetchRequest): Promise<QuoteLine[]>;
}

export interface AggregatedQuote {
  readonly eventId: string;
  readonly sport: string;
  readonly market: QuoteLine["market"];
  readonly selection: string;
  readonly q: number; // consensus fair p
  readonly quoteAsOf: string; // newest contributing
  readonly sources: readonly QuoteLine[];
  readonly method: "median" | "single" | "model_fallback";
  readonly independence: {
    readonly oddsApiRequired: false;
    readonly booksUsed: number;
    readonly predictionMarketsUsed: number;
    readonly modelFallback: boolean;
  };
}
