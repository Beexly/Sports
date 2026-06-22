/**
 * Source rights gates for Galaxy Sports Edge.
 * Re-exports and extends the scraping clearance engine types with GSE-specific
 * source registry entries, integrity invariants, and compliance helpers.
 *
 * This file is the programmatic companion to:
 *   apps/web/lib/scraping/source-rights-registry.ts
 *   apps/web/lib/scraping/clearance-engine.ts
 */

// ── Source rights types ───────────────────────────────────────────────────────

export type SourceStatus =
  | "approved_public_logged_off"
  | "approved_api"
  | "approved_open_license"
  | "approved_written_permission"
  | "vendor_candidate"
  | "manual_research_only"
  | "permission_required"
  | "blocked_technical_controls"
  | "excluded";

export type DataCategory =
  | "public_facts"
  | "licensed_stats"
  | "open_dataset"
  | "user_generated"
  | "derived_modeled"
  | "proprietary_protected"
  | "personal_data";

export interface SourceRightsGate {
  sourceId: string;
  name: string;
  url: string;
  status: SourceStatus;
  dataCategory: DataCategory;
  automationAllowed: boolean;
  apiAvailable: boolean;
  licenseType: string | null;
  extractableDataTypes: string[];
  prohibitedDataTypes: string[];
  complianceNotes: string[];
  gseUseCases: string[];
  fantasyPlatform: boolean;
  jurisdictionRestrictions: string[];
}

// ── GSE source registry (extended) ───────────────────────────────────────────

export const GSE_SOURCE_REGISTRY: ReadonlyArray<SourceRightsGate> = [
  // ── Licensed APIs ──────────────────────────────────────────────────────────
  {
    sourceId: "the_odds_api",
    name: "The Odds API",
    url: "https://the-odds-api.com",
    status: "approved_api",
    dataCategory: "licensed_stats",
    automationAllowed: true,
    apiAvailable: true,
    licenseType: "Commercial API license with usage limits",
    extractableDataTypes: [
      "Game odds", "Moneylines", "Spreads", "Totals", "Player props (tier-dependent)",
      "In-game odds (tier-dependent)", "Historical odds"
    ],
    prohibitedDataTypes: ["Re-distribution as a competing odds service"],
    complianceNotes: [
      "Respect API rate limits and plan usage caps",
      "Attribution required in public-facing displays",
      "Cannot build a competing odds aggregation product using this data",
    ],
    gseUseCases: ["Line movement tracking", "Opening/closing line comparison", "CLV computation", "Sharp signal detection"],
    fantasyPlatform: false,
    jurisdictionRestrictions: [],
  },
  {
    sourceId: "anthropic_claude_api",
    name: "Anthropic Claude API",
    url: "https://anthropic.com",
    status: "approved_api",
    dataCategory: "derived_modeled",
    automationAllowed: true,
    apiAvailable: true,
    licenseType: "Commercial API — Anthropic usage policy",
    extractableDataTypes: ["Generated text", "Analysis", "Structured reasoning outputs"],
    prohibitedDataTypes: [
      "Fabricated statistics presented as real data",
      "Fake user data or personas",
      "Content that violates Anthropic usage policy",
    ],
    complianceNotes: [
      "Claude outputs must be labeled as AI-generated when used as factual claims",
      "Claude is content generation only — not source of truth for stats or picks",
      "Do not use Claude to generate fake historical results or fabricated calibration data",
      "GDPR: review Anthropic DPA for EU user data processing",
    ],
    gseUseCases: [
      "Pick narrative generation",
      "Pick thesis bull/bear generation",
      "Lesson generation in autopsy",
      "Voice Jarvis natural language response",
      "Content publishing",
    ],
    fantasyPlatform: false,
    jurisdictionRestrictions: ["EU: DPA review required before processing EU user data"],
  },
  {
    sourceId: "nflverse",
    name: "nflverse (nflreadr / nflfastR)",
    url: "https://nflverse.nflverse.com",
    status: "approved_open_license",
    dataCategory: "open_dataset",
    automationAllowed: true,
    apiAvailable: true,
    licenseType: "MIT License",
    extractableDataTypes: [
      "Play-by-play data", "Weekly player stats", "Roster data",
      "Schedules", "Snap counts", "Air yards", "Team stats"
    ],
    prohibitedDataTypes: [],
    complianceNotes: ["Attribution required. MIT license terms apply."],
    gseUseCases: [
      "Player projection inputs",
      "Target share computation",
      "Historical draft intelligence",
      "Injury trend analysis",
    ],
    fantasyPlatform: false,
    jurisdictionRestrictions: [],
  },

  // ── Conditional / Fantasy Platforms ───────────────────────────────────────
  {
    sourceId: "sleeper_api",
    name: "Sleeper Fantasy",
    url: "https://sleeper.com",
    status: "approved_api",
    dataCategory: "user_generated",
    automationAllowed: true,
    apiAvailable: true,
    licenseType: "Public API — review ToS before implementation",
    extractableDataTypes: [
      "User draft history (own leagues only)",
      "Roster data (own leagues)",
      "Trade history (own leagues)",
      "Player news feed",
    ],
    prohibitedDataTypes: [
      "Aggregating draft data across non-user leagues without permission",
      "Automating draft picks or lineup submissions",
      "Storing user credentials",
    ],
    complianceNotes: [
      "User must authenticate with their own Sleeper account",
      "Do not store Sleeper credentials on GSE servers",
      "Read-only — no automated actions on behalf of user without explicit per-action consent",
      "Review current Sleeper API ToS before any ML training on aggregated data",
    ],
    gseUseCases: ["League memory import", "Draft history for Historical Regret Engine", "Manager Genome seeding"],
    fantasyPlatform: true,
    jurisdictionRestrictions: [],
  },
  {
    sourceId: "yahoo_fantasy_api",
    name: "Yahoo Fantasy Sports API",
    url: "https://developer.yahoo.com/fantasysports/",
    status: "approved_api",
    dataCategory: "user_generated",
    automationAllowed: false,
    apiAvailable: true,
    licenseType: "Yahoo API ToS — OAuth2 required",
    extractableDataTypes: ["Draft results", "Rosters", "Transactions", "Standings"],
    prohibitedDataTypes: [
      "Automated lineup submission",
      "Automated draft pick submission",
      "Credential storage",
    ],
    complianceNotes: [
      "OAuth2 required — user must authorize",
      "No automated actions without per-action user consent",
      "Yahoo ToS prohibits bots; read-only data access is permitted with OAuth",
    ],
    gseUseCases: ["League memory import", "Historical draft data for Regret Engine"],
    fantasyPlatform: true,
    jurisdictionRestrictions: [],
  },

  // ── Manual Research Only ───────────────────────────────────────────────────
  {
    sourceId: "espn_fantasy",
    name: "ESPN Fantasy Sports",
    url: "https://fantasy.espn.com",
    status: "manual_research_only",
    dataCategory: "proprietary_protected",
    automationAllowed: false,
    apiAvailable: false,
    licenseType: null,
    extractableDataTypes: ["None — manual UX research only"],
    prohibitedDataTypes: ["All automated access", "Scraping", "Credential-based access"],
    complianceNotes: [
      "ESPN ToS explicitly prohibits automated access",
      "No official public API for fantasy sports",
      "Users can export their own data manually; GSE can accept user-uploaded CSVs",
    ],
    gseUseCases: ["Manual CSV upload by user", "UX inspiration research only"],
    fantasyPlatform: true,
    jurisdictionRestrictions: [],
  },

  // ── Permission Required ────────────────────────────────────────────────────
  {
    sourceId: "scores24_live",
    name: "Scores24.live",
    url: "https://scores24.live",
    status: "permission_required",
    dataCategory: "proprietary_protected",
    automationAllowed: false,
    apiAvailable: false,
    licenseType: null,
    extractableDataTypes: ["None without written consent"],
    prohibitedDataTypes: ["All automated access without written consent from Kiito OÜ"],
    complianceNotes: [
      "Manual UX/taxonomy review is allowed",
      "Automation requires written consent from Kiito OÜ (support@scores24.live)",
    ],
    gseUseCases: ["Competitor analysis only — no data extraction"],
    fantasyPlatform: false,
    jurisdictionRestrictions: [],
  },

  // ── Vendor Candidates ──────────────────────────────────────────────────────
  {
    sourceId: "score24_com",
    name: "Score24.com",
    url: "https://score24.com",
    status: "vendor_candidate",
    dataCategory: "proprietary_protected",
    automationAllowed: false,
    apiAvailable: false,
    licenseType: null,
    extractableDataTypes: ["Evaluate via vendor questionnaire"],
    prohibitedDataTypes: ["All automated access without license agreement"],
    complianceNotes: ["Complete vendor questionnaire before any ingestion or integration"],
    gseUseCases: ["Potential data vendor — evaluate only"],
    fantasyPlatform: false,
    jurisdictionRestrictions: [],
  },

  // ── Excluded ──────────────────────────────────────────────────────────────
  {
    sourceId: "siriusxm_activator",
    name: "SiriusXM Activator",
    url: "N/A",
    status: "excluded",
    dataCategory: "proprietary_protected",
    automationAllowed: false,
    apiAvailable: false,
    licenseType: null,
    extractableDataTypes: [],
    prohibitedDataTypes: ["All access — circumvents paid subscription"],
    complianceNotes: ["Permanently excluded. No path to approval. Circumvents paid access."],
    gseUseCases: [],
    fantasyPlatform: false,
    jurisdictionRestrictions: [],
  },
] as const;

