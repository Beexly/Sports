/**
 * Galaxy Sports Edge (Galaxy Sports Network LLC) — Next.js App Router SEO/JSON-LD,
 * WCAG 2.2 Level AA/AAA Design Tokens & Accessibility Audit Helpers, and
 * PostHog US Cloud Project 516325 Executive HogQL Analytics Pack.
 *
 * Truth-Governance Invariants (`00-TRUTH-FILE` v1, 2026-11-11):
 *   - Entity: Galaxy Sports Network LLC (Texas for-profit LLC, DBA Galaxy Sports Edge,
 *     https://galaxysportsedge.com).
 *   - Zero standalone nonprofit/grant claims; zero banned legacy corporate aliases.
 *   - Zero win-rate headlines; public record copy states:
 *     "Every pick is on the public ledger, wins and losses" -> https://galaxysportsedge.com/calibration
 *   - Zero percentage confidence badges; uncertainty displays explicit sample-size `n`
 *     at equal optical size in `tabular-nums` (Optical Evidence Parity Law 1).
 *   - Zero Next Gen Stats figures on public copy; zero sportsbook affiliate links.
 *   - Zero tout terminology; contractual package policy uses "100% Store-Credit Alignment" only.
 */

// ============================================================================
// 1. Canonical Entity, Crawl Governance & 00-TRUTH-FILE Compliance Guards
// ============================================================================

export const GSE_LEGAL_ENTITY = {
  legalName: "Galaxy Sports Network LLC",
  dbaName: "Galaxy Sports Edge",
  shortCode: "GSE",
  jurisdiction: "Texas, United States",
  canonicalOrigin: "https://galaxysportsedge.com",
  socialSameAs: ["https://x.com/GalaxySportsAI"] as const,
  publicCalibrationUrl: "https://galaxysportsedge.com/calibration",
  parlayMriUrl: "https://galaxysportsedge.com/parlay-mri",
  packagesUrl: "https://galaxysportsedge.com/packages",
  methodologyUrl: "https://galaxysportsedge.com/methodology",
  faqUrl: "https://galaxysportsedge.com/faq",
  responsiblePlayUrl: "https://galaxysportsedge.com/responsible-play",
  positioningStatement:
    "Galaxy Sports Edge is the trust layer for forecasts, human and AI, with the NFL as the proving ground.",
  publicLedgerRuleCopy:
    "Every pick is on the public ledger, wins and losses.",
  contractualAlignmentLabel: "100% Store-Credit Alignment",
} as const;

export const SITEMAP_PREVIEW_CAP = 120 as const;

export const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "GrokBot",
] as const;

export interface NextRouteMetadataShape {
  title: string;
  description: string;
  alternates: {
    canonical: string;
  };
  robots: {
    index: boolean;
    follow: boolean;
  };
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    type: "website";
    locale: "en_US";
  };
  twitter: {
    card: "summary_large_image";
    site: "@GalaxySportsAI";
    title: string;
    description: string;
  };
}

export interface TruthComplianceViolation {
  ruleId: string;
  matchedExcerpt: string;
  remediation: string;
}

const TRUTH_FILE_PROHIBITED_PATTERNS: ReadonlyArray<{
  ruleId: string;
  pattern: RegExp;
  remediation: string;
}> = [
  {
    ruleId: "BANNED_LEGACY_ENTITY",
    pattern: /Golden\s+(?:Ratio\s+Technologies|State\s+Insights)/i,
    remediation: "Use Galaxy Sports Network LLC (DBA Galaxy Sports Edge) exclusively.",
  },
  {
    ruleId: "UNCONFIRMED_NONPROFIT_OR_GRANT_CLAIM",
    pattern:
      /Galaxy\s+(?:Science|Sports)\s+Institute|501\(c\)\(3\)\s*(?:approved|determined)|ARPA-H|MTEC-26-04|\bgse_121_funding_inventory\b/i,
    remediation:
      "Omit standalone nonprofit grant claims and unconfirmed institute titles from Galaxy Sports Edge surfaces.",
  },
  {
    ruleId: "RETIRED_LEDGER_OR_WIN_RATE_HEADLINE",
    pattern:
      /\b62[-_]23[-_]1\b|\b47[-_]19[-_]1\b|\b38[-_]13[-_]1\b|\b71\.2%|\b72\.94%/i,
    remediation:
      'Remove win-rate headlines; state "Every pick is on the public ledger, wins and losses" and link /calibration.',
  },
  {
    ruleId: "PERCENTAGE_CONFIDENCE_BADGE",
    pattern: /\b\d+(?:\.\d+)?\s*%\s*confidence\b|\bconfidence\s*:\s*\d+(?:\.\d+)?\s*%/i,
    remediation:
      "Remove percentage confidence badges; pair statistical estimates with explicit sample-size n badges.",
  },
  {
    ruleId: "PUBLIC_TRACKING_ACRONYM_FIGURE",
    pattern: /\bN[G]S\b|\bNext\s+Gen\s+Stats\b/i,
    remediation: "Do not surface proprietary player-tracking brand figures on public copy.",
  },
  {
    ruleId: "PROHIBITED_TOUT_PROMISE",
    pattern:
      /\brisk[- ]free\b|\bguaranteed\s+win(?:s|ner)?\b|\bmoney[- ]back\s+guarantee\b|\bsure[- ]thing\b|\b(?:mortal\s+)?l[o]ck(?:s|ed)?\b/i,
    remediation:
      'Replace tout promises with plain-language diagnostics and contractual "100% Store-Credit Alignment" only.',
  },
  {
    ruleId: "UNPUBLISHED_PROOF_ADJECTIVE",
    pattern:
      /\brefutes\s+ETH\b|\bsepsis\s+interception\b|#3-SAT|\bcryptographically\s+sealed\b|\bv[e]rified\b|\ba[u]dited\b/i,
    remediation:
      "Restrict claims to live inspectable endpoints and public ledger records until hashes and recompute scripts are public.",
  },
];

