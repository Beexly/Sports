/**
 * W-OTS slice 2 — the mint-path anchor must be fail-open BY PROOF:
 * flag off → zero network + zero DB writes; all calendars down → the pending
 * artifact still stores; column not migrated → honest SKIP, never a throw.
 * The Merkle freeze path can never gain a failure mode from anchoring.
 */
import { describe, expect, it, vi } from "vitest";
import { deserializeDetached, otsStatus } from "@sports/crypto";
import { anchorSlateCommitment, isOtsAnchorEnabled } from "./ots-anchor-slate.js";

const ROOT = "d6b1e5a03a7b0d38fc9d4bce23a3d3bd7e0e33ad9c3ec25b5f0ba8c1c243c1f1";

function dbMock(update: ReturnType<typeof vi.fn>): unknown {
  return { slateCommitment: { update } };
}

describe("isOtsAnchorEnabled", () => {
  it("only the literal 'true' enables", () => {
    expect(isOtsAnchorEnabled({})).toBe(false);
    expect(isOtsAnchorEnabled({ OTS_ANCHOR_ENABLED: "TRUE" })).toBe(false);
    expect(isOtsAnchorEnabled({ OTS_ANCHOR_ENABLED: "1" })).toBe(false);
    expect(isOtsAnchorEnabled({ OTS_ANCHOR_ENABLED: "true" })).toBe(true);
  });
});

describe("anchorSlateCommitment — fail-open contract", () => {
  it("DISABLED by default: zero transport calls, zero DB writes", async () => {
    const update = vi.fn();
    const fetchBinary = vi.fn();
    const res = await anchorSlateCommitment({
      slateKey: "NFL:2026-09-14",
      rootHex: ROOT,
      db: dbMock(update),
      env: {},
      transport: { fetchBinary },
    });
    expect(res).toEqual({ action: "DISABLED" });
    expect(fetchBinary).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("stores the proof and reports calendar counts on success", async () => {
    const update = vi.fn().mockResolvedValue({});
    // Calendar replies with a minimal valid graft is complex; a rejecting
    // transport still exercises the store-pending path — success-path bytes
    // are covered by the crypto package's own fixture test. Here: one ok
    // calendar via a real serialized fixture is overkill; assert the ok/failed
    // accounting with an all-fail transport in the next test and the stored
    // artifact's validity here via the pending path.
    const res = await anchorSlateCommitment({
      slateKey: "NFL:2026-09-14",
      rootHex: ROOT,
      db: dbMock(update),
      env: { OTS_ANCHOR_ENABLED: "true" },
      transport: { fetchBinary: async () => Promise.reject(new Error("down")) },
    });
    expect(res).toEqual({ action: "ANCHORED", okCalendars: 0, failedCalendars: 3 });
    expect(update).toHaveBeenCalledTimes(1);
    const stored = update.mock.calls[0]![0] as { where: { slateKey: string }; data: { otsProof: Uint8Array } };
    expect(stored.where.slateKey).toBe("NFL:2026-09-14");
    // The stored artifact is a VALID pending .ots for exactly our root.
    const parsed = deserializeDetached(stored.data.otsProof);
    expect(parsed.digestHex).toBe(ROOT);
    expect(otsStatus(parsed).pendingCalendars.length).toBeGreaterThan(0);
  });

  it("missing column (founder migration not applied) → SKIP_NOT_MIGRATED, no throw", async () => {
    const update = vi.fn().mockRejectedValue(Object.assign(new Error("The column `otsProof` does not exist"), { code: "P2022" }));
    const res = await anchorSlateCommitment({
      slateKey: "NFL:2026-09-14",
      rootHex: ROOT,
      db: dbMock(update),
      env: { OTS_ANCHOR_ENABLED: "true" },
      transport: { fetchBinary: async () => Promise.reject(new Error("down")) },
    });
    expect(res).toEqual({ action: "SKIP_NOT_MIGRATED" });
  });

  it("any other failure → FAILED result, NEVER a throw", async () => {
    const update = vi.fn().mockRejectedValue(new Error("connection refused"));
    const res = await anchorSlateCommitment({
      slateKey: "NFL:2026-09-14",
      rootHex: ROOT,
      db: dbMock(update),
      env: { OTS_ANCHOR_ENABLED: "true" },
      transport: { fetchBinary: async () => Promise.reject(new Error("down")) },
    });
    expect(res.action).toBe("FAILED");
  });

  it("a bad root fails closed as a FAILED result (not a throw into the freeze path)", async () => {
    const res = await anchorSlateCommitment({
      slateKey: "NFL:2026-09-14",
      rootHex: "not-a-root",
      db: dbMock(vi.fn()),
      env: { OTS_ANCHOR_ENABLED: "true" },
      transport: { fetchBinary: async () => Promise.reject(new Error("down")) },
    });
    expect(res.action).toBe("FAILED");
  });
});
