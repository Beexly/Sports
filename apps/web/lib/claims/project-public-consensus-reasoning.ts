/**
 * Shared fail-closed projection for public consensus reasoning fields.
 *
 * Used by /api/picks, preview, and dashboard so every surface binds through
 * the same binder + optional teaser scrub. Unbound consensus claims withhold
 * the field; bound claims keep scrubbed text and book-set evidence.
 */
import {
  bindPublicConsensusClaim,
  consensusEvidenceCaption,
  isBookmakerConsensusClaim,
  type ConsensusClaimPickSlice,
  type PublicConsensusEvidence,
} from "@/lib/claims/public-consensus-claim";
import { teaserForViewer } from "@/lib/picks/teaser-text";

export type ConsensusEvidenceSlice = Omit<ConsensusClaimPickSlice, "reasoningShort">;

export type ProjectedPublicConsensus = {
  readonly text: string | null;
  readonly bound: PublicConsensusEvidence | null;
  readonly consensusEvidence: string | null;
};

/**
 * Project one reasoning field through the consensus binder.
 * When `scrubConfidence` is true, strip confidence percentages for FREE viewers
 * (same path as /api/picks teaserForViewer).
 */
export function projectPublicConsensusReasoning(
  text: string | null | undefined,
  slice: ConsensusEvidenceSlice,
  options: {
    readonly scrubConfidence?: boolean;
    readonly canSeeConfidence?: boolean;
    readonly now?: Date;
  } = {},
): ProjectedPublicConsensus {
  const source = text?.trim() ?? "";
  if (!source) {
    return { text: null, bound: null, consensusEvidence: null };
  }

  const bound = bindPublicConsensusClaim(
    { ...slice, reasoningShort: source },
    options.now ?? new Date(),
  );

  if (isBookmakerConsensusClaim(source) && !bound) {
    return { text: null, bound: null, consensusEvidence: null };
  }

  const scrub = options.scrubConfidence === true;
  const projected = scrub
    ? teaserForViewer(source, options.canSeeConfidence === true)
    : source;

  return {
    text: projected,
    bound,
    consensusEvidence: bound ? consensusEvidenceCaption(bound) : null,
  };
}
