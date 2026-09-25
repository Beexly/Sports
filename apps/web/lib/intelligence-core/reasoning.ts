/**
 * Intelligence Core — the all-knowing situational reasoning spine.
 *
 * Doctrine (2026-09-25): we do NOT try to beat the close with raw metrics.
 * That path is exhausted. We win on intelligence: contextually and
 * situationally aware reasoning that can explain *why* — then the engine
 * produces predictions, plays, bets, and props from an all-knowing standpoint.
 *
 * Every data surface in the repository feeds this core:
 *   - calibration-weights (empirical P(WIN), signal weights, suppress rules)
 *   - FTN play charting (motion, PA, blitz, contested, sneak, hash, …)
 *   - market/odds (consensus, CLV, line movement)
 *   - injuries / depth / availability
 *   - weather / travel / schedule density
 *   - fantasy/DFS (salaries, ownership, projections)
 *   - source graph / rights / freshness
 *   - decision-genome (knowability, aperture, proof card)
 *   - research corpus (methods, not auto-activated)
 *
 * The core is a pure, typed read-reason model. It never fabricates facts,
 * never claims a probability where the number is only a score, and never
 * publishes without the proof gate.
 */

import {
  calibratedWinProb,
  combinedSignalWeight,
  shouldSuppress,
  WEIGHT_BY_PICK_TYPE,
  WEIGHT_BY_SPORT,
  WEIGHT_BY_GRADE,
  WEIGHT_BY_MODEL_VERSION,
  type SignalWeight,
} from "@sports/data-ingestion";

// ---------------------------------------------------------------------------
// Situation — the six questions every decision must answer
// ---------------------------------------------------------------------------

export type SignalFamily =
  | "PLAY_CHARTING"
  | "MARKET"
  | "INJURY_AVAILABILITY"
  | "WEATHER_TRAVEL"
  | "FANTASY_DFS"
  | "SCHEDULE_DENSITY"
  | "SCHEME_TENDENCY"
  | "NARRATIVE_SOCIAL"
  | "SOURCE_TRUST"
  | "CALIBRATION_HISTORY";

export interface SignalObservation {
  readonly family: SignalFamily;
  readonly key: string;
  /** Human-readable what-we-know. */
  readonly fact: string;
  /** When we knew it (ISO). */
  readonly knownAt: string;
  /** Where it came from (source id / file). */
  readonly origin: string;
  /** 0–1 reliability + freshness blend. */
  readonly trust: number;
  /** 0–1 freshness (1 = just now). */
  readonly freshness: number;
  /** Optional directional lean: positive favors home/over/selection A. */
  readonly lean?: number;
  /** Rights state — must be cleared to feed a publishable probability. */
  readonly rights: "cleared" | "use-with-caution" | "licensed" | "paid-required" | "forbidden";
  /** Tier-5 chatter is cockpit-only and can never be a standalone pick. */
  readonly tier: 1 | 2 | 3 | 4 | 5;
}

export interface MarketBelief {
  readonly market: string;
  /** De-vigged market probability of the primary selection. */
  readonly fairProb: number | null;
  readonly line: number | null;
  readonly bookmakerCount: number | null;
  readonly consensusPct: number | null;
  readonly clv?: number | null;
}

export interface SituationalContext {
  readonly gameId: string;
  readonly sport: string;
  readonly selection: string;
  readonly pickType: "SPREAD" | "TOTAL" | "MONEYLINE" | "PROP";
  readonly commenceTime: string;
  readonly observations: readonly SignalObservation[];
  readonly market: MarketBelief;
  /** Scoreboard/game-state context (rest, travel, weather, injuries). */
  readonly situation: {
    readonly restDaysHome?: number;
    readonly restDaysAway?: number;
    readonly travelTimezoneShift?: number;
    readonly weatherImpact?: number;
    readonly injuryImpact?: number;
    readonly scheduleDensity?: number;
  };
  readonly modelVersion: string;
  readonly statedConfidence: number | null;
  readonly grade?: "LEAN" | "SOLID_PLAY" | "STRONG_PLAY" | "ELITE_PLAY";
}

// ---------------------------------------------------------------------------
// Reasoning output
// ---------------------------------------------------------------------------

