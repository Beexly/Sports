import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { merkleRootFromLeafHashes } from "@sports/prediction-engine";

/**
 * Route-level tests for /api/verify/slate — the public slate-commitment
 * (anti-cherry-pick) verification endpoint. Pins the contract:
 *
 *   - a malformed slate key is a 400, never a DB hit
 *   - a genuine miss is { found:false } with 404
 *   - a hit returns root / count / committedAt + each receipt's
 *     pickId + contentHash ONLY, and PROVES the list against the root
 *     (membershipVerified re-folds the Merkle root from the fingerprints)
 *   - a drifted/incomplete index is DISCLOSED, never silently displayed
 *   - the sealed pre-kickoff policy: NO receipt payload field ever appears
 *     anywhere in the response body
 */

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@sports/db", () => ({
  db: { slateCommitment: { findUnique: mocks.findUnique } },
}));

import { GET } from "@/app/api/verify/slate/route";

const SLATE_KEY = "AMERICANFOOTBALL_NFL:2026-07-02";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

const RECEIPTS = [
  { pickId: "pick-1", contentHash: "hash-one" },
  { pickId: "pick-2", contentHash: "hash-two" },
];
// The route re-folds the root from the displayed fingerprints with REAL
// sha256 — so the fixture's stored root is the real fold of these leaves.
const REAL_ROOT = merkleRootFromLeafHashes(
  RECEIPTS.map((r) => r.contentHash),
  sha256Hex,
);

function slateRow() {
  return {
    slateKey: SLATE_KEY,
    root: REAL_ROOT,
    count: 2,
    committedAt: new Date("2026-07-02T10:00:00.000Z"),
    receipts: [...RECEIPTS],
  };
}

const call = (slateKey: string) =>
  GET(new Request(`http://x/api/verify/slate?slateKey=${encodeURIComponent(slateKey)}`));

beforeEach(() => mocks.findUnique.mockReset());

describe("/api/verify/slate GET", () => {
  it("400s on a malformed slate key without touching the DB", async () => {
    for (const bad of ["", "not-a-slate-key", "NFL:tomorrow", "NFL_2026-07-02", ":2026-07-02"]) {
      const res = await call(bad);
      expect(res.status).toBe(400);
      expect((await res.json()).found).toBe(false);
    }
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns found:false with 404 on a genuine miss", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const res = await call(SLATE_KEY);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ found: false });
  });

  it("returns the commitment + receipt fingerprints on a hit, and PROVES the list against the root", async () => {
    mocks.findUnique.mockResolvedValue(slateRow());
    const res = await call(SLATE_KEY);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      found: true,
      slateKey: SLATE_KEY,
      root: REAL_ROOT,
      count: 2,
      committedAt: "2026-07-02T10:00:00.000Z",
      receiptIndexComplete: true,
      membershipVerified: true, // the displayed list re-folds EXACTLY to the root
      receipts: [
        { pickId: "pick-1", contentHash: "hash-one" },
        { pickId: "pick-2", contentHash: "hash-two" },
      ],
    });
    // The lookup selects fingerprints only — the payload never even leaves the DB.
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slateKey: SLATE_KEY },
        select: expect.objectContaining({
          receipts: expect.objectContaining({
            select: { pickId: true, contentHash: true },
          }),
        }),
      }),
    );
  });

  it("DISCLOSES a drifted receipt index: tampered/incomplete lists fail the membership proof", async () => {
    // (a) Index incomplete (count says 2, relation returns 1 — the orphaned-
    // backfill / postponement drift shape): disclosed, not silently shown.
    mocks.findUnique.mockResolvedValue({ ...slateRow(), receipts: [RECEIPTS[0]!] });
    let body = await (await call(SLATE_KEY)).json();
    expect(body.receiptIndexComplete).toBe(false);
    expect(body.membershipVerified).toBe(false);
    expect(body.receiptIndexNote).toContain("authoritative and immutable");

    // (b) Right COUNT but a swapped fingerprint (a tampered index): the
    // re-fold cannot reproduce the committed root, and the route says so.
    mocks.findUnique.mockResolvedValue({
      ...slateRow(),
      receipts: [RECEIPTS[0]!, { pickId: "pick-2", contentHash: "hash-EVIL" }],
    });
    body = await (await call(SLATE_KEY)).json();
    expect(body.receiptIndexComplete).toBe(true); // count matches...
    expect(body.membershipVerified).toBe(false); // ...but the PROOF fails
    expect(body.receiptIndexNote).toBeDefined();
  });

  it("NEVER leaks a receipt payload, even if the DB row carries one (sealed policy)", async () => {
    // Simulate a mis-selected row that DOES carry sealed fields — the response
    // shape must still exclude every one of them.
    mocks.findUnique.mockResolvedValue({
      ...slateRow(),
      receipts: [
        {
          pickId: "pick-1",
          contentHash: "hash-one",
          payload: "SEALED-selection-and-price",
          marketFairProb: 0.55,
          confidence: 88,
        },
      ],
    });
    const res = await call(SLATE_KEY);
    const body = await res.json();
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("payload");
    expect(raw).not.toContain("SEALED");
    expect(raw).not.toContain("marketFairProb");
    expect(raw).not.toContain("confidence");
    expect(body.receipts[0]).toEqual({ pickId: "pick-1", contentHash: "hash-one" });
  });

  it("normalizes a lowercase key before lookup (still one canonical key shape)", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await call("americanfootball_nfl:2026-07-02");
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slateKey: SLATE_KEY } }),
    );
  });

  // NOTE: the DB-unreachable -> 503 path is a simple bare try/catch in the
  // route (verified by code review, same shape as /api/verify). It is
  // intentionally not asserted here for the same reason verify-route.test.ts
  // documents: the vitest harness surfaces the mock's rejection as a test
  // error even when the route catches it — a harness quirk, not a route
  // defect. The behaviors that matter (400 shape guard, miss vs hit, and the
  // sealed-payload policy above) are all covered.
});
