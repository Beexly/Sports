/**
 * THE ENGINE EMITS A PICK, OR IT EMITS "NO BET".
 *
 * THE GAP THIS CLOSES
 * `IntelligenceReasoning` returns calibratedProb, situationalShift,
 * knowability, evidenceHealth, familyWeights, why, whyNot, publishState and
 * withholdReasons. It returns NO side, NO selection, and NO pick. Measured on
 * origin/main 13f84dcee: `SituationalContext.selection` is an INPUT (the
 * engine is told which side it is evaluating), so the reasoning spine can
 * answer "60% on the home side" and can never answer "TAKE the home side".
 * The founder's position is that the engine's output IS the edge; a
 * probability nobody converts into a call is not an edge, it is a number.
 *
 * So the conversion lives HERE, as a separate pure step, rather than being
 * smeared into `reason()`. Two reasons it is not inside `reason()`:
 *  - `reason()` is a reader of a caller-supplied context, and a recommender
 *    changes what its output MEANS for every existing caller, including the
 *    public picks route that renders `why` lines to customers. That is a
 *    published-output change and not this lane's call.
 *  - The recommendation needs a THRESHOLD, and a threshold is a policy number
 *    a founder sets and tunes. It has to be a named, injectable parameter with
 *    an honest default, not a constant buried in a spine that twelve surfaces
 *    already feed.
 *
 * THREE RULES THIS MODULE ENFORCES, each with a test that fails if it breaks:
 *
 *  1. NO BET IS A FIRST-CLASS OUTPUT. An engine that picks on every fixture is
 *     not reasoning, it is gambling. `recommend()` returns a `NO_BET`
 *     recommendation whenever the edge is below threshold, the evidence is too
 *     thin, or the publish state forbids it. A caller cannot accidentally read
 *     a NO_BET as a pick: the discriminator is a literal, not a null score.
 *
 *  2. THE MARKET IS A COMPARISON INPUT, NEVER THE SOURCE OF THE CALL. The
 *     recommended SIDE comes from the engine's own signal spine only. The
 *     market probability is used for exactly two things: reporting what the
 *     edge is against, and refusing a pick the market has already priced
 *     (an edge at or below the market's own margin is not an edge). It is
 *     never averaged into the side, so there is no code path by which a
 *     market move can flip an engine's selection.
 *
 *  3. PUBLISH STATE IS BINDING. `WITHHOLD` and `SHADOW` both mean the engine
 *     does not stand behind this call, so neither may produce a pick. A
 *     `WITHHOLD` with a positive edge is exactly the case where a number could
 *     most tempt a caller into publishing anyway, which is why it is checked
 *     BEFORE the edge test rather than after.
 */

/**
 * The reasoning fields `recommend()` reads, declared here rather than imported.
 *
 * `IntelligenceReasoning` lives in `apps/web/lib/intelligence-core`, and the
 * dependency runs the other way: `apps/web` imports THIS package, so importing
 * the spine's type would create a cycle. This is the structural subset the
 * recommender actually consumes, and it is declared so that the REAL
 * `IntelligenceReasoning` satisfies it without a cast: every field below is
 * read, and adding one to the recommender forces adding it here.
 *
 * Do not widen it to "the whole reasoning output". The point of this module is
 * that it reads a probability and the gates around it, and nothing else.
 */
export interface RecommendReasoning {
  /** Empirically calibrated P(WIN). Never the raw stated confidence. */
  readonly calibratedProb: number;
  /** SHADOW and WITHHOLD are binding: neither may produce a pick. */
  readonly publishState: "SHADOW" | "WITHHOLD" | "CANDIDATE";
  readonly withholdReasons: readonly string[];
  /** 0-1 how complete our knowledge is. */
  readonly knowability: number;
  /** 0-1 evidence health across sources. */
  readonly evidenceHealth: number;
  /** Why lines, surfaced into the recommendation's own trace. */
  readonly why: readonly string[];
}

/** What the engine concluded. NO_BET is a conclusion, not a failure. */
export type RecommendationVerdict = "PICK" | "NO_BET";

/**
 * Why no bet, in the engine's own words.
 *
 * `THRESHOLD` is the common answer and is NOT a defect: it means the edge was
 * real but small, which is what an honest bookmaker posture looks like on most
 * fixtures. The other four are the engine declining for reasons of evidence or
 * policy, and each names which gate closed.
 *
 * Named `RecommendationNoBetReason`, not `NoBetReason`: `NoBetReason` is
 * already exported from `./edge-lab/selective-gate.js` for a different gate,
 * and two unrelated enums sharing one exported name is a coin flip at every
 * call site.
 */
export type RecommendationNoBetReason =
  | "THRESHOLD"
  | "WITHHELD_BY_ENGINE"
  | "SHADOWED_BY_ENGINE"
  | "THIN_EVIDENCE"
  | "NO_SIDE";

