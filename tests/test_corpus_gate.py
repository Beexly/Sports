"""Gate tests for intelligence/research/corpus_gate.py.

Pins: corpus claims are INFERENCE-only, must carry GATE note, load-bearing
corpus claims refused at L4+. Fail-closed on upgrade attempts.
"""

from __future__ import annotations
import sys
from pathlib import Path
import pytest
REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))
from intelligence.research import corpus_gate as gate
from intelligence.reasoning.enums import ReasoningDepth, Verification
from intelligence.reasoning.schemas import Claim
from intelligence.research.corpus_retriever import GATE_STATUS

def test_gate_status_pinned_to_retriever():
    assert gate.GATE_STATUS == GATE_STATUS == "UNVALIDATED"

def test_corpus_claim_is_inference_with_gate_note():
    c = gate.corpus_claim("coverage disguise ...", "research_corpus/arxiv/2603.25901")
    assert c.verification == Verification.INFERENCE
    assert c.source.startswith("research_corpus/")
    assert "GATE: UNVALIDATED" in c.note
    assert gate.validate_claims([c]) == []

def test_corpus_claim_rejects_non_corpus_source():
    with pytest.raises(ValueError):
        gate.corpus_claim("x", "market feed")

def test_upgrade_to_corpus_is_violation():
    bad = Claim(text="x", verification=Verification.CORPUS, source="research_corpus/arxiv/1", note="GATE: UNVALIDATED")
    v = gate.validate_claims([bad])
    assert any("must be INFERENCE" in x for x in v)

def test_upgrade_to_computed_is_violation():
    bad = Claim(text="x", verification=Verification.COMPUTED, source="research_corpus/arxiv/1", note="GATE: UNVALIDATED")
    assert gate.validate_claims([bad])

def test_missing_gate_note_is_violation():
    bad = Claim(text="x", verification=Verification.INFERENCE, source="research_corpus/arxiv/1", note="")
    assert gate.validate_claims([bad])

def test_non_corpus_claim_not_checked():
    ok = Claim(text="market", verification=Verification.CORPUS, source="market feed", note="")
    assert gate.validate_claims([ok]) == []

def test_load_bearing_refused_at_l4():
    c = gate.corpus_claim("t", "research_corpus/arxiv/1")
    # Claims have no load_bearing attr; default True in gate -> refused at L4+
    assert gate.validate_claims([c], depth=ReasoningDepth.L4)
    # Allowed at L1 for citation/mechanism
    assert gate.validate_claims([c], depth=ReasoningDepth.L1) == []

def test_validate_trace_raises():
    bad = Claim(text="x", verification=Verification.CORPUS, source="research_corpus/arxiv/1", note="")
    with pytest.raises(ValueError):
        gate.validate_trace_claims([bad])

def test_unmarked_corpus_cite_caught():
    bad = Claim(text="x", verification=Verification.CORPUS, source="feed", note="research_corpus/arxiv/1")
    assert gate.validate_claims([bad])
