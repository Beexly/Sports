#!/usr/bin/env python3
"""Weekly Sports Analytics Research Metadata Harvester (`weekly_sports_paper_harvester.py`).

Queries open public academic metadata APIs (arXiv Atom API + OpenAlex Works API)
for sports probability calibration, conformal prediction, and player-tracking papers,
filing dated metadata manifests strictly under `docs/arxiv-program/research/YYYY-MM-DD/`.

Strictly metadata-only: NEVER downloads copyrighted PDFs or commercial paywalled datasets.
"""
from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
ARXIV_API = "https://export.arxiv.org/api/query"
OPENALEX_API = "https://api.openalex.org/works"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}

DEFAULT_TOPICS = (
    "conformal prediction sports betting calibration",
    "NFL football player tracking expected points bayesian",
)


def parse_arxiv_atom(xml_text: str) -> list[dict[str, Any]]:
    root = ET.fromstring(xml_text)
    items: list[dict[str, Any]] = []
    for entry in root.findall("atom:entry", ATOM_NS):
        aid = (entry.findtext("atom:id", default="", namespaces=ATOM_NS) or "").strip()
        title = " ".join((entry.findtext("atom:title", default="", namespaces=ATOM_NS) or "").split())
        published = (entry.findtext("atom:published", default="", namespaces=ATOM_NS) or "").strip()
        summary = " ".join((entry.findtext("atom:summary", default="", namespaces=ATOM_NS) or "").split())[:320]
        authors = [
            (a.findtext("atom:name", default="", namespaces=ATOM_NS) or "").strip()
            for a in entry.findall("atom:author", ATOM_NS)
        ]
        items.append({
            "source": "arxiv",
            "id": aid,
            "title": title,
            "published": published,
            "authors": [a for a in authors if a][:8],
            "abstract_preview": summary,
            "pdf_downloaded": False,
        })
    return items


def parse_openalex_works(payload: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for w in payload.get("results") or []:
        items.append({
            "source": "openalex",
            "id": str(w.get("id") or ""),
            "doi": w.get("doi"),
            "title": str(w.get("title") or "").strip(),
            "publication_year": w.get("publication_year"),
            "cited_by_count": w.get("cited_by_count", 0),
            "is_oa": bool((w.get("open_access") or {}).get("is_oa", False)),
            "pdf_downloaded": False,
        })
    return items


def fetch_url_text(url: str, timeout: int = 12) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-Research-Harvester/1.0 (metadata-only)"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def run_harvester(
    *,
    queries: tuple[str, ...] = DEFAULT_TOPICS,
    max_per_source: int = 5,
    dry_run: bool = False,
    date_str: str | None = None,
) -> dict[str, Any]:
    today = date_str or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = REPO_ROOT / "docs" / "arxiv-program" / "research" / today

    planned_urls = []
    records: list[dict[str, Any]] = []
    errors: list[str] = []

    for q in queries:
        ax_url = f"{ARXIV_API}?search_query=all:{urllib.parse.quote(q)}&start=0&max_results={max_per_source}&sortBy=submittedDate&sortOrder=descending"
        oa_url = f"{OPENALEX_API}?search={urllib.parse.quote(q)}&per-page={max_per_source}&sort=publication_date:desc"
        planned_urls.extend([ax_url, oa_url])

        if dry_run:
            continue

        try:
            records.extend(parse_arxiv_atom(fetch_url_text(ax_url)))
        except Exception as exc:
            errors.append(f"arxiv[{q}]: {exc}")

        try:
            records.extend(parse_openalex_works(json.loads(fetch_url_text(oa_url))))
        except Exception as exc:
            errors.append(f"openalex[{q}]: {exc}")

    manifest = {
        "schema": "gse_weekly_paper_harvest_v1",
        "date_utc": today,
        "dry_run": dry_run,
        "metadata_only": True,
        "pdfs_downloaded": 0,
        "target_dir": str(out_dir.relative_to(REPO_ROOT)).replace("\\", "/"),
        "planned_endpoints": planned_urls,
        "records_count": len(records),
        "errors": errors,
        "records": records,
    }
    if not dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "harvest_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Harvest arXiv & OpenAlex sports research metadata only")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-per-source", type=int, default=5)
    parser.add_argument("--date", default=None)
    args = parser.parse_args(argv)
    out = run_harvester(max_per_source=args.max_per_source, dry_run=args.dry_run, date_str=args.date)
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
