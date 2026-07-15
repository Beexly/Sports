import { describe, expect, it } from "vitest";
import {
  selectApprovedPublicFeeds,
  type ApprovedPublicNewsFeed,
} from "./approved-feeds";

const APPROVED_FEED: ApprovedPublicNewsFeed = {
  id: "official-nfl",
  url: "https://example.com/nfl.xml",
  source: "Approved wire feed",
  tier: "Verified",
  team: "NFL",
  rightsBasis: "OFFICIAL_SYNDICATION",
  approvalReference: "rights-review-2026-07-14",
  publicationApproved: true,
};

describe("selectApprovedPublicFeeds", () => {
  it("selects only requested source-controlled feed IDs", () => {
    expect(
      selectApprovedPublicFeeds("unknown, official-nfl", [APPROVED_FEED]),
    ).toEqual([APPROVED_FEED]);
  });

  it("does not select a feed with incomplete rights evidence", () => {
    const incomplete = { ...APPROVED_FEED, approvalReference: "" };
    expect(selectApprovedPublicFeeds("official-nfl", [incomplete])).toEqual([]);
  });

  it("rejects insecure URLs even when the feed ID is selected", () => {
    const insecure = { ...APPROVED_FEED, url: "http://example.com/nfl.xml" };
    expect(selectApprovedPublicFeeds("official-nfl", [insecure])).toEqual([]);
  });

  it("returns an empty selection when no IDs are configured", () => {
    expect(selectApprovedPublicFeeds(undefined, [APPROVED_FEED])).toEqual([]);
  });
});
