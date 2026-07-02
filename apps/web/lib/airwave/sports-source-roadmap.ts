/**
 * Airwave Intelligence — Sports Source Roadmap.
 *
 * Defines the canonical roadmap of data sources for Galaxy Sports Edge (GSE)
 * and Galaxy Sports Network (GSN), incorporating findings from the 31-repo
 * analysis conducted 2026-06-10.
 *
 * This is a read-only data contract — no network calls, no imports.
 * References: docs/ai/airwave/GSE_GSN_REPO_INTEGRATION_PLAN.md
 *
 * EXCLUDED sources (do not build on):
 *   - parker-stephens/siriusxm-activator (circumvents paid activation — illegal posture)
 *   - brendeni1/SiriusXM-Renewer (same — archived)
 *   - andrew0/SiriusXM (archived, ToS-violating HLS proxy)
 *   - BurntSushi/nflgame (unmaintained, data source gone)
 *   - Deryck97/nfl_nextgenstats_data (archived — value is as pointer only)
 *   - naivelogic/NFL-smarter-football (no license, nflscrapR-era dead data)
 *   - AGPL repos into closed product (statistics-for-strava, ZeroCat)
 *   - scores24.live / Kiito OÜ (ToS §4.2 forbids automated programs; PERMISSION_REQUIRED —
 *       manual UX research allowed; outreach via support@scores24.live for automation rights)
 */

export type SourceDomain = "GSE" | "GSN" | "BOTH" | "DEV_TOOLING" | "EXCLUDED";

export type SourceLicensePosture =
  | "SAFE_ADOPT"          // MIT, Apache-2.0, CC0, CC-BY-SA — can adopt and modify
  | "SAFE_REFERENCE"      // CC0, public domain, CC-BY-SA data — reference methodology
  | "STUDY_ONLY"          // AGPL / restrictive — study patterns, do not import code
  | "REFERENCE_ONLY"      // No license or all-rights-reserved — read for ideas only
  | "EXCLUDED"            // Legal risk or off-mission; do not use
  | "INSTALL";            // Claude plugin/skill — install directly

export type SourceCurrentStatus =
  | "ACTIVE_IN_REPO"      // Already wired into this repo
  | "READY_TO_EVALUATE"   // Architecture reviewed; evaluation sprint needed
  | "REFERENCE_FILED"     // Filed as reference; no code adoption
  | "INSTALLED_CLAUDE"    // Installed as Claude Code skill/plugin
  | "EXCLUDED_PERMANENT"  // Permanently excluded — no safe path
  | "PERMISSION_REQUIRED" // Automation forbidden until written consent obtained
  | "FUTURE_CONSIDERATION"; // Not now; revisit at a later milestone

export type SportsSourceEntry = {
  readonly id: string;
  readonly name: string;
  readonly repo: string;
  readonly domain: SourceDomain;
  readonly licensePosture: SourceLicensePosture;
  readonly licenseId: string;
  readonly useCaseSummary: string;
  readonly currentStatus: SourceCurrentStatus;
  readonly nextAction: string;
  readonly risk: string;
  readonly fitsGse: boolean;
  readonly fitsGsn: boolean;
  readonly maintained: boolean;
  readonly notes: string;
};

