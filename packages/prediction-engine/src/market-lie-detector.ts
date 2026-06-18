/**
 * Market-Lie Detector — pure anti-model and line-move cause classifier
 * (Workstream-K "K2").
 *
 * WHAT THIS IS
 * Two pure functions that support ADVERSARIAL HONESTY:
 *
 *   (a) `classifyLineMove` — labels the likely CAUSE of an observed line move as
 *       a HYPOTHESIS from the movement's shape alone (net move, path, reversals,
 *       dispersion, public-majority direction, time-to-game). Since we have no
 *       news ingestion, any "news-reaction-candidate" label is explicitly flagged
 *       as unconfirmed — we cannot verify the cause without a news-timestamp feed.
 *
 *   (b) `antiModel` — the ADVERSARY PASS that tries to FALSIFY our own shadow
 *       pick. The anti-model's job is to argue against acting: if every
 *       falsification attempt fails ("SURVIVES"), that is a necessary — but
 *       never sufficient — condition for a real edge. A pick surviving the anti-
 *       model earns monitoring, not a free pass.
 *
 * WHY IT IS INERT (WEIGHT 0)
 * Both functions are shadow decision-support: weight 0, inert, NOT imported by
 * scoring.ts or any live path. They do not score, gate, tier, or price anything.
 * The anti-model verdict ("FALSIFIED", "WEAKENED", "SURVIVES") is a deliberative
 * aid, not a mechanical action signal — a human or the K3 calibration gate must
 * translate it into any actual decision.
 *
 * THE HONESTY INVARIANT
 * Every output is hedged ("consistent with…", "pattern suggests…"). The
 * "news-reaction-candidate" cause MUST state we cannot confirm news without a
 * K3 news-timestamp feed. The anti-model never claims to be a final arbiter:
 * surviving the adversary is necessary but not sufficient — calibrated
 * probability, a SPEAK edge, and a CLV track record are all still required.
 *
 * Pure functions, no I/O. All probabilities are in [0, 1] unless noted otherwise.
 */

import type { EdgeDecision, AnchorAgreement } from "./edge-engine.js";

// ── Line-move cause classifier ────────────────────────────────────────────────

/**
 * Named labels for the hypothesised CAUSE of a line move.
 *
 *   sharp-reverse         — line moved AGAINST the public majority (reverse-line
 *                           movement); consistent with sharp/professional action.
 *   steam                 — fast, large, directional, WITH the majority; consistent
 *                           with a sharp steam group or coordinated public move.
 *   news-reaction-candidate — large, fast move + dispersion spike; CANDIDATE for a
 *                           news reaction, but unconfirmed without a news feed.
 *   vig-rebalance         — small move, dispersion flat; book balancing its book.
 *   chop                  — high reversals; market undecided, no dominant thesis.
 *   indeterminate         — signals insufficient or contradictory; no hypothesis.
 */
export type LineMoveCauseLabel =
  | "sharp-reverse"
  | "steam"
  | "news-reaction-candidate"
  | "vig-rebalance"
  | "chop"
  | "indeterminate";

/**
 * Input facts for line-move cause classification — all computable from stored
 * odds history and publicly available ticket-split data.
 */
export interface LineMoveFacts {
  /** Signed net change in fair P(home), from first to last snapshot. */
  readonly netMove: number;
  /** Total path length (sum of absolute step deltas). */
  readonly pathLength: number;
  /**
   * Count of sign changes in consecutive non-zero step deltas.
   * A high count is the signature of "chop".
   */
  readonly reversals: number;
  /**
   * Change in cross-book dispersion from first to last snapshot
   * (positive = dispersion grew; negative = dispersion shrank).
   */
  readonly dispersionDelta: number;
  /**
   * True if the line moved in the same direction as the public majority
   * (ticket/handle split). False if it moved AGAINST the majority (sharp fade /
   * reverse-line movement). null/undefined when public data is unavailable.
   */
  readonly movedWithMajority?: boolean | null;
  /**
   * Hours remaining to game start at the time the move was observed.
   * null/undefined when unavailable.
   */
  readonly hoursToGame?: number | null;
}

/**
 * The hypothesis about what caused the line move, with a confidence in [0, 1]
 * and a hedged plain-language reasoning string.
 *
 * `isHypothesis: true` is a structural reminder — embedded directly in the type
 * so any downstream consumer sees the epistemological status without reading docs.
 */
