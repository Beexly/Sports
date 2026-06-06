/**
 * Metric methodology — the glass box on how we read the numbers.
 *
 * For every signal the engine uses, we state four things plainly: what it is,
 * how WE read it, how it's commonly MISREAD, and how that makes us different.
 * The organizing idea: separate STABLE/PREDICTIVE inputs (opportunity, volume,
 * accuracy, quality-of-contact — these persist and forecast) from NOISY/
 * DESCRIPTIVE outputs (efficiency, results, TD rate — these regress). An
 * accurate projection leans on the former and treats the latter as a sample,
 * not a skill. This module is the single source of truth behind that doctrine.
 *
 * Pure data + selectors — fully testable, no I/O.
 */

/** How much weight a metric earns: an anchor persists + predicts; a signal is
 *  useful with context; noisy regresses and is read as a sample, not a skill. */
export type Stability = "anchor" | "signal" | "noisy";
export type MetricCategory = "passing" | "receiving" | "rushing" | "usage" | "availability" | "baseball";
export type MetricStatus = "live" | "queued";

export interface Metric {
  readonly key: string;
  readonly name: string;
  readonly abbr?: string;
  readonly category: MetricCategory;
  readonly stability: Stability;
  readonly status: MetricStatus;
  readonly whatItIs: string;
  readonly howWeRead: string;
  readonly commonMistake: string;
  readonly ourEdge: string;
  readonly formula?: string;
  readonly href?: string;
}

