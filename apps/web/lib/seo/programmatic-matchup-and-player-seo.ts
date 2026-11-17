/**
 * Programmatic Matchup & Player Prop ISR SEO, Pre-Lock T-3h Visitor Capture,
 * and Active Storefront Pricing Ladder for Galaxy Sports Edge.
 *
 * Guarantees:
 * - Zero em-dashes (\u2014) anywhere in generated metadata, JSON-LD, or capture configs.
 * - Zero percentage win-rate claims on public SEO surfaces (uses PUBLIC_RECORD_LINE).
 * - Paid-Ads Clean-Room enforcement via assertAdLandingPageCleanRoom.
 * - Strict paywall boundary: picks, prop selections, and SGP odds are never exposed
 *   inside public SEO JSON-LD (paywallProtected: true).
 */

import type { Metadata } from "next";
import { PUBLIC_RECORD_AS_OF, PUBLIC_RECORD_LINE } from "@/lib/ledger/public-record";
import {
  assertAdLandingPageCleanRoom,
  buildGlobalHreflangAlternates,
} from "@/lib/seo/global-multisport-seo";

const ORIGIN = "https://www.galaxysportsedge.com";
const GSE_DATASET_LICENSE_URL = "https://www.galaxysportsedge.com/terms";
const PROOF_ROOM_CHECKOUT_URL = "https://whop.com/checkout/plan_vrJX4trKVp9Qs" as const;

export interface StorefrontLadderTier {
  readonly id:
    | "free-proof-room"
    | "sgp-correlation-basket"
    | "sunday-nfl-5pct-slate"
    | "redzone-dfs-pro-pack"
    | "week8-all-access"
    | "global-multisport-pro";
  readonly priceDisplay: string;
  readonly priceUsd: number;
  readonly billingInterval: "free" | "one_time" | "monthly";
  readonly title: string;
  readonly whopCheckoutUrl: string;
  readonly paymentRails: readonly ["whop", "stripe"];
  readonly globalAffiliatePct: 30;
  readonly memberAffiliatePct: 40;
  readonly globalAffiliateRateLabel: "30%";
  readonly memberAffiliateRateLabel: "40%";
}

export const CURRENT_STOREFRONT_LADDER: readonly StorefrontLadderTier[] = [
  {
    id: "free-proof-room",
    priceDisplay: "$0",
    priceUsd: 0,
    billingInterval: "free",
    title: "GSE Proof Room & Free Slate Preview",
    whopCheckoutUrl: PROOF_ROOM_CHECKOUT_URL,
    paymentRails: ["whop", "stripe"],
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    globalAffiliateRateLabel: "30%",
    memberAffiliateRateLabel: "40%",
  },
  {
    id: "sgp-correlation-basket",
    priceDisplay: "$29",
    priceUsd: 29,
    billingInterval: "one_time",
    title: "Props, Anytime TD & Correlated SGP Slate Pack",
    whopCheckoutUrl: "https://whop.com/checkout/plan_LPIZ56mbxu2sX",
    paymentRails: ["whop", "stripe"],
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    globalAffiliateRateLabel: "30%",
    memberAffiliateRateLabel: "40%",
  },
  {
    id: "sunday-nfl-5pct-slate",
    priceDisplay: "$39",
    priceUsd: 39,
    billingInterval: "one_time",
    title: "Main Slate Quantitative Game Signals Pack",
    whopCheckoutUrl: "https://whop.com/checkout/plan_IyQZXkw65pgAz",
    paymentRails: ["whop", "stripe"],
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    globalAffiliateRateLabel: "30%",
    memberAffiliateRateLabel: "40%",
  },
  {
    id: "redzone-dfs-pro-pack",
    priceDisplay: "$39.99",
    priceUsd: 39.99,
    billingInterval: "one_time",
    title: "RedZone DFS Pro Pack (Cash, GPP & Showdown 1.5x)",
    whopCheckoutUrl: "https://whop.com/checkout/plan_bETkfuLzudWoh",
    paymentRails: ["whop", "stripe"],
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    globalAffiliateRateLabel: "30%",
    memberAffiliateRateLabel: "40%",
  },
  {
    id: "week8-all-access",
    priceDisplay: "$49",
    priceUsd: 49,
    billingInterval: "one_time",
    title: "All-Access Weekly Bundle (Sides, Totals, Props, SGP & DFS)",
    whopCheckoutUrl: "https://whop.com/checkout/plan_eTtNKm8CMa5tp",
    paymentRails: ["whop", "stripe"],
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    globalAffiliateRateLabel: "30%",
    memberAffiliateRateLabel: "40%",
  },
  {
    id: "global-multisport-pro",
    priceDisplay: "$149/mo",
    priceUsd: 149,
    billingInterval: "monthly",
    title: "Global Multi-Sport Pro Pass (NFL + NBA, MLB, NHL & Soccer)",
    whopCheckoutUrl: "https://whop.com/checkout/plan_lyi84loo2aMJ0",
    paymentRails: ["whop", "stripe"],
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    globalAffiliateRateLabel: "30%",
    memberAffiliateRateLabel: "40%",
  },
] as const;

