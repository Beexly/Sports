/**
 * GSE Formal Foundry — ITF Codec
 * Bidirectional domain <-> Apalache Intermediate Trace Format (ITF).
 * Rules: integers only as { "#bigint": "..." }, varTypes required on outbound.
 * Soundness role: preserves state fidelity for assumeState / CTI / counterexamples.
 *
 * Targets the ITF wire shape documented publicly in Apalache's ADR-015
 * ("Intermediate representation of counterexamples") as best remembered in
 * this environment — no Apalache binary or server has ever been reachable
 * here to verify it against (see apalache-client.ts's header for the full
 * honesty statement, which applies equally to this file). Every claim about
 * the wire shape is exercised by round-trip unit tests
 * (src/tests/itf.test.ts) rather than by a real server.
 *
 * Pure, no I/O.
 */

export type ItfBigint = { "#bigint": string };
export type ItfSet = { "#set": ItfValue[] };
export type ItfMap = { "#map": [ItfValue, ItfValue][] };
export type ItfTup = { "#tup": ItfValue[] };
// NOTE: an `interface` (not a `type X = Record<string, ItfValue>` alias) is
// required here — TS resolves interfaces lazily but eagerly expands `Record`
// aliases, and eagerly expanding this one directly inside the recursive
// `ItfValue` union below triggers "Type alias circularly references itself".
export interface ItfRecord {
  [key: string]: ItfValue;
}
export type ItfVariant = { tag: string; value: ItfValue | null };

export type ItfValue =
  | boolean
  | string
  | ItfBigint
  | ItfSet
  | ItfMap
  | ItfTup
  | ItfValue[]
  | ItfRecord
  | ItfVariant
  | { "#unserializable": string };

export type ItfStateMeta = { index?: number; varTypes?: Record<string, string>; [k: string]: unknown };

export interface ItfState {
  "#meta"?: ItfStateMeta;
  // The index signature's value type must be a supertype of every named
  // property's type (TS2411) — `"#meta"` is not an `ItfValue`, so
  // `ItfStateMeta` has to be part of this union too, even though in
  // practice every OTHER key always holds a plain `ItfValue`.
  [varName: string]: ItfValue | ItfStateMeta | undefined;
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

/**
 * Every ITF decode failure is this typed error (or thrown transparently —
 * no decode function here ever guesses a default for malformed input; see
 * the fail-closed non-negotiable this whole package follows).
 */
export class ItfDecodeError extends Error {
  constructor(
    message: string,
    readonly path: string = "$",
  ) {
    super(`ITF decode error at ${path}: ${message}`);
    this.name = "ItfDecodeError";
  }
}

/** Encode integer -> ITF #bigint (never a raw JSON number, avoiding
 *  precision loss for values outside the JS safe-integer range). */
export function encodeInt(n: number | bigint): ItfBigint {
  return { "#bigint": BigInt(n).toString() };
}

/** Decode ITF #bigint -> bigint. Fails closed (ItfDecodeError) on anything
 *  else, including a malformed (non-decimal-digit) payload string. */
export function decodeInt(v: ItfValue, path = "$"): bigint {
  if (v && typeof v === "object" && !Array.isArray(v) && "#bigint" in v) {
    const raw = (v as ItfBigint)["#bigint"];
    if (typeof raw !== "string" || !/^-?\d+$/.test(raw)) {
      throw new ItfDecodeError(`malformed "#bigint" payload: ${JSON.stringify(raw)}`, path);
    }
    return BigInt(raw);
  }
  throw new ItfDecodeError(`expected {"#bigint": "..."}, got ${JSON.stringify(v)}`, path);
}

export function encodeSet<T>(xs: Iterable<T>, enc: (x: T) => ItfValue): ItfSet {
  return { "#set": Array.from(xs).map(enc) };
}

export function encodeMap<K, V>(
  m: Map<K, V>,
  kEnc: (k: K) => ItfValue,
  vEnc: (v: V) => ItfValue,
): ItfMap {
  return {
    "#map": Array.from(m.entries()).map(([k, v]) => [kEnc(k), vEnc(v)]),
  };
}

/**
 * Encode an arbitrary domain value to ITF. Numbers/bigints always become
 * `{"#bigint": ...}` (never a raw JSON number — the ADR documents plain
 * numbers as an ALTERNATE valid small-int form, but this package
 * deliberately always uses the explicit tag: one universal representation,
 * no ambiguity for decode to resolve). `Set`/`Map` get their ITF tags;
 * plain JS arrays become plain ITF arrays (ITF's own convention for TLA+
 * tuples/sequences); everything else with own enumerable keys becomes an
 * ITF record.
 */
export function encodeValue(v: unknown): ItfValue {
  if (typeof v === "number" || typeof v === "bigint") return encodeInt(v);
  if (typeof v === "boolean" || typeof v === "string") return v;
  if (v instanceof Set) return encodeSet(v, encodeValue);
  if (v instanceof Map) return encodeMap(v, encodeValue, encodeValue);
  if (Array.isArray(v)) return v.map(encodeValue);
  if (v && typeof v === "object") {
    const rec: ItfRecord = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      rec[k] = encodeValue(val);
    }
    return rec;
  }
  throw new Error(`ITF: unsupported value type: ${typeof v}`);
}

