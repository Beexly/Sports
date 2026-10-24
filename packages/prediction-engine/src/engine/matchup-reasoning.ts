/**
 * Matchup reasoning — the product.
 *
 * Doctrine (user, 2026-10-23, verbatim in spirit):
 * The product is the reasoning through ALL signals. Scheme vs scheme,
 * player vs player, coach vs coach, divisional spot, Thursday vs primetime,
 * injuries with names, narratives, tracking, and the market as one small
 * input at its proper weight — inside the reasoning, never as the headline
 * and never as the whole argument. The trail on the card is that reasoning
 * accounting for everything it weighed. Nothing computed sits outside it.
 * Nothing sits idle.
 *
 * Market factors (bookmaker consensus, line movement, market risk) are
 * price context. They are never a reason. A pick whose only weighted
 * factors are market factors has no matchup reasoning and must say so.
 *
 * Layers that currently exist in the pipeline and can appear in the Why:
 * rest, ATS form, H2H, venue form, injury score, NGS, schedule stress.
 *
 * Layers that must exist and currently do not reach the pick pipeline:
 * scheme vs scheme, player vs player (with names), coach vs coach,
 * divisional spot, game slot (TNF / primetime / early / MNF), narratives.
 * These have explicit slots so a provider can land without changing the
 * contract.
 */

import type { FactorDetail } from "@sports/types";

export const MARKET_FACTOR_NAMES = new Set([
  "Bookmaker Consensus",
  "Line Movement",
  "Market Risk",
  "Market Coverage",
  "Pricing Edge",
  "Data Quality",
]);

export const MATCHUP_LAYERS = [
  "scheme",
  "player",
  "coach",
  "spot",
  "slot",
  "narrative",
  "availability",
  "venue",
  "rest",
  "form",
] as const;

export type MatchupLayer = (typeof MATCHUP_LAYERS)[number];

export interface MatchupClaim {
  readonly layer: MatchupLayer;
  readonly claim: string;
  readonly weight: number;
  readonly source: string;
}

const LAYER_BY_NAME: Record<string, MatchupLayer> = {
  "Rest Advantage": "rest",
  "Home ATS Form": "form",
  "Away ATS Form": "form",
  "Head-to-Head Form": "form",
  "Home Venue Form": "venue",
  "Away Venue Form": "venue",
  "Injury": "availability",
  "NGS Tracking": "player",
  "Schedule Stress": "spot",
};

export function isMarketFactor(f: FactorDetail): boolean {
  return MARKET_FACTOR_NAMES.has(f.name) || f.name.startsWith("Shadow ");
}

export function layerFor(f: FactorDetail): MatchupLayer | null {
  if (isMarketFactor(f)) return null;
  return LAYER_BY_NAME[f.name] ?? null;
}

export function matchupClaims(factors: readonly FactorDetail[]): MatchupClaim[] {
  return factors
    .filter((f) => !isMarketFactor(f) && f.impact !== "neutral" && Math.abs(f.weight) >= 3)
    .filter((f) => typeof f.description === "string" && f.description.trim().length > 0)
    .map((f) => ({
      layer: layerFor(f) ?? "narrative",
      claim: f.description.split(" (")[0]!.trim(),
      weight: f.weight,
      source: f.name,
    }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

export function matchupNarrative(factors: readonly FactorDetail[]): string {
  const claims = matchupClaims(factors);
  if (claims.length === 0) {
    return " No matchup reasoning available — only market context.";
  }
  const why = claims
    .slice(0, 4)
    .map((c) => `${c.claim} (${c.layer}, w${Math.abs(c.weight)})`)
    .join("; ");
  return ` Why: ${why}.`;
}

export function marketContext(factors: readonly FactorDetail[]): string {
  const market = factors.filter(isMarketFactor).filter((f) => Math.abs(f.weight) >= 5);
  if (market.length === 0) return "";
  const bits = market.map((f) => f.name).slice(0, 2);
  return ` Market context: ${bits.join(", ")}.`;
}

export function fullReasoningTrail(factors: readonly FactorDetail[]): string {
  return matchupNarrative(factors) + marketContext(factors);
}
