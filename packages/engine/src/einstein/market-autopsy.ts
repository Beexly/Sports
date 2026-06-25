/**
 * EINSTEIN LAYER — Market Autopsy Simulator (Invention 22).
 *
 * After settlement, reconstruct the belief timeline from open to close and score the only thing
 * that compounds: was the pre-result reasoning STRUCTURALLY DESERVED? Not win/loss, not even only
 * CLV — but timing, truth, uncertainty, restraint, availability, proof, and tradability, all
 * evaluated at their point in time. A correct decision that lost to variance is still a correct
 * decision; a winning decision built on luck is still a bad process.
 *
 * Pure + deterministic. No result-only reasoning — the game outcome is accepted only to separate
 * "deserved" from "lucky/unlucky", never to grade the process.
 */

export interface BeliefSnapshot {
  readonly timestamp: string;
  readonly consensusProb: number;
  /** Our belief at this time, if we had one. */
  readonly ourProb?: number;
}

export interface AutopsyComponents {
  /** Did we act before consensus formed? 0..1. */
  readonly timing: number;
  /** Was our belief closer to the eventual closing truth than the open? 0..1. */
  readonly truth: number;
  /** Did we size/refuse appropriately for the uncertainty? 0..1. */
  readonly uncertainty: number;
  /** Did we PASS when we should have (restraint)? 0..1. */
  readonly restraint: number;
  /** Was the information available + knowable at decision time? 0..1. */
  readonly availability: number;
  /** Was the claim proof-gated (denominator, FDR, provenance)? 0..1. */
  readonly proof: number;
  /** Did the edge survive friction (tradability)? 0..1. */
  readonly tradability: number;
}

export interface AutopsyInput {
  readonly timeline: readonly BeliefSnapshot[];
  readonly components: AutopsyComponents;
  /** Did we beat the close (process indicator), independent of the result? */
  readonly clvEarned: boolean;
  /** The settled result ONLY to separate deserved-vs-lucky; never grades the process. */
  readonly won?: boolean;
  /** Would the same candidate be accepted again under current rules? */
  readonly acceptedAgain: boolean;
}

export interface AutopsyScore {
  readonly components: AutopsyComponents;
  readonly deservedConfidence: number;
  readonly clvEarned: boolean;
  readonly verdict: "deserved" | "lucky" | "unlucky" | "undeserved";
  readonly acceptedAgain: boolean;
  readonly note: string;
}

const WEIGHTS: Record<keyof AutopsyComponents, number> = {
  timing: 0.15, truth: 0.2, uncertainty: 0.1, restraint: 0.1, availability: 0.15, proof: 0.2, tradability: 0.1,
};

/** If our belief was provided over time, derive a timing/truth boost; else pass through. */
function deriveFromTimeline(timeline: readonly BeliefSnapshot[]): { earlyDivergence: number } {
  const withOurs = timeline.filter((s) => s.ourProb != null);
  if (withOurs.length < 2) return { earlyDivergence: 0 };
  const first = withOurs[0]!;
  const last = withOurs.at(-1)!;
  // Did our early belief anticipate where consensus ended up? (process, not result)
  const anticipated = Math.sign((first.ourProb! - first.consensusProb)) === Math.sign((last.consensusProb - first.consensusProb));
  return { earlyDivergence: anticipated ? Math.min(1, Math.abs(first.ourProb! - first.consensusProb) * 5) : 0 };
}

/** Run the autopsy: grade the pre-result process; use the result only to label deserved/lucky. */
export function runAutopsy(input: AutopsyInput): AutopsyScore {
  const c = input.components;
  const { earlyDivergence } = deriveFromTimeline(input.timeline);
  const adjTiming = Math.max(0, Math.min(1, c.timing + 0.3 * earlyDivergence));
  const comps: AutopsyComponents = { ...c, timing: adjTiming };

  let deservedConfidence = 0;
  for (const k of Object.keys(WEIGHTS) as Array<keyof AutopsyComponents>) {
    deservedConfidence += comps[k] * WEIGHTS[k];
  }
  // CLV is a process indicator: a small bonus, never the whole grade.
  deservedConfidence = Math.max(0, Math.min(1, deservedConfidence + (input.clvEarned ? 0.05 : -0.05)));

  const deservedProcess = deservedConfidence >= 0.6;
  let verdict: AutopsyScore["verdict"];
  if (input.won === undefined) {
    verdict = deservedProcess ? "deserved" : "undeserved";
  } else if (deservedProcess && input.won) verdict = "deserved";
  else if (deservedProcess && !input.won) verdict = "unlucky";
  else if (!deservedProcess && input.won) verdict = "lucky";
  else verdict = "undeserved";

  return {
    components: comps,
    deservedConfidence: Number(deservedConfidence.toFixed(3)),
    clvEarned: input.clvEarned,
    verdict,
    acceptedAgain: input.acceptedAgain,
    note:
      verdict === "lucky"
        ? "Won, but the pre-result reasoning was NOT deserved — do not reinforce."
        : verdict === "unlucky"
          ? "Lost, but the process was sound — keep the process, not the outcome."
          : verdict === "deserved"
            ? "Process was structurally deserved before the result."
            : "Process did not earn its confidence — demote/repair before reuse.",
  };
}
