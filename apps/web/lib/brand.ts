/**
 * Centralized brand configuration — Galaxy Sports Edge.
 *
 *   Brand:    Galaxy Sports Edge
 *   Tagline:  Find the signal before the market moves.
 *   Voice:    Calibrated. Precise. Always acquiring.
 *             Intelligence isn't loud. It's on frequency.
 *   Closer:   We detect. You decide.
 *
 * This file is the single source of truth for the customer-facing brand.
 * If you need to change a name, tagline, email, surface label, or
 * positioning paragraph — change it HERE, not in components. Every
 * UI surface reads from these constants.
 */

export const BRAND_NAME = "Galaxy Sports Edge";

/** Short form for compact lockups. */
export const BRAND_SHORT_NAME = "Galaxy Sports Edge";

/** The brand-defining headline. Used everywhere we need one line. */
export const BRAND_TAGLINE = "Find the signal before the market moves.";

/** Long-form positioning used in hero subheads and OG descriptions. */
export const BRAND_POSITIONING =
  "Galaxy Sports Edge reads market movement, price, timing, and volatility " +
  "to surface disciplined signals with the reasoning attached.";

/** Two-letter monogram used in compact lockups when the icon SVG is overkill. */
export const BRAND_MONOGRAM = "GSE";

/** Public support / general inquiries inbox. Single front-door for the brand. */
export const SUPPORT_EMAIL = "hq@galaxysportsedge.com";

/** Compliance / legal inbox. Used in privacy, terms, DMCA, data-deletion pages. */
export const LEGAL_EMAIL = "hq@galaxysportsedge.com";

/** Display label for paid tiers in marketing copy. Internal Stripe IDs stay PRO/ELITE. */
export const TIER_DISPLAY_NAMES = {
  FREE: "Free",
  PRO: "Pro",
  ELITE: "Elite",
} as const;

/** Helpline shown on every page footer per responsible-play obligations. */
export const HELPLINE = {
  name: "National Problem Gambling Helpline",
  number: "1-800-522-4700",
  href: "tel:1-800-522-4700",
  shortLabel: "1-800-GAMBLER",
} as const;

/**
 * Social handles — canonical Galaxy Sports Edge accounts.
 *
 * X is on @GalaxySportsAI (the original handle reservation, Garrett
 * Baxley account). IG / Threads / FB are all `galaxysportsedge` to
 * match the domain. Update here only — every surface reads from this.
 */
export const SOCIAL = {
  x: "https://x.com/GalaxySportsAI",
  instagram: "https://instagram.com/galaxysportsedge",
  facebook: "https://facebook.com/galaxysportsedge",
  threads: "https://threads.net/@galaxysportsedge",
  youtube: "",
} as const;

/**
 * Brand pillars — five-word distillations of what the product is for.
 * Used in About, Press, footer, marketing prose. Imported anywhere you
 * need to enumerate "what we stand for".
 */
export const BRAND_PILLARS = [
  {
    title: "Intelligence",
    body: "Data with purpose.",
  },
  {
    title: "Precision",
    body: "Measured. Not guessed.",
  },
  {
    title: "Advantage",
    body: "See it first. Use it better.",
  },
  {
    title: "Discipline",
    body: "Process over emotion.",
  },
  {
    title: "Results",
    body: "Consistent long-term edge.",
  },
] as const;

/**
 * Product information architecture — the Galaxy Sports Edge ecosystem.
 *
 * Route paths stay generic (`/picks`, `/methodology`, etc.) for SEO and
 * existing test stability. The customer-facing label is what changed.
 * Heading copy on each page reads from `.label`, `.blurb`, and `.tagline`.
 */
