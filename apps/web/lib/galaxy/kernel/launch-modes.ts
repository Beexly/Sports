/**
 * Launch Modes — Galaxy's operating posture.
 *
 * One of these is active at any time. The active mode controls visible
 * features, data labels, sitemap inclusion, robots posture, and
 * autonomous-publishing locks.
 *
 * Set via env: `GALAXY_LAUNCH_MODE`. Default: `internal-calibration`.
 *
 * See GALAXY_CONSTITUTION.md law #14: no autonomous publishing.
 */

export type LaunchMode =
  | "development"
  | "internal-calibration"
  | "private-alpha"
  | "closed-beta"
  | "public-demo"
  | "production";

export interface LaunchModeCapabilities {
  readonly mode: LaunchMode;
  /** Public picks render on `/picks` and `/today`. */
  readonly publicPicks: boolean;
  /** Performance stats render on `/performance`. */
  readonly performanceStats: boolean;
  /** Demo / sample data labeling is visible to users. */
  readonly demoLabels: boolean;
  /** Live odds source is wired and reading. */
  readonly liveOdds: boolean;
  /** Sitemap includes commercial / SEO routes. */
  readonly sitemapPublic: boolean;
  /** Robots allows indexing. */
  readonly robotsIndex: boolean;
  /** Production browser source maps. */
  readonly sourceMaps: boolean;
  /** Stripe payments live. */
  readonly payments: boolean;
  /** AI Brain accepts user queries. */
  readonly aiAssistant: boolean;
  /** Studio renders to operator. */
  readonly studio: boolean;
  /** Admin / cockpit visible to ADMIN role. */
  readonly adminVisible: boolean;
  /** Detailed error pages visible (development only). */
  readonly verboseErrors: boolean;
  /** Analytics events fire. */
  readonly analytics: boolean;
  /** Newsletter signup active. */
  readonly newsletterCapture: boolean;
  /** Public reports render to anonymous visitors. */
  readonly publicReports: boolean;
  /** Premium tier gates enforced. */
  readonly premiumGates: boolean;
  /** Cron jobs / content publishing pipeline runs. */
  readonly autoPublish: boolean;
  /** External posting (X, newsletters, Discord) — always false in all modes per Constitution #14. */
  readonly externalPosting: false;
}

const BASE: Omit<LaunchModeCapabilities, "mode"> = {
  publicPicks: false,
  performanceStats: false,
  demoLabels: true,
  liveOdds: false,
  sitemapPublic: false,
  robotsIndex: false,
  sourceMaps: false,
  payments: false,
  aiAssistant: false,
  studio: false,
  adminVisible: true,
  verboseErrors: false,
  analytics: false,
  newsletterCapture: false,
  publicReports: false,
  premiumGates: false,
  autoPublish: false,
  externalPosting: false,
};

export const LAUNCH_MODE_CAPABILITIES: Record<LaunchMode, LaunchModeCapabilities> = {
  development: {
    ...BASE,
    mode: "development",
    verboseErrors: true,
    demoLabels: true,
  },
  "internal-calibration": {
    ...BASE,
    mode: "internal-calibration",
    demoLabels: true,
    analytics: false,
  },
  "private-alpha": {
    ...BASE,
    mode: "private-alpha",
    publicPicks: true,
    aiAssistant: true,
    premiumGates: true,
    analytics: true,
  },
  "closed-beta": {
    ...BASE,
    mode: "closed-beta",
    publicPicks: true,
    performanceStats: true,
    liveOdds: true,
    aiAssistant: true,
    payments: true,
    premiumGates: true,
    analytics: true,
    newsletterCapture: true,
    publicReports: true,
  },
  "public-demo": {
    ...BASE,
    mode: "public-demo",
    publicPicks: true,
    demoLabels: true,
    sitemapPublic: true,
    robotsIndex: true,
    analytics: true,
    newsletterCapture: true,
    publicReports: true,
  },
  production: {
    ...BASE,
    mode: "production",
    publicPicks: true,
    performanceStats: true,
    liveOdds: true,
    sitemapPublic: true,
    robotsIndex: true,
    payments: true,
    aiAssistant: true,
    studio: true,
    analytics: true,
    newsletterCapture: true,
    publicReports: true,
    premiumGates: true,
    demoLabels: false,
  },
};

export function getActiveLaunchMode(): LaunchMode {
  const fromEnv = process.env["GALAXY_LAUNCH_MODE"];
  if (
    fromEnv === "development" ||
    fromEnv === "internal-calibration" ||
    fromEnv === "private-alpha" ||
    fromEnv === "closed-beta" ||
    fromEnv === "public-demo" ||
    fromEnv === "production"
  ) {
    return fromEnv;
  }
  return "internal-calibration";
}

export function getActiveCapabilities(): LaunchModeCapabilities {
  return LAUNCH_MODE_CAPABILITIES[getActiveLaunchMode()];
}