/**
 * Decode an ITF value back to a domain value. FIXED (was the package's one
 * real defect at this layer): a plain ITF array — the wire form
 * `encodeValue` actually PRODUCES for a JS array (see above) — was
 * previously NOT recognized here (no `Array.isArray` branch existed before
 * the generic `Object.entries` record fallback), so `typeof v === "object"`
 * let every array fall into the record branch and `Object.entries([1,2,3])`
 * silently corrupted it into `{"0":1,"1":2,"2":3}` instead of `[1,2,3]`.
 * Arrays are now decoded explicitly, before the record fallback, and BOTH
 * wire forms a tuple/sequence might arrive in — a plain array, or an
 * explicit `{"#tup": [...]}` — are accepted for robustness against a real
 * server that may use either convention (this package's own `encodeValue`
 * only ever emits the plain-array form, but decode stays permissive).
 */
export function decodeValue(v: ItfValue, path = "$"): unknown {
  if (typeof v === "boolean" || typeof v === "string") return v;
  if (Array.isArray(v)) {
    return v.map((item, i) => decodeValue(item, `${path}[${i}]`));
  }
  if (v && typeof v === "object") {
    if ("#bigint" in v) return decodeInt(v, path);
    if ("#set" in v) {
      const set = (v as ItfSet)["#set"];
      if (!Array.isArray(set)) {
        throw new ItfDecodeError(`malformed "#set": expected an array`, path);
      }
      return new Set(set.map((item, i) => decodeValue(item, `${path}.#set[${i}]`)));
    }
    if ("#map" in v) {
      const entries = (v as ItfMap)["#map"];
      if (!Array.isArray(entries)) {
        throw new ItfDecodeError(`malformed "#map": expected an array of [k,v] pairs`, path);
      }
      const m = new Map<unknown, unknown>();
      entries.forEach(([k, val], i) => {
        if (k === undefined || val === undefined) {
          throw new ItfDecodeError(`malformed "#map" entry ${i}: expected a [key, value] pair`, path);
        }
        m.set(decodeValue(k, `${path}.#map[${i}][0]`), decodeValue(val, `${path}.#map[${i}][1]`));
      });
      return m;
    }
    if ("#tup" in v) {
      const tup = (v as ItfTup)["#tup"];
      if (!Array.isArray(tup)) {
        throw new ItfDecodeError(`malformed "#tup": expected an array`, path);
      }
      return tup.map((item, i) => decodeValue(item, `${path}.#tup[${i}]`));
    }
    if ("#unserializable" in v) {
      const repr = (v as { "#unserializable": string })["#unserializable"];
      throw new ItfDecodeError(`value was reported #unserializable by the producer: ${repr}`, path);
    }
    const rec: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as ItfRecord)) {
      rec[k] = decodeValue(val as ItfValue, `${path}.${k}`);
    }
    return rec;
  }
  throw new ItfDecodeError(`cannot decode value: ${JSON.stringify(v)}`, path);
}

/** Domain state -> ITF state. ALWAYS includes `#meta.varTypes` (never
 *  omitted) — every outbound encoded state is self-describing. */
export function encodeState(
  state: Record<string, unknown>,
  varTypes: Record<string, string>,
): ItfState {
  const encoded: ItfState = {
    "#meta": { varTypes },
  };
  for (const [key, value] of Object.entries(state)) {
    encoded[key] = encodeValue(value);
  }
  return encoded;
}

/** ITF state -> domain state. Fails closed on a variable whose value does
 *  not decode (propagates the `ItfDecodeError`, never silently drops it). */
export function decodeState(itf: ItfState): Record<string, unknown> {
  const domain: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(itf)) {
    if (key === "#meta") continue;
    // Every non-"#meta" key holds an ItfValue by this interface's own
    // convention (ItfStateMeta only ever appears under "#meta"); the cast
    // documents that invariant at the one place TS's index-signature
    // widening (see ItfState's declaration) can't express it structurally.
    if (value !== undefined) domain[key] = decodeValue(value as ItfValue, `$.${key}`);
  }
  return domain;
}

/** Encode an ordered list of domain states as an ITF trace, one `#meta` per
 *  state (via `encodeState`) plus the trace-level `#meta.varTypes`. */
export function encodeTrace(
  states: Record<string, unknown>[],
  vars: string[],
  varTypes: Record<string, string>,
): ItfTrace {
  return {
    "#meta": { format: "ITF", varTypes },
    vars,
    states: states.map((s, i) => {
      const encoded = encodeState(s, varTypes);
      encoded["#meta"] = { ...encoded["#meta"], index: i };
      return encoded;
    }),
  };
}

export function decodeTrace(trace: ItfTrace): Record<string, unknown>[] {
  return trace.states.map(decodeState);
}