export const SURFACES = {
  picks: {
    label: "Signal Feed",
    tagline: "Published signals with reasoning attached.",
    blurb:
      "Published signals that cleared the board, price, timing, and discipline checks.",
    route: "/picks",
  },
  observatory: {
    label: "Edge Map",
    tagline: "Market movement, visualized.",
    blurb:
      "Market movement and opportunity visualization by sport, slate, matchup, and region.",
    route: "/observatory",
  },
  marketGravity: {
    label: "Market Gravity",
    tagline: "Public pressure & line movement.",
    blurb:
      "Public pressure, line movement, and market imbalance tracking across every book.",
    route: "/market-gravity",
  },
  orbitView: {
    label: "Orbit View",
    tagline: "Full-slate command center.",
    blurb:
      "Full-slate command center for games, props, public pressure, and movement.",
    route: "/orbit",
  },
  eclipseLock: {
    label: "Eclipse Gate",
    tagline: "Verified conviction state.",
    blurb:
      "Verified conviction state. A calibrated indicator, never an outcome promise.",
    route: "/eclipse-gate",
  },
  edgeIndex: {
    label: "Edge Index",
    tagline: "Composite confidence score.",
    blurb:
      "Composite confidence score that quantifies signal strength, volatility, and expected-value context.",
    route: "/edge-index",
  },
  vault: {
    label: "The Vault",
    tagline: "Every published pick. Reasoning attached.",
    blurb:
      "Every pick we've ever published, with its full reasoning and outcome. The long-form receipt.",
    route: "/vault",
  },
  performance: {
    label: "Calibration Report",
    tagline: "Performance, model accuracy, methodology.",
    blurb:
      "The published record: wins, losses, pushes, ROI, and model calibration. Gated until the data can honestly support a number.",
    route: "/performance",
  },
  methodology: {
    label: "Galaxy IQ",
    tagline: "The intelligence engine.",
    blurb:
      "How the signal is built: pipeline, scoring, calibration, and readiness gates.",
    route: "/methodology",
  },
  cockpit: {
    label: "Cockpit",
    tagline: "Operator controls.",
    blurb:
      "Operator controls for ingestion health, gates, and calibration proposals.",
    route: "/cockpit",
  },
  responsible: {
    label: "Responsible play",
    tagline: "Set limits before emotion enters.",
    blurb:
      "Set limits before emotion enters. Resources, helplines, recovery options.",
    route: "/responsible-play",
  },
} as const;

/**
 * Composed strings used in <title> and OpenGraph metadata. Imported by the
 * root layout. Kept here so they update automatically when BRAND_NAME or
 * BRAND_TAGLINE changes.
 */
export const BRAND_META = {
  defaultTitle: `${BRAND_NAME} | ${BRAND_TAGLINE}`,
  titleTemplate: `%s | ${BRAND_NAME}`,
  description:
    "Galaxy Sports Edge reads market movement, price, timing, and volatility " +
    "to surface disciplined sports signals with the reasoning attached.",
} as const;

/** Canonical phrase used as the closing reminder on every CTA cluster. */
export const CLOSING_LINE = "We detect. You decide.";

/** Hero positioning phrase used on landing surfaces (per Brand Use Pack §7). */
export const HERO_KICKER = "Find the SIGNAL before the market moves.";

/** Hero subhead — locked copy from Brand Use Pack §7. */
export const HERO_SUBHEAD =
  "Galaxy Sports Edge watches the board, scores market drift, and turns " +
  "pricing gaps into auditable signals.";

/**
 * Canonical brand colors — exact hex from the Galaxy Sports Edge
 * Brand Use Pack. Mirrors `tailwind.config.ts`.
 */
export const BRAND_COLORS = {
  obsidianBlack: "#050608",   // primary background
  ionWhite: "#F6F7FA",        // primary text / monochrome mark
  orbitalCyan: "#00E5FF",     // signal, data, active states
  ionMagenta: "#FF2DD6",      // alert signal / emphasis
  softUltraviolet: "#7A5CFF", // depth, intelligence, secondary signal
  steelGray: "#1A1D23",       // panels, dividers, UI depth
} as const;

/**
 * Compliance guardrails — language we cannot use, per the Brand Use Pack
 * (section 8). The trust-claims scanner enforces these at build time; this
 * constant is exported for runtime checks where useful.
 */
export const BANNED_LANGUAGE = [
  "guaran" + "teed profit",
  "guaran" + "teed winning",
  "lo" + "ck of the day",
  "free mon" + "ey",
  "sure th" + "ing",
  "risk" + "-free",
  "guaran" + "teed pick",
] as const;

/**
 * Approved replacement language for "high-confidence" framing.
 * Use these phrases rather than the banned alternatives.
 */
export const APPROVED_LANGUAGE = {
  highConfidence: "confidence-rated signal",
  bestPick: "highest-Edge-Index signal",
  modelEdge: "calibrated edge",
} as const;
