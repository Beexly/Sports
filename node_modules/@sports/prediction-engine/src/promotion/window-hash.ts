/**
 * Real sha256 window hash — fixes the starter skeleton's defect of writing
 * `sha256:${windowId}:${codeRevision}` (a template string, not a hash of
 * anything). This computes a real sha256 digest (node:crypto) over a
 * canonical (sorted-key) JSON serialization of the full registered window
 * parameters plus the code revision, so the hash actually changes when ANY
 * registered parameter changes — not just windowId/codeRevision — and is
 * reproducible byte-for-byte from the same inputs (contract §5 invariant #5,
 * replayability).
 */

import { createHash } from "node:crypto";
import type { RegisteredWindow } from "./types.js";

/** Deterministic (sorted-key) canonicalization for JSON.stringify. Dates in
 * RegisteredWindow are already ISO strings, so no further date handling is
 * needed here — they sort and serialize identically regardless of key order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      out[key] = canonicalize(input[key]);
    }
    return out;
  }
  return value;
}

/**
 * Computes `sha256:<hex>` over the canonical JSON of `{ window, codeRevision }`.
 * Deterministic: identical (window, codeRevision) always produces the
 * identical hash string, regardless of object key insertion order.
 */
export function computeWindowHash(window: RegisteredWindow, codeRevision: string): string {
  const canonical = canonicalize({ window, codeRevision });
  const json = JSON.stringify(canonical);
  const digest = createHash("sha256").update(json, "utf8").digest("hex");
  return `sha256:${digest}`;
}