export const SPORTS_SOURCE_ROADMAP: readonly SportsSourceEntry[] = [
  // ─── Claude Agent Skills ─────────────────────────────────────────────────
  {
    id: "agent-skills",
    name: "addyosmani/agent-skills",
    repo: "https://github.com/addyosmani/agent-skills",
    domain: "BOTH",
    licensePosture: "INSTALL",
    licenseId: "MIT",
    useCaseSummary:
      "23 production engineering skills + 7 lifecycle slash commands (/spec /plan /build /test /review /code-simplify /ship). " +
      "Maps 1:1 onto GSE/GSN launch-gate workflow. Install in Claude Code.",
    currentStatus: "READY_TO_EVALUATE",
    nextAction: "Install as Claude Code plugin. Use /ship and /review on GSE launch branch.",
    risk: "None: MIT, 43k★, very active.",
    fitsGse: true,
    fitsGsn: true,
    maintained: true,
    notes: "Priority 1 install. No code reuse needed: skill/plugin only.",
  },
  {
    id: "pm-skills",
    name: "phuryn/pm-skills",
    repo: "https://github.com/phuryn/pm-skills",
    domain: "BOTH",
    licensePosture: "INSTALL",
    licenseId: "MIT",
    useCaseSummary:
      "68 PM skills including pm-ai-shipping (/ship-check, /document-app, /security-audit-static, /derive-tests). " +
      "Purpose-built for 'AI-built app that needs to be made reviewable before launch': exactly GSE and Lumera.",
    currentStatus: "READY_TO_EVALUATE",
    nextAction:
      "Install in Claude Code. Run /document-app against GSE repo to produce architecture/permissions/secrets docs.",
    risk: "None: MIT, 12k★, v2.0.0 Jun 2026.",
    fitsGse: true,
    fitsGsn: true,
    maintained: true,
    notes: "Priority 1 install. Run /document-app first session after install.",
  },
  {
    id: "last30days-skill",
    name: "mvanhorn/last30days-skill",
    repo: "https://github.com/mvanhorn/last30days-skill",
    domain: "BOTH",
    licensePosture: "INSTALL",
    licenseId: "MIT",
    useCaseSummary:
      "Research skill: fans out across Reddit, X, YouTube, HN, Polymarket, GitHub. " +
      "Polymarket odds + social signal is directly on-domain for a sports-odds product. " +
      "Market sentiment, injury chatter, line-movement narratives.",
    currentStatus: "READY_TO_EVALUATE",
    nextAction:
      "Install as Claude Code skill. Use for market research, line movement context, and GSN trend research.",
    risk: "Low: MIT, 25k★. Bring-your-own-keys. Treat as research, not redistribution.",
    fitsGse: true,
    fitsGsn: true,
    maintained: true,
    notes: "Polymarket integration makes this directly relevant to GSE sports markets.",
  },

  // ─── NFL / Sports Analytics (GSE core) ───────────────────────────────────
  {
    id: "nflverse",
    name: "nflverse (nflfastR / nflreadr / nflverse-data)",
    repo: "https://github.com/nflverse/nflverse-data",
    domain: "GSE",
    licensePosture: "SAFE_ADOPT",
    licenseId: "CC BY-SA 4.0 (data)",
    useCaseSummary:
      "Canonical free NFL data source. Play-by-play (nflfastR), player stats, rosters, schedules, snap counts, " +
      "Next Gen Stats proxies. The modern maintained successor to nflscrapR / nflgame. " +
      "nflreadr is the R package; Python equivalents exist (nfl_data_py).",
    currentStatus: "READY_TO_EVALUATE",
    nextAction:
      "Evaluate nfl_data_py as a Python intake layer for GSE data pipeline. " +
      "Or ingest nflverse-data CSV releases directly into Postgres via a scheduled worker.",
    risk: "Very low. CC BY-SA 4.0 data license. Data is the canonical free source for NFL analytics.",
    fitsGse: true,
    fitsGsn: false,
    maintained: true,
    notes:
      "This is the recommended canonical free NFL data direction per the repo analysis. " +
      "Replaces nflscrapR, nflgame, and any scraper-based approaches.",
  },
  {
    id: "nfl-analytics-blair",
    name: "BlairCurrey/nfl-analytics",
    repo: "https://github.com/BlairCurrey/nfl-analytics",
    domain: "GSE",
    licensePosture: "REFERENCE_ONLY",
    licenseId: "NONE (no license)",
    useCaseSummary:
      "NFL spread prediction pipeline: download nflverse play-by-play → feature-build → train → " +
      "predict → publish to GitHub Releases, fully in CI/GitHub Actions. " +
      "Closest existing template to what GSE's core prediction engine does.",
    currentStatus: "REFERENCE_FILED",
    nextAction:
      "Study the CI-driven predict-and-publish architecture. Lift the structure, not the code. " +
      "No license = no direct code reuse. Contact author if code reuse is desired.",
    risk: "Medium. No open-source license, so no right to reuse code directly. Architecture reference only.",
    fitsGse: true,
    fitsGsn: false,
    maintained: false,
    notes:
      "The most architecturally relevant GSE reference in the 31-repo analysis. " +
      "Use as structural inspiration for the CI-driven prediction pipeline.",
  },
  {
    id: "nfl-dbt",
    name: "clausherther/nfl-dbt",
    repo: "https://github.com/clausherther/nfl-dbt",
    domain: "GSE",
    licensePosture: "SAFE_ADOPT",
    licenseId: "Apache-2.0",
    useCaseSummary:
      "dbt models transforming nflverse play-by-play into analytical tables: games, players, plays, " +
      "teams, field-goal aggregates, fourth-down aggregates. BigQuery target but adaptable.",
    currentStatus: "REFERENCE_FILED",
    nextAction:
      "If GSE adds a data warehouse or analytical layer, evaluate clausherther/nfl-dbt as the " +
      "transformation layer. SQL models are a blueprint for Prisma/Postgres models even without dbt.",
    risk: "Low. Apache-2.0: safe to adopt and modify. Moderate maintenance.",
    fitsGse: true,
    fitsGsn: false,
    maintained: true,
    notes: "Safe to adopt. Most value when a warehouse layer is added.",
  },
  {
    id: "nfl-analytics-book",
    name: "bcongelio/nfl-analytics-with-r-book",
    repo: "https://github.com/bcongelio/nfl-analytics-with-r-book",
    domain: "GSE",
    licensePosture: "SAFE_REFERENCE",
    licenseId: "CC0 (public domain)",
    useCaseSummary:
      "Full CRC Press book: Introduction to NFL Analytics with R. " +
      "EPA, CPOE, win probability, RYOE, modeling, Shiny apps. " +
      "The methodology bible for what a credible sports-intelligence product should compute.",
    currentStatus: "REFERENCE_FILED",
    nextAction:
      "Treat as the methodology reference for GSE's confidence score design. " +
      "R-based, so methodology transfer only, not code reuse.",
    risk: "None. CC0 = public domain. Copy anything.",
    fitsGse: true,
    fitsGsn: false,
    maintained: true,
    notes: "CC0: the cleanest possible reference license.",
  },
  {
    id: "sprig-dashboard-espn",
    name: "GeoWizard4645/sprig-dashboard (ESPN module)",
    repo: "https://github.com/GeoWizard4645/sprig-dashboard",
    domain: "GSE",
    licensePosture: "SAFE_ADOPT",
    licenseId: "MIT",
    useCaseSummary:
      "sports_app.py pulls live NFL/NBA/MLB/F1 scores and standings from ESPN's public, " +
      "key-free API with retry-across-hosts and streaming JSON parse. " +
      "No API key required. Free, multi-league backup/supplementary data source for GSE.",
    currentStatus: "READY_TO_EVALUATE",
    nextAction:
      "Extract and adapt the ESPN public API integration as a resilience fallback for GSE. " +
      "The Odds API is the primary odds source; ESPN covers scores/standings when The Odds API is down. " +
      "Prevents the 4-day silent staleness outage pattern.",
    risk: "Low. MIT license. ESPN public API has no key requirement, and ToS is permissive for this usage pattern.",
    fitsGse: true,
    fitsGsn: false,
    maintained: true,
    notes:
      "Priority item. Adding ESPN public API as a fallback directly addresses the single-dependency outage risk.",
  },
  {
    id: "unravelsports",
    name: "UnravelSports/unravelsports",
    repo: "https://github.com/UnravelSports/unravelsports",
    domain: "GSE",
    licensePosture: "STUDY_ONLY",
    licenseId: "MPL-2.0",
    useCaseSummary:
      "Python package for player tracking data → Polars/graphs → graph neural networks. " +
      "Supports NFL Big Data Bowl. Future-stage R&D for when GSE moves into tracking-level ML.",
    currentStatus: "FUTURE_CONSIDERATION",
    nextAction: "Revisit at AUTHORITY milestone when GSE has multi-season ROI and tracking data access.",
    risk:
      "Low-medium. MPL-2.0 is file-level copyleft: usable but modified files must be open-sourced. " +
      "Overkill for current GSE stage.",
    fitsGse: true,
    fitsGsn: false,
    maintained: true,
    notes: "v1.2.1 Jan 2026. Future-stage only.",
  },

  // ─── Monitoring / Observability ───────────────────────────────────────────
  {
    id: "categraf",
    name: "flashcatcloud/categraf",
    repo: "https://github.com/flashcatcloud/categraf",
    domain: "BOTH",
    licensePosture: "SAFE_ADOPT",
    licenseId: "MIT",
    useCaseSummary:
      "Full metrics + logs observability agent with Prometheus remote-write support. " +
      "The category of fix for GSE's 4-day silent ingestion outage. " +
      "A synthetic check pinging /api/health may be sufficient first step; " +
      "categraf if a full agent is warranted.",
    currentStatus: "READY_TO_EVALUATE",
    nextAction:
      "At minimum: add a synthetic health check that alerts on /api/health staleness. " +
      "Evaluate categraf if full observability agent is needed.",
    risk: "Low. MIT, 1.2k★, active.",
    fitsGse: true,
    fitsGsn: false,
    maintained: true,
    notes: "Addresses the highest-impact operational gap in the current GSE setup.",
  },
  {
    id: "bat-cli",
    name: "sharkdp/bat",
    repo: "https://github.com/sharkdp/bat",
    domain: "DEV_TOOLING",
    licensePosture: "SAFE_ADOPT",
    licenseId: "MIT / Apache-2.0",
    useCaseSummary:
      "cat with syntax highlighting, git integration, paging. " +
      "Developer quality-of-life for the GSE/GSN monorepo. Install on dev machine.",
    currentStatus: "READY_TO_EVALUATE",
    nextAction: "Install on dev machine. Not part of the product itself.",
    risk: "None.",
    fitsGse: false,
    fitsGsn: false,
    maintained: true,
    notes: "Dev tooling only.",
  },

  // ─── Excluded / Legal Risk ────────────────────────────────────────────────
  {
    id: "siriusxm-activator",
    name: "parker-stephens/siriusxm-activator",
    repo: "https://github.com/parker-stephens/siriusxm-activator",
    domain: "EXCLUDED",
    licensePosture: "EXCLUDED",
    licenseId: "NONE",
    useCaseSummary:
      "Replicates the SXM dealer app API to activate radios free for 3 months. " +
      "Circumvents paid activation. Against SXM ToS and legally risky.",
    currentStatus: "EXCLUDED_PERMANENT",
    nextAction: "Do not use, integrate, or reference in any GSE/GSN build.",
    risk: "HIGH. Circumvents paid service. Legal exposure under CFAA / SXM ToS.",
    fitsGse: false,
    fitsGsn: false,
    maintained: false,
    notes: "PERMANENTLY EXCLUDED. Legal risk.",
  },
  {
    id: "siriusxm-renewer",
    name: "brendeni1/SiriusXM-Renewer",
    repo: "https://github.com/brendeni1/SiriusXM-Renewer",
    domain: "EXCLUDED",
    licensePosture: "EXCLUDED",
    licenseId: "NONE",
    useCaseSummary:
      "Exploits SXM renewal API for free 3-month subscriptions. Same category as activator.",
    currentStatus: "EXCLUDED_PERMANENT",
    nextAction: "Do not use, integrate, or reference in any GSE/GSN build.",
    risk: "HIGH. Same legal exposure as siriusxm-activator.",
    fitsGse: false,
    fitsGsn: false,
    maintained: false,
    notes: "PERMANENTLY EXCLUDED. Legal risk.",
  },
  {
    id: "nflgame-burnt-sushi",
    name: "BurntSushi/nflgame",
    repo: "https://github.com/BurntSushi/nflgame",
    domain: "EXCLUDED",
    licensePosture: "EXCLUDED",
    licenseId: "Unlicense",
    useCaseSummary:
      "README states: 'THIS PROJECT IS UNMAINTAINED'. NFL.com Game Center source is gone.",
    currentStatus: "EXCLUDED_PERMANENT",
    nextAction: "Use nflverse instead. nflgame is a dead data source.",
    risk: "Dead dependency. Data source gone.",
    fitsGse: false,
    fitsGsn: false,
    maintained: false,
    notes: "Unmaintained. nflverse is the canonical replacement.",
  },
  {
    id: "scores24-live",
    name: "scores24.live (Kiito OÜ)",
    repo: "https://scores24.live",
    domain: "GSE",
    licensePosture: "REFERENCE_ONLY",
    licenseId: "All rights reserved: ToS §4.2 prohibits automated access without consent",
    useCaseSummary:
      "Consumer sports scores/odds aggregator. Estonian company (Kiito OÜ). " +
      "ToS §4.2 explicitly forbids 'automated programs to interact with the Site'. " +
      "Commercial use requires prior written consent. Data source unknown (may relay " +
      "Sportradar/Stats Perform feeds, which carry independent ToS restrictions). " +
      "Manual UX/taxonomy/feature research is allowed. Reviewed 2026-06-11.",
    currentStatus: "PERMISSION_REQUIRED",
    nextAction:
      "Manual UX and taxonomy research permitted. For automation: contact Kiito OÜ via " +
      "support@scores24.live or personal-data@scores24.live to obtain written permission, " +
      "API agreement, or data license. Track in Source Rights Registry (source_id: scores24-live). " +
      "Until then use ESPN public API or The Odds API as alternatives for data.",
    risk:
      "MEDIUM. Automation without written consent violates ToS §4.2. Commercial use requires " +
      "prior written permission. Upstream data provider unknown: potential secondary liability " +
      "if they relay Sportradar or Stats Perform data. Manual research carries no legal risk.",
    fitsGse: true,
    fitsGsn: false,
    maintained: true,
    notes:
      "Reclassified from EXCLUDED_PERMANENT to PERMISSION_REQUIRED per 2026-06-11 scraping " +
      "rights framework review. Not excluded: has a viable unlock path via Kiito OÜ outreach. " +
      "Manual UX/competitor analysis allowed. See source-rights-registry.ts (source_id: scores24-live).",
  },
];

