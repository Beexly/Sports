import {
  selectApprovedPublicFeeds,
  type ApprovedPublicNewsFeed,
} from "./approved-feeds";
import {
  fetchLiveWire,
  type RssFeedConfig,
  type WireFetchResult,
} from "./rss";

export interface PublicWirePolicyInput {
  readonly publicationApproved: boolean;
  readonly approvedFeedIds: string | undefined;
}

export interface PublicWireDependencies {
  readonly registry?: readonly ApprovedPublicNewsFeed[];
  readonly fetcher?: (
    feeds: readonly RssFeedConfig[],
  ) => Promise<WireFetchResult>;
}

export async function loadPublicWire(
  input: PublicWirePolicyInput,
  dependencies: PublicWireDependencies = {},
): Promise<WireFetchResult | null> {
  if (!input.publicationApproved) return null;

  const feeds = selectApprovedPublicFeeds(
    input.approvedFeedIds,
    dependencies.registry,
  );
  if (feeds.length === 0) return null;

  const fetcher = dependencies.fetcher ?? fetchLiveWire;
  try {
    return await fetcher(feeds);
  } catch {
    return {
      status: "OUTAGE",
      items: [],
      configuredFeedCount: feeds.length,
      successfulFeedCount: 0,
      failedFeedCount: feeds.length,
    };
  }
}
