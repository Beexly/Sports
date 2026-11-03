"""Tests for the research corpus index."""

from __future__ import annotations

import json

import pytest

from intelligence.research import corpus_index as ci


def _manifest(tmp_path, records):
    p = tmp_path / "manifest.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in records), encoding="utf-8")
    return p


RECORDS = [
    {"source": "arxiv", "source_id": "2603.25901", "title":
     "Decoding Defensive Coverage Responsibilities in American Football",
     "abstract": "We model per-defender coverage assignment with factorized attention "
                 "over player trajectories and report disguise rates.",
     "year": 2026, "topics": ["coverage_scheme"], "pdf_url": "http://x/1.pdf"},
    {"source": "openalex", "source_id": "W123", "title":
     "Player tracking in broadcast soccer video",
     "abstract": "Multi-object tracking of players in soccer broadcast footage.",
     "year": 2021, "topics": ["vision_tracking"], "pdf_url": None},
    {"source": "openalex", "source_id": "W456", "title":
     "Betting market efficiency and calibration",
     "abstract": "We test whether sports betting markets are calibrated using proper "
                 "scoring rules.",
     "year": 2019, "topics": ["forecasting_calibration"], "pdf_url": None},
]


def test_build_index_counts(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    assert idx["n"] == 3
    assert idx["avgdl"] > 0
    assert "coverage" in idx["postings"]


def test_search_ranks_relevant_paper_first(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    hits = ci.search(idx, "defensive coverage assignment trajectories")
    assert hits, "expected at least one hit"
    assert hits[0]["id"] == "2603.25901"
    assert "coverage" in hits[0]["matched_terms"]


def test_search_is_specific(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    hits = ci.search(idx, "betting market calibration")
    assert hits[0]["id"] == "W456"


def test_search_empty_query_returns_nothing(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    assert ci.search(idx, "   ") == []


def test_stopwords_do_not_drive_ranking(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    # "the of and" must not match anything
    assert ci.search(idx, "the of and with") == []


def test_mind_feed_marks_records_unwired(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    out = tmp_path / "feed.jsonl"
    n = ci.to_mind_feed(idx, out)
    assert n == 3
    lines = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
    assert all(e["wired"] is False for e in lines)
    assert all(e["gate_status"] == "UNVALIDATED" for e in lines)
    assert all(e["provenance_status"] == "DIRECT_FROM_SOURCE" for e in lines)


RETRACTED = [
    {"source": "local_pdf", "source_id": "ret1", "title":
     "Data Fusion Algorithm for Myocardial Infarction Detection",
     "abstract": "coverage calibration football tracking defensive",
     "retracted": True, "topics": ["local_pdf"]},
    {"source": "local_pdf", "source_id": "ok1", "title":
     "Defensive coverage estimation in American football",
     "abstract": "coverage calibration football tracking defensive",
     "retracted": False, "topics": ["local_pdf"]},
]


def test_retracted_papers_never_rank_by_default(tmp_path):
    """A retracted paper reads exactly like a valid one - it must not surface."""
    idx = ci.build_index(_manifest(tmp_path, RETRACTED))
    hits = ci.search(idx, "coverage calibration football tracking")
    ids = [h["id"] for h in hits]
    assert "ret1" not in ids, "retracted paper ranked by default"
    assert "ok1" in ids


def test_retracted_retrievable_only_on_request(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RETRACTED))
    hits = ci.search(idx, "coverage calibration", include_retracted=True)
    assert "ret1" in [h["id"] for h in hits]


def test_full_text_is_indexed_when_present(tmp_path):
    recs = [{"source": "local_pdf", "source_id": "ft1", "title": "Untitled",
             "abstract": "", "full_text": "homography calibration pinhole jacobian",
             "retracted": False, "topics": ["local_pdf"]}]
    idx = ci.build_index(_manifest(tmp_path, recs))
    hits = ci.search(idx, "pinhole jacobian")
    assert hits and hits[0]["id"] == "ft1"
    assert hits[0]["has_full_text"] is True


SAME_PAPER = [
    {"source": "openalex", "source_id": "oa1", "title":
     "Coverage Estimation in American Football", "abstract": "coverage defense",
     "topics": ["coverage_scheme"]},
    {"source": "arxiv", "source_id": "ax1", "title":
     "Coverage estimation in American football.", "abstract": "coverage defense",
     "topics": ["coverage_scheme"]},
    {"source": "local_pdf", "source_id": "lp1", "title":
     "COVERAGE ESTIMATION IN AMERICAN FOOTBALL", "abstract": "coverage defense",
     "full_text": "coverage defense leverage", "topics": ["local_pdf"]},
]


def test_same_paper_from_three_sources_collapses_to_one(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, SAME_PAPER))
    idx = ci.dedupe(idx)
    assert idx["n"] == 1, f"expected 1 record, got {idx['n']}"
    # local PDF wins because it carries full text
    assert idx["records"][0]["source"] == "local_pdf"
    # but no query lineage is lost
    assert set(idx["records"][0]["topics"]) == {"coverage_scheme", "local_pdf"}


def test_dedupe_does_not_launder_a_retracted_paper(tmp_path):
    """A retracted work merged with a clean duplicate must stay quarantined."""
    recs = [
        {"source": "openalex", "source_id": "r1", "title": "Sports Feedback System",
         "abstract": "coverage", "retracted": True, "topics": ["x"]},
        {"source": "local_pdf", "source_id": "r2", "title": "Sports feedback system",
         "abstract": "coverage", "full_text": "coverage", "retracted": False,
         "topics": ["local_pdf"]},
    ]
    idx = ci.dedupe(ci.build_index(_manifest(tmp_path, recs)))
    assert idx["n"] == 1
    assert idx["records"][0]["retracted"] is True, "dedupe laundered a retraction"
    assert ci.search(idx, "coverage") == []


def test_dedupe_keeps_distinct_papers(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    before = idx["n"]
    idx = ci.dedupe(idx)
    assert idx["n"] == before


def test_mind_feed_topic_filter(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    out = tmp_path / "feed.jsonl"
    n = ci.to_mind_feed(idx, out, topics=["coverage_scheme"])
    assert n == 1
