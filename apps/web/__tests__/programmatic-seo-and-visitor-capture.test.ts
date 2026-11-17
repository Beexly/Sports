import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PUBLIC_RECORD_AS_OF, PUBLIC_RECORD_LINE } from "@/lib/ledger/public-record";
import {
  CURRENT_STOREFRONT_LADDER,
  buildPreLockVisitorCaptureConfig,
  buildProgrammaticMatchupSeoPacket,
  buildProgrammaticPlayerPropSeoPacket,
} from "@/lib/seo/programmatic-matchup-and-player-seo";

describe("Programmatic Matchup & Player SEO + Pre-Lock T-3h Visitor Capture", () => {
  const coltsTexans = buildProgrammaticMatchupSeoPacket({
    league: "NFL",
    awayTeam: "Colts",
    homeTeam: "Texans",
    kickoffIso: "2026-11-22T18:00:00Z",
    venue: "NRG Stadium",
    environmentTeaser:
      "Fast dome track with heavy two-high coverage shells and slot reallocation watch ahead of kickoff.",
    lockWindowLabel: "Sun T-3h Early Slate",
  });

  const magicCeltics = buildProgrammaticMatchupSeoPacket({
    league: "NBA",
    awayTeam: "Magic",
    homeTeam: "Celtics",
    kickoffIso: "2026-11-22T23:00:00Z",
    venue: "TD Garden",
    environmentTeaser:
      "Half-court pace compression with rim-protection splits and late-scratch rotation tracking.",
  });

  const derrickHenry = buildProgrammaticPlayerPropSeoPacket({
    league: "NFL",
    playerName: "Derrick Henry",
    team: "Baltimore Ravens",
    position: "RB",
    environmentTeaser:
      "Light-box early-down run script and red-zone goal-line snap share distribution.",
  });

  const justinHerbert = buildProgrammaticPlayerPropSeoPacket({
    league: "NFL",
    playerName: "Justin Herbert",
    team: "Los Angeles Chargers",
    position: "QB",
    environmentTeaser:
      "Quick-game play-action release profile against single-high blitz pressure.",
  });

  it("builds canonical URLs, hreflang x-default, SportsEvent, Dataset.license, and PUBLIC_RECORD_LINE for NFL and NBA matchups", () => {
    expect(coltsTexans.pathname).toBe("/nfl/colts-vs-texans-projections");
    expect(coltsTexans.canonicalUrl).toBe(
      "https://www.galaxysportsedge.com/nfl/colts-vs-texans-projections",
    );
    expect(coltsTexans.alternates.canonical).toBe(coltsTexans.canonicalUrl);
    expect(coltsTexans.alternates.languages?.["x-default"]).toBe(coltsTexans.canonicalUrl);
    expect(coltsTexans.description).toContain(PUBLIC_RECORD_LINE);
    expect(coltsTexans.paywallProtected).toBe(true);

    const nflGraph = coltsTexans.jsonLd["@graph"];
    const nflEvent = nflGraph.find((node) => node["@type"] === "SportsEvent");
    const nflDataset = nflGraph.find((node) => node["@type"] === "Dataset");
    expect(nflEvent).toBeDefined();
    expect(nflDataset).toBeDefined();
    expect(nflDataset?.license).toBe("https://www.galaxysportsedge.com/terms");
    expect(nflDataset?.isAccessibleForFree).toBe(true);
    expect(nflDataset?.dateModified).toBe(PUBLIC_RECORD_AS_OF);

    expect(magicCeltics.pathname).toBe("/nba/magic-vs-celtics-projections");
    expect(magicCeltics.canonicalUrl).toBe(
      "https://www.galaxysportsedge.com/nba/magic-vs-celtics-projections",
    );
    expect(magicCeltics.alternates.languages?.["x-default"]).toBe(magicCeltics.canonicalUrl);
    expect(magicCeltics.description).toContain(PUBLIC_RECORD_LINE);

    const nbaGraph = magicCeltics.jsonLd["@graph"];
    const nbaEvent = nbaGraph.find((node) => node["@type"] === "SportsEvent");
    const nbaDataset = nbaGraph.find((node) => node["@type"] === "Dataset");
    expect(nbaEvent?.sport).toBe("NBA");
    expect(nbaDataset?.license).toBe("https://www.galaxysportsedge.com/terms");
    expect(nbaDataset?.isAccessibleForFree).toBe(true);
    expect(nbaDataset?.dateModified).toBe(PUBLIC_RECORD_AS_OF);
  });

  it("builds canonical Person + Dataset.license JSON-LD and paywallProtected: true for player prop pages", () => {
    for (const [packet, expectedPath, expectedName] of [
      [derrickHenry, "/players/derrick-henry-props", "Derrick Henry"],
      [justinHerbert, "/players/justin-herbert-props", "Justin Herbert"],
    ] as const) {
      expect(packet.pathname).toBe(expectedPath);
      expect(packet.canonicalUrl).toBe(`https://www.galaxysportsedge.com${expectedPath}`);
      expect(packet.alternates.languages?.["x-default"]).toBe(packet.canonicalUrl);
      expect(packet.description).toContain(PUBLIC_RECORD_LINE);
      expect(packet.paywallProtected).toBe(true);

      const graph = packet.jsonLd["@graph"];
      const person = graph.find((node) => node["@type"] === "Person");
      const dataset = graph.find((node) => node["@type"] === "Dataset");
      expect(person?.name).toBe(expectedName);
      expect(dataset?.license).toBe("https://www.galaxysportsedge.com/terms");
      expect(dataset?.isAccessibleForFree).toBe(true);
      expect(dataset?.dateModified).toBe(PUBLIC_RECORD_AS_OF);
    }
  });

  it("enforces zero outbound sportsbook domains across serialized JSON-LD and visitor capture payloads", () => {
    const packets = [coltsTexans, magicCeltics, derrickHenry, justinHerbert];
    for (const packet of packets) {
      expect(packet.cleanRoomCheck.clean).toBe(true);
      expect(packet.cleanRoomCheck.offendingDomains).toEqual([]);
      const serialized = JSON.stringify({
        jsonLd: packet.jsonLd,
        visitorCapture: packet.visitorCapture,
      }).toLowerCase();
      expect(serialized).not.toContain("sportsbook.draftkings.com");
      expect(serialized).not.toContain("sportsbook.fanduel.com");
      expect(serialized).not.toContain("betmgm.com");
      expect(serialized).not.toContain("bet365.com");
    }
  });

  it("publishes the exact 6-tier Whop + Stripe pricing ladder with 30% global / 40% member affiliate rates and zero retired tiers", () => {
    expect(CURRENT_STOREFRONT_LADDER).toHaveLength(6);

    const expectedTiers = [
      {
        id: "free-proof-room",
        priceDisplay: "$0",
        priceUsd: 0,
        title: "GSE Proof Room & Free Slate Preview",
        whopCheckoutUrl: "https://whop.com/checkout/plan_vrJX4trKVp9Qs",
      },
      {
        id: "sgp-correlation-basket",
        priceDisplay: "$29",
        priceUsd: 29,
        title: "Props, Anytime TD & Correlated SGP Slate Pack",
        whopCheckoutUrl: "https://whop.com/checkout/plan_LPIZ56mbxu2sX",
      },
      {
        id: "sunday-nfl-5pct-slate",
        priceDisplay: "$39",
        priceUsd: 39,
        title: "Main Slate Quantitative Game Signals Pack",
        whopCheckoutUrl: "https://whop.com/checkout/plan_IyQZXkw65pgAz",
      },
      {
        id: "redzone-dfs-pro-pack",
        priceDisplay: "$39.99",
        priceUsd: 39.99,
        title: "RedZone DFS Pro Pack (Cash, GPP & Showdown 1.5x)",
        whopCheckoutUrl: "https://whop.com/checkout/plan_bETkfuLzudWoh",
      },
      {
        id: "week8-all-access",
        priceDisplay: "$49",
        priceUsd: 49,
        title: "All-Access Weekly Bundle (Sides, Totals, Props, SGP & DFS)",
        whopCheckoutUrl: "https://whop.com/checkout/plan_eTtNKm8CMa5tp",
      },
      {
        id: "global-multisport-pro",
        priceDisplay: "$149/mo",
        priceUsd: 149,
        title: "Global Multi-Sport Pro Pass (NFL + NBA, MLB, NHL & Soccer)",
        whopCheckoutUrl: "https://whop.com/checkout/plan_lyi84loo2aMJ0",
      },
    ];

    expect(
      CURRENT_STOREFRONT_LADDER.map((tier) => ({
        id: tier.id,
        priceDisplay: tier.priceDisplay,
        priceUsd: tier.priceUsd,
        title: tier.title,
        whopCheckoutUrl: tier.whopCheckoutUrl,
      })),
    ).toEqual(expectedTiers);

    for (const tier of CURRENT_STOREFRONT_LADDER) {
      expect(tier.globalAffiliatePct).toBe(30);
      expect(tier.memberAffiliatePct).toBe(40);
      expect(tier.globalAffiliateRateLabel).toBe("30%");
      expect(tier.memberAffiliateRateLabel).toBe("40%");
      expect(tier.paymentRails).toEqual(["whop", "stripe"]);
    }

    const ladderJson = JSON.stringify(CURRENT_STOREFRONT_LADDER);
    expect(ladderJson).not.toContain("59.99");
    expect(ladderJson).not.toContain("249");
  });

  it("contains zero em-dashes in source files and serialized outputs, and zero % win-rate leakage in public SEO descriptions", () => {
    const seoModuleSource = readFileSync(
      resolve(__dirname, "../lib/seo/programmatic-matchup-and-player-seo.ts"),
      "utf8",
    );
    const testFileSource = readFileSync(__filename, "utf8");

    expect(seoModuleSource).not.toContain("\u2014");
    expect(testFileSource).not.toContain("\u2014");

    for (const packet of [coltsTexans, magicCeltics, derrickHenry, justinHerbert]) {
      const serialized = JSON.stringify(packet);
      expect(serialized).not.toContain("\u2014");
      expect(packet.description).not.toContain("%");
      expect(packet.title).not.toContain("%");
      expect(packet.visitorCapture.complianceDisclosure).not.toContain("%");
    }
  });

  it("configures Pre-Lock T-3h Thu/Sun/Mon email & Telegram opt-in, $0 Proof Room CTA, 30% affiliate share, and compliance disclosure", () => {
    const capture = buildPreLockVisitorCaptureConfig({
      league: "nfl",
      matchupSlug: "colts-vs-texans-projections",
      lockWindowLabel: "Thu/Sun/Mon T-3h Window",
      injuryHeadline: "Starting slot WR questionable; T-3h inactive reallocation active.",
    });

    expect(capture.triggerWindow).toBe("T-3h");
    expect(capture.supportedLockWindows).toEqual(["Thu", "Sun", "Mon"]);
    expect(capture.emailOptIn.enabled).toBe(true);
    expect(capture.telegramOptIn.enabled).toBe(true);
    expect(capture.proofRoomCta.priceDisplay).toBe("$0");
    expect(capture.proofRoomCta.checkoutUrl).toBe("https://whop.com/checkout/plan_vrJX4trKVp9Qs");
    expect(capture.affiliateSharePct).toBe(30);
    expect(capture.complianceDisclosure).toContain("21+ | 1-800-GAMBLER");
    expect(capture.complianceDisclosure).not.toContain("%");
  });

  it("keeps paywalled picks, props, and SGP odds gated behind paywallProtected: true", () => {
    for (const packet of [coltsTexans, magicCeltics, derrickHenry, justinHerbert]) {
      expect(packet.paywallProtected).toBe(true);
      const serializedJsonLd = JSON.stringify(packet.jsonLd);
      expect(serializedJsonLd).not.toContain("pickSelection");
      expect(serializedJsonLd).not.toContain("sgpLegs");
      expect(serializedJsonLd).not.toContain("sportsbookOdds");
    }
  });
});
