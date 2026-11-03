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


def test_mind_feed_topic_filter(tmp_path):
    idx = ci.build_index(_manifest(tmp_path, RECORDS))
    out = tmp_path / "feed.jsonl"
    n = ci.to_mind_feed(idx, out, topics=["coverage_scheme"])
    assert n == 1
