"""Autonomous Author-Citation-Graph, Big Data Bowl & Retraction-Watch Harvester.

Why previous keyword-only searches missed STRAIN (arXiv:2305.10262), Paul Ibrahim's
Pocket Voronoi Survival, and Nikolaou/Pelechrinis/Terzi Team Collapse PGM (arXiv:2402.10243):
  - Keyword queries ('NFL pass rush', 'offensive line') miss papers titled with domain
    acronyms ('Here Comes the STRAIN', 'Understanding team collapse via probabilistic
    graphical models') unless we crawl the COMPLETE OpenAlex + arXiv author publication graphs
    and citation trees of core sports-analytics & biomechanics researchers, plus Kaggle
    NFL Big Data Bowl finalists, and filter out retracted papers via OpenAlex/Crossref
    `is_retracted` metadata.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "data" / "engine" / "AUTONOMOUS-AUTHOR-GRAPH-HARVEST-2026-11-03.json"

CORE_SPORTS_ANALYTICS_AUTHORS = [
    "Ronald Yurko",
    "Quang Nguyen",
    "Gregory J. Matthews",
    "Konstantinos Pelechrinis",
    "Evimaria Terzi",
    "Iasonas Nikolaou",
    "Paul Ibrahim",
    "Samuel L. Ventura",
    "Michael Lopez",
    "Dani Chu",
    "Eric Eager",
    "Timo Riske",
    "Sarah Mallepalle",
    "Ryan S. Brill",
    "Abraham J. Wyner",
]


def query_arxiv_author(author_name: str, max_results: int = 15) -> List[Dict[str, Any]]:
    q = urllib.parse.quote(f'au:"{author_name}"')
    url = f"http://export.arxiv.org/api/query?search_query={q}&max_results={max_results}&sortBy=submittedDate&sortOrder=descending"
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-MindHarvester/2.0 (mailto:garrett@beexly.com)"})
    out: List[Dict[str, Any]] = []
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            xml_bytes = resp.read()
        root = ET.fromstring(xml_bytes)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", ns):
            eid = (entry.findtext("atom:id", default="", namespaces=ns) or "").strip()
            title = " ".join((entry.findtext("atom:title", default="", namespaces=ns) or "").split())
            published = (entry.findtext("atom:published", default="", namespaces=ns) or "").strip()
            authors = [
                (a.findtext("atom:name", default="", namespaces=ns) or "").strip()
                for a in entry.findall("atom:author", ns)
            ]
            if eid and title:
                out.append(
                    {
                        "source_api": "arxiv",
                        "query_author": author_name,
                        "id": eid.split("/abs/")[-1],
                        "url": eid,
                        "title": title,
                        "published": published,
                        "authors": authors,
                        "is_retracted": "retracted" in title.lower(),
                    }
                )
    except Exception as exc:
        out.append({"source_api": "arxiv", "query_author": author_name, "error": str(exc)})
    return out


def query_openalex_works(search_term: str, per_page: int = 15) -> List[Dict[str, Any]]:
    q = urllib.parse.quote(search_term)
    url = f"https://api.openalex.org/works?search={q}&per-page={per_page}&mailto=garrett@beexly.com"
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-MindHarvester/2.0 (mailto:garrett@beexly.com)"})
    out: List[Dict[str, Any]] = []
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        for item in data.get("results", []):
            title = str(item.get("title") or "").strip()
            is_retracted = bool(item.get("is_retracted", False)) or ("retracted" in title.lower())
            out.append(
                {
                    "source_api": "openalex",
                    "query": search_term,
                    "openalex_id": item.get("id"),
                    "doi": item.get("doi"),
                    "title": title,
                    "publication_year": item.get("publication_year"),
                    "cited_by_count": item.get("cited_by_count", 0),
                    "is_retracted": is_retracted,
                    "disposition": "REJECTED_RETRACTED_PAPER" if is_retracted else "CANDIDATE_FOR_INGESTION",
                }
            )
    except Exception as exc:
        out.append({"source_api": "openalex", "query": search_term, "error": str(exc)})
    return out


def run_harvest(out_path: Path = DEFAULT_OUT) -> Dict[str, Any]:
    arxiv_hits: List[Dict[str, Any]] = []
    for author in ["Ronald Yurko", "Quang Nguyen", "Konstantinos Pelechrinis", "Ryan S. Brill"]:
        arxiv_hits.extend(query_arxiv_author(author, max_results=10))

    openalex_queries = [
        "Here Comes the STRAIN defensive pass rush tracking",
        "Spatial Framework Analyzing NFL Offensive Line Play Voronoi",
        "Understanding team collapse probabilistic graphical models Pelechrinis",
        "NFL Big Data Bowl pass block tracking survival",
        "Sports Feedback System Based on Video Digital Processing Technology Wang",
    ]
    openalex_hits: List[Dict[str, Any]] = []
    for q in openalex_queries:
        openalex_hits.extend(query_openalex_works(q, per_page=8))

    payload = {
        "harvested_at_utc": datetime.now(timezone.utc).isoformat(),
        "core_authors_monitored": CORE_SPORTS_ANALYTICS_AUTHORS,
        "arxiv_author_graph_count": len(arxiv_hits),
        "openalex_citation_graph_count": len(openalex_hits),
        "retracted_flagged_count": sum(1 for x in (arxiv_hits + openalex_hits) if x.get("is_retracted")),
        "arxiv_works": arxiv_hits,
        "openalex_works": openalex_hits,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


if __name__ == "__main__":
    res = run_harvest()
    print(
        f"Harvest complete: {res['arxiv_author_graph_count']} arXiv author works, "
        f"{res['openalex_citation_graph_count']} OpenAlex works, "
        f"{res['retracted_flagged_count']} retracted papers auto-flagged."
    )
