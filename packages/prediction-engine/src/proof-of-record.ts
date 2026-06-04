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

/** Merkle root of a committed set of picks. Empty set → hash(""). */
export function merkleRoot(records: readonly PickRecord[], hash: HashFn): string {
  let layer = leafLayer(records, hash);
  if (layer.length === 0) return hash("");
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
 * Canonical, stable serialization of the fields a pick commits to (so the same
 * pick always hashes identically). Keys are sorted; values stringified.
 */
export function canonicalPickPayload(fields: Readonly<Record<string, string | number | boolean>>): string {
  return Object.keys(fields)
    .sort()
    .map((k) => `${k}=${String(fields[k])}`)
    .join("|");
}
