/**
 * /api/cron/ots-upgrade — the nightly Bitcoin-upgrade poll (W-OTS slice 3).
 * Pins: gated-off no-op, Bearer auth, unmigrated honesty, still-pending leaves
 * bytes untouched, a real upgrade persists new bytes + block height (and the
 * height only ever comes from an actual attestation).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDetachedOts,
  emptyNode,
  HEADER_MAGIC,
  serializeDetached,
  type TimestampNode,
} from "@sports/crypto";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  transport: { fetchBinary: vi.fn() },
}));
vi.mock("@sports/db", () => ({
  db: { slateCommitment: { findMany: mocks.findMany, update: mocks.update } },
}));
vi.mock("@sports/ingestion-pipeline", () => ({
  defaultCalendarTransport: () => mocks.transport,
}));

import { GET } from "@/app/api/cron/ots-upgrade/route";

const ROOT = "d6b1e5a03a7b0d38fc9d4bce23a3d3bd7e0e33ad9c3ec25b5f0ba8c1c243c1f1";

function bareNodeBytes(node: TimestampNode): Uint8Array {
  return serializeDetached({ digestHex: ROOT, root: node }).slice(HEADER_MAGIC.length + 2 + 32);
}

function call(headers: Record<string, string> = {}): Promise<Response> {
  return GET(new Request("https://x.test/api/cron/ots-upgrade", { headers })) as Promise<Response>;
}

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.findMany.mockReset();
  mocks.update.mockReset();
  mocks.transport.fetchBinary.mockReset();
});

describe("GET /api/cron/ots-upgrade", () => {
  it("is a documented no-op while OTS_ANCHOR_ENABLED is unset", async () => {
    const res = await call();
    const body = (await res.json()) as { ran: boolean; reason: string };
    expect(body.ran).toBe(false);
    expect(body.reason).toMatch(/gated off/i);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("requires the Bearer CRON_SECRET once enabled", async () => {
    vi.stubEnv("OTS_ANCHOR_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await call()).status).toBe(401);
    expect((await call({ authorization: "Bearer wrong" })).status).toBe(401);
  });

  it("unmigrated columns → honest ran:false, not a crash", async () => {
    vi.stubEnv("OTS_ANCHOR_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "s3cret");
    mocks.findMany.mockRejectedValue(new Error("The column `slate_commitments.otsProof` does not exist"));
    const body = (await (await call({ authorization: "Bearer s3cret" })).json()) as { ran: boolean; reason: string };
    expect(body.ran).toBe(false);
    expect(body.reason).toMatch(/not migrated/i);
  });

  it("still-pending calendars: nothing persisted, row reported for retry", async () => {
    vi.stubEnv("OTS_ANCHOR_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "s3cret");
    mocks.findMany.mockResolvedValue([
      { slateKey: "NFL:2026-09-14", otsProof: buildDetachedOts(ROOT), otsBitcoinHeight: null },
    ]);
    mocks.transport.fetchBinary.mockRejectedValue(new Error("down"));
    const body = (await (await call({ authorization: "Bearer s3cret" })).json()) as {
      ran: boolean; upgraded: number; results: { outcome: string }[];
    };
    expect(body.ran).toBe(true);
    expect(body.upgraded).toBe(0);
    expect(body.results[0]!.outcome).toBe("still-pending");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("a real upgrade persists new bytes + the Bitcoin block height", async () => {
    vi.stubEnv("OTS_ANCHOR_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "s3cret");
    mocks.findMany.mockResolvedValue([
      { slateKey: "NFL:2026-09-14", otsProof: buildDetachedOts(ROOT, ["https://alice.btc.calendar.opentimestamps.org"]), otsBitcoinHeight: null },
    ]);
    const btc = emptyNode();
    btc.attestations.push({ kind: "bitcoin", height: 905432 });
    mocks.transport.fetchBinary.mockResolvedValue(bareNodeBytes(btc));
    mocks.update.mockResolvedValue({});
    const body = (await (await call({ authorization: "Bearer s3cret" })).json()) as {
      upgraded: number; results: { outcome: string; bitcoinHeight?: number }[];
    };
    expect(body.upgraded).toBe(1);
    expect(body.results[0]!.bitcoinHeight).toBe(905432);
    const persisted = mocks.update.mock.calls[0]![0] as {
      where: { slateKey: string };
      data: { otsProof: Buffer; otsBitcoinHeight: number };
    };
    expect(persisted.where.slateKey).toBe("NFL:2026-09-14");
    expect(persisted.data.otsBitcoinHeight).toBe(905432);
    expect(persisted.data.otsProof.length).toBeGreaterThan(0);
  });
});