const RETIRED_PRICE_CENTS = new Set<number>([5999, 24900]);

for (const tier of CURRENT_STOREFRONT_LADDER) {
  const cents = Math.round(tier.priceUsd * 100);
  if (RETIRED_PRICE_CENTS.has(cents)) {
    throw new Error(`Retired pricing tier detected in CURRENT_STOREFRONT_LADDER: ${tier.id}`);
  }
}

export interface PreLockVisitorCaptureConfig {
  readonly triggerWindow: "T-3h";
  readonly supportedLockWindows: readonly ["Thu", "Sun", "Mon"];
  readonly league: string;
  readonly matchupSlug: string;
  readonly lockWindowLabel: string;
  readonly injuryHeadline: string;
  readonly emailOptIn: {
    readonly enabled: boolean;
    readonly actionPath: "/api/alerts/pre-kickoff-optin";
    readonly cadenceLabel: string;
    readonly headline: string;
  };
  readonly telegramOptIn: {
    readonly enabled: boolean;
    readonly channelHandle: "@GalaxySportsEdge";
    readonly channelUrl: "https://t.me/GalaxySportsEdge";
    readonly alertType: "T-3h Injury Reallocation Alert";
  };
  readonly proofRoomCta: {
    readonly tierId: "free-proof-room";
    readonly label: string;
    readonly priceDisplay: "$0";
    readonly checkoutUrl: typeof PROOF_ROOM_CHECKOUT_URL;
  };
  readonly affiliateSharePct: 30;
  readonly memberAffiliateSharePct: 40;
  readonly complianceDisclosure: string;
}

export interface CleanRoomCheckResult {
  readonly clean: boolean;
  readonly offendingDomains: string[];
}

export interface ProgrammaticMatchupSeoPacket {
  readonly pathname: string;
  readonly canonicalUrl: string;
  readonly alternates: NonNullable<Metadata["alternates"]>;
  readonly title: string;
  readonly description: string;
  readonly jsonLd: {
    readonly "@context": "https://schema.org";
    readonly "@graph": readonly [Record<string, unknown>, Record<string, unknown>];
  };
  readonly visitorCapture: PreLockVisitorCaptureConfig;
  readonly cleanRoomCheck: CleanRoomCheckResult;
  readonly paywallProtected: true;
}

export interface ProgrammaticPlayerPropSeoPacket {
  readonly pathname: string;
  readonly canonicalUrl: string;
  readonly alternates: NonNullable<Metadata["alternates"]>;
  readonly title: string;
  readonly description: string;
  readonly jsonLd: {
    readonly "@context": "https://schema.org";
    readonly "@graph": readonly [Record<string, unknown>, Record<string, unknown>];
  };
  readonly visitorCapture: PreLockVisitorCaptureConfig;
  readonly cleanRoomCheck: CleanRoomCheckResult;
  readonly paywallProtected: true;
}

const PAYWALLED_PUBLIC_JSONLD_KEYS = [
  "pickSelection",
  "propPick",
  "sgpLegs",
  "sgpOdds",
  "bestBet",
  "sportsbookOdds",
  "lockTicket",
  "parlayTicket",
] as const;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sanitizeNoEmDash(text: string): string {
  return text.replace(/\u2014/g, "-");
}

function assertPublicCopyClean(text: string, label: string): void {
  if (text.includes("\u2014")) {
    throw new Error(`Em-dash detected in ${label}`);
  }
  if (/\d+(?:\.\d+)?%\s*(?:win|hit|accuracy|cover|ats|roi)/i.test(text) || /%/.test(text)) {
    throw new Error(`Percentage claim detected in public SEO copy (${label}): ${text}`);
  }
}

function assertPaywallProtectedJsonLd(jsonLd: Record<string, unknown>): void {
  const serialized = JSON.stringify(jsonLd);
  for (const key of PAYWALLED_PUBLIC_JSONLD_KEYS) {
    if (serialized.includes(`"${key}"`)) {
      throw new Error(`Paywalled field "${key}" leaked into public SEO JSON-LD.`);
    }
  }
  if (serialized.includes("\u2014")) {
    throw new Error("Em-dash detected inside serialized SEO JSON-LD.");
  }
}

