"""ESPN NFL structured news ingest (2026-10-13).

The RSS pilot carries headlines; this carries ESPN's own structured news JSON
(keyless public site API) with categories, bylines and canonical links, so the
corpus has both the syndicated feed view and the structured view.

Source: https://site.api.espn.com/apis/site/v2/sports/football/nfl/news
"""

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone

OUT_DIR = r"C:\Users\Garrett\Sports\docs\data-sources\research\2026-10-13\news-espn"
URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news"


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    req = urllib.request.Request(URL + "?" + urllib.parse.urlencode({"limit": 50}), headers={"User-Agent": "GSE-ingest-pilot/1.0 (keyless ESPN public API)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    arts = []
    for a in payload.get("articles", []):
        link = ((a.get("links") or {}).get("web") or {}).get("href")
        cats = [c.get("description") for c in (a.get("categories") or []) if c.get("description")]
        arts.append(
            {
                "headline": a.get("headline"),
                "description": a.get("description"),
                "published": a.get("published"),
                "type": a.get("type"),
                "byline": a.get("byline"),
                "link": link,
                "categories": cats[:6],
            }
        )

    digest = {"generated_utc": now, "source": URL, "article_count": len(arts), "articles": arts}
    with open(os.path.join(OUT_DIR, "espn-nfl-news-digest.json"), "w", encoding="utf-8") as f:
        json.dump(digest, f, indent=1)
    md = ["# ESPN NFL structured news digest (2026-10-13)", "", f"Source: {URL} (keyless), generated {now}.", ""]
    for a in arts[:25]:
        md.append(f"- **{a['headline']}** ({a['published']}, {a['byline']}) — {a['link']}")
        if a["description"]:
            md.append(f"  {a['description']}")
    with open(os.path.join(OUT_DIR, "espn-nfl-news-digest.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print(f"WROTE {len(arts)} articles -> {OUT_DIR}")


if __name__ == "__main__":
    main()