export function auditTruthFileCopy(input: string): TruthComplianceViolation[] {
  const violations: TruthComplianceViolation[] = [];
  for (const rule of TRUTH_FILE_PROHIBITED_PATTERNS) {
    const match = rule.pattern.exec(input);
    if (match) {
      violations.push({
        ruleId: rule.ruleId,
        matchedExcerpt: match[0],
        remediation: rule.remediation,
      });
    }
  }
  return violations;
}

export function assertTruthFileCompliant(input: string, contextLabel = "payload"): void {
  const violations = auditTruthFileCopy(input);
  if (violations.length > 0) {
    const summary = violations
      .map((v) => `[${v.ruleId}] matched "${v.matchedExcerpt}" (${v.remediation})`)
      .join("; ");
    throw new Error(`00-TRUTH-FILE compliance failure in ${contextLabel}: ${summary}`);
  }
}

// ============================================================================
// 2. Drop-In Next.js App Router Metadata & Schema.org JSON-LD (@graph)
//    Routes: `/parlay-mri` and `/packages`
// ============================================================================

export interface FaqQuestionAnswer {
  question: string;
  answer: string;
}

export const PARLAY_MRI_FAQ_ITEMS: readonly FaqQuestionAnswer[] = [
  {
    question: "What does Parlay MRI evaluate on an NFL multi-leg slip?",
    answer:
      "Parlay MRI inspects leg-by-leg correlation structure, shared game-script exposure, implied price compounding, and historical sample size (n) across Galaxy Sports Edge's 30+ live API endpoints without sportsbook affiliate links.",
  },
  {
    question: "Why does Parlay MRI omit percentage confidence badges?",
    answer:
      "Calibration records show raw model buckets can overstate realized hit rates, so Galaxy Sports Edge never renders percentage confidence badges. Instead, every diagnostic pairs model dispersion with its explicit sample size (n), and every pick is on the public ledger, wins and losses, at https://galaxysportsedge.com/calibration.",
  },
  {
    question: "Does Galaxy Sports Edge take sportsbook affiliate commissions on Parlay MRI slips?",
    answer:
      "No. Galaxy Sports Network LLC operates Galaxy Sports Edge as an independent forecasting and measurement platform with zero sportsbook affiliate links.",
  },
] as const;

export const PACKAGES_FAQ_ITEMS: readonly FaqQuestionAnswer[] = [
  {
    question: "What is included in Galaxy Sports Edge NFL Sunday Pass and membership packages?",
    answer:
      "Packages unlock full NFL slate diagnostics, Parlay MRI multi-leg correlation breakdowns, DraftKings Classic and Showdown MILP lineup pool previews, and full bitemporal ledger inspection where every pick is on the public ledger, wins and losses.",
  },
  {
    question: "How does 100% Store-Credit Alignment work on /packages?",
    answer:
      "Qualifying access tiers carry contractual 100% Store-Credit Alignment: if a published slate triggers the stated store-credit alignment threshold in the package terms, automatic account store credit is issued toward your next Galaxy Sports Edge pass. No outcome is ever framed as a tout promise.",
  },
  {
    question: "Where can I inspect prior Galaxy Sports Edge wins and losses before purchasing?",
    answer:
      "Every pick is on the public ledger, wins and losses, including passed slates and calibration bucket tables at https://galaxysportsedge.com/calibration.",
  },
] as const;

export const parlayMriMetadata: NextRouteMetadataShape = {
  title: "Parlay MRI — Multi-Leg Correlation & Pricing Diagnostics | Galaxy Sports Edge",
  description:
    "Inspect NFL multi-leg parlay correlation, shared game-environment exposure, and sample-size (n) dispersion on Galaxy Sports Edge. Every pick is on the public ledger, wins and losses.",
  alternates: {
    canonical: GSE_LEGAL_ENTITY.parlayMriUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Parlay MRI — Multi-Leg Correlation Diagnostics | Galaxy Sports Edge",
    description:
      "Decompose NFL same-game and cross-game parlay correlation with explicit sample-size (n) parity and zero sportsbook affiliate links.",
    url: GSE_LEGAL_ENTITY.parlayMriUrl,
    siteName: GSE_LEGAL_ENTITY.dbaName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@GalaxySportsAI",
    title: "Parlay MRI | Galaxy Sports Edge",
    description:
      "Multi-leg NFL correlation and pricing diagnostics from Galaxy Sports Network LLC. Every pick is on the public ledger, wins and losses.",
  },
};