export function buildPreLockVisitorCaptureConfig(params: {
  league: string;
  matchupSlug: string;
  lockWindowLabel: string;
  injuryHeadline: string;
}): PreLockVisitorCaptureConfig {
  const leagueUpper = sanitizeNoEmDash(params.league).trim().toUpperCase();
  const matchupSlug = toSlug(params.matchupSlug);
  const lockWindowLabel = sanitizeNoEmDash(params.lockWindowLabel).trim();
  const injuryHeadline = sanitizeNoEmDash(params.injuryHeadline).trim();

  const config: PreLockVisitorCaptureConfig = {
    triggerWindow: "T-3h",
    supportedLockWindows: ["Thu", "Sun", "Mon"],
    league: leagueUpper,
    matchupSlug,
    lockWindowLabel,
    injuryHeadline,
    emailOptIn: {
      enabled: true,
      actionPath: "/api/alerts/pre-kickoff-optin",
      cadenceLabel: "T-3h Thu/Sun/Mon Injury-Reallocation Dispatch",
      headline: `Get T-3h injury reallocation alerts for ${matchupSlug} (${lockWindowLabel})`,
    },
    telegramOptIn: {
      enabled: true,
      channelHandle: "@GalaxySportsEdge",
      channelUrl: "https://t.me/GalaxySportsEdge",
      alertType: "T-3h Injury Reallocation Alert",
    },
    proofRoomCta: {
      tierId: "free-proof-room",
      label: "Enter Free Proof Room ($0)",
      priceDisplay: "$0",
      checkoutUrl: PROOF_ROOM_CHECKOUT_URL,
    },
    affiliateSharePct: 30,
    memberAffiliateSharePct: 40,
    complianceDisclosure:
      "21+ | 1-800-GAMBLER | Educational sports analytics only. No win-rate percentage claims are published prior to 200 CLV-backed official settled plays.",
  };

  const serialized = JSON.stringify(config);
  if (serialized.includes("\u2014")) {
    throw new Error("Em-dash detected in PreLockVisitorCaptureConfig.");
  }

  return config;
}

