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

import {
  assertValidShadowPolicy,
  shadowedFamilyTest,
  situationScalarFor,
  type SignalShadowPolicy,
} from "./shadow";

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
  /**
   * Home/away frame that every observation lean and every home-minus-away
   * difference is expressed in (see SignalObservation.lean).
   *
   * These are what let `reason()` re-express those numbers in the *selection's*
   * frame. Optional so callers that predate the frame keep working: with no
   * team names, an unresolvable selection is treated as "selection A" — the
   * frame the lean convention already documents — rather than silently flipped.
   */
  readonly homeTeam?: string;
  readonly awayTeam?: string;
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
  /**
   * SHADOW-ONLY switch. Omit it (or pass `undefined`) and behaviour is exactly
   * as before — no family is excluded. Pass `shadowOnly([...], "reason")` to
   * hold named families OUT of the calibration spine while still counting and
   * reporting them.
   *
   * This is the only place the switch can be introduced, it requires a written
   * justification, and `reason()` re-validates it. See ./shadow.ts.
   */
  readonly shadowPolicy?: SignalShadowPolicy;
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
  /**
   * SHADOW-ONLY accounting. `calibrationCount` is how many rights-cleared
   * observations actually fed the spine; `shadowedCount` is how many were held
   * out. `shadowedCount > 0` with `calibrationCount === 0` is a legal state —
   * we know plenty and are choosing not to bet on any of it.
   */
  readonly shadowReport: {
    readonly active: boolean;
    readonly families: readonly SignalFamily[];
    readonly justification: string | null;
    /** Rights-cleared observations that fed the lean loop and aggregates. */
    readonly calibrationCount: number;
    /** Rights-cleared observations held out of the spine but still reported. */
    readonly shadowedCount: number;
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
 * Does `selection` name `team`? Token-boundary match so "BUF" matches
 * "BUF" and "BUF +3.5" but not "BUFFALO" or the "KC" inside "PACKERS".
 */
function selectionNamesTeam(selection: string, team: string): boolean {
  const sel = selection.trim().toUpperCase();
  const t = team.trim().toUpperCase();
  if (sel.length === 0 || t.length === 0) return false;
  if (sel === "HOME" || sel === "AWAY") return sel === "HOME" ? t === "HOME" : t === "AWAY";
  if (sel === t) return true;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`).test(sel);
}

/**
 * Which side of the home/away frame the pick is on: +1 home, -1 away.
 *
 * This is the selection-blindness guard. SignalObservation.lean is documented
 * as "positive favors home/over/selection A" and the adapters honour that by
 * negating away-side leans (signal-adapters.ts injuryObservations/ngsObservations).
 * So every lean, and every home-minus-away difference, arrives in the HOME
 * frame. Without re-expressing it here, an away pick silently inherits the home
 * sign: an away-QB-out injury RAISES P(win) on a BUF pick instead of lowering it,
 * and `explain()` then narrates that number to a customer.
 *
 * Returns +1 (the documented "selection A" behavior) when the frame cannot be
 * resolved — a PROP/TOTAL pick, a player name rather than a team, a selection
 * that names both sides, or a context built without team names. Guessing a sign
 * there would be worse than the explicit, documented default.
 */
function selectionOrientation(ctx: SituationalContext): 1 | -1 {
  // Only team-level carries are expressed on a home/away axis. A TOTAL is
  // priced over/under and a PROP on a player; neither has a home/away side for
  // these leans to invert against, so leave them on the documented frame.
  if (ctx.pickType !== "MONEYLINE" && ctx.pickType !== "SPREAD") return 1;
  // Home first: a selection naming both sides is ambiguous, and the documented
  // frame is the safer of the two fallbacks.
  if (ctx.homeTeam && selectionNamesTeam(ctx.selection, ctx.homeTeam)) return 1;
  if (ctx.awayTeam && selectionNamesTeam(ctx.selection, ctx.awayTeam)) return -1;
  return 1;
}

/**
 * Reason over a full situational context.
 *
 * This is the all-knowing step: it does not just average metrics. It
 * weighs *when we knew it*, *where it came from*, *how fresh and reliable*,
 * *what the market already believes*, and *whether the situation* (rest,
 * travel, weather, injuries, schedule) is creating or destroying chances.
 *
 * SHADOW MODE (opt-in via `ctx.shadowPolicy`, see ./shadow.ts):
 *   Shadowed families are still counted, still listed in the six questions,
 *   and still visible in `shadowReport` — but they are excluded from the lean
 *   loop, from knowability/evidenceHealth, from familyWeights, and from the
 *   family-matched situation scalar. Omit the policy and nothing changes.
 */
export function reason(ctx: SituationalContext): IntelligenceReasoning {
  const obs = ctx.observations;
  const publishable = obs.filter((o) => isPublishableRights(o.rights));
  const tier5 = obs.filter((o) => o.tier === 5);

  // --- shadow-only partition ---------------------------------------------
  // A malformed policy is a programming error, not a silent fallback: if
  // someone hand-rolls `{ families: [] }` or forgets the justification we
  // throw rather than quietly calibrating on data they meant to exclude.
  if (ctx.shadowPolicy != null) {
    assertValidShadowPolicy(ctx.shadowPolicy);
  }
  const isShadowed = shadowedFamilyTest(ctx.shadowPolicy);
  // The calibration set: rights-cleared AND not shadowed. Everything below that
  // feeds calibratedProb / knowability / evidenceHealth reads from this.
  const calibration = publishable.filter((o) => !isShadowed(o.family));
  const shadowedObs = publishable.filter((o) => isShadowed(o.family));
  // Situation scalars owned by a shadowed family are skipped too, so the signal
  // cannot re-enter the spine through `ctx.situation`.
  const suppressedScalars = new Set<string>(
    (ctx.shadowPolicy?.families ?? [])
      .map((f) => situationScalarFor(f))
      .filter((n): n is string => n != null),
  );
  const situationValue = (key: string): number | undefined => {
    if (suppressedScalars.has(key)) return undefined;
    return (ctx.situation as Record<string, unknown>)[key] as number | undefined;
  };

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
    // Reads from `calibration`, not `publishable`: a shadowed family has no
    // members here and therefore reports weight 0 — which is the honest
    // statement that it contributes nothing to the spine. The observation
    // count is still reported in `shadowReport` so nothing is hidden.
    const members = calibration.filter((o) => o.family === fam);
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
  // Every lean and every home-minus-away difference below arrives in the HOME
  // frame. Re-express them in the SELECTION's frame or an away pick inherits
  // the home sign. See selectionOrientation().
  const orientation = selectionOrientation(ctx);
  const restForUs = () => (orientation === 1 ? s.restDaysHome : s.restDaysAway);
  const restForThem = () => (orientation === 1 ? s.restDaysAway : s.restDaysHome);
  let situationalShift = 0;
  const why: string[] = [];
  const whyNot: string[] = [];

  if (s.restDaysHome != null && s.restDaysAway != null) {
    const restEdge = (s.restDaysHome - s.restDaysAway) * 0.025 * orientation;
    situationalShift += restEdge;
    if (restEdge > 0.02) {
      why.push(
        `Rest edge: we have ${restForUs()}d vs their ${restForThem()}d — fresher legs historically worth ~${(restEdge * 100).toFixed(1)} pts of probability.`,
      );
    } else if (restEdge < -0.02) {
      whyNot.push(
        `Rest deficit: we have ${restForUs()}d vs their ${restForThem()}d — this game script works against us.`,
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
    const w = situationValue("weatherImpact");
    if (w != null && w !== 0) {
      situationalShift += w;
      if (Math.abs(w) >= 0.03) {
        const dir = w > 0 ? "helps" : "hurts";
        why.push(
          `Weather is material and ${dir} this side (~${(Math.abs(w) * 100).toFixed(1)} pts).`,
        );
      }
    }
  }
  if (s.injuryImpact != null && s.injuryImpact !== 0) {
    const inj = situationValue("injuryImpact");
    if (inj != null && inj !== 0) {
      situationalShift += inj;
      if (Math.abs(inj) >= 0.04) {
        const dir = inj > 0 ? "helps" : "hurts";
        why.push(
          `Availability is material and ${dir} this side (~${(Math.abs(inj) * 100).toFixed(1)} pts).`,
        );
      }
    }
  }
  if (s.scheduleDensity != null && s.scheduleDensity > 0.5) {
    const sd = situationValue("scheduleDensity");
    if (sd != null && sd > 0.5) {
      situationalShift -= 0.02;
      whyNot.push(
        `Schedule density ${sd.toFixed(2)} — fatigue/back-to-back context is a headwind.`,
      );
    }
  }

  // --- charting / scheme observations push the lean ---
  // NOTE: the comment above used to say "charting / scheme" but this loop has
  // no family filter — every publishable observation leaned the number, which
  // is how INJURY_AVAILABILITY ended up moving calibratedProb with no switch to
  // turn it off. Shadow mode is now the opt-in, explicit filter; the default
  // (no policy) is deliberately unchanged so no existing caller shifts.
  let chartingLean = 0;
  let chartingN = 0;
  for (const o of calibration) {
    if (o.lean == null) continue;
    chartingLean += o.lean * o.trust * o.freshness;
    chartingN += 1;
  }
  if (chartingN > 0) {
    // avgLean is in the HOME frame; selectionLean is the same number asked from
    // the selection's side. Without this the sign never inverts.
    const avgLean = chartingLean / chartingN;
    // Both fixes apply here: orientation (#970) re-expresses the lean in the
    // selection's frame, and shadow mode (#974) means `calibration` excludes
    // shadowed families. chartObs must read the same filtered set.
    const selectionLean = avgLean * orientation;
    situationalShift += clamp(selectionLean * 0.08, -0.12, 0.12);
    const chartObs = calibration.filter(
      (o) => o.family === "PLAY_CHARTING" || o.family === "SCHEME_TENDENCY",
    );
    for (const o of chartObs.slice(0, 4)) {
      if (o.lean != null && Math.abs(o.lean) > 0.3) {
        // Narrate the oriented lean, not the raw one: on an away pick a
        // positive home-frame lean is evidence AGAINST us, and a summary that
        // said "supports" would contradict the number printed beside it.
        const oriented = o.lean * orientation;
        const dir = oriented > 0 ? "supports" : "undercuts";
        why.push(`${o.fact} — ${dir} this side (lean ${oriented.toFixed(2)}, trust ${o.trust.toFixed(2)}).`);
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
  // Computed from `calibration`, not `publishable`: a shadowed family must not
  // be able to move publishState as a side effect. With no shadow policy
  // `calibration` is exactly `publishable`, so these are unchanged.
  const knowability =
    calibration.length === 0
      ? 0
      : clamp01(
          calibration.reduce((a, o) => a + o.trust * (o.tier <= 3 ? 1 : 0.5), 0) /
            Math.max(1, calibration.length) /
            0.85,
        );
  const evidenceHealth =
    calibration.length === 0
      ? 0
      : clamp01(
          calibration.reduce((a, o) => a + o.trust * o.freshness, 0) /
            Math.max(1, calibration.length),
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
  // Tier-5 gate and the forbidden-rights trip both read the full observation
  // set, not `calibration`, on purpose:
  //   - "only tier-5 chatter" is a statement about what we HAVE, so it must
  //     count shadowed observations too (it compares against tier5, which is
  //     already the full set). With no policy this is byte-identical.
  //   - forbidden rights is a compliance obligation, not a calibration input.
  //     The six questions surface `obs` directly, so a forbidden fact still
  //     needs to withhold regardless of whether its family is shadowed.
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
  if (shadowedObs.length > 0) {
    // Surfaced in `why`, not `whyNot`: we are not claiming these facts are
    // counter-evidence, we are disclosing that we saw them and declined to
    // weight them. That disclosure is the entire point of shadow mode.
    why.push(
      `Shadow-only: ${shadowedObs.length} ${(ctx.shadowPolicy?.families ?? []).join("/")} observation(s) counted and reported but excluded from calibration — ${ctx.shadowPolicy?.justification ?? ""}`.trim(),
    );
  }

  // --- six questions ---
  // "What do we know" includes every observation (even withheld and shadowed
  // ones) — it is assembled further down, where the shadow note is appended.
  // Publish gating is separate from knowledge.
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
  // "What do we know" stays a statement about the FULL set — shadowed facts are
  // knowledge, they are just not calibration input. When a policy is active we
  // name the held-out families so the reader knows those facts were seen and
  // deliberately not weighted.
  const whatText =
    obs.length === 0
      ? "We do not yet have a fact on this side."
      : obs
          .slice(0, 3)
          .map((o) => o.fact)
          .join("; ");
  const what =
    shadowedObs.length > 0
      ? `${whatText} [shadow-only: ${shadowedObs.length} ${(ctx.shadowPolicy?.families ?? []).join(", ")} observation(s) counted and reported but excluded from calibration]`
      : whatText;
  // Appended only when a policy is active, so the no-policy string is
  // byte-identical to before.
  const shadowNote =
    shadowedObs.length > 0
      ? ` ${shadowedObs.length} ${(ctx.shadowPolicy?.families ?? []).join("/")} signal(s) shadow-only — counted, not calibrated.`
      : "";
  const reliability = `trust×fresh avg ${evidenceHealth.toFixed(2)} across ${publishable.length} rights-cleared signals; knowability ${knowability.toFixed(2)}.${shadowNote}`;
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
    shadowReport: {
      active: shadowedObs.length > 0,
      families: ctx.shadowPolicy ? [...ctx.shadowPolicy.families] : [],
      justification: ctx.shadowPolicy ? ctx.shadowPolicy.justification : null,
      calibrationCount: calibration.length,
      shadowedCount: shadowedObs.length,
    },
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
  // Shadow disclosure is customer-visible on purpose: if a family is being
  // counted but not weighted, the summary must not imply otherwise.
  if (r.shadowReport.shadowedCount > 0) {
    parts.push(
      `shadow-only ${r.shadowReport.families.join("/")} ×${r.shadowReport.shadowedCount} (not calibrated)`,
    );
  }
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
