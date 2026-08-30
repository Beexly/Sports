import { describe, expect, it, vi } from "vitest";
import { probeNflverseSourceCurrency } from "./nflverse-currency-probe.js";
import { nflverseUrl } from "./nflverse-source.js";

describe("probeNflverseSourceCurrency", () => {
  it("reports ok when hard assets return 2xx for the completed floor season", async () => {
    const aug = new Date(Date.UTC(2026, 7, 6));
    const fetcher = vi.fn(async (url: string) => {
      // 2025 floor in Aug 2026
      if (url.includes("roster_2025") || url.includes("games.csv")) {
        return new Response(null, { status: 200 });
      }
      return new Response(null, { status: 404 });
    });

    const result = await probeNflverseSourceCurrency({
      now: aug,
      fetcher: fetcher as unknown as typeof fetch,
      timeoutMs: 500,
    });

    expect(result.season).toBe(2025);
    expect(result.ok).toBe(true);
    expect(result.assets).toHaveLength(2);
    expect(result.assets.every((a) => a.ok)).toBe(true);
    expect(result.assets[0]!.url).toBe(nflverseUrl("rosters", 2025));
  });

  it("reports not ok when a hard asset is missing — never green-washes", async () => {
    const aug = new Date(Date.UTC(2026, 7, 6));
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("games.csv")) return new Response(null, { status: 200 });
      return new Response(null, { status: 404 });
    });

    const result = await probeNflverseSourceCurrency({
      now: aug,
      fetcher: fetcher as unknown as typeof fetch,
      timeoutMs: 500,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/unreachable|rosters/i);
  });

  it("falls back from HEAD 405 to ranged GET", async () => {
    const aug = new Date(Date.UTC(2026, 7, 6));
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") return new Response(null, { status: 405 });
      return new Response(null, { status: 206 });
    });

    const result = await probeNflverseSourceCurrency({
      now: aug,
      fetcher: fetcher as unknown as typeof fetch,
      timeoutMs: 500,
    });

    expect(result.ok).toBe(true);
    expect(fetcher.mock.calls.some((c) => (c[1] as RequestInit | undefined)?.method === "GET")).toBe(
      true,
    );
  });
});