/**
 * Minimum edge over the market's own price before the engine will call a side.
 *
 * 0.03 = 3 probability points. It is a DEFAULT, not a fitted number, and it is
 * the first thing a founder should tune. It is deliberately NOT derived from
 * any settlement data here: calibrating a threshold is the calibration step,
 * which comes after this wiring, and guessing it from uncalibrated output
 * would be the exact defect this repo keeps refusing.
 */
export const DEFAULT_MIN_EDGE = 0.03;

/**
 * Minimum knowability and evidenceHealth for a pick at all, mirroring the
 * engine's own CANDIDATE bar (0.55 / 0.5) rather than inventing a second set of
 * numbers that could drift from it.
 */
export const DEFAULT_MIN_KNOWABILITY = 0.55;
export const DEFAULT_MIN_EVIDENCE_HEALTH = 0.5;

export interface RecommendOptions {
  /**
   * Minimum absolute edge (model minus market) required to call a side.
   * Defaults to {@link DEFAULT_MIN_EDGE}.
   */
  readonly minEdge?: number;
  /** Defaults to {@link DEFAULT_MIN_KNOWABILITY}. */
  readonly minKnowability?: number;
  /** Defaults to {@link DEFAULT_MIN_EVIDENCE_HEALTH}. */
  readonly minEvidenceHealth?: number;
}

export interface RecommendInput {
  /** The engine's own reasoning output. */
  readonly reasoning: RecommendReasoning;
  /**
   * De-vigged market probability for the HOME side, or null when there is no
   * usable market. Comparison only: it is never averaged into the call.
   */
  readonly marketHomeProb: number | null;
  /** Home club name, for the emitted selection. */
  readonly homeTeam: string;
  /** Away club name. */
  readonly awayTeam: string;
  /** The market's spread or total line, when the market is a points market. */
  readonly line?: number | null;
  readonly pickType?: "SPREAD" | "TOTAL" | "MONEYLINE" | "PROP";
  readonly options?: RecommendOptions;
}

export interface EngineRecommendation {
  /** Discriminator. Check this, not the score: a NO_BET carries a real score. */
  readonly verdict: RecommendationVerdict;
  /**
   * The recommended selection, e.g. "KC -3.5" or "BUF ML". Null exactly when
   * `verdict` is NO_BET.
   */
  readonly selection: string | null;
  /** Which side the engine took: +1 home, -1 away, 0 for no bet. */
  readonly side: 1 | -1 | 0;
  /** The engine's probability for the side it took. Null on no bet. */
  readonly prob: number | null;
  /**
   * Model minus market for the recommended side, in probability points. Signed
   * to the SIDE, so a positive number always means "we are above the market on
   * the side we took". Null when the market is unusable.
   */
  readonly edge: number | null;
  /** The probability the engine assigns the home side, whatever it decided. */
  readonly homeProb: number;
  /** Present exactly when `verdict` is NO_BET. */
  readonly noBetReason: RecommendationNoBetReason | null;
  /** Human-readable trace. Never contains a pick when there is none. */
  readonly why: readonly string[];
}

const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

function noBet(reason: RecommendationNoBetReason, homeProb: number, why: string[]): EngineRecommendation {
  return {
    verdict: "NO_BET",
    selection: null,
    side: 0,
    prob: null,
    edge: null,
    homeProb,
    noBetReason: reason,
    why,
  };
}

/**
 * Render a selection for a side, or null when the side cannot be expressed.
 *
 * A TOTAL has no home/away side to name, so the engine's call on a total is
 * expressed as OVER or UNDER from its own probability, and only when the market
 * supplied a line to be over or under. Without a line there is no selection
 * string that means anything, so it returns null and the caller records a NO_BET
 * rather than inventing one.
 */
export function selectionForSide(
  side: 1 | -1,
  homeTeam: string,
  awayTeam: string,
  line: number | null | undefined,
  pickType: "SPREAD" | "TOTAL" | "MONEYLINE" | "PROP",
): string | null {
  if (pickType === "TOTAL") {
    if (line == null || !Number.isFinite(line)) return null;
    // A bare number. `+48.5` is a SPREAD convention, and "OVER +48.5" is not a
    // string any book, board or settlement would print or parse. A total's
    // line is a magnitude, so it carries no sign of its own.
    return `${side === 1 ? "OVER" : "UNDER"} ${line}`;
  }
  if (pickType === "MONEYLINE") return `${side === 1 ? homeTeam : awayTeam} ML`;
  if (pickType === "PROP") return null;
  if (line == null || !Number.isFinite(line)) return null;
  // A home side on a negative line is the favourite taking points; an away side
  // on the same line is the underdog receiving them. Both are the SAME points
  // value, so the sign is the line's, not the side's.
  const points = line > 0 ? `+${line}` : `${line}`;
  return `${side === 1 ? homeTeam : awayTeam} ${points}`;
}