export const packagesMetadata: NextRouteMetadataShape = {
  title: "NFL Access Packages & Sunday Pass — 100% Store-Credit Alignment | Galaxy Sports Edge",
  description:
    "Compare Galaxy Sports Edge NFL Sunday Pass and seasonal analytics packages backed by contractual 100% Store-Credit Alignment. Every pick is on the public ledger, wins and losses.",
  alternates: {
    canonical: GSE_LEGAL_ENTITY.packagesUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Galaxy Sports Edge Packages — Contractual 100% Store-Credit Alignment",
    description:
      "Access Parlay MRI, NFL slate diagnostics, and DraftKings MILP pool previews from Galaxy Sports Network LLC. Losses shown as readily as wins.",
    url: GSE_LEGAL_ENTITY.packagesUrl,
    siteName: GSE_LEGAL_ENTITY.dbaName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@GalaxySportsAI",
    title: "NFL Packages & Sunday Pass | Galaxy Sports Edge",
    description:
      "Transparent NFL forecasting tools with contractual 100% Store-Credit Alignment and public pick history at galaxysportsedge.com/calibration.",
  },
};

export interface JsonLdGraphDocument {
  "@context": "https://schema.org";
  "@graph": ReadonlyArray<Record<string, unknown>>;
}

export function buildOrganizationJsonLdNode(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": `${GSE_LEGAL_ENTITY.canonicalOrigin}/#organization`,
    name: GSE_LEGAL_ENTITY.dbaName,
    legalName: GSE_LEGAL_ENTITY.legalName,
    url: GSE_LEGAL_ENTITY.canonicalOrigin,
    sameAs: [...GSE_LEGAL_ENTITY.socialSameAs],
    description: GSE_LEGAL_ENTITY.positioningStatement,
    knowsAbout: [
      "NFL forecasting calibration",
      "Multi-leg parlay correlation diagnostics",
      "Mixed-integer linear programming portfolio construction",
      "Bitemporal forecast evaluation",
      "Brier score and calibration curve measurement",
    ],
  };
}

export function buildWebSiteJsonLdNode(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": `${GSE_LEGAL_ENTITY.canonicalOrigin}/#website`,
    url: GSE_LEGAL_ENTITY.canonicalOrigin,
    name: GSE_LEGAL_ENTITY.dbaName,
    publisher: {
      "@id": `${GSE_LEGAL_ENTITY.canonicalOrigin}/#organization`,
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "main p"],
    },
  };
}

export function buildSoftwareApplicationJsonLdNode(
  routePath: "/parlay-mri" | "/packages"
): Record<string, unknown> {
  const isParlayMri = routePath === "/parlay-mri";
  const canonicalUrl = isParlayMri
    ? GSE_LEGAL_ENTITY.parlayMriUrl
    : GSE_LEGAL_ENTITY.packagesUrl;

  return {
    "@type": "SoftwareApplication",
    "@id": `${canonicalUrl}#application`,
    name: isParlayMri
      ? "Galaxy Sports Edge — Parlay MRI"
      : "Galaxy Sports Edge — NFL Analytics & DFS Platform",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    url: canonicalUrl,
    provider: {
      "@id": `${GSE_LEGAL_ENTITY.canonicalOrigin}/#organization`,
    },
    featureList: [
      "Parlay MRI multi-leg correlation and pricing diagnostics",
      "DraftKings NFL Classic and Showdown MILP lineup optimizer",
      "Public pick ledger showing wins, losses, and passed slates",
      "Optical parity sample-size (n) indicators in tabular numerals",
      "30+ live forecasting and diagnostic API endpoints",
      "Contractual 100% Store-Credit Alignment on eligible packages",
    ],
    offers: {
      "@type": "AggregateOffer",
      url: GSE_LEGAL_ENTITY.packagesUrl,
      priceCurrency: "USD",
      lowPrice: "19.00",
      highPrice: "199.00",
      description:
        "NFL Sunday Pass and seasonal analytics memberships governed by contractual 100% Store-Credit Alignment.",
    },
  };
}

export function buildFaqPageJsonLdNode(
  canonicalUrl: string,
  items: readonly FaqQuestionAnswer[]
): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    url: canonicalUrl,
    isPartOf: {
      "@id": `${GSE_LEGAL_ENTITY.canonicalOrigin}/#website`,
    },
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildRouteJsonLdGraph(
  routePath: "/parlay-mri" | "/packages"
): JsonLdGraphDocument {
  const canonicalUrl =
    routePath === "/parlay-mri"
      ? GSE_LEGAL_ENTITY.parlayMriUrl
      : GSE_LEGAL_ENTITY.packagesUrl;
  const faqItems =
    routePath === "/parlay-mri" ? PARLAY_MRI_FAQ_ITEMS : PACKAGES_FAQ_ITEMS;

  const doc: JsonLdGraphDocument = {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationJsonLdNode(),
      buildWebSiteJsonLdNode(),
      buildSoftwareApplicationJsonLdNode(routePath),
      buildFaqPageJsonLdNode(canonicalUrl, faqItems),
    ],
  };

  assertTruthFileCompliant(JSON.stringify(doc), `JSON-LD @graph (${routePath})`);
  return doc;
}

