import { describe, it, expect } from "vitest";
import { createGenesisReceipt, isReceiptValid, type CreateGenesisReceiptArgs } from "../receipt.js";

/** Deterministic, dependency-free test hash (FNV-1a 32-bit hex). PRODUCTION injects sha256. */
function testHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function baseArgs(over: Partial<CreateGenesisReceiptArgs> = {}): CreateGenesisReceiptArgs {
  return {
    createdAt: "2026-06-26T00:00:00.000Z",
    engineVersion: "data-genesis@1",
    inputs: { a: 1, b: 2 },
    transformation: { method: "blend", weights: [0.5, 0.5] },
    output: { value: 0.61 },
    sourceKinds: ["odds"],
    sourceRefs: ["the-odds-api"],
    licenseScope: "internal_only",
    ...over,
  };
}

describe("GenesisReceipt — deterministic content hashing", () => {
  it("same input produces identical hashes", () => {
    const a = createGenesisReceipt(baseArgs(), testHash);
    const b = createGenesisReceipt(baseArgs(), testHash);
    expect(a.inputHash).toBe(b.inputHash);
    expect(a.transformationHash).toBe(b.transformationHash);
    expect(a.outputHash).toBe(b.outputHash);
    expect(a.receiptId).toBe(b.receiptId);
  });

  it("different input changes the input hash", () => {
    const a = createGenesisReceipt(baseArgs(), testHash);
    const b = createGenesisReceipt(baseArgs({ inputs: { a: 1, b: 3 } }), testHash);
    expect(a.inputHash).not.toBe(b.inputHash);
  });

  it("key order in the inputs does NOT change the hash", () => {
    const a = createGenesisReceipt(baseArgs({ inputs: { a: 1, b: 2 } }), testHash);
    const b = createGenesisReceipt(baseArgs({ inputs: { b: 2, a: 1 } }), testHash);
    expect(a.inputHash).toBe(b.inputHash);
  });

  it("missing source/license fields produce safe defaults", () => {
    const r = createGenesisReceipt(
      { createdAt: "2026-06-26T00:00:00.000Z", engineVersion: "e", inputs: {}, transformation: {}, output: {} },
      testHash,
    );
    expect(r.sourceKinds).toEqual([]);
    expect(r.sourceRefs).toEqual([]);
    expect(r.licenseScope).toBe("unknown");
    expect(r.synthetic).toBe(true);
  });

  it("receiptIntegrity is valid only when all required fields exist", () => {
    expect(createGenesisReceipt(baseArgs(), testHash).receiptIntegrity).toBe("valid");
    expect(createGenesisReceipt(baseArgs({ engineVersion: "" }), testHash).receiptIntegrity).toBe("invalid");
    expect(createGenesisReceipt(baseArgs({ createdAt: "  " }), testHash).receiptIntegrity).toBe("invalid");
    expect(isReceiptValid(createGenesisReceipt(baseArgs(), testHash))).toBe(true);
    expect(isReceiptValid(createGenesisReceipt(baseArgs({ engineVersion: "" }), testHash))).toBe(false);
  });

  it("provenance is bound into the transformation hash", () => {
    const a = createGenesisReceipt(baseArgs({ sourceRefs: ["src-a"] }), testHash);
    const b = createGenesisReceipt(baseArgs({ sourceRefs: ["src-b"] }), testHash);
    expect(a.transformationHash).not.toBe(b.transformationHash);
  });
});