/**
 * Convert the engine's reasoning into a pick, or an explicit refusal to pick.
 *
 * Pure, and the only place the conversion happens. `reasoning` is the engine's
 * OWN output: the side is read from `calibratedProb` against 0.5 and nothing
 * else. The market is compared to, never blended into, that number.
 */
export function recommend(
  input: RecommendInput,
): EngineRecommendation {
  const minEdge = input.options?.minEdge ?? DEFAULT_MIN_EDGE;
  const minKnowability = input.options?.minKnowability ?? DEFAULT_MIN_KNOWABILITY;
  const minEvidenceHealth = input.options?.minEvidenceHealth ?? DEFAULT_MIN_EVIDENCE_HEALTH;
  const why: string[] = [];

  // A non-finite `calibratedProb` is an UNKNOWN, not a probability, and an
  // unknown cannot be turned into a side. Clamping it would silently read NaN
  // as 0.0 and hand back a confident away-side pick from a spine that never
  // produced a number at all. Refuse before anything reads it.
  if (!Number.isFinite(input.reasoning.calibratedProb)) {
    return noBet("NO_SIDE", 0, [
      "calibratedProb is not a finite number, so the engine has no probability to call a side from",
    ]);
  }
  const homeProb = clamp01(input.reasoning.calibratedProb);

  // RULE 3, checked FIRST. A withheld or shadowed spine does not get to call a
  // side, however large its edge. Deliberately ahead of the edge test: a
  // WITHHOLD carrying a big positive edge is the exact state where a caller
  // would be most tempted to publish the number anyway.
  if (input.reasoning.publishState === "WITHHOLD") {
    return noBet("WITHHELD_BY_ENGINE", homeProb, [
      ...input.reasoning.withholdReasons.map((r) => `withheld: ${r}`),
      "publishState is WITHHOLD, so the engine does not stand behind a call on this fixture",
    ]);
  }
  if (input.reasoning.publishState === "SHADOW") {
    return noBet("SHADOWED_BY_ENGINE", homeProb, [
      "publishState is SHADOW (evidence or knowability below the candidate bar), so no pick is emitted",
    ]);
  }

  // The engine's own side. This is the ONLY place the side is decided, and it
  // reads nothing but the engine's own probability.
  const side: 1 | -1 = homeProb >= 0.5 ? 1 : -1;
  const prob = side === 1 ? homeProb : 1 - homeProb;

  // Evidence floors, stated as the engine's own CANDIDATE bar rather than a
  // second set of numbers that could drift from it.
  if (input.reasoning.knowability < minKnowability) {
    return noBet("THIN_EVIDENCE", homeProb, [
      `knowability ${input.reasoning.knowability.toFixed(2)} is below the ${minKnowability} floor`,
    ]);
  }
  if (input.reasoning.evidenceHealth < minEvidenceHealth) {
    return noBet("THIN_EVIDENCE", homeProb, [
      `evidence health ${input.reasoning.evidenceHealth.toFixed(2)} is below the ${minEvidenceHealth} floor`,
    ]);
  }

  // RULE 2, comparison only. A market at or below our own number is priced, not
  // beaten, so it is not an edge and must not produce a call.
  const market = input.marketHomeProb;
  const marketForSide = market == null || !Number.isFinite(market) ? null : side === 1 ? market : 1 - market;
  if (marketForSide === null) {
    return noBet("THRESHOLD", homeProb, [
      "no usable de-vigged market probability, so there is no edge to measure and no call to make",
    ]);
  }
  const edge = Number((prob - marketForSide).toFixed(4));
  if (edge < minEdge) {
    // The common case, and it is a real answer rather than a failure.
    return noBet("THRESHOLD", homeProb, [
      `engine ${(prob * 100).toFixed(1)}% vs market ${(marketForSide * 100).toFixed(1)}% on the ${side === 1 ? "home" : "away"} side is an edge of ${(edge * 100).toFixed(1)} pts, under the ${(minEdge * 100).toFixed(1)} pt threshold`,
    ]);
  }

  const selection = selectionForSide(
    side,
    input.homeTeam,
    input.awayTeam,
    input.line,
    input.pickType ?? "SPREAD",
  );
  if (selection === null) {
    return noBet("NO_SIDE", homeProb, [
      `the engine leans ${side === 1 ? "home" : "away"} but this market has no expressible side to name, so no selection is emitted rather than an invented one`,
    ]);
  }

  why.push(
    `engine ${(prob * 100).toFixed(1)}% on the ${side === 1 ? input.homeTeam : input.awayTeam} against a market at ${(marketForSide * 100).toFixed(1)}% is an edge of ${(edge * 100).toFixed(1)} pts, over the ${(minEdge * 100).toFixed(1)} pt threshold`,
  );
  for (const line of input.reasoning.why.slice(0, 3)) why.push(line);

  return {
    verdict: "PICK",
    selection,
    side,
    prob: Number(prob.toFixed(4)),
    edge,
    homeProb: Number(homeProb.toFixed(4)),
    noBetReason: null,
    why,
  };
}
