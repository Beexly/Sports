import { describe, expect, it, vi } from "vitest";
import type { RssFeedConfig, WireFetchResult } from "./rss";
import type { ApprovedPublicNewsFeed } from "./approved-feeds";
import { loadPublicWire } from "./public-wire";

const REGISTRY: readonly ApprovedPublicNewsFeed[] = [
  {
    id: "official-nfl",
    url: "https://example.com/nfl.xml",
    source: "Approved wire feed",
    tier: "Verified",
    team: "NFL",
    rightsBasis: "OFFICIAL_SYNDICATION",
    approvalReference: "rights-review-2026-07-14",
    publicationApproved: true,
  },
];

const AVAILABLE_RESULT: WireFetchResult = {
  status: "AVAILABLE",
  items: [],
  configuredFeedCount: 1,
  successfulFeedCount: 1,
  failedFeedCount: 0,
};

describe("loadPublicWire", () => {
  it("does not fetch when the global publication switch is off", async () => {
    const fetcher = vi.fn(async (_feeds: readonly RssFeedConfig[]) => AVAILABLE_RESULT);
    await expect(
      loadPublicWire(
        { publicationApproved: false, approvedFeedIds: "official-nfl" },
        { registry: REGISTRY, fetcher },
      ),
    ).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not fetch when no selected ID resolves to the approved registry", async () => {
    const fetcher = vi.fn(async (_feeds: readonly RssFeedConfig[]) => AVAILABLE_RESULT);
    await expect(
      loadPublicWire(
        { publicationApproved: true, approvedFeedIds: "unknown" },
        { registry: REGISTRY, fetcher },
      ),
    ).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches only the selected approved feed", async () => {
    const fetcher = vi.fn(async (_feeds: readonly RssFeedConfig[]) => AVAILABLE_RESULT);
    await expect(
      loadPublicWire(
        { publicationApproved: true, approvedFeedIds: "official-nfl" },
        { registry: REGISTRY, fetcher },
      ),
    ).resolves.toEqual(AVAILABLE_RESULT);
    expect(fetcher).toHaveBeenCalledWith([REGISTRY[0]]);
  });

  it("converts an unexpected fetcher failure into an outage state", async () => {
    const fetcher = vi.fn(async (_feeds: readonly RssFeedConfig[]) => {
      throw new Error("unexpected");
    });
    await expect(
      loadPublicWire(
        { publicationApproved: true, approvedFeedIds: "official-nfl" },
        { registry: REGISTRY, fetcher },
      ),
    ).resolves.toEqual({
      status: "OUTAGE",
      items: [],
      configuredFeedCount: 1,
      successfulFeedCount: 0,
      failedFeedCount: 1,
    });
  });
});
