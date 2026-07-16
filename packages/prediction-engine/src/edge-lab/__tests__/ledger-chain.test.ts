/**
 * Glass Ledger pin tests (handoff §2 P2): genesis linkage, a 3-pick/2-settlement
 * chain verifying clean, tamper detection naming the broken seq, every
 * append-time integrity throw (seq gap, prevHash mismatch, publish-before-kickoff,
 * unknown-pick settlement), the CLV sign convention pinned with exact numbers,
 * and the anchor module's hard gate + zero-I/O contract.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  GENESIS_HASH,
  LedgerIntegrityError,
  appendPick,
  appendSettlement,
  chainDigest,
  computeClvBps,
  isSettlement,
  nextLinkage,
  verifyChain,
  type LedgerChain,
  type PickEntryInput,
  type SettlementEntryInput,
} from "../ledger-chain.js";
import { sha256Hex } from "../provenance.js";
import { GatedActionError, anchorExternally, buildAnchorPayload } from "../ledger-anchor.js";

const HASH64 = "a".repeat(64);

function pickInput(chain: LedgerChain, overrides: Partial<PickEntryInput> = {}): PickEntryInput {
  const linkage = nextLinkage(chain);
  return {
    seq: linkage.seq,
    prevHash: linkage.prevHash,
    pickId: `pick-${linkage.seq}`,
    sport: "NFL",
    market: "SPREAD",
    selection: "Chiefs -3.5",
    priceDecimal: 1.91,
    book: "pinnacle",
    decisionAt: "2026-09-10T17:00:00.000Z",
    kickoffAt: "2026-09-10T20:00:00.000Z",
    modelVersion: "v5.1.0",
    featureSnapshotHash: HASH64,
    ...overrides,
  };
}

function settlementInput(
  chain: LedgerChain,
  pickId: string,
  overrides: Partial<SettlementEntryInput> = {},
): SettlementEntryInput {
  const linkage = nextLinkage(chain);
  return {
    seq: linkage.seq,
    pickId,
    settledAt: "2026-09-11T00:00:00.000Z",
    outcome: "WIN",
    closingPriceDecimal: 1.87,
    clvBps: 220,
    prevHash: linkage.prevHash,
    ...overrides,
  };
}

describe("genesis linkage", () => {
  it("GENESIS_HASH is sha256 of the literal seed string", () => {
    expect(GENESIS_HASH).toBe(sha256Hex("GSE-GLASS-LEDGER-GENESIS"));
    expect(GENESIS_HASH).toMatch(/^[0-9a-f]{64}$/);
  });

  it("nextLinkage and chainDigest agree on an empty chain", () => {
    const chain: LedgerChain = [];
    expect(nextLinkage(chain)).toEqual({ seq: 0, prevHash: GENESIS_HASH });
    expect(chainDigest(chain)).toEqual({ tipHash: GENESIS_HASH, count: 0 });
  });
});

describe("appendSettlement — paired closing/CLV fields", () => {
  it("rejects a posted CLV with no closing price (and vice versa); both-null stays first-class", () => {
    let chain: LedgerChain = [];
    chain = appendPick(chain, pickInput(chain, { pickId: "p0" }));
    expect(() =>
      appendSettlement(chain, settlementInput(chain, "p0", { clvBps: 500, closingPriceDecimal: null })),
    ).toThrow(/present together or both null/);
    expect(() =>
      appendSettlement(chain, settlementInput(chain, "p0", { clvBps: null, closingPriceDecimal: 1.91 })),
    ).toThrow(/present together or both null/);
    chain = appendSettlement(
      chain,
      settlementInput(chain, "p0", { clvBps: null, closingPriceDecimal: null }),
    );
    expect(chain).toHaveLength(2);
  });
});

describe("append 3 picks + 2 settlements", () => {
  it("verifyChain reports valid on an honestly built chain", () => {
    let chain: LedgerChain = [];
    chain = appendPick(chain, pickInput(chain, { pickId: "p0" }));
    chain = appendPick(chain, pickInput(chain, { pickId: "p1", selection: "Under 47.5", market: "TOTAL" }));
    chain = appendPick(chain, pickInput(chain, { pickId: "p2", selection: "Lakers ML", market: "MONEYLINE" }));
    chain = appendSettlement(chain, settlementInput(chain, "p0", { outcome: "WIN" }));
    chain = appendSettlement(chain, settlementInput(chain, "p1", { outcome: "LOSS", clvBps: -80 }));

    expect(chain).toHaveLength(5);
    expect(chain.map((e) => e.seq)).toEqual([0, 1, 2, 3, 4]);
    const result = verifyChain(chain);
    expect(result).toEqual({ valid: true });

    // Digest is exactly the tip's entryHash + total count.
    const digest = chainDigest(chain);
    expect(digest.count).toBe(5);
    expect(digest.tipHash).toBe(chain[4]!.entryHash);
  });
});

describe("tamper detection", () => {
  function buildValidChain(): LedgerChain {
    let chain: LedgerChain = [];
    chain = appendPick(chain, pickInput(chain, { pickId: "p0" }));
    chain = appendPick(chain, pickInput(chain, { pickId: "p1" }));
    chain = appendSettlement(chain, settlementInput(chain, "p0"));
    return chain;
  }

  it("tampering a pick field breaks verifyChain and names that seq", () => {
    const chain = buildValidChain();
    const tampered = chain.map((e, i) => (i === 1 ? { ...e, priceDecimal: 999 } : e)) as LedgerChain;
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
  });

  it("tampering a settlement field breaks verifyChain and names that seq", () => {
    const chain = buildValidChain();
    const tampered = chain.map((e, i) => (i === 2 ? { ...e, outcome: "LOSS" } : e)) as LedgerChain;
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  it("tampering prevHash on a middle entry breaks the chain at that seq, not the first entry", () => {
    const chain = buildValidChain();
    const tampered = chain.map((e, i) => (i === 1 ? { ...e, prevHash: HASH64 } : e)) as LedgerChain;
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
  });
});

describe("append-time integrity errors", () => {
  it("throws LedgerIntegrityError on a seq gap", () => {
    const chain: LedgerChain = [];
    const bad = pickInput(chain, { seq: 1 }); // expected 0
    expect(() => appendPick(chain, bad)).toThrow(LedgerIntegrityError);
    try {
      appendPick(chain, bad);
    } catch (err) {
      expect(err).toBeInstanceOf(LedgerIntegrityError);
      expect((err as LedgerIntegrityError).code).toBe("SEQ_GAP");
    }
  });

  it("throws LedgerIntegrityError on a prevHash mismatch", () => {
    const chain: LedgerChain = [];
    const bad = pickInput(chain, { prevHash: HASH64 }); // expected GENESIS_HASH
    expect(() => appendPick(chain, bad)).toThrow(LedgerIntegrityError);
    try {
      appendPick(chain, bad);
    } catch (err) {
      expect((err as LedgerIntegrityError).code).toBe("PREV_HASH_MISMATCH");
    }
  });

  it("throws LedgerIntegrityError when decisionAt equals kickoffAt (the publish-before-kickoff invariant)", () => {
    const chain: LedgerChain = [];
    const bad = pickInput(chain, {
      decisionAt: "2026-09-10T20:00:00.000Z",
      kickoffAt: "2026-09-10T20:00:00.000Z",
    });
    expect(() => appendPick(chain, bad)).toThrow(LedgerIntegrityError);
    try {
      appendPick(chain, bad);
    } catch (err) {
      expect((err as LedgerIntegrityError).code).toBe("DECISION_AFTER_KICKOFF");
    }
  });

  it("throws LedgerIntegrityError when decisionAt is after kickoffAt", () => {
    const chain: LedgerChain = [];
    const bad = pickInput(chain, {
      decisionAt: "2026-09-10T21:00:00.000Z",
      kickoffAt: "2026-09-10T20:00:00.000Z",
    });
    expect(() => appendPick(chain, bad)).toThrow(LedgerIntegrityError);
  });

  it("throws LedgerIntegrityError when a settlement references a pickId not in the chain", () => {
    let chain: LedgerChain = [];
    chain = appendPick(chain, pickInput(chain, { pickId: "p0" }));
    const bad = settlementInput(chain, "does-not-exist");
    expect(() => appendSettlement(chain, bad)).toThrow(LedgerIntegrityError);
    try {
      appendSettlement(chain, bad);
    } catch (err) {
      expect((err as LedgerIntegrityError).code).toBe("UNKNOWN_PICK");
    }
  });

  it("the API only appends — appendPick/appendSettlement never mutate the input chain", () => {
    let chain: LedgerChain = [];
    chain = appendPick(chain, pickInput(chain, { pickId: "p0" }));
    const before = chain;
    const next = appendPick(chain, pickInput(chain, { pickId: "p1" }));
    expect(chain).toBe(before);
    expect(chain).toHaveLength(1);
    expect(next).toHaveLength(2);
    expect(next).not.toBe(chain);
  });

  it("isSettlement discriminates picks from settlements", () => {
    let chain: LedgerChain = [];
    chain = appendPick(chain, pickInput(chain, { pickId: "p0" }));
    chain = appendSettlement(chain, settlementInput(chain, "p0"));
    expect(isSettlement(chain[0]!)).toBe(false);
    expect(isSettlement(chain[1]!)).toBe(true);
  });
});

describe("computeClvBps — sign convention", () => {
  it("decision 2.10, close 1.95 -> POSITIVE (we beat the close)", () => {
    const bps = computeClvBps(2.1, 1.95);
    expect(bps).toBeCloseTo(366.3, 2);
    expect(bps).toBeGreaterThan(0);
  });

  it("decision 1.90, close 1.95 -> NEGATIVE (we lost value to the close)", () => {
    const bps = computeClvBps(1.9, 1.95);
    expect(bps).toBeCloseTo(-134.95, 2);
    expect(bps).toBeLessThan(0);
  });

  it("rejects non-finite or sub-1 decimal prices", () => {
    expect(() => computeClvBps(1, 1.95)).toThrow(RangeError);
    expect(() => computeClvBps(2.1, 0)).toThrow(RangeError);
    expect(() => computeClvBps(NaN, 1.95)).toThrow();
  });
});

describe("ledger-anchor — hard gate", () => {
  const digest = { tipHash: HASH64, count: 3 };
  const payload = buildAnchorPayload(digest, "2026-07-16T00:00:00.000Z");

  afterEach(() => {
    delete process.env.LEDGER_ANCHOR_ENABLED;
  });

  it("buildAnchorPayload is pure and echoes the digest", () => {
    expect(payload).toEqual({
      digestHex: HASH64,
      count: 3,
      anchoredAtUtc: "2026-07-16T00:00:00.000Z",
      scheme: "sha256-chain-tip",
    });
  });

  it("throws GatedActionError by default (env unset)", () => {
    delete process.env.LEDGER_ANCHOR_ENABLED;
    expect(() => anchorExternally(payload)).toThrow(GatedActionError);
    expect(() => anchorExternally(payload, "FOUNDER-CONFIRMED")).toThrow(GatedActionError);
  });

  it("throws GatedActionError when enabled but not confirmed", () => {
    process.env.LEDGER_ANCHOR_ENABLED = "true";
    expect(() => anchorExternally(payload)).toThrow(GatedActionError);
    expect(() => anchorExternally(payload, "not the token")).toThrow(GatedActionError);
  });

  it("enabled + confirmed returns the would-post payload with the correct digest, performing no network I/O", () => {
    process.env.LEDGER_ANCHOR_ENABLED = "true";
    const originalFetch = (globalThis as { fetch?: unknown }).fetch;
    let fetchCalled = false;
    (globalThis as { fetch?: unknown }).fetch = (...args: unknown[]) => {
      fetchCalled = true;
      throw new Error(`unexpected network call: ${JSON.stringify(args)}`);
    };
    try {
      const result = anchorExternally(payload, "FOUNDER-CONFIRMED");
      expect(result.wouldPost).toEqual(payload);
      expect(result.wouldPost.digestHex).toBe(HASH64);
      expect(result.wouldPost.count).toBe(3);
      expect(typeof result.instructions).toBe("string");
      expect(result.instructions.length).toBeGreaterThan(0);
      expect(fetchCalled).toBe(false);
    } finally {
      (globalThis as { fetch?: unknown }).fetch = originalFetch;
    }
  });
});