export function buildProgrammaticMatchupSeoPacket(params: {
  league: string;
  awayTeam: string;
  homeTeam: string;
  kickoffIso: string;
  venue: string;
  environmentTeaser: string;
  lockWindowLabel?: string;
}): ProgrammaticMatchupSeoPacket {
  const leagueLower = toSlug(params.league);
  const leagueUpper = leagueLower.toUpperCase();
  const awayTeam = sanitizeNoEmDash(params.awayTeam).trim();
  const homeTeam = sanitizeNoEmDash(params.homeTeam).trim();
  const venue = sanitizeNoEmDash(params.venue).trim();
  const environmentTeaser = sanitizeNoEmDash(params.environmentTeaser).trim();
  const slug = `${toSlug(awayTeam)}-vs-${toSlug(homeTeam)}`;
  const pathname = `/${leagueLower}/${slug}-projections`;
  const canonicalUrl = `${ORIGIN}${pathname}`;
  const alternates = buildGlobalHreflangAlternates(pathname);

  const title = `${awayTeam} vs ${homeTeam} ${leagueUpper} Projections & Matchup Context | Galaxy Sports Edge`;
  const description = `${leagueUpper} matchup breakdown for ${awayTeam} at ${homeTeam}: ${environmentTeaser} Verified ledger: ${PUBLIC_RECORD_LINE}. Full picks and correlated SGP tickets remain inside the member proof vault.`;

  assertPublicCopyClean(title, "matchup.title");
  assertPublicCopyClean(description, "matchup.description");

  const sportsEventNode: Record<string, unknown> = {
    "@type": "SportsEvent",
    "@id": `${canonicalUrl}#sports-event`,
    name: `${awayTeam} vs ${homeTeam}`,
    sport: leagueUpper,
    startDate: params.kickoffIso,
    eventStatus: "https://schema.org/EventScheduled",
    isAccessibleForFree: true,
    location: {
      "@type": "Place",
      name: venue,
    },
    competitor: [
      { "@type": "SportsTeam", name: awayTeam },
      { "@type": "SportsTeam", name: homeTeam },
    ],
    url: canonicalUrl,
    description: environmentTeaser,
  };

  const datasetNode: Record<string, unknown> = {
    "@type": "Dataset",
    "@id": `${canonicalUrl}#dataset`,
    name: `${awayTeam} vs ${homeTeam} ${leagueUpper} Matchup Environment Dataset`,
    description: `${environmentTeaser} Public ledger record: ${PUBLIC_RECORD_LINE}.`,
    url: canonicalUrl,
    license: GSE_DATASET_LICENSE_URL,
    isAccessibleForFree: true,
    dateModified: PUBLIC_RECORD_AS_OF,
    creator: {
      "@type": "Organization",
      name: "Galaxy Sports Network LLC",
      url: ORIGIN,
    },
    keywords: [
      leagueUpper,
      `${awayTeam} vs ${homeTeam}`,
      "matchup projections",
      "trench pressure rates",
      "T-3h injury reallocation",
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org" as const,
    "@graph": [sportsEventNode, datasetNode] as const,
  };

  assertPaywallProtectedJsonLd(jsonLd);

  const visitorCapture = buildPreLockVisitorCaptureConfig({
    league: leagueUpper,
    matchupSlug: `${slug}-projections`,
    lockWindowLabel: params.lockWindowLabel ?? "Sun T-3h Cutoff",
    injuryHeadline: environmentTeaser,
  });

  const cleanRoomPayload = [title, description, JSON.stringify(jsonLd), JSON.stringify(visitorCapture)].join("\n");
  const cleanRoomCheck = assertAdLandingPageCleanRoom(cleanRoomPayload);

  const paywallProtected = true as const;
  if (!paywallProtected) {
    throw new Error("paywallProtected invariant violated.");
  }

  return {
    pathname,
    canonicalUrl,
    alternates,
    title,
    description,
    jsonLd,
    visitorCapture,
    cleanRoomCheck,
    paywallProtected,
  };
}

export function buildProgrammaticPlayerPropSeoPacket(params: {
  league: string;
  playerName: string;
  team: string;
  position: string;
  environmentTeaser: string;
}): ProgrammaticPlayerPropSeoPacket {
  const leagueUpper = sanitizeNoEmDash(params.league).trim().toUpperCase();
  const playerName = sanitizeNoEmDash(params.playerName).trim();
  const team = sanitizeNoEmDash(params.team).trim();
  const position = sanitizeNoEmDash(params.position).trim();
  const environmentTeaser = sanitizeNoEmDash(params.environmentTeaser).trim();
  const playerSlug = toSlug(playerName);
  const pathname = `/players/${playerSlug}-props`;
  const canonicalUrl = `${ORIGIN}${pathname}`;
  const alternates = buildGlobalHreflangAlternates(pathname);

  const title = `${playerName} (${team} ${position}) ${leagueUpper} Prop Projections & Role Usage | Galaxy Sports Edge`;
  const description = `${playerName} (${team}, ${position}) ${leagueUpper} usage and matchup environment: ${environmentTeaser} Verified ledger: ${PUBLIC_RECORD_LINE}. Paywalled prop tickets stay gated inside member access.`;

  assertPublicCopyClean(title, "player.title");
  assertPublicCopyClean(description, "player.description");

  const personNode: Record<string, unknown> = {
    "@type": "Person",
    "@id": `${canonicalUrl}#person`,
    name: playerName,
    jobTitle: `${leagueUpper} ${position}`,
    affiliation: {
      "@type": "SportsTeam",
      name: team,
    },
    url: canonicalUrl,
  };

  const datasetNode: Record<string, unknown> = {
    "@type": "Dataset",
    "@id": `${canonicalUrl}#dataset`,
    name: `${playerName} ${leagueUpper} Usage & Matchup Environment Dataset`,
    description: `${environmentTeaser} Public ledger record: ${PUBLIC_RECORD_LINE}.`,
    url: canonicalUrl,
    license: GSE_DATASET_LICENSE_URL,
    isAccessibleForFree: true,
    dateModified: PUBLIC_RECORD_AS_OF,
    about: {
      "@id": `${canonicalUrl}#person`,
    },
    creator: {
      "@type": "Organization",
      name: "Galaxy Sports Network LLC",
      url: ORIGIN,
    },
    keywords: [
      leagueUpper,
      playerName,
      team,
      position,
      "player prop projections",
      "usage and target share",
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org" as const,
    "@graph": [personNode, datasetNode] as const,
  };

  assertPaywallProtectedJsonLd(jsonLd);

  const visitorCapture = buildPreLockVisitorCaptureConfig({
    league: leagueUpper,
    matchupSlug: `${playerSlug}-props`,
    lockWindowLabel: "T-3h Cutoff",
    injuryHeadline: environmentTeaser,
  });

  const cleanRoomPayload = [title, description, JSON.stringify(jsonLd), JSON.stringify(visitorCapture)].join("\n");
  const cleanRoomCheck = assertAdLandingPageCleanRoom(cleanRoomPayload);

  const paywallProtected = true as const;
  if (!paywallProtected) {
    throw new Error("paywallProtected invariant violated.");
  }

  return {
    pathname,
    canonicalUrl,
    alternates,
    title,
    description,
    jsonLd,
    visitorCapture,
    cleanRoomCheck,
    paywallProtected,
  };
}
