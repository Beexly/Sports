/**
 * GSE Evidence Engine — the generalized reasoning primitive.
 *
 * "GSE must think in evidence, not vibes." Every major recommendation in the
 * product — a player start/sit, a lineup, a draft pick, a trade, a waiver claim,
 * a bet/no-bet, a content claim, even a revenue experiment — is a CASE, not a
 * confidence badge. A case states a Claim, marshals Evidence for it, marshals
 * CounterEvidence against it, names the Falsifiers that would invalidate it, and
 * returns a Verdict — including the honest verdict of NO-PLAY.
 *
 * This GENERALIZES the existing Signal Courtroom
 * (`apps/web/lib/courtroom/courtroom.ts`), which is the betting-signal-specific
 * instance of the same doctrine. The Courtroom's `CourtroomBrief` maps onto a
 * Claim + Evidence[] + CounterEvidence[] + Falsifier[] + Verdict here.
 *
 * Companion doc: docs/research/GSE_2026_EVIDENCE_ENGINE.md
 */

import { type GseScore, makeScore, weightedAverage, clampScore } from "./gse-scoring-systems";

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary
// ─────────────────────────────────────────────────────────────────────────────

export type Strength = "weak" | "moderate" | "strong";

export type ClaimDomain =
  | "player"
  | "lineup"
  | "draft"
  | "trade"
  | "waiver"
  | "market"
  | "content"
  | "source"
  | "revenue"
  | "product";

export type EvidenceKind =
  | "structured_data" // odds, lines, box scores, snap counts
  | "model_output" // a projection / estimator
  | "market_signal" // line movement, consensus
  | "reported_fact" // injury status, confirmed news
  | "narrative" // beat-report sentiment, role talk (impact-limited)
  | "historical_base_rate";

export type ClaimStatus = "open" | "supported" | "contested" | "retired" | "flipped";

/** What a Verdict tells the user to do. No-play and watchlist are first-class. */
export type VerdictAction =
  | "play"
  | "start"
  | "draft"
  | "trade"
  | "waiver"
  | "optimize"
  | "no_play"
  | "watchlist"
  | "wait";

// ─────────────────────────────────────────────────────────────────────────────
// Objects
// ─────────────────────────────────────────────────────────────────────────────

export interface Claim {
  readonly claimId: string;
  readonly claimText: string;
  readonly domain: ClaimDomain;
  /** Entity references (player ids, game ids, source ids…). */
  readonly entityRefs: readonly string[];
  readonly status: ClaimStatus;
  /** Source ids backing the claim at the headline level. */
  readonly sourceRefs: readonly string[];
  /** Model-run ids that produced/inform the claim. */
  readonly modelRefs: readonly string[];
  /** ISO timestamp the claim's inputs were current as of. */
  readonly asOf: string;
}

export interface Evidence {
  readonly evidenceId: string;
  readonly supportsClaim: string;
  readonly kind: EvidenceKind;
  readonly strength: Strength;
  /** 0..100 reliability of the originating source. */
  readonly reliability: number;
  /** 0..1 freshness (1 = current, 0 = past its useful window). */
  readonly freshness: number;
  /** Independent of the other evidence on the claim? Correlated evidence is discounted. */
  readonly independent: boolean;
  readonly sourceId: string;
  readonly summary: string;
}

export interface CounterEvidence {
  readonly counterId: string;
  readonly challengesClaim: string;
  readonly severity: Strength;
  readonly kind: EvidenceKind;
  readonly reliability: number;
  readonly freshness: number;
  readonly sourceId: string;
  readonly summary: string;
}

export interface Falsifier {
  readonly falsifierId: string;
  readonly forClaim: string;
  /** The condition that, if it occurs, invalidates the claim. */
  readonly condition: string;
  /** 0..1 likelihood the condition occurs before the decision must be acted on. */
  readonly likelihood: number;
  /** Is there a live source watching for this condition? */
  readonly monitored: boolean;
  readonly monitoringSource?: string;
  /** Minutes until the decision must be committed (urgency). */
  readonly timeToActionMins: number;
  readonly actionIfTriggered: string;
}

