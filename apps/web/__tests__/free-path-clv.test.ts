import { describe, expect, it, vi } from "vitest";
import { gradeFreePathClv } from "@/lib/settlement/free-path-clv";

describe("gradeFreePathClv", () => {
  it("marks no_close when odds history is empty", async () => {
    const work = {
      createMany: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
    };
    const db = {
      odds: {
        findMany: async () => [],
      },
      pick: {
        update: vi.fn(),
      },
      postSettlementWork: work,
    };
    const r = await gradeFreePathClv(
      db,
      {
        id: "p1",
        pickType: "SPREAD",
        selection: "BUF",
        clvLockLine: -3,
        clvLockPrice: -110,
        game: {
          id: "g1",
          homeTeamName: "BUF",
          awayTeamName: "KC",
          commenceTime: new Date("2026-08-01T00:00:00Z"),
        },
      },
      new Date("2026-08-02T00:00:00Z"),
    );
    expect(r.status).toBe("no_close");
    expect(r.clvValue).toBeNull();
    expect(work.updateMany).toHaveBeenCalled();
  });
});
