import type { CommittedFields } from "@/lib/proof/receipt-proof";
import type { MerkleProof } from "@sports/prediction-engine";

/**
 * The receipt-integrity leg of a Reality Receipt. Mirrors `/api/verify`'s
 * existing sealed/open disclosure policy exactly (see build.ts's `isOpen`) —
 * this type does not invent a new disclosure rule, it names the outcomes of
 * the existing one so the composed object stays honest about what it knows.
 */
export type RealityReceiptProof =
  | { readonly state: "NOT_CAPTURED"; readonly reason: string }
  | {
      readonly state: "SEALED";
      readonly verified: boolean;
      readonly frozenAt: string;
      readonly modelVersion: string;
    }
  | {
      readonly state: "OPEN";
      readonly verified: boolean;
      readonly frozenAt: string;
      readonly modelVersion: string;
      /** Non-null ONLY when `verified` — never surface a tamper-suspect number. */
      readonly committed: CommittedFields | null;
    };

/**
 * The Bitcoin-anchor leg. States mirror `/api/proof/ots/[slateKey]`'s own
 * honesty mapping (not-migrated / no-proof / pending / attested) plus
 * NOT_REQUESTED (no slateKey on the receipt at all — e.g. a PASSED decision)
 * and UNAVAILABLE (the anchor sub-lookup itself could not be reached — a
 * transient DB hiccup on this ONE leg must never be reported as "no proof
 * exists", and must never fail the whole Reality Receipt: fail-open).
 */
export type RealityReceiptAnchor =
  | { readonly state: "NOT_REQUESTED" }
  | { readonly state: "NOT_MIGRATED" }
  | { readonly state: "NO_PROOF" }
  | { readonly state: "UNAVAILABLE" }
  | { readonly state: "PENDING"; readonly slateKey: string; readonly pendingCalendars: readonly string[] }
  | { readonly state: "BITCOIN_ATTESTED"; readonly slateKey: string; readonly bitcoinBlockHeights: readonly number[] };

/**
 * The slate Merkle-inclusion leg (Phase 2.2): proof that this decision's
 * receipt was inside its slate's PRE-KICKOFF committed root — the same
 * commit-reveal population guarantee `/proof`'s board already carries per
 * row (see `packages/prediction-engine/src/slate-commitment.ts`), now
 * surfaced on the single-decision Reality Receipt too.
 *
 * States mirror the anchor leg's honesty policy: NOT_REQUESTED when no slate
 * commitment can apply (a PASSED decision, or a receipt not yet frozen into
 * a slate — `pickProofReceipt.slateKey` is null until the freeze job runs);
 * UNAVAILABLE on any lookup failure OR a reconstructed proof that fails to
 * fold to the published root — fail-open, since a transient DB hiccup or a
 * data inconsistency on this ONE leg must never be reported as a fabricated
 * PROVEN, and must never block the rest of the Reality Receipt.
 *
 * SEALED is the one state `build.ts` imposes rather than the loader: a
 * genuinely-computed inclusion proof is WITHHELD (never surfaced as PROVEN)
 * while the `receipt` leg itself is still SEALED — `proof.leaf` is exactly
 * the receipt's own `contentHash` (see slate-commitment.ts's "a pick's leaf
 * in the slate is exactly its receipt.contentHash"), so disclosing it early
 * would open a hash `/api/verify` and the `receipt` leg both deliberately
 * withhold pre-kickoff. One disclosure rule for the whole composed object,
 * not two that could drift apart.
 */
export type RealityReceiptSlateInclusion =
  | { readonly state: "NOT_REQUESTED" }
  | { readonly state: "UNAVAILABLE" }
  | { readonly state: "SEALED" }
  | {
      readonly state: "PROVEN";
      readonly slateKey: string;
      /** The published Merkle root this proof folds up to. */
      readonly root: string;
      /** The slate's pre-registered population size (the fixed denominator). */
      readonly count: number;
      /** This receipt's leaf index within the committed slate. */
      readonly index: number;
      readonly proof: MerkleProof;
    };

export interface RealityReceipt {
  readonly schemaVersion: "reality-receipt/v0";
  /** ISO stamp of when THIS object was assembled — excluded from `digest`. */
  readonly generatedAt: string;
  readonly game: {
    readonly id: string;
    readonly sport: string;
    readonly matchup: string;
    readonly commenceTime: string;
  };
  readonly decision: {
    readonly kind: "PUBLISHED" | "PASSED";
    readonly reasonCode: string;
  };
  readonly envelope: {
    readonly id: string;
    /** The W001 `PickEvidenceEnvelope` digest — the reproducible evidence-spine hash. */
    readonly digest: string;
    readonly publicationStatus: "ELIGIBLE" | "WITHHELD";
  };
  readonly receipt: RealityReceiptProof;
  readonly anchor: RealityReceiptAnchor;
  readonly slateInclusion: RealityReceiptSlateInclusion;
  /**
   * sha256(canonicalJson({envelopeDigest, receipt, anchor, slateInclusion})).
   * Reproducible: given the same envelope digest, the same receipt row, the
   * same anchor status, and the same slate-inclusion state, any independent
   * recomputation yields this exact hash.
   * `generatedAt` is deliberately NOT covered — a wall-clock stamp would make
   * "reproducible" meaningless.
   */
  readonly digest: string;
}
