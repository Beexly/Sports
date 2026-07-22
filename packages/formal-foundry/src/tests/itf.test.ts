import { describe, expect, it } from "vitest";
import {
  decodeInt,
  decodeState,
  decodeTrace,
  decodeValue,
  encodeInt,
  encodeMap,
  encodeSet,
  encodeState,
  encodeTrace,
  encodeValue,
  ItfDecodeError,
} from "../itf.js";

describe("encodeInt / decodeInt", () => {
  it("round-trips small and negative integers", () => {
    for (const n of [0, 1, -1, 42, -42]) {
      expect(decodeInt(encodeInt(n))).toBe(BigInt(n));
    }
  });

  it("round-trips integers beyond Number.MAX_SAFE_INTEGER without precision loss (the whole point of #bigint)", () => {
    const huge = 123456789012345678901234567890n;
    const wire = encodeInt(huge);
    expect(wire).toEqual({ "#bigint": "123456789012345678901234567890" });
    expect(decodeInt(wire)).toBe(huge);
  });

  it("decodeInt fails closed on a malformed #bigint payload", () => {
    expect(() => decodeInt({ "#bigint": "not-a-number" })).toThrow(ItfDecodeError);
  });

  it("decodeInt fails closed on a value that isn't #bigint-shaped", () => {
    expect(() => decodeInt(true)).toThrow(ItfDecodeError);
    expect(() => decodeInt("nope")).toThrow(ItfDecodeError);
  });
});

describe("encodeValue / decodeValue — generic round trip (the regression suite for the array bug)", () => {
  it("round-trips booleans and strings", () => {
    expect(decodeValue(encodeValue(true))).toBe(true);
    expect(decodeValue(encodeValue(false))).toBe(false);
    expect(decodeValue(encodeValue("hello"))).toBe("hello");
  });

  it("round-trips numbers/bigints as #bigint", () => {
    expect(decodeValue(encodeValue(42))).toBe(42n);
    expect(decodeValue(encodeValue(7n))).toBe(7n);
  });

  it("round-trips a Set", () => {
    const s = new Set([1, 2, 3]);
    const decoded = decodeValue(encodeValue(s)) as Set<bigint>;
    expect(decoded).toBeInstanceOf(Set);
    expect([...decoded].sort()).toEqual([1n, 2n, 3n]);
  });

  it("round-trips a Map", () => {
    const m = new Map<string, number>([["a", 1], ["b", 2]]);
    const decoded = decodeValue(encodeValue(m)) as Map<string, bigint>;
    expect(decoded).toBeInstanceOf(Map);
    expect(decoded.get("a")).toBe(1n);
    expect(decoded.get("b")).toBe(2n);
  });

  it("round-trips a PLAIN ARRAY (tuple/sequence) — regression test for the fixed defect", () => {
    // Before the fix: encodeValue([1,2,3]) -> a plain ITF array [enc(1),
    // enc(2), enc(3)], but decodeValue had NO Array.isArray branch, so
    // `typeof v === "object"` sent it into the generic record-decode path,
    // and Object.entries on an array silently corrupted it into
    // {"0":1n,"1":2n,"2":3n} instead of [1n,2n,3n].
    const arr = [1, 2, 3];
    const wire = encodeValue(arr);
    expect(Array.isArray(wire)).toBe(true); // encode produces a plain array
    const decoded = decodeValue(wire);
    expect(Array.isArray(decoded)).toBe(true); // FIX: decode recognizes it
    expect(decoded).toEqual([1n, 2n, 3n]);
  });

  it("round-trips a NESTED structure containing arrays inside records inside arrays", () => {
    const value = {
      items: [{ id: 1, tags: ["a", "b"] }, { id: 2, tags: [] }],
      count: 2,
    };
    const decoded = decodeValue(encodeValue(value)) as {
      items: { id: bigint; tags: string[] }[];
      count: bigint;
    };
    expect(Array.isArray(decoded.items)).toBe(true);
    expect(decoded.items).toHaveLength(2);
    expect(decoded.items[0]!.id).toBe(1n);
    expect(decoded.items[0]!.tags).toEqual(["a", "b"]);
    expect(decoded.items[1]!.tags).toEqual([]);
    expect(decoded.count).toBe(2n);
  });

  it("round-trips a plain record/object", () => {
    const rec = { a: 1, b: "x", c: true };
    const decoded = decodeValue(encodeValue(rec)) as { a: bigint; b: string; c: boolean };
    expect(decoded).toEqual({ a: 1n, b: "x", c: true });
  });

  it("still accepts the explicit #tup wire form for robustness (decode is permissive on tuples)", () => {
    const decoded = decodeValue({ "#tup": [encodeValue(1), encodeValue(2)] });
    expect(decoded).toEqual([1n, 2n]);
  });

  it("decodeValue fails closed on #unserializable", () => {
    expect(() => decodeValue({ "#unserializable": "opaque function value" })).toThrow(ItfDecodeError);
  });

  it("decodeValue fails closed on a malformed #set/#map", () => {
    expect(() => decodeValue({ "#set": "not-an-array" } as never)).toThrow(ItfDecodeError);
    expect(() => decodeValue({ "#map": [["only-one"]] } as never)).toThrow(ItfDecodeError);
  });
});

