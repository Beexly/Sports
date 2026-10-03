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

  it("integrity validate: a tampered mirror body is rejected and recorded as a failover error", async () => {
    // Primary down; mirror answers 200 but with a poisoned body. The validator
    // must turn that into a failure instead of letting it into the data path.
    const fetcher = vi.fn(async (url: string) => {
      if (url === PRIMARY) return new Response("down", { status: 503 });
      return new Response("<html>not a csv</html>", { status: 200 });
    });
    const looksLikeCsv = (body: Uint8Array) =>
      new TextDecoder().decode(body.slice(0, 64)).includes("season,team");

    await expect(
      fetchWithFailover(withMirrors(PRIMARY), fetcher, { validate: looksLikeCsv }),
    ).rejects.toThrow(/integrity validation failed/);
  });

  it("integrity validate: a valid body passes and the rebuilt response preserves the bytes", async () => {
    const csv = "season,team\n2025,KC\n";
    const fetcher = vi.fn(async () => new Response(csv, { status: 200 }));
    const result = await fetchWithFailover([PRIMARY], fetcher, {
      validate: (body) => new TextDecoder().decode(body).startsWith("season,team"),
    });
    expect(result.sourceUrl).toBe(PRIMARY);
    await expect(result.response.text()).resolves.toBe(csv);
  });

  it("integrity validate: rejection on the primary fails over to a clean mirror", async () => {
    const csv = "season,team\n2025,KC\n";
    const fetcher = vi.fn(async (url: string) =>
      url === PRIMARY
        ? new Response("truncat", { status: 200 })
        : new Response(csv, { status: 200 }),
    );
    const result = await fetchWithFailover(withMirrors(PRIMARY), fetcher, {
      validate: (body) => new TextDecoder().decode(body).startsWith("season,team"),
    });
    expect(result.sourceUrl).toBe(`https://ghproxy.net/${PRIMARY}`);
    expect(result.errors[0]).toContain("integrity validation failed");
    await expect(result.response.text()).resolves.toBe(csv);
  });

  it("no validator: response is passed through unbuffered (contract unchanged)", async () => {
    const original = new Response("raw", { status: 200 });
    const fetcher = vi.fn(async () => original);
    const result = await fetchWithFailover([PRIMARY], fetcher);
    expect(result.response).toBe(original);
  });
});
