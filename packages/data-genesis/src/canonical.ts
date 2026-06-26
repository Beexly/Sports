/**
 * Canonical serialization — a deterministic, stable string form for any JSON-like value.
 *
 * Receipts hash over this. `JSON.stringify` is NOT safe for hashing: object key order is
 * insertion-dependent, so the same logical payload can stringify two different ways and break a hash
 * comparison. `canonicalize` sorts object keys recursively, renders `Date` as an ISO string, and
 * refuses the values that have no stable JSON image (`undefined`, functions, symbols, `bigint`,
 * non-finite numbers) and circular structures — loudly, never silently.
 */

function encodeString(value: string): string {
  return JSON.stringify(value);
}

function serialize(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";

  const t = typeof value;
  if (t === "string") return encodeString(value as string);
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonicalize: non-finite numbers (NaN/Infinity) are not serializable");
    }
    return JSON.stringify(value);
  }
  if (t === "undefined") throw new Error("canonicalize: `undefined` is not serializable");
  if (t === "function") throw new Error("canonicalize: functions are not serializable");
  if (t === "symbol") throw new Error("canonicalize: symbols are not serializable");
  if (t === "bigint") {
    throw new Error("canonicalize: bigint is not serializable — convert to string/number intentionally");
  }

  if (value instanceof Date) {
    const iso = value.toISOString(); // throws on an invalid Date, which is the correct failure
    return encodeString(iso);
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error("canonicalize: circular structure detected");
    seen.add(value);
    const body = value.map((v) => serialize(v, seen)).join(",");
    seen.delete(value);
    return `[${body}]`;
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) throw new Error("canonicalize: circular structure detected");
    seen.add(obj);
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) continue; // omit undefined-valued properties, exactly like JSON.stringify
      parts.push(`${encodeString(k)}:${serialize(v, seen)}`);
    }
    seen.delete(obj);
    return `{${parts.join(",")}}`;
  }

  throw new Error(`canonicalize: unsupported value of type "${t}"`);
}

/** Deterministic, stable serialization with sorted keys. Used for receipts and hashes. */
export function canonicalize(value: unknown): string {
  return serialize(value, new Set<object>());
}

/** True when two values have the same canonical form. */
export function canonicalEquals(a: unknown, b: unknown): boolean {
  return canonicalize(a) === canonicalize(b);
}
