/**
 * Pure quarantine for the backfill writer's own post-settlement trueProb
 * writes. Trainers must still refuse via requireTrainableTrueProbBasis in
 * @sports/types — this module only recognizes the writer's fingerprints.
 *
 * The prose prefix "Retrospective independent blend" is a CLEANUP
 * fingerprint for LEGACY UNTAGGED rows this writer used to emit, not an
 * admission contract. Trainers must never grep this string; they use
 * requireTrainableTrueProbBasis. Deleting the prefix check would silently
 * skip every untagged legacy row on cleanup.
 */

import {
  needsTrueProbQuarantine,
  quarantineLeakedIndependentEdge,
} from "@sports/types";

const OWN_RETROSPECTIVE_PREFIX = "Retrospective independent blend";

export function quarantineBackfillIndependentEdge(
  edge: Record<string, unknown>,
): Record<string, unknown> | null {
  if (edge["trueProbBasis"] === "as_of_mint") return null;
  const rationale = edge["rationale"];
  const ownRetro =
    typeof rationale === "string" && rationale.startsWith(OWN_RETROSPECTIVE_PREFIX);
  const tagged = edge["trueProbBasis"] === "post_settlement_backfill";
  if (!ownRetro && !tagged && !needsTrueProbQuarantine(edge)) return null;

  const taggedEdge: Record<string, unknown> = {
    ...edge,
    trueProbBasis: "post_settlement_backfill",
  };
  const stripped = quarantineLeakedIndependentEdge(taggedEdge);
  if (stripped) return stripped;
  if (edge["trueProbBasis"] !== "post_settlement_backfill") return taggedEdge;
  return null;
}
