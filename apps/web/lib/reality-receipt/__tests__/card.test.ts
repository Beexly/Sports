import { describe, expect, it } from "vitest";
import { buildRealityReceiptCard, buildRealityReceiptUnavailableCard } from "../card";
import type { RealityReceipt } from "../types";

function receipt(overrides: Partial<RealityReceipt> = {}): RealityReceipt {
  return {
    schemaVersion: "reality-receipt/v0",
    generatedAt: "2026-07-17T12:00:00.000Z",
    game: { id: "game-1", sport: "NFL", matchup: "Away at Home", commenceTime: "2026-07-14T20:00:00.000Z" },
    decision: { kind: "PUBLISHED", reasonCode: "EDGE_CLEARED" },
    envelope: { id: "game-1:pick-1", digest: "e".repeat(64), publicationStatus: "ELIGIBLE" },
    receipt: { state: "OPEN", verified: true, frozenAt: "2026-07-14T16:00:00.000Z", modelVersion: "gse-v6", committed: null },
    anchor: { state: "NOT_REQUESTED" },
    slateInclusion: { state: "NOT_REQUESTED" },
    digest: "d".repeat(64),
    ...overrides,
  } as RealityReceipt;
}

describe("buildRealityReceiptCard", () => {
  it("renders matchup, sport/decision/publication, and a truncated evidence digest", () => {
    const card = buildRealityReceiptCard(receipt());
    expect(card.headline).toBe("Away at Home");
    expect(card.subhead).toBe("NFL · PUBLISHED · ELIGIBLE");
    expect(card.lines[0]).toContain("e".repeat(16));
    expect(card.lines[0]).not.toContain("e".repeat(64));
    expect(card.footer).toContain("d".repeat(24));
  });

  it.each([
    ["BITCOIN_ATTESTED" as const, { state: "BITCOIN_ATTESTED" as const, slateKey: "NFL:2026-07-14", bitcoinBlockHeights: [905432] }, "Bitcoin (block 905432)"],
    ["PENDING" as const, { state: "PENDING" as const, slateKey: "NFL:2026-07-14", pendingCalendars: ["https://a.calendar"] }, "pending calendar"],
    ["NOT_REQUESTED" as const, { state: "NOT_REQUESTED" as const }, "No Bitcoin anchor requested"],
    ["NOT_MIGRATED" as const, { state: "NOT_MIGRATED" as const }, "not yet activated"],
    ["UNAVAILABLE" as const, { state: "UNAVAILABLE" as const }, "temporarily unavailable"],
    ["NO_PROOF" as const, { state: "NO_PROOF" as const }, "No Bitcoin anchor on record"],
  ])("maps anchor state %s to honest copy", (_label, anchor, expected) => {
    const card = buildRealityReceiptCard(receipt({ anchor }));
    expect(card.lines[2]).toContain(expected);
  });

  it.each([
    [
      "PROVEN" as const,
      {
        state: "PROVEN" as const,
        slateKey: "NFL:2026-07-14",
        root: "r".repeat(64),
        count: 3,
        index: 1,
        proof: { leaf: "l".repeat(64), siblings: [], index: 1 },
      },
      "position 2 of 3",
    ],
    ["SEALED" as const, { state: "SEALED" as const }, "sealed until kickoff"],
    ["UNAVAILABLE" as const, { state: "UNAVAILABLE" as const }, "temporarily unavailable"],
    ["NOT_REQUESTED" as const, { state: "NOT_REQUESTED" as const }, "No slate commitment applies"],
  ])("maps slateInclusion state %s to honest copy — never claims PROVEN early", (_label, slateInclusion, expected) => {
    const card = buildRealityReceiptCard(receipt({ slateInclusion }));
    expect(card.lines[3]).toContain(expected);
  });

  it("says so when no receipt was captured — never fabricates a state", () => {
    const card = buildRealityReceiptCard(
      receipt({ receipt: { state: "NOT_CAPTURED", reason: "A PASS has no pick receipt." } }),
    );
    expect(card.lines[1]).toContain("No proof receipt captured");
    expect(card.lines[1]).toContain("A PASS has no pick receipt.");
  });

  it("flags a failed tamper check instead of silently showing 'verified'", () => {
    const card = buildRealityReceiptCard(
      receipt({ receipt: { state: "OPEN", verified: false, frozenAt: "2026-07-14T16:00:00.000Z", modelVersion: "gse-v6", committed: null } }),
    );
    expect(card.lines[1]).toContain("hash check FAILED");
  });
});

describe("buildRealityReceiptUnavailableCard", () => {
  it.each([
    ["NOT_FOUND" as const, "No such game."],
    ["NO_DECISION" as const, "No recorded decision"],
    ["UNAVAILABLE" as const, "not a verdict"],
  ])("renders honest copy for %s without fabricating a receipt", (reason, expected) => {
    const card = buildRealityReceiptUnavailableCard(reason);
    expect(card.subhead).toContain(expected);
    expect(card.lines).toHaveLength(0);
  });
});
