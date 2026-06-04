/**
 * Galaxy Slate Twin - inspect HUD derivation.
 *
 * Turns a game + the scrubbed timeline step into the five scannable fields the
 * on-canvas inspect HUD shows on hover/focus. The HUD replaces explanatory
 * paragraphs: each field is a short, terminal-style read that a user can parse
 * in under two seconds.
 *
 * Pure and deterministic (no RNG, no Date) so the HUD is identical across
 * SSR/CSR and unit-testable. All copy is honest about illustrative data and
 * stays clear of the trust-gate banned vocabulary.
 */

import { TIMELINE, type TwinGame, type TwinVerdict } from "./demo-slate";

/** Below this confidence at the scrubbed step, the read is treated as on hold. */
export const HELD_THRESHOLD = 0.3;

export type HudVerdict = TwinVerdict | "HOLD";

export type SlateHud = {
  /** PLAY / WATCHLIST / NO-BET, or HOLD when confidence has decayed at this step */
  readonly verdict: HudVerdict;
  /** true when the read has dropped to a no-position hold at this step */
  readonly held: boolean;
  /** confidence 0..100 at the scrubbed step */
  readonly confidence: number;
  /** what moved between the opening read and this step */
  readonly whatChanged: string;
  /** how fragile the read is right now */
  readonly risk: string;
  /** the single thing that would invalidate the read */
  readonly breakRead: string;
  /** receipt / settlement status - honest for pre-launch illustrative data */
  readonly receipt: string;
};

function clampStep(values: readonly number[], i: number): number {
  if (!values.length) return 0;
  if (i < 0) return values[0]!;
  if (i >= values.length) return values[values.length - 1]!;
  return values[i]!;
}

function riskBand(volatility: number): string {
  if (volatility > 0.6) return "High";
  if (volatility > 0.4) return "Moderate";
  return "Low";
}

/**
 * Derive the inspect HUD for a game at a timeline step.
 * `illustrative` toggles the receipt copy between demo and live framing.
 */
export function deriveHud(game: TwinGame, timeIndex: number, illustrative = true): SlateHud {
  const conf = clampStep(game.confidence, timeIndex);
  const open = clampStep(game.confidence, 0);
  const held = conf < HELD_THRESHOLD && game.verdict !== "NO-BET";
  const verdict: HudVerdict = held ? "HOLD" : game.verdict;

  // What changed since the opening read - confidence drift + line direction.
  const dConf = Math.round((conf - open) * 100);
  const confPhrase =
    dConf > 4 ? `Confidence +${dConf} since open`
    : dConf < -4 ? `Confidence ${dConf} since open`
    : "Confidence flat since open";
  let linePhrase = "";
  if (game.oddsPath) {
    const move = clampStep(game.oddsPath, timeIndex) - 0.5;
    linePhrase = move > 0.02 ? " - line drifting toward the read"
      : move < -0.02 ? " - line drifting against the read"
      : " - line steady";
  }
  const whatChanged = held
    ? `Edge decayed below the hold line at ${TIMELINE[timeIndex] ?? "this step"}`
    : confPhrase + linePhrase;

  // Risk - volatility band plus the credible counter-evidence mass.
  const risk = `${riskBand(game.volatility)} - vol ${Math.round(game.volatility * 100)}, contradiction ${Math.round(
    game.contradictionMass * 100,
  )}`;

  // What would break the read - a scheduled impact event, else the most
  // fragile market leg.
  let breakRead: string;
  const impact = game.impact ?? null;
  if (impact) {
    const when = TIMELINE[impact.step] ?? `step ${impact.step}`;
    breakRead = timeIndex >= impact.step ? `${impact.label} (in effect)` : `${impact.label} at ${when}`;
  } else {
    const fragile = [...game.markets].sort((a, b) => b.volatility - a.volatility)[0];
    breakRead = fragile ? `A shock to the ${fragile.key} market` : "A late information shock";
  }

  // Receipt - honest about settlement. NO-BET has no position to settle.
  let receipt: string;
  if (game.verdict === "NO-BET") {
    receipt = "No position - nothing to settle";
  } else if (illustrative) {
    receipt = "Illustrative - receipt posts at settlement";
  } else {
    receipt = timeIndex >= TIMELINE.length - 1 ? "Result in - receipt posted" : "Receipt pending settlement";
  }

  return { verdict, held, confidence: Math.round(conf * 100), whatChanged, risk, breakRead, receipt };
}
