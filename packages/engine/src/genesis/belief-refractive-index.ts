/**
 * GENESIS LAYER — Belief Refractive Index (Invention 53).
 *
 * Information does not travel straight through the fantasy/betting ecosystem — it bends. The same
 * injury report produces different belief movement depending on popularity, headline placement,
 * analyst amplification, salary timing, book speed, manager desperation, format, and time to lock.
 * BRI turns human bias into measurable physics: observed move ÷ causally-expected move. Pure +
 * deterministic.
 *
 *   BRI < 1 → underreaction · BRI ≈ 1 → normal · BRI > 1 → overreaction · unstable → chaotic/narrative
 */

export interface BRIInput {
  readonly observer: string;
  readonly shockType: string;
  readonly observedBeliefMove: number;
  readonly causallyExpectedBeliefMove: number;
  /** 0..1 instability of the move across snapshots (high → chaotic). */
  readonly volatilityOfMove?: number;
  /** True if the move is driven by narrative/hype rather than role. */
  readonly narrativeDriven?: boolean;
}

export type BRIClass = "UNDERREACTION" | "NORMAL" | "OVERREACTION" | "CHAOTIC" | "NARRATIVE_DISTORTED";

export interface BRIResult {
  readonly observer: string;
  readonly shockType: string;
  readonly bri: number;
  readonly classification: BRIClass;
  readonly note: string;
}

/** Compute the Belief Refractive Index for one observer reacting to one shock. */
export function computeBRI(i: BRIInput, opts: { underThreshold?: number; overThreshold?: number } = {}): BRIResult {
  const under = opts.underThreshold ?? 0.7;
  const over = opts.overThreshold ?? 1.3;
  const expectedSafe = Math.max(0.05, Math.abs(i.causallyExpectedBeliefMove));
  // BRI is a MAGNITUDE ratio. Use |observed| so a large move in the WRONG direction reads as an
  // over/abnormal reaction, never as an "underreaction" (which would mislabel it a buy signal).
  const bri = Number((Math.abs(i.observedBeliefMove) / expectedSafe).toFixed(4));

  let classification: BRIClass;
  if ((i.volatilityOfMove ?? 0) >= 0.6) classification = "CHAOTIC";
  else if (i.narrativeDriven && bri >= over) classification = "NARRATIVE_DISTORTED";
  else if (bri < under) classification = "UNDERREACTION";
  else if (bri > over) classification = "OVERREACTION";
  else classification = "NORMAL";

  return {
    observer: i.observer,
    shockType: i.shockType,
    bri,
    classification,
    note: classification === "UNDERREACTION"
      ? `${i.observer} under-reacted to ${i.shockType} (BRI ${bri}) — candidate buy/exploit.`
      : classification === "OVERREACTION" || classification === "NARRATIVE_DISTORTED"
        ? `${i.observer} over-reacted to ${i.shockType} (BRI ${bri}) — candidate fade.`
        : classification === "CHAOTIC"
          ? `${i.observer} reaction to ${i.shockType} is unstable — no clean read.`
          : `${i.observer} absorbed ${i.shockType} ~normally (BRI ${bri}).`,
  };
}