export function serializeJsonLdForScriptTag(graphDoc: JsonLdGraphDocument): string {
  const raw = JSON.stringify(graphDoc).replace(/</g, "\\u003c");
  assertTruthFileCompliant(raw, "Serialized JSON-LD");
  return raw;
}

// ============================================================================
// 3. WCAG 2.2 AA/AAA Contrast, Focus, Pointer, Optical Parity & ARIA Helpers
// ============================================================================

export const GSE_WCAG22_DESIGN_TOKENS = {
  fonts: {
    bodyVar: "--f-body",
    bodyFamily: "IBM Plex Sans, sans-serif",
    condensedVar: "--f-cond",
    condensedFamily: "Big Shoulders Display, sans-serif",
    aliasedSecondaryVars: [
      "--f-display",
      "--f-arch",
      "--f-numerals",
      "--f-mono",
      "--f-editorial",
      "--f-word",
    ] as const,
    fontVariantNumeric: "tabular-nums" as const,
  },
  surfaces: {
    void: "#08090C",
    eclipse: "#12141A",
    paper: "#F7F8FB",
    paperRaised: "#FFFFFF",
  },
  fieldDarkInk: {
    ion: "#EDE8E0",
    ion1: "#C4BFB6",
    ion2: "#8F8A82",
    plasma: "#FF4D2E",
  },
  paperLightInk: {
    ink: "#0E1320",
    ink1: "#3A4356",
    ink2: "#5B6678",
    verifyOnLight: "#0B6B46",
    alertOnLight: "#C0122F",
    cautionOnLight: "#9A4D00",
    orbitalCyanOnLight: "#06748A",
  },
  interaction: {
    scrollPaddingTopRem: 4.5,
    scrollPaddingTopCss: "4.5rem",
    wcagAaMinTargetPx: 24,
    gseEnforcedMinTargetPx: 36,
    focusRingDarkHex: "#FF4D2E",
    focusRingLightHex: "#06748A",
    focusOutlineWidthPx: 2,
    focusOutlineOffsetPx: 2,
    consistentHelpRoutes: [
      "/faq",
      "/methodology",
      "/how-to-verify-a-record",
      "/responsible-play",
    ] as const,
  },
} as const;

export interface WcagTokenPairSpec {
  tokenName: string;
  foregroundHex: string;
  backgroundName: string;
  backgroundHex: string;
  isLargeOrActionOnly: boolean;
  semanticUsage: string;
}

export const GSE_WCAG22_TOKEN_MATRIX: readonly WcagTokenPairSpec[] = [
  {
    tokenName: "--ion",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.fieldDarkInk.ion,
    backgroundName: "--void",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.void,
    isLargeOrActionOnly: false,
    semanticUsage: "Primary body and headline ink on dark canvas",
  },
  {
    tokenName: "--ion",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.fieldDarkInk.ion,
    backgroundName: "--eclipse",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.eclipse,
    isLargeOrActionOnly: false,
    semanticUsage: "Primary card text on dark panels",
  },
  {
    tokenName: "--ion-1",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.fieldDarkInk.ion1,
    backgroundName: "--void",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.void,
    isLargeOrActionOnly: false,
    semanticUsage: "Secondary body prose and table labels",
  },
  {
    tokenName: "--ion-2",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.fieldDarkInk.ion2,
    backgroundName: "--void",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.void,
    isLargeOrActionOnly: false,
    semanticUsage: "Tertiary metadata, timestamps, and sample sizes n",
  },
  {
    tokenName: "--plasma",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.fieldDarkInk.plasma,
    backgroundName: "--void",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.void,
    isLargeOrActionOnly: true,
    semanticUsage: "Primary interactive action accent (never long prose)",
  },
  {
    tokenName: "--ink",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.paperLightInk.ink,
    backgroundName: "--paper",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.paper,
    isLargeOrActionOnly: false,
    semanticUsage: "Primary table ink on light data surfaces",
  },
  {
    tokenName: "--ink-1",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.paperLightInk.ink1,
    backgroundName: "--paper",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.paper,
    isLargeOrActionOnly: false,
    semanticUsage: "Secondary data text on light surfaces",
  },
  {
    tokenName: "--ink-2",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.paperLightInk.ink2,
    backgroundName: "--paper",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.paper,
    isLargeOrActionOnly: false,
    semanticUsage: "Muted metadata on light data surfaces",
  },
  {
    tokenName: "--verify-on-light",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.paperLightInk.verifyOnLight,
    backgroundName: "--paper",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.paper,
    isLargeOrActionOnly: false,
    semanticUsage: "Conformal gate pass indicator on light surfaces",
  },
  {
    tokenName: "--alert-on-light",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.paperLightInk.alertOnLight,
    backgroundName: "--paper",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.paper,
    isLargeOrActionOnly: false,
    semanticUsage: "Gate veto or drawdown alert indicator on light surfaces",
  },
  {
    tokenName: "--caution-on-light",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.paperLightInk.cautionOnLight,
    backgroundName: "--paper",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.paper,
    isLargeOrActionOnly: false,
    semanticUsage: "Small sample (n=10..29) caution indicator on light surfaces",
  },
  {
    tokenName: "--orbital-cyan-on-light",
    foregroundHex: GSE_WCAG22_DESIGN_TOKENS.paperLightInk.orbitalCyanOnLight,
    backgroundName: "--paper",
    backgroundHex: GSE_WCAG22_DESIGN_TOKENS.surfaces.paper,
    isLargeOrActionOnly: false,
    semanticUsage: "Interactive link and focus wayfinding accent on light surfaces",
  },
] as const;

