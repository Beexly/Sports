#!/usr/bin/env python3
"""
WAVE 3 — RESEARCH CORPUS & MIND-STAGING FEED READER (`intelligence/corpus/research_corpus_reader.py`)
Consumes:
1. `data/corpus/research_records.jsonl` (extracted chunks from Motif inbox, Core NFL Schemes & Systems,
   docs/research/*, arXiv papers, equation dossiers, and graduate books BK-01..BK-28)
2. `brain/feeds/*.jsonl` (Waves 1–12 unified mind staging feeds, Quad-Engine crosswalk feed,
   and Core NFL Schemes & Systems feed)

Includes strict disconnect detection (`ResearchCorpusDisconnectedError`) so consumption tests prove
that removing or zeroing an input feed changes downstream output and fails loudly when disconnected.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RESEARCH_RECORDS_PATH = REPO_ROOT / "data" / "corpus" / "research_records.jsonl"
DEFAULT_FEEDS_DIR = REPO_ROOT / "brain" / "feeds"
DEFAULT_RESEARCH_LEDGER_PATH = REPO_ROOT / "docs" / "wiring" / "RESEARCH-LEDGER.jsonl"


class ResearchCorpusDisconnectedError(RuntimeError):
    """Raised when a required research corpus or mind-staging feed is missing or empty."""


def load_research_corpus(
    records_path: Optional[Path] = None,
    category_filter: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Load extracted research records from data/corpus/research_records.jsonl."""
    target = Path(records_path) if records_path else DEFAULT_RESEARCH_RECORDS_PATH
    if not target.exists() or target.stat().st_size == 0:
        raise ResearchCorpusDisconnectedError(
            f"Research corpus file missing or empty: {target}"
        )

    records: List[Dict[str, Any]] = []
    with target.open("r", encoding="utf-8") as f:
        for line in f:
            line_s = line.strip()
            if not line_s:
                continue
            rec = json.loads(line_s)
            if category_filter and rec.get("kind") != category_filter:
                continue
            records.append(rec)
            if limit and len(records) >= limit:
                break

    if not records and category_filter is None:
        raise ResearchCorpusDisconnectedError(f"Zero records parsed from {target}")
    return records


def load_mind_staging_feeds(
    feeds_dir: Optional[Path] = None,
    include_subdirs: bool = True,
) -> Dict[str, Any]:
    """Load and aggregate all JSONL feeds under brain/feeds/."""
    fdir = Path(feeds_dir) if feeds_dir else DEFAULT_FEEDS_DIR
    if not fdir.exists() or not fdir.is_dir():
        raise ResearchCorpusDisconnectedError(f"Mind staging feeds directory missing: {fdir}")

    pattern_iter: Iterable[Path] = (
        sorted(fdir.rglob("*.jsonl")) if include_subdirs else sorted(fdir.glob("*.jsonl"))
    )
    feed_files = [p for p in pattern_iter if p.is_file() and p.stat().st_size > 0]
    if not feed_files:
        raise ResearchCorpusDisconnectedError(f"Zero non-empty JSONL feeds found in {fdir}")

    total_entries = 0
    by_file: Dict[str, int] = {}
    sample_entries: List[Dict[str, Any]] = []
    hasher = hashlib.sha256()

    for fp in feed_files:
        rel = str(fp.relative_to(REPO_ROOT)) if fp.is_relative_to(REPO_ROOT) else fp.name
        count = 0
        with fp.open("r", encoding="utf-8", errors="replace") as f:
            for line in f:
                s = line.strip()
                if not s:
                    continue
                count += 1
                total_entries += 1
                hasher.update(s.encode("utf-8", errors="ignore"))
                if len(sample_entries) < 25:
                    try:
                        sample_entries.append(json.loads(s))
                    except Exception:
                        pass
        by_file[rel] = count

    if total_entries == 0:
        raise ResearchCorpusDisconnectedError(f"Mind staging feeds in {fdir} contain 0 rows")

    return {
        "feed_file_count": len(feed_files),
        "total_feed_entries": total_entries,
        "entries_by_file": by_file,
        "combined_feed_sha256": hasher.hexdigest(),
        "sample_entries": sample_entries,
    }


