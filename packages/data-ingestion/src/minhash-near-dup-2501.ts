/**
 * MinHash near-duplicate detection for corpus dedup (Data-Juicer 2.0 patterns)
 *
 * Research port: arXiv:2501.14755
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Pure near-duplicate detector for GSE's nflverse+corpus processing: k-shingle
 * sets, deterministic MinHash signatures (seeded FNV-1a + universal hashing),
 * Jaccard estimation from signature agreement, and LSH banding to surface
 * candidate pairs that exact hashing misses. Feeds the single-pass
 * dedup+filter probe adapter (probe on a 1% sample, then apply to the full
 * corpus). No cluster/Ray adoption — pure local computation only.
 *
 * ACCEPTANCE GATE: ADAPT the patterns iff the fused single-pass pipeline runs
 * >=30% faster than the current multi-pass scripts on the nflverse+arXiv
 * corpora AND MinHash finds >=5 near-duplicate pairs missed by exact hashing;
 * reject any Ray/cluster adoption.
 */

export interface NearDupDocument {
  id: string;
  text: string;
}

export interface MinHashOptions {
  /** shingle length in characters */
  k?: number;
  /** number of hash functions (signature length) */
  numHashes?: number;
  /** deterministic seed for hash coefficients */
  seed?: number;
  /** LSH bands; rows = numHashes / bands */
  bands?: number;
  /** minimum estimated Jaccard to report a pair */
  threshold?: number;
}

export interface NearDupPair {
  a: string;
  b: string;
  estimatedJaccard: number;
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const LARGE_PRIME = 4294967311;

/** FNV-1a 32-bit hash of a string (unsigned). */
export function fnv1a(input: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

/** Character k-shingles of a normalized document. */
export function shingle(text: string, k: number): Set<string> {
  const out = new Set<string>();
  if (k <= 0 || text.length < k) return out;
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i + k <= norm.length; i++) {
    out.add(norm.slice(i, i + k));
  }
  return out;
}

/** Mulberry32 deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ResolvedMinHashOptions {
  k: number;
  numHashes: number;
  seed: number;
  bands: number;
  threshold: number;
}

export function resolveOptions(opts: MinHashOptions = {}): ResolvedMinHashOptions {
  const numHashes = opts.numHashes ?? 128;
  const bands = opts.bands ?? 16;
  return {
    k: opts.k ?? 5,
    numHashes,
    seed: opts.seed ?? 42,
    bands,
    threshold: opts.threshold ?? 0.5,
  };
}

/** Deterministic MinHash signature of a shingle set. */
export function minHashSignature(shingles: Set<string>, opts: MinHashOptions = {}): number[] {
  const { numHashes, seed } = resolveOptions(opts);
  const rng = mulberry32(seed);
  const coeffs: Array<[number, number]> = [];
  for (let i = 0; i < numHashes; i++) {
    coeffs.push([1 + Math.floor(rng() * (LARGE_PRIME - 1)), Math.floor(rng() * LARGE_PRIME)]);
  }
  const sig: number[] = new Array<number>(numHashes).fill(Number.MAX_SAFE_INTEGER);
  for (const s of shingles) {
    const x = fnv1a(s);
    for (let i = 0; i < numHashes; i++) {
      const pair = coeffs[i];
      if (pair === undefined) continue;
      const [a, b] = pair;
      const hv = (a * x + b) % LARGE_PRIME;
      if (hv < (sig[i] ?? Number.MAX_SAFE_INTEGER)) sig[i] = hv;
    }
  }
  return sig;
}

/** Estimated Jaccard similarity from two signatures. */
export function estimateJaccard(sigA: number[], sigB: number[]): number {
  if (sigA.length === 0 || sigB.length === 0 || sigA.length !== sigB.length) return 0;
  let matches = 0;
  for (let i = 0; i < sigA.length; i++) {
    const a = sigA[i];
    const b = sigB[i];
    if (a !== undefined && b !== undefined && a === b) matches++;
  }
  return matches / sigA.length;
}

/** LSH banding: group doc ids whose band slices collide. */
export function lshCandidateBuckets(
  signatures: Map<string, number[]>,
  opts: MinHashOptions = {},
): string[][] {
  const { numHashes, bands } = resolveOptions(opts);
  const rows = Math.max(1, Math.floor(numHashes / bands));
  const buckets = new Map<string, string[]>();
  for (const [id, sig] of signatures) {
    for (let band = 0; band < bands; band++) {
      const start = band * rows;
      const slice = sig.slice(start, start + rows);
      const key = `${band}:${slice.join(",")}`;
      const list = buckets.get(key);
      if (list) list.push(id);
      else buckets.set(key, [id]);
    }
  }
  return [...buckets.values()].filter((ids) => ids.length > 1);
}

/**
 * Full pipeline: signatures -> LSH candidates -> Jaccard-filtered near-dup pairs.
 * Exact duplicates (identical normalized text) are reported with jaccard 1.
 */
export function findNearDuplicates(
  docs: NearDupDocument[],
  opts: MinHashOptions = {},
): NearDupPair[] {
  const resolved = resolveOptions(opts);
  const signatures = new Map<string, number[]>();
  for (const d of docs) {
    signatures.set(d.id, minHashSignature(shingle(d.text, resolved.k), resolved));
  }
  const pairs = new Map<string, NearDupPair>();
  const addPair = (a: string, b: string): void => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (pairs.has(key)) return;
    const sigA = signatures.get(a);
    const sigB = signatures.get(b);
    if (!sigA || !sigB) return;
    const j = estimateJaccard(sigA, sigB);
    if (j >= resolved.threshold) pairs.set(key, { a, b, estimatedJaccard: j });
  };
  for (const bucket of lshCandidateBuckets(signatures, resolved)) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i];
        const b = bucket[j];
        if (a !== undefined && b !== undefined) addPair(a, b);
      }
    }
  }
  return [...pairs.values()].sort((x, y) => y.estimatedJaccard - x.estimatedJaccard);
}

/** Exact-hash duplicates missed check: pairs exact hashing would NOT catch. */
export function pairsMissedByExactHash(docs: NearDupDocument[], pairs: NearDupPair[]): NearDupPair[] {
  const seen = new Map<string, string>();
  const exactDup = new Set<string>();
  for (const d of docs) {
    const norm = d.text.toLowerCase().replace(/\s+/g, " ").trim();
    const first = seen.get(norm);
    if (first !== undefined) {
      exactDup.add(first < d.id ? `${first}|${d.id}` : `${d.id}|${first}`);
    } else {
      seen.set(norm, d.id);
    }
  }
  return pairs.filter((p) => {
    const key = p.a < p.b ? `${p.a}|${p.b}` : `${p.b}|${p.a}`;
    return !exactDup.has(key);
  });
}

export const GSE_MINHASH_DEDUP_ENABLED = false;
