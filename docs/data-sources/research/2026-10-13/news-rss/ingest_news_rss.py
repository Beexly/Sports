"""Sports-news RSS pilot ingestion (2026-10-13).

Pulls sanctioned RSS/Atom feeds (ESPN NFL; Google News RSS queries for NFL and
NFL injury-report) and lands raw XML plus a parsed headline digest under
docs/data-sources/research/2026-10-13/news-rss/.

RSS is the sanctioned syndication path (the repo's own sports-news skill uses
it); no scraping, no keys. Raw XML is kept so provenance is auditable.
"""

import json
import os
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

OUT_DIR = r"C:\Users\Garrett\Sports\docs\data-sources\research\2026-10-13\news-rss"

FEEDS = {
    "espn_nfl": "https://www.espn.com/espn/rss/nfl/news",
    "google_news_nfl": "https://news.google.com/rss/search?q=NFL&hl=en-US&gl=US&ceid=US:en",
    "google_news_nfl_injury": "https://news.google.com/rss/search?q=NFL+injury+report&hl=en-US&gl=US&ceid=US:en",
}

UA = {"User-Agent": "GSE-ingest-pilot/1.0 (RSS syndication feed)"}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def parse_items(xml_bytes: bytes, limit: int = 15):
    root = ET.fromstring(xml_bytes)
    items = []
    for item in root.iter("item"):
        def g(tag):
            el = item.find(tag)
            return (el.text or "").strip() if el is not None and el.text else ""
        items.append({"title": g("title"), "link": g("link"), "pubDate": g("pubDate"), "source": g("source")})
        if len(items) >= limit:
            break
    # Atom fallback
    if not items:
        ns = {"a": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("a:entry", ns):
            t = entry.find("a:title", ns)
            l = entry.find("a:link", ns)
            p = entry.find("a:updated", ns)
            items.append({"title": (t.text or "").strip() if t is not None else "", "link": l.get("href") if l is not None else "", "pubDate": (p.text or "").strip() if p is not None else "", "source": ""})
            if len(items) >= limit:
                break
    return items


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    digest = {"generated_utc": now, "method": "RSS/Atom pull, raw XML retained", "feeds": {}}
    md = ["# Sports-news RSS pilot (2026-10-13)", "", f"Generated {now}. Raw XML retained beside this digest.", ""]
    for name, url in FEEDS.items():
        try:
            raw = fetch(url)
            with open(os.path.join(OUT_DIR, f"{name}.xml"), "wb") as f:
                f.write(raw)
            items = parse_items(raw)
            digest["feeds"][name] = {"url": url, "item_count": len(items), "items": items}
            md.append(f"## {name} ({len(items)} items)")
            md.append(f"Source: {url}")
            for it in items[:12]:
                md.append(f"- [{it['title']}]({it['link']}) — {it['pubDate']}")
            md.append("")
            print(f"{name}: {len(items)} items")
        except Exception as e:  # honesty: report, never invent
            digest["feeds"][name] = {"url": url, "error": str(e)}
            md.append(f"## {name} — ERROR: {e}")
            print(f"{name}: ERROR {e}")
    with open(os.path.join(OUT_DIR, "news-digest.json"), "w", encoding="utf-8") as f:
        json.dump(digest, f, indent=1)
    with open(os.path.join(OUT_DIR, "news-digest.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print(f"WROTE {OUT_DIR}")


if __name__ == "__main__":
    main()
