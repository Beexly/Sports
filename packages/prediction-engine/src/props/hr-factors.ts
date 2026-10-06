/**
 * Home-run prop factors — the data side of the HR-hitter prompt pack.
 *
 * WHAT THIS IS
 * The 2026-06-28 @thelocktalk save ("3 AI prompts for likely home-run hitters")
 * frames HR likelihood as power × pitcher-vulnerability × park × wind. The
 * prompts themselves live in the agent layer; this module wires the NUMBERS the
 * prompts (and any engine consumer) use into one place, so the agent and the
 * engine never disagree about the inputs.
 *
 * Output is a *feature vector + tilt index*, not a probability model: each
 * component is normalized to [0,1] against documented league-average anchors,
 * the tilt is a fixed-weight blend, and every component's contribution is
 * exposed for audit. No learned weights, no black box — the weighting is the
 * documented prior; calibration against graded lines happens in the eval layer
 * (see prereg-eval), never by silently tuning here.
 */

export interface HrPowerInputs {
  /** Barrels per plate appearance. League avg ≈ 0.065. */
  readonly barrelsPerPA: number;
  /** Hard-hit %. League avg ≈ 0.38. */
  readonly hardHitPct: number;
  /** Sweet-spot launch-angle %. League avg ≈ 0.33. */
  readonly sweetSpotPct: number;
}

export interface HrPitcherInputs {
  /** HR/9 allowed. League avg ≈ 1.15. Lower is better for the pitcher. */
  readonly hrPer9: number;
  /** Fly-ball %. League avg ≈ 0.36. */
  readonly flyBallPct: number;
  /** Pitcher throws "L" or "R"; batter handedness comes from the matchup. */
  readonly pitcherThrows: "L" | "R";
  /** Does the batter hit from the opposite side (platoon advantage)? */
  readonly platoonAdvantage: boolean;
}

export interface HrContextInputs {
  /** Park HR factor, 1.0 = neutral (e.g. Statcast park factors). */
  readonly parkFactor: number;
  /** Wind: positive helps (out to CF), negative hurts, mph. */
  readonly windOutMph: number;
  /** Temperature °F. League avg ≈ 72. */
  readonly tempF: number;
  /** Lineup slot 1-9; top-of-order sees more PAs. */
  readonly lineupSlot: number;
}

export interface HrFactorInputs {
  readonly power: HrPowerInputs;
  readonly pitcher: HrPitcherInputs;
  readonly context: HrContextInputs;
}

export interface HrFactorOutput {
  /** Component scores in [0,1], higher = more HR-friendly. */
  readonly components: {
    readonly power: number;
    readonly pitcherVuln: number;
    readonly park: number;
    readonly weather: number;
    readonly lineup: number;
  };
  /** Fixed-weight blend of components, [0,1]. Higher = stronger HR tilt. */
  readonly tilt: number;
  /** Per-component weight × score contributions (sums to tilt). */
  readonly contributions: Record<string, number>;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
/** Normalize a rate to [0,1] around a league-average anchor: 0.5 at avg, saturating ±3σ-ish. */
const norm = (x: number, avg: number, spread: number): number => clamp01(0.5 + (x - avg) / spread);

/** Fixed prior weights — documented, not tuned. Power dominates; weather is a nudge. */
export const HR_FACTOR_WEIGHTS = {
  power: 0.4,
  pitcherVuln: 0.25,
  park: 0.15,
  weather: 0.1,
  lineup: 0.1,
} as const;

export function computeHrFactors(inp: HrFactorInputs): HrFactorOutput {
  const power =
    0.5 * norm(inp.power.barrelsPerPA, 0.065, 0.06) +
    0.3 * norm(inp.power.hardHitPct, 0.38, 0.2) +
    0.2 * norm(inp.power.sweetSpotPct, 0.33, 0.2);

  // Pitcher vulnerability: higher HR/9 and FB% = more vulnerable = higher score.
  const pitcherVuln =
    0.55 * norm(inp.pitcher.hrPer9, 1.15, 1.0) +
    0.3 * norm(inp.pitcher.flyBallPct, 0.36, 0.2) +
    0.15 * (inp.pitcher.platoonAdvantage ? 0.75 : 0.35);

  // Park: factor 1.0 neutral; clamp the plausible Statcast range 0.7–1.4.
  const park = clamp01((inp.context.parkFactor - 0.7) / 0.7);

  // Weather: wind out helps most; heat helps a little.
  const weather = clamp01(
    0.5 + inp.context.windOutMph / 40 + (inp.context.tempF - 72) / 120,
  );

  // Lineup: slot 1 ≈ 0.9, slot 9 ≈ 0.35 (PA volume proxy).
  const lineup = clamp01(1.05 - inp.context.lineupSlot * 0.075);

  const components = {
    power: clamp01(power),
    pitcherVuln: clamp01(pitcherVuln),
    park,
    weather,
    lineup,
  };
  const contributions: Record<string, number> = {};
  let tilt = 0;
  for (const k of Object.keys(HR_FACTOR_WEIGHTS) as (keyof typeof HR_FACTOR_WEIGHTS)[]) {
    contributions[k] = HR_FACTOR_WEIGHTS[k] * components[k];
    tilt += contributions[k];
  }
  return { components, tilt: clamp01(tilt), contributions };
}