export interface Verdict {
  readonly action: VerdictAction;
  readonly confidence: GseScore;
  readonly fragility: GseScore;
  readonly rationale: readonly string[];
  /** The single most likely thing that would change the verdict. */
  readonly whatWouldChange: string;
  readonly nextMonitoringStep: string;
  /** The honest alternative if the user declines the primary action. */
  readonly alternative: string;
}

export interface ReasoningTrace {
  readonly claim: Claim;
  readonly evidence: readonly Evidence[];
  readonly counterEvidence: readonly CounterEvidence[];
  readonly falsifiers: readonly Falsifier[];
  readonly verdict: Verdict;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

function strengthBase(s: Strength): number {
  switch (s) {
    case "weak":
      return 0.3;
    case "moderate":
      return 0.6;
    case "strong":
      return 0.85;
  }
}

/** Noisy-OR combination of independent probabilities — rewards multiple
 *  independent pieces while saturating, instead of naive summation. */
function noisyOr(probs: readonly number[]): number {
  let inv = 1;
  for (const p of probs) inv *= 1 - Math.max(0, Math.min(1, p));
  return 1 - inv;
}

/**
 * Score the supporting case behind a claim (0..100, higher is better).
 * Correlated (non-independent) evidence is discounted to avoid echo-chamber
 * inflation — three reports of the same tweet are not three independent facts.
 */
export function scoreEvidenceStrength(evidence: readonly Evidence[]): GseScore {
  const flags: string[] = [];
  if (evidence.length === 0) {
    return makeScore("evidence_strength", 0, {
      confidence: "speculative",
      rationale: ["no evidence on the claim"],
      flags: ["empty evidence set — claim is unsupported"],
    });
  }

  const independentCount = evidence.filter((e) => e.independent).length;
  if (independentCount === 0) flags.push("no independent evidence — all sources may be correlated");

  const contributions = evidence.map((e) => {
    const base = strengthBase(e.strength);
    const rel = clampScore(e.reliability) / 100;
    const fresh = Math.max(0, Math.min(1, e.freshness));
    const independenceFactor = e.independent ? 1 : 0.4;
    if (e.freshness < 0.34) flags.push(`stale evidence: ${e.evidenceId}`);
    return base * rel * fresh * independenceFactor;
  });

  const combined = noisyOr(contributions) * 100;

  const confidence =
    independentCount >= 2 ? "well_supported" : independentCount === 1 ? "supported" : "tentative";

  return makeScore("evidence_strength", combined, {
    confidence,
    rationale: [
      `${evidence.length} piece(s), ${independentCount} independent`,
      `strongest: ${evidence.reduce((m, e) => (strengthBase(e.strength) > strengthBase(m.strength) ? e : m)).strength}`,
    ],
    flags,
  });
}

/** Score how damaging the counter-case is (0..100, higher is RISKIER). */
export function scoreCounterEvidenceSeverity(counter: readonly CounterEvidence[]): GseScore {
  if (counter.length === 0) {
    return makeScore("counter_evidence_severity", 0, {
      confidence: "supported",
      rationale: ["no counter-evidence recorded"],
      flags: [],
    });
  }
  const contributions = counter.map((c) => {
    const base = strengthBase(c.severity);
    const rel = clampScore(c.reliability) / 100;
    const fresh = Math.max(0, Math.min(1, c.freshness));
    return base * rel * fresh;
  });
  const combined = noisyOr(contributions) * 100;
  const flags: string[] = [];
  if (combined >= 60) flags.push("a strong counter-case is live — verdict should reflect it");

  return makeScore("counter_evidence_severity", combined, {
    confidence: "supported",
    rationale: [`${counter.length} counter-point(s)`, `peak severity ${counter.reduce((m, c) => (strengthBase(c.severity) > strengthBase(m.severity) ? c : m)).severity}`],
    flags,
  });
}

/** Score the risk a known falsifier flips the call before action (0..100, higher is RISKIER). */
export function scoreFalsifierRisk(falsifiers: readonly Falsifier[]): GseScore {
  if (falsifiers.length === 0) {
    return makeScore("falsifier_risk", 10, {
      confidence: "tentative",
      rationale: ["no falsifiers named"],
      flags: ["no falsifiers named — either robust or under-analysed"],
    });
  }
  const flags: string[] = [];
  const contributions = falsifiers.map((f) => {
    const monitoredFactor = f.monitored ? 0.6 : 1; // unmonitored risk hurts more
    // Short time-to-action concentrates risk (less time to react to the falsifier).
    const urgency = f.timeToActionMins <= 30 ? 1.15 : f.timeToActionMins <= 180 ? 1.0 : 0.85;
    if (!f.monitored) flags.push(`unmonitored falsifier: ${f.condition}`);
    return Math.max(0, Math.min(1, f.likelihood * monitoredFactor * urgency));
  });
  const combined = noisyOr(contributions) * 100;

  return makeScore("falsifier_risk", combined, {
    confidence: "supported",
    rationale: [
      `${falsifiers.length} falsifier(s), ${falsifiers.filter((f) => !f.monitored).length} unmonitored`,
      `peak likelihood ${(Math.max(...falsifiers.map((f) => f.likelihood)) * 100).toFixed(0)}%`,
    ],
    flags,
  });
}

export interface RecommendationInputs {
  readonly evidenceStrength: GseScore;
  readonly counterSeverity: GseScore;
  readonly falsifierRisk: GseScore;
  /** Data-quality score of the inputs (0..100). */
  readonly dataQuality: number;
  /** 0..1 agreement across independent models. */
  readonly modelAgreement: number;
}

/**
 * Compose the net, calibrated confidence in a recommendation (0..100, higher is
 * better). This is PROCESS confidence — never a win probability. Strong
 * counter-evidence and live falsifiers pull it down multiplicatively, so a
 * recommendation can never look confident while its own case is under attack.
 */
export function scoreRecommendationConfidence(inp: RecommendationInputs): GseScore {
  const base = weightedAverage([
    { value: inp.evidenceStrength.score, weight: 2.5 },
    { value: clampScore(inp.dataQuality), weight: 1.5 },
    { value: Math.max(0, Math.min(1, inp.modelAgreement)) * 100, weight: 1.0 },
  ]);
  const counterPenalty = 1 - 0.5 * (inp.counterSeverity.score / 100);
  const falsifierPenalty = 1 - 0.4 * (inp.falsifierRisk.score / 100);
  const score = base * counterPenalty * falsifierPenalty;

  const flags: string[] = [];
  if (inp.counterSeverity.score >= 60) flags.push("confidence tempered by a strong counter-case");
  if (inp.falsifierRisk.score >= 60) flags.push("confidence tempered by live falsifier risk");
  if (inp.evidenceStrength.score < 40) flags.push("thin supporting evidence");

  return makeScore("recommendation_confidence", score, {
    confidence:
      inp.evidenceStrength.confidence === "well_supported" && inp.dataQuality >= 60
        ? "well_supported"
        : "supported",
    rationale: [
      `evidence ${inp.evidenceStrength.score}`,
      `counter ${inp.counterSeverity.score}`,
      `falsifier ${inp.falsifierRisk.score}`,
      `data ${clampScore(inp.dataQuality)}`,
      `model agreement ${(inp.modelAgreement * 100).toFixed(0)}%`,
    ],
    flags,
  });
}

export interface FragilityInputs {
  readonly falsifierRisk: GseScore;
  readonly counterSeverity: GseScore;
  /** 0..1 freshness of the freshest decisive input. */
  readonly inputFreshness: number;
  /** 0..1 share of evidence that is independent. */
  readonly evidenceIndependence: number;
  readonly timeToActionMins: number;
}

/**
 * Score how easily ONE shock breaks the decision (0..100, higher is RISKIER).
 * Distinct from confidence: a confident call resting on one unmonitored
 * falsifier is fragile; a moderate call with three independent supports is not.
 */
export function scoreDecisionFragility(inp: FragilityInputs): GseScore {
  const staleness = (1 - Math.max(0, Math.min(1, inp.inputFreshness))) * 100;
  const concentration = (1 - Math.max(0, Math.min(1, inp.evidenceIndependence))) * 100;
  const urgency = inp.timeToActionMins <= 30 ? 70 : inp.timeToActionMins <= 180 ? 45 : 20;

  const score = weightedAverage([
    { value: inp.falsifierRisk.score, weight: 2.5 },
    { value: inp.counterSeverity.score, weight: 1.5 },
    { value: staleness, weight: 1.0 },
    { value: concentration, weight: 1.5 },
    { value: urgency, weight: 0.5 },
  ]);

  const flags: string[] = [];
  if (concentration >= 60) flags.push("evidence concentrated in correlated sources");
  if (inp.inputFreshness < 0.34) flags.push("decisive input is stale");

  return makeScore("decision_fragility", score, {
    confidence: "supported",
    rationale: [
      `falsifier risk ${inp.falsifierRisk.score}`,
      `counter ${inp.counterSeverity.score}`,
      `independence ${(inp.evidenceIndependence * 100).toFixed(0)}%`,
    ],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Verdict composition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose a Verdict from a full case. Maps confidence + fragility into an
 * action, defaulting to the honest NO-PLAY / WATCHLIST paths when the case does
 * not survive its own cross-examination. `primaryAction` is the domain's
 * affirmative verb (start/draft/trade/…); we downgrade it, never upgrade it.
 */
export function buildVerdict(
  primaryAction: Exclude<VerdictAction, "no_play" | "watchlist" | "wait">,
  confidence: GseScore,
  fragility: GseScore,
  opts: { whatWouldChange: string; nextMonitoringStep: string; alternative: string },
): Verdict {
  let action: VerdictAction = primaryAction;
  const rationale: string[] = [
    `confidence ${confidence.score} (${confidence.band})`,
    `fragility ${fragility.score} (${fragility.band})`,
  ];

  if (confidence.score < 35) {
    action = "no_play";
    rationale.push("confidence below the action floor — the honest call is to pass");
  } else if (fragility.score >= 70) {
    action = "watchlist";
    rationale.push("edge exists but one shock breaks it — watchlist until a falsifier resolves");
  } else if (confidence.score < 55) {
    action = "watchlist";
    rationale.push("moderate confidence — hold for confirmation");
  }

  return {
    action,
    confidence,
    fragility,
    rationale,
    whatWouldChange: opts.whatWouldChange,
    nextMonitoringStep: opts.nextMonitoringStep,
    alternative: opts.alternative,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable courtroom templates (one per decision type)
// ─────────────────────────────────────────────────────────────────────────────

export interface CourtroomTemplate {
  readonly id: string;
  readonly domain: ClaimDomain;
  readonly label: string;
  /** The shape of the claim this template argues. */
  readonly claimShape: string;
  readonly keyEvidence: readonly EvidenceKind[];
  readonly keyCounterEvidence: readonly string[];
  readonly typicalFalsifiers: readonly string[];
  /** The honest pass path for this decision type. */
  readonly noPlayPath: string;
}

export const COURTROOM_TEMPLATES: readonly CourtroomTemplate[] = [
  {
    id: "player_recommendation",
    domain: "player",
    label: "Player start/sit recommendation",
    claimShape: "Player X is a [start|sit] this week given role, matchup, and projected volume.",
    keyEvidence: ["structured_data", "model_output", "reported_fact"],
    keyCounterEvidence: ["committee backfield risk", "negative game script", "questionable status"],
    typicalFalsifiers: ["downgrade to OUT before lock", "snap-share role change confirmed inactive"],
    noPlayPath: "Bench / flex alternative when role volatility is unresolved.",
  },
  {
    id: "lineup_recommendation",
    domain: "lineup",
    label: "DFS/season lineup construction",
    claimShape: "This lineup maximizes expected points per unit of correlated risk for the slate.",
    keyEvidence: ["model_output", "market_signal", "structured_data"],
    keyCounterEvidence: ["over-exposed to one game stack", "chalk leverage misjudged", "stale ownership read"],
    typicalFalsifiers: ["late inactive in the core stack", "weather flips a total"],
    noPlayPath: "Reduce exposure / sit the slate when the core is too fragile.",
  },
  {
    id: "draft_pick",
    domain: "draft",
    label: "Draft pick recommendation",
    claimShape: "At this pick, Player X has the best value over replacement given roster needs.",
    keyEvidence: ["historical_base_rate", "model_output", "structured_data"],
    keyCounterEvidence: ["positional run incoming", "injury history", "manager-genome reach risk"],
    typicalFalsifiers: ["a higher-VOR player falls to next pick", "news drops mid-draft"],
    noPlayPath: "Best-player-available pivot when need-reaching would cost too much value.",
  },
  {
    id: "trade",
    domain: "trade",
    label: "Trade evaluation",
    claimShape: "This trade improves the roster's championship equity, not just its name value.",
    keyEvidence: ["model_output", "historical_base_rate", "structured_data"],
    keyCounterEvidence: ["selling low on a dip", "schedule-adjusted value gap", "positional scarcity ignored"],
    typicalFalsifiers: ["injury news on either side before acceptance", "bye-week math changes"],
    noPlayPath: "Decline / counter when equity gain is inside the noise band.",
  },
  {
    id: "waiver",
    domain: "waiver",
    label: "Waiver claim recommendation",
    claimShape: "Player X is worth $Y of FAAB given opportunity change and roster fit.",
    keyEvidence: ["reported_fact", "structured_data", "narrative"],
    keyCounterEvidence: ["role is a one-week mirage", "crowded depth chart", "FAAB overpay risk"],
    typicalFalsifiers: ["starter returns from injury", "coach walks back the role talk"],
    noPlayPath: "Pass / minimal bid when the opportunity signal is unconfirmed.",
  },
  {
    id: "bet_no_bet",
    domain: "market",
    label: "Bet / no-bet signal (Signal Courtroom)",
    claimShape: "Side/total X carries a measurable edge over the closing price.",
    keyEvidence: ["market_signal", "model_output", "structured_data"],
    keyCounterEvidence: ["public already priced it", "thin closing-line history", "single questionable status upstream"],
    typicalFalsifiers: ["status downgraded before lock", "line moves on public action not information"],
    noPlayPath: "NO-PLAY when nothing independent survives cross-examination.",
  },
  {
    id: "content_claim",
    domain: "content",
    label: "Content / GSN claim verification",
    claimShape: "This published statement is data-backed and within source rights.",
    keyEvidence: ["structured_data", "reported_fact", "historical_base_rate"],
    keyCounterEvidence: ["unsupported causal language", "stale stat", "rights-restricted source"],
    typicalFalsifiers: ["source contradicts the stat", "banned-phrase scanner hit"],
    noPlayPath: "Do not publish until the claim maps to an approved trust-claim.",
  },
  {
    id: "source_dispute",
    domain: "source",
    label: "Source dispute resolution",
    claimShape: "When sources disagree, source A is more reliable on this fact than source B.",
    keyEvidence: ["historical_base_rate", "reported_fact"],
    keyCounterEvidence: ["A is stale", "B has higher domain accuracy", "neither is independent"],
    typicalFalsifiers: ["a third independent source confirms B", "official ruling settles it"],
    noPlayPath: "Mark contradicted + hold the claim until a tiebreaker arrives.",
  },
  {
    id: "revenue_experiment",
    domain: "revenue",
    label: "Revenue experiment go/no-go",
    claimShape: "This pricing/funnel change increases value without eroding trust.",
    keyEvidence: ["historical_base_rate", "model_output"],
    keyCounterEvidence: ["trust risk in the copy", "sample too small", "novelty effect"],
    typicalFalsifiers: ["churn or refund rate rises", "banned-language regression"],
    noPlayPath: "Do not ship when the trust cost outweighs the modeled lift.",
  },
  {
    id: "product_launch",
    domain: "product",
    label: "Product launch readiness",
    claimShape: "This feature is ready across all ten launch gates.",
    keyEvidence: ["structured_data", "model_output"],
    keyCounterEvidence: ["a blocking gate is red", "data not ready", "rights unclear"],
    typicalFalsifiers: ["accessibility regression", "source-rights dispute opens"],
    noPlayPath: "Hold launch when any blocking gate (legal/data/trust) is unmet.",
  },
] as const;

/** Look up a courtroom template by id. */
export function getCourtroomTemplate(id: string): CourtroomTemplate | undefined {
  return COURTROOM_TEMPLATES.find((t) => t.id === id);
}
