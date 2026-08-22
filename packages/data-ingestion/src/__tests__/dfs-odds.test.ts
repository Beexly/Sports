import { describe, expect, it, vi } from "vitest";
import { ODDS_DFS_REGION, ODDS_REGION } from "../config.js";
import { DFS_ODDS_BOOKS, fetchDfsOddsIfEnabled, isDfsOddsEnabled } from "../dfs-odds.js";
import { OddsApiClient } from "../odds-api-client.js";
import { getOddsPaymentCircuitBreaker } from "../odds-api-circuit-breaker.js";

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "x-requests-remaining": "50", "x-requests-used": "1" },
  });
}

describe("us_dfs ingest gate", () => {
  it("is off by default", () => {
    expect(isDfsOddsEnabled({})).toBe(false);
    expect(ODDS_DFS_REGION).toBe("us_dfs");
    expect(ODDS_REGION).toBe("us");
    expect(ODDS_DFS_REGION).not.toBe(ODDS_REGION);
  });

  it("does not fetch when the flag is off", async () => {
    const getOdds = vi.fn();
    const out = await fetchDfsOddsIfEnabled({ getOdds }, "americanfootball_nfl", {});
    expect(out).toBeNull();
    expect(getOdds).not.toHaveBeenCalled();
  });

  it("calls getOdds with regions=us_dfs and DK/FD only when enabled", async () => {
    getOddsPaymentCircuitBreaker().reset();
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok([]));
    const client = new OddsApiClient("test-key");
    const out = await fetchDfsOddsIfEnabled(client, "americanfootball_nfl", { ODDS_DFS_INGEST: "true" });
    expect(out?.data).toEqual([]);
    const url = new URL(spy.mock.calls[0]![0] as string);
    expect(url.searchParams.get("regions")).toBe("us_dfs");
    expect(url.searchParams.get("bookmakers")).toBe(DFS_ODDS_BOOKS.join(","));
    spy.mockRestore();
    getOddsPaymentCircuitBreaker().reset();
  });
});
