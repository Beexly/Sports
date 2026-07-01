import type { ReactNode } from "react";
import { type MetricTerm } from "@/components/ui/metric-explainer";

// Loaders — reused UNCHANGED from each former board page. The registry stays on
// the SERVER: it owns the loaders, the engine list, and serializable metadata
// (slug / group / label / title / description / explainer / api / sourceIds).
// The per-engine RENDER (DataTables + KpiCards whose columns carry render() /
// sortValue() FUNCTIONS, plus the special proof / player-model / waiver / clv
// layouts) lives in the 'use client' EngineView — functions cannot cross the
// server→client RSC boundary, so they must not live in anything the server page
// hands to a client component.
import { loadPlayerModel } from "@/lib/intelligence/player-model";
import { loadExpectedPoints } from "@/lib/intelligence/expected-points";
import { loadQbForward } from "@/lib/intelligence/qb-forward";
import { loadRushingContact } from "@/lib/intelligence/rushing-contact";
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
 * the loader (reused verbatim from the old standalone board), and serializable
 * "how we read it" explainer terms. The loaders run on the server; the server
 * page awaits the active engine's loader and hands the plain (serializable) data
 * to the client <EngineView>, which paints it on the LIGHT paper data surface
 * with the shared kit (DataTable / KpiCard / MetricExplainer / SourceError +
 * lib/intelligence/colors).
 *
 * A few engines carry special shapes that the client view preserves rather than
 * crush into one table:
 *   - proof           → 3 KPI cards + up to 3 stacked backtest tables
 *   - player-model    → buy/sell move cards + per-position split tables
 *   - waiver-trends   → two side-by-side momentum tables (adds / drops)
 *   - clv             → game-by-game self-grade table with a graded-count header
 *
 * `description` and `explainer` are ReactNode/JSX — JSX ELEMENTS serialize across
 * the RSC boundary fine; only FUNCTIONS do not. So they stay here and are rendered
 * by server-safe components (PageHero / MetricExplainer) on the page.
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
  /** Per-engine "How we read it" term/definition pairs (rendered via MetricExplainer). */
  readonly explainer?: readonly MetricTerm[];
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
  explainer?: readonly MetricTerm[];
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
    explainer: spec.explainer,
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
  title: "The process grade behind every player.",
  description: (
    <>
      One canonical profile per player, mined from the full nflverse advanced field set — EPA efficiency, opportunity
      (WOPR, target share), and volume — combined into a position-aware <em>process grade</em>. We compare it to actual
      production and surface the gap: where the inputs say more is coming (<span className="text-emerald-700 font-semibold">buy-low</span>)
      or running hot (<span className="text-rose-700 font-semibold">sell-high</span>). The data layer that drives the tools. Not a pick.
    </>
  ),
  api: "/api/intelligence/player-model",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "Process grade — the composite",
      definition: (
        <>
          The within-position percentile of each predictive anchor, averaged. QBs are graded on EPA/play + DAKOTA +
          PACR; receivers on WOPR + target share + EPA; backs on volume + EPA. Anchors persist and forecast;
          production is the noisy output. The gap is the edge.
        </>
      ),
    },
    {
      term: "Buy-low — inputs say more is coming",
      definition: (
        <>
          When the <span className="text-emerald-700 font-semibold">process</span> grade sits well above the actual
          production percentile, the opportunity says the points are coming. Buy-low before it corrects.
        </>
      ),
    },
    {
      term: "Sell-high — running hot",
      definition: (
        <>
          When <span className="text-rose-700 font-semibold">production</span> outruns the process grade, the player
          is converting above his usage. Sell-high before it regresses. In-line means the points are earned by the
          opportunity. Not a pick.
        </>
      ),
    },
  ],
  load: loadPlayerModel,
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED POINTS (xFP)
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_POINTS_ENGINE = engine({
  slug: "expected-points",
  group: "Cross-position core",
  label: "Expected Points (xFP)",
  title: "Expected Fantasy Points — the opportunity backbone",
  description: (
    <>
      What a player&apos;s real usage <em>should</em> have produced — expected points from the carries, targets, air
      yards, and field position he actually saw, independent of whether the ball bounced his way.
    </>
  ),
  api: "/api/intelligence/expected-points",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "xFP — expected, not actual",
      definition:
        "ffverse's ff_opportunity models the fantasy points a usage profile should yield. Expected points persist far better than actual points, which swing on touchdown luck.",
    },
    {
      term: "Buy-low — expected outruns actual",
      definition: (
        <>
          When the <span className="text-emerald-700 font-semibold">expected</span> percentile sits well above the
          actual percentile, the usage says the production is coming. Buy-low before it corrects.
        </>
      ),
    },
    {
      term: "Sell-high — actual outruns expected",
      definition: (
        <>
          When <span className="text-rose-700 font-semibold">actual</span> outruns expected, the player is running hot
          on conversion luck. Sell-high before it regresses. In-line means the points are earned by the opportunity.
        </>
      ),
    },
  ],
  load: loadExpectedPoints,
});