export function parseHexRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Expected 6-digit hex color, received "${hex}".`);
  }
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

export function hexToRelativeLuminance(hex: string): number {
  const [r8, g8, b8] = parseHexRgb(hex);
  const linearize = (channel8: number): number => {
    const s = channel8 / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r8) + 0.7152 * linearize(g8) + 0.0722 * linearize(b8);
}

export function computeWcagContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const lumA = hexToRelativeLuminance(foregroundHex);
  const lumB = hexToRelativeLuminance(backgroundHex);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export interface WcagContrastAuditResult extends WcagTokenPairSpec {
  contrastRatio: number;
  passesAaNormalText: boolean;
  passesAaLargeOrUi: boolean;
  passesAaaNormalText: boolean;
}

export function auditWcag22TokenMatrix(
  pairs: readonly WcagTokenPairSpec[] = GSE_WCAG22_TOKEN_MATRIX
): WcagContrastAuditResult[] {
  return pairs.map((pair) => {
    const ratio = computeWcagContrastRatio(pair.foregroundHex, pair.backgroundHex);
    return {
      ...pair,
      contrastRatio: ratio,
      passesAaNormalText: ratio >= 4.5,
      passesAaLargeOrUi: ratio >= 3.0,
      passesAaaNormalText: ratio >= 7.0,
    };
  });
}

export interface OpticalParityCheckInput {
  metricLabel: string;
  metricValueText: string;
  metricFontSizePx: number;
  sampleSizeN: number;
  sampleSizeFontSizePx: number;
  fontVariantNumeric: string;
}

export interface OpticalParityAuditResult {
  passes: boolean;
  isSmallSampleCaution: boolean;
  ariaLabel: string;
  reasons: string[];
}

/**
 * Enforces WCAG 2.2 SC 1.3.1 & Design Contract Law 1 (Optical Evidence Parity):
 *   1. Metric figure and sample-size `n` badge sit at equal optical font size.
 *   2. `font-variant-numeric: tabular-nums` is active.
 *   3. Percentage confidence badges are unconditionally rejected (`00-TRUTH-FILE`).
 */
export function auditOpticalEvidenceParity(
  input: OpticalParityCheckInput
): OpticalParityAuditResult {
  const reasons: string[] = [];
  const combinedCopy = `${input.metricLabel} ${input.metricValueText}`;

  for (const violation of auditTruthFileCopy(combinedCopy)) {
    reasons.push(`${violation.ruleId}: ${violation.remediation}`);
  }
  if (/confidence/i.test(input.metricLabel) && /%/.test(input.metricValueText)) {
    reasons.push("PERCENTAGE_CONFIDENCE_BADGE: Percentage confidence badges are prohibited.");
  }
  if (Math.abs(input.metricFontSizePx - input.sampleSizeFontSizePx) > 0.01) {
    reasons.push(
      `OPTICAL_SIZE_MISMATCH: metric (${input.metricFontSizePx}px) and sample-size n (${input.sampleSizeFontSizePx}px) must match.`
    );
  }
  if (!input.fontVariantNumeric.includes("tabular-nums")) {
    reasons.push("MISSING_TABULAR_NUMS: font-variant-numeric must include tabular-nums.");
  }
  if (!Number.isInteger(input.sampleSizeN) || input.sampleSizeN < 1) {
    reasons.push("INVALID_SAMPLE_SIZE_N: explicit positive integer sample size n is required.");
  }

  const isSmallSampleCaution = input.sampleSizeN >= 1 && input.sampleSizeN < 30;
  const cautionNote = isSmallSampleCaution ? " (small sample caution: n below 30)" : "";

  return {
    passes: reasons.length === 0,
    isSmallSampleCaution,
    ariaLabel: `${input.metricLabel}: ${input.metricValueText}, sample size n equals ${input.sampleSizeN}${cautionNote}`,
    reasons,
  };
}

export interface InteractiveControlAuditInput {
  controlId: string;
  widthPx: number;
  heightPx: number;
  scrollPaddingTopRem: number;
  usesDragGesture: boolean;
  hasSinglePointerAlternative: boolean;
  focusRingHex: string;
  surfaceHex: string;
  allowsClipboardPasteOnAuth?: boolean;
}

export interface InteractiveControlAuditResult {
  passesWcag22Aa: boolean;
  passesGse36PxStandard: boolean;
  focusContrastRatio: number;
  violations: string[];
}

/**
 * Checks WCAG 2.2 SC 1.4.11, 2.4.7, 2.4.11 (Focus Not Obscured), 2.5.7 (Dragging Movements),
 * 2.5.8 (Target Size >= 24x24px; GSE >= 36x36px), and 3.3.8 (Accessible Authentication).
 */
export function auditWcag22InteractiveControl(
  ctrl: InteractiveControlAuditInput
): InteractiveControlAuditResult {
  const violations: string[] = [];
  if (ctrl.widthPx < 24 || ctrl.heightPx < 24) {
    violations.push(
      `SC_2_5_8_TARGET_SIZE: ${ctrl.controlId} is ${ctrl.widthPx}x${ctrl.heightPx}px (< 24x24px AA minimum).`
    );
  }
  if (ctrl.scrollPaddingTopRem < 4.5) {
    violations.push(
      `SC_2_4_11_FOCUS_OBSCURED: scroll-padding-top is ${ctrl.scrollPaddingTopRem}rem (< 4.5rem sticky-header clearance).`
    );
  }
  if (ctrl.usesDragGesture && !ctrl.hasSinglePointerAlternative) {
    violations.push(
      `SC_2_5_7_DRAGGING_MOVEMENTS: ${ctrl.controlId} uses drag-and-drop without single-pointer Pin/Exclude/Swap buttons.`
    );
  }
  const focusContrast = computeWcagContrastRatio(ctrl.focusRingHex, ctrl.surfaceHex);
  if (focusContrast < 3.0) {
    violations.push(
      `SC_1_4_11_FOCUS_CONTRAST: focus indicator contrast ${focusContrast}:1 is below 3.0:1.`
    );
  }
  if (ctrl.allowsClipboardPasteOnAuth === false) {
    violations.push(
      `SC_3_3_8_ACCESSIBLE_AUTH: authentication inputs must permit password-manager autofill and paste.`
    );
  }

  return {
    passesWcag22Aa: violations.length === 0,
    passesGse36PxStandard: ctrl.widthPx >= 36 && ctrl.heightPx >= 36,
    focusContrastRatio: focusContrast,
    violations,
  };
}

export function buildRosterControlAriaProps(params: {
  action: "pin" | "exclude" | "swap";
  playerName: string;
  position: string;
  team: string;
  salaryUsd: number;
  isPressed: boolean;
}): Record<string, string | boolean> {
  const verbMap = {
    pin: "Pin player in lineup pool",
    exclude: "Exclude player from lineup pool",
    swap: "Swap eligible player in slot",
  } as const;
  const label = `${verbMap[params.action]}: ${params.playerName} (${params.position}, ${params.team}, $${params.salaryUsd.toLocaleString("en-US")})`;
  assertTruthFileCompliant(label, "ARIA roster control label");
  return {
    type: "button",
    "aria-label": label,
    "aria-pressed": params.isPressed,
    "data-min-target": "36x36",
  };
}

// ============================================================================
// 4. PostHog US Cloud Project 516325 Executive HogQL Pack & Provider Gating
// ============================================================================

export const POSTHOG_516325_CONFIG = {
  projectId: 516325,
  uiHost: "https://us.posthog.com",
  ingestHost: "https://us.i.posthog.com",
  localDuckgresFallbackSql: "SET memory_limit='512MB'; SET threads=2;",
  bitemporalInvariantSql: "effective_at <= observed_at AND observed_at <= decision_cutoff_at",
  liveFeatureFlags: {
    sundayPassPaywallTest: "gse-paywall-sunday-pass-test",
    dfsPoolPreview: "gse-dfs-pool-preview",
  },
  liveSurveys: {
    packagesExitFeedback: "GSE Paywall Exit Feedback",
  },
} as const;

const SECRET_TOKEN_LEAK_RE = /\b(?:phc_[A-Za-z0-9_]{8,}|phx_[A-Za-z0-9_]{8,}|pcsk_[A-Za-z0-9_]{8,}|xai-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{12,})\b/;

export function assertZeroSecretLeakage(sourceOrPayload: string): void {
  const hit = SECRET_TOKEN_LEAK_RE.exec(sourceOrPayload);
  if (hit) {
    throw new Error(`Zero-secret hygiene violation: live credential prefix detected (${hit[0].slice(0, 5)}...).`);
  }
}

export function shouldRenderPostHogAnalytics(env: {
  NEXT_PUBLIC_ENABLE_POSTHOG?: string;
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_POSTHOG_PROJECT_ID?: string;
  DO_NOT_TRACK?: string;
}): boolean {
  if (env.DO_NOT_TRACK === "1") {
    return false;
  }
  if (env.NEXT_PUBLIC_ENABLE_POSTHOG !== "true") {
    return false;
  }
  if (env.NEXT_PUBLIC_POSTHOG_PROJECT_ID && env.NEXT_PUBLIC_POSTHOG_PROJECT_ID !== "516325") {
    return false;
  }
  return Boolean(env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_KEY.trim().length >= 12);
}

export interface ExecutiveHogQlInsight {
  insightId: string;
  projectId: 516325;
  title: string;
  targetSurface: string;
  referencedFlagsOrSurveys: readonly string[];
  hogql: string;
}

export const POSTHOG_516325_EXECUTIVE_HOGQL_PACK: readonly ExecutiveHogQlInsight[] = [
  {
    insightId: "ph-516325-exec-01-sunday-pass-paywall-funnel",
    projectId: 516325,
    title:
      "Packages Sunday Pass Paywall Variant Funnel & 100% Store-Credit Alignment Checkout Conversion",
    targetSurface: "/packages",
    referencedFlagsOrSurveys: ["gse-paywall-sunday-pass-test"],
    hogql: `-- PostHog US Cloud Project 516325 | Galaxy Sports Network LLC (Galaxy Sports Edge)
