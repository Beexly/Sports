/**
 * Snapshot provenance — every sub-model output reconstructable as-of
 * prediction time (handoff §2 P0: "store input hashes + MODEL_VERSION").
 *
 * A provenance stamp binds together, at the moment a prediction is made:
 *   - the canonical hash of the exact feature inputs served (order-free),
 *   - the engine MODEL_VERSION (bumps are founder-gated),
 *   - the as-of decision instant,
 *   - the producing module id.
 *
 * The stamp is what `recompute.ts` (Phase 2) verifies against: given the same
 * inputs, the same code version must reproduce the same output hash. Stamps
 * are immutable point-in-time captures — never mutate one (mirrors the repo's
 * RightsSnapshot doctrine).
 *
 * Hashing: SHA-256 over a canonical JSON encoding (sorted keys, no
 * insignificant whitespace, numbers via JSON semantics). Uses the same
 * @noble/hashes primitive as packages/crypto's Pedersen ledger.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { MODEL_VERSION } from "../constants.js";

/** JSON-serializable value (inputs must be plain data — enforced at runtime). */
export type Canonical = null | boolean | number | string | Canonical[] | { [k: string]: Canonical };

/** Deterministic JSON: object keys sorted at every level. Throws on NaN/±Inf/undefined/functions. */
export function canonicalJson(value: Canonical): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new RangeError(`Non-finite number in provenance inputs: ${value}`);
      }
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
      const keys = Object.keys(value).sort();
      const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k] as Canonical)}`);
      return `{${parts.join(",")}}`;
    }
    default:
      throw new TypeError(`Value of type ${typeof value} cannot enter a provenance hash`);
  }
}

export function sha256Hex(text: string): string {
  const digest = sha256(new TextEncoder().encode(text));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ProvenanceStamp {
  /** SHA-256 of the canonical JSON of the exact inputs served. */
  readonly inputsHash: string;
  /** SHA-256 of the canonical JSON of the produced output. */
  readonly outputHash: string;
  readonly modelVersion: string;
  /** Producing module, e.g. "edge-lab/placebo", "props/hb-poisson". */
  readonly producer: string;
  /** Decision instant the inputs were frozen at (ISO UTC). */
  readonly asOf: string;
}

/** Stamp a (inputs, output) pair at a decision instant. Pure. */
export function stampProvenance(args: {
  readonly producer: string;
  readonly asOf: string;
  readonly inputs: Canonical;
  readonly output: Canonical;
  readonly modelVersion?: string;
}): ProvenanceStamp {
  if (!Number.isFinite(Date.parse(args.asOf))) {
    throw new RangeError(`asOf is not a valid ISO instant: ${args.asOf}`);
  }
  return {
    inputsHash: sha256Hex(canonicalJson(args.inputs)),
    outputHash: sha256Hex(canonicalJson(args.output)),
    modelVersion: args.modelVersion ?? MODEL_VERSION,
    producer: args.producer,
    asOf: args.asOf,
  };
}

/** True iff re-running the producer on the same inputs reproduced the stamped output. */
export function verifyReproduction(stamp: ProvenanceStamp, reproducedOutput: Canonical): boolean {
  return sha256Hex(canonicalJson(reproducedOutput)) === stamp.outputHash;
}
