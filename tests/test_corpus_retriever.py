"""Tests for the research corpus retriever bridge.

The retriever sits between corpus_index (builds the index) and the reasoning
engine (consumes citations). These tests pin the contract the engine depends on:

  * tool_backend must be Callable[[str, dict], str]
  * as_corpus_hits must return list[str] matching "research_corpus/<src>/<id>"
  * every hit must carry gate_status=UNVALIDATED and wired=False
  * retracted papers must not surface unless explicitly opted in

Real manifest, no fixtures: a bridge that only works on toy data is not a bridge.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from intelligence.research import corpus_retriever as cr  # noqa: E402

MANIFEST = cr.DEFAULT_MANIFEST
pytestmark = pytest.mark.skipif(
    not MANIFEST.exists(), reason=f"manifest not present at {MANIFEST}"
)


def test_index_loads_from_real_manifest():
    idx = cr.load_index()
    assert idx["n"] > 1000, f"expected a real corpus, got {idx['n']} records"
    assert idx["postings"], "inverted index is empty"


def test_retrieve_returns_relevant_paper_first():
    hits = cr.retrieve("coverage disguise factorized attention", k=3)
    assert hits, "expected hits for a domain query"
    assert "coverage" in hits[0]["title"].lower()
    assert hits[0]["score"] > 0


def test_hits_carry_gate_stamp():
    for h in cr.retrieve("pose estimation football", k=3):
        assert h["gate_status"] == "UNVALIDATED"
        assert h["wired"] is False


def test_citation_shape():
    hits = cr.as_corpus_hits("aerodynamic drag football", k=2)
    assert hits
    for c in hits:
        assert c.startswith("research_corpus/"), c
        assert c.count("/") == 2, f"expected research_corpus/<src>/<id>, got {c}"


def test_retracted_excluded_by_default():
    q = "retracted mathematical methods medicine"
    default = cr.retrieve(q, k=5)
    assert all(not h["retracted"] for h in default), "retracted paper leaked into default results"


def test_retracted_available_when_opted_in():
    q = "retracted mathematical methods medicine"
    optin = cr.retrieve(q, k=5, include_retracted=True)
    assert any(h["retracted"] for h in optin), "opt-in should surface retracted records"


def test_tool_backend_contract():
    out = cr.tool_backend("research_corpus", {"query": "coverage disguise", "k": 2})
    assert isinstance(out, str)
    assert "research_corpus:" in out
    assert "UNVALIDATED" in out, "gate warning must survive into tool output"


def test_tool_backend_rejects_unknown_tool():
    assert "unknown tool" in cr.tool_backend("not_a_tool", {"query": "x"})


def test_tool_backend_rejects_empty_query():
    assert "empty query" in cr.tool_backend("research_corpus", {"query": "   "})


def test_tool_backend_clamps_k():
    out = cr.tool_backend("research_corpus", {"query": "coverage", "k": 9999})
    # clamped to 20 max; must not raise or return thousands of records
    assert out.count("cite=") <= 20


def test_no_match_is_reported_not_invented():
    # Tokens must be absent from the corpus. An earlier version of this test used
    # "nonexistent term xyzzy" -- "term" has df=130, so BM25 matched real records
    # and the test failed against correct behaviour. Nonsense-only query:
    out = cr.render_hits("qqqzzz wwwxxx vvvbbb", k=3)
    assert "no records matched" in out


# ---------------------------------------------------------------------------
# Fused ranking through the retriever bridge (the "other" demotion fix)
# ---------------------------------------------------------------------------
# retrieve() used to call ci.search() -- pure BM25, no fusion, no domain prior.
# The domain prior was therefore dead code: nothing in the engine path ever
# applied it. These tests pin the bridge to the fused ranker.


def test_retrieve_uses_fused_ranker_by_default():
    hits = cr.retrieve("coverage disguise trajectory", k=3)
    assert hits
    top = hits[0]
    assert top.get("rank_signal") == "rrf", "retriever is not using fused ranking"
    assert "sport_domain" in top and "domain_prior" in top


def test_fused_retrieve_prioritizes_gridiron_for_gridiron_query():
    """Measured regression: raw BM25 gave 3 sport-neutral docs here."""
    hits = cr.retrieve("American football player pose estimation", k=3)
    domains = [h.get("sport_domain") for h in hits]
    assert domains[0] == "american_football", f"top hit not gridiron: {domains}"
    assert domains.count("american_football") >= 2, f"prior too weak: {domains}"


def test_pose_estimation_football_returns_football_tracking_work():
    """The corpus now has football tracking papers, so AF hits are correct.

    The original test asserted no american_football record could win, because
    the 365-record corpus had zero football pose papers. The expanded corpus
    (6,495) includes "Continuous football player tracking from discrete
    broadcast data", "Team-Aware Football Player Tracking with SAM", and
    "Hand Held Multi-Object Tracking Dataset in American Football". An AF hit
    is now the honest answer.

    What must NOT happen is a generic non-vision paper winning on domain prior
    alone, so every top hit must be about vision/tracking/players.
    """
    hits = cr.retrieve("pose estimation football", k=3)
    assert hits
    vocab = ("pose", "track", "vision", "player", "identif", "jersey",
             "camera", "analytics", "sport")
    for h in hits:
        title = str(h.get("title", "")).lower()
        assert any(v in title for v in vocab), f"irrelevant hit: {title}"


def test_fused_false_reproduces_raw_bm25_order():
    fused = cr.retrieve("NFL pass rush win rate", k=2)
    raw = cr.retrieve("NFL pass rush win rate", k=2, fused=False)
    assert fused[0]["id"] == raw[0]["id"], "fusion changed the top hit unexpectedly"
    assert "rank_signal" not in raw[0] or raw[0].get("rank_signal") != "rrf"


def test_render_shows_domain_decision():
    out = cr.render_hits("NFL pass rush win rate", k=1)
    assert "domain=american_football" in out, "ranking decision not surfaced to the model"
    assert "domain_prior=" in out
