/**
 * @file literature-pillars.ts
 * Pillar taxonomy for the GSE literature index.
 *
 * A pillar is a coarse reasoning axis. It exists so retrieval can be scoped
 * ("only the market-structure premises for this event") and so coverage can
 * be measured across the reasoning surface rather than across a flat list of
 * 5,148 records.
 *
 * The pillars are derived from the corpus's own vocabulary (the `domain` field
 * of the MIND corpus, the `applicable_contexts` list, and the metric name),
 * NOT from a hand-written mapping of every premise. A hand-written mapping
 * would be 5,148 rows that drift the moment the corpus changes; the derived
 * mapping is a pure function of the premise and therefore stays true.
 *
 * The nine pillars are the ones the Reasoning Engine already reasons in:
 * market microstructure, physical/environmental, tactical/schematic,
 * situational, personnel/availability, efficiency/usage, narrative/context,
 * injury/availability, and cognition/decision.
 */

/** The canonical pillar set. Order is stable for reporting. */
export const LITERATURE_PILLARS = [
  "market_microstructure",
  "physical_environment",
  "tactical_schematic",
  "situational",
  "personnel_availability",
  "efficiency_usage",
  "narrative_context",
  "injury_availability",
  "cognition_decision",
] as const;

export type LiteraturePillar = (typeof LITERATURE_PILLARS)[number];

/** Keyword -> pillar. First match wins, so order here is deliberate. */
const PILLAR_KEYWORDS: ReadonlyArray<readonly [LiteraturePillar, readonly string[]]> = [
  ["injury_availability", ["injur", "availability", "return from", "concussion", "acl", "surgery", "rested", "rest_days", "load", "workload", "acwr", "fatigue", "absence"]],
  ["market_microstructure", ["market", "odds", "spread", "line_movement", "steam", "public", "ticket", "handle", "vig", "devig", "price", "book", "shading", "darling", "microstructure", "liquidity", "sharp"]],
  ["physical_environment", ["weather", "wind", "temperature", "precip", "altitude", "humidity", "surface", "turf", "dome", "indoor", "aerodynamic", "ball", "trajectory", "physics", "kinematic"]],
  ["personnel_availability", ["personnel", "lineup", "starter", "roster", "formation", "personnel_group", "depth_chart", "position", "substitution", "opt", "quarterback", "receiver", "offensive_line", "defensive_line"]],
  ["tactical_schematic", ["play_action", "motion", "screen", "rpo", "blitz", "coverage", "shell", "scheme", "concept", "play.call", "tendency", "fourth_down", "play.calling", "tempo", "pace", "personnel_grouping", "redzone", "third.down", "fourth.down"]],
  ["efficiency_usage", ["epa", "efficiency", "success_rate", "usage", "target_share", "snap", "air_yards", "yac", "cpoe", "separation", "velocity", "expected_points", "dvoa", "net_epa", "tpr", "explosiveness"]],
  ["narrative_context", ["narrative", "story", "media", "press", "sentiment", "coach", "headline", "lockout", "contract", "incentive", "motivat", "confidence", "morale", "controvers", "breakout", "rookie", "veteran", "age", "experience"]],
  ["situational", ["rest", "bye", "circadian", "travel", "short_week", "primetime", "divis", "weather_adj", "altitude_adj", "playoff", "standings", "clinch", "eliminat", "hunger", "trap", "sandbag", "reversal", "streak", "momentum", "hot", "cold", "regression"]],
  ["cognition_decision", ["cognitiv", "bias", "heuristic", "decision", "judgment", "anchoring", "overconfiden", "framing", "prospect", "kahneman", "tversky", "intuition", "memory", "attention", "perception", "mental", "emotion"]],
];

/**
 * Derive the pillar set for a premise.
 *
 * Pure function of the premise's own text. A premise that matches nothing
 * gets no pillar (it is still retrievable by vector similarity; the pillar
 * list is a scoping filter, not a gate).
 */
export function derivePillars(p: {
  readonly domain?: string | null;
  readonly applicableContexts?: readonly string[] | null;
  readonly numericMetric?: string | null;
  readonly principle?: string | null;
  readonly title?: string | null;
}): LiteraturePillar[] {
  const haystack = [
    p.domain ?? "",
    (p.applicableContexts ?? []).join(" "),
    p.numericMetric ?? "",
    p.principle ?? "",
    p.title ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const found: LiteraturePillar[] = [];
  for (const [pillar, keywords] of PILLAR_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) found.push(pillar);
  }
  return found;
}

/**
 * Map a live signal key to the pillars its retrieval should be scoped to.
 *
 * An event should only surface premises that reason about the same axis. A
 * `vision.*` signal should not pull in market-structure premises; a market
 * line move should not pull in weather premises.
 *
 * Returns null for an unrecognized signal, which the caller reads as
 * "do not scope the retrieval" (search the whole index).
 */
export function pillarsForSignal(signalKey: string): LiteraturePillar[] | null {
  const key = signalKey.toLowerCase();
  const out: LiteraturePillar[] = [];

  if (key.startsWith("vision.") || key.startsWith("ngs.") || key.startsWith("tracking.")) {
    out.push("physical_environment", "efficiency_usage", "tactical_schematic");
  }
  if (key.startsWith("ftn.")) out.push("tactical_schematic", "efficiency_usage");
  if (key.startsWith("qbr.")) out.push("efficiency_usage", "tactical_schematic");
  if (key.startsWith("snaps.")) out.push("personnel_availability", "efficiency_usage");
  if (key.startsWith("cognitive.")) out.push("cognition_decision", "narrative_context");
  if (key.startsWith("weather.") || key.startsWith("env.")) out.push("physical_environment");
  if (key.startsWith("injury") || key.startsWith("injuries.") || key.startsWith("depth_chart")) {
    out.push("injury_availability", "personnel_availability");
  }
  if (key.startsWith("market.") || key.startsWith("odds.") || key.startsWith("line_")) {
    out.push("market_microstructure", "cognition_decision");
  }
  if (key.startsWith("coach") || key.startsWith("press") || key.startsWith("news.")) {
    out.push("narrative_context", "cognition_decision");
  }
  return out.length > 0 ? Array.from(new Set(out)) : null;
}