-- Funnel for live feature flag: gse-paywall-sunday-pass-test on /packages
SELECT
    coalesce(toString(properties['$feature/gse-paywall-sunday-pass-test']), 'unassigned') AS variant,
    count(DISTINCT person_id) AS exposed_visitors,
    countIf(
        event = '$pageview'
        AND properties['$pathname'] = '/packages'
    ) AS packages_pageviews,
    count(DISTINCT if(
        event = 'gse_package_checkout_started'
        AND properties['$pathname'] = '/packages',
        person_id,
        NULL
    )) AS checkout_started_persons,
    count(DISTINCT if(
        event = 'gse_package_checkout_completed'
        AND properties['alignment_policy'] = '100% Store-Credit Alignment',
        person_id,
        NULL
    )) AS completed_store_credit_aligned_buyers,
    round(
        count(DISTINCT if(event = 'gse_package_checkout_completed', person_id, NULL)) * 100.0
        / nullIf(count(DISTINCT person_id), 0),
        2
    ) AS visitor_to_paid_conversion_pct
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
  AND (
      properties['$pathname'] = '/packages'
      OR event IN ('$feature_flag_called', 'gse_package_checkout_started', 'gse_package_checkout_completed')
  )
  AND properties['$feature/gse-paywall-sunday-pass-test'] IS NOT NULL
