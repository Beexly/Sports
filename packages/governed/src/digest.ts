import { createHash } from "node:crypto";

/**
 * A stable-enough fingerprint of `args` for receipt/audit purposes — NOT a
 * full canonical-JSON implementation. `Object.keys(...).sort()` only sorts
 * the TOP-LEVEL keys passed to `JSON.stringify`'s replacer array, so nested
 * object key order is whatever V8 iterates in; this is intentional (the
 * digest only needs to be a stable fingerprint of top-level shape+values,
 * not a cryptographically canonical encoding of arbitrary nested args).
 */
export function argsDigest(args: unknown): string {
  const canonical = JSON.stringify(args, Object.keys((args as object) ?? {}).sort());
  return createHash("sha256").update(canonical ?? "null").digest("hex").slice(0, 32);
}
