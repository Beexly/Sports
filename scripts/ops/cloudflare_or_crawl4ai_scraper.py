#!/usr/bin/env python3
"""
Cloudflare Browser Rendering + Self-Hosted Crawl4AI Scraper Utility.

Replaces canceled Firecrawl Hobby scraping across Python ops scripts:
  1. Primary: Cloudflare Browser Rendering (/browser-rendering/markdown) using
     CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (Workers Paid plan: 10 hrs/mo).
  2. Secondary: Local Crawl4AI server (CRAWL4AI_BASE_URL) or Python crawl4ai pkg.
  3. Fallback: Direct urllib fetch with clean HTML text normalization.

Fail-closed: explicitly refuses legacy Firecrawl endpoints.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

DEFAULT_CF_ACCOUNT_ID = "46f1c1d1c65d19f3f983713b3a8ab67c"


@dataclass(frozen=True)
class CrawlOutcome:
    url: str
    backend: str
    status: int
    markdown: str
    fetched_at: str


def assert_non_firecrawl_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Unsupported URL scheme: {parsed.scheme}")
    if "firecrawl.dev" in (parsed.hostname or "").lower():
        raise RuntimeError(
            "Blocked legacy Firecrawl endpoint: Firecrawl Hobby subscription is canceled."
        )
    return url


def _html_to_text(raw_html: str) -> str:
    cleaned = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", raw_html)
    cleaned = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", cleaned)
    cleaned = re.sub(r"(?i)</(p|div|li|tr|h[1-6]|section|article)>", "\n", cleaned)
    cleaned = re.sub(r"(?i)<br\s*/?>", "\n", cleaned)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    cleaned = html.unescape(cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def fetch_page_markdown(url: str, timeout: int = 20) -> CrawlOutcome:
    assert_non_firecrawl_url(url)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cf_token = (
        os.environ.get("CLOUDFLARE_API_TOKEN")
        or os.environ.get("CF_API_TOKEN")
        or ""
    ).strip()
    cf_account = (
        os.environ.get("CLOUDFLARE_BROWSER_ACCOUNT_ID")
        or os.environ.get("CLOUDFLARE_ACCOUNT_ID")
        or DEFAULT_CF_ACCOUNT_ID
    ).strip()

    # 1. Cloudflare Browser Rendering
    if cf_token and cf_account:
        cf_url = (
            f"https://api.cloudflare.com/client/v4/accounts/"
            f"{urllib.parse.quote(cf_account, safe='')}/browser-rendering/markdown"
        )
        req = urllib.request.Request(
            cf_url,
            data=json.dumps({"url": url}).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {cf_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body: dict[str, Any] = json.loads(resp.read().decode("utf-8"))
                md = str(body.get("result") or "").strip()
                if body.get("success") is not False and md:
                    return CrawlOutcome(
                        url=url,
                        backend="cloudflare-browser-rendering",
                        status=resp.status,
                        markdown=md,
                        fetched_at=now,
                    )
        except Exception:
            pass

    # 2. Local Crawl4AI HTTP endpoint if configured
    c4_base = (os.environ.get("CRAWL4AI_BASE_URL") or "").strip()
    if c4_base:
        endpoint = f"{c4_base.rstrip('/')}/crawl"
        req = urllib.request.Request(
            endpoint,
            data=json.dumps({"urls": [url], "priority": 5}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                first = (body.get("results") or [{}])[0]
                md = str(first.get("markdown") or first.get("cleaned_html") or "").strip()
                if md:
                    return CrawlOutcome(
                        url=url,
                        backend="crawl4ai",
                        status=resp.status,
                        markdown=md,
                        fetched_at=now,
                    )
        except Exception:
            pass

    # 3. Direct fetch fallback
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "GalaxySportsEdge-Crawler/2.0 (+https://www.galaxysportsedge.com)",
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="ignore")
        return CrawlOutcome(
            url=url,
            backend="direct-fetch",
            status=resp.status,
            markdown=_html_to_text(raw),
            fetched_at=now,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Cloudflare Browser Rendering / Crawl4AI scraper")
    parser.add_argument("url", help="Target HTTP/HTTPS URL to fetch")
    parser.add_argument("--json", action="store_true", help="Emit JSON result")
    args = parser.parse_args()
    out = fetch_page_markdown(args.url)
    if args.json:
        print(
            json.dumps(
                {
                    "url": out.url,
                    "backend": out.backend,
                    "status": out.status,
                    "fetched_at": out.fetched_at,
                    "chars": len(out.markdown),
                },
                indent=2,
            )
        )
    else:
        print(out.markdown[:2000])


if __name__ == "__main__":
    main()
