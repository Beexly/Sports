#!/usr/bin/env python3
"""
Full 120+ File Downloads & Workspace Reconciler
Scans C:\\Users\\Garrett\\Downloads and workspace artifacts, maps them to canonical
AGENTS.md research buckets, and writes:
C:\\Users\\Garrett\\Sports\\docs\\engine\\research\\2026-10-28\\ALL-DOWNLOADS-AND-WORKSPACES-LEDGER.json
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List

RESEARCH_DATE = "2026-10-28"

CANONICAL_BUCKETS = {
    "dfs": f"docs/dfs/research/{RESEARCH_DATE}",
    "predictions": f"docs/predictions/research/{RESEARCH_DATE}",
    "props": f"docs/props/research/{RESEARCH_DATE}",
    "fantasy": f"docs/fantasy/research/{RESEARCH_DATE}",
    "engine": f"docs/engine/research/{RESEARCH_DATE}",
    "data_sources": f"docs/data-sources/research/{RESEARCH_DATE}",
    "arxiv_program": f"docs/arxiv-program/research/{RESEARCH_DATE}",
}


def resolve_canonical_bucket(filename: str) -> str:
    """
    Maps any filename to its AGENTS.md dated research bucket.
    Specifically ensures:
    resolve_canonical_bucket("circa_observations.db") == "docs/data-sources/research/2026-10-28"
    """
    fn_lower = filename.lower()

    # Explicit data sources & database files: circa, .db, .sqlite
    if "circa" in fn_lower or fn_lower.endswith((".db", ".sqlite", ".sqlite3")):
        return CANONICAL_BUCKETS["data_sources"]

    # 1. DFS & Daily Fantasy: dfs, gpp, dk, draftkings, fanduel, slate, salary, optimizer
    if any(
        k in fn_lower
        for k in (
            "dfs",
            "gpp",
            "draftkings",
            "fanduel",
            "optimizer",
            "salary",
            "slate",
        )
    ):
        return CANONICAL_BUCKETS["dfs"]

    # 2. Player Props & Pick'em: prop, pickem, over_under, touchdown, strikeout, passing_yard
    if any(
        k in fn_lower
        for k in (
            "prop",
            "pickem",
            "underdog",
            "prizepicks",
            "touchdown",
            "receiving_yard",
            "rushing_yard",
            "passing_yard",
        )
    ):
        return CANONICAL_BUCKETS["props"]

    # 3. Fantasy: season-long, dynasty, rankings, waiver
    if any(
        k in fn_lower
        for k in ("fantasy", "dynasty", "season_long", "waiver")
    ):
        return CANONICAL_BUCKETS["fantasy"]

    # 4. Predictions: pick, spread, moneyline, total, clv, betmgm, market
    if any(
        k in fn_lower
        for k in (
            "pick",
            "spread",
            "moneyline",
            "clv",
            "prediction",
            "brier",
            "betmgm",
            "market_line",
        )
    ):
        return CANONICAL_BUCKETS["predictions"]

    # 5. arXiv program & academic papers: arxiv, openalex, paper, corpus, 1807-, 2309-
    if any(
        k in fn_lower
        for k in (
            "arxiv",
            "openalex",
            "paper",
            "citation",
            "theorem",
            "1807-",
            "2309-",
            "academic",
        )
    ):
        return CANONICAL_BUCKETS["arxiv_program"]

    # 6. Data sources & feeds: odds, nflverse, ftn, sleeper, ngs, feeds
    if (
        "odds" in fn_lower
        or "nflverse" in fn_lower
        or "sleeper" in fn_lower
        or bool(re.search(r"(^|[^a-z])(ngs|ftn|pbp|feed|source)([^a-z]|$)", fn_lower))
    ):
        return CANONICAL_BUCKETS["data_sources"]

    # 7. Engine default: architecture, cuda, gpu, omml, docx, mind, autopsy, router, math
    return CANONICAL_BUCKETS["engine"]


def reconcile_workspace_inventory() -> Dict[str, Any]:
    """
    Scans C:\\Users\\Garrett\\Downloads and relevant workspace artifacts,
    maps them to canonical research buckets, and writes ALL-DOWNLOADS-AND-WORKSPACES-LEDGER.json.
    """
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    downloads_dir = r"C:\Users\Garrett\Downloads"
    output_ledger_path = os.path.join(
        repo_root,
        "docs",
        "engine",
        "research",
        RESEARCH_DATE,
        "ALL-DOWNLOADS-AND-WORKSPACES-LEDGER.json",
    )

    reconciled_files: List[Dict[str, Any]] = []
    bucket_counts: Dict[str, int] = {b: 0 for b in CANONICAL_BUCKETS.values()}

    # Scan Downloads folder
    if os.path.exists(downloads_dir):
        for entry in os.scandir(downloads_dir):
            if entry.is_file():
                bucket = resolve_canonical_bucket(entry.name)
                stat = entry.stat()
                file_info = {
                    "filename": entry.name,
                    "source_path": entry.path,
                    "canonical_bucket": bucket,
                    "size_bytes": stat.st_size,
                    "extension": os.path.splitext(entry.name)[1].lower(),
                    "last_modified_iso": datetime.fromtimestamp(
                        stat.st_mtime, timezone.utc
                    ).isoformat(),
                }
                reconciled_files.append(file_info)
                bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1

    # Also scan docs/engine/research/2026-10-28/downloads for mirrored files
    docs_downloads_dir = os.path.join(
        repo_root, "docs", "engine", "research", RESEARCH_DATE, "downloads"
    )
    if os.path.exists(docs_downloads_dir):
        for entry in os.scandir(docs_downloads_dir):
            if entry.is_file():
                bucket = resolve_canonical_bucket(entry.name)
                stat = entry.stat()
                file_info = {
                    "filename": entry.name,
                    "source_path": entry.path,
                    "canonical_bucket": bucket,
                    "size_bytes": stat.st_size,
                    "extension": os.path.splitext(entry.name)[1].lower(),
                    "last_modified_iso": datetime.fromtimestamp(
                        stat.st_mtime, timezone.utc
                    ).isoformat(),
                }
                # Check for duplicates by filename
                if not any(f["filename"] == entry.name for f in reconciled_files):
                    reconciled_files.append(file_info)
                    bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1

    ledger = {
        "timestampIso": datetime.now(timezone.utc).isoformat(),
        "totalFilesScanned": len(reconciled_files),
        "targetBucketDate": RESEARCH_DATE,
        "bucketDistribution": bucket_counts,
        "files": reconciled_files,
        "status": "RECONCILED",
        "standingDoctrineNotice": (
            "Direct-to-Mind/Engine: Every downloaded artifact, paper, and dataset "
            "is mapped to its dated AGENTS.md research bucket. Nothing hidden, nothing lost."
        ),
    }

    os.makedirs(os.path.dirname(output_ledger_path), exist_ok=True)
    with open(output_ledger_path, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2)

    print(f"Reconciled {len(reconciled_files)} files to {output_ledger_path}")
    return ledger


if __name__ == "__main__":
    reconcile_workspace_inventory()
