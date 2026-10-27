/**
 * Cross-language golden-digest gate.
 *
 * The Tuesday v1.0 coachMindsetHash is computed in TypeScript. The Python
 * verifier must reproduce it byte-for-byte. If the two runtimes disagree on a
 * single float's formatting, the seal verifies in one language and fails in
 * the other — and nobody notices until a mid-week overlay rejects a valid lock.
 *
 * This gate runs BOTH implementations over the same payload and asserts the
 * SHA-256 digests are identical. It is the fixture the build list asks for
 * before the next Tuesday seal.
 */

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { canonicalHash, FIXTURE_PAYLOAD, TS_DIGEST } from "./canonical_payload.js";

const HERE = join(import.meta.dirname ?? __dirname);
const PY = join(HERE, "canonical_payload.py");

function pythonDigest(): string {
  const py = process.platform === "win32" ? "python" : "python3";
  return execFileSync(py, [PY], { encoding: "utf-8" }).trim();
}

describe("cross-language seal canonicalization", () => {
  it("produces a 64-character SHA-256 on the TS side", () => {
    expect(TS_DIGEST).toMatch(/^[0-9a-f]{64}$/);
  });

  it("Python and TypeScript hash the same payload to the same digest", () => {
    const pyDigest = pythonDigest();
    expect(pyDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(pyDigest).toBe(TS_DIGEST);
  });

  it("is deterministic across repeated serializations", () => {
    expect(canonicalHash(FIXTURE_PAYLOAD)).toBe(TS_DIGEST);
  });

  it("sorts object keys so insertion order cannot change the digest", () => {
    const reordered = {
      payload: {
        nested: { none: null, empty: {}, list: [1, 2.0, 3.5] },
        epaDropoffTable: {
          TE1: 0.84,
          WR1: 0.82,
          RB1: 0.85,
          QB_QUESTIONABLE: 0.8106,
          QB1: 0.78,
        },
        tau: 0.0321,
        costMatrixC: [
          [0.0, 1.0],
          [1.0, 0.0],
        ],
        teamRatings: { SEA: -0.5, KC: 1.0, SF: 2.5, ATL: 0.0 },
      },
      week: "2026-W44",
    };
    expect(canonicalHash(reordered)).toBe(TS_DIGEST);
  });

  it("formats whole-number floats the way JavaScript does (1.0 -> 1)", () => {
    // The single most likely divergence: Python json.dumps emits "1.0",
    // JSON.stringify emits "1". If the Python mirror regresses to stock
    // json.dumps, this digest breaks and the gate fires.
    const a = canonicalHash({ x: 1.0 });
    const b = canonicalHash({ x: 1 });
    expect(a).toBe(b);
  });
});
