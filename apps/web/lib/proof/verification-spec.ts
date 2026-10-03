/**
 * The Proof verification specification — trustless, cross-implementation
 * conformance vectors for the pick-commitment hash chain.
 *
 * The Proof API (/api/proof/*) lets you verify a receipt using OUR verifier.
 * This goes one step further: it publishes the EXACT algorithm plus synthetic
 * known-answer test (KAT) vectors, so anyone can implement the verifier in any
 * language and confirm it reproduces our hashes byte-for-byte — you never have
 * to trust our server code. This is how cryptographic standards publish
 * conformance vectors (RFC-style); no sports-signal service publishes one for
 * its commitment scheme.
 *
 * The vectors are generated from the REAL production primitives
 * (canonicalPickPayload / hashLeaf / merkleRoot in @sports/prediction-engine),
 * so the published spec can never drift from what actually hashes picks. The
 * inputs are obviously-synthetic ("example-pick-N", "Team A"/"Team B") — there
 * is no real pick data here, so nothing leaks.
 *
 * Pure module: SHA-256 via node:crypto, no DB, no HTTP. Deterministic — the
 * same spec on every call (the tests pin exact hashes so any change to the
 * commitment recipe is loud).
 */

import { createHash } from "node:crypto";
import { canonicalPickPayload, hashLeaf, merkleRoot } from "@sports/prediction-engine";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** One synthetic committed pick, shaped like a real receipt's committed fields. */
const SAMPLE_FIELDS: readonly Readonly<{
  pickId: string;
  fields: Readonly<Record<string, string | number>>;
}>[] = [
  {
    pickId: "example-pick-1",
    fields: {
      selection: "Team A -3.5",
      line: -3.5,
      entryOdds: -110,
      marketFairProb: 0.5238,
      confidence: 62,
      edgeScore: 14,
      modelProb: "none",
      modelVersion: "v0.0.0-spec",
      asOf: "2020-01-01T00:00:00.000Z",
    },
  },
  {
    pickId: "example-pick-2",
    fields: {
      selection: "Team B ML",
      line: 145,
      entryOdds: 145,
      marketFairProb: 0.4,
      confidence: 55,
      edgeScore: 9,
      modelProb: "none",
      modelVersion: "v0.0.0-spec",
      asOf: "2020-01-01T00:00:00.000Z",
    },
  },
  {
    pickId: "example-pick-3",
    fields: {
      selection: "Over 44.5",
      line: 44.5,
      entryOdds: -105,
      marketFairProb: 0.5122,
      confidence: 58,
      edgeScore: 11,
      modelProb: "none",
      modelVersion: "v0.0.0-spec",
      asOf: "2020-01-01T00:00:00.000Z",
    },
  },
];

export interface VerificationVector {
  readonly pickId: string;
  readonly fields: Readonly<Record<string, string | number>>;
  /** canonicalPickPayload(fields) — sorted keys, `key=value`, joined by "|". */
  readonly canonicalPayload: string;
  /** sha256("leaf:" + pickId + ":" + canonicalPayload). */
  readonly leafHash: string;
}

export interface VerificationSpec {
  readonly version: string;
  readonly algorithm: string;
  readonly hash: string;
  readonly canonicalPayload: {
    readonly description: string;
    readonly separator: string;
    readonly keyValueForm: string;
    readonly keyOrder: string;
  };
  readonly leaf: { readonly prefix: string; readonly formula: string };
  readonly node: { readonly prefix: string; readonly formula: string };
  readonly vectors: readonly VerificationVector[];
  readonly merkle: { readonly leaves: readonly string[]; readonly root: string };
  readonly notes: readonly string[];
}

const SPEC_VERSION = "1.0.0";

/**
 * Build the verification spec + KAT vectors from the real production hashing.
 */
export function buildVerificationSpec(): VerificationSpec {
  const vectors: VerificationVector[] = SAMPLE_FIELDS.map((s) => {
    const canonical = canonicalPickPayload(s.fields);
    return {
      pickId: s.pickId,
      fields: s.fields,
      canonicalPayload: canonical,
      leafHash: hashLeaf(sha256Hex, { id: s.pickId, payload: canonical }),
    };
  });

  const leaves = vectors.map((v) => v.leafHash);
  const records = SAMPLE_FIELDS.map((s) => ({
    id: s.pickId,
    payload: canonicalPickPayload(s.fields),
  }));

  return {
    version: SPEC_VERSION,
    algorithm: "GSE-PickCommit-v1",
    hash: "SHA-256, hex-encoded lowercase, over the UTF-8 bytes of the preimage string",
    canonicalPayload: {
      description:
        "Serialize the committed fields: sort the keys ascending (lexicographic), render each as `${key}=${String(value)}`, and join with the '|' separator. No key contains '=' or '|'; no value contains '|'.",
      separator: "|",
      keyValueForm: "${key}=${value}",
      keyOrder: "ascending lexicographic on key",
    },
    leaf: {
      prefix: "leaf:",
      formula: "sha256('leaf:' + pickId + ':' + canonicalPayload)",
    },
    node: {
      prefix: "node:",
      formula: "sha256('node:' + leftChildHash + ':' + rightChildHash); when a layer has an odd number of nodes, the last node is duplicated as its own right sibling",
    },
    vectors,
    merkle: { leaves, root: merkleRoot(records, sha256Hex) },
    notes: [
      "All inputs are synthetic — reproduce these outputs in any language to conform; there is no real pick data here.",
      "Generated from the production hashing primitives, so this spec cannot drift from how live receipts are hashed.",
      "To verify a live receipt: fetch it from /api/proof/receipts (or /api/verify?hash=...), recompute its leaf hash from pickId + payload, and compare to the receipt's contentHash.",
    ],
  };
}
