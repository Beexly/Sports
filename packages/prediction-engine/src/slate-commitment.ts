/**
 * Slate commitment (commit-reveal) — the move that makes cherry-picking impossible.
 *
 * A tamper-evident receipt per pick (pick-proof-receipt.ts) defeats "you edited the
 * pick after the result." But a skeptic has a second attack: "you only PUBLISHED the
 * picks that won — you hid the losers." A per-pick hash can't answer that, because it
 * says nothing about the population.
 *
 * The fix is commit-reveal: BEFORE the first kickoff, publish a single Merkle root
 * over the WHOLE slate — every pick's frozen receipt. The root commits to the exact
 * set and its size. After settlement, anyone can (a) verify any specific pick was in
 * the committed set via an inclusion proof, and (b) see the committed COUNT as a fixed
 * denominator. You cannot later add a winner or drop a loser without changing the
 * published root. The track record's population is pre-registered, not curated.
 *
 * Built entirely on proof-of-record.ts (Merkle) + pick-proof-receipt.ts. Pure and
 * dependency-free; the hash is injected (production passes node:crypto sha256 hex).
 */

import {
  merkleRoot,
  inclusionProof,
  verifyInclusion,
  type HashFn,
  type PickRecord,
  type MerkleProof,
} from "./proof-of-record.js";
import { buildPickProofReceipt, type PickProofReceipt } from "./pick-proof-receipt.js";

export interface SlateCommitment {
  /** Identifies the committed slate (e.g. a date or ingestion-run id). */
  readonly slateId: string;
  /** ISO timestamp the root was published — MUST be before the first kickoff. */
  readonly committedAt: string;
  /** The published Merkle root over every receipt in the slate. */
  readonly root: string;
  /** The pre-registered population size — the fixed denominator. */
  readonly count: number;
}

/**
 * The minimum a slate needs from each pick: its id and its canonical committed
 * payload. A full PickProofReceipt satisfies this, and so does a `{ pickId, payload }`
 * row read straight from the DB — so the commit/prove path needs no receipt rehydration.
 */
export interface SlateLeaf {
  readonly pickId: string;
  readonly payload: string;
}

function toRecords(leaves: readonly SlateLeaf[]): PickRecord[] {
  // The same (id, payload) leaf the per-pick receipt hashes — so a pick's leaf in the
  // slate is exactly its receipt.contentHash. One canonical leaf definition, reused.
  return leaves.map((r) => ({ id: r.pickId, payload: r.payload }));
}

/**
 * Build the slate commitment from the full set of pre-kickoff receipts. Order is
 * preserved (inclusion proofs reference an index). Throws on an empty slate — an
 * empty commitment commits to nothing and would let a curated set masquerade later.
 */
export function buildSlateCommitment(
  slateId: string,
  committedAt: string,
  leaves: readonly SlateLeaf[],
  hash: HashFn
): SlateCommitment {
  if (leaves.length === 0) {
    throw new Error("slate-commitment: refusing to commit an empty slate");
  }
  const root = merkleRoot(toRecords(leaves), hash);
  return { slateId, committedAt, root, count: leaves.length };
}

/** Inclusion proof for the pick at `index` in the committed slate. */
export function provePickInSlate(
  leaves: readonly SlateLeaf[],
  index: number,
  hash: HashFn
): MerkleProof {
  return inclusionProof(toRecords(leaves), index, hash);
}

export interface SlateVerification {
  readonly included: boolean;
  /** False when the receipt's own fields were altered after it was minted. */
  readonly receiptIntact: boolean;
  /** False when the proof's leaf doesn't match this receipt. */
  readonly leafMatches: boolean;
  /** False when the proof doesn't fold up to the published root. */
  readonly foldsToRoot: boolean;
}

/**
 * Verify, from a skeptic's seat, that `receipt` was in the slate committed to by
 * `root`. Three independent checks must all hold:
 *   1. the receipt re-derives to its own hash (not edited after minting),
 *   2. the inclusion proof's leaf equals that hash (the proof is for THIS pick),
 *   3. the proof folds up to the published root (the pick was in the committed set).
 * Only `included === true` (all three) proves the pick was pre-registered and unaltered.
 */
export function verifyPickInSlate(
  receipt: PickProofReceipt,
  proof: MerkleProof,
  root: string,
  hash: HashFn
): SlateVerification {
  let receiptIntact = true;
  let expectedLeaf: string;
  try {
    expectedLeaf = buildPickProofReceipt(receipt.fields, hash).contentHash;
  } catch {
    receiptIntact = false;
    expectedLeaf = "";
  }
  // A re-derived receipt whose hash differs from the stored one was tampered with.
  if (receiptIntact && expectedLeaf !== receipt.contentHash) {
    receiptIntact = false;
  }

  const leafMatches = receiptIntact && proof.leaf === expectedLeaf;
  const foldsToRoot = verifyInclusion(proof, root, hash);

  return {
    included: receiptIntact && leafMatches && foldsToRoot,
    receiptIntact,
    leafMatches,
    foldsToRoot,
  };
}

// ───────────────────────── freeze-once planning ─────────────────────────

/**
 * Canonical slate key — one immutable commitment per (sport, UTC game-day). Picks for
 * games on the same day are committed together so the population is pre-registered.
 */
export function dailySlateKey(sport: string, commenceTimeIso: string): string {
  const day = commenceTimeIso.slice(0, 10); // YYYY-MM-DD (UTC, from an ISO string)
  return `${sport.toUpperCase()}:${day}`;
}

export interface SlatePlanInput {
  readonly slateKey: string;
  readonly receipts: readonly SlateLeaf[];
  /** ISO kickoff of the EARLIEST game in this slate. */
  readonly earliestKickoff: string;
  /** ISO "now". */
  readonly now: string;
  /** True if a frozen commitment already exists for this slateKey. */
  readonly alreadyCommitted: boolean;
}

export type SlatePlan =
  | { readonly action: "COMMIT"; readonly commitment: SlateCommitment }
  | { readonly action: "SKIP"; readonly reason: string };

/**
 * Decide whether to freeze a slate commitment — the honest, integrity-preserving
 * gate around buildSlateCommitment. A commitment is published at most ONCE per slate,
 * and ONLY while the whole slate is still pre-result (now < earliest kickoff). After
 * the first game starts, committing would no longer be a true pre-registration, so we
 * refuse. Pure — the caller persists a COMMIT result and re-roots nothing.
 */
export function planSlateCommitment(input: SlatePlanInput, hash: HashFn): SlatePlan {
  if (input.alreadyCommitted) {
    return { action: "SKIP", reason: "already frozen — a slate commitment is immutable" };
  }
  if (input.receipts.length === 0) {
    return { action: "SKIP", reason: "no receipts to commit" };
  }
  const now = Date.parse(input.now);
  const kickoff = Date.parse(input.earliestKickoff);
  if (Number.isFinite(now) && Number.isFinite(kickoff) && now >= kickoff) {
    return {
      action: "SKIP",
      reason: "first game already started — cannot publish a pre-result commitment now",
    };
  }
  return {
    action: "COMMIT",
    commitment: buildSlateCommitment(input.slateKey, input.now, input.receipts, hash),
  };
}
