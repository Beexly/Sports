import type { ReactNode } from "react";

// Loaders — reused UNCHANGED from each former board page. The registry stays on
// the SERVER: it owns the loaders, the engine list, and serializable metadata
// (slug / group / label / title / description / api / sourceIds).
// The per-engine RENDER (DataTables + KpiCards whose columns carry render() /
// sortValue() FUNCTIONS, plus the special proof / player-model / waiver / clv
// layouts) lives in the 'use client' EngineView — functions cannot cross the
// server→client RSC boundary, so they must not live in anything the server page
// hands to a client component.
import { loadPlayerModel } from "@/lib/intelligence/player-model";
import { loadExpectedPoints } from "@/lib/intelligence/expected-points";
import { loadQbForward } from "@/lib/intelligence/qb-forward";
import { loadRushingContact } from "@/lib/intelligence/rushing-contact";
import { loadNflversePressureCoverage } from "@/lib/nflverse/pressure-coverage";
import { loadPlayDesign } from "@/lib/intelligence/play-design";
import { loadRouteRate } from "@/lib/intelligence/route-rate";
import { loadScoringZone } from "@/lib/intelligence/scoring-zone";
import { loadTeamEnvironment } from "@/lib/intelligence/team-environment";
import { loadOpportunityTransfer } from "@/lib/intelligence/opportunity-transfer";
import { loadClvBacktest } from "@/lib/intelligence/clv-calibration";
import { loadPredictiveness } from "@/lib/intelligence/predictiveness";
import { loadSleeperTrending } from "@/lib/integrations/sleeper";

/**
 * Intelligence Engine Registry — the single backbone for the /intelligence/engines
 * browser. Each entry owns: discoverability metadata (group/label/title/description),
 * and the loader (reused verbatim from the old standalone board). The loaders run
 * on the server; the server page awaits the active engine's loader and hands the
 * plain (serializable) data to the client <EngineView>, which paints it on the
 * unified dark data surface with the shared kit (DataTable / KpiCard / SourceError
 * + lib/intelligence/colors).
 *
 * Each `description` is ONE result-framed sentence — what you GET out of the
 * engine, never how it is computed. We show the score and the proof; we hold the
 * recipe.
 *
 * A few engines carry special shapes that the client view preserves rather than
 * crush into one table:
 *   - proof           → 3 KPI cards + up to 3 stacked backtest tables
 *   - player-model    → buy/sell move cards + per-position split tables
 *   - waiver-trends   → two side-by-side momentum tables (adds / drops)
 *   - clv             → game-by-game self-grade table with a graded-count header
 *
 * `description` is ReactNode/JSX — JSX ELEMENTS serialize across the RSC boundary
 * fine; only FUNCTIONS do not. So it stays here and is rendered by the server-safe
 * PageHero on the page.
 */

// ── Engine entry type ────────────────────────────────────────────────────────

export type EngineGroup =
  | "Cross-position core"
  | "Quarterback"
  | "Running back"
  | "Receiver"
  | "Team & market"
  | "Proof & calibration";

export interface EngineEntry {
  readonly slug: string;
  readonly group: EngineGroup;
  /** Short tab label. */
  readonly label: string;
  /** Page eyebrow / hero title. */
  readonly title: string;
  /** Hero description. */
  readonly description: ReactNode;
  /** API endpoint (JSON export link). */
  readonly api: string;
  /** Data source ids for attribution. */
  readonly sourceIds: readonly string[];
  /**
   * Load the engine data (reused loader, unchanged). Returns a SERIALIZABLE
   * payload (plain row objects + meta) — the server page hands it straight to
   * the client EngineView keyed on `slug`.
   */
  readonly load: () => Promise<unknown>;
}