// ─────────────────────────────────────────────────────────────────────────────
// QB FORWARD PRIOR
// ─────────────────────────────────────────────────────────────────────────────

const QB_FORWARD_ENGINE = engine({
  slug: "qb-forward",
  group: "Quarterback",
  label: "QB Forward Prior",
  title: "QB Forward Prior — DAKOTA & ANY/A",
  description: (
    <>
      The most forward-looking QB reads: DAKOTA (EPA+CPOE composite) and Adjusted Net Yards per Attempt, with the
      agreement between them surfaced — not averaged away.
    </>
  ),
  api: "/api/intelligence/qb-forward",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "DAKOTA — EPA + CPOE composite",
      definition:
        "nflverse's adjusted EPA + accuracy composite, tuned to predict next-year adjusted EPA/play. The closest public “forward” QB number.",
    },
    {
      term: "ANY/A — adjusted net yards per attempt",
      definition:
        "The classic efficiency yardstick, built transparently from raw box columns. A genuinely different forward lens than the composite.",
    },
    {
      term: "The edge — agreement, not an average",
      definition: (
        <>
          When both priors land in the same tier we read a <span className="text-orbital-cyan">clean</span>{" "}
          forward signal; when they diverge it&apos;s a second look. We surface the disagreement, we don&apos;t average
          it away.
        </>
      ),
    },
  ],
  load: loadQbForward,
});

// ─────────────────────────────────────────────────────────────────────────────
// RUSHING CONTACT
// ─────────────────────────────────────────────────────────────────────────────

const RUSHING_CONTACT_ENGINE = engine({
  slug: "rushing-contact",
  group: "Running back",
  label: "Rushing Contact",
  title: "Rushing Contact — YAC vs YBC per carry",
  description: (
    <>
      PFR advanced charting splits each carry into yards <em>after</em> contact — the back&apos;s own elusiveness and
      power — and yards <em>before</em> contact, the line and scheme term. An independent estimator to triangulate
      against Next Gen RYOE.
    </>
  ),
  api: "/api/intelligence/rushing-contact",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "YAC/att — the back's own talent",
      definition: (
        <>
          Yards after contact per carry isolates elusiveness and power. It&apos;s blocking-independent, so a{" "}
          <span className="text-orbital-cyan">high</span> figure is the back doing the work himself.
        </>
      ),
    },
    {
      term: "YBC/att — the line and scheme",
      definition:
        "Yards before contact per carry is the room the offensive line and design hand him. High YBC with modest YAC reads as a line-aided profile.",
    },
    {
      term: "The divergence — who's driving the yards",
      definition: (
        <>
          Elite <span className="text-orbital-cyan">YAC</span> behind thin YBC is a back winning on his own —
          a second, independent estimator to triangulate against Next Gen RYOE. We surface the split, we don&apos;t
          average it away.
        </>
      ),
    },
  ],
  load: loadRushingContact,
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE RATE (TPRR)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_RATE_ENGINE = engine({
  slug: "route-rate",
  group: "Receiver",
  label: "Route Rate (TPRR)",
  title: "Route Rate — targets per route run (proxy)",
  description: (
    <>
      A snaps&times;dropbacks proxy for targets per route run — high TPRR on low routes is the breakout signal; empty
      volume is the fade. Labelled a proxy (true routes are PFF-gated).
    </>
  ),
  api: "/api/intelligence/route-rate",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "TPRR — targets per route run (proxy)",
      definition:
        "A snaps × dropbacks proxy for how often a receiver is targeted on the routes he runs. Labelled a proxy — true routes are PFF-gated.",
    },
    {
      term: "Breakout — high TPRR on low routes",
      definition: (
        <>
          A <span className="text-orbital-cyan">high</span> target rate on a small route sample is the
          breakout signal: efficient when used, with room for the volume to follow.
        </>
      ),
    },
    {
      term: "Fade — empty volume",
      definition:
        "Plenty of routes but a thin target rate is the fade — on the field without earning looks. Steady sits in between.",
    },
  ],
  load: loadRouteRate,
});