export interface LineMoveCause {
  readonly cause: LineMoveCauseLabel;
  /**
   * Confidence in the hypothesis, 0–1. This is an observational strength score,
   * not a calibrated win probability — it reflects how strongly the movement
   * pattern matches the archetype, nothing more.
   */
  readonly confidence: number;
  /**
   * Hedged, honest reasoning string. Always starts with "consistent with…" or
   * "pattern suggests…" — never asserts certainty.
   */
  readonly reasoning: string;
  /** Structural honesty tag — this output is always a hypothesis, never a fact. */
  readonly isHypothesis: true;
}

// Named thresholds (documented for auditability and tunability).

/** Minimum |netMove| to consider a move "meaningful" for cause labelling. */
export const LM_MIN_MEANINGFUL_NET_MOVE = 0.02;
/** Minimum |netMove| for "steam" (large, fast, directional). */
export const LM_STEAM_MIN_NET_MOVE = 0.04;
/**
 * Minimum dispersion increase that, combined with a large move, suggests a
 * news-reaction candidate (sudden book disagreement = one book absorbing news first).
 */
export const LM_NEWS_DISPERSION_SPIKE = 0.015;
/** Maximum |netMove| for vig-rebalance (small-move category). */
export const LM_VIG_MAX_NET_MOVE = 0.015;
/** Maximum |dispersionDelta| for vig-rebalance (dispersion approximately flat). */
export const LM_VIG_MAX_DISPERSION_DELTA = 0.01;
/** Reversal count threshold for "chop". */
export const LM_CHOP_MIN_REVERSALS = 3;

/**
 * Classify the likely cause of a line move from its shape alone.
 * Every output is explicitly a hypothesis — we have no news ingestion.
 * "news-reaction-candidate" is labelled a CANDIDATE and explicitly states
 * the limitation.
 */
export function classifyLineMove(facts: LineMoveFacts): LineMoveCause {
  const absNet = Math.abs(facts.netMove);

  // ── Chop: high reversals → market is undecided ──
  if (facts.reversals >= LM_CHOP_MIN_REVERSALS) {
    return {
      cause: "chop",
      confidence: Math.min(0.8, 0.5 + (facts.reversals - LM_CHOP_MIN_REVERSALS) * 0.1),
      reasoning: `Pattern consistent with a choppy, undecided market: ${facts.reversals} reversals detected. No dominant directional thesis is readable from the movement shape alone.`,
      isHypothesis: true,
    };
  }

  // ── Sharp-reverse: meaningful move AGAINST the public majority ──
  if (facts.movedWithMajority === false && absNet >= LM_MIN_MEANINGFUL_NET_MOVE) {
    const conf = Math.min(0.85, 0.55 + absNet * 5);
    return {
      cause: "sharp-reverse",
      confidence: conf,
      reasoning: `Consistent with reverse-line movement (sharp/professional action): the line moved ${absNet.toFixed(4)} in the direction OPPOSITE to the public majority. Pattern suggests informed money fading the public, but cannot be confirmed without verified sharp-side data.`,
      isHypothesis: true,
    };
  }

  // ── News-reaction candidate: large move + meaningful dispersion spike ──
  // (book disagreement growing fast is consistent with one book pricing news before others)
  if (absNet >= LM_STEAM_MIN_NET_MOVE && facts.dispersionDelta >= LM_NEWS_DISPERSION_SPIKE) {
    return {
      cause: "news-reaction-candidate",
      confidence: 0.45,
      reasoning: `Consistent with a CANDIDATE news-reaction: large net move (${absNet.toFixed(4)}) accompanied by a dispersion spike (+${facts.dispersionDelta.toFixed(4)}), suggesting books re-priced at different speeds. IMPORTANT: this is unconfirmed — we cannot verify a news cause without a news-timestamp ingestion feed (K3). Do not treat this as a confirmed causal label.`,
      isHypothesis: true,
    };
  }

  // ── Steam: fast, large, directional, WITH the majority ──
  if (absNet >= LM_STEAM_MIN_NET_MOVE && facts.movedWithMajority !== false) {
    const withMajorityKnown = facts.movedWithMajority === true;
    const conf = withMajorityKnown ? 0.7 : 0.55;
    return {
      cause: "steam",
      confidence: conf,
      reasoning: `Pattern consistent with a steam move: large net movement (${absNet.toFixed(4)})${withMajorityKnown ? " in the same direction as the public majority" : ""}. Consistent with coordinated sharp or public action, but cannot be confirmed without verified ticket/handle data.`,
      isHypothesis: true,
    };
  }

  // ── Vig-rebalance: small move, dispersion approximately flat ──
  if (absNet <= LM_VIG_MAX_NET_MOVE && Math.abs(facts.dispersionDelta) <= LM_VIG_MAX_DISPERSION_DELTA) {
    return {
      cause: "vig-rebalance",
      confidence: 0.6,
      reasoning: `Pattern consistent with routine book-balancing: small net move (${absNet.toFixed(4)}) with flat dispersion (delta ${facts.dispersionDelta.toFixed(4)}). Suggests the book is adjusting for handle balance rather than reacting to new information.`,
      isHypothesis: true,
    };
  }

  // ── Indeterminate: signals are insufficient or contradictory ──
  return {
    cause: "indeterminate",
    confidence: 0,
    reasoning: `Movement pattern does not match any detectable archetype clearly: net move ${absNet.toFixed(4)}, ${facts.reversals} reversals, dispersion delta ${facts.dispersionDelta.toFixed(4)}. Labelling as indeterminate rather than forcing a hypothesis onto ambiguous signals.`,
    isHypothesis: true,
  };
}

