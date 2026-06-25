/**
 * GSE GALILEO — Narrative Gravity Index (Invention 7).
 *
 * The ATTENTION STATE. Markets are pulled not only by reality but by where the public is
 * looking: primetime, star players, fantasy relevance, injury panic, media repetition, social
 * velocity, revenge games, must-win narratives. When a line moves more than the flesh-state
 * change justifies, the move may be ATTENTION pressure, not information — and attention-driven
 * moves are where over-correction and public shade live.
 *
 * Data sources (news/social) come later. This ships the TYPE SYSTEM and SCORING INTERFACE now,
 * plus the key comparator: is an observed line move more consistent with attention than with
 * role/flesh-state change? Pure; every numeric input is documented as 0..1.
 */

export interface NarrativeSignals {
  /** All fields are 0 (none) → 1 (extreme). Unknown signals should be 0, not guessed. */
  readonly playerPublicAttention: number;
  readonly teamPublicAttention: number;
  readonly primetimeAttention: number;
  readonly fantasyAttention: number;
  readonly injuryPanic: number;
  readonly mediaRepetition: number;
  readonly socialVelocity: number;
  readonly starPlayerBias: number;
  readonly rookieHype: number;
  readonly revengeGameNarrative: number;
  readonly playoffMustWinNarrative: number;
}

export interface NarrativeGravity {
  /** Composite 0..1 attention pull. */
  readonly index: number;
  /** The dominant contributing signals, ranked. */
  readonly topDrivers: ReadonlyArray<{ signal: keyof NarrativeSignals; value: number }>;
  /** Data completeness 0..1 (how many signals were actually populated, not defaulted). */
  readonly coverage: number;
}

const WEIGHTS: Record<keyof NarrativeSignals, number> = {
  playerPublicAttention: 1.0,
  teamPublicAttention: 0.7,
  primetimeAttention: 0.9,
  fantasyAttention: 0.8,
  injuryPanic: 1.0,
  mediaRepetition: 0.6,
  socialVelocity: 0.9,
  starPlayerBias: 1.0,
  rookieHype: 0.7,
  revengeGameNarrative: 0.5,
  playoffMustWinNarrative: 0.6,
};

const ZERO: NarrativeSignals = {
  playerPublicAttention: 0, teamPublicAttention: 0, primetimeAttention: 0, fantasyAttention: 0,
  injuryPanic: 0, mediaRepetition: 0, socialVelocity: 0, starPlayerBias: 0, rookieHype: 0,
  revengeGameNarrative: 0, playoffMustWinNarrative: 0,
};

/** Score the composite narrative gravity. Missing signals default to 0 and lower coverage. */
export function scoreNarrativeGravity(partial: Partial<NarrativeSignals>): NarrativeGravity {
  const signals = { ...ZERO, ...partial };
  const keys = Object.keys(WEIGHTS) as Array<keyof NarrativeSignals>;
  const populated = keys.filter((k) => partial[k] != null);
  // Normalize over POPULATED signals only — unmeasured signals lower `coverage`, not the index.
  let weighted = 0;
  let weightSum = 0;
  for (const k of populated) {
    weighted += signals[k] * WEIGHTS[k];
    weightSum += WEIGHTS[k];
  }
  const index = weightSum > 0 ? Math.min(1, weighted / weightSum) : 0;
  const topDrivers = keys
    .map((signal) => ({ signal, value: signals[signal] }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value * WEIGHTS[b.signal] - a.value * WEIGHTS[a.signal])
    .slice(0, 3);
  return { index, topDrivers, coverage: populated.length / keys.length };
}

export type NarrativeVsRealityVerdict =
  | "attention_driven"
  | "reality_driven"
  | "mixed"
  | "insufficient_data";

export interface NarrativeVsReality {
  readonly verdict: NarrativeVsRealityVerdict;
  readonly attentionPressure: number;
  readonly realityPressure: number;
  readonly note: string;
}

/**
 * Compare an observed line move's magnitude (normalized 0..1) against the narrative gravity and
 * the flesh-state change that would justify it (0..1). If attention is high and flesh-state
 * change is low while the line still moved, the move is attention-driven — an over-correction
 * candidate. Heuristic and explicitly labelled as such until news data backs it.
 */
export function classifyMoveDriver(args: {
  observedMoveNorm: number;
  narrative: NarrativeGravity;
  fleshStateChangeNorm: number;
}): NarrativeVsReality {
  const { observedMoveNorm, narrative, fleshStateChangeNorm } = args;
  if (narrative.coverage < 0.25) {
    return { verdict: "insufficient_data", attentionPressure: narrative.index, realityPressure: fleshStateChangeNorm, note: "Narrative coverage too low to judge; collect attention data." };
  }
  const attentionPressure = narrative.index * observedMoveNorm;
  const realityPressure = fleshStateChangeNorm;
  if (attentionPressure > realityPressure + 0.2) {
    return { verdict: "attention_driven", attentionPressure, realityPressure, note: "Move exceeds the flesh-state change and aligns with attention — over-correction candidate." };
  }
  if (realityPressure > attentionPressure + 0.2) {
    return { verdict: "reality_driven", attentionPressure, realityPressure, note: "Move is justified by the underlying state change." };
  }
  return { verdict: "mixed", attentionPressure, realityPressure, note: "Attention and reality both plausibly drive the move." };
}
