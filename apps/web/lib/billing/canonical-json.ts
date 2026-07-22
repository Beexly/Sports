/**
 * Canonical JSON serialization for hashing (directive 5.5).
 *
 * `JSON.stringify` is NOT canonical: object key order follows insertion
 * order, so two semantically identical payloads can hash differently and a
 * legitimate idempotent retry would fingerprint as a conflict. This module
 * produces ONE byte-stable encoding per value:
 *
 *   - object keys sorted lexicographically (code-unit order) at every depth;
 *   - arrays preserved in order (position is meaning);
 *   - only JSON-representable primitives allowed — `undefined`, functions,
 *     symbols, bigints, and non-finite numbers THROW instead of being
 *     silently dropped/nulled (a dropped field must never silently produce
 *     the same fingerprint as an absent one).
 *
 * Used by the checkout request fingerprint; deliberately dependency-free and
 * pure so it is trivially unit-testable.
 */

import { createHash } from "node:crypto";

export type CanonicalJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

/** Thrown when a value cannot be canonically serialized. */
export class CanonicalJsonError extends TypeError {
  readonly kind = "canonical_json" as const;
  constructor(message: string) {
    super(message);
    this.name = "CanonicalJsonError";
  }
}

function serialize(value: unknown, path: string): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new CanonicalJsonError(`Non-finite number at ${path} cannot be canonicalized.`);
      }
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        return `[${value.map((entry, i) => serialize(entry, `${path}[${i}]`)).join(",")}]`;
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      const parts: string[] = [];
      for (const key of keys) {
        const entry = record[key];
        if (entry === undefined) {
          throw new CanonicalJsonError(
            `undefined value at ${path}.${key} — omit the key or use null explicitly.`,
          );
        }
        parts.push(`${JSON.stringify(key)}:${serialize(entry, `${path}.${key}`)}`);
      }
      return `{${parts.join(",")}}`;
    }
    default:
      throw new CanonicalJsonError(
        `Value of type ${typeof value} at ${path} cannot be canonicalized.`,
      );
  }
}

/** Byte-stable canonical JSON encoding (sorted keys, strict primitives). */
export function canonicalJsonStringify(value: CanonicalJsonValue): string {
  return serialize(value, "$");
}

/** sha256 hex over the namespaced canonical encoding of `value`. */
export function sha256CanonicalJson(value: CanonicalJsonValue, namespace: string): string {
  return createHash("sha256")
    .update(`${namespace}:${canonicalJsonStringify(value)}`, "utf8")
    .digest("hex");
}
