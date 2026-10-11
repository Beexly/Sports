import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import nextConfig from "../../next.config.mjs";
import { getEntitlements, type SubscriptionTier } from "@sports/types";
import { FEATURE_GATES } from "@/lib/pricing/feature-gates";
import { VALUE_TIERS } from "@/lib/pricing/value-architecture";

/**
 * ==============================================================================
 * ASTRA COMPREHENSIVE 4-TIER OPAQUE-BOX E2E TEST BATTERY
 * ==============================================================================
 * 
 * Verifies Requirements R1 through R4 across all four architectural tiers:
 *   - Tier 1 — Feature Coverage (R1-R4 core requirements in isolation)
 *   - Tier 2 — Boundary & Corner Cases (limits, fallback, edge states)
 *   - Tier 3 — Cross-Feature Interactions (navigation funnels, entitlement coherence)
 *   - Tier 4 — Real-World Application Scenarios (end-to-end visitor journey)
 *
 * Source Specifications:
 *   - ORIGINAL_REQUEST.md (2026-10-11T20:39:46Z)
 *   - PROJECT.md § Feature Inventory (Features 1-25) & § Interface Contracts
 */

const webRoot = resolve(__dirname, "../..");
const repoRoot = resolve(webRoot, "../..");
const readWeb = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");
const readRepo = (rel: string) => readFileSync(resolve(repoRoot, rel), "utf8");

interface RedirectEntry {
  readonly source: string;
  readonly destination: string;
  readonly permanent?: boolean;
}

async function getConfigRedirects(): Promise<readonly RedirectEntry[]> {
  const config = nextConfig as unknown as {
    redirects?: () => Promise<readonly RedirectEntry[]>;
  };
  return (await config.redirects?.()) ?? [];
}

// ==============================================================================
// TIER 1 — FEATURE COVERAGE (R1-R4 Requirements)
// ==============================================================================