/** Returns all roadmap entries. */
export function getSportsSourceRoadmap(): readonly SportsSourceEntry[] {
  return SPORTS_SOURCE_ROADMAP;
}

/** Returns roadmap entries for a specific domain. */
export function getRoadmapByDomain(domain: SourceDomain): readonly SportsSourceEntry[] {
  return SPORTS_SOURCE_ROADMAP.filter((entry) => entry.domain === domain);
}

/** Returns only entries safe to adopt (code or install). */
export function getSafeToAdoptSources(): readonly SportsSourceEntry[] {
  return SPORTS_SOURCE_ROADMAP.filter(
    (entry) =>
      entry.licensePosture === "SAFE_ADOPT" ||
      entry.licensePosture === "SAFE_REFERENCE" ||
      entry.licensePosture === "INSTALL",
  );
}

/** Returns permanently excluded sources. */
export function getExcludedSources(): readonly SportsSourceEntry[] {
  return SPORTS_SOURCE_ROADMAP.filter(
    (entry) => entry.currentStatus === "EXCLUDED_PERMANENT",
  );
}

/** Returns sources ready to evaluate this sprint. */
export function getReadyToEvaluateSources(): readonly SportsSourceEntry[] {
  return SPORTS_SOURCE_ROADMAP.filter(
    (entry) => entry.currentStatus === "READY_TO_EVALUATE",
  );
}
