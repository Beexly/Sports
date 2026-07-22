/**
 * GSE Formal Foundry — ITF Codec
 * Bidirectional domain ↔ Apalache Informal Trace Format.
 * Rules: integers only as { "#bigint": "..." }, varTypes required on outbound.
 * Soundness role: preserves state fidelity for assumeState / CTI / counterexamples.
 */

export type ItfBigint = { "#bigint": string };
export type ItfSet = { "#set": ItfValue[] };
export type ItfMap = { "#map": [ItfValue, ItfValue][] };
export type ItfTup = { "#tup": ItfValue[] };
export type ItfRecord = Record<string, ItfValue>;
export type ItfVariant = { tag: string; value: ItfValue | null };

export type ItfValue =
  | boolean
  | string
  | ItfBigint
  | ItfSet
  | ItfMap
  | ItfTup
  | ItfRecord
  | ItfVariant
  | { "#unserializable": string };

export interface ItfState {
  "#meta"?: { index?: number; varTypes?: Record<string, string>; [k: string]: unknown };
  [varName: string]: ItfValue | undefined;
}

export interface ItfTrace {
  "#meta": {
    format?: string;
    varTypes: Record<string, string>;
    [k: string]: unknown;
  };
  vars: string[];
  states: ItfState[];
  params?: string[];
  loop?: number;
}

/** Encode integer → ITF #bigint (never raw JSON number) */
export function encodeInt(n: number | bigint): ItfBigint {
  return { "#bigint": BigInt(n).toString() };
}

/** Decode ITF #bigint → bigint */
export function decodeInt(v: ItfValue): bigint {
  if (v && typeof v === "object" && "#bigint" in v) {
    return BigInt((v as ItfBigint)["#bigint"]);
  }
  throw new Error("ITF: expected #bigint");
}

export function encodeSet<T>(xs: Iterable<T>, enc: (x: T) => ItfValue): ItfSet {
  return { "#set": Array.from(xs).map(enc) };
}

export function encodeMap<
  K,
  V
>(m: Map<K, V>, kEnc: (k: K) => ItfValue, vEnc: (v: V) => ItfValue): ItfMap {
  return {
    "#map": Array.from(m.entries()).map(([k, v]) => [kEnc(k), vEnc(v)]),
  };
}

export function encodeValue(v: unknown): ItfValue {
  if (typeof v === "number" || typeof v === "bigint") return encodeInt(v);
  if (typeof v === "boolean" || typeof v === "string") return v;
  if (v instanceof Set) return encodeSet(v, encodeValue);
  if (v instanceof Map) return encodeMap(v, encodeValue, encodeValue);
  if (Array.isArray(v)) return v.map(encodeValue) as ItfValue;
  if (v && typeof v === "object") {
    const rec: ItfRecord = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      rec[k] = encodeValue(val);
    }
    return rec;
  }
  throw new Error(`ITF: unsupported value type: ${typeof v}`);
}

export function decodeValue(v: ItfValue): unknown {
  if (typeof v === "boolean" || typeof v === "string") return v;
  if (v && typeof v === "object") {
    if ("#bigint" in v) return decodeInt(v);
    if ("#set" in v) return new Set((v as ItfSet)["#set"].map(decodeValue));
    if ("#map" in v) {
      const m = new Map<unknown, unknown>();
      for (const [k, val] of (v as ItfMap)["#map"]) {
        m.set(decodeValue(k), decodeValue(val));
      }
      return m;
    }
    if ("#tup" in v) return (v as ItfTup)["#tup"].map(decodeValue);
    if ("#unserializable" in v) {
      throw new Error(
        `ITF: unserializable value: ${(v as { "#unserializable": string })["#unserializable"]}`
      );
    }
    const rec: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as ItfRecord)) {
      rec[k] = decodeValue(val as ItfValue);
    }
    return rec;
  }
  throw new Error("ITF: cannot decode value");
}

/** Domain state → ITF state (always includes varTypes) */
export function encodeState(
  state: Record<string, unknown>,
  varTypes: Record<string, string>
): ItfState {
  const encoded: ItfState = {
    "#meta": { varTypes },
  };
  for (const [key, value] of Object.entries(state)) {
    encoded[key] = encodeValue(value);
  }
  return encoded;
}

/** ITF state → domain state */
export function decodeState(itf: ItfState): Record<string, unknown> {
  const domain: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(itf)) {
    if (key === "#meta") continue;
    if (value !== undefined) domain[key] = decodeValue(value);
  }
  return domain;
}

export function encodeTrace(
  states: Record<string, unknown>[],
  vars: string[],
  varTypes: Record<string, string>
): ItfTrace {
  return {
    "#meta": { format: "ITF", varTypes },
    vars,
    states: states.map((s) => encodeState(s, varTypes)),
  };
}

export function decodeTrace(trace: ItfTrace): Record<string, unknown>[] {
  return trace.states.map(decodeState);
}
