/**
 * cloudflare-browser-crawler.ts — Cloudflare Browser Rendering + Crawl4AI Fallback.
 *
 * Replaces canceled Firecrawl Hobby scraping across GSE ingestion workflows:
 * - Primary: Cloudflare Browser Rendering REST API (10 browser hrs/mo + 10 concurrent
 *   browsers included in Workers Paid $5/mo plan) when CLOUDFLARE_API_TOKEN is configured.
 * - Secondary: Self-hosted Crawl4AI HTTP service (CRAWL4AI_BASE_URL) when reachable.
 * - Fallback: Plain HTTP fetch with deterministic HTML-to-text normalization.
 *
 * Fail-closed: never permits legacy paid Firecrawl endpoints.
 */

export interface BrowserCrawlOptions {
  readonly timeoutMs?: number;
  readonly accountId?: string;
  readonly apiToken?: string;
  readonly crawl4aiBaseUrl?: string;
  readonly env?: Record<string, string | undefined>;
  readonly fetchImpl?: typeof fetch;
}

export interface BrowserCrawlResult {
  readonly url: string;
  readonly backend: "cloudflare-browser-rendering" | "crawl4ai" | "direct-fetch";
  readonly status: number;
  readonly markdown: string;
  readonly title?: string;
  readonly fetchedAt: string;
}

const DEFAULT_CLOUDFLARE_ACCOUNT_ID = "46f1c1d1c65d19f3f983713b3a8ab67c";

function htmlToPlainMarkdown(html: string): { markdown: string; title?: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : undefined;
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { markdown: cleaned, title };
}

export function assertAllowedCrawlUrl(rawUrl: string): URL {
  const parsed = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported crawl protocol: ${parsed.protocol}`);
  }
  if (parsed.hostname.toLowerCase().includes("firecrawl.dev")) {
    throw new Error("Blocked legacy Firecrawl API host: Firecrawl Hobby subscription is canceled.");
  }
  return parsed;
}

export async function crawlUrlWithCloudflareOrFallback(
  rawUrl: string,
  options: BrowserCrawlOptions = {},
): Promise<BrowserCrawlResult> {
  const parsed = assertAllowedCrawlUrl(rawUrl);
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const accountId = (
    options.accountId ??
    env["CLOUDFLARE_BROWSER_ACCOUNT_ID"] ??
    env["CLOUDFLARE_ACCOUNT_ID"] ??
    DEFAULT_CLOUDFLARE_ACCOUNT_ID
  ).trim();
  const apiToken = (
    options.apiToken ??
    env["CLOUDFLARE_API_TOKEN"] ??
    env["CF_API_TOKEN"] ??
    ""
  ).trim();
  const crawl4aiBase = (
    options.crawl4aiBaseUrl ??
    env["CRAWL4AI_BASE_URL"] ??
    ""
  ).trim();
  const now = new Date().toISOString();

  // 1. Primary: Cloudflare Browser Rendering /markdown endpoint
  if (accountId && apiToken) {
    const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-rendering/markdown`;
    const res = await fetchImpl(cfEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: parsed.toString(),
        gotoOptions: { waitUntil: "domcontentloaded", timeout: timeoutMs },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) {
      const payload = (await res.json()) as { success?: boolean; result?: string };
      if (payload.success !== false && typeof payload.result === "string" && payload.result.trim()) {
        return {
          url: parsed.toString(),
          backend: "cloudflare-browser-rendering",
          status: res.status,
          markdown: payload.result.trim(),
          fetchedAt: now,
        };
      }
    }
  }

  // 2. Secondary: Self-hosted Crawl4AI HTTP endpoint
  if (crawl4aiBase) {
    const endpoint = `${crawl4aiBase.replace(/\/+$/, "")}/crawl`;
    try {
      const res = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [parsed.toString()], priority: 5 }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          results?: Array<{ markdown?: string; cleaned_html?: string; metadata?: { title?: string } }>;
        };
        const first = body.results?.[0];
        const md = (first?.markdown ?? first?.cleaned_html ?? "").trim();
        if (md) {
          return {
            url: parsed.toString(),
            backend: "crawl4ai",
            status: res.status,
            markdown: md,
            title: first?.metadata?.title,
            fetchedAt: now,
          };
        }
      }
    } catch {
      // Fall through to direct HTTP fetch when Crawl4AI daemon is not running locally.
    }
  }

  // 3. Deterministic direct HTTP fetch + HTML strip
  const direct = await fetchImpl(parsed.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "GalaxySportsEdge-Crawler/2.0 (+https://www.galaxysportsedge.com)",
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const rawBody = await direct.text();
  const { markdown, title } = htmlToPlainMarkdown(rawBody);
  return {
    url: parsed.toString(),
    backend: "direct-fetch",
    status: direct.status,
    markdown,
    ...(title ? { title } : {}),
    fetchedAt: now,
  };
}