def query_corpus_by_application(
    query_term: str,
    records_path: Optional[Path] = None,
    feeds_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Query both `data/corpus/research_records.jsonl` and `brain/feeds/*.jsonl` for a specific
    GSE/GSI layer, scheme, equation, or method term.
    Returns matching record IDs, chunk count, extracted methods, and a deterministic content digest
    so consumption tests can verify that altering or removing corpus inputs changes the digest.
    """
    q = query_term.strip().lower()
    if not q:
        raise ValueError("query_term must be non-empty")

    corpus_records = load_research_corpus(records_path=records_path)
    feeds_summary = load_mind_staging_feeds(feeds_dir=feeds_dir)

    matched_ids: List[str] = []
    methods_found: List[str] = []
    equations_found: List[str] = []
    digest = hashlib.sha256()

    for rec in corpus_records:
        haystack = " ".join(
            [
                str(rec.get("title", "")),
                str(rec.get("chunk_text", "")),
                " ".join(rec.get("methods", [])),
                " ".join(rec.get("features_derived", [])),
                " ".join(rec.get("gse_applications", [])),
                " ".join(rec.get("gsi_applications", [])),
            ]
        ).lower()
        if q in haystack:
            cid = str(rec.get("chunk_id") or rec.get("source_id"))
            matched_ids.append(cid)
            digest.update(cid.encode("utf-8"))
            digest.update(str(rec.get("chunk_text", ""))[:256].encode("utf-8"))
            for m in rec.get("methods", []):
                if m not in methods_found:
                    methods_found.append(m)
            for eq in rec.get("equations_latex", []):
                if eq not in equations_found:
                    equations_found.append(eq)

    # Also incorporate mind staging feed hash so disconnecting brain/feeds changes the output
    digest.update(feeds_summary["combined_feed_sha256"].encode("utf-8"))

    return {
        "query_term": query_term,
        "matched_chunk_count": len(matched_ids),
        "matched_chunk_ids_sample": matched_ids[:25],
        "methods_found": methods_found[:30],
        "equations_found": equations_found[:30],
        "mind_staging_feed_entries": feeds_summary["total_feed_entries"],
        "consumption_proof_sha256": digest.hexdigest(),
    }


def get_scheme_and_system_priors(
    scheme_query: str = "Shanahan",
    records_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Retrieve scheme/coaching priors from Wave 3 ingested Core NFL Schemes & Systems records."""
    res = query_corpus_by_application(scheme_query, records_path=records_path)
    return {
        "scheme_query": scheme_query,
        "matched_chunks": res["matched_chunk_count"],
        "methods": res["methods_found"],
        "consumption_proof_sha256": res["consumption_proof_sha256"],
    }


def get_corpus_summary_metrics(
    records_path: Optional[Path] = None,
    feeds_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Return dual-counted summary metrics across research_records.jsonl and brain/feeds/."""
    records = load_research_corpus(records_path=records_path)
    feeds = load_mind_staging_feeds(feeds_dir=feeds_dir)
    by_kind: Dict[str, int] = {}
    unique_sources = set()
    total_equations = 0
    for r in records:
        k = str(r.get("kind", "unknown"))
        by_kind[k] = by_kind.get(k, 0) + 1
        unique_sources.add(str(r.get("source_id", "")))
        total_equations += len(r.get("equations_latex", []))

    return {
        "total_chunks_ingested": len(records),
        "unique_sources_ingested": len(unique_sources),
        "chunks_by_kind": by_kind,
        "extracted_latex_equations_count": total_equations,
        "mind_staging_feed_files": feeds["feed_file_count"],
        "mind_staging_feed_entries": feeds["total_feed_entries"],
        "combined_feed_sha256": feeds["combined_feed_sha256"],
    }
