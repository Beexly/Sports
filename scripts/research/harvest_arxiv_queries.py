"""Harvest explicit arXiv search pages into the corpus manifest.

The web searches requested (NFL, national football league, american football,
prediction sports, paginated to 400) are the same query engine as the API, so this
pulls them through the API - reliable Atom XML instead of HTML scraping - with the
requested page offsets preserved.

arXiv asks for roughly one request per 3 seconds; hammering it returns 429, which
is why the earlier resolver recorded false negatives. Every request here is paced
and any 429 is reported rather than silently treated as "no results".
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

NS = {"a": "http://www.w3.org/2005/Atom"}
UA = "GSE-Research-Harvester/1.0"

# (label, api_query, start, page_size) -- mirrors the requested search URLs.
SEARCHES = [
    ("national_football_league", "all:national+AND+all:football+AND+all:league", 0, 200),
    ("nfl", "all:nfl", 0, 200),
    ("nfl", "all:nfl", 200, 200),
    ("american_football", "all:american+AND+all:football", 0, 200),
    ("prediction_sports", "all:prediction+AND+all:sports", 0, 200),
    ("prediction_sports", "all:prediction+AND+all:sports", 200, 200),
    ("prediction_sports", "all:prediction+AND+all:sports", 400, 200),
]


def fetch(query: str, start: int, n: int, tries: int = 3):
    url = (f"http://export.arxiv.org/api/query?search_query={query}"
           f"&start={start}&max_results={n}&sortBy=submittedDate&sortOrder=descending")
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 8 * (i + 1)
                print(f"    429 rate limited, sleeping {wait}s")
                time.sleep(wait)
                continue
            return e.code, None
        except Exception as e:
            if i == tries - 1:
                return None, None
            time.sleep(3 * (i + 1))
    return 429, None


def parse(raw: bytes, label: str) -> list[dict]:
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return []
    now = datetime.now(timezone.utc).isoformat()
    out = []
    for e in root.findall("a:entry", NS):
        aid = (e.findtext("a:id", "", NS) or "").rsplit("/abs/", 1)[-1] or None
        if not aid:
            continue
        title = re.sub(r"\s+", " ", e.findtext("a:title", "", NS) or "").strip()
        summ = re.sub(r"\s+", " ", e.findtext("a:summary", "", NS) or "").strip()
        pub = e.findtext("a:published", "", NS) or ""
        pdf = ""
        for link in e.findall("a:link", NS):
            if link.get("title") == "pdf":
                pdf = link.get("href")
        out.append({
            "source": "arxiv",
            "source_id": aid,
            "doi": e.findtext("{http://arxiv.org/schemas/atom}doi", "", NS) or None,
            "title": title,
            "year": int(pub[:4]) if pub[:4].isdigit() else None,
            "venue": "arXiv",
            "authors": [a.findtext("a:name", "", NS)
                        for a in e.findall("a:author", NS)][:10],
            "cited_by": None,
            "url": e.findtext("a:id", "", NS),
            "pdf_url": pdf,
            "abstract": summ[:4000],
            "topics": [label],
            "query": f"arxiv search: {label}",
            "retrieved_at": now,
            "published": pub[:10],
            "withdrawn": bool(re.search(r"\bwithdrawn\b", summ, re.I)),
            "retracted": bool(re.search(r"\bretracted\b", summ, re.I)),
            "gate_status": "QUARANTINED"
            if re.search(r"\bwithdrawn\b|\bretracted\b", summ, re.I) else "UNVALIDATED",
            "wired": False,
        })
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    args = ap.parse_args(argv)

    manifest = Path(args.manifest)
    seen = set()
    if manifest.exists():
        for line in manifest.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(line)
                if r.get("source") == "arxiv" and r.get("source_id"):
                    seen.add(r["source_id"])
            except Exception:
                pass
    print(f"existing arxiv ids: {len(seen)}")

    total_new = 0
    with manifest.open("a", encoding="utf-8") as fh:
        for label, query, start, n in SEARCHES:
            print(f"[{label}] start={start}")
            status, raw = fetch(query, start, n)
            if status != 200 or not raw:
                print(f"    FAILED status={status}")
                time.sleep(3)
                continue
            recs = parse(raw, label)
            new = 0
            for r in recs:
                if r["source_id"] in seen:
                    continue
                seen.add(r["source_id"])
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                new += 1
            fh.flush()
            total_new += new
            print(f"    entries={len(recs)} new={new}")
            time.sleep(3.5)

    print(f"\nnew arxiv records: {total_new}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