GROUP BY variant
ORDER BY completed_store_credit_aligned_buyers DESC`,
  },
  {
    insightId: "ph-516325-exec-02-dfs-pool-preview-engagement",
    projectId: 516325,
    title:
      "Week 10 DraftKings DFS Pool Preview Flag Lift, Non-Drag Controls & Package Upgrade Rate",
    targetSurface: "/fantasy/dfs -> /packages",
    referencedFlagsOrSurveys: ["gse-dfs-pool-preview", "gse-paywall-sunday-pass-test"],
    hogql: `-- PostHog US Cloud Project 516325 | Galaxy Sports Network LLC (Galaxy Sports Edge)
-- Evaluates gse-dfs-pool-preview engagement and downstream /packages conversion
SELECT
    coalesce(toString(properties['$feature/gse-dfs-pool-preview']), 'control') AS dfs_preview_variant,
    coalesce(toString(properties['$feature/gse-paywall-sunday-pass-test']), 'control') AS paywall_variant,
    count(DISTINCT person_id) AS unique_users,
    countIf(event = 'gse_dfs_pool_preview_rendered') AS pool_previews_rendered,
    countIf(
        event = 'gse_dfs_roster_control_clicked'
        AND properties['control_action'] IN ('pin', 'exclude', 'swap')
    ) AS wcag_single_pointer_actions,
    countIf(event = 'gse_dfs_milp_build_requested') AS milp_lineup_builds,
    count(DISTINCT if(
        event = 'gse_package_checkout_completed'
        AND properties['alignment_policy'] = '100% Store-Credit Alignment',
        person_id,
        NULL
    )) AS upgraded_buyers,
    round(
        count(DISTINCT if(event = 'gse_package_checkout_completed', person_id, NULL)) * 100.0
        / nullIf(count(DISTINCT person_id), 0),
        2
    ) AS preview_to_package_conversion_pct
FROM events
WHERE timestamp >= now() - INTERVAL 14 DAY
  AND properties['$feature/gse-dfs-pool-preview'] IS NOT NULL
GROUP BY dfs_preview_variant, paywall_variant
ORDER BY preview_to_package_conversion_pct DESC`,
  },
  {
    insightId: "ph-516325-exec-03-packages-exit-feedback-survey",
    projectId: 516325,
    title:
      "GSE Paywall Exit Feedback Survey Breakdown on /packages by Sunday Pass Test Variant",
    targetSurface: "/packages",
    referencedFlagsOrSurveys: ["GSE Paywall Exit Feedback", "gse-paywall-sunday-pass-test"],
    hogql: `-- PostHog US Cloud Project 516325 | Galaxy Sports Network LLC (Galaxy Sports Edge)
