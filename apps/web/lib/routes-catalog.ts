/**
 * Routes Catalog — single source of truth for public routes.
 *
 * Consumed by:
 *  - `apps/web/app/sitemap.ts` — generates sitemap.xml entries
 *  - `apps/web/components/ui/nav.tsx` — desktop primary nav
 *  - `apps/web/components/ui/mobile-nav.tsx` — full mobile nav
 *  - `scripts/smoke-launch.mjs` — launch readiness assertions (reads the
 *    file as text and parses; do not break the literal-array shape)
 *
 * Adding a new public route is a single edit to ROUTES below. The sitemap,
 * smoke script, and nav components all pick it up automatically.
 */
import type { MetadataRoute } from "next";
import type { StateBadgeState } from "@/components/ui/state-badge";

export type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"];

export interface RouteEntry {
  /** Absolute path (leading slash). Use "/" for the home page. */
  readonly path: string;
  /** Display label for nav. */
  readonly label: string;
  /** Long label used in the mobile nav drawer. */
  readonly mobileLabel?: string;
  /** Surface readiness state — drives badge color across the site. */
  readonly state: StateBadgeState;
  /** Sitemap priority (0–1.0). */
  readonly priority: number;
  /** Sitemap change frequency. */
  readonly changeFrequency: ChangeFreq;
  /** Whether to include in desktop primary nav (`nav.tsx`). */
  readonly inDesktopNav?: boolean;
  /** Whether to include in mobile nav drawer (`mobile-nav.tsx`). */
  readonly inMobileNav?: boolean;
  /** Optional short description for /intelligence routing table / SEO copy. */
  readonly summary?: string;
}