// ── Integrity invariants ──────────────────────────────────────────────────────

export const INTEGRITY_INVARIANTS = [
  "checkClearance() must be called before every extraction job",
  "ClearanceResult.allowed=false MUST stop the job — no exceptions",
  "wrapExtractedRecord() enforces RightsSnapshot on every record — throws if clearance not granted",
  "Rights snapshots are point-in-time captures — do not mutate them",
  "Attribution text from the registry must propagate to all derived outputs",
  "No CAPTCHA bypass, login bypass, or paywall bypass",
  "No proxy rotation to circumvent IP blocks or access controls",
  "No fake accounts or credential misuse",
  "No scraping of paths disallowed by source policy unless legal counsel approves",
  "No automated access after receiving a cease-and-desist without legal review",
  "Evasion tools must NOT be added to the Tool Registry",
] as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function approvedSources(): SourceRightsGate[] {
  return GSE_SOURCE_REGISTRY.filter(
    (s) =>
      s.status === "approved_api" ||
      s.status === "approved_open_license" ||
      s.status === "approved_public_logged_off" ||
      s.status === "approved_written_permission"
  ) as SourceRightsGate[];
}

export function excludedSources(): SourceRightsGate[] {
  return GSE_SOURCE_REGISTRY.filter((s) => s.status === "excluded") as SourceRightsGate[];
}

export function fantasyPlatformSources(): SourceRightsGate[] {
  return GSE_SOURCE_REGISTRY.filter((s) => s.fantasyPlatform) as SourceRightsGate[];
}

export function automatedSources(): SourceRightsGate[] {
  return GSE_SOURCE_REGISTRY.filter((s) => s.automationAllowed) as SourceRightsGate[];
}

export function sourceById(id: string): SourceRightsGate | undefined {
  return GSE_SOURCE_REGISTRY.find((s) => s.sourceId === id);
}
