import { describe, expect, it } from "vitest";
import {
  buildReceipt,
  chainReceipts,
  fingerprintPayload,
  ledgerHead,
  recomputeChain,
  type PickReceipt,
} from "../glass-receipts.js";

type ReceiptSpec = Omit<Parameters<typeof buildReceipt>[0], "prevFingerprint">;

function spec(
  index: number,
  result: PickReceipt["result"] = "OPEN",
  extra: Partial<ReceiptSpec> = {},
): ReceiptSpec {
  return {
    pickId: `pick-${index}`,
    sport: "NFL",
    market: "spread",
    selection: index % 2 === 0 ? "home" : "away",
    modelVersion: "gse-glass-1.0.0",
    committedAt: `2026-08-21T00:00:${String(index % 60).padStart(2, "0")}Z`,
    settledAt: result === "OPEN" ? null : `2026-08-22T00:00:${String(index % 60).padStart(2, "0")}Z`,
    result,
    edgeIndex: 0.04,
    clv: 0.01,
    ...extra,
  };
}

function hex8(value: string): void {
  expect(value).toMatch(/^[0-9a-f]{8}$/);
}

describe("fingerprintPayload", () => {
  it("returns the same 8-char hex for the same input", () => {
    const a = fingerprintPayload("pick-1|NFL|spread|home");
    const b = fingerprintPayload("pick-1|NFL|spread|home");
    hex8(a);
    expect(a).toBe(b);
  });

  it("returns a different hex when the input differs", () => {
    const a = fingerprintPayload("pick-1|NFL|spread|home");
    const b = fingerprintPayload("pick-1|NFL|spread|away");
    hex8(a);
    hex8(b);
    expect(a).not.toBe(b);
  });

  it("is order-sensitive inside the payload string", () => {
    const a = fingerprintPayload("abc|def");
    const b = fingerprintPayload("def|abc");
    expect(a).not.toBe(b);
  });
});

describe("buildReceipt / chainReceipts prevFingerprint linking", () => {
  it("builds a genesis receipt with null prevFingerprint and a matching body fingerprint", () => {
    const receipt = buildReceipt(spec(0, "OPEN"));
    expect(receipt.prevFingerprint).toBeNull();
    expect(receipt.result).toBe("OPEN");
    expect(receipt.settledAt).toBeNull();
    const body = [
      receipt.pickId,
      receipt.sport,
      receipt.market,
      receipt.selection,
      receipt.modelVersion,
      receipt.committedAt,
      "",
      "OPEN",
      String(receipt.edgeIndex ?? ""),
      "",
    ].join("|");
    expect(receipt.fingerprint).toBe(fingerprintPayload(body));
    hex8(receipt.fingerprint);
  });

  it("chains receipts so each prevFingerprint is the prior fingerprint", () => {
    const receipts = chainReceipts([
      spec(1, "WIN"),
      spec(2, "LOSS"),
      spec(3, "PUSH"),
    ]);
    expect(receipts).toHaveLength(3);
    expect(receipts[0]?.prevFingerprint).toBeNull();
    expect(receipts[1]?.prevFingerprint).toBe(receipts[0]?.fingerprint);
    expect(receipts[2]?.prevFingerprint).toBe(receipts[1]?.fingerprint);
    expect(receipts[0]?.fingerprint).not.toBe(receipts[1]?.fingerprint);
    expect(receipts[1]?.fingerprint).not.toBe(receipts[2]?.fingerprint);
  });

  it("embeds prevFingerprint in the hashed body so a different predecessor changes the fingerprint", () => {
    const first = buildReceipt(spec(10, "WIN"));
    const linked = buildReceipt({ ...spec(11, "LOSS"), prevFingerprint: first.fingerprint });
    const unlinked = buildReceipt({ ...spec(11, "LOSS"), prevFingerprint: null });
    expect(linked.prevFingerprint).toBe(first.fingerprint);
    expect(unlinked.prevFingerprint).toBeNull();
    expect(linked.fingerprint).not.toBe(unlinked.fingerprint);
  });

  it("matches chainReceipts against sequential buildReceipt calls", () => {
    const specs = [spec(20, "OPEN"), spec(21, "WIN")];
    const chained = chainReceipts(specs);
    const a = buildReceipt(specs[0]!);
    const b = buildReceipt({ ...specs[1]!, prevFingerprint: a.fingerprint });
    expect(chained[0]).toEqual(a);
    expect(chained[1]).toEqual(b);
  });
});