export const ROUTES: ReadonlyArray<RouteEntry> = [
  // ── Primary surfaces ──────────────────────────────────────
  {
    path: "/",
    label: "Home",
    state: "live",
    priority: 1.0,
    changeFrequency: "daily",
  },
  {
    path: "/intelligence",
    label: "Network",
    mobileLabel: "The Network",
    state: "live",
    priority: 0.9,
    changeFrequency: "daily",
    inDesktopNav: true,
    inMobileNav: true,
    summary: "Map of the full Sports OS intelligence ecosystem.",
  },
  {
    path: "/board",
    label: "Board",
    mobileLabel: "Today's Board",
    state: "live",
    priority: 0.9,
    changeFrequency: "hourly",
    inDesktopNav: true,
    inMobileNav: true,
    summary: "Today's gated pick slate with confidence and factor trail.",
  },
  {
    path: "/picks",
    label: "Picks",
    state: "live",
    priority: 0.9,
    changeFrequency: "hourly",
    summary: "Pick archive and detail pages.",
  },
  {
    path: "/fantasy",
    label: "Fantasy",
    mobileLabel: "Fantasy Intelligence",
    state: "preview",
    priority: 0.7,
    changeFrequency: "weekly",
    inDesktopNav: true,
    inMobileNav: true,
    summary: "Fantasy War Room: role, usage, injury, matchup, scheme.",
  },
  {
    path: "/market-gravity",
    label: "Market Gravity",
    state: "preview",
    priority: 0.7,
    changeFrequency: "weekly",
    inDesktopNav: true,
    inMobileNav: true,
    summary: "Line movement, book disagreement, market volatility.",
  },
  {
    path: "/brain",
    label: "Brain",
    mobileLabel: "Research Brain",
    state: "beta",
    priority: 0.7,
    changeFrequency: "weekly",
    inMobileNav: true,
    summary: "Structured sports intelligence Q&A. Beta · gated.",
  },
  {
    path: "/rumor-radar",
    label: "Rumor Radar",
    state: "preview",
    priority: 0.7,
    changeFrequency: "weekly",
    inDesktopNav: true,
    inMobileNav: true,
    summary: "Weak-signal watchlist with source-tier labeling.",
  },
  {
    path: "/observatory",
    label: "Edge Map",
    state: "live",
    priority: 0.6,
    changeFrequency: "weekly",
    inMobileNav: true,
    summary: "Cross-sport edge surfacing map.",
  },
  {
    path: "/journal",
    label: "Journal",
    state: "live",
    priority: 0.7,
    changeFrequency: "weekly",
    inMobileNav: true,
    summary: "Decision journal and intelligence essays.",
  },
  {
    path: "/methodology",
    label: "Methodology",
    state: "live",
    priority: 0.8,
    changeFrequency: "monthly",
    inMobileNav: true,
    summary: "How picks are scored, ranked, and gated.",
  },
  {
    path: "/pricing",
    label: "Pricing",
    state: "live",
    priority: 0.7,
    changeFrequency: "monthly",
    inDesktopNav: true,
    inMobileNav: true,
    summary: "Subscription tiers and plan comparison.",
  },
  {
    path: "/developer",
    label: "Developer",
    mobileLabel: "Developer & API",
    state: "waitlist",
    priority: 0.6,
    changeFrequency: "monthly",
    inMobileNav: true,
    summary: "Intelligence layer API for approved developer partners.",
  },

  // ── Fantasy intelligence sub-cluster (GEO authority) ────────
  {
    path: "/fantasy/how-start-sit-works",
    label: "How Start/Sit Works",
    state: "live",
    priority: 0.7,
    changeFrequency: "monthly",
    summary: "Four-input start/sit methodology: injury status, matchup grade, usage trend, scheme fit.",
  },
  {
    path: "/fantasy/usage-trends",
    label: "Usage Trends",
    state: "live",
    priority: 0.7,
    changeFrequency: "monthly",
    summary: "Target share, snap count, route participation — what each metric means and how they are weighted.",
  },
  {
    path: "/fantasy/scheme-fit",
    label: "Scheme Fit",
    state: "live",
    priority: 0.7,
    changeFrequency: "monthly",
    summary: "Five offensive scheme classifications and how each affects fantasy value at WR, RB, TE.",
  },

  // ── Intelligence methodology cluster (GEO authority) ──────
  {
    path: "/intelligence/how-it-works",
    label: "How It Works",
    state: "live",
    priority: 0.8,
    changeFrequency: "monthly",
    summary: "Full intelligence pipeline: six tiers, weighting, governance, scoring, settlement.",
  },
  {
    path: "/intelligence/source-hierarchy",
    label: "Source Hierarchy",
    state: "live",
    priority: 0.8,
    changeFrequency: "monthly",
    summary: "Canonical six-tier source taxonomy with TTL, public-safety, and citation rules.",
  },
  {
    path: "/intelligence/glossary",
    label: "Intelligence Glossary",
    state: "live",
    priority: 0.7,
    changeFrequency: "monthly",
    summary: "Canonical sports intelligence terminology with FAQPage schema.",
  },

  // ── Secondary surfaces (sitemap only) ─────────────────────
  {
    path: "/performance",
    label: "Performance",
    state: "live",
    priority: 0.7,
    changeFrequency: "daily",
    summary: "Settled-pick performance ledger.",
  },
  {
    path: "/ledger",
    label: "Ledger",
    state: "live",
    priority: 0.7,
    changeFrequency: "daily",
    summary: "Recent settled picks with factor snapshots.",
  },
  {
    path: "/vault",
    label: "Vault",
    state: "live",
    priority: 0.6,
    changeFrequency: "weekly",
    summary: "Evidence drawer reference archive.",
  },

  // ── Commercial / company ──────────────────────────────────
  {
    path: "/vs/tout-services",
    label: "vs Tout Services",
    state: "live",
    priority: 0.6,
    changeFrequency: "monthly",
    summary: "Comparison against tout / casino certainty services.",
  },
  { path: "/about", label: "About", state: "live", priority: 0.5, changeFrequency: "monthly" },
  { path: "/press", label: "Press", state: "live", priority: 0.4, changeFrequency: "monthly" },
  { path: "/contact", label: "Contact", state: "live", priority: 0.4, changeFrequency: "yearly" },
  { path: "/changelog", label: "Changelog", state: "live", priority: 0.5, changeFrequency: "weekly" },

  // ── Legal / responsible play ──────────────────────────────
  { path: "/faq", label: "FAQ", state: "live", priority: 0.5, changeFrequency: "monthly" },
  { path: "/responsible-play", label: "Responsible Play", state: "live", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", label: "Terms", state: "live", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", label: "Privacy", state: "live", priority: 0.3, changeFrequency: "yearly" },
];

/** Routes shown in the desktop primary nav, in display order. */
export const DESKTOP_NAV_ROUTES: ReadonlyArray<RouteEntry> = ROUTES.filter(
  (r) => r.inDesktopNav,
);

/** Routes shown in the mobile nav drawer, in display order. */
export const MOBILE_NAV_ROUTES: ReadonlyArray<RouteEntry> = ROUTES.filter(
  (r) => r.inMobileNav,
);

/** Sitemap entries derived directly from ROUTES. */
export const SITEMAP_ROUTES = ROUTES;

/** Public-facing intelligence surfaces (used by /intelligence + smoke). */
export const INTELLIGENCE_SURFACE_PATHS: ReadonlyArray<string> = [
  "/intelligence",
  "/fantasy",
  "/market-gravity",
  "/brain",
  "/rumor-radar",
  "/developer",
];
