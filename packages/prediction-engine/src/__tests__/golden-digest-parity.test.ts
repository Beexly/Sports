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

const PYTHON = `
import hashlib, json, sys
fixture = json.loads(sys.stdin.read())
canonical = json.dumps(fixture, sort_keys=True, separators=(",", ":"))
print(hashlib.sha256(canonical.encode("utf-8")).hexdigest())
`;

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

  it("agrees with Python on integral floats", () => {
    // JS has no int/float split: 27.0 serialises as "27". Python emits "27.0" unless the
    // value is narrowed, so this is the case key-sorting alone cannot fix.
    const payload = { pace_sec: 27.0, rate: 0.5, whole: 3 };
    expect(computeCanonicalSealDigest(payload)).toBe(pythonDigest(payload));
  });
});