// ── Anti-model / adversary pass ───────────────────────────────────────────────

/**
 * Input to the anti-model: all the facts about a shadow pick that an adversary
 * might use to argue it is NOT a real edge.
 */
export interface AntiModelInput {
  /**
   * Independent edge decision from assessEdge (edge-engine.ts).
   * PASS is the strongest hard falsifier.
   */
  readonly edgeDecision: EdgeDecision;
  /**
   * Independent-estimator agreement (from assessEdge).
   * CONTRADICTS is a hard falsifier: an independent estimator sides with the market.
   */
  readonly agreement: AnchorAgreement;
  /**
   * Whether a calibrated probability is available. When false, no certified
   * probability exists; combined with strong market gravity against us, this is
   * a hard falsifier.
   */
  readonly calibrated: boolean;
  /**
   * Market gravity pulling AGAINST our pick, 0–100 (from marketGravityIndex,
   * oriented so higher = more strongly against us). null when not computed.
   */
  readonly marketGravityAgainstUs?: number | null;
  /**
   * Historical CLV beat-rate on this segment, in [0, 1].
   * null when no history exists.
   */
  readonly clvBeatRate?: number | null;
  /** How many graded picks the CLV beat-rate covers. null when no history. */
  readonly clvSampleSize?: number | null;
  /**
   * Cross-book dispersion at pick time (from consensusNoVig), in [0, 1].
   * High dispersion means the market itself is unsure; this undermines our read.
   */
  readonly dispersion?: number | null;
}

/**
 * The anti-model's verdict: has the pick survived falsification, been weakened,
 * or been outright falsified?
 *
 *   FALSIFIED — a HARD falsifier holds: edge is PASS, an independent estimator
 *               CONTRADICTS us, or we are uncalibrated with strong gravity against.
 *               Honest conclusion: do not act on this pick.
 *   WEAKENED  — at least one SOFT falsifier holds (thin CLV, high dispersion,
 *               moderate gravity against). Honest conclusion: proceed with extra care,
 *               or wait for more evidence.
 *   SURVIVES  — no falsifier holds. Honest conclusion: necessary but NOT sufficient
 *               for a real edge; the sovereignty gate, calibration, and the CLV
 *               track record are still required.
 */
export type AntiModelVerdict = "FALSIFIED" | "WEAKENED" | "SURVIVES";

export interface AntiModelResult {
  readonly verdict: AntiModelVerdict;
  /**
   * All counter-arguments that held for this input.
   * Empty when the pick SURVIVES every falsification attempt.
   */
  readonly counterArguments: readonly string[];
  /**
   * The single most damaging counter-argument, or null when no falsifier held.
   * Useful for surfacing the most important objection in a display or log.
   */
  readonly strongestCounter: string | null;
  /**
   * Weight is always 0. The anti-model produces no confidence contribution and
   * is never priced into live scoring.
   */
  readonly weight: 0;
  /**
   * Honest reminder: surviving the anti-model is NECESSARY but NOT SUFFICIENT
   * for acting on a pick. Calibrated probability, a SPEAK edge, and a CLV
   * track record are all still required.
   */
  readonly survivingIsNotSufficient: true;
}

// Named thresholds for the anti-model.

/** Market gravity score (0–100, against us) above which we treat it as "strong". */
export const ANTI_STRONG_GRAVITY_THRESHOLD = 60;
/** CLV beat-rate below which we treat the record as "weak". */
export const ANTI_WEAK_CLV_BEAT_RATE = 0.5;
/** Minimum CLV sample to be considered meaningful evidence. */
export const ANTI_MIN_CLV_SAMPLE = 20;
/** Cross-book dispersion above which the market itself is "unsure". */
export const ANTI_HIGH_DISPERSION_THRESHOLD = 0.05;

