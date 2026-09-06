import { beforeEach, describe, expect, it, vi } from "vitest";

const checkClearanceMock = vi.fn();

vi.mock("@/lib/scraping/clearance-engine", () => ({
  checkClearance: (req: unknown) => checkClearanceMock(req),
}));

import { fetchScoresMultiSource } from "./multi-source-scores";

describe("dated ESPN scoreboard clearance (GSE-SEC-078 / T11)", () => {
  beforeEach(() => {
    checkClearanceMock.mockReset();
  });

  it("does not fetch a dated ESPN board when clearance is denied", async () => {
    checkClearanceMock.mockReturnValue({
      allowed: false,
      blocks: [{ code: "STORAGE_NOT_ALLOWED" }],
    });
    const fetchImpl = vi.fn(async () => {
      throw new Error("network must not run");
    }) as unknown as typeof fetch;

    const result = await fetchScoresMultiSource("nfl", {
      espnDateKeys: ["20260801"],
      isoDateKeys: ["2026-08-01"],
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.games).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("clearance-denied"))).toBe(true);
  });

  it("fetches the dated ESPN board when clearance allows", async () => {
    checkClearanceMock.mockReturnValue({ allowed: true, blocks: [] });
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ events: [] }),
    })) as unknown as typeof fetch;

    await fetchScoresMultiSource("nfl", {
      espnDateKeys: ["20260801"],
      isoDateKeys: ["2026-08-01"],
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalled();
    const espnCalls = checkClearanceMock.mock.calls.filter(
      (c) => (c[0] as { source_id?: string }).source_id === "espn-public-api",
    );
    expect(espnCalls.length).toBeGreaterThan(0);
  });

  it("strictEspn reports a dated board that lost one division group as an espn error (default keeps the partial board)", async () => {
    // ESPN cleared; the unregistered secondary (henrygd) refused, as in production.
    checkClearanceMock.mockImplementation((req: unknown) =>
      (req as { source_id?: string }).source_id === "espn-public-api"
        ? { allowed: true, blocks: [] }
        : { allowed: false, blocks: [{ code: "SOURCE_NOT_REGISTERED" }] },
    );
    // Test fixture: NCAAF fetches FBS (groups=80) and FCS (groups=81); FBS fails, FCS answers.
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("groups=80")) return { ok: false, status: 503, json: async () => ({}) };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          events: [{ id: "fcs-1", date: "2026-09-05T20:00Z", competitions: [{ competitors: [], status: { type: { state: "post", completed: true } } }] }],
        }),
      };
    }) as unknown as typeof fetch;

    const lenient = await fetchScoresMultiSource("ncaaf", { espnDateKeys: ["20260905"], fetchImpl });
    expect(lenient.games.map((g) => g.gameId)).toEqual(["fcs-1"]);
    expect(lenient.errors.some((e) => e.startsWith("espn "))).toBe(false);

    const strict = await fetchScoresMultiSource("ncaaf", { espnDateKeys: ["20260905"], fetchImpl, strictEspn: true });
    expect(strict.games).toHaveLength(0);
    expect(strict.errors).toContain("espn 20260905: ESPN scoreboard ncaaf groups=80 HTTP 503");
  });
});