-- Analyzes live survey 'GSE Paywall Exit Feedback' on /packages
SELECT
    coalesce(toString(properties['$feature/gse-paywall-sunday-pass-test']), 'unassigned') AS sunday_pass_variant,
    coalesce(nullIf(toString(properties['$survey_response']), ''), 'no_text_or_dismissed') AS exit_reason,
    countIf(event = 'survey shown') AS survey_impressions,
    countIf(event = 'survey sent') AS survey_submissions,
    countIf(event = 'survey dismissed') AS survey_dismissals,
    round(
        countIf(event = 'survey sent') * 100.0
        / nullIf(countIf(event = 'survey shown'), 0),
        2
    ) AS response_rate_pct
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
  AND event IN ('survey shown', 'survey sent', 'survey dismissed')
  AND properties['$survey_name'] = 'GSE Paywall Exit Feedback'
  AND properties['$pathname'] = '/packages'
GROUP BY sunday_pass_variant, exit_reason
ORDER BY survey_submissions DESC, survey_impressions DESC`,
  },
  {
    insightId: "ph-516325-exec-04-public-ledger-bitemporal-monitor",
    projectId: 516325,
    title:
      "Public Ledger Wins, Losses, Passed Slates & Bitemporal Cutoff Integrity (Zero Headline Claims)",
    targetSurface: "/calibration",
    referencedFlagsOrSurveys: [],
    hogql: `-- PostHog US Cloud Project 516325 | Galaxy Sports Network LLC (Galaxy Sports Edge)
-- Every pick is on the public ledger, wins and losses (galaxysportsedge.com/calibration)
SELECT
    sport_league,
    count() AS evaluated_candidates,
    countIf(disposition = 'PUBLISHED') AS published_plays,
    countIf(disposition = 'PASSED') AS passed_slates,
    countIf(disposition = 'PUBLISHED' AND settlement_status = 'WIN') AS settled_wins,
    countIf(disposition = 'PUBLISHED' AND settlement_status = 'LOSS') AS settled_losses,
    countIf(disposition = 'PUBLISHED' AND settlement_status = 'PUSH') AS settled_pushes,
    round(avgIf(brier_component, disposition = 'PUBLISHED' AND brier_component IS NOT NULL), 4) AS mean_brier_score,
    countIf(
        effective_at <= observed_at
        AND observed_at <= decision_cutoff_at
    ) AS bitemporal_compliant_rows,
    countIf(
        effective_at > observed_at
        OR observed_at > decision_cutoff_at
    ) AS bitemporal_violation_rows
FROM gse_public_pick_ledger
GROUP BY sport_league
ORDER BY evaluated_candidates DESC`,
  },
  {
    insightId: "ph-516325-exec-05-parlay-mri-diagnostics-and-retention",
    projectId: 516325,
    title:
      "Parlay MRI Correlation Diagnostics, Calibration Ledger Clicks & Cross-Flag Cohort Usage",
    targetSurface: "/parlay-mri",
    referencedFlagsOrSurveys: ["gse-paywall-sunday-pass-test", "gse-dfs-pool-preview"],
    hogql: `-- PostHog US Cloud Project 516325 | Galaxy Sports Network LLC (Galaxy Sports Edge)
-- Tracks /parlay-mri correlation scans and public /calibration ledger clickthroughs
SELECT
    toStartOfDay(timestamp) AS activity_day,
    count(DISTINCT if(properties['$pathname'] = '/parlay-mri', person_id, NULL)) AS parlay_mri_visitors,
    countIf(event = 'gse_parlay_mri_scan_completed') AS correlation_scans_run,
    round(avgIf(toFloat(properties['leg_count']), event = 'gse_parlay_mri_scan_completed'), 2) AS avg_slip_legs,
    countIf(
        event = 'gse_public_ledger_inspected'
        AND properties['destination_path'] = '/calibration'
    ) AS public_ledger_inspections,
    countIf(
        event = '$pageview'
        AND properties['$pathname'] = '/packages'
        AND properties['$feature/gse-paywall-sunday-pass-test'] IS NOT NULL
    ) AS flagged_packages_visits
FROM events
WHERE timestamp >= now() - INTERVAL 14 DAY
  AND (
      properties['$pathname'] IN ('/parlay-mri', '/packages', '/calibration')
      OR event IN ('gse_parlay_mri_scan_completed', 'gse_public_ledger_inspected')
  )
GROUP BY activity_day
ORDER BY activity_day DESC`,
  },
] as const;

export function getExecutiveHogQlById(insightId: string): ExecutiveHogQlInsight {
  const found = POSTHOG_516325_EXECUTIVE_HOGQL_PACK.find(
    (entry) => entry.insightId === insightId
  );
  if (!found) {
    throw new Error(`Unknown PostHog 516325 insightId: "${insightId}".`);
  }
  assertTruthFileCompliant(found.hogql, found.insightId);
  assertZeroSecretLeakage(found.hogql);
  return found;
}
