/**
 * Proof-of-record — a tamper-evident, publicly-verifiable commitment to a set of
 * published picks. Each pick is a Merkle leaf; we publish the root at lock time.
 * Anyone can later verify a specific pick was in the committed set and was not
 * altered or back-dated, via a Merkle inclusion proof — the cryptographic backbone
 * of a glass-box, "introspective" track record (you can't quietly rewrite history).
 *
 * Adapted from the proof-of-liabilities / proof-of-solvency Merkle pattern
 * (olalonde/*). Pure and dependency-free: the hash is injected. PRODUCTION MUST
 * inject a real cryptographic hash (e.g. node:crypto sha256 hex); a weak hash
 * weakens the guarantee. No crypto-currency is involved — this is plain hashing.
 */

export type HashFn = (input: string) => string;

export interface PickRecord {
  readonly id: string;
  /** Canonical, deterministic serialization of the committed pick fields. */
  readonly payload: string;
}

export interface MerkleSibling {
  readonly hash: string;
  /** true if the sibling sits on the RIGHT of the running hash at this level. */
  readonly right: boolean;
}

export interface MerkleProof {
  readonly leaf: string;
  readonly siblings: readonly MerkleSibling[];
  readonly index: number;
}

const LEAF_PREFIX = "leaf:";
const NODE_PREFIX = "node:";

export function hashLeaf(hash: HashFn, record: PickRecord): string {
  return hash(`${LEAF_PREFIX}${record.id}:${record.payload}`);
}

function hashNode(hash: HashFn, left: string, right: string): string {
  return hash(`${NODE_PREFIX}${left}:${right}`);
}

function leafLayer(records: readonly PickRecord[], hash: HashFn): string[] {
  return records.map((r) => hashLeaf(hash, r));
}

function parentLayer(layer: readonly string[], hash: HashFn): string[] {
  const next: string[] = [];
  for (let i = 0; i < layer.length; i += 2) {
    const left = layer[i]!;
    const right = i + 1 < layer.length ? layer[i + 1]! : left; // duplicate last if odd
    next.push(hashNode(hash, left, right));
  }
  return next;
}

/**
 * Merkle root of a committed set of picks. Empty set → hash("").
 *
 * COMMITMENT CONTRACT (M-F12): a bare root is NOT a complete commitment —
 * root + COUNT together are. This tree duplicates the last node of an odd
 * layer (the Bitcoin-style fold), so a list with its final record duplicated
 * re-folds to the SAME root as the original ([A,B,C] ≡ [A,B,C,C]) — a
 * padded list can "prove" against an odd-set root unless the verifier also
 * checks the committed count. Every surface that publishes a root publishes
 * its count beside it and every verifier MUST compare both (the /api/verify
 * slate endpoint's receiptIndexComplete gate and the /proof page's
 * totalSettled do exactly this). For single-value external publication use
 * commitmentDigest, which binds the two. The fold itself is kept stable
 * because production slate roots are already frozen in the DB — changing the
 * algorithm would make every historical commitment read as tampered.
 */
export function merkleRoot(records: readonly PickRecord[], hash: HashFn): string {
  let layer = leafLayer(records, hash);
  if (layer.length === 0) return hash("");
  while (layer.length > 1) layer = parentLayer(layer, hash);
  return layer[0]!;
}

/**
 * Merkle root from ALREADY-HASHED leaves (a receipt's contentHash IS its leaf
 * — see hashLeaf/buildPickProofReceipt). Lets a verifier that only holds the
 * public leaf fingerprints re-fold the committed root and PROVE a displayed
 * receipt list matches the commitment, instead of trusting a DB relation.
 * Leaf ORDER must match the committed order (pickId ascending at freeze time).
 */
export function merkleRootFromLeafHashes(leafHashes: readonly string[], hash: HashFn): string {
  if (leafHashes.length === 0) return hash("");
  let layer: string[] = [...leafHashes];
  while (layer.length > 1) layer = parentLayer(layer, hash);
  return layer[0]!;
}

