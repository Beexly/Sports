/**
 * Reddit narrative source — READ-ONLY ingestion of public posts mentioning an
 * athlete, mapped into NarrativeTextItem for the prediction-engine narrative
 * analyzer. Free, no key for the public search JSON.
 *
 * ROLE / PROVENANCE: Tier-B SIGNAL only. Crowd discussion is noisy and unverified;
 * it feeds a small, capped edge nudge and is NEVER cited as public provenance.
 *
 * SAFETY / ETIQUETTE: GET only, with a descriptive User-Agent and bounded
 * retries/timeout. The unauthenticated search JSON is heavily rate-limited and
 * intended for light use — a production deployment should move to Reddit's
 * official OAuth API with proper rate-limit handling. No writes, no auth, no PII
 * collection beyond public post titles/snippets. Wiring this into the pipeline is
 * a separate, founder-gated step.
 */
import type { NarrativeTextItem } from "@sports/types";

const REDDIT_SEARCH_URL = "https://www.reddit.com/search.json";
const REDDIT_TIMEOUT_MS = 15 * 1000;
const USER_AGENT = "galaxy-sports-edge/0.1 (narrative-signal; read-only)";

export interface RedditSearchParams {
  /** Internal athlete id stamped onto every produced item. */
  readonly athleteId: string;
  /** Free-text query — typically the athlete's name. */
  readonly athleteName: string;
  /** Restrict to a subreddit (e.g. "nfl"). */
  readonly subreddit?: string;
  readonly limit?: number;
  readonly sort?: "relevance" | "new" | "hot" | "top";
  readonly timeframe?: "hour" | "day" | "week" | "month" | "year" | "all";
}

interface RedditChildData {
  readonly title?: string;
  readonly selftext?: string;
  readonly created_utc?: number;
  readonly subreddit?: string;
  readonly ups?: number;
}
interface RedditListing {
  readonly data?: {
    readonly children?: readonly { readonly data?: RedditChildData }[];
  };
}

/** Build the public Reddit search URL. Pure — no I/O. */
export function buildRedditSearchUrl(params: RedditSearchParams): string {
  const query = params.subreddit
    ? `subreddit:${params.subreddit} ${params.athleteName}`
    : params.athleteName;
  const usp = new URLSearchParams({
    q: query,
    limit: String(params.limit ?? 25),
    sort: params.sort ?? "new",
    t: params.timeframe ?? "week",
    restrict_sr: params.subreddit ? "true" : "false",
  });
  return `${REDDIT_SEARCH_URL}?${usp.toString()}`;
}

/** Map a Reddit listing payload into narrative items. Pure — unit-testable. */
export function parseRedditListing(listing: RedditListing, athleteId: string): NarrativeTextItem[] {
  const children = listing.data?.children ?? [];
  const items: NarrativeTextItem[] = [];
  for (const child of children) {
    const post = child.data;
    if (!post) continue;
    const text = [post.title, post.selftext].filter((s): s is string => Boolean(s && s.trim())).join(". ").trim();
    if (!text) continue;
    const ups = post.ups ?? 1;
    items.push({
      source: post.subreddit ? `reddit:r/${post.subreddit}` : "reddit:search",
      athleteId,
      text,
      publishedAt:
        post.created_utc != null && Number.isFinite(post.created_utc)
          ? new Date(post.created_utc * 1000).toISOString()
          : undefined,
      // Light trust weight from upvotes (log-scaled, capped). Reddit is noisy Tier-B.
      weight: Math.min(1, 0.3 + Math.log10(Math.max(1, ups)) / 5),
    });
  }
  return items;
}

interface RedditClientOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterRatio?: number;
  readonly random?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly fetchImpl?: typeof fetch;
}

const DEFAULTS = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 4_000,
  jitterRatio: 0.35,
  random: Math.random,
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

export class RedditError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RedditError";
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/** Read-only client for Reddit's public search JSON. No credentials; GET only. */
export class RedditNarrativeSource {
  private readonly opts: Required<Omit<RedditClientOptions, "fetchImpl">> & { fetchImpl: typeof fetch };

  constructor(options: RedditClientOptions = {}) {
    this.opts = {
      maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
      baseDelayMs: options.baseDelayMs ?? DEFAULTS.baseDelayMs,
      maxDelayMs: options.maxDelayMs ?? DEFAULTS.maxDelayMs,
      jitterRatio: options.jitterRatio ?? DEFAULTS.jitterRatio,
      random: options.random ?? DEFAULTS.random,
      sleep: options.sleep ?? DEFAULTS.sleep,
      fetchImpl: options.fetchImpl ?? globalThis.fetch,
    };
  }

  private async get<T>(url: string): Promise<T> {
    let response: Response | null = null;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        response = await this.opts.fetchImpl(url, {
          headers: { accept: "application/json", "user-agent": USER_AGENT },
          signal: AbortSignal.timeout(REDDIT_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new RedditError(`Reddit request timed out after ${REDDIT_TIMEOUT_MS}ms`, 408);
        }
        throw new RedditError(`Reddit request failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!isRetryableStatus(response.status) || attempt === this.opts.maxRetries) break;

      const exp = Math.min(this.opts.baseDelayMs * 2 ** attempt, this.opts.maxDelayMs);
      const jitter = Math.round(exp * this.opts.jitterRatio * this.opts.random());
      await this.opts.sleep(exp + jitter);
    }

    if (!response) throw new RedditError("Reddit request failed before a response was received");
    if (!response.ok) {
      const body = await response.text();
      throw new RedditError(`Reddit error: ${response.status} — ${body}`, response.status);
    }
    return (await response.json()) as T;
  }

  /** Fetch public posts mentioning the athlete, normalized into narrative items. */
  async fetchAthleteItems(params: RedditSearchParams): Promise<NarrativeTextItem[]> {
    const listing = await this.get<RedditListing>(buildRedditSearchUrl(params));
    return parseRedditListing(listing, params.athleteId);
  }
}