// ─────────────────────────────────────────────────────────────────────────────
// SCORING-ZONE EQUITY
// ─────────────────────────────────────────────────────────────────────────────

const SCORING_ZONE_ENGINE = engine({
  slug: "scoring-zone",
  group: "Running back",
  label: "Scoring-Zone Equity",
  title: "Scoring-Zone Equity — TD equity from opportunity",
  description: (
    <>
      Red-zone and goal-line opportunity share, with the TD rate regressed toward the positional mean — TD equity from
      sticky opportunity, not noisy past touchdowns.
    </>
  ),
  api: "/api/intelligence/scoring-zone",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "RZ share — sticky opportunity",
      definition:
        "The player's share of his team's red-zone and goal-line carries and targets. Scoring-zone opportunity is sticky and predictive; past touchdowns are noisy.",
    },
    {
      term: "xTD rate — regressed to the mean",
      definition:
        "TD rate per scoring-zone opportunity, regressed toward the positional mean — TD equity from the looks he owns, not the touchdowns that already bounced his way.",
    },
    {
      term: "Buy / Sell — equity vs results",
      definition: (
        <>
          Heavy <span className="text-emerald-700 font-semibold">scoring-zone share</span> with light actual TDs is a
          buy; a hot TD rate above the opportunity is a{" "}
          <span className="text-rose-700 font-semibold">sell</span>. In-line means the scores match the looks.
        </>
      ),
    },
  ],
  load: loadScoringZone,
});

// ─────────────────────────────────────────────────────────────────────────────
// TEAM ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_ENVIRONMENT_ENGINE = engine({
  slug: "team",
  group: "Team & market",
  label: "Team Environment",
  title: "Team Environment — EPA, PROE & pace",
  description: (
    <>
      Neutral-script offensive and defensive EPA per play, success rate, PROE (pass rate over expected), and pace — the
      top-down team prior every player share sits in front of.
    </>
  ),
  api: "/api/intelligence/team-environment",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "EPA/play — neutral-script efficiency",
      definition:
        "Offensive and defensive expected points added per play, taken on early downs in neutral game scripts to strip out garbage time and score effects. The cleanest top-down efficiency read.",
    },
    {
      term: "PROE — pass rate over expected",
      definition:
        "How much more (or less) a team passes than the down-distance-score situation expects. Positive PROE is a pass-leaning environment that lifts receivers and the passing game.",
    },
    {
      term: "Pace — the volume multiplier",
      definition:
        "No-huddle rate as a pace proxy. A fast, pass-leaning, efficient offense is the environment every player share sits in front of — buy the offense it points to.",
    },
  ],
  load: loadTeamEnvironment,
});

// ─────────────────────────────────────────────────────────────────────────────
// OPPORTUNITY TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

const OPPORTUNITY_TRANSFER_ENGINE = engine({
  slug: "opportunity-transfer",
  group: "Team & market",
  label: "Opportunity Transfer",
  title: "Opportunity Transfer — who inherits the vacated role",
  description: (
    <>
      When a player is OUT, we quantify the targets and carries his role vacates and rank the most likely beneficiary —
      the waiver predictive core.
    </>
  ),
  api: "/api/intelligence/opportunity-transfer",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "Vacated touches — what the role leaves behind",
      definition:
        "When a player is OUT, his trailing per-game targets and carries become available volume. We quantify exactly how much opportunity the role vacates.",
    },
    {
      term: "Beneficiary — who inherits it",
      definition:
        "From the depth chart and trailing usage, the player most likely to absorb the vacated touches — the waiver predictive core, before the box score confirms it.",
    },
    {
      term: "Confidence — how clean the read is",
      definition: (
        <>
          <span className="text-emerald-700 font-semibold">High</span> when the depth chart and usage agree on one
          beneficiary; <span className="text-rose-700 font-semibold">low</span> when the touches scatter across a
          committee.
        </>
      ),
    },
  ],
  load: loadOpportunityTransfer,
});

// ─────────────────────────────────────────────────────────────────────────────
// CLV CALIBRATION — game-by-game self-grade (special header: games graded)
// ─────────────────────────────────────────────────────────────────────────────

