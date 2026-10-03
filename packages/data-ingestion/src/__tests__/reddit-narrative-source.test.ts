import { describe, expect, it, vi } from "vitest";
import {
  RedditError,
  RedditNarrativeSource,
  buildRedditSearchUrl,
  parseRedditListing,
} from "../reddit-narrative-source";

const LISTING = {
  data: {
    children: [
      {
        data: {
          title: "AJ Brown frustrated with his role",
          selftext: "Reportedly wants more targets.",
          created_utc: 1748908800,
          subreddit: "eagles",
          ups: 1200,
        },
      },
      { data: { title: "", selftext: "", subreddit: "nfl", ups: 3 } }, // empty → skipped
    ],
  },
} as const;

describe("buildRedditSearchUrl", () => {
  it("scopes to a subreddit when provided", () => {
    const url = buildRedditSearchUrl({ athleteId: "x", athleteName: "AJ Brown", subreddit: "eagles", sort: "new" });
    expect(url).toContain("q=subreddit%3Aeagles+AJ+Brown");
    expect(url).toContain("restrict_sr=true");
  });

  it("searches all of Reddit when no subreddit is given", () => {
    const url = buildRedditSearchUrl({ athleteId: "x", athleteName: "AJ Brown" });
    expect(url).toContain("restrict_sr=false");
  });
});

describe("parseRedditListing", () => {
  it("maps posts to narrative items and skips empty ones", () => {
    const items = parseRedditListing(LISTING, "nfl-ajbrown");
    expect(items).toHaveLength(1);
    const only = items[0]!;
    expect(only.source).toBe("reddit:r/eagles");
    expect(only.athleteId).toBe("nfl-ajbrown");
    expect(only.text).toBe("AJ Brown frustrated with his role. Reportedly wants more targets.");
    expect(typeof only.publishedAt).toBe("string");
    expect(only.weight).toBeGreaterThan(0);
    expect(only.weight).toBeLessThanOrEqual(1);
  });
});

describe("RedditNarrativeSource", () => {
  it("sends a descriptive user-agent and returns parsed items", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(LISTING), { status: 200 }));
    const source = new RedditNarrativeSource({ fetchImpl });

    const items = await source.fetchAthleteItems({ athleteId: "nfl-ajbrown", athleteName: "AJ Brown", subreddit: "eagles" });

    expect(items[0]?.source).toBe("reddit:r/eagles");
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0]?.[0]).toContain("https://www.reddit.com/search.json?");
    expect(calls[0]?.[1].headers).toMatchObject({ "user-agent": "galaxy-sports-edge/0.1 (narrative-signal; read-only)" });
  });

  it("throws a typed error on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const source = new RedditNarrativeSource({ fetchImpl, maxRetries: 0 });
    await expect(
      source.fetchAthleteItems({ athleteId: "x", athleteName: "AJ Brown" }),
    ).rejects.toBeInstanceOf(RedditError);
  });
});
