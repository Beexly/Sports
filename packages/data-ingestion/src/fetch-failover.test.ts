import { describe, expect, it, vi } from "vitest";
import { fetchWithFailover, nflverseMirror, withMirrors } from "./fetch-failover.js";

const PRIMARY = "https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2024.csv";

describe("fetch failover", () => {
  it("maps a GitHub asset to a mirror and builds the ordered list", () => {
    expect(nflverseMirror(PRIMARY)).toBe(`https://ghproxy.net/${PRIMARY}`);
    expect(nflverseMirror("https://api.sleeper.app/v1/players/nfl")).toBeNull();
    expect(withMirrors(PRIMARY)).toEqual([PRIMARY, `https://ghproxy.net/${PRIMARY}`]);
    expect(withMirrors("https://example.com/x")).toEqual(["https://example.com/x"]);
  });

  it("returns the primary when it responds OK (no fallback)", async () => {
    const fetcher = vi.fn(async (url: string) => new Response(`ok:${url}`, { status: 200 }));
    const result = await fetchWithFailover(withMirrors(PRIMARY), fetcher);
    expect(result.sourceUrl).toBe(PRIMARY);
    expect(result.attempts).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fails over to the mirror when the primary is down", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url === PRIMARY) return new Response("down", { status: 503 });
      return new Response("ok", { status: 200 });
    });
    const result = await fetchWithFailover(withMirrors(PRIMARY), fetcher);
    expect(result.sourceUrl).toBe(`https://ghproxy.net/${PRIMARY}`);
    expect(result.attempts).toBe(2);
    expect(result.errors[0]).toContain("503");
  });

  it("throws with collected errors when every source fails", async () => {
    const fetcher = vi.fn(async () => new Response("no", { status: 500 }));
    await expect(fetchWithFailover(withMirrors(PRIMARY), fetcher)).rejects.toThrow(/All 2 source\(s\) failed/);
  });
});