/**
 * The adversary pass: systematically argue against our own shadow pick.
 *
 * The anti-model's JOB is to disprove the pick. If no falsifier holds, the pick
 * SURVIVES — but that is a floor, not a ceiling. The sovereignty gate and
 * calibration gate are still required before acting.
 */
export function antiModel(input: AntiModelInput): AntiModelResult {
  const counters: string[] = [];
  let hardFalsifierHeld = false;

  // ── Hard falsifiers ──

  // 1. Edge PASS: the independent engine sees no demonstrable edge — the honest default silence.
  if (input.edgeDecision === "PASS") {
    const c =
      "Edge decision is PASS — the independent engine sees no demonstrable edge. The honest default is silence; there is no certified basis to act.";
    counters.push(c);
    hardFalsifierHeld = true;
  }

  // 2. CONTRADICTS: an independent estimator sides with the market against us.
  if (input.agreement === "CONTRADICTS") {
    const c =
      "An independent estimator (Poisson / exchange) CONTRADICTS our read and sides with the sportsbook. Our model is the outlier; the disagreement is between our model and everyone else, not between us and a mispriced book.";
    counters.push(c);
    hardFalsifierHeld = true;
  }

  // 3. Uncalibrated + strong gravity against us (hard only in combination).
  const gravityAgainst = input.marketGravityAgainstUs ?? null;
  const strongGravityAgainst =
    typeof gravityAgainst === "number" &&
    Number.isFinite(gravityAgainst) &&
    gravityAgainst >= ANTI_STRONG_GRAVITY_THRESHOLD;

  if (!input.calibrated && strongGravityAgainst) {
    const c = `No calibrated probability exists AND market gravity of ${gravityAgainst} (≥${ANTI_STRONG_GRAVITY_THRESHOLD}) is pulling against our read. Without a certified probability we cannot claim our number is more accurate than the market's pull.`;
    counters.push(c);
    hardFalsifierHeld = true;
  }

  // ── Soft falsifiers (weaken, but do not alone falsify) ──

  // 4. Moderate gravity against us (when not already a hard falsifier above).
  if (!hardFalsifierHeld && strongGravityAgainst) {
    const c = `Market gravity of ${gravityAgainst} (≥${ANTI_STRONG_GRAVITY_THRESHOLD}) is pulling against our read. Consistent with the market having absorbed information we have not; warrants extra scrutiny before acting.`;
    counters.push(c);
  }

  // 5. Thin or weak CLV history.
  const clvRate = input.clvBeatRate ?? null;
  const clvN = input.clvSampleSize ?? 0;
  const hasClvHistory = typeof clvRate === "number" && Number.isFinite(clvRate);

  if (hasClvHistory && (clvRate! < ANTI_WEAK_CLV_BEAT_RATE || clvN < ANTI_MIN_CLV_SAMPLE)) {
    const c =
      clvN < ANTI_MIN_CLV_SAMPLE
        ? `CLV history is thin (n=${clvN}, minimum ${ANTI_MIN_CLV_SAMPLE}): too few graded picks to distinguish skill from variance on this segment.`
        : `CLV beat-rate of ${(clvRate! * 100).toFixed(1)}% is below the ${(ANTI_WEAK_CLV_BEAT_RATE * 100).toFixed(0)}% floor needed to support edge confidence — the track record argues against us.`;
    counters.push(c);
  }

  if (!hasClvHistory) {
    counters.push(
      "No CLV history on this segment: the claim to beat the close is unverified. CLV is the primary judge; without a track record there is no demonstrated ability to beat the closing line.",
    );
  }

  // 6. High cross-book dispersion: the market itself is unsure.
  const dispersion = input.dispersion ?? null;
  if (
    typeof dispersion === "number" &&
    Number.isFinite(dispersion) &&
    dispersion >= ANTI_HIGH_DISPERSION_THRESHOLD
  ) {
    counters.push(
      `Cross-book dispersion is ${dispersion.toFixed(4)} (≥${ANTI_HIGH_DISPERSION_THRESHOLD}): the market itself is unsure. High disagreement between books undermines any consensus read we derive from it.`,
    );
  }

  // ── Verdict ──
  let verdict: AntiModelVerdict;
  if (hardFalsifierHeld) {
    verdict = "FALSIFIED";
  } else if (counters.length > 0) {
    verdict = "WEAKENED";
  } else {
    verdict = "SURVIVES";
  }

  // Strongest counter: for FALSIFIED pick the first hard falsifier; otherwise the first soft one.
  const strongestCounter = counters.length > 0 ? (counters[0] ?? null) : null;

  return {
    verdict,
    counterArguments: counters,
    strongestCounter,
    weight: 0,
    survivingIsNotSufficient: true,
  };
}
