/**
 * Proof Graph — the click-path a skeptic follows from a public claim to the evidence.
 *
 *   claim → pick → receipt (hash-verified) → source snapshots → model version →
 *   settlement → CLV → loss autopsy (if it lost)
 *
 * This assembles that chain for one claim and reports whether it is AUDITABLE (the
 * pre-result evidence is present and the receipt verifies) and COMPLETE (the post-result
 * evidence is present too, including a loss autopsy when the pick lost — we publish our
 * losses). It is the structural backbone of "every number has a receipt." Pure, no I/O.
 */

export type ProofNodeKind =
  | "claim"
  | "pick"
  | "receipt"
  | "source-snapshot"
  | "model-version"
  | "settlement"
  | "clv"
  | "autopsy";

export interface ProofNode {
  readonly kind: ProofNodeKind;
  readonly label: string;
  readonly present: boolean;
  readonly detail: string | null;
  /** For the receipt node: whether its hash verified. */
  readonly verified: boolean | null;
}

export interface ProofGraphInput {
  readonly claimText: string;
  readonly pickId: string | null;
  readonly receipt: { readonly contentHash: string; readonly verified: boolean } | null;
  readonly sourceSnapshotHashes: readonly string[];
  readonly modelVersion: string | null;
  readonly settlement: { readonly result: string; readonly settledAt: string } | null;
  readonly clv: { readonly verdict: string; readonly value: number } | null;
  readonly autopsy: { readonly id: string } | null;
  /** Whether the pick lost (a lost pick MUST carry an autopsy to be complete). */
  readonly pickLost: boolean;
}

export interface ProofGraph {
  readonly nodes: readonly ProofNode[];
  /** Pre-result evidence present + receipt verified — a skeptic can audit the claim. */
  readonly auditable: boolean;
  /** Auditable AND settled with CLV AND (autopsy if lost) — the full chain. */
  readonly complete: boolean;
  readonly missing: readonly string[];
  readonly summary: string;
}

export function buildProofGraph(input: ProofGraphInput): ProofGraph {
  const receiptPresent = input.receipt != null;
  const receiptVerified = input.receipt?.verified === true;
  const hasSources = input.sourceSnapshotHashes.length > 0;
  const hasModelVersion = !!input.modelVersion && input.modelVersion.trim() !== "";
  const settled = input.settlement != null;
  const hasClv = input.clv != null;
  const hasAutopsy = input.autopsy != null;

  const nodes: ProofNode[] = [
    { kind: "claim", label: "Public claim", present: input.claimText.trim() !== "", detail: input.claimText || null, verified: null },
    { kind: "pick", label: "Pick", present: input.pickId != null, detail: input.pickId, verified: null },
    {
      kind: "receipt",
      label: "Pre-result receipt",
      present: receiptPresent,
      detail: input.receipt ? input.receipt.contentHash.slice(0, 16) + "…" : null,
      verified: receiptPresent ? receiptVerified : null,
    },
    {
      kind: "source-snapshot",
      label: "Source snapshots",
      present: hasSources,
      detail: hasSources ? `${input.sourceSnapshotHashes.length} snapshot(s)` : null,
      verified: null,
    },
    { kind: "model-version", label: "Model version", present: hasModelVersion, detail: input.modelVersion, verified: null },
    { kind: "settlement", label: "Settlement", present: settled, detail: input.settlement ? `${input.settlement.result} @ ${input.settlement.settledAt}` : null, verified: null },
    { kind: "clv", label: "Closing-line value", present: hasClv, detail: input.clv ? `${input.clv.verdict} (${input.clv.value})` : null, verified: null },
    {
      kind: "autopsy",
      label: "Loss autopsy",
      present: hasAutopsy,
      detail: input.pickLost ? (input.autopsy ? input.autopsy.id : "REQUIRED — pick lost") : "n/a (pick did not lose)",
      verified: null,
    },
  ];

  const missing: string[] = [];
  if (input.pickId == null) missing.push("pick");
  if (!receiptPresent) missing.push("receipt");
  else if (!receiptVerified) missing.push("receipt-verification");
  if (!hasSources) missing.push("source-snapshots");
  if (!hasModelVersion) missing.push("model-version");

  const auditable = input.pickId != null && receiptPresent && receiptVerified && hasSources && hasModelVersion;

  // Completeness adds post-result evidence.
  if (!settled) missing.push("settlement");
  if (settled && !hasClv) missing.push("clv");
  if (input.pickLost && !hasAutopsy) missing.push("loss-autopsy");

  const complete = auditable && settled && hasClv && (!input.pickLost || hasAutopsy);

  const summary = complete
    ? "Complete, auditable chain: claim → pick → verified receipt → sources → model → settlement → CLV" +
      (input.pickLost ? " → loss autopsy." : ".")
    : auditable
      ? "Auditable pre-result chain; awaiting settlement/CLV" + (input.pickLost && !hasAutopsy ? " and a loss autopsy." : ".")
      : `Not yet auditable — missing: ${missing.join(", ")}.`;

  return { nodes, auditable, complete, missing, summary };
}