export const METRIC_METHODOLOGY: readonly Metric[] = [
  {
    key: "wopr", name: "Weighted Opportunity Rating", abbr: "WOPR", category: "receiving", stability: "anchor", status: "live",
    formula: "1.5 × target share + 0.7 × air-yards share",
    whatItIs: "A single number for how much of the passing game runs through a receiver — volume and depth combined.",
    howWeRead: "The leading indicator of receiver fantasy points. Opportunity is sticky week to week, so high WOPR forecasts production even before the box score catches up.",
    commonMistake: "Chasing last week's yards or touchdowns — outputs that bounce around — instead of the role that generates them.",
    ourEdge: "We rank by WOPR and flag receivers whose opportunity outruns their production as buy-lows before the market reprices them.",
    href: "/players/opportunity",
  },
  {
    key: "target-share", name: "Target Share", category: "receiving", stability: "anchor", status: "live",
    whatItIs: "The percentage of a team's targets that go to a player.",
    howWeRead: "The cleanest claim on volume. A rising target share is a role change — the most actionable waiver signal there is.",
    commonMistake: "Treating a one-week target spike as a trend instead of waiting for the role to stabilize.",
    ourEdge: "We weight share by recency and pair it with air-yards share (WOPR) so a checkdown machine and a field-stretcher aren't valued the same.",
    href: "/players/opportunity",
  },
  {
    key: "air-yards-share", name: "Air-Yards Share / aDOT", abbr: "AY%", category: "receiving", stability: "anchor", status: "live",
    whatItIs: "A player's share of the team's intended air yards; aDOT is the average depth of his targets.",
    howWeRead: "Depth = upside. Two receivers with equal targets but different air-yards share have very different ceilings and TD equity.",
    commonMistake: "Ignoring depth entirely and ranking on catches — which over-values low-aDOT possession roles.",
    ourEdge: "Air-yards share is half of our WOPR and the tiebreaker between a safe floor and a league-winning ceiling.",
    href: "/players/opportunity",
  },
  {
    key: "racr", name: "Receiver Air Conversion Ratio", abbr: "RACR", category: "receiving", stability: "noisy", status: "live",
    formula: "receiving yards ÷ air yards",
    whatItIs: "How many yards a receiver turns each intended air yard into (YAC + accuracy + luck).",
    howWeRead: "An efficiency descriptor, not a forecast. Extreme RACR regresses hard, so we read it as a sample of context, not a repeatable skill.",
    commonMistake: "Extrapolating a hot RACR as if it'll continue — it's the single biggest source of false breakouts.",
    ourEdge: "We use RACR to explain a result, never to project one; the opportunity metrics carry the forecast.",
    href: "/players/opportunity",
  },
  {
    key: "cpoe", name: "Completion % Over Expectation", abbr: "CPOE", category: "passing", stability: "anchor", status: "live",
    whatItIs: "How much more often a QB completes a pass than a tracking model expects, given depth, pressure, and coverage.",
    howWeRead: "The most stable public measure of QB accuracy — it's a skill that persists, so it's a real input to QB quality.",
    commonMistake: "Reading raw completion % (which rewards dink-and-dunk) as accuracy.",
    ourEdge: "We triangulate CPOE against results-based QBR and surface when they disagree, rather than trusting either alone.",
    href: "/players/qbr",
  },
  {
    key: "qbr", name: "ESPN Total QBR", abbr: "QBR", category: "passing", stability: "signal", status: "live",
    whatItIs: "A results/EPA-weighted 0–100 QB score, play-weighted across the season.",
    howWeRead: "A genuinely independent second opinion on the QB — but more outcome-driven (and thus noisier) than CPOE.",
    commonMistake: "Treating a single composite number as truth and ignoring what's driving it.",
    ourEdge: "We never average QBR with CPOE — we percentile both and read the GAP (results-over-accuracy vs the reverse) as the real signal.",
    href: "/players/qbr",
  },
  {
    key: "ryoe", name: "Rush Yards Over Expected / Att", abbr: "RYOE", category: "rushing", stability: "noisy", status: "live",
    whatItIs: "Yards a back gains per carry above what a tracking model expects from the blocking and box.",
    howWeRead: "The ceiling, not the floor. Per-carry efficiency is real talent but regresses fast, so we treat hot RYOE as regression-prone unless it's earned against loaded boxes.",
    commonMistake: "Drafting last year's efficiency leaders and expecting it to repeat — RB efficiency is one of the least sticky stats there is.",
    ourEdge: "We separate efficiency from volume and only trust RYOE that's earned vs stacked fronts; otherwise volume carries the projection.",
    href: "/players/opportunity",
  },
  {
    key: "rush-volume", name: "Rush Volume / Touches", category: "rushing", stability: "anchor", status: "live",
    whatItIs: "Carries (and total touches) a back actually gets.",
    howWeRead: "The RB floor. Volume is coach-driven and sticky — it's the single most predictive RB input, full stop.",
    commonMistake: "Falling for an efficient backup over a plodding bell-cow — points come from touches, not highlight runs.",
    ourEdge: "For RBs we lead with volume and treat efficiency as the swing factor, the inverse of how we read receivers.",
    href: "/players/opportunity",
  },
  {
    key: "stacked-box", name: "Stacked-Box Rate", abbr: "Box%", category: "rushing", stability: "signal", status: "live",
    whatItIs: "Share of a back's carries against eight or more defenders in the box.",
    howWeRead: "Context for efficiency. Positive yards over expected against loaded boxes is real; the same number on light boxes is schemed and fades.",
    commonMistake: "Reading raw yards per carry without the difficulty of the fronts that produced it.",
    ourEdge: "We grade efficiency through box difficulty, so we don't reward a back the defense simply wasn't respecting.",
    href: "/players/opportunity",
  },
  {
    key: "snap-share", name: "Snap Share", category: "usage", stability: "anchor", status: "live",
    whatItIs: "The percentage of offensive snaps a player is on the field.",
    howWeRead: "The role behind every other stat. Rising snap share precedes rising production — it's the earliest legitimate breakout signal.",
    commonMistake: "Reacting to fantasy points without checking whether the snaps that produced them are stable or a fluke.",
    ourEdge: "We use snap share as the gate on every opportunity read — no role, no projection bump.",
    href: "/players/snaps",
  },
  {
    key: "pressure", name: "Pressure Rate & Time to Throw", category: "passing", stability: "signal", status: "live",
    whatItIs: "How often a QB is pressured and how quickly he gets the ball out (PFR / Next Gen).",
    howWeRead: "Environment and process. Pressure suppresses QB and pass-catcher value; a fast release can mask a bad line.",
    commonMistake: "Blaming a QB for a line's failures (or crediting one for a clean pocket) without separating the two.",
    ourEdge: "We fold pressure into the QB read so accuracy and results are judged against the conditions that produced them.",
    href: "/players/trenches",
  },
  {
    key: "availability", name: "Official Availability + Conditions", category: "availability", stability: "signal", status: "live",
    whatItIs: "Public injury designations (Out/Doubtful/Questionable) and game-day weather/surface.",
    howWeRead: "A confidence-band modifier, never a body claim. It can only WIDEN uncertainty or move a read to watchlist / no-bet.",
    commonMistake: "Inventing health percentages or treating a Questionable tag as a coin flip rather than a band-widener.",
    ourEdge: "We say 'availability uncertain per public report' and widen the band — we never manufacture certainty about a body.",
    href: "/human",
  },
  {
    key: "barrel-rate", name: "Barrel % / Hard-Hit %", category: "baseball", stability: "anchor", status: "queued",
    whatItIs: "Quality of contact — the share of batted balls in the ideal exit-velocity/launch-angle window (barrels) and hit 95+ mph (hard-hit).",
    howWeRead: "The most predictive public power signal in baseball. Quality of contact stabilizes far faster than home runs or batting average and forecasts them.",
    commonMistake: "Chasing a hitter's home-run total or BABIP-inflated average — outputs that swing wildly on small samples.",
    ourEdge: "Quality-of-contact vs results, same as our football reads: barrel% up but production down = buy-low; production up on weak contact = sell-high. (Pending a verified, license-clear Statcast source.)",
  },
  {
    key: "k-rate", name: "Strikeout & Whiff Rate", abbr: "K%", category: "baseball", stability: "anchor", status: "queued",
    whatItIs: "How often a hitter strikes out (or a pitcher misses bats).",
    howWeRead: "One of the fastest-stabilizing stats in the sport — a near-skill that's usable on tiny samples for both hitters and pitchers.",
    commonMistake: "Waiting for ERA or batting average to 'come around' when the underlying K profile already told the story.",
    ourEdge: "We lean on the fast-stabilizing skills (K%, whiff, xwOBA) over slow, luck-soaked outcomes. (Pending a verified, license-clear Statcast source.)",
  },
];