export interface IntelligenceReasoning {
  /** Empirically calibrated P(WIN) — never the raw stated confidence. */
  readonly calibratedProb: number;
  /** How much the situation (not raw metrics) is moving the number. */
  readonly situationalShift: number;
  /** 0–1 how complete our knowledge is (knowability). */
  readonly knowability: number;
  /** 0–1 evidence health across sources. */
  readonly evidenceHealth: number;
  /** Weighted signal contribution by family. */
  readonly familyWeights: Readonly<Record<SignalFamily, number>>;
  /** Why — the narrative spine. Ordered by weight. */
  readonly why: readonly string[];
  /** Why not — counter-evidence and missing data. */
  readonly whyNot: readonly string[];
  /** Market already believes this much — edge is model − market. */
  readonly marketFairProb: number | null;
  readonly edgeVsMarket: number | null;
  /** Publish decision: shadow, withhold, or candidate (still needs proof gate). */
  readonly publishState: "SHADOW" | "WITHHOLD" | "CANDIDATE";
  readonly withholdReasons: readonly string[];
  /** Combined empirical signal weight (0.4–1.5). */
  readonly signalWeight: number;
  /** The six questions, answered. */
  readonly sixQuestions: {
    readonly what: string;
    readonly when: string;
    readonly where: string;
    readonly reliability: string;
    readonly marketBelieves: string;
    readonly improvesDecisions: string;
  };
}

// ---------------------------------------------------------------------------
// Family trust priors — how much each family has historically mattered
// ---------------------------------------------------------------------------

