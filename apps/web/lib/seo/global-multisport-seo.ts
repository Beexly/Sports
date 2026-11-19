/**
 * International hreflang alternates, Multi-Sport League Hub taxonomy, and
 * Paid-Ads Clean-Room Landing Page guard for Galaxy Sports Edge.
 *
 * Paid-Ads Clean-Room Rule: X Ads and Google Ads classify any destination page
 * containing direct outbound links to real-money sportsbook operators as a
 * Gambling Aggregator/Affiliate. Keeping /pricing, /fantasy/dfs, /picks, and
 * /accountability 100% free of outbound sportsbook operator links protects ad
 * account eligibility across US and international campaigns.
 */
import type { Metadata } from "next";

const ORIGIN = "https://www.galaxysportsedge.com";

export const SUPPORTED_SPORT_HUBS = [
  { slug: "nfl", code: "NFL", status: "live", label: "NFL Quantitative Slate & Props" },
  { slug: "ncaaf", code: "NCAAF", status: "expanding", label: "College Football Projections" },
  { slug: "nba", code: "NBA", status: "expanding", label: "NBA Pace, Usage & Props" },
  { slug: "ncaab", code: "NCAAB", status: "expanding", label: "College Basketball Ratings" },
  { slug: "mlb", code: "MLB", status: "expanding", label: "MLB Pitch-Level & Run Totals" },
  { slug: "nhl", code: "NHL", status: "expanding", label: "NHL Expected Goals & Shot Props" },
  { slug: "mls", code: "MLS", status: "expanding", label: "MLS Match & Goal Distributions" },
  { slug: "soccer", code: "SOCCER", status: "expanding", label: "EPL, Champions League & Global Football" },
] as const;

export const PROHIBITED_SPORTSBOOK_DOMAINS_ON_AD_LANDERS = [
  "sportsbook.draftkings.com",
  "sportsbook.fanduel.com",
  "betmgm.com",
  "caesars.com/sportsbook",
  "bet365.com",
  "espnbet.com",
  "fanatics.com/sportsbook",
  "hardrock.bet",
  "bovada.lv",
  "betonline.ag",
] as const;

export function buildGlobalHreflangAlternates(pathname: string): NonNullable<Metadata["alternates"]> {
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const canonicalUrl = cleanPath === "/" ? ORIGIN : `${ORIGIN}${cleanPath}`;
  return {
    canonical: canonicalUrl,
    languages: {
      "x-default": canonicalUrl,
      "en-US": canonicalUrl,
      "en-CA": canonicalUrl,
      "en-GB": canonicalUrl,
      "en-AU": canonicalUrl,
      "en-IE": canonicalUrl,
      "en-NZ": canonicalUrl,
    },
  };
}

export function assertAdLandingPageCleanRoom(renderedHtmlOrSource: string): {
  clean: boolean;
  offendingDomains: string[];
} {
  const lower = renderedHtmlOrSource.toLowerCase();
  const offendingDomains = PROHIBITED_SPORTSBOOK_DOMAINS_ON_AD_LANDERS.filter((domain) =>
    lower.includes(domain),
  );
  return {
    clean: offendingDomains.length === 0,
    offendingDomains,
  };
}
