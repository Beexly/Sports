import type { RssFeedConfig } from "./rss";

export type NewsFeedRightsBasis = "OFFICIAL_SYNDICATION" | "LICENSED_SYNDICATION";

export interface ApprovedPublicNewsFeed extends RssFeedConfig {
  readonly id: string;
  readonly rightsBasis: NewsFeedRightsBasis;
  readonly approvalReference: string;
  readonly publicationApproved: true;
}

export const APPROVED_PUBLIC_NEWS_FEEDS: readonly ApprovedPublicNewsFeed[] = [];

function hasCompleteApproval(feed: ApprovedPublicNewsFeed): boolean {
  let url: URL;
  try {
    url = new URL(feed.url);
  } catch {
    return false;
  }
  return (
    /^[a-z0-9][a-z0-9-]*$/.test(feed.id) &&
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    feed.source.trim().length > 0 &&
    feed.team.trim().length > 0 &&
    feed.approvalReference.trim().length > 0 &&
    (feed.rightsBasis === "OFFICIAL_SYNDICATION" ||
      feed.rightsBasis === "LICENSED_SYNDICATION") &&
    feed.publicationApproved === true
  );
}

export function selectApprovedPublicFeeds(
  rawIds: string | undefined,
  registry: readonly ApprovedPublicNewsFeed[] = APPROVED_PUBLIC_NEWS_FEEDS,
): readonly ApprovedPublicNewsFeed[] {
  const requestedIds = new Set(
    (rawIds ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  if (requestedIds.size === 0) return [];

  const approvedById = new Map(
    registry
      .filter(hasCompleteApproval)
      .map((feed) => [feed.id, feed] as const),
  );
  return [...requestedIds].flatMap((id) => {
    const feed = approvedById.get(id);
    return feed ? [feed] : [];
  });
}
