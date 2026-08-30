import { describe, it, expect } from "vitest";
import {
  buildPickProofReceipt,
  verifyPickProofReceipt,
  type PickProofInput,
} from "../pick-proof-receipt.js";

// A deterministic, order-sensitive test hash. NOT cryptographic — production injects
// node:crypto sha256 (apps/web proof-hash.ts). Good enough to prove determinism +
// tamper-sensitivity here.
function testHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function base(overrides: Partial<PickProofInput> = {}): PickProofInput {
  return {
    pickId: "pick_abc",
    gameId: "game_xyz",
    selection: "Chiefs -3.5",
    pickType: "SPREAD",
    line: -3.5,
    entryOdds: -110,
    marketFairProb: 0.524,
    confidence: 72,
    edgeScore: 18,
    modelProb: null, // honest default — no calibrated probability exists today
    modelVersion: "v5.0.0",
    asOf: "2026-06-22T17:00:00.000Z",
    ...overrides,
  };
}

describe("pick proof receipt", () => {
  it("is deterministic — the same claim always hashes identically", () => {
    const a = buildPickProofReceipt(base(), testHash);
    const b = buildPickProofReceipt(base(), testHash);
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.payload).toBe(b.payload);
    expect(a.frozenAt).toBe("2026-06-22T17:00:00.000Z");
  });

  it("verifies a freshly built receipt", () => {
    const r = buildPickProofReceipt(base(), testHash);
    expect(verifyPickProofReceipt(r, testHash)).toBe(true);
  });

  it("commits 'none' for modelProb when no calibrated probability exists", () => {
    const without = buildPickProofReceipt(base({ modelProb: null }), testHash);
    const withProb = buildPickProofReceipt(base({ modelProb: 0.58 }), testHash);
    expect(without.payload).toMatch(/modelProb=none/);
    // Adding a calibrated prob later is a different, separately-committed claim.
    expect(without.contentHash).not.toBe(withProb.contentHash);
  });

  it("is tamper-evident — editing any committed field changes the hash", () => {
    const original = buildPickProofReceipt(base(), testHash);
    const fields: Array<Partial<PickProofInput>> = [
      { modelProb: 0.562 }, // claiming a calibrated prob after the fact
      { marketFairProb: 0.523 }, // nudged market fair prob
      { confidence: 73 }, // nudged the published confidence score
      { edgeScore: 19 },
      { line: -3 }, // moved the line
      { entryOdds: -115 }, // better price claimed after the fact
      { selection: "Chiefs -3" },
      { asOf: "2026-06-22T18:00:00.000Z" }, // back-dating attempt
      { modelVersion: "v6.0.0" },
    ];
    for (const patch of fields) {
      const altered = buildPickProofReceipt(base(patch), testHash);
      expect(altered.contentHash).not.toBe(original.contentHash);
    }
  });

  it("detects a post-hoc edit to a stored receipt's fields", () => {
    const r = buildPickProofReceipt(base(), testHash);
    // Someone rewrites the claimed confidence but keeps the old hash.
    const tampered = { ...r, fields: { ...r.fields, confidence: 99 } };
    expect(verifyPickProofReceipt(tampered, testHash)).toBe(false);
  });

  it("ignores float noise below the committed precision", () => {
    const a = buildPickProofReceipt(base({ marketFairProb: 0.524 }), testHash);
    const b = buildPickProofReceipt(base({ marketFairProb: 0.524 + 1e-9 }), testHash);
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("refuses to mint a receipt from invalid input (never fabricates)", () => {
    expect(() => buildPickProofReceipt(base({ modelProb: 1.4 }), testHash)).toThrow(/probability/);
    expect(() => buildPickProofReceipt(base({ marketFairProb: -0.1 }), testHash)).toThrow(/probability/);
    expect(() => buildPickProofReceipt(base({ entryOdds: 0 }), testHash)).toThrow(/entryOdds/);
    expect(() => buildPickProofReceipt(base({ pickId: "" }), testHash)).toThrow(/pickId/);
    expect(() => buildPickProofReceipt(base({ edgeScore: Number.NaN }), testHash)).toThrow(/edgeScore/);
    expect(() => buildPickProofReceipt(base({ confidence: Number.NaN }), testHash)).toThrow(/confidence/);
  });
});
