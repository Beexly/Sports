import { createHash, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string, namespace = "gse-api-auth"): string {
  return createHash("sha256").update(`${namespace}:${value}`, "utf8").digest("hex");
}

/** Exactly what sha256Hex() produces: 64 lowercase hex characters, no uppercase, no separators. */
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Constant-time comparison of two SHA-256 hex digests.
 *
 * Strict-validates BEFORE decoding: Node's Buffer.from(str, "hex") silently
 * stops at the first invalid hex character and returns a truncated buffer
 * rather than throwing, so an unvalidated malformed string could decode to
 * fewer than 32 bytes. That breaks this function two ways — (a) two
 * different malformed strings that happen to truncate to the same short
 * byte sequence would incorrectly compare equal, and (b) if only one side
 * decodes short, timingSafeEqual throws a RangeError (unequal buffer
 * lengths), an unhandled exception that differs based on input validity —
 * exactly the kind of input-dependent behavior a timing-safe comparison
 * exists to avoid. Rejecting non-hex/wrong-length input up front, before
 * any decoding, closes both paths: every string that reaches
 * timingSafeEqual is already a valid 32-byte digest, so decoding always
 * succeeds and never truncates.
 *
 * Case-sensitive by design: sha256Hex() only ever produces lowercase, so
 * accepting uppercase would just be extra unvalidated input surface for a
 * digest that can never legitimately have it.
 */
export function timingSafeHashEqual(leftHash: string, rightHash: string): boolean {
  if (!SHA256_HEX_PATTERN.test(leftHash) || !SHA256_HEX_PATTERN.test(rightHash)) return false;
  return timingSafeEqual(Buffer.from(leftHash, "hex"), Buffer.from(rightHash, "hex"));
}
