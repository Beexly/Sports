/**
 * /api/proof/ots/[slateKey] — the public OTS proof endpoint (W-OTS slice 2).
 * Honesty pins: 404-with-reason for missing/unanchored/unmigrated, 503 on DB
 * outage (never a false absence), raw bytes by default, parsed status via
 * ?format=json with "anchored to Bitcoin" true ONLY on a real attestation.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDetachedOts, emptyNode, serializeDetached } from "@sports/crypto";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { slateCommitment: { findUnique: mocks.findUnique } } }));

import { GET } from "@/app/api/proof/ots/[slateKey]/route";

const ROOT = "d6b1e5a03a7b0d38fc9d4bce23a3d3bd7e0e33ad9c3ec25b5f0ba8c1c243c1f1";
const KEY = "NFL:2026-09-14";

function call(key = KEY, query = ""): Promise<Response> {
  return GET(new Request(`https://x.test/api/proof/ots/${encodeURIComponent(key)}${query}`), {
    params: Promise.resolve({ slateKey: key }),
  }) as Promise<Response>;
}

afterEach(() => mocks.findUnique.mockReset());

describe("GET /api/proof/ots/[slateKey]", () => {
  it("serves raw .ots bytes with octet-stream + attachment headers", async () => {
    const ots = buildDetachedOts(ROOT);
    mocks.findUnique.mockResolvedValue({ slateKey: KEY, root: ROOT, otsProof: ots });
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(res.headers.get("content-disposition")).toContain(".ots");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(ots);
  });

  it("?format=json: pending proof reports anchoredToBitcoin=false with pending calendars", async () => {
    mocks.findUnique.mockResolvedValue({ slateKey: KEY, root: ROOT, otsProof: buildDetachedOts(ROOT) });
    const res = await call(KEY, "?format=json");
    const body = (await res.json()) as { anchoredToBitcoin: boolean; pendingCalendars: string[]; digest: string };
    expect(body.anchoredToBitcoin).toBe(false);
    expect(body.pendingCalendars.length).toBeGreaterThan(0);
    expect(body.digest).toBe(ROOT);
  });

  it("?format=json: a Bitcoin-attested proof reports the block height", async () => {
    const node = emptyNode();
    node.attestations.push({ kind: "bitcoin", height: 905432 });
    mocks.findUnique.mockResolvedValue({
      slateKey: KEY,
      root: ROOT,
      otsProof: serializeDetached({ digestHex: ROOT, root: node }),
    });
    const res = await call(KEY, "?format=json");
    const body = (await res.json()) as { anchoredToBitcoin: boolean; bitcoinBlockHeights: number[] };
    expect(body.anchoredToBitcoin).toBe(true);
    expect(body.bitcoinBlockHeights).toEqual([905432]);
  });

  it("404-with-reason: unknown slate; commitment without an anchor", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
    mocks.findUnique.mockResolvedValue({ slateKey: KEY, root: ROOT, otsProof: null });
    const res = await call();
    expect(res.status).toBe(404);
    expect(((await res.json()) as { reason: string }).reason).toMatch(/no OTS anchor/i);
  });

  it("missing column (migration unapplied) → honest 404 'not activated yet'", async () => {
    mocks.findUnique.mockRejectedValue(new Error("The column `slate_commitments.otsProof` does not exist"));
    const res = await call();
    expect(res.status).toBe(404);
    expect(((await res.json()) as { reason: string }).reason).toMatch(/not activated/i);
  });

  it("DB outage → 503, never a false absence", async () => {
    mocks.findUnique.mockRejectedValue(new Error("Can't reach database server"));
    expect((await call()).status).toBe(503);
  });
});
