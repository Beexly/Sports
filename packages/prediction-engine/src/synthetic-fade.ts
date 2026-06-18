/**
 * Synthetic public-lean / fade signal — the honest, glass-box reframe of the
 * "agent-swarm crowd simulation" idea (cf. MiroFish), built for GSN's rules.
 *
 * WHY THIS EXISTS
 * Sharps care about which side the PUBLIC piles onto, because public money
 * inflates the popular side's price — the value is often the other way (the
 * "fade"). The swarm approach estimates that lean by simulating thousands of
 * opaque LLM personas. That is expensive, uncalibrated, and unauditable. We get
 * the SAME signal the glass-box way: a transparent weighted proxy over PUBLIC
 * FACTS that are known to attract casual money (favouritism, team popularity,
 * primetime spotlight, a star storyline). Same signal, deterministic, testable.
 *
 * HARD GUARDRAILS (identical posture to narrative-signal.ts):
 *   - This is a MODEL OUTPUT, never a stat. It is NEVER presented as real betting
 *     handle ("X% of the public is on …"). Every surfacing must be labelled
 *     `LABEL` below ("simulated audience model — not betting data").
 *   - It NEVER originates a pick and is never cited as public provenance.
 *   - It folds into edge ONLY as a SMALL, HARD-CAPPED nudge (≤ MAX_FADE_NUDGE)
 *     with low confidence (≤ MAX_CONFIDENCE) — structured market data stays the
 *     source of truth.
 *   - EXPERIMENTAL + gated OFF: it must demonstrate CLV correlation on a
 *     walk-forward backtest before a founder-gated MODEL_VERSION step lets it
 *     touch any published number. Until then it is cockpit-only.
 *
 * Pure functions, no I/O — fully unit-testable. Inputs are structured public
 * facts only; this module infers nothing about health, injuries, or private life.
 */

/** Hard cap on the edge nudge (probability points). Matches the narrative ±0.01 valve. */
export const MAX_FADE_NUDGE = 0.01;
/** Hard cap on the signal's confidence — it can inform, never carry. */
export const MAX_CONFIDENCE = 0.2;
/** Required label whenever this signal is surfaced anywhere. */
export const SYNTHETIC_FADE_LABEL = "simulated audience model — not betting data";

/** Public-attractor facts for ONE side of a market. All optional; absent = neutral. */
export interface PublicLeanInput {
  /** The side's market-implied probability (0–1). The public backs favourites. */
  readonly marketImpliedProb?: number;
  /** Marquee / large-market / nationally-followed team. */
  readonly isPopularTeam?: boolean;
  /** Nationally televised / primetime slot — amplifies casual action. */
  readonly isPrimetime?: boolean;
  /** A prominent star or storyline drawing narrative attention to this side. */
  readonly hasStarNarrative?: boolean;
  /** Optional media-lean toward this side in [-1, 1] (e.g. from narrative-signal). */
  readonly mediaLean?: number;
}

export interface FadeContribution {
  readonly factor: string;
  /** Signed push toward this side's public lean, before weighting. */
  readonly value: number;
  readonly weight: number;
}

export interface SyntheticPublicLean {
  /** How heavily the public is modelled to lean onto THIS side, in [-1, 1]. */
  readonly leanIndex: number;
  /**
   * Capped edge nudge to APPLY TO THIS SIDE, in [-MAX_FADE_NUDGE, +MAX_FADE_NUDGE].
   * Negative when the public is heavy on this side (fade it); ~0 when balanced.
   */
  readonly fadeNudge: number;
  /** Signal confidence in [0, MAX_CONFIDENCE]. */
  readonly confidence: number;
  /** Glass-box attribution of the lean. */
  readonly contributions: readonly FadeContribution[];
  /** Mandatory display label — must propagate to every surface. */
  readonly label: string;
}

// Weights over the public-attractor features (sum to 1). Documented heuristics,
// not fitted — the whole signal is gated OFF until backtested.
const W_FAVOURITE = 0.4;
const W_POPULAR = 0.25;
const W_PRIMETIME = 0.15;
const W_STAR = 0.1;
const W_MEDIA = 0.1;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function round(v: number, d = 4): number {
  const s = 10 ** d;
  const r = Math.round(v * s) / s;
  return r === 0 ? 0 : r; // normalise -0 → 0 so signed-zero never leaks into output
}

/**
 * Estimate how heavily the public leans onto a side, and the capped contrarian
 * (fade) nudge. Transparent weighted proxy — no swarm, no fabricated handle.
 */
export function syntheticPublicLean(input: PublicLeanInput): SyntheticPublicLean {
  // Favouritism: public backs favourites. Map implied prob (0–1) → lean (−1…+1).
  const favLean =
    typeof input.marketImpliedProb === "number" && Number.isFinite(input.marketImpliedProb)
      ? clamp((clamp(input.marketImpliedProb, 0, 1) - 0.5) * 2, -1, 1)
      : 0;
  const popLean = input.isPopularTeam ? 1 : 0;
  const primeLean = input.isPrimetime ? 1 : 0;
  const starLean = input.hasStarNarrative ? 1 : 0;
  const mediaLean =
    typeof input.mediaLean === "number" && Number.isFinite(input.mediaLean)
      ? clamp(input.mediaLean, -1, 1)
      : 0;

  const contributions: FadeContribution[] = [
    { factor: "favouritism", value: round(favLean), weight: W_FAVOURITE },
    { factor: "team_popularity", value: popLean, weight: W_POPULAR },
    { factor: "primetime_spotlight", value: primeLean, weight: W_PRIMETIME },
    { factor: "star_narrative", value: starLean, weight: W_STAR },
    { factor: "media_lean", value: round(mediaLean), weight: W_MEDIA },
  ];

  const leanIndex = clamp(
    contributions.reduce((acc, c) => acc + c.value * c.weight, 0),
    -1,
    1,
  );

  // Fade: lean the OTHER way, scaled into the hard cap.
  const fadeNudge = clamp(-leanIndex * MAX_FADE_NUDGE, -MAX_FADE_NUDGE, MAX_FADE_NUDGE);
  const confidence = clamp(Math.abs(leanIndex) * MAX_CONFIDENCE, 0, MAX_CONFIDENCE);

  return {
    leanIndex: round(leanIndex),
    fadeNudge: round(fadeNudge, 5),
    confidence: round(confidence),
    contributions,
    label: SYNTHETIC_FADE_LABEL,
  };
}
