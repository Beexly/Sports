/**
 * Enumerable Proof API — /api/proof/receipts + the shared receipt verifier.
 *
 * The load-bearing invariant under test is LEAK-SAFETY: the endpoint may only
 * ever surface SETTLED, kicked-off receipts (a strict subset of "open" under
 * /api/verify's disclosure policy), so a pre-kickoff committed field can never
 * appear. That gate lives in the Prisma `where` clause, so the definitive test
 * asserts the query shape. The verifier's tamper detection is unit-tested
 * against real hashes.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { canonicalPickPayload, hashLeaf } from "@sports/prediction-engine";
import { verifyReceiptIntegrity } from "@/lib/proof/receipt-proof";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

const FIELDS = {
  line: -3.5,
  entryOdds: -110,
  marketFairProb: 0.5238,
  confidence: 62,
  edgeScore: 14,
  modelProb: 0.55,
  modelVersion: "v5.1.0",
  asOf: "2026-09-14T16:00:00.000Z",
} as const;

interface ReceiptRow {
  id: string;
  pickId: string;
  payload: string;
  contentHash: string;
  line: number;
  entryOdds: number;
  marketFairProb: number;
  confidence: number;
  edgeScore: number;
  modelProb: number | null;
  modelVersion: string;
  asOf: Date;
  slateKey: string | null;
  pick: {
    result: string;
    game: {
      homeTeamName: string;
      awayTeamName: string;
      commenceTime: Date;
      sport: { name: string };
    } | null;
  } | null;
}

function makeReceipt(over: Partial<ReceiptRow> & { id?: string; pickId?: string } = {}): ReceiptRow {
  const pickId = over.pickId ?? "pick_1";
  const payload = canonicalPickPayload({ ...FIELDS });
  const contentHash = hashLeaf(sha256Hex, { id: pickId, payload });
  return {
    id: over.id ?? "rcpt_1",
    pickId,
    payload,
    contentHash,
    line: FIELDS.line,
    entryOdds: FIELDS.entryOdds,
    marketFairProb: FIELDS.marketFairProb,
    confidence: FIELDS.confidence,
    edgeScore: FIELDS.edgeScore,
    modelProb: FIELDS.modelProb,
    modelVersion: FIELDS.modelVersion,
    asOf: new Date(FIELDS.asOf),
    slateKey: "NFL:2026-09-14",
    pick: {
      result: "WIN",
      game: {
        homeTeamName: "Chiefs",
        awayTeamName: "Ravens",
        commenceTime: new Date("2026-09-14T17:00:00.000Z"),
        sport: { name: "NFL" },
      },
    },
    ...over,
  };
}

describe("verifyReceiptIntegrity — tamper check (mirrors /api/verify)", () => {
  it("verifies an untampered receipt and opens its committed fields", () => {
    const r = makeReceipt();
    const v = verifyReceiptIntegrity(r);
    expect(v.hashIntact).toBe(true);
    expect(v.columnsMatchPayload).toBe(true);
    expect(v.verified).toBe(true);
    expect(v.committed).not.toBeNull();
    expect(v.committed?.line).toBeCloseTo(-3.5, 5);
    expect(v.frozenAt).toBe("2026-09-14T16:00:00.000Z");
  });

  it("a payload edited after minting breaks the hash → verified:false, committed withheld", () => {
    const r = makeReceipt();
    const v = verifyReceiptIntegrity({ ...r, payload: `${r.payload}&injected=1` });
    expect(v.hashIntact).toBe(false);
    expect(v.verified).toBe(false);
    expect(v.committed).toBeNull();
  });

  it("a sibling column drifting from the hashed payload → verified:false", () => {
    const r = makeReceipt();
    // Column says confidence 90 but the hashed payload says 62 (drift > tol).
    const v = verifyReceiptIntegrity({ ...r, confidence: 90 });
    expect(v.hashIntact).toBe(true);
    expect(v.columnsMatchPayload).toBe(false);
    expect(v.verified).toBe(false);
    expect(v.committed).toBeNull();
  });
});

interface ReceiptsResponseRow {
  pickId: string;
  contentHash: string;
  slateKey: string | null;
  result: string;
  frozenAt: string;
  modelVersion: string;
  verified: boolean;
  game: { matchup: string; sport: string; commenceTime: string } | null;
  committed: Record<string, number | null> | null;
  payload: string;
}
interface ReceiptsResponse {
  doctrine?: string;
  count?: number;
  nextCursor?: string | null;
  receipts?: ReceiptsResponseRow[];
  error?: string;
}

describe("GET /api/proof/receipts", () => {
  const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
  vi.mock("@sports/db", () => ({ db: { pickProofReceipt: { findMany: mocks.findMany } } }));

  afterEach(() => {
    mocks.findMany.mockReset();
  });

  async function call(query = ""): Promise<{ status: number; body: ReceiptsResponse }> {
    const { GET } = await import("@/app/api/proof/receipts/route");
    const res = await GET(new Request(`https://www.galaxysportsedge.com/api/proof/receipts${query}`));
    return { status: res.status, body: (await res.json()) as ReceiptsResponse };
  }

  it("LEAK GATE: queries only settled (result != PENDING) AND kicked-off (commenceTime <= now) receipts", async () => {
    mocks.findMany.mockResolvedValue([]);
    await call();
    const args = mocks.findMany.mock.calls[0]![0]!;
    expect(args.where.pick.result).toEqual({ not: "PENDING" });
    expect(args.where.pick.game.commenceTime.lte).toBeInstanceOf(Date);
    expect(args.take).toBe(26); // default 25 + 1 (has-more probe)
  });

  it("empty state → 200 with an empty list, not an error", async () => {
    mocks.findMany.mockResolvedValue([]);
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body.count).toBe(0);
    expect(body.receipts).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  it("maps a verified settled receipt with its opened committed fields + recompute recipe", async () => {
    mocks.findMany.mockResolvedValue([makeReceipt()]);
    const { body } = await call();
    expect(body.count).toBe(1);
    const row = body.receipts![0]!;
    expect(row.verified).toBe(true);
    expect(row.committed).not.toBeNull();
    expect(row.game!.matchup).toBe("Ravens @ Chiefs");
    expect(row.game!.sport).toBe("NFL");
    expect(typeof row.payload).toBe("string"); // the leaf preimage, so an agent can recompute
    expect(row.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("a tampered row still lists (transparency) but withholds committed + flags verified:false", async () => {
    const bad = makeReceipt();
    bad.payload = `${bad.payload}&z=9`; // hash no longer matches
    mocks.findMany.mockResolvedValue([bad]);
    const { body } = await call();
    const row = body.receipts![0]!;
    expect(row.verified).toBe(false);
    expect(row.committed).toBeNull();
    // raw payload + hash remain so a skeptic can recompute and see the mismatch
    expect(row.payload).toContain("&z=9");
    expect(row.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("paginates: limit=2 over 3 rows → 2 returned + nextCursor = last returned id", async () => {
    mocks.findMany.mockResolvedValue([
      makeReceipt({ id: "rcpt_1", pickId: "pick_1" }),
      makeReceipt({ id: "rcpt_2", pickId: "pick_2" }),
      makeReceipt({ id: "rcpt_3", pickId: "pick_3" }),
    ]);
    const { body } = await call("?limit=2");
    expect(body.count).toBe(2);
    expect(body.nextCursor).toBe("rcpt_2");
    const args = mocks.findMany.mock.calls[0]![0]!;
    expect(args.take).toBe(3); // limit 2 + 1
  });

  it("clamps limit to 100 and honours a cursor", async () => {
    mocks.findMany.mockResolvedValue([]);
    await call("?limit=999&cursor=rcpt_abc");
    const args = mocks.findMany.mock.calls[0]![0]!;
    expect(args.take).toBe(101);
    expect(args.cursor).toEqual({ id: "rcpt_abc" });
    expect(args.skip).toBe(1);
  });

  it("a DB outage is a 503, never a false 'no receipts'", async () => {
    mocks.findMany.mockRejectedValue(new Error("connection refused"));
    const { status, body } = await call();
    expect(status).toBe(503);
    expect(body.error).toMatch(/temporarily unavailable/i);
  });
});
