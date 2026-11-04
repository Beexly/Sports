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


def test_dedupe_prefers_full_text_over_metadata(tmp_path):
    """A record with full text must beat a metadata-only stub of the same work."""
    recs = [
        {"source": "openalex", "source_id": "oa9", "title": "Combine Performance Study",
         "abstract": "short abstract", "topics": ["x"]},
        {"source": "web_pdf", "source_id": "wp9", "title": "Combine performance study",
         "abstract": "short abstract", "full_text": "long body text here",
         "topics": ["web_pdf"]},
    ]
    idx = ci.dedupe(ci.build_index(_manifest(tmp_path, recs)))
    assert idx["n"] == 1
    assert idx["records"][0]["source"] == "web_pdf"
    assert idx["records"][0]["has_full_text"] is True


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


# ---------------------------------------------------------------------------
# Sport-domain disambiguation + hybrid RRF ranking
# ---------------------------------------------------------------------------
# The corpus mixes American football with association football. An ambiguous
# query must default to gridiron, a cross-domain document must be demoted
# rather than dropped, and the fusion must stay auditable (per-ranker ranks).

FUSION = [
    {"source": "arxiv", "source_id": "af1", "title":
     "Defensive coverage disguise in American Football",
     "abstract": "We model coverage disguise and trajectory leverage for defenders.",
     "year": 2026, "topics": ["coverage_scheme"]},
    {"source": "openalex", "source_id": "sc1", "title":
     "Coverage disguise in football match play",
     "abstract": "coverage disguise coverage disguise trajectory in soccer football match",
     "year": 2022, "topics": ["vision_tracking"]},
    {"source": "openalex", "source_id": "gen1", "title":
     "Statistical calibration of forecasting models",
     "abstract": "We study proper scoring rules and calibration.",
     "year": 2019, "topics": ["forecasting_calibration"]},
]


def _fusion_index(tmp_path):
    return ci.dedupe(ci.build_index(_manifest(tmp_path, FUSION)))


def test_sport_domain_classifies_american_football(tmp_path):
    assert ci.sport_domain_of(
        "Defensive coverage disguise in American Football",
        "offensive line and pass rush") == ci.AMERICAN_FOOTBALL


def test_sport_domain_classifies_soccer():
    assert ci.sport_domain_of(
        "Once Upon a Goal: orientation-based shot metrics in football",
        "expected goals xG model football analytics") == ci.SOCCER


def test_sport_domain_leaves_unknown_alone():
    assert ci.sport_domain_of(
        "Statistical calibration of forecasting models") == ci.OTHER_DOMAIN


def test_football_analytics_is_not_an_american_football_cue():
    """Regression: 'football analytics' is used by soccer papers too.

    Counting it as gridiron evidence pushed an xG/expected-goals paper into
    american_football, which then escaped cross-domain demotion.
    """
    af, sc = ci._domain_scores(
        "football analytics expected goals xg model penalty shootout")
    assert sc > af


def test_query_domain_defaults_to_gridiron():
    assert ci.query_domain("pose estimation football") == ci.AMERICAN_FOOTBALL
    assert ci.query_domain("coverage disguise") == ci.AMERICAN_FOOTBALL


def test_query_domain_honours_explicit_soccer():
    assert ci.query_domain("soccer offside detection") == ci.SOCCER


def test_search_fused_demotes_cross_domain_document(tmp_path):
    """A soccer hit that outscores the gridiron hit must still rank below it."""
    idx = _fusion_index(tmp_path)
    hits = ci.search_fused(idx, "coverage disguise trajectory", k=3)
    assert hits, "expected fused hits"
    assert hits[0]["id"] == "af1", (
        "cross-domain demotion failed: %s ranked first" % hits[0]["id"])
    ids = [h["id"] for h in hits]
    assert "sc1" in ids, "demotion must not drop the cross-domain document"


def test_search_fused_returns_audit_trail(tmp_path):
    idx = _fusion_index(tmp_path)
    hits = ci.search_fused(idx, "coverage disguise trajectory", k=2)
    top = hits[0]
    assert top["sport_domain"] == ci.AMERICAN_FOOTBALL
    assert top["query_domain"] == ci.AMERICAN_FOOTBALL
    assert top["rrf_ranks"], "fusion must expose the per-ranker ranks"
    assert "terms" not in top, "internal term counts leaked into results"


def test_search_fused_scores_are_descending(tmp_path):
    idx = _fusion_index(tmp_path)
    scores = [h["score"] for h in ci.search_fused(idx, "coverage disguise", k=3)]
    assert scores == sorted(scores, reverse=True)


def test_search_fused_empty_query_returns_nothing(tmp_path):
    idx = _fusion_index(tmp_path)
    assert ci.search_fused(idx, "   ") == []


def test_cosine_rank_is_independent_signal(tmp_path):
    idx = _fusion_index(tmp_path)
    hits = ci.cosine_rank(idx, "statistical calibration forecasting")
    assert hits, "expected cosine hits"
    assert hits[0]["id"] == "gen1"
    assert hits[0]["rank_signal"] == "cosine"
    assert "terms" not in hits[0]


# ---------------------------------------------------------------------------
# Sport-domain prior (the "other" demotion bug)
# ---------------------------------------------------------------------------
# The prior version exempted "other" from demotion entirely:
#     if q_dom != OTHER_DOMAIN and dom not in (OTHER_DOMAIN, q_dom):
#         score *= cross_domain_demote
# so a generic computer-vision paper kept FULL fused score while the gridiron
# paper beside it got nothing. Measured on the live manifest: "American football
# player pose estimation" returned [other, other, other] even though 19
# american_football candidates were in the pool. These tests pin the fix.


def test_domain_prior_boosts_same_sport():
    assert ci.domain_prior(ci.AMERICAN_FOOTBALL, ci.AMERICAN_FOOTBALL) == ci.SAME_DOMAIN_BOOST
    assert ci.domain_prior(ci.SOCCER, ci.SOCCER) == ci.SAME_DOMAIN_BOOST


def test_domain_prior_demotes_other_and_cross_sport():
    assert ci.domain_prior(ci.OTHER_DOMAIN, ci.AMERICAN_FOOTBALL) == ci.OTHER_DOMAIN_DEMOTE
    assert ci.domain_prior(ci.SOCCER, ci.AMERICAN_FOOTBALL) == ci.CROSS_DOMAIN_DEMOTE
    # "other" must be demoted LESS than a competing sport: generic mechanism
    # papers are often the right answer for a methods question.
    assert ci.OTHER_DOMAIN_DEMOTE > ci.CROSS_DOMAIN_DEMOTE


def test_domain_prior_is_neutral_when_query_has_no_sport():
    assert ci.domain_prior(ci.AMERICAN_FOOTBALL, ci.OTHER_DOMAIN) == 1.0
    assert ci.domain_prior(ci.SOCCER, ci.OTHER_DOMAIN) == 1.0


def test_search_fused_exposes_domain_prior(tmp_path):
    idx = _fusion_index(tmp_path)
    top = ci.search_fused(idx, "coverage disguise trajectory", k=2)[0]
    assert "domain_prior" in top, "ranking decision must be auditable"
    assert top["domain_prior"] == ci.SAME_DOMAIN_BOOST
    assert top["rank_signal"] == "rrf"


def test_other_domain_is_no_longer_exempt_from_demotion():
    """The exact regression: a sport-neutral doc must not keep full score."""
    prior_for_other = ci.domain_prior(ci.OTHER_DOMAIN, ci.AMERICAN_FOOTBALL)
    assert prior_for_other < 1.0, "other-domain documents escape demotion again"
