/**
 * Centralized brand configuration.
 *
 * Aligned with the canonical PickPilot Design System (in `design-system/`):
 *   - Voice: "Perspective, not picks." — calm, factual, slightly cinematic.
 *   - Palette: plasma magenta primary, ion-blue secondary, ultraviolet depth.
 *   - IA: Picks / Observatory / The Vault / Performance / Methodology.
 *
 * The design system is the source of truth. This file extracts the strings
 * the Next.js app needs at compile time. If anything here drifts from
 * `design-system/README.md`, the README wins.
 */

export const BRAND_NAME = "PickPilot";

/** The brand-defining headline. Used everywhere we need one line. */
export const BRAND_TAGLINE = "Perspective, not picks.";

/** Long-form positioning used in hero subheads and OG descriptions. */
export const BRAND_POSITIONING =
  "PickPilot ingests live odds from dozens of sportsbooks every 30 minutes, " +
  "scores every matchup for edge, and surfaces a calibrated, fully-reasoned signal. " +
  "You make the call.";

/** Two-letter monogram used in compact lockups when the reticle SVG is overkill. */
export const BRAND_MONOGRAM = "PP";

/** Public support / general inquiries inbox. Used in footer + transactional email. */
export const SUPPORT_EMAIL = "support@pickpilotapp.bet";

/** Compliance / legal inbox. Used in privacy, terms, DMCA, data-deletion pages. */
export const LEGAL_EMAIL = "legal@pickpilotapp.bet";

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
 * Social handles. Empty string disables that icon in the footer.
 *
 * Defaults assume the `pickpilot` handle on each network. If your actual
 * handle differs, edit the value here — the footer reads from this object
 * and nothing else.
 *
 * Threads and X are intentionally separate: Threads uses `@handle` URLs at
 * threads.net, X uses x.com.
 */
export const SOCIAL = {
  x: "https://x.com/pickpilotapp",
  instagram: "https://instagram.com/pickpilotapp",
  facebook: "https://facebook.com/pickpilotapp",
  threads: "https://threads.net/@pickpilotapp",
  youtube: "",
} as const;

/**
 * Product information architecture (per the design system).
 *
 * The route paths stay generic for SEO + existing test stability; the
 * label is the customer-facing surface name.
 */
export const SURFACES = {
  picks: {
    label: "Picks",
    blurb: "Today's signal — every active matchup, every line, every reason.",
    route: "/picks",
  },
  observatory: {
    label: "Observatory",
    blurb:
      "Live market intelligence — line movement, sharp/public split, market depth.",
    route: "/observatory",
  },
  vault: {
    label: "The Vault",
    blurb:
      "Every pick we've ever published, with its full reasoning and outcome.",
    route: "/vault",
  },
  performance: {
    label: "Performance",
    blurb:
      "The published record — wins, losses, pushes, ROI. Gated until calibrated.",
    route: "/performance",
  },
  methodology: {
    label: "Methodology",
    blurb:
      "How the model thinks — pipeline, scoring, calibration, readiness gates.",
    route: "/methodology",
  },
  cockpit: {
    label: "Cockpit",
    blurb:
      "Operator controls — ingestion health, gates, calibration proposals.",
    route: "/cockpit",
  },
  responsible: {
    label: "Responsible play",
    blurb: "Set limits before emotion enters. Resources, helplines, recovery.",
    route: "/responsible-play",
  },
} as const;

/**
 * Composed strings used in <title> and OpenGraph metadata. Imported by the
 * root layout. Kept here so they update automatically when BRAND_NAME or
 * BRAND_TAGLINE changes.
 */
export const BRAND_META = {
  defaultTitle: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  titleTemplate: `%s · ${BRAND_NAME}`,
  description:
    "Perspective, not picks. Live odds ingested every 30 minutes, " +
    "scored for edge, surfaced with full reasoning. No locks, no guarantees — " +
    "a calibrated signal you can audit.",
} as const;

/** Canonical phrase used as the closing reminder on every CTA cluster. */
export const CLOSING_LINE = "You make the call.";
