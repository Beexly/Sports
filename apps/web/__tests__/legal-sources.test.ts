import { describe, expect, it } from "vitest";

describe("legal sources API", () => {
  it("publishes the cleared vs blocked source registry", async () => {
    const mod = await import("@/app/api/legal/sources/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as {
      success: boolean;
      data: {
        cleared: Array<{ id: string }>;
        blocked: Array<{ id: string }>;
        counts: { cleared: number; blocked: number; total: number };
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const clearedIds = body.data.cleared.map((s) => s.id);
    const blockedIds = body.data.blocked.map((s) => s.id);

    // Open/licensed feeds are surfaced as cleared.
    expect(clearedIds).toEqual(expect.arrayContaining(["nflverse", "the-odds-api", "sleeper"]));
    // Forbidden-by-ToS sources are publicly disclosed as refused.
    expect(blockedIds).toEqual(expect.arrayContaining(["espn-hidden-api", "pro-football-reference", "nfelo"]));

    expect(body.data.counts.total).toBe(body.data.counts.cleared + body.data.counts.blocked);
  });
});