const CLV_ENGINE = engine({
  slug: "clv",
  group: "Team & market",
  label: "CLV Calibration",
  title: "CLV Calibration — proving the method",
  description: (
    <>
      An <strong>illustrative baseline model</strong> backtested against nflverse closing lines — a demonstration of how
      closing-line value is computed and graded, not our pick engine&apos;s record (that stays gated until it can be
      honestly published). Self-grading, never a bet; forward odds stay gated.
    </>
  ),
  api: "/api/intelligence/clv-calibration",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "CLV — closing line value",
      definition:
        "The probability points the model's number beats the closing line on the side it took. Beating the close is the single best leading indicator of a sound process.",
    },
    {
      term: "Model vs Close",
      definition:
        "Model implied probability for the side, compared to the implied probability of the closing line. The gap between them is the CLV.",
    },
    {
      term: "Self-grading, never a bet",
      definition: (
        <>
          A backtest against nflverse schedules: did the model <span className="text-emerald-700 font-semibold">beat
          the close</span> or <span className="text-rose-700 font-semibold">trail</span> it? Forward odds stay gated —
          this grades the engine, it does not place a wager.
        </>
      ),
    },
  ],
  load: loadClvBacktest,
});

// ─────────────────────────────────────────────────────────────────────────────
// WAIVER TRENDS (SLEEPER) — two side-by-side momentum tables (special)
// ─────────────────────────────────────────────────────────────────────────────

const WAIVER_TRENDS_ENGINE = engine({
  slug: "waiver-trends",
  group: "Team & market",
  label: "Waiver Trends",
  title: "Waiver Trends — what the market is doing",
  description: (
    <>
      League-wide waiver MOMENTUM from the Sleeper API — how many fantasy leagues are adding and dropping each NFL player
      over the lookback window. Ownership velocity: <span className="font-semibold text-ion-white">what the market is doing, not advice.</span>
    </>
  ),
  api: "/api/intelligence/sleeper-trending",
  sourceIds: ["sleeper"],
  explainer: [
    {
      term: "Adds — ownership rising",
      definition: (
        <>
          The count of Sleeper leagues that <span className="text-emerald-700 font-semibold">added</span> the player
          over the window. Rising ownership velocity, not a buy call.
        </>
      ),
    },
    {
      term: "Drops — ownership falling",
      definition: (
        <>
          The count of leagues that <span className="text-rose-700 font-semibold">dropped</span> the player. Falling
          ownership velocity, not a sell call.
        </>
      ),
    },
    {
      term: "Descriptive, not advice",
      definition:
        "This is the crowd's behavior measured directly — market sentiment. We surface it; we don't turn it into a pick or a projection.",
    },
  ],
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
  description: (
    <>
      Anyone can publish a rating. We backtest ours. Build the process grade on the first half of the season, then
      measure how well it ranks <em>second-half</em> production — against the obvious baseline, past production predicting
      future production. If the grade adds lift, it carries forward signal.
    </>
  ),
  api: "/api/intelligence/predictiveness",
  sourceIds: ["nflverse"],
  explainer: [
    {
      term: "Grade ρ — does the grade rank the future?",
      definition:
        "Spearman rank correlation between the first-half process grade and second-half production, within position. Higher is better.",
    },
    {
      term: "Lift — does it beat the past?",
      definition: (
        <>
          Grade ρ minus baseline ρ (past production → future production).{" "}
          <span className="text-emerald-700 font-semibold">Positive</span> means the grade adds signal the box score
          didn&apos;t already have.
        </>
      ),
    },
    {
      term: "Call hit-rate — were buy/sell right?",
      definition: (
        <>
          Of first-half buy-lows, how many <span className="text-emerald-700 font-semibold">rose</span>; of
          sell-highs, how many <span className="text-rose-700 font-semibold">fell</span>. Read against the 50% coin
          flip.
        </>
      ),
    },
  ],
  load: loadPredictiveness,
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const ENGINES: readonly EngineEntry[] = [
  PLAYER_MODEL_ENGINE,
  EXPECTED_POINTS_ENGINE,
  QB_FORWARD_ENGINE,
  RUSHING_CONTACT_ENGINE,
  ROUTE_RATE_ENGINE,
  SCORING_ZONE_ENGINE,
  TEAM_ENVIRONMENT_ENGINE,
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
