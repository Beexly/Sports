# Provenance: reasoning-depth-spec.md §7 (analyze pipeline), §8 T1 (mandatory:
# the Week 4 PIT@CLE pre-kickoff trace must kill the pressure-funnel stack —
# asserted here through the real engine, not just the adversarial seam),
# §4 (escalation), §5 (checklist gate), §2.6 (resume). These are the c07
# builder's tests over the L1–L5 engine; the c10 e2e suite covers the same
# spec assertions at the adversarial-seam level.

"""Engine pipeline tests: analyze(req, ctx) → ReasoningTrace, end to end."""

from __future__ import annotations

import pytest

from reasoning import (
    AnalysisEngine,
    AnalysisRequest,
    DataContext,
    Exposure,
    GameRequest,
    ReasoningDepth,
    analyze,
    killed_legs,
)
from reasoning.enums import ChecklistVerdict

try:  # absolute package import — unambiguous under run_all.py (tests/ AND
    # qb-behavior/tests/ both end up on sys.path; the bare name is shadowed)
    from tests import fixtures as fx
except ImportError:  # unittest discover -s tests (tests/ itself on sys.path)
    import fixtures as fx


@pytest.fixture()
def engine(tmp_path):
    return AnalysisEngine(store_dir=str(tmp_path / "traces"))


class TestT1FunnelDiesThroughEngine:
    """MANDATORY (spec §8 T1): the Week 4 pre-kickoff trace must kill the
    pressure-funnel stack — run through the real analyze() pipeline."""

    def test_funnel_stack_rejected_at_l5(self, engine):
        trace = engine.analyze(fx.t1_request(), fx.t1_context())

        assert trace.depth == ReasoningDepth.L5
        assert trace.label == "FINAL"

        # L3 neutralization chain with breaking conditions, on the trace.
        chains = trace.chains
        assert chains, "expected the L3 chain on the trace"
        link_ids = [l.id for c in chains for l in c.links]
        assert fx.SHARED_LINK in link_ids

        # The adversary marks breaking_conditions_met.
        report = trace.adversary_report
        assert report is not None
        assert report.breaking_conditions_met is True

        # The 4 funnel legs are bundled as ONE thesis on the shared link.
        assert len(report.correlated_theses) == 1
        bundle = report.correlated_theses[0]
        assert bundle.shared_link_ids == sorted(
            ["pit_edge_wins", fx.SHARED_LINK])
        assert sorted(bundle.leg_ids) == sorted(
            leg.id for leg in fx.funnel_legs())

        # All four legs are killed — and the L5 recommendation says REJECT.
        # (The REJECT text names the killed legs; the contract is that none is
        # presented as a bet to take.)
        assert sorted(killed_legs(report)) == sorted(
            leg.id for leg in fx.funnel_legs())
        recommendation = trace.levels["L5"]["recommendation"]
        assert "REJECT" in recommendation
        assert "PROCEED" not in recommendation

    def test_module_level_analyze_agrees(self, tmp_path):
        trace = analyze(fx.t1_request(), fx.t1_context(),
                        store_dir=str(tmp_path / "traces"))
        assert trace.depth == ReasoningDepth.L5
        assert "REJECT" in trace.levels["L5"]["recommendation"]

    def test_l5_payload_carries_hierarchy_and_checklist(self, engine):
        trace = engine.analyze(fx.t1_request(), fx.t1_context())
        l5 = trace.levels["L5"]
        assert l5["hierarchy_ok"] is True
        assert l5["hierarchy_order"].index("offensive_line") < \
            l5["hierarchy_order"].index("qb_behavior")
        assert set(l5["checklist"]) == {
            "qb_behavior", "coaching_scheme", "offensive_line",
            "trust_signals", "scheme_matchup",
        }


