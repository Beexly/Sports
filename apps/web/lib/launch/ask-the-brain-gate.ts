/**
 * Ask-the-Brain launch gate.
 *
 * A public Q&A surface over the model ("ask the brain a question, get a
 * scored answer") is a named future product — and a uniquely dangerous one to
 * ship early: an LLM answering live, unmoderated questions about picks is the
 * single easiest way to accidentally fabricate a stat, imply a guarantee, or
 * contradict the calibration the rest of the platform works hard to earn.
 *
 * Mirrors `public-surface-gate.ts`'s smart-defaults pattern, but this surface
 * gets the STRICTER posture: everything else in that file defaults some
 * products open (Contest Bay, podcast). This one is FOUNDATION until all four
 * prerequisites are true — no single env flag flips it, because no single
 * flag can attest that four independent systems are ready.
 */

export interface AskTheBrainPrerequisites {
  /** The evidence vault (claim → source → snapshot chain) has test coverage. */
  readonly evidenceVaultTested: boolean;
  /** Claim governance (public-claim-compiler + display-guard) has test coverage. */
  readonly claimGovernanceTested: boolean;
  /** Methodology pages (how the model works, its limits) are live and public. */
  readonly methodologyPagesLive: boolean;
  /** The cockpit's own internal Q&A has passed a quality gate — dogfooded first. */
  readonly cockpitQaQualityGatePassed: boolean;
}

export interface AskTheBrainLaunchDecision {
  readonly canLaunch: boolean;
  readonly missing: readonly (keyof AskTheBrainPrerequisites)[];
}

/**
 * Today's state. All four are hard-coded false: nothing in this codebase
 * currently attests to any of them, and this module must not guess. When a
 * prerequisite becomes real (a specific test suite exists and passes, a
 * specific page ships), update its literal here — never wire it to a runtime
 * flag, because a flag can be flipped without the underlying work existing.
 */
export const ASK_THE_BRAIN_PREREQUISITES: AskTheBrainPrerequisites = {
  evidenceVaultTested: false,
  claimGovernanceTested: false,
  methodologyPagesLive: false,
  cockpitQaQualityGatePassed: false,
};

/**
 * Requires ALL FOUR prerequisites. Public by design: this is the single place
 * that decides whether the public Ask-the-Brain surface may exist at all —
 * before any route, before any component, before any copy.
 */
export function canLaunchPublicBrain(
  prerequisites: AskTheBrainPrerequisites = ASK_THE_BRAIN_PREREQUISITES,
): AskTheBrainLaunchDecision {
  const missing = (Object.keys(prerequisites) as (keyof AskTheBrainPrerequisites)[]).filter(
    (key) => prerequisites[key] !== true,
  );
  return { canLaunch: missing.length === 0, missing };
}
