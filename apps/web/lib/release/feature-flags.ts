/**
 * Feature Flag / Kill Switch Registry.
 *
 * Every major capability has a flag with a default per release state.
 * Operators can override individual flags via env without redeploying.
 *
 * See docs/ops/contingency/FEATURE_FLAG_KILL_SWITCHES.md for the
 * operational playbook around flipping these.
 */

import type { ReleaseState } from "./release-state";
import { getActiveReleaseState, RELEASE_STATE_CAPABILITIES } from "./release-state";

export type FeatureFlagName =
  | "DECISION_ROOM_ENABLED"
  | "GALAXY_DEMO_ENABLED"
  | "TELEMETRY_ENABLED"
  | "TRUST_STRIP_ENABLED"
  | "NEXT_BEST_SURFACE_ENABLED"
  | "RELATED_INTELLIGENCE_ENABLED"
  | "COMMAND_CENTER_ENABLED"
  | "COMMAND_CENTER_LIVE_DATA_ENABLED"
  | "REPORT_DETAILS_ENABLED"
  | "COACH_SHELL_ENABLED"
  | "COACH_LIVE_AI_ENABLED"
  | "ORBIT_ENABLED"
  | "ARTIFACTS_ENABLED"
  | "LIVE_ODDS_ENABLED"
  | "PUBLIC_PICKS_ENABLED"
  | "PERFORMANCE_STATS_ENABLED"
  | "PROMOTIONS_ENABLED"
  | "STRIPE_CHECKOUT_ENABLED"
  | "STUDIO_ENABLED"
  | "CANONICAL_LEDGER_ENABLED"
  | "MODEL_PULSE_ENABLED"
  | "DECISION_STREAM_ENABLED"
  | "COMMAND_PALETTE_ENABLED"
  | "SLATE_CANVAS_ENABLED"
  | "AMBIENT_SOUND_ENABLED";

export interface FeatureFlag {
  readonly name: FeatureFlagName;
  readonly owner: "platform" | "product" | "trust" | "ai" | "payments";
  readonly protects: string;
  readonly fallback: string;
  readonly envOnly: boolean;
  readonly requiresRedeploy: boolean;
  readonly publicImpact: string;
  readonly premiumImpact: string;
  readonly cockpitImpact: string;
  /** Per release-state default. */
  readonly defaults: Readonly<Record<ReleaseState, boolean>>;
}

function defaultsFor(picker: (state: ReleaseState) => boolean): Readonly<Record<ReleaseState, boolean>> {
  return {
    development: picker("development"),
    "internal-calibration": picker("internal-calibration"),
    preview: picker("preview"),
    "private-beta": picker("private-beta"),
    "public-demo": picker("public-demo"),
    "release-candidate": picker("release-candidate"),
    production: picker("production"),
  };
}

