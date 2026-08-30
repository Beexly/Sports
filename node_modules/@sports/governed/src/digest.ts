import { createHash } from "node:crypto";

/**
 * Recursively sort object keys so `JSON.stringify` produces the same output
 * regardless of insertion order, at every nesting level (not just the top).
 * A plain `JSON.stringify(x, Object.keys(x).sort())` replacer-array only
 * whitelists/sorts the TOP level — nested keys not also present at the top
 * level get silently dropped (e.g. `{a:{x:1}}` and `{a:{y:2}}` both become
 * `{"a":{}}`), which would let unrelated args collide on the same digest.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * A stable fingerprint of `args` for receipt/audit purposes: a full
 * recursively-canonicalized JSON encoding, hashed. Two calls with the same
 * logical `args` (any key order, any nesting depth) always produce the same
 * digest; two calls with different `args` values essentially never collide.
 */
export function argsDigest(args: unknown): string {
  const canonical = JSON.stringify(canonicalize(args) ?? null);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}
