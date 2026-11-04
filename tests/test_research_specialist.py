"""Wiring tests for the opt-in ResearchSpecialist (intelligence/reasoning).

Pins:
  * default-off: no existing run gains a research specialist or corpus claims
  * opt-in produces INFERENCE claims carrying the GATE note, and populates
    DataContext.corpus_hits
  * non-corpus citation strings (legacy harness paths) are skipped, never
    upgraded
  * load-bearing corpus claims are refused at L4+ (gate + specialist refusal)
  * upgrade to CORPUS is a gate violation
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from intelligence.reasoning.engine import AnalysisEngine, analyze
from intelligence.reasoning.enums import ReasoningDepth, Verification
from intelligence.reasoning.interfaces import (
    AnalysisRequest,
    DataContext,
    GameRequest,
)
from intelligence.reasoning.schemas import Claim, ReasoningTrace
from intelligence.reasoning.specialists import ResearchSpecialist, SpecialistRegistry
from intelligence.research import corpus_gate as gate


def _req() -> AnalysisRequest:
    return AnalysisRequest(
        game=GameRequest(away="A", home="B", week=1, season=2026),
        question="coverage disguise factorized attention",
    )


def _trace() -> ReasoningTrace:
    return ReasoningTrace(trace_id="t", depth=ReasoningDepth.L1)


def _backend_with_hits(name, args):  # noqa: ANN001, ANN202
    return (
        "research_corpus: 1 hit(s) for 'coverage disguise factorized attention'\n"
        "GATE: all records UNVALIDATED — citation/mechanism use only, "
        "not load-bearing evidence in a recommendation.\n\n"
        "[1] Coverage disguise factorized attention\n"
        "    cite=research_corpus/arxiv/2603.25901\n"
    )


def _backend_no_hits(name, args):  # noqa: ANN001, ANN202
    return (
        "research_corpus: no records matched 'q'.\n"
        "GATE: all records UNVALIDATED — citation/mechanism use only, "
        "not load-bearing evidence in a recommendation."
    )


# -- default off ---------------------------------------------------------------

def test_default_registry_unchanged():
    names = {s.name for s in SpecialistRegistry().all()}
    assert names == {"stat", "scheme", "behavior", "signal", "adversary"}
    assert "research" not in names

def test_disabled_specialist_emits_nothing():
    ctx = DataContext(tool_backend=_backend_with_hits)
    out = ResearchSpecialist().run(ReasoningDepth.L1, _req(), ctx, _trace())
    assert out.claims == []
    assert ctx.corpus_hits == []

def test_default_engine_has_no_research_claims(tmp_path):
    ctx = DataContext(tool_backend=_backend_with_hits)
    trace = AnalysisEngine(store_dir=str(tmp_path / "traces")).analyze(_req(), ctx)
    l1_claims = trace.levels["L1"]["claims"]
    assert not any(
        c["source"].startswith("research_corpus/") for c in l1_claims
    )

# -- opt-in ---------------------------------------------------------------------

def test_registry_opt_in_adds_research():
    reg = SpecialistRegistry(include_research=True)
    names = [s.name for s in reg.all()]
    assert names.count("research") == 1

def test_opt_in_produces_inference_gate_claims():
    ctx = DataContext(tool_backend=_backend_with_hits)
    trace = _trace()
    out = ResearchSpecialist(enabled=True).run(
        ReasoningDepth.L1, _req(), ctx, trace)
    assert len(out.claims) == 1
    (c,) = out.claims
    assert c.verification == Verification.INFERENCE
    assert c.source == "research_corpus/arxiv/2603.25901"
    assert "GATE: UNVALIDATED" in c.note
    assert gate.validate_claims(out.claims, depth=ReasoningDepth.L1) == []
    # retrieval populates the formerly dead DataContext field, and is audited
    assert ctx.corpus_hits == ["research_corpus/arxiv/2603.25901"]
    assert any(tc.tool == "research_corpus" for tc in trace.tool_calls)

def test_prepopulated_corpus_hits_become_claims():
    ctx = DataContext(
        corpus_hits=["research_corpus/arxiv/999"],
        tool_backend=_backend_no_hits,
    )
    out = ResearchSpecialist(enabled=True).run(
        ReasoningDepth.L1, _req(), ctx, _trace())
    assert [c.source for c in out.claims] == ["research_corpus/arxiv/999"]
    # no duplication on a second run
    ResearchSpecialist(enabled=True).run(ReasoningDepth.L1, _req(), ctx, _trace())
    assert ctx.corpus_hits == ["research_corpus/arxiv/999"]

def test_retrieve_path_populates_corpus_hits(monkeypatch):
    from intelligence.research import corpus_retriever as cr

    def fake_retrieve(query, k=5, **kwargs):
        return [{
            "title": "Coverage disguise factorized attention",
            "year": 2026,
            "citation": "research_corpus/arxiv/2603.25901",
            "gate_status": "UNVALIDATED",
        }]

    monkeypatch.setattr(cr, "retrieve", fake_retrieve)
    ctx = DataContext()
    out = ResearchSpecialist(enabled=True).run(
        ReasoningDepth.L1, _req(), ctx, _trace())
    assert ctx.corpus_hits == ["research_corpus/arxiv/2603.25901"]
    assert len(out.claims) == 1
    assert "Coverage disguise" in out.claims[0].text

def test_retrieve_failure_is_fail_closed(monkeypatch):
    from intelligence.research import corpus_retriever as cr

    def boom(query, k=5, **kwargs):
        raise FileNotFoundError("manifest not present")

    monkeypatch.setattr(cr, "retrieve", boom)
    ctx = DataContext()
    out = ResearchSpecialist(enabled=True).run(
        ReasoningDepth.L1, _req(), ctx, _trace())
    assert out.claims == []  # no crash, no invented claims

def test_engine_opt_in_wires_research(tmp_path):
    ctx = DataContext(tool_backend=_backend_with_hits)
    engine = AnalysisEngine(
        store_dir=str(tmp_path / "traces"), enable_research=True)
    trace = engine.analyze(_req(), ctx)
    research = [
        c for c in trace.levels["L1"]["claims"]
        if c["source"].startswith("research_corpus/")
    ]
    assert research, "opt-in engine must surface corpus claims in the trace"
    assert all(
        c["verification"] == Verification.INFERENCE.value
        and "GATE: UNVALIDATED" in c["note"] for c in research
    )
    assert ctx.corpus_hits == ["research_corpus/arxiv/2603.25901"]

def test_analyze_free_function_opt_in(tmp_path):
    ctx = DataContext(tool_backend=_backend_with_hits)
    trace = analyze(_req(), ctx, store_dir=str(tmp_path / "traces"),
                    enable_research=True)
    assert any(
        c["source"].startswith("research_corpus/")
        for c in trace.levels["L1"]["claims"]
    )

# -- fail-closed / gate ---------------------------------------------------------

def test_non_corpus_hits_skipped_not_upgraded():
    # the legacy harness citation shape must never become a claim
    ctx = DataContext(
        corpus_hits=["coaching-tendencies/profiles/todd-monken.md"],
        tool_backend=_backend_no_hits,
    )
    out = ResearchSpecialist(enabled=True).run(
        ReasoningDepth.L1, _req(), ctx, _trace())
    assert out.claims == []

def test_load_bearing_refused_at_l4_and_l5():
    for depth in (ReasoningDepth.L4, ReasoningDepth.L5):
        ctx = DataContext(tool_backend=_backend_with_hits)
        trace = _trace()
        out = ResearchSpecialist(enabled=True).run(depth, _req(), ctx, trace)
        assert out.claims == [], f"corpus claims must be refused at {depth}"
        # and nothing was fetched at L4+ at all
        assert ctx.corpus_hits == []
        assert trace.tool_calls == []

def test_gate_reuses_load_bearing_refusal_on_emitted_claims():
    ctx = DataContext(tool_backend=_backend_with_hits)
    out = ResearchSpecialist(enabled=True).run(
        ReasoningDepth.L1, _req(), ctx, _trace())
    # the ALLOWED L1 claims are refused by the gate when treated as load
    # bearing at L4+ (same semantics as levels.py weak_link)
    assert gate.validate_claims(out.claims, depth=ReasoningDepth.L4)

def test_upgrade_to_corpus_refused():
    ctx = DataContext(tool_backend=_backend_with_hits)
    (c,) = ResearchSpecialist(enabled=True).run(
        ReasoningDepth.L1, _req(), ctx, _trace()).claims
    bad = Claim(text=c.text, verification=Verification.CORPUS,
                source=c.source, note=c.note)
    assert gate.validate_claims([bad])
    # and the specialist itself never emits anything above INFERENCE
    assert all(
        claim.verification == Verification.INFERENCE for claim in [c]
    )
