import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

/**
 * GET /api/ops/id-crosswalk — route-level tests.
 *
 * Invariants pinned here:
 * - 401 without the CRON_SECRET bearer (no unauthenticated identity lookups).
 * - A gsisId hit returns the internal identity; a miss returns null — never a
 *   guessed id (a wrong join is worse than no join).
 * - Health-report mode (no params) reports join coverage honestly.
 */

const mocks = vi.hoisted(() => ({
  resolvePlayerByGsis: vi.fn(),
  resolveGsisByPlayer: vi.fn(),
  playerCount: vi.fn(),
  playerFindMany: vi.fn(),
  nextGenStatFindMany: vi.fn(),
}));

vi.mock("@/lib/ops/player-crosswalk", () => ({
  resolvePlayerByGsis: mocks.resolvePlayerByGsis,
  resolveGsisByPlayer: mocks.resolveGsisByPlayer,
}));

vi.mock("@sports/db", () => ({
  db: {
    player: { count: mocks.playerCount, findMany: mocks.playerFindMany },
    nextGenStat: { findMany: mocks.nextGenStatFindMany },
  },
}));

vi.mock("@/lib/observability/sentry", () => ({ captureError: vi.fn() }));

import { GET } from "@/app/api/ops/id-crosswalk/route";

function authed(url: string): Request {
  return new Request(url, { headers: { authorization: "Bearer test-secret" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env["CRON_SECRET"] = "test-secret";
  mocks.resolvePlayerByGsis.mockResolvedValue(null);
  mocks.resolveGsisByPlayer.mockResolvedValue(null);
  mocks.playerCount.mockResolvedValue(0);
  mocks.nextGenStatFindMany.mockResolvedValue([]);
});

describe("GET /api/ops/id-crosswalk", () => {
  it("401s without the bearer secret", async () => {
    delete process.env["CRON_SECRET"];
    const res = await GET(new Request("https://x/api/ops/id-crosswalk?gsisId=00-1"));
    expect(res.status).toBe(401);
    expect(mocks.resolvePlayerByGsis).not.toHaveBeenCalled();
  });

  it("returns the internal identity on a gsisId hit", async () => {
    mocks.resolvePlayerByGsis.mockResolvedValue({ playerId: "player-1", name: "Test Player" });
    const res = await GET(authed("https://x/api/ops/id-crosswalk?gsisId=00-0031234"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { identity: unknown } };
    expect(body.data.identity).toEqual({ playerId: "player-1", name: "Test Player" });
  });

  it("returns null on a miss — never a guessed id", async () => {
    mocks.resolvePlayerByGsis.mockResolvedValue(null);
    const res = await GET(authed("https://x/api/ops/id-crosswalk?gsisId=00-unknown"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { identity: unknown }; note: string };
    expect(body.data.identity).toBeNull();
    expect(body.note).toMatch(/never a guessed id/);
  });

  it("health-report mode returns join coverage counts", async () => {
    mocks.playerCount.mockResolvedValue(100);
    mocks.nextGenStatFindMany.mockResolvedValue([
      { gsisId: "00-a" },
      { gsisId: "00-b" },
      { gsisId: "00-a" },
    ]);
    mocks.playerFindMany.mockResolvedValue([{ gsisId: "00-a" }]);
    const res = await GET(authed("https://x/api/ops/id-crosswalk"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data["playerRows"]).toBe(100);
    expect(body.data["ngsDistinctGsisScanned"]).toBe(2);
    expect(body.data["joined"]).toBe(1);
    expect(body.data["unjoined"]).toBe(1);
    expect(body.data["joinRate"]).toBe(0.5);
  });
});
