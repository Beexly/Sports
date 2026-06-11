/**
 * Data Rules — what may and may not be extracted into production systems.
 *
 * EXTRACT (permitted with appropriate source rights):
 *   facts, timestamps, URLs, metadata, publicly reported scores/fixtures/standings,
 *   source references, derived signals we generate ourselves
 *
 * DO NOT EXTRACT into production:
 *   article bodies for republication, proprietary predictions, protected graphics/charts,
 *   site copy, photos/logos/headshots, account-gated content, personal data (without privacy review)
 */

// ─── Data field categories ────────────────────────────────────────────────────

export type DataFieldCategory =
  | "fact"              // Score, fixture, result, standing — not copyrightable
  | "timestamp"         // Event time, publication time
  | "url"               // Source URL, canonical link
  | "metadata"          // Title, sport, league, team, player identifier
  | "derived_signal"    // Our own calculated signal (confidence, edge, model output)
  | "text_summary"      // Our own paraphrase/summary of a fact — not verbatim
  | "source_reference"  // Attribution pointer
  | "expression"        // Protected creative expression — requires license
  | "personal_data"     // PII — requires privacy review
  | "proprietary"       // Vendor proprietary prediction / rated odds data
  | "graphic"           // Image, logo, chart — requires license
  | "account_gated";    // Content behind login/paywall — always blocked

export type DataFieldRule = {
  readonly category: DataFieldCategory;
  readonly example: string;
  readonly extractionAllowed: boolean;
  readonly storageAllowed: boolean;
  readonly commercialDisplayAllowed: boolean;
  readonly modelTrainingAllowed: boolean;
  readonly requiresAttributedLicense: boolean;
  readonly requiresPrivacyReview: boolean;
  readonly notes: string;
};

export const DATA_RULES: readonly DataFieldRule[] = [
  {
    category: "fact",
    example: "Final score: Chiefs 27, Ravens 20",
    extractionAllowed: true,
    storageAllowed: true,
    commercialDisplayAllowed: true,
    modelTrainingAllowed: true,
    requiresAttributedLicense: false,
    requiresPrivacyReview: false,
    notes:
      "Facts are not copyrightable (Feist v. Rural, 1991). " +
      "May extract, store, and display publicly reported facts with attribution to source.",
  },
  {
    category: "timestamp",
    example: "Game start: 2025-09-07T18:00:00Z",
    extractionAllowed: true,
    storageAllowed: true,
    commercialDisplayAllowed: true,
    modelTrainingAllowed: true,
    requiresAttributedLicense: false,
    requiresPrivacyReview: false,
    notes: "Timestamps are facts. No copyright risk.",
  },
  {
    category: "url",
    example: "https://source.com/game/12345",
    extractionAllowed: true,
    storageAllowed: true,
    commercialDisplayAllowed: false,
    modelTrainingAllowed: true,
    requiresAttributedLicense: false,
    requiresPrivacyReview: false,
    notes: "URLs stored as source references only. Not displayed as commercial content.",
  },
  {
    category: "metadata",
    example: "Team: Kansas City Chiefs | League: NFL | Week: 1",
    extractionAllowed: true,
    storageAllowed: true,
    commercialDisplayAllowed: true,
    modelTrainingAllowed: true,
    requiresAttributedLicense: false,
    requiresPrivacyReview: false,
    notes:
      "Structural metadata (team names, league/season identifiers) are facts. " +
      "Team logos and wordmarks are NOT metadata — they are graphics covered by trademark.",
  },
  {
    category: "derived_signal",
    example: "Model confidence: 73 | Edge: +3.1 | GSE pick tier: PRO",
    extractionAllowed: true,
    storageAllowed: true,
    commercialDisplayAllowed: true,
    modelTrainingAllowed: true,
    requiresAttributedLicense: false,
    requiresPrivacyReview: false,
    notes: "Signals we generate from underlying facts. We own the output. No license required.",
  },
  {
    category: "text_summary",
    example: "Speaker suggested the running back may see increased carries",
    extractionAllowed: true,
    storageAllowed: true,
    commercialDisplayAllowed: false,
    modelTrainingAllowed: false,
    requiresAttributedLicense: false,
    requiresPrivacyReview: false,
    notes:
      "Our own paraphrase of a fact or observation. Never verbatim. " +
      "commercial_display and model_training require additional rights clearance.",
  },
  {
    category: "source_reference",
    example: "via ESPN | nflverse | The Odds API",
    extractionAllowed: true,
    storageAllowed: true,
    commercialDisplayAllowed: true,
    modelTrainingAllowed: true,
    requiresAttributedLicense: false,
    requiresPrivacyReview: false,
    notes: "Attribution pointers. Always store and display with derived data.",
  },
  {
    category: "expression",
    example: "Full article body, analysis writeup, editorial column",
    extractionAllowed: false,
    storageAllowed: false,
    commercialDisplayAllowed: false,
    modelTrainingAllowed: false,
    requiresAttributedLicense: true,
    requiresPrivacyReview: false,
    notes:
      "Protected creative expression. Do not extract, store, display, or use for training " +
      "without explicit license from the copyright holder.",
  },
  {
    category: "personal_data",
    example: "User email, IP address, session token, betting history",
    extractionAllowed: false,
    storageAllowed: false,
    commercialDisplayAllowed: false,
    modelTrainingAllowed: false,
    requiresAttributedLicense: false,
    requiresPrivacyReview: true,
    notes:
      "Never extract personal data from third-party sources. " +
      "Any accidental capture must be immediately discarded and logged.",
  },
  {
    category: "proprietary",
    example: "Sportradar prediction, official closing line via licensed feed",
    extractionAllowed: false,
    storageAllowed: false,
    commercialDisplayAllowed: false,
    modelTrainingAllowed: false,
    requiresAttributedLicense: true,
    requiresPrivacyReview: false,
    notes:
      "Vendor proprietary predictions and licensed structured feeds carry independent ToS. " +
      "Requires explicit license even if the underlying facts are free.",
  },
  {
    category: "graphic",
    example: "Team logo, player headshot, infographic, chart",
    extractionAllowed: false,
    storageAllowed: false,
    commercialDisplayAllowed: false,
    modelTrainingAllowed: false,
    requiresAttributedLicense: true,
    requiresPrivacyReview: false,
    notes:
      "Images, logos, and graphics carry copyright and/or trademark. " +
      "Never extract or store without explicit license from the rights holder.",
  },
  {
    category: "account_gated",
    example: "Premium subscriber content, authenticated API endpoint, paywalled article",
    extractionAllowed: false,
    storageAllowed: false,
    commercialDisplayAllowed: false,
    modelTrainingAllowed: false,
    requiresAttributedLicense: false,
    requiresPrivacyReview: false,
    notes:
      "Never bypass authentication or paywall. " +
      "Account-gated content is permanently blocked regardless of source status.",
  },
];

/** Returns only categories that are permitted to extract. */
export function getAllowedDataCategories(): readonly DataFieldRule[] {
  return DATA_RULES.filter((r) => r.extractionAllowed);
}

/** Returns only categories that are blocked from extraction. */
export function getBlockedDataCategories(): readonly DataFieldRule[] {
  return DATA_RULES.filter((r) => !r.extractionAllowed);
}

export function getDataRule(category: DataFieldCategory): DataFieldRule | undefined {
  return DATA_RULES.find((r) => r.category === category);
}