/** Build an inclusion proof for the record at `index`. */
export function inclusionProof(records: readonly PickRecord[], index: number, hash: HashFn): MerkleProof {
  if (index < 0 || index >= records.length) {
    throw new Error(`inclusionProof: index ${index} out of range (0..${records.length - 1})`);
  }
  let layer = leafLayer(records, hash);
  const leaf = layer[index]!;
  const siblings: MerkleSibling[] = [];
  let idx = index;
  while (layer.length > 1) {
    const isRightNode = idx % 2 === 1;
    const pairIdx = isRightNode ? idx - 1 : idx + 1;
    const siblingHash = pairIdx < layer.length ? layer[pairIdx]! : layer[idx]!; // duplicated odd
    siblings.push({ hash: siblingHash, right: !isRightNode });
    layer = parentLayer(layer, hash);
    idx = Math.floor(idx / 2);
  }
  return { leaf, siblings, index };
}

/** Verify an inclusion proof folds up to the published root. */
export function verifyInclusion(proof: MerkleProof, root: string, hash: HashFn): boolean {
  let running = proof.leaf;
  for (const sib of proof.siblings) {
    running = sib.right ? hashNode(hash, running, sib.hash) : hashNode(hash, sib.hash, running);
  }
  return running === root;
}

/**
 * Count-bound commitment digest — the single hex string to publish EXTERNALLY
 * (bot posts, third-party attestations). Folding the count into the digest
 * removes the duplicate-last-leaf ambiguity that a bare root carries (see
 * merkleRoot's commitment contract): [A,B,C] and [A,B,C,C] share a root but
 * never a digest. Additive and versioned — existing stored roots and their
 * count-checked verification are untouched.
 */
export function commitmentDigest(hash: HashFn, root: string, count: number): string {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`commitmentDigest: count must be a non-negative integer, got ${count}`);
  }
  return hash(`commit:v1:${count}:${root}`);
}

/**
 * Canonical, stable serialization of the fields a pick commits to (so the same
 * pick always hashes identically). Produces `key=value` pairs joined by "|",
 * with keys sorted lexicographically and each value stringified via `String()`
 * (numbers render as their decimal text, booleans as `true`/`false`). The
 * returned string is the exact byte sequence covered by the content hash — see
 * hashLeaf.
 *
 * Delimiter contract (a caller precondition — NOT enforced here): the "=" and
 * "|" separators are structural and are NOT escaped. For the roundtrip through
 * parseCanonicalPayload to be exact, keys must contain neither "=" nor "|", and
 * values must contain no "|". A value holding a "|" would be re-split into a
 * spurious extra field on parse; a key holding a "=" would be truncated. Values
 * MAY contain "=" (parse splits on the first "=" only) — so "=" is roundtrip-
 * safe but "|" is not. This holds by construction for the committed pick schema
 * (see pick-proof-receipt.ts committedFields / calibration-commitment.ts):
 * keys are fixed field names and values are ids, enum labels, finite numbers,
 * ISO timestamps, or the literal "none", none of which contain "|".
 */
export function canonicalPickPayload(fields: Readonly<Record<string, string | number | boolean>>): string {
  return Object.keys(fields)
    .sort()
    .map((k) => `${k}=${String(fields[k])}`)
    .join("|");
}

/**
 * Inverse of canonicalPickPayload: recover the committed field map from the
 * payload string that is actually covered by the content hash. Values come
 * back as strings (their canonical serialization) — the caller coerces per
 * field. Splitting on the FIRST "=" preserves values that contain "="; keys
 * never do. This is the honest source for anything a verifier displays: what
 * is shown must be what was hashed, not a parallel DB column that could drift.
 *
 * Exact-inverse scope: this reverses canonicalPickPayload ONLY under that
 * function's delimiter contract — no key contains "=" or "|" and no value
 * contains "|". "|" is the record separator and is NOT unescaped here (there is
 * no escaping), so a value that embedded one would be split into a spurious
 * extra field: the roundtrip is lossy for delimiter-bearing values. The
 * committed pick schema never emits "|", so the inverse is exact in practice;
 * a caller minting payloads from arbitrary strings must uphold the precondition
 * itself. Edge cases: empty segments (a trailing or doubled "|") and segments
 * with no "=" are skipped, never thrown on.
 */
export function parseCanonicalPayload(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of payload.split("|")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}
