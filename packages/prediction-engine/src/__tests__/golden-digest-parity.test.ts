/**
 * Cross-runtime golden-digest parity (Standing Rule 4).
 *
 * The seal is hashed in TypeScript and, on the Python side, in the delta writer and the
 * simulator. `JSON.stringify` emits keys in insertion order while Python's
 * `json.dumps(sort_keys=True)` sorts them, so the same logical object produced
 * dd6549a… on one side and 0821671… on the other. Until both runtimes agree bit for
 * bit, every newly ingested mid-week value stays Class B.
 *
 * This test pins the agreement. The fixture is deliberately hostile: keys are inserted
 * in reverse-lexicographic order at every depth, arrays interleave objects, and a
 * `undefined` member sits beside a real one. If the TypeScript serializer ever falls
 * back to insertion order, the digests diverge and this fails.
 */

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { computeCanonicalSealDigest } from "../coach-sim/locked-projection.js";

/** Reverse-lexicographic insertion at every depth, so insertion order != sorted order. */
const FIXTURE = {
  zulu: 1,
  yankee: { zulu: "z", alpha: "a", mike: [3, { zulu: true, alpha: false }] },
  alpha: { zulu: null, alpha: 0 },
  mike: [1, 2, 3],
  bravo: "b",
  dropped: undefined,
  charlie: { zulu: { zulu: 9, alpha: 8 }, alpha: 7 },
};

// Mirrors scripts/ops/gse_coach_mind_simulator.py _canon exactly: string-built, UTF-8
// literal, integral floats narrowed, sub-1e-4 floats pinned to 8 decimals, NaN a hard error.
const PYTHON = `
import hashlib, json, sys

def canon(x):
    if x is None: return "null"
    if isinstance(x, bool): return "true" if x else "false"
    if isinstance(x, int): return str(x)
    if isinstance(x, float):
        if x != x or x in (float("inf"), float("-inf")): raise ValueError("non-finite")
        if x.is_integer():
            if abs(x) >= 1e21: return repr(x)
            return str(int(x))
        if abs(x) < 1e-4:
            f = f"{x:.8f}".rstrip("0").rstrip(".")
            return f if f != "-0" else "0"
        return repr(x)
    if isinstance(x, str): return json.dumps(x, ensure_ascii=False)
    if isinstance(x, list): return "[" + ",".join(canon(v) for v in x) + "]"
    if isinstance(x, dict):
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canon(x[k]) for k in sorted(x.keys())) + "}"
    raise TypeError(type(x).__name__)

print(hashlib.sha256(canon(json.loads(sys.stdin.read())).encode("utf-8")).hexdigest())
`;

/** Hash a Python *expression* — needed for values JSON cannot carry (NaN, Infinity). */
function pythonDigestExpr(expr: string): string {
  const res = spawnSync("python3", ["-c", PYTHON_EXPR.replace("__EXPR__", expr)], { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`python3 failed: ${res.stderr}`);
  return res.stdout.trim();
}

const PYTHON_EXPR = PYTHON.replace(
  'print(hashlib.sha256(canon(json.loads(sys.stdin.read())).encode("utf-8")).hexdigest())',
  'print(hashlib.sha256(canon(__EXPR__).encode("utf-8")).hexdigest())',
);

function pythonDigest(payload: unknown): string {
  // Round-trip through JSON so Python sees exactly what JS would serialise.
  const wire = JSON.stringify(payload);
  const res = spawnSync("python3", ["-c", PYTHON], { input: wire, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`python3 failed: ${res.stderr}`);
  return res.stdout.trim();
}

describe("golden digest parity across runtimes", () => {
  it("TypeScript and Python agree bit for bit on the hostile fixture", () => {
    const ts = computeCanonicalSealDigest(FIXTURE);
    const py = pythonDigest(FIXTURE);
    expect(ts).toHaveLength(64);
    expect(ts).toBe(py);
  });

  it("is stable under key reordering", () => {
    const reordered = {
      charlie: { alpha: 7, zulu: { alpha: 8, zulu: 9 } },
      bravo: "b",
      mike: [1, 2, 3],
      alpha: { alpha: 0, zulu: null },
      yankee: { mike: [3, { alpha: false, zulu: true }], alpha: "a", zulu: "z" },
      zulu: 1,
    };
    expect(computeCanonicalSealDigest(reordered)).toBe(computeCanonicalSealDigest(FIXTURE));
  });

  it("drops undefined members rather than serialising them", () => {
    expect(computeCanonicalSealDigest({ a: 1, b: undefined })).toBe(
      computeCanonicalSealDigest({ a: 1 }),
    );
  });

  it("preserves array order — sorting is for keys only", () => {
    expect(computeCanonicalSealDigest([3, 1, 2])).not.toBe(computeCanonicalSealDigest([1, 2, 3]));
  });

  it("sorts integer-like keys lexicographically, not numerically", () => {
    // A JS object enumerates "2" before "10"; Python sorts "10" before "2". Rebuilding an
    // object before stringify silently produced the numeric order and diverged.
    const payload = { "10": "a", "2": "b", a: "c" };
    expect(computeCanonicalSealDigest(payload)).toBe(pythonDigest(payload));
  });

  it("keeps non-ASCII literal instead of escaping it (C2)", () => {
    // Python defaults to ensure_ascii=True and emits \u03c4; JS emits the character.
    const payload = { symbol: "τ", dash: "—", name: "café" };
    expect(computeCanonicalSealDigest(payload)).toBe(pythonDigest(payload));
  });

  it("agrees with Python below the scientific-notation threshold (C3)", () => {
    // Python formats < 1e-4 as "1e-05"; JS stays fixed-point. Both are pinned to 8 decimals.
    const payload = { tiny: 0.00001, smaller: 2.5e-7, normal: 0.5 };
    expect(computeCanonicalSealDigest(payload)).toBe(pythonDigest(payload));
  });

  it("throws on NaN rather than emitting null (C5)", () => {
    expect(() => computeCanonicalSealDigest({ bad: NaN })).toThrow(/non-finite/);
    expect(() => computeCanonicalSealDigest({ bad: Infinity })).toThrow(/non-finite/);
  });

  it("agrees above 1e21 where both runtimes use exponent notation", () => {
    const payload = { huge: 1e21, bigger: 1.5e22 };
    expect(computeCanonicalSealDigest(payload)).toBe(pythonDigest(payload));
  });

  it("throws in the ambiguous band between MAX_SAFE_INTEGER and 1e21", () => {
    // 9007199254740993 is really ...992 in JS; emitting it would seal a number the caller
    // did not write.
    expect(() => computeCanonicalSealDigest({ n: 9007199254740993 })).toThrow(/MAX_SAFE_INTEGER/);
    expect(() => computeCanonicalSealDigest({ n: 1e20 })).toThrow(/MAX_SAFE_INTEGER/);
  });

  it("Python also rejects non-finite (C5, both sides)", () => {
    // JSON.stringify turns NaN into null, so a JSON round-trip never reaches Python's
    // guard. Pass a Python expression instead.
    expect(() => pythonDigestExpr('{"bad": float("nan")}')).toThrow(/non-finite/);
    expect(() => pythonDigestExpr('{"bad": float("inf")}')).toThrow(/non-finite/);
  });

  it("agrees with Python on integral floats", () => {
    // JS has no int/float split: 27.0 serialises as "27". Python emits "27.0" unless the
    // value is narrowed, so this is the case key-sorting alone cannot fix.
    const payload = { pace_sec: 27.0, rate: 0.5, whole: 3 };
    expect(computeCanonicalSealDigest(payload)).toBe(pythonDigest(payload));
  });
});