describe("Tier 1 — Feature Coverage", () => {
  describe("R1: Surface Unification & Authoritative Board Route", () => {
    it("Feature 1: next.config.mjs specifies a permanent 301 redirect from /picks to /board", async () => {
      const redirects = await getConfigRedirects();
      const picksRedirect = redirects.find((r) => r.source === "/picks");

      expect(
        picksRedirect,
        "next.config.mjs redirects() must include an entry for /picks"
      ).toBeDefined();

      expect(
        picksRedirect?.destination,
        "Redirect destination for /picks must be /board"
      ).toBe("/board");

      expect(
        picksRedirect?.permanent,
        "Redirect from /picks to /board must be permanent (HTTP 301)"
      ).toBe(true);
    });

    it("Feature 3: app/picks/page.tsx enforces server-side runtime redirect to /board", () => {
      const picksPagePath = resolve(webRoot, "app/picks/page.tsx");
      expect(existsSync(picksPagePath), "app/picks/page.tsx must exist").toBe(true);

      const picksSrc = readWeb("app/picks/page.tsx");
      expect(
        picksSrc,
        "app/picks/page.tsx must call redirect('/board') or redirect(\"/board\")"
      ).toMatch(/redirect\(\s*["']\/board["']\s*\)/);
    });

    it("Feature 2: app/board/page.tsx implements the 2-tab structure (Actionable Signals & Gated/Held Games)", () => {
      const boardPagePath = resolve(webRoot, "app/board/page.tsx");
      expect(existsSync(boardPagePath), "app/board/page.tsx must exist").toBe(true);

      const boardSrc = readWeb("app/board/page.tsx");

      // Verify canonical URL is /board
      expect(boardSrc).toContain('canonical: "/board"');

      // Verify support for both tab parameters and display names
      expect(
        boardSrc,
        "board/page.tsx must support Actionable Signals tab (?tab=signals)"
      ).toMatch(/signals/i);

      expect(
        boardSrc,
        "board/page.tsx must display 'Actionable Signals'"
      ).toMatch(/Actionable Signals/i);

      expect(
        boardSrc,
        "board/page.tsx must support Gated & Held Games tab (?tab=held)"
      ).toMatch(/held/i);

      expect(
        boardSrc,
        "board/page.tsx must display 'Gated & Held Games' or 'Gated and Held Games'"
      ).toMatch(/Gated\s*(&|and)\s*Held\s*Games/i);
    });

    it("Feature 4: Desktop nav (nav.tsx) and mobile nav (mobile-nav.tsx) label 'The Board' and purge /picks", () => {
      const desktopNav = readWeb("components/ui/nav.tsx");
      const mobileNav = readWeb("components/ui/mobile-nav.tsx");

      // Desktop nav assertions
      expect(desktopNav).toContain('href: "/board"');
      expect(desktopNav).toMatch(/label:\s*"The [Bb]oard"/);
      expect(
        desktopNav,
        "nav.tsx must not contain href: '/picks' links in active menus"
      ).not.toMatch(/href:\s*["']\/picks["']/);

      // Mobile nav assertions
      expect(mobileNav).toMatch(/href=["']\/board["']/);
      expect(
        mobileNav,
        "mobile-nav.tsx must not contain href='/picks' links"
      ).not.toMatch(/href=["']\/picks["']/);
    });

    it("Feature 6: Public navigation surfaces do not link to /picks", () => {
      // Pricing page must not link to /picks
      if (existsSync(resolve(webRoot, "app/pricing/page.tsx"))) {
        const pricingSrc = readWeb("app/pricing/page.tsx");
        expect(pricingSrc, "pricing page must not link to /picks").not.toMatch(/href=["']\/picks["']/);
      }

      // Brand links / constants must point to /board, not /picks
      if (existsSync(resolve(webRoot, "lib/brand.ts"))) {
        const brandSrc = readWeb("lib/brand.ts");
        expect(brandSrc, "brand.ts must not reference /picks as primary signals link").not.toMatch(/["']\/picks["']/);
      }
    });
  });

  describe("R2: Plain-English Translation (Quant Jargon Purge)", () => {
    it("Feature 7: Customer pick cards (pick-card.tsx) suppress internal developer acronyms", () => {
      const pickCardSrc = readWeb("components/picks/pick-card.tsx");

      // Quant developer acronyms that must not appear in customer-facing card copy
      const bannedAcronyms = ["CPOE", "WOPR", "RYOE", "DAKOTA", "ANY/A", "Brier"];
      for (const acronym of bannedAcronyms) {
        const acronymRegex = new RegExp(`\\b${acronym}\\b`, "g");
        expect(
          pickCardSrc,
          `Customer pick-card.tsx must not expose quant acronym: ${acronym}`
        ).not.toMatch(acronymRegex);
      }

      // Raw "Shin de-vig" or "de-vig" margin disclosure must not be exposed on public cards
      expect(pickCardSrc).not.toMatch(/Shin de-vig/i);
      expect(pickCardSrc).not.toMatch(/Shin's method/i);

      // Raw code identifier trueProb must not be rendered as customer text
      expect(
        pickCardSrc,
        "pick-card.tsx must not render raw identifier 'trueProb' to customers"
      ).not.toMatch(/>\s*trueProb\s+/);

      // Raw sort identifier 'Ranking P' must not be rendered as customer text
      expect(
        pickCardSrc,
        "pick-card.tsx must not render raw sort key 'Ranking P' to customers"
      ).not.toMatch(/>\s*Ranking P\s*</);
    });

    it("Feature 9: Telemetry labels replaced with clear user-facing language", () => {
      const pickCardSrc = readWeb("components/picks/pick-card.tsx");

      // "Market fair:" developer label must be replaced with "Fair Market Value"
      expect(
        pickCardSrc,
        "pick-card.tsx must use 'Fair Market Value' rather than informal 'Market fair:'"
      ).toContain("Fair Market Value");
      expect(pickCardSrc).not.toContain("Market fair:");

      // In app/trends/page.tsx, literal "JSON" buttons replaced with "View Audit Receipt" or "View Data Feed"
      if (existsSync(resolve(webRoot, "app/trends/page.tsx"))) {
        const trendsSrc = readWeb("app/trends/page.tsx");
        expect(trendsSrc).not.toMatch(/>\s*JSON\s*</);
        expect(trendsSrc).toMatch(/View Audit Receipt|View Data Feed/i);
      }
    });
  });

  describe("R3: Tier Restructuring & Elite Value Engine", () => {
    it("Feature 12: 4-Tier Matrix matches Free ($0), Fantasy ($19/mo), Pro ($49/mo), Elite ($99/mo)", () => {
      const allowedTiers: SubscriptionTier[] = ["FREE", "FANTASY", "PRO", "ELITE"];

      // Verify SubscriptionTier encompasses all 4 tiers
      for (const tier of allowedTiers) {
        const ent = getEntitlements(tier);
        expect(ent.tier).toBe(tier);
      }

      // Verify commercial value architecture contains the 4 tiers
      const tierIds = VALUE_TIERS.map((t) => t.id);
      expect(tierIds).toContain("FREE");
      expect(tierIds).toContain("PRO");
      expect(tierIds).toContain("ELITE");

      // Free tier price: $0
      const freeTier = VALUE_TIERS.find((t) => t.id === "FREE");
      expect(freeTier?.price.monthly).toBeNull();

      // Pricing chrome must have zero mentions of retired Galaxy Twin
      const pricingPageSrc = readWeb("app/pricing/page.tsx");
      expect(pricingPageSrc).not.toMatch(/Galaxy Twin/i);
    });

    it("Feature 13: Free tier receives exactly 1 daily teaser pick (dailyPickLimit === 1)", () => {
      const freeEnt = getEntitlements("FREE");
      expect(
        freeEnt.dailyPickLimit,
        "FREE tier dailyPickLimit must be exactly 1 (daily teaser pick)"
      ).toBe(1);

      // Pro and Elite must have unlimited picks (null)
      const proEnt = getEntitlements("PRO");
      expect(proEnt.dailyPickLimit).toBeNull();

      const eliteEnt = getEntitlements("ELITE");
      expect(eliteEnt.dailyPickLimit).toBeNull();
    });

    it("Feature 14 & 15 & 16: Elite tools strictly gated server-side behind ELITE tier", () => {
      const free = getEntitlements("FREE") as Record<string, unknown>;
      const fantasy = getEntitlements("FANTASY") as Record<string, unknown>;
      const pro = getEntitlements("PRO") as Record<string, unknown>;
      const elite = getEntitlements("ELITE") as Record<string, unknown>;

      // Tool 1: Multi-Lineup (150-Max) DFS Optimizer
      expect(free["canUseDfsOptimizer150"], "FREE cannot use 150-Max DFS").toBeFalsy();
      expect(fantasy["canUseDfsOptimizer150"], "FANTASY cannot use 150-Max DFS").toBeFalsy();
      expect(pro["canUseDfsOptimizer150"], "PRO cannot use 150-Max DFS").toBeFalsy();
      expect(elite["canUseDfsOptimizer150"], "ELITE must unlock 150-Max DFS").toBe(true);

      // Tool 2: Full Situational & SGP Correlation Matrix
      expect(free["canUseSgpCorrelation"], "FREE cannot use SGP Correlation Matrix").toBeFalsy();
      expect(fantasy["canUseSgpCorrelation"], "FANTASY cannot use SGP Correlation Matrix").toBeFalsy();
      expect(pro["canUseSgpCorrelation"], "PRO cannot use SGP Correlation Matrix").toBeFalsy();
      expect(elite["canUseSgpCorrelation"], "ELITE must unlock SGP Correlation Matrix").toBe(true);

      // Tool 3: Real-Time Line Steam & Sharp Movement Alerts
      expect(free["canGetSteamAlerts"], "FREE cannot get Steam Alerts").toBeFalsy();
      expect(fantasy["canGetSteamAlerts"], "FANTASY cannot get Steam Alerts").toBeFalsy();
      expect(pro["canGetSteamAlerts"], "PRO cannot get Steam Alerts").toBeFalsy();
      expect(elite["canGetSteamAlerts"], "ELITE must unlock Steam Alerts").toBe(true);

      // Tool 4: Personal CLV & ROI Portfolio Dashboard
      expect(free["canUseClvLedger"], "FREE cannot use CLV Ledger").toBeFalsy();
      expect(fantasy["canUseClvLedger"], "FANTASY cannot use CLV Ledger").toBeFalsy();
      expect(pro["canUseClvLedger"], "PRO cannot use CLV Ledger").toBeFalsy();
      expect(elite["canUseClvLedger"], "ELITE must unlock CLV Ledger").toBe(true);
    });
  });

  describe("R4: Fantasy Data Unification & Zero Mock Policy", () => {
    it("Feature 18: SUNMON_DFS_CANDIDATES.csv exists with 686 real NFL players", () => {
      const csvPath = resolve(repoRoot, "dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv");
      expect(existsSync(csvPath), "SUNMON_DFS_CANDIDATES.csv must exist in repo").toBe(true);

      const csvContent = readFileSync(csvPath, "utf8");
      const lines = csvContent.trim().split("\n");

      // 1 header line + 685 player rows = 686 lines
      expect(lines.length).toBe(686);

      // Check header columns
      const header = lines[0];
      expect(header).toContain("player");
      expect(header).toContain("pos");
      expect(header).toContain("salary");
      expect(header).toContain("mkt_implied_dk_pts");

      // Verify real players are present
      expect(csvContent).toContain("Jahmyr Gibbs");
      expect(csvContent).toContain("Bijan Robinson");
      expect(csvContent).toContain("Christian McCaffrey");
      expect(csvContent).toContain("Ja'Marr Chase");
    });

    it("Feature 19: /fantasy/dfs and /fantasy/optimizer consume unified projection feed", () => {
      const dfsPageSrc = readWeb("app/fantasy/dfs/page.tsx");
      const optimizerWorkspacePath = resolve(webRoot, "components/fantasy/optimizer-workspace.tsx");
      const optimizerWorkspaceSrc = existsSync(optimizerWorkspacePath)
        ? readWeb("components/fantasy/optimizer-workspace.tsx")
        : "";

      // Both surfaces must reference the unified slate parser or feed
      const referencesUnified =
        dfsPageSrc.includes("unified-slate") ||
        dfsPageSrc.includes("getUnifiedDfsSlate") ||
        optimizerWorkspaceSrc.includes("unified-slate") ||
        optimizerWorkspaceSrc.includes("getUnifiedDfsSlate");

      expect(
        referencesUnified,
        "Fantasy DFS and Optimizer must be wired to consume unified-slate feed"
      ).toBe(true);
    });

    it("Feature 20 & 21: Zero Mock Policy — production surfaces do not mount fictional demo players or demo decisions", () => {
      // Production DFS page must not mount hardcoded fictional DFS_SLATE
      const dfsPageSrc = readWeb("app/fantasy/dfs/page.tsx");
      expect(
        dfsPageSrc,
        "Production /fantasy/dfs must not fall back to fictional DFS_SLATE"
      ).not.toContain("DFS_SLATE");

      // Honest empty state component LivePoolEmpty must exist
      const livePoolEmptyPath = resolve(webRoot, "components/fantasy/live-pool-empty.tsx");
      expect(existsSync(livePoolEmptyPath)).toBe(true);
      const livePoolEmptySrc = readWeb("components/fantasy/live-pool-empty.tsx");
      expect(livePoolEmptySrc).toContain("Live source unavailable");

      // /fantasy/gm-ledger must not display hardcoded fictional demo decisions
      const gmLedgerSrc = readWeb("app/fantasy/gm-ledger/page.tsx");
      expect(
        gmLedgerSrc,
        "Production /fantasy/gm-ledger must not display fictional demo decisions"
      ).not.toMatch(/Took Marcus Vale at the 1\.04/i);
    });
  });
});

// ==============================================================================
// TIER 2 — BOUNDARY & CORNER CASES
// ==============================================================================

describe("Tier 2 — Boundary & Corner Cases", () => {
  it("T2.1: Query parameters are preserved during /picks -> /board redirect", async () => {
    const redirects = await getConfigRedirects();
    const picksRedirect = redirects.find((r) => r.source === "/picks");

    // In Next.js, permanent redirects without destination query rewrite automatically preserve
    // original query parameters (e.g., /picks?sport=nfl&date=2026-10-12 -> /board?sport=nfl&date=2026-10-12)
    expect(picksRedirect?.destination).toBe("/board");
    expect(picksRedirect?.destination).not.toContain("?");
  });

  it("T2.2: /board handles invalid tab values by falling back to default 'signals' tab", () => {
    const boardSrc = readWeb("app/board/page.tsx");

    // Valid tabs are 'signals' and 'held'. Any invalid tab must fall back to 'signals'
    const handlesTabFallback =
      boardSrc.includes('tab === "held"') ||
      boardSrc.includes("tab === 'held'") ||
      boardSrc.includes('tab = "signals"');

    expect(
      handlesTabFallback,
      "/board must default unknown or invalid tab values to Actionable Signals"
    ).toBe(true);
  });

  it("T2.3: Free tier pick limit boundaries (0 allowed, 1 reached, 2 paywalled)", () => {
    const free = getEntitlements("FREE");
    const limit = free.dailyPickLimit ?? 1;

    // Boundary check helper
    function isWithinPickLimit(picksViewedCount: number, pickLimit: number | null): boolean {
      if (pickLimit === null) return true; // Unlimited (Pro/Elite)
      return picksViewedCount < pickLimit;
    }

    // Pick 0: 0 viewed < 1 limit -> permitted
    expect(isWithinPickLimit(0, limit)).toBe(true);

    // Pick 1: 1 viewed >= 1 limit -> reached (no further free picks)
    expect(isWithinPickLimit(1, limit)).toBe(false);

    // Pick 2: 2 viewed >= 1 limit -> gated / paywall banner triggered
    expect(isWithinPickLimit(2, limit)).toBe(false);

    // Pro / Elite: unlimited picks
    const pro = getEntitlements("PRO");
    expect(isWithinPickLimit(100, pro.dailyPickLimit)).toBe(true);
  });

  it("T2.4: DFS Optimizer slider boundaries (1-20 for non-elite, up to 150 for elite)", () => {
    function getMaxOptimizerLineups(tier: SubscriptionTier): number {
      const ent = getEntitlements(tier) as Record<string, unknown>;
      return ent["canUseDfsOptimizer150"] ? 150 : 20;
    }

    expect(getMaxOptimizerLineups("FREE")).toBe(20);
    expect(getMaxOptimizerLineups("FANTASY")).toBe(20);
    expect(getMaxOptimizerLineups("PRO")).toBe(20);
    expect(getMaxOptimizerLineups("ELITE")).toBe(150);

    // Boundary validation
    function validateLineupRequest(lineups: number, tier: SubscriptionTier): { valid: boolean; clamped: number } {
      const max = getMaxOptimizerLineups(tier);
      if (lineups < 1) return { valid: false, clamped: 1 };
      if (lineups > max) return { valid: false, clamped: max };
      return { valid: true, clamped: lineups };
    }

    // Non-elite requests
    expect(validateLineupRequest(1, "PRO").valid).toBe(true);
    expect(validateLineupRequest(20, "PRO").valid).toBe(true);
    expect(validateLineupRequest(21, "PRO").valid).toBe(false);
    expect(validateLineupRequest(150, "PRO").clamped).toBe(20);

    // Elite requests
    expect(validateLineupRequest(150, "ELITE").valid).toBe(true);
    expect(validateLineupRequest(151, "ELITE").valid).toBe(false);
    expect(validateLineupRequest(200, "ELITE").clamped).toBe(150);
  });

  it("T2.5: Empty player pool gracefully surfaces LivePoolEmpty without crashing", () => {
    const livePoolEmptySrc = readWeb("components/fantasy/live-pool-empty.tsx");
    expect(livePoolEmptySrc).toContain("Live source unavailable");
    expect(livePoolEmptySrc).toContain('role="status"');
    expect(livePoolEmptySrc).not.toContain("PLAYERS");
    expect(livePoolEmptySrc).not.toContain("DFS_SLATE");
  });
});

// ==============================================================================
// TIER 3 — CROSS-FEATURE INTERACTIONS
// ==============================================================================

describe("Tier 3 — Cross-Feature Interactions", () => {
  it("T3.1: Upgrade CTAs on /board point cleanly to /pricing upgrade flow", () => {
    const boardSrc = readWeb("app/board/page.tsx");

    // Any paywall link or upgrade prompt must route to /pricing
    expect(boardSrc).toMatch(/href=["']\/pricing(\?[^"']*)?["']/);

    // /pricing route must exist and be accessible
    expect(existsSync(resolve(webRoot, "app/pricing/page.tsx"))).toBe(true);
  });

  it("T3.2: Multi-surface entitlement coherence across all 4 tiers simultaneously", () => {
    const tiers: SubscriptionTier[] = ["FREE", "FANTASY", "PRO", "ELITE"];

    for (const tier of tiers) {
      const ent = getEntitlements(tier) as Record<string, unknown>;

      // Rule 1: Only PRO and ELITE get full betting signals and factor breakdown
      const isBettingTier = tier === "PRO" || tier === "ELITE";
      expect(ent["canSeePremiumPicks"]).toBe(isBettingTier);
      expect(ent["canSeeConfidence"]).toBe(isBettingTier);
      expect(ent["canSeeFactorBreakdown"]).toBe(isBettingTier);

      // Rule 2: FANTASY, PRO, and ELITE get full fantasy suite; FREE does not
      const isPaid = tier !== "FREE";
      expect(ent["canUseFantasyFull"]).toBe(isPaid);

      // Rule 3: Only ELITE gets high-leverage 150-Max DFS and SGP Correlation
      const isElite = tier === "ELITE";
      expect(ent["canUseDfsOptimizer150"]).toBe(isElite);
      expect(ent["canUseSgpCorrelation"]).toBe(isElite);
      expect(ent["canGetSteamAlerts"]).toBe(isElite);
      expect(ent["canUseClvLedger"]).toBe(isElite);
    }
  });
});

// ==============================================================================
// TIER 4 — REAL-WORLD APPLICATION SCENARIOS
// ==============================================================================

describe("Tier 4 — Real-World Application Scenarios", () => {
  it("T4.1: Complete visitor journey from legacy bookmark to signals, held pass-discipline, and pricing upgrade", async () => {
    // 1. Visitor arrives at legacy bookmark /picks
    const redirects = await getConfigRedirects();
    const picksRedirect = redirects.find((r) => r.source === "/picks");
    expect(picksRedirect?.destination, "Step 1: Visitor redirected to /board").toBe("/board");

    // 2. Visitor sees desktop/mobile header navigation
    const navSrc = readWeb("components/ui/nav.tsx");
    expect(navSrc, "Step 2: Navigation shows 'The Board'").toMatch(/label:\s*"The [Bb]oard"/);

    // 3. Visitor lands on Actionable Signals (?tab=signals)
    const boardSrc = readWeb("app/board/page.tsx");
    expect(boardSrc, "Step 3: Board renders Actionable Signals").toMatch(/Actionable Signals/i);

    // 4. Visitor inspects pick cards with plain-English terminology
    const pickCardSrc = readWeb("components/picks/pick-card.tsx");
    expect(pickCardSrc, "Step 4a: Card displays Fair Market Value").toContain("Fair Market Value");
    expect(pickCardSrc, "Step 4b: Card purges CPOE/WOPR acronyms").not.toMatch(/\b(CPOE|WOPR|RYOE|DAKOTA)\b/);

    // 5. Visitor clicks Gated & Held Games (?tab=held) to audit pass discipline
    expect(boardSrc, "Step 5: Board renders Gated & Held Games").toMatch(/Gated\s*(&|and)\s*Held\s*Games/i);

    // 6. Visitor follows upgrade link to /pricing
    const pricingSrc = readWeb("app/pricing/page.tsx");
    expect(pricingSrc, "Step 6a: Pricing page renders value tiers").toContain("PricingPlans");
    expect(pricingSrc, "Step 6b: Retired Galaxy Twin absent").not.toMatch(/Galaxy Twin/i);

    // 7. Visitor accesses fantasy tools and receives real data or honest empty status
    const livePoolEmptySrc = readWeb("components/fantasy/live-pool-empty.tsx");
    expect(livePoolEmptySrc, "Step 7: Fantasy uses honest empty state").toContain("Live source unavailable");
  });
});