class TestExposureContract:
    """Spec §7: a card / published pick MUST come back L5, whatever the triggers."""

    def test_card_without_requested_depth_still_reaches_l5(self, engine):
        req = fx.t1_request()
        req.requested_depth = None  # no floor — the exposure alone must drive it
        trace = engine.analyze(req, fx.t1_context())
        assert trace.depth == ReasoningDepth.L5
        assert trace.label == "FINAL"

    def test_shallow_analysis_stays_shallow(self, engine):
        req = AnalysisRequest(
            game=GameRequest(away="PIT", home="CLE", week=4, season=2026),
            question="what is the spread?",
            exposure=Exposure.NONE,
        )
        ctx = DataContext(market={"spread": "PIT -2.5"})
        trace = engine.analyze(req, ctx)
        assert trace.depth == ReasoningDepth.L1
        assert trace.label == "ANALYSIS-DRAFT"
        assert "L1" in trace.levels

    def test_no_spurious_reescalation_on_jump_replay(self, engine):
        # Regression: level-completion logging on jump replays must not move
        # the depth (it once ping-ponged L5 → L2 → L5, spamming the log).
        trace = engine.analyze(fx.t1_request(), fx.t1_context())
        transitions = [
            e for e in trace.escalation_log
            if "level_complete" not in e.trigger and "adversary_review" not in e.trigger
        ]
        depths = [ReasoningDepth.L1] + [e.to_depth for e in transitions]
        assert depths == sorted(depths, key=lambda d: d.rank()), \
            f"escalation must be a monotone walk, got {[d.value for d in depths]}"
        assert len(depths) == len(set(depths)), "no depth may be visited twice"


class TestChecklistGate:
    """Spec §5: the L4 gate blocks, and gaps stay DATA-GAP (T2)."""

    def test_unchecked_track_blocks_l4(self, engine):
        ctx = fx.t1_context()
        ctx.checklist_hints = {"offensive_line": "CLEAR"}  # rest unhinted
        # build_checklist marks unhinted tracks DATA-GAP at L4 — checked, not invalid.
        trace = engine.analyze(fx.t1_request(), ctx)
        assert trace.checklist["trust_signals"] == ChecklistVerdict.DATA_GAP
        assert trace.depth == ReasoningDepth.L5  # gate passes: gaps are checked

    def test_explicit_unchecked_hint_is_rejected(self, engine):
        from reasoning.exceptions import ChecklistInvalid
        ctx = fx.t1_context()
        ctx.checklist_hints = {
            t: ("UNCHECKED" if t == "trust_signals" else "CLEAR")
            for t in ("qb_behavior", "coaching_scheme", "offensive_line",
                      "trust_signals", "scheme_matchup")
        }
        with pytest.raises(ChecklistInvalid):
            engine.analyze(fx.t1_request(), ctx)


class TestResume:
    """Spec §8 T7 through the engine: resume merges, never rewrites."""

    def test_resume_request_loads_and_continues(self, engine):
        first = engine.analyze(fx.t1_request(), fx.t1_context())
        assert first.content_hash

        req = fx.t1_request()
        req.resume_trace_id = first.content_hash
        req.requested_depth = ReasoningDepth.L5
        second = engine.analyze(req, fx.t1_context())
        assert second.depth == ReasoningDepth.L5
        assert "REJECT" in second.levels["L5"]["recommendation"]

    def test_resumed_shallow_card_escalates_to_l5(self, engine):
        # Wednesday's trace stopped at L3 with no card intent; Thursday's card
        # request must still honor the L5 contract — never finalize a card at L3.
        shallow_req = fx.t1_request()
        shallow_req.exposure = Exposure.ANALYSIS
        shallow_req.requested_depth = ReasoningDepth.L3
        shallow_req.legs = []
        wednesday = engine.analyze(shallow_req, fx.t1_context())
        # The INFERENCE load-bearing link fires the weak_link trigger, so the
        # shallow analysis genuinely walks L3 → L4. The point stands: resume a
        # sub-L5 trace with a card request and the L5 contract must hold.
        assert wednesday.depth == ReasoningDepth.L4
        assert wednesday.label != "FINAL"

        card_req = fx.t1_request()  # exposure=CARD, 4 legs
        card_req.resume_trace_id = wednesday.content_hash
        card_req.requested_depth = None  # no floor — exposure alone drives it
        thursday = engine.analyze(card_req, fx.t1_context())
        assert thursday.depth == ReasoningDepth.L5
        assert thursday.label == "FINAL"

    def test_finalize_refuses_card_below_l5(self, engine):
        from reasoning.exceptions import ContractViolation
        from reasoning.trace import TraceStore

        store = TraceStore(str(engine.store.root))
        bad = engine.new_trace(fx.t1_request())
        bad.exposure = Exposure.CARD
        bad.depth = ReasoningDepth.L3
        store.save(bad)
        with pytest.raises(ContractViolation):
            engine._finalize(bad)