describe("recomputeChain tamper detection", () => {
  it("returns ok true for an unmodified chain and a stable master fingerprint", () => {
    const receipts = chainReceipts([spec(1, "WIN"), spec(2, "LOSS"), spec(3, "OPEN")]);
    const once = recomputeChain(receipts);
    const twice = recomputeChain(receipts);
    expect(once.ok).toBe(true);
    expect(twice.ok).toBe(true);
    expect(once.master).toBe(twice.master);
    expect(once.master).toBe(
      fingerprintPayload(receipts.map((r) => r.fingerprint).join("")),
    );
  });

  it("flips ok to false when a hashed field is tampered", () => {
    const receipts = chainReceipts([spec(1, "WIN"), spec(2, "LOSS"), spec(3, "PUSH")]);
    const honest = recomputeChain(receipts);
    expect(honest.ok).toBe(true);

    const tampered: PickReceipt[] = receipts.map((r, i) =>
      i === 1 ? { ...r, result: "WIN" } : r,
    );
    const check = recomputeChain(tampered);
    expect(check.ok).toBe(false);
    expect(tampered[1]?.fingerprint).toBe(receipts[1]?.fingerprint);
    expect(tampered[1]?.result).not.toBe(receipts[1]?.result);
  });

  it("flips ok to false when the stored fingerprint is overwritten", () => {
    const receipts = chainReceipts([spec(4, "WIN"), spec(5, "LOSS")]);
    expect(recomputeChain(receipts).ok).toBe(true);
    const tampered: PickReceipt[] = [
      receipts[0]!,
      { ...receipts[1]!, fingerprint: "deadbeef" },
    ];
    expect(recomputeChain(tampered).ok).toBe(false);
  });

  it("flips ok to false when a receipt's fingerprint was computed under a different predecessor", () => {
    const receipts = chainReceipts([spec(6, "WIN"), spec(7, "LOSS")]);
    expect(recomputeChain(receipts).ok).toBe(true);
    const alien = buildReceipt({ ...spec(7, "LOSS"), prevFingerprint: "ffffffff" });
    const broken: PickReceipt[] = [receipts[0]!, alien];
    expect(alien.fingerprint).not.toBe(receipts[1]?.fingerprint);
    expect(recomputeChain(broken).ok).toBe(false);
  });
});

describe("ledgerHead settled-floor gating", () => {
  function mix(counts: {
    win: number;
    loss: number;
    push?: number;
    open?: number;
    bootstrap?: number;
  }): PickReceipt[] {
    const rows: ReceiptSpec[] = [];
    let i = 0;
    for (let w = 0; w < counts.win; w++) rows.push(spec(i++, "WIN"));
    for (let l = 0; l < counts.loss; l++) rows.push(spec(i++, "LOSS"));
    for (let p = 0; p < (counts.push ?? 0); p++) rows.push(spec(i++, "PUSH"));
    for (let o = 0; o < (counts.open ?? 0); o++) rows.push(spec(i++, "OPEN"));
    for (let b = 0; b < (counts.bootstrap ?? 0); b++) rows.push(spec(i++, "BOOTSTRAP"));
    return chainReceipts(rows);
  }

  it("below floor: winRatePublic is false and winRate is null", () => {
    const receipts = mix({
      win: 40,
      loss: 59,
      push: 20,
      open: 8,
      bootstrap: 5,
    });
    const judged = 40 + 59;
    expect(judged).toBe(99);
    const head = ledgerHead(receipts);
    expect(head.n).toBe(receipts.length);
    expect(head.nSettled).toBe(40 + 59 + 20);
    expect(head.nBootstrap).toBe(5);
    expect(head.winRatePublic).toBe(false);
    expect(head.winRate).toBeNull();
    expect(head.gate).toBe("closed — need 1 more judged picks");
    expect(head.masterFingerprint).toBe(recomputeChain(receipts).master);
  });

  it("at floor: winRatePublic is true and winRate is WIN/LOSS only", () => {
    const receipts = mix({
      win: 60,
      loss: 40,
      push: 12,
      open: 7,
      bootstrap: 3,
    });
    const head = ledgerHead(receipts);
    expect(head.winRatePublic).toBe(true);
    expect(head.winRate).toBe(60 / 100);
    expect(head.nSettled).toBe(60 + 40 + 12);
    expect(head.nBootstrap).toBe(3);
    expect(head.n).toBe(60 + 40 + 12 + 7 + 3);
    expect(head.gate).toBe("open — settled floor met");
  });

  it("above floor: still public, still excluding PUSH/BOOTSTRAP/OPEN from winRate", () => {
    const receipts = mix({
      win: 70,
      loss: 40,
      push: 30,
      open: 10,
      bootstrap: 4,
    });
    const head = ledgerHead(receipts, 100);
    expect(head.winRatePublic).toBe(true);
    expect(head.winRate).toBe(70 / 110);
    expect(head.nSettled).toBe(70 + 40 + 30);
    expect(head.nBootstrap).toBe(4);
  });

  it("does not count PUSH/BOOTSTRAP/OPEN toward the judged floor", () => {
    const receipts = mix({
      win: 10,
      loss: 10,
      push: 80,
      open: 80,
      bootstrap: 80,
    });
    const head = ledgerHead(receipts, 100);
    expect(head.nSettled).toBe(10 + 10 + 80);
    expect(head.nBootstrap).toBe(80);
    expect(head.winRatePublic).toBe(false);
    expect(head.winRate).toBeNull();
    expect(head.gate).toBe("closed — need 80 more judged picks");
  });

  it("honors a custom settledFloor at the boundary", () => {
    const receipts = mix({ win: 3, loss: 1, push: 2, open: 1, bootstrap: 1 });
    const below = ledgerHead(receipts, 5);
    expect(below.winRatePublic).toBe(false);
    expect(below.winRate).toBeNull();

    const at = ledgerHead(receipts, 4);
    expect(at.winRatePublic).toBe(true);
    expect(at.winRate).toBe(3 / 4);
  });
});