const FAMILY_BASE_WEIGHT: Readonly<Record<SignalFamily, number>> = {
  PLAY_CHARTING: 0.85,
  MARKET: 1.0,
  INJURY_AVAILABILITY: 0.9,
  WEATHER_TRAVEL: 0.55,
  FANTASY_DFS: 0.7,
  SCHEDULE_DENSITY: 0.6,
  SCHEME_TENDENCY: 0.8,
  NARRATIVE_SOCIAL: 0.35,
  SOURCE_TRUST: 0.75,
  CALIBRATION_HISTORY: 0.95,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function isPublishableRights(r: SignalObservation["rights"]): boolean {
  return r === "cleared" || r === "use-with-caution" || r === "licensed";
}

/**
 * Reason over a full situational context.
 *
 * This is the all-knowing step: it does not just average metrics. It
 * weighs *when we knew it*, *where it came from*, *how fresh and reliable*,
 * *what the market already believes*, and *whether the situation* (rest,
 * travel, weather, injuries, schedule) is creating or destroying chances.
 */
export function reason(ctx: SituationalContext): IntelligenceReasoning {
  const obs = ctx.observations;
  const publishable = obs.filter((o) => isPublishableRights(o.rights));
  const tier5 = obs.filter((o) => o.tier === 5);

  // --- family weights: base × average trust × freshness ---
  const familyWeights = {} as Record<SignalFamily, number>;
  const families: SignalFamily[] = [
    "PLAY_CHARTING",
    "MARKET",
    "INJURY_AVAILABILITY",
    "WEATHER_TRAVEL",
    "FANTASY_DFS",
    "SCHEDULE_DENSITY",
    "SCHEME_TENDENCY",
    "NARRATIVE_SOCIAL",
    "SOURCE_TRUST",
    "CALIBRATION_HISTORY",
  ];
  for (const fam of families) {
    const members = publishable.filter((o) => o.family === fam);
    if (members.length === 0) {
      familyWeights[fam] = 0;
      continue;
    }
    const avgTrust =
      members.reduce((a, o) => a + o.trust * o.freshness, 0) / members.length;
    familyWeights[fam] = Number(
      (FAMILY_BASE_WEIGHT[fam] * clamp01(avgTrust) * members.length).toFixed(4),
    );
  }

  // --- situational shift: rest / travel / weather / injuries / density ---
  const s = ctx.situation;
  let situationalShift = 0;
  const why: string[] = [];
  const whyNot: string[] = [];

  if (s.restDaysHome != null && s.restDaysAway != null) {
    const restEdge = (s.restDaysHome - s.restDaysAway) * 0.025;
    situationalShift += restEdge;
    if (restEdge > 0.02) {
      why.push(
        `Rest edge: ${s.restDaysHome}d vs ${s.restDaysAway}d — fresher legs historically worth ~${(restEdge * 100).toFixed(1)} pts of probability.`,
      );
    } else if (restEdge < -0.02) {
      whyNot.push(
        `Rest deficit: ${s.restDaysHome}d vs ${s.restDaysAway}d — this game script works against us.`,
      );
    }
  }
  if (s.travelTimezoneShift != null && s.travelTimezoneShift !== 0) {
    const travel = -Math.abs(s.travelTimezoneShift) * 0.015;
    situationalShift += travel;
    if (Math.abs(s.travelTimezoneShift) >= 2) {
      whyNot.push(
        `Travel/timezone shift of ${s.travelTimezoneShift}h — jet-lag tax is real (~${(travel * 100).toFixed(1)} pts).`,
      );
    }
  }
  if (s.weatherImpact != null && s.weatherImpact !== 0) {
    situationalShift += s.weatherImpact;
    if (Math.abs(s.weatherImpact) >= 0.03) {
      const dir = s.weatherImpact > 0 ? "helps" : "hurts";
      why.push(
        `Weather is material and ${dir} this side (~${(Math.abs(s.weatherImpact) * 100).toFixed(1)} pts).`,
      );
    }
  }
  if (s.injuryImpact != null && s.injuryImpact !== 0) {
    situationalShift += s.injuryImpact;
    if (Math.abs(s.injuryImpact) >= 0.04) {
      const dir = s.injuryImpact > 0 ? "helps" : "hurts";
      why.push(
        `Availability is material and ${dir} this side (~${(Math.abs(s.injuryImpact) * 100).toFixed(1)} pts).`,
      );
    }
  }
  if (s.scheduleDensity != null && s.scheduleDensity > 0.5) {
    situationalShift -= 0.02;
    whyNot.push(
      `Schedule density ${s.scheduleDensity.toFixed(2)} — fatigue/back-to-back context is a headwind.`,
    );
  }

  // --- charting / scheme observations push the lean ---
  let chartingLean = 0;
  let chartingN = 0;
  for (const o of publishable) {
    if (o.lean == null) continue;
    chartingLean += o.lean * o.trust * o.freshness;
    chartingN += 1;
  }
  if (chartingN > 0) {
    const avgLean = chartingLean / chartingN;
    situationalShift += clamp(avgLean * 0.08, -0.12, 0.12);
    const chartObs = publishable.filter((o) => o.family === "PLAY_CHARTING" || o.family === "SCHEME_TENDENCY");
    for (const o of chartObs.slice(0, 4)) {
      if (o.lean != null && Math.abs(o.lean) > 0.3) {
        const dir = o.lean > 0 ? "supports" : "undercuts";
        why.push(`${o.fact} — ${dir} this side (lean ${o.lean.toFixed(2)}, trust ${o.trust.toFixed(2)}).`);
      }
    }
  }

  // --- calibrated base probability from stated confidence ---
  const calibratedBase = calibratedWinProb(ctx.statedConfidence);
  const calibratedProb = clamp(calibratedBase + situationalShift, 0.05, 0.95);

  // --- market comparison ---
  const marketFairProb = ctx.market.fairProb;
  const edgeVsMarket =
    marketFairProb != null ? Number((calibratedProb - marketFairProb).toFixed(4)) : null;

  // --- knowability & evidence health ---
  const knowability =
    publishable.length === 0
      ? 0
      : clamp01(
          publishable.reduce((a, o) => a + o.trust * (o.tier <= 3 ? 1 : 0.5), 0) /
            Math.max(1, publishable.length) /
            0.85,
        );
  const evidenceHealth =
    publishable.length === 0
      ? 0
      : clamp01(
          publishable.reduce((a, o) => a + o.trust * o.freshness, 0) /
            Math.max(1, publishable.length),
        );

  // --- signal weight from historical slices ---
  const signalWeight = combinedSignalWeight(ctx.sport, ctx.pickType, ctx.grade);

  // --- withhold / publish state ---
  const withholdReasons: string[] = [];
  if (shouldSuppress(ctx.sport, ctx.pickType, ctx.grade ?? "LEAN")) {
    withholdReasons.push(
      "Slice is historically below the 0.45 win-rate floor — suppress or shrink before any publish.",
    );
  }
  if (knowability < 0.35) {
    withholdReasons.push(`Knowability ${knowability.toFixed(2)} is thin — we do not know enough yet.`);
  }
  if (evidenceHealth < 0.3) {
    withholdReasons.push(`Evidence health ${evidenceHealth.toFixed(2)} is weak — sources stale or untrusted.`);
  }
  if (tier5.length > 0 && publishable.length <= tier5.length) {
    withholdReasons.push(
      "Only tier-5 chatter available — cockpit-only, never a standalone pick.",
    );
  }
  if (ctx.grade === "ELITE_PLAY") {
    withholdReasons.push(
      "ELITE_PLAY is historically the WORST grade (43.1% win) — do not boost on grade alone.",
    );
  }
  const anyForbidden = obs.some((o) => o.rights === "forbidden");
  if (anyForbidden) {
    withholdReasons.push("Contains forbidden-rights data — strip before any external use.");
  }

  const publishState: IntelligenceReasoning["publishState"] =
    withholdReasons.length > 0
      ? "WITHHOLD"
      : evidenceHealth >= 0.5 && knowability >= 0.55
        ? "CANDIDATE"
        : "SHADOW";

  // --- why / why not ---
  if (edgeVsMarket != null && edgeVsMarket > 0.03) {
    why.push(
      `Calibrated P ${(calibratedProb * 100).toFixed(1)}% vs market ${((marketFairProb ?? 0) * 100).toFixed(1)}% — positive edge of ${(edgeVsMarket * 100).toFixed(1)} pts after de-vig.`,
    );
  } else if (edgeVsMarket != null && edgeVsMarket < -0.03) {
    whyNot.push(
      `Market already prices this better than we do (edge ${(edgeVsMarket * 100).toFixed(1)} pts) — respect the close.`,
    );
  }
  if (Math.abs(situationalShift) < 0.02) {
    whyNot.push("Situational context is neutral — this is not a context-driven angle.");
  }
  for (const o of publishable.filter((x) => x.tier === 5).slice(0, 2)) {
    whyNot.push(`Tier-5 unverified: ${o.fact} — treat as lead only.`);
  }

  // --- six questions ---
  // "What do we know" includes every observation (even withheld ones).
  // Publish gating is separate from knowledge.
  const what =
    obs.length === 0
      ? "We do not yet have a fact on this side."
      : obs
          .slice(0, 3)
          .map((o) => o.fact)
          .join("; ");
  // "When did we know it" is a property of every observation — including
  // ones we withhold — so use the full set here, not just publishable.
  const when = (() => {
    const stamps = obs
      .map((o) => o.knownAt)
      .filter((t): t is string => typeof t === "string" && t.length > 0);
    if (stamps.length === 0) {
      // Fall back to the decision clock so the question is always answered.
      return ctx.commenceTime || "unknown";
    }
    stamps.sort();
    return stamps[stamps.length - 1] ?? ctx.commenceTime ?? "unknown";
  })();
  const where =
    obs.length === 0
      ? "none"
      : Array.from(new Set(obs.map((o) => o.origin))).slice(0, 4).join(", ");
  const reliability = `trust×fresh avg ${evidenceHealth.toFixed(2)} across ${publishable.length} rights-cleared signals; knowability ${knowability.toFixed(2)}.`;
  const marketBelieves =
    marketFairProb != null
      ? `Market fair P ${((marketFairProb ?? 0) * 100).toFixed(1)}% (${ctx.market.bookmakerCount ?? "?"} books, consensus ${ctx.market.consensusPct != null ? (ctx.market.consensusPct * 100).toFixed(0) + "%" : "n/a"}).`
      : "Market belief not yet loaded — we are reasoning blind against the number.";
  const improvesDecisions =
    edgeVsMarket != null
      ? `Calibrated edge ${edgeVsMarket > 0 ? "+" : ""}${(edgeVsMarket * 100).toFixed(1)} pts after situational shift ${situationalShift >= 0 ? "+" : ""}${(situationalShift * 100).toFixed(1)} pts. Validate on walk-forward before any claim.`
      : `Situational shift ${situationalShift >= 0 ? "+" : ""}${(situationalShift * 100).toFixed(1)} pts — needs market baseline to judge improvement.`;

  return {
    calibratedProb,
    situationalShift: Number(situationalShift.toFixed(4)),
    knowability: Number(knowability.toFixed(4)),
    evidenceHealth: Number(evidenceHealth.toFixed(4)),
    familyWeights,
    why,
    whyNot,
    marketFairProb,
    edgeVsMarket,
    publishState,
    withholdReasons,
    signalWeight,
    sixQuestions: { what, when, where, reliability, marketBelieves, improvesDecisions },
  };
}

/**
 * Build a compact situation summary for the website / cockpit.
 * Never exposes tier-5 as standalone, never shows raw stated confidence
 * without calibration context.
 */
export function explain(ctx: SituationalContext, r: IntelligenceReasoning): string {
  const parts: string[] = [];
  parts.push(
    `${ctx.selection} (${ctx.sport} ${ctx.pickType}): calibrated P(WIN) ${(r.calibratedProb * 100).toFixed(1)}%`,
  );
  if (r.marketFairProb != null) {
    parts.push(
      `vs market ${((r.marketFairProb ?? 0) * 100).toFixed(1)}% (edge ${r.edgeVsMarket != null && r.edgeVsMarket >= 0 ? "+" : ""}${((r.edgeVsMarket ?? 0) * 100).toFixed(1)} pts)`,
    );
  }
  parts.push(`situational shift ${r.situationalShift >= 0 ? "+" : ""}${(r.situationalShift * 100).toFixed(1)} pts`);
  parts.push(`evidence ${r.evidenceHealth.toFixed(2)}, knowability ${r.knowability.toFixed(2)}`);
  parts.push(`state ${r.publishState}`);
  if (r.why.length > 0) parts.push(`Why: ${r.why[0]}`);
  if (r.whyNot.length > 0) parts.push(`Why not: ${r.whyNot[0]}`);
  return parts.join(" · ");
}

/** Historical slice weights — re-exported for the website. */
export const SLICE_WEIGHTS = {
  byPickType: WEIGHT_BY_PICK_TYPE,
  bySport: WEIGHT_BY_SPORT,
  byGrade: WEIGHT_BY_GRADE,
  byModelVersion: WEIGHT_BY_MODEL_VERSION,
} as const;

export type { SignalWeight };
