"""Systematic harvest of NFL/football research from OpenAlex + arXiv.

Why this exists
---------------
Research found once and not indexed is research lost. This walks the open
literature by topic, records provenance for every hit, downloads open-access
PDFs, and emits a single manifest the reasoning engine can query.

Sources
-------
OpenAlex  works search, no key, includes abstracts via inverted index
arXiv     Atom API, full text PDFs for most cs/stat papers

Kaggle and HuggingFace are handled separately (kaggle_manifest / hf manifests)
because they need auth and are dataset/model inventories rather than papers.

Output
------
<out>/manifest.jsonl   one JSON object per work, appended, deduped by id
<out>/pdfs/            downloaded PDFs (moved to Drive by archive_pdfs step)

Every record carries: source, source_id, title, year, authors, venue, doi, url,
pdf_url, abstract, topics, retrieved_at, sha256 (when downloaded).

Provenance stamp is written to <out>/PROVENANCE.txt so a corpus can always be
traced back to the query that produced it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

UA = "GSE-Research-Harvester/1.0 (research corpus; contact: galaxysportsedge)"
MAILTO = "research@galaxysportsedge.local"

# Topic groups -> OpenAlex / arXiv queries. Each is a real question GSE asks.
TOPICS: dict[str, list[str]] = {
    "vision_tracking": [
        "American football player tracking",
        "sports player tracking computer vision",
        "multi-object tracking broadcast video sports",
        "jersey number recognition sports",
        "football helmet detection video",
    ],
    "coverage_scheme": [
        "defensive coverage prediction American football",
        "NFL coverage shell classification",
        "pass coverage recognition deep learning football",
        "American football tactics machine learning",
    ],
    "pose_homography": [
        "sports field homography estimation",
        "pose estimation athletes video",
        "broadcast camera calibration sports field",
        "player pose tracking football",
    ],
    "football_analytics": [
        "expected points added football",
        "NFL win probability model",
        "football play prediction machine learning",
        "pass rush pressure prediction NFL",
        "route running receiver tracking",
        "injury prediction American football",
    ],
    "forecasting_calibration": [
        "sports forecasting calibration",
        "betting market efficiency sports",
        "probabilistic forecasting proper scoring rules",
        "Bayesian hierarchical sports model",
    ],
}


def _get(url: str, tries: int = 3, timeout: int = 45) -> bytes | None:
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            if i == tries - 1:
                print(f"    ! {type(e).__name__}: {str(e)[:90]}")
                return None
            time.sleep(1.5 * (i + 1))
    return None


def _abstract_from_inverted(inv: dict | None) -> str:
    if not inv:
        return ""
    pos: list[tuple[int, str]] = []
    for word, idxs in inv.items():
        for i in idxs:
            pos.append((i, word))
    pos.sort()
    return " ".join(w for _, w in pos)[:4000]


def openalex(topic: str, query: str, per_page: int = 50) -> list[dict]:
    q = urllib.parse.quote(query)
    url = (f"https://api.openalex.org/works?search={q}&per-page={per_page}"
           f"&mailto={MAILTO}&sort=relevance_score:desc")
    raw = _get(url)
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    out = []
    now = datetime.now(timezone.utc).isoformat()
    for w in data.get("results", []):
        oa = w.get("open_access") or {}
        loc = w.get("best_oa_location") or {}
        authors = [a.get("author", {}).get("display_name")
                   for a in (w.get("authorships") or [])][:8]
        out.append({
            "source": "openalex",
            "source_id": (w.get("id") or "").rsplit("/", 1)[-1],
            "doi": w.get("doi"),
            "title": w.get("title") or w.get("display_name") or "",
            "year": w.get("publication_year"),
            "venue": ((w.get("primary_location") or {}).get("source") or {}).get("display_name"),
            "authors": [a for a in authors if a],
            "cited_by": w.get("cited_by_count"),
            "url": w.get("id"),
            "pdf_url": loc.get("pdf_url") or oa.get("oa_url"),
            "abstract": _abstract_from_inverted(w.get("abstract_inverted_index")),
            "topics": [topic],
            "query": query,
            "retrieved_at": now,
        })
    return out


ARXIV_NS = {"a": "http://www.w3.org/2005/Atom"}


def arxiv(topic: str, query: str, max_results: int = 40) -> list[dict]:
    q = urllib.parse.quote(f'all:"{query}"')
    url = (f"http://export.arxiv.org/api/query?search_query={q}"
           f"&start=0&max_results={max_results}&sortBy=relevance")
    raw = _get(url)
    if not raw:
        return []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return []
    now = datetime.now(timezone.utc).isoformat()
    out = []
    for e in root.findall("a:entry", ARXIV_NS):
        aid = (e.findtext("a:id", "", ARXIV_NS) or "").rsplit("/", 1)[-1]
        title = re.sub(r"\s+", " ", e.findtext("a:title", "", ARXIV_NS) or "").strip()
        summ = re.sub(r"\s+", " ", e.findtext("a:summary", "", ARXIV_NS) or "").strip()
        pub = e.findtext("a:published", "", ARXIV_NS) or ""
        pdf = ""
        for link in e.findall("a:link", ARXIV_NS):
            if link.get("title") == "pdf":
                pdf = link.get("href", "")
        out.append({
            "source": "arxiv",
            "source_id": aid,
            "doi": e.findtext("{http://arxiv.org/schemas/atom}doi", "", ARXIV_NS) or None,
            "title": title,
            "year": int(pub[:4]) if pub[:4].isdigit() else None,
            "venue": "arXiv",
            "authors": [a.findtext("a:name", "", ARXIV_NS)
                        for a in e.findall("a:author", ARXIV_NS)][:8],
            "cited_by": None,
            "url": e.findtext("a:id", "", ARXIV_NS),
            "pdf_url": pdf,
            "abstract": summ[:4000],
            "topics": [topic],
            "query": query,
            "retrieved_at": now,
        })
    return out


def download_pdf(rec: dict, pdf_dir: Path) -> bool:
    url = rec.get("pdf_url")
    if not url:
        return False
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", f"{rec['source']}_{rec['source_id']}")[:120]
    dest = pdf_dir / f"{safe}.pdf"
    if dest.exists() and dest.stat().st_size > 20_000:
        rec["pdf_path"] = str(dest)
        rec["sha256"] = hashlib.sha256(dest.read_bytes()).hexdigest()
        return True
    raw = _get(url, timeout=90)
    if not raw or len(raw) < 20_000 or not raw.startswith(b"%PDF"):
        return False
    dest.write_bytes(raw)
    rec["pdf_path"] = str(dest)
    rec["sha256"] = hashlib.sha256(raw).hexdigest()
    rec["pdf_bytes"] = len(raw)
    return True


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=".")
    ap.add_argument("--topics", default="", help="comma list of topic groups; default all")
    ap.add_argument("--per-topic", type=int, default=50)
    ap.add_argument("--download", action="store_true")
    ap.add_argument("--max-downloads", type=int, default=400)
    args = ap.parse_args(argv)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pdf_dir = out / "pdfs"
    pdf_dir.mkdir(exist_ok=True)
    manifest = out / "manifest.jsonl"

    seen: set[str] = set()
    if manifest.exists():
        for line in manifest.read_text(encoding="utf-8").splitlines():
            try:
                seen.add(json.loads(line)["source_id"])
            except Exception:
                pass

    groups = [t.strip() for t in args.topics.split(",") if t.strip()] or list(TOPICS)
    prov = [f"GSE RESEARCH CORPUS", f"harvested_at: {datetime.now(timezone.utc).isoformat()}"]
    total_new = 0
    downloaded = 0

    with manifest.open("a", encoding="utf-8") as fh:
        for g in groups:
            for query in TOPICS.get(g, []):
                print(f"[{g}] {query}")
                recs = openalex(g, query, args.per_topic) + arxiv(g, query, 40)
                print(f"    hits: {len(recs)}")
                prov.append(f"  {g} | {query} | {len(recs)} hits")
                for r in recs:
                    if not r["source_id"] or r["source_id"] in seen:
                        continue
                    seen.add(r["source_id"])
                    if args.download and downloaded < args.max_downloads:
                        if download_pdf(r, pdf_dir):
                            downloaded += 1
                    fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                    total_new += 1
                fh.flush()
                time.sleep(0.35)

    (out / "PROVENANCE.txt").write_text("\n".join(prov) + "\n", encoding="utf-8")
    print(f"\nnew records: {total_new}")
    print(f"pdfs downloaded: {downloaded}")
    print(f"manifest: {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
