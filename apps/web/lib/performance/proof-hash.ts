/**
 * Production hash for the proof spine.
 *
 * proof-of-record.ts / pick-proof-receipt.ts / slate-commitment.ts are pure and
 * dependency-free, so they take the hash as an injected function. That keeps the
 * math testable — but it means the GUARANTEE is only as strong as the hash actually
 * injected in production. A weak or non-cryptographic hash lets an attacker forge a
 * pre-image and rewrite a "committed" pick. This module is the one place that wires
 * a real cryptographic hash (SHA-256), so every production mint/commit uses it.
 *
 * Server-only (node:crypto). Never inject a placeholder hash into a published
 * commitment.
 */

import { createHash } from "node:crypto";

/** SHA-256 of a UTF-8 string, lowercase hex. The canonical production HashFn. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