const STABILITY_ORDER: readonly Stability[] = ["anchor", "signal", "noisy"];
const CATEGORY_ORDER: readonly MetricCategory[] = ["receiving", "rushing", "passing", "usage", "availability", "baseball"];

export const STABILITY_LABEL: Record<Stability, string> = {
  anchor: "Anchor — stable & predictive",
  signal: "Signal — useful with context",
  noisy: "Noisy — regresses; read as a sample",
};

export const CATEGORY_LABEL: Record<MetricCategory, string> = {
  receiving: "Receiving",
  rushing: "Rushing",
  passing: "Passing",
  usage: "Usage",
  availability: "Availability",
  baseball: "Baseball",
};

/** Metrics grouped by category, in display order, dropping empty groups. */
export function metricsByCategory(metrics: readonly Metric[] = METRIC_METHODOLOGY): { category: MetricCategory; label: string; items: Metric[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    items: metrics.filter((m) => m.category === category),
  })).filter((g) => g.items.length > 0);
}

/** Counts for a readiness line. */
export function methodologySummary(metrics: readonly Metric[] = METRIC_METHODOLOGY): { total: number; live: number; queued: number; anchors: number } {
  return {
    total: metrics.length,
    live: metrics.filter((m) => m.status === "live").length,
    queued: metrics.filter((m) => m.status === "queued").length,
    anchors: metrics.filter((m) => m.stability === "anchor").length,
  };
}

export function stabilityRank(s: Stability): number {
  return STABILITY_ORDER.indexOf(s);
}