export const FEATURE_FLAGS: ReadonlyArray<FeatureFlag> = [
  {
    name: "DECISION_ROOM_ENABLED",
    owner: "product",
    protects: "Decision Room route exposure",
    fallback: "Redirect to /today",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Removes /room/[gameId]",
    premiumImpact: "Loses per-game intelligence convergence",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => s !== "production" ? true : true),
  },
  {
    name: "GALAXY_DEMO_ENABLED",
    owner: "product",
    protects: "Demo tour route exposure",
    fallback: "404 on /galaxy-demo",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Hides /galaxy-demo",
    premiumImpact: "None",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].demoMode),
  },
  {
    name: "TELEMETRY_ENABLED",
    owner: "platform",
    protects: "Event ingestion sink",
    fallback: "POST /api/telemetry returns { ok:true, noop:true }",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Product analytics blind",
    premiumImpact: "None",
    cockpitImpact: "Internal dashboards stale",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].telemetry),
  },
  {
    name: "TRUST_STRIP_ENABLED",
    owner: "trust",
    protects: "Per-surface trust label rendering",
    fallback: "Renders null (page degrades gracefully)",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses source / freshness labels",
    premiumImpact: "Same",
    cockpitImpact: "Same",
    defaults: defaultsFor(() => true),
  },
  {
    name: "NEXT_BEST_SURFACE_ENABLED",
    owner: "product",
    protects: "Orchestrator-driven next-step CTA",
    fallback: "Renders null",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses contextual navigation hint",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor(() => true),
  },
  {
    name: "RELATED_INTELLIGENCE_ENABLED",
    owner: "product",
    protects: "Related-intel panel on Decision Room",
    fallback: "Renders null",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses related-reports and related-lessons links",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor(() => true),
  },
  {
    name: "COMMAND_CENTER_ENABLED",
    owner: "product",
    protects: "/command route exposure",
    fallback: "Redirect to /today",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses decision-home surface",
    premiumImpact: "Loses widget hub",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].commandCenter),
  },
  {
    name: "COMMAND_CENTER_LIVE_DATA_ENABLED",
    owner: "product",
    protects: "Widget data binding to live sources",
    fallback: "Widgets render in sample/user-entered status",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Widgets show 'sample' status",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => s === "private-beta" || s === "release-candidate" || s === "production"),
  },
  {
    name: "REPORT_DETAILS_ENABLED",
    owner: "product",
    protects: "/reports/[type]/[id] route",
    fallback: "404 or redirect to /reports hub",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses detail pages",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].reports),
  },
  {
    name: "COACH_SHELL_ENABLED",
    owner: "ai",
    protects: "CoachPromptHost UI surface",
    fallback: "Renders null",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses Decision Coach prompts",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].coachShell),
  },
  {
    name: "COACH_LIVE_AI_ENABLED",
    owner: "ai",
    protects: "Anthropic API call from coach (deferred to C65)",
    fallback: "Canned responses from lib/coach/canned-responses.ts",
    envOnly: true,
    requiresRedeploy: false,
    publicImpact: "Coach answers from static registry only",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor(() => false),
  },
  {
    name: "ORBIT_ENABLED",
    owner: "product",
    protects: "/orbit visual concept page",
    fallback: "404 or redirect to /",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses concept surface",
    premiumImpact: "None",
    cockpitImpact: "None",
    defaults: defaultsFor(() => true),
  },
  {
    name: "ARTIFACTS_ENABLED",
    owner: "product",
    protects: "/api/og/* OG image generation",
    fallback: "Static placeholder image",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Share previews are generic",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].artifacts),
  },
  {
    name: "LIVE_ODDS_ENABLED",
    owner: "platform",
    protects: "The Odds API ingestion path",
    fallback: "Bootstrap mode — sample data labels",
    envOnly: true,
    requiresRedeploy: false,
    publicImpact: "All pick freshness drops to bootstrap label",
    premiumImpact: "Same",
    cockpitImpact: "Cockpit data is stale",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].liveOdds),
  },
  {
    name: "PUBLIC_PICKS_ENABLED",
    owner: "trust",
    protects: "/picks public render",
    fallback: "Redirect to /methodology",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "No published picks visible",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].publicPicks),
  },
  {
    name: "PERFORMANCE_STATS_ENABLED",
    owner: "trust",
    protects: "/performance stats render",
    fallback: "Redirect to /methodology",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses public win-rate / brier surface",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].performanceStats),
  },
  {
    name: "PROMOTIONS_ENABLED",
    owner: "product",
    protects: "Promo CTA copy on public surfaces",
    fallback: "Standard non-promo copy",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "No promo banners or limited-time CTAs",
    premiumImpact: "None",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].promotions),
  },
  {
    name: "STRIPE_CHECKOUT_ENABLED",
    owner: "payments",
    protects: "Stripe Checkout session creation",
    fallback: "Disabled button + 'payments paused' banner",
    envOnly: true,
    requiresRedeploy: false,
    publicImpact: "No new subscriptions can be started",
    premiumImpact: "Existing subscribers retain access",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].payments),
  },
  {
    name: "MODEL_PULSE_ENABLED",
    owner: "trust",
    protects: "/model-pulse public visibility (requires live slate data)",
    fallback: "Page renders honest 'pulse offline' empty state",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Hides model metabolism visualization",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => s === "release-candidate" || s === "production"),
  },
  {
    name: "COMMAND_PALETTE_ENABLED",
    owner: "product",
    protects: "Press-/ command palette across the site",
    fallback: "Component renders null; navigation still works via standard links",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses keyboard fuzzy search",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor(() => true),
  },
  {
    name: "SLATE_CANVAS_ENABLED",
    owner: "product",
    protects: "/canvas spatial slate visualization",
    fallback: "Page redirects to /today",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses spatial view option",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => s === "release-candidate" || s === "production"),
  },
  {
    name: "AMBIENT_SOUND_ENABLED",
    owner: "product",
    protects: "Ambient sound design (mute-by-default)",
    fallback: "All sound playback disabled",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Loses optional ambient tones",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor(() => false),
  },
  {
    name: "DECISION_STREAM_ENABLED",
    owner: "trust",
    protects: "/stream public decision timeline visibility",
    fallback: "Page renders honest empty state",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Hides the append-only decision timeline",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => s === "release-candidate" || s === "production"),
  },
  {
    name: "CANONICAL_LEDGER_ENABLED",
    owner: "trust",
    protects: "/ledger/canonical public visibility (requires settled history)",
    fallback: "Page renders honest accumulation banner; no fake settled rows",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "Hides the canonical ledger preview from public surfaces",
    premiumImpact: "Same",
    cockpitImpact: "None",
    defaults: defaultsFor((s) => s === "release-candidate" || s === "production"),
  },
  {
    name: "STUDIO_ENABLED",
    owner: "product",
    protects: "Studio cockpit surface",
    fallback: "Admin-only fallback page",
    envOnly: false,
    requiresRedeploy: false,
    publicImpact: "None (not public)",
    premiumImpact: "None",
    cockpitImpact: "Operator loses studio entry",
    defaults: defaultsFor((s) => RELEASE_STATE_CAPABILITIES[s].studio),
  },
];

const FLAG_MAP: ReadonlyMap<FeatureFlagName, FeatureFlag> = new Map(
  FEATURE_FLAGS.map((f) => [f.name, f]),
);

export function getFeatureFlag(name: FeatureFlagName): FeatureFlag {
  const flag = FLAG_MAP.get(name);
  if (!flag) throw new Error(`Unknown feature flag: ${name}`);
  return flag;
}

/**
 * Read the runtime value of a feature flag.
 *
 * Resolution order:
 *  1. Explicit env override (`<NAME>` set to "true" or "false")
 *  2. Default for the current release state
 */
export function isFeatureEnabled(name: FeatureFlagName): boolean {
  const flag = getFeatureFlag(name);
  const envValue = process.env[name];
  if (envValue === "true") return true;
  if (envValue === "false") return false;
  return flag.defaults[getActiveReleaseState()];
}