describe("encodeSet / encodeMap", () => {
  it("encodeSet produces a #set wrapper", () => {
    expect(encodeSet([1, 2], encodeValue)).toEqual({ "#set": [{ "#bigint": "1" }, { "#bigint": "2" }] });
  });

  it("encodeMap produces a #map wrapper of [k,v] pairs", () => {
    const m = new Map([["x", 1]]);
    expect(encodeMap(m, encodeValue, encodeValue)).toEqual({ "#map": [["x", { "#bigint": "1" }]] });
  });
});

describe("encodeState / decodeState — varTypes always attached, real GSE-shaped state", () => {
  it("always includes #meta.varTypes on the outbound state", () => {
    const state = encodeState({ status: "pending", count: 3 }, { status: "Str", count: "Int" });
    expect(state["#meta"]).toBeDefined();
    expect(state["#meta"]!.varTypes).toEqual({ status: "Str", count: "Int" });
  });

  it("round-trips a representative real GSE-shaped state (CreditReservation.tla's variables)", () => {
    // Grounded in formal/credit-budget/CreditReservation.tla's VARIABLES
    // block (reserved, state, admittedCount) — branch
    // labs/constellation-wave3-inductive.
    const domainState = {
      reserved: 3,
      state: { t1: "HELD", t2: "Unstarted", t3: "SETTLED", t4: "REFUSED" },
      admittedCount: 2,
    };
    const varTypes = { reserved: "Int", state: "Str -> Str", admittedCount: "Int" };
    const itf = encodeState(domainState, varTypes);
    const decoded = decodeState(itf);
    expect(decoded["reserved"]).toBe(3n);
    expect(decoded["admittedCount"]).toBe(2n);
    expect(decoded["state"]).toEqual({ t1: "HELD", t2: "Unstarted", t3: "SETTLED", t4: "REFUSED" });
  });

  it("round-trips arrays nested directly inside a top-level state variable", () => {
    // Grounded in InvocationClaim.tla's rejectedRequests: subset of
    // Invocations \X Fingerprints, i.e. a set of pairs — represented here
    // as an array of [inv, fp] tuples.
    const domainState = { rejectedRequests: [["i1", "fp2"], ["i2", "fp1"]] };
    const itf = encodeState(domainState, { rejectedRequests: "Set(<<Str,Str>>)" });
    const decoded = decodeState(itf);
    expect(decoded["rejectedRequests"]).toEqual([
      ["i1", "fp2"],
      ["i2", "fp1"],
    ]);
  });
});

describe("encodeTrace / decodeTrace", () => {
  it("round-trips a short trace and stamps #meta.index per state", () => {
    const states = [{ status: "pending" }, { status: "approved" }, { status: "closed" }];
    const trace = encodeTrace(states, ["status"], { status: "Str" });
    expect(trace.vars).toEqual(["status"]);
    expect(trace.states).toHaveLength(3);
    expect(trace.states[0]!["#meta"]!.index).toBe(0);
    expect(trace.states[2]!["#meta"]!.index).toBe(2);

    const decoded = decodeTrace(trace);
    expect(decoded.map((s) => s["status"])).toEqual(["pending", "approved", "closed"]);
  });
});
