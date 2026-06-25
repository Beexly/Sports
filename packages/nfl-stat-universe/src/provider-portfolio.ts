/**
 * NFL STAT UNIVERSE — Provider Portfolios.
 *
 * Named, owner-gated acquisition tiers — observer triangulation, not vendor collection. Each portfolio
 * is a plan, never a purchase: spending requires a `--plan` cost preview and owner approval. Enterprise
 * feeds are dossiers, not dependencies. Pure data.
 */

export type PortfolioTier = "free" | "low" | "mid" | "enterprise";

export interface ProviderPortfolio {
  readonly name: string;
  readonly tier: PortfolioTier;
  readonly sourceIds: readonly string[];
  readonly unlocks: string;
  readonly ownerGated: boolean;
}

export const PROVIDER_PORTFOLIOS: readonly ProviderPortfolio[] = [
  { name: "Bootstrap Free", tier: "free", sourceIds: ["nflverse", "nws", "sleeper", "yahoo_oauth"], unlocks: "Free historical base + weather + fantasy crowd clock + consented league sync.", ownerGated: false },
  { name: "Market-Calibration Minimum", tier: "low", sourceIds: ["nflverse", "nws", "sleeper", "the_odds_api", "sportsgameodds"], unlocks: "Dual-observer market capture so book-lag is real, not a provider artifact.", ownerGated: true },
  { name: "Fantasy/DFS Minimum", tier: "mid", sourceIds: ["nflverse", "sleeper", "the_odds_api", "fantasydata"], unlocks: "First licensed fantasy/DFS projections, ADP, salary + ownership.", ownerGated: true },
  { name: "Full Startup Stack", tier: "mid", sourceIds: ["nflverse", "nws", "sleeper", "yahoo_oauth", "the_odds_api", "sportsgameodds", "fantasydata", "sportsdataio"], unlocks: "Everything a launch needs without enterprise spend.", ownerGated: true },
  { name: "Enterprise Dossier Stack", tier: "enterprise", sourceIds: ["sportradar"], unlocks: "Official low-latency breadth — tracked as a dossier, bought only against a named revenue/B2B outcome.", ownerGated: true },
];

export function portfolioByName(name: string): ProviderPortfolio | undefined {
  return PROVIDER_PORTFOLIOS.find((p) => p.name === name);
}