/** Build one registry entry. */
function engine<T>(spec: {
  slug: string;
  group: EngineGroup;
  label: string;
  title: string;
  description: ReactNode;
  api: string;
  sourceIds: readonly string[];
  load: () => Promise<T>;
}): EngineEntry {
  return {
    slug: spec.slug,
    group: spec.group,
    label: spec.label,
    title: spec.title,
    description: spec.description,
    api: spec.api,
    sourceIds: spec.sourceIds,
    load: spec.load as () => Promise<unknown>,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER MODEL — buy/sell move cards + per-position split tables (special)
// ─────────────────────────────────────────────────────────────────────────────

const PLAYER_MODEL_ENGINE = engine({
  slug: "player-model",
  group: "Cross-position core",
  label: "Player Intelligence",
  title: "The grade behind every player.",
  description: (
    <>One GSE Rating per player, plus who to buy before the points arrive and who to sell before they fade.</>
  ),
  api: "/api/intelligence/player-model",
  sourceIds: ["nflverse"],
  load: loadPlayerModel,
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED POINTS (xFP)
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_POINTS_ENGINE = engine({
  slug: "expected-points",
  group: "Cross-position core",
  label: "Expected Points (xFP)",
  title: "Expected Fantasy Points",
  description: (
    <>The points a player&apos;s usage should be producing, so you can see who is due and who got lucky.</>
  ),
  api: "/api/intelligence/expected-points",
  sourceIds: ["nflverse"],
  load: loadExpectedPoints,
});

// ─────────────────────────────────────────────────────────────────────────────
// QB FORWARD PRIOR
// ─────────────────────────────────────────────────────────────────────────────

const QB_FORWARD_ENGINE = engine({
  slug: "qb-forward",
  group: "Quarterback",
  label: "QB Forward Prior",
  title: "QB Forward Prior",
  description: <>Which quarterbacks are set up to keep producing, and which are about to come back to earth.</>,
  api: "/api/intelligence/qb-forward",
  sourceIds: ["nflverse"],
  load: loadQbForward,
});

// ─────────────────────────────────────────────────────────────────────────────
// RUSHING CONTACT
// ─────────────────────────────────────────────────────────────────────────────

const RUSHING_CONTACT_ENGINE = engine({
  slug: "rushing-contact",
  group: "Running back",
  label: "Rushing Contact",
  title: "Rushing Contact",
  description: <>Which backs are creating their own yards and which ones are being carried by their line.</>,
  api: "/api/intelligence/rushing-contact",
  sourceIds: ["nflverse"],
  load: loadRushingContact,
});

// ─────────────────────────────────────────────────────────────────────────────
// TRENCHES — PFR advanced charting (pressure / coverage / receiver depth)
// ─────────────────────────────────────────────────────────────────────────────

const TRENCHES_ENGINE = engine({
  slug: "trenches",
  group: "Team & market",
  label: "Trenches (Pressure & Coverage)",
  title: "Trenches",
  description: <>Which quarterbacks are under fire, which defenders lock down, and which receivers are worth targeting.</>,
  api: "/api/nflverse/pressure-coverage",
  sourceIds: ["nflverse"],
  load: loadNflversePressureCoverage,
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAY DESIGN — FTN charting (2022+) joined to pbp for QB / team identity
// ─────────────────────────────────────────────────────────────────────────────

const PLAY_DESIGN_ENGINE = engine({
  slug: "play-design",
  group: "Quarterback",
  label: "Play Design (FTN)",
  title: "Play Design",
  description: <>The play-calling fingerprint of every quarterback and offense, so you know what is real and what is scheme.</>,
  api: "/api/intelligence/play-design",
  sourceIds: ["nflverse"],
  load: loadPlayDesign,
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE RATE (TPRR)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_RATE_ENGINE = engine({
  slug: "route-rate",
  group: "Receiver",
  label: "Route Rate (TPRR)",
  title: "Route Rate",
  description: <>Which receivers are earning targets every time they run a route, and which are just along for the ride.</>,
  api: "/api/intelligence/route-rate",
  sourceIds: ["nflverse"],
  load: loadRouteRate,
});

// ─────────────────────────────────────────────────────────────────────────────
// SCORING-ZONE EQUITY
// ─────────────────────────────────────────────────────────────────────────────

const SCORING_ZONE_ENGINE = engine({
  slug: "scoring-zone",
  group: "Running back",
  label: "Scoring-Zone Equity",
  title: "Scoring-Zone Equity",
  description: <>Who owns the touchdown chances near the goal line, so you can buy the scores before they show up.</>,
  api: "/api/intelligence/scoring-zone",
  sourceIds: ["nflverse"],
  load: loadScoringZone,
});

// ─────────────────────────────────────────────────────────────────────────────
// TEAM ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_ENVIRONMENT_ENGINE = engine({
  slug: "team",
  group: "Team & market",
  label: "Team Environment",
  title: "Team Environment",
  description: <>Which offenses lift everyone in them and which ones drag their players down.</>,
  api: "/api/intelligence/team-environment",
  sourceIds: ["nflverse"],
  load: loadTeamEnvironment,
});

// ─────────────────────────────────────────────────────────────────────────────
// OPPORTUNITY TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

const OPPORTUNITY_TRANSFER_ENGINE = engine({
  slug: "opportunity-transfer",
  group: "Team & market",
  label: "Opportunity Transfer",
  title: "Opportunity Transfer",
  description: <>When a player goes down, who picks up the touches, before the box score makes it obvious.</>,
  api: "/api/intelligence/opportunity-transfer",
  sourceIds: ["nflverse"],
  load: loadOpportunityTransfer,
});

// ─────────────────────────────────────────────────────────────────────────────
// CLV CALIBRATION — game-by-game self-grade (special header: games graded)
// ─────────────────────────────────────────────────────────────────────────────

const CLV_ENGINE = engine({
  slug: "clv",
  group: "Team & market",
  label: "CLV Calibration",
  title: "CLV Calibration",
  description: <>How often the model beats the closing line, graded against past games. It grades itself; it never places a bet.</>,
  api: "/api/intelligence/clv-calibration",
  sourceIds: ["nflverse"],
  load: loadClvBacktest,
});

// ─────────────────────────────────────────────────────────────────────────────
// WAIVER TRENDS (SLEEPER) — two side-by-side momentum tables (special)
// ─────────────────────────────────────────────────────────────────────────────

const WAIVER_TRENDS_ENGINE = engine({
  slug: "waiver-trends",
  group: "Team & market",
  label: "Waiver Trends",
  title: "Waiver Trends",
  description: <>Who the rest of the fantasy world is adding and dropping right now. What the market is doing, not advice.</>,
  api: "/api/intelligence/sleeper-trending",
  sourceIds: ["sleeper"],
  load: loadSleeperTrending,
});

// ─────────────────────────────────────────────────────────────────────────────
// PROOF / PREDICTIVENESS — 3 KPI cards + up to 3 stacked backtest tables (special)
// ─────────────────────────────────────────────────────────────────────────────

const PROOF_ENGINE = engine({
  slug: "proof",
  group: "Proof & calibration",
  label: "Does It Predict?",
  title: "Does the grade actually predict?",
  description: <>Anyone can publish a rating. Here is ours, backtested against real results, so you can see it holds up.</>,
  api: "/api/intelligence/predictiveness",
  sourceIds: ["nflverse"],
  load: loadPredictiveness,
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const ENGINES: readonly EngineEntry[] = [
  PLAYER_MODEL_ENGINE,
  EXPECTED_POINTS_ENGINE,
  QB_FORWARD_ENGINE,
  PLAY_DESIGN_ENGINE,
  RUSHING_CONTACT_ENGINE,
  ROUTE_RATE_ENGINE,
  SCORING_ZONE_ENGINE,
  TEAM_ENVIRONMENT_ENGINE,
  TRENCHES_ENGINE,
  OPPORTUNITY_TRANSFER_ENGINE,
  CLV_ENGINE,
  WAIVER_TRENDS_ENGINE,
  PROOF_ENGINE,
];

export const ENGINE_GROUP_ORDER: readonly EngineGroup[] = [
  "Cross-position core",
  "Quarterback",
  "Running back",
  "Receiver",
  "Team & market",
  "Proof & calibration",
];

export const DEFAULT_ENGINE = "proof";

export function getEngine(slug: string | undefined): EngineEntry {
  const match = ENGINES.find((e) => e.slug === slug);
  if (match) return match;
  const fallback = ENGINES.find((e) => e.slug === DEFAULT_ENGINE);
  if (fallback) return fallback;
  // ENGINES is a non-empty literal; the first entry is always present.
  return PLAYER_MODEL_ENGINE;
}

/** Engines grouped, in canonical group order, for the directory rail / tab list. */
export function groupedEngines(): ReadonlyArray<{ group: EngineGroup; engines: readonly EngineEntry[] }> {
  return ENGINE_GROUP_ORDER.map((group) => ({
    group,
    engines: ENGINES.filter((e) => e.group === group),
  })).filter((g) => g.engines.length > 0);
}
