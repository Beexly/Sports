/**
 * GET /api/proof/ledger-chain — B-6b honest export.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const loadMock = vi.hoisted(() => ({ loadLedgerChain: vi.fn() }));

vi.mock("@sports/ingestion-pipeline", () => ({
  loadLedgerChain: loadMock.loadLedgerChain,
}));

vi.mock("@sports/db", () => ({ db: {} }));

afterEach(() => {
  loadMock.loadLedgerChain.mockReset();
});

interface ChainResponse {
  entries?: unknown[];
  count?: number;
  nextSeq?: number | null;
  note?: string;
  code?: string;
}

async function call(query = ""): Promise<{ status: number; body: ChainResponse }> {
  const { GET } = await import("@/app/api/proof/ledger-chain/route");
  const res = await GET(
    new Request(`https://www.galaxysportsedge.com/api/proof/ledger-chain${query}`) as never,
  );
  return { status: res.status, body: (await res.json()) as ChainResponse };
}

describe("GET /api/proof/ledger-chain", () => {
  it("empty chain → 200 with entries:[] and an honest note, not 404", async () => {
    loadMock.loadLedgerChain.mockResolvedValue({ ok: true, entries: [] });
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body.entries).toEqual([]);
    expect(body.count).toBe(0);
    expect(body.nextSeq).toBeNull();
    expect(body.note).toMatch(/empty|not yet|gated/i);
  });

  it("table missing → 200 empty, not 500", async () => {
    loadMock.loadLedgerChain.mockResolvedValue({ ok: false, reason: "table_missing" });
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body.entries).toEqual([]);
    expect(body.note).toMatch(/not applied/i);
  });

  it("streams entries in recompute.ts shape and paginates on seq", async () => {
    loadMock.loadLedgerChain.mockResolvedValue({
      ok: true,
      entries: [
        { seq: 0, pickId: "p1", entryHash: "a".repeat(64) },
        { seq: 1, pickId: "p2", entryHash: "b".repeat(64) },
        { seq: 2, pickId: "p3", entryHash: "c".repeat(64) },
      ],
    });
    const { status, body } = await call("?limit=2");
    expect(status).toBe(200);
    expect(body.count).toBe(2);
    expect(body.entries).toHaveLength(2);
    expect(body.nextSeq).toBe(1);
    expect(loadMock.loadLedgerChain).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ignoreWriteFlag: true, take: 3 }),
    );
  });

  it("DB failure → 503, not a fake empty chain", async () => {
    loadMock.loadLedgerChain.mockResolvedValue({ ok: false, reason: "error", message: "boom" });
    const { status, body } = await call();
    expect(status).toBe(503);
    expect(body.code).toBe("unavailable");
  });
});
