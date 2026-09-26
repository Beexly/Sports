/**
 * Signals against PUBLISHED PICKS — advisory only, and deliberately inert.
 *
 * Every other consumer of the spine is a SELECTION tool. Which lineup, which
 * waiver claim, which trade, which prop to play. If a signal there is noisy the
 * cost is a choice we would not have made, and we can change our mind next week.
 *
 * Published picks are not that. They carry a stated probability, they are graded,
 * and they accumulate into a calibration record the whole product is built on.
 * `packages/prediction-engine` is frozen under MODEL_VERSION and guarded by
 * `scripts/guardrails/model-freeze.mjs`. Moving a published probability is a
 * scoring change: it needs a MODEL_VERSION bump and a calibration pass against
 * settled outcomes, and neither of those is something this module may do.
 *
 * So this module computes what the signals WOULD say about a pick and hands back
 * a report. It does not modify a pick, a line, a selection or a confidence, and
 * nothing it returns is wired into the publish path. `ADVISORY_ONLY` is exported
 * as a literal `true` so a future caller cannot quietly reinterpret its purpose,
 * and `agreesWithEngine` is a comparison, never an instruction.
 *
 * WHAT THIS IS FOR. Two honest uses:
 *
 *   1. Disagreement surfacing. When the spine reads a published pick's
 *      environment as strongly negative, that is worth a human seeing BEFORE
 *      kickoff, exactly as it would have been worth seeing that Pittsburgh was
 *      implied for 18 points.
 *
 *   2. Calibration research. Logging the advisory read alongside settled
 *      outcomes is how you would EARN the right to make it a scoring input:
 *      accumulate the disagreements, grade them, and if the signal beats the
 *      engine on its own record, that evidence is what a MODEL_VERSION bump
 *      argues from. Until then it is a note, not a number.
 *
 * Do not wire this into pick generation, pick publication, confidence, ranking,
 * or the calibration sample. If a future change wants that, it is a scoring
 * change and it goes through the founder, a MODEL_VERSION bump and a calibration
 * pass. That is not bureaucracy; it is the reason the published record means
 * anything.
 */

import { readSignals, type SignalContext, type SignalPos, type SignalRead } from "./spine";

/** Structural marker: this module never feeds a published number. */
export const ADVISORY_ONLY = true as const;

/** The minimum a published pick must look like for us to read signals against it. */
export type PublishedPick = {
  readonly id: string;
  /** The side we published, e.g. a team code or a player name. */
  readonly selection: string;
  readonly team: string;
  readonly opp: string;
  /** Position where the pick is player-level. Team-level picks use "DST". */
  readonly pos?: SignalPos;
  /** The engine's own stated probability, 0..1. Read only. */
  readonly statedProbability: number;
};

export type AdvisoryStance = "AGREES" | "DISAGREES" | "NEUTRAL";

export type AdvisoryRead = {
  readonly pickId: string;
  readonly stance: AdvisoryStance;
  /** The spine's signed read. Informational. Never applied to `statedProbability`. */
  readonly signal: SignalRead;
  /** Plain-language reasons, for a human looking at a board before kickoff. */
  readonly reasons: readonly string[];
  /**
   * Always false. Present so the shape says out loud that nothing here is
   * applied, and so a reviewer sees the invariant rather than inferring it.
   */
  readonly appliedToProbability: false;
};

/** Below this magnitude the environment is not saying anything worth flagging. */
const MATERIAL = 2.0;

/**
 * What the signals say about a pick we have already published.
 *
 * Returns a stance and the reasons. It does not return an adjusted probability,
 * because producing one would be the first step toward someone using it.
 */
export function adviseOnPick(pick: PublishedPick, ctx: SignalContext): AdvisoryRead {
  const signal = readSignals(
    { name: pick.selection, pos: pick.pos ?? "DST", team: pick.team, opp: pick.opp },
    ctx,
  );
  const stance: AdvisoryStance =
    signal.delta <= -MATERIAL ? "DISAGREES" : signal.delta >= MATERIAL ? "AGREES" : "NEUTRAL";
  return {
    pickId: pick.id,
    stance,
    signal,
    reasons: signal.effects.map((e) => e.reason),
    appliedToProbability: false,
  };
}

/**
 * Picks whose environment the spine reads as materially against them.
 *
 * This is the surface worth putting in front of a human before kickoff. It is a
 * question — "did we see this?" — not a correction.
 */
export const disagreements = (picks: readonly PublishedPick[], ctx: SignalContext): readonly AdvisoryRead[] =>
  picks.map((p) => adviseOnPick(p, ctx)).filter((a) => a.stance === "DISAGREES");

/**
 * A row suitable for a research log, pairing the advisory read with the engine's
 * stated probability so the two can be graded against settled outcomes later.
 *
 * Accumulating these is how the signal layer would EARN a place in the scoring
 * model. Until it has, it stays here.
 */
export type AdvisoryLogRow = {
  readonly pickId: string;
  readonly statedProbability: number;
  readonly signalDelta: number;
  readonly stance: AdvisoryStance;
  readonly effectKeys: readonly string[];
};

export const toLogRow = (pick: PublishedPick, read: AdvisoryRead): AdvisoryLogRow => ({
  pickId: pick.id,
  statedProbability: pick.statedProbability,
  signalDelta: read.signal.delta,
  stance: read.stance,
  effectKeys: read.signal.effects.map((e) => e.key),
});
