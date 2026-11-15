/**
 * Stage G — the seal.
 *
 * Canonical JSON of the bundle plus the outputs plus the code version, hashed
 * with SHA-256. The hash is committed before kickoff; after the game the same
 * bundle must re-derive the same hash, which is what proves nothing was edited
 * once the result was known.
 *
 * Canonical means: object keys sorted, no whitespace, numbers in JS shortest
 * round-trip form, `undefined` dropped. Two structurally equal bundles hash
 * identically regardless of key insertion order.
 *
 * NOTE: this module imports `node:crypto`. Do not re-export it from
 * `packages/prediction-engine/src/index.ts` — that barrel is pulled into client
 * components and a node:crypto import breaks the Next build. Import the
 * submodule path instead.
 */

import { createHash } from "node:crypto";

export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

/** Recursively sort object keys and drop undefined. Throws on non-finite numbers. */
export function canonicalize(value: unknown): CanonicalValue {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`canonicalize: non-finite number ${String(value)} cannot be sealed`);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => canonicalize(v));
  if (typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(src).sort()) {
      const v = src[key];
      if (v === undefined) continue;
      out[key] = canonicalize(v);
    }
    return out;
  }
  throw new Error(`canonicalize: unsupported type ${typeof value}`);
}

/** Deterministic JSON string. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/** SHA-256 hex of the canonical form. */
export function sha256Canonical(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export interface SealManifest {
  readonly hash: string;
  readonly codeVersion: string;
  readonly sealedAt: string;
  readonly canonical: string;
}

/**
 * Seal a run. `payload` is whatever the caller wants committed — normally
 * `{ bundle, outputs }`. The returned `canonical` string is the exact bytes
 * that were hashed, so a verifier can re-hash it without re-serialising.
 */
export function sealRun(payload: unknown, codeVersion: string, sealedAt: string): SealManifest {
  // The code version is part of the sealed bytes, not a sibling field: a seal
  // that does not bind the code that produced it can be replayed against a
  // different engine and still verify.
  const canonical = canonicalJson({ codeVersion, payload });
  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");
  return { hash, codeVersion, sealedAt, canonical };
}

/** Re-derive the hash from a stored canonical string and compare. */
export function verifySeal(canonical: string, expectedHash: string): boolean {
  const actual = createHash("sha256").update(canonical, "utf8").digest("hex");
  return actual === expectedHash;
}
