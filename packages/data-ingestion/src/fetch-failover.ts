/**
 * Multi-host fetch failover for free data.
 *
 * Free datasets should never have a single point of failure. `fetchWithFailover`
 * tries an ordered list of mirror URLs and returns the first that responds OK,
 * reporting which host served and what failed. For nflverse (CC-BY release
 * assets), `nflverseMirror()` provides a community GitHub proxy as a last-resort
 * backup behind the primary GitHub CDN, so ingestion survives a primary outage.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface FailoverResult {
  readonly response: Response;
  readonly sourceUrl: string;
  readonly attempts: number;
  readonly errors: readonly string[];
}

/**
 * Maps a primary GitHub release URL to a community proxy mirror. The data is
 * openly licensed (CC-BY), so proxying is legal; the proxy is used ONLY as a
 * fallback after the trusted primary host fails.
 */
export function nflverseMirror(url: string): string | null {
  if (url.startsWith("https://github.com/")) {
    return `https://ghproxy.net/${url}`;
  }
  return null;
}

/** Builds the ordered [primary, ...mirrors] URL list for a GitHub-hosted asset. */
export function withMirrors(primaryUrl: string): string[] {
  const mirror = nflverseMirror(primaryUrl);
  return mirror ? [primaryUrl, mirror] : [primaryUrl];
}

export async function fetchWithFailover(
  urls: readonly string[],
  fetcher: FetchLike,
  { timeoutMs = 15000, init = {} }: { timeoutMs?: number; init?: RequestInit } = {},
): Promise<FailoverResult> {
  const errors: string[] = [];
  let attempts = 0;
  for (const url of urls) {
    attempts += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url, { ...init, signal: controller.signal });
      if (response.ok) return { response, sourceUrl: url, attempts, errors };
      errors.push(`${url} -> HTTP ${response.status}`);
    } catch (error) {
      errors.push(`${url} -> ${error instanceof Error ? error.message : "error"}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`All ${attempts} source(s) failed: ${errors.join("; ")}`);
}
