/**
 * Bias Mirror — responsible gaming as a living, protective layer.
 *
 * A private self-reflection: the user rates a few honest tendencies and the
 * Mirror returns a decision-behaviour profile + calm, protective guidance and a
 * recommended mode. The tone is calm, precise, protective — never shaming, never
 * predatory. It reflects the user's OWN self-reported inputs (no tracking, no
 * fabricated data); everything is computed locally and nothing is sent or stored.
 */

export type BiasKey = "chase" | "favorite" | "nobet" | "parlay" | "timing" | "narrative" | "riskblind";

export type BiasDimension = {
  readonly key: BiasKey;
  readonly label: string;
  /** The self-reflection prompt. Phrased so HIGHER = more risk. */
  readonly prompt: string;
  /** Surfaced when this tendency is elevated (calm, non-shaming). */
  readonly pattern: string;
  /** Surfaced when this tendency is low — a genuine strength. */
  readonly strength: string;
  /** Protective, concrete guidance when elevated. */
  readonly guidance: string;
};

export const DIMENSIONS: readonly BiasDimension[] = [
  {
    key: "chase",
    label: "Loss chasing",
    prompt: "After a loss, I quickly place another bet to win it back.",
    pattern: "Your answers show elevated chase risk: the urge to recover a loss right away.",
    strength: "You don't chase losses. That's the hardest discipline, and you have it.",
    guidance: "Set a hard stop after a loss: no same-session re-bet. The recovery bet is the most expensive one.",
  },
  {
    key: "favorite",
    label: "Favourite bias",
    prompt: "I back my favourite team even when the edge isn't there.",
    pattern: "You lean on your favourite team regardless of the read: loyalty is leaking into the ledger.",
    strength: "You separate fandom from the bet: you back the edge, not the jersey.",
    guidance: "When a play involves your team, demand a higher bar of evidence, or sit it out entirely.",
  },
  {
    key: "nobet",
    label: "No-Bet discipline",
    prompt: "When the read says No-Bet, I bet anyway.",
    pattern: "You override No-Bet calls. The silence is a signal, and you're talking over it.",
    strength: "You respect No-Bet: restraint is treated as a real outcome, not a boring one.",
    guidance: "Treat No-Bet as a win. The slates you skip protect the bankroll for the ones worth playing.",
  },
  {
    key: "parlay",
    label: "Over-parlaying",
    prompt: "I reach for multi-leg parlays over single bets.",
    pattern: "You favour multi-leg parlays: the multiplied payout is the multiplied risk.",
    strength: "You prefer clean single-market plays over stacked parlays.",
    guidance: "Run tickets through the Parlay MRI first. Most stacks are the vig compounding. Convert to singles.",
  },
  {
    key: "timing",
    label: "Emotional timing",
    prompt: "I bet more late at night or right after a bad beat.",
    pattern: "Your plays cluster late at night or right after a bad beat: emotional timing, not edge timing.",
    strength: "Your timing is steady: you don't bet on tilt or fatigue.",
    guidance: "Add a cool-down rule: no new plays within an hour of a bad beat, or after midnight.",
  },
  {
    key: "narrative",
    label: "Narrative pull",
    prompt: "A hot take or social post can change my pick.",
    pattern: "Outside narratives move your picks: the crowd's story is overwriting your read.",
    strength: "You hold your read against the noise: narratives don't move you.",
    guidance: "Decide before you scroll. If a post changes your pick, that's the public bias, not new evidence.",
  },
  {
    key: "riskblind",
    label: "Risk-flag blindness",
    prompt: "I read the confidence number but skip the risk flags.",
    pattern: "You read the confidence and skip the risk flags. Confidence is not evidence.",
    strength: "You read the whole case: confidence and the risk flags together.",
    guidance: "Always read the risk flags before the number. A high-confidence play with a live falsifier is fragile.",
  },
];

export type BiasMode = "Standard" | "Watch Mode" | "Cool-down";

export type BiasProfile = {
  readonly overall: number; // 0..1 composite risk
  readonly mode: BiasMode;
  readonly modeBlurb: string;
  readonly patterns: readonly { key: BiasKey; label: string; text: string }[];
  readonly strengths: readonly { key: BiasKey; label: string; text: string }[];
  readonly guidance: readonly string[];
};

const ELEVATED = 0.6;
const LOW = 0.3;

export const MODE_HEX: Record<BiasMode, string> = {
  Standard: "#00E5FF",
  "Watch Mode": "#7B61FF",
  "Cool-down": "#FF38C7",
};

export function computeProfile(answers: Record<BiasKey, number>): BiasProfile {
  const values = DIMENSIONS.map((d) => answers[d.key] ?? 0);
  const overall = values.reduce((a, b) => a + b, 0) / DIMENSIONS.length;

  let mode: BiasMode;
  let modeBlurb: string;
  if (overall < 0.33) {
    mode = "Standard";
    modeBlurb = "You're reading risk well. Keep your stakes flat and your No-Bets honest.";
  } else if (overall < 0.6) {
    mode = "Watch Mode";
    modeBlurb = "Slow down on this slate: single-market plays, smaller stakes, and skip the chase.";
  } else {
    mode = "Cool-down";
    modeBlurb = "The strongest move today is restraint. Step back; the slate will still be here tomorrow.";
  }

  const patterns: { key: BiasKey; label: string; text: string }[] = [];
  const strengths: { key: BiasKey; label: string; text: string }[] = [];
  const guidance: string[] = [];
  for (const d of DIMENSIONS) {
    const v = answers[d.key] ?? 0;
    if (v >= ELEVATED) {
      patterns.push({ key: d.key, label: d.label, text: d.pattern });
      guidance.push(d.guidance);
    } else if (v <= LOW) {
      strengths.push({ key: d.key, label: d.label, text: d.strength });
    }
  }
  if (!patterns.length && !guidance.length) {
    guidance.push("No elevated tendencies surfaced: your profile reads disciplined. Keep checking back in honestly.");
  }

  return { overall, mode, modeBlurb, patterns, strengths, guidance };
}

/** A neutral starting point — slightly below the midpoint, so the user adjusts up where true. */
export const DEFAULT_ANSWERS: Record<BiasKey, number> = {
  chase: 0.35, favorite: 0.35, nobet: 0.3, parlay: 0.4, timing: 0.35, narrative: 0.35, riskblind: 0.4,
};
