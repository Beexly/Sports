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
});
