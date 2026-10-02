# Provenance: reasoning-depth-spec.md §4 (escalation triggers), §6.1 (trace),
# §2.6 (content-addressed resumable store), §8 T2/T3/T5/T6/T7. Unit depth over
# the c07 builder's seams: enums, escalation machine, condition evaluation,
# trace store + serialization, level helpers, specialists.

"""Unit tests: enums, escalation, conditions, trace store, level helpers."""

from __future__ import annotations

import pytest

from reasoning import (
    BreakingCondition,
    CausalChain,
    CausalLink,
    ChecklistVerdict,
    EscalationSignal,
    Exposure,
    ReasoningDepth,
    ReasoningTrace,
    TraceStore,
    Verification,
    check_hierarchy,
    checklist_conflict_count,
    content_hash,
    count_weak_links,
    escalate_to,
    evaluate_condition,
    next_depth,
    trace_from_dict,
    trace_to_dict,
)
from reasoning.levels import HIERARCHY_ORDER, build_checklist
from reasoning.specialists import SpecialistRegistry


class TestEnums:
    def test_depth_ordering(self):
        assert ReasoningDepth.ordered() == [
            ReasoningDepth.L1, ReasoningDepth.L2, ReasoningDepth.L3,
            ReasoningDepth.L4, ReasoningDepth.L5,
        ]
        assert ReasoningDepth.L4.is_at_least(ReasoningDepth.L3)
        assert not ReasoningDepth.L2.is_at_least(ReasoningDepth.L3)

    def test_exposure_requires_l5(self):
        assert Exposure.CARD.requires_l5()
        assert Exposure.PUBLISHED_PICK.requires_l5()
        assert not Exposure.NONE.requires_l5()
        assert not Exposure.ANALYSIS.requires_l5()


class TestNextDepth:
    def test_l3_market_contradiction_threshold(self):
        # |edge| > 5% at L3 with market_contradiction → L4.
        sig = EscalationSignal(depth=ReasoningDepth.L3,
                               triggers={"market_contradiction"},
                               market_edge_pct=6.0)
        assert next_depth(sig)[0] == ReasoningDepth.L4
        sig.market_edge_pct = 4.9
        assert next_depth(sig) == (None, None)

    def test_l3_weak_link_escalates(self):
        sig = EscalationSignal(depth=ReasoningDepth.L3, triggers={"weak_link"})
        assert next_depth(sig) == (ReasoningDepth.L4, "weak_link")

    def test_no_trigger_no_escalation(self):
        assert next_depth(EscalationSignal(depth=ReasoningDepth.L2)) == (None, None)

    def test_l5_is_terminal(self):
        assert next_depth(EscalationSignal(depth=ReasoningDepth.L5,
                                          triggers={"thesis_survived"})) == (None, None)


class TestEscalateTo:
    def test_logs_each_level(self):
        trace = ReasoningTrace(trace_id="e", depth=ReasoningDepth.L2)
        escalate_to(trace, ReasoningDepth.L4, "real_exposure")
        assert trace.depth == ReasoningDepth.L4
        assert [(e.from_depth, e.to_depth) for e in trace.escalation_log] == [
            (ReasoningDepth.L2, ReasoningDepth.L3),
            (ReasoningDepth.L3, ReasoningDepth.L4),
        ]

    def test_checklist_conflict_count(self):
        checklist = {
            "qb_behavior": ChecklistVerdict.CONFLICT,
            "coaching_scheme": ChecklistVerdict.CONFLICT,
            "offensive_line": ChecklistVerdict.CLEAR,
        }
        assert checklist_conflict_count(checklist) == 2


class TestEvaluateCondition:
    @pytest.mark.parametrize("op,observed,threshold,expected", [
        ("<", 2.1, 2.3, True), ("<", 2.5, 2.3, False),
        ("<=", 2.3, 2.3, True), (">", 0.7, 0.6, True),
        (">=", 0.639, 0.55, True), (">=", 0.5, 0.55, False),
        ("==", 1.0, 1.0, True), ("!=", 1.0, 2.0, True),
    ])
    def test_ops(self, op, observed, threshold, expected):
        cond = BreakingCondition(id="c", text="t", metric="m", op=op, threshold=threshold)
        result = evaluate_condition(cond, {"m": observed})
        assert result.verifiable is True
        assert result.met is expected
        assert result.observed_value == observed

    def test_missing_metric_is_unverifiable_never_assumed(self):
        cond = BreakingCondition(id="c", text="t", metric="missing", op="<", threshold=1.0)
        result = evaluate_condition(cond, {})
        assert result.verifiable is False
        assert result.met is None
        assert result.observed_value is None

    def test_invalid_op_rejected(self):
        with pytest.raises(ValueError):
            BreakingCondition(id="c", text="t", metric="m", op="~", threshold=1.0)


class TestCountWeakLinks:
    def _trace(self, verification, load_bearing=True, with_bc=True):
        link = CausalLink(
            id="l", cause="c", mechanism="m", outcome="o",
            verification=verification, load_bearing=load_bearing,
            breaking_conditions=(
                [BreakingCondition(id="bc", text="t", metric="m", op="<", threshold=1.0)]
                if with_bc else []
            ),
        )
        return ReasoningTrace(trace_id="w", depth=ReasoningDepth.L3,
                              chains=[CausalChain(id="ch", links=[link])])

    def test_inference_load_bearing_is_weak(self):
        assert count_weak_links(self._trace(Verification.INFERENCE)) == 1

    def test_single_source_load_bearing_is_weak(self):
        assert count_weak_links(self._trace(Verification.SINGLE_SOURCE)) == 1

    def test_corpus_is_not_weak(self):
        assert count_weak_links(self._trace(Verification.CORPUS)) == 0

    def test_non_load_bearing_is_not_weak(self):
        assert count_weak_links(
            self._trace(Verification.INFERENCE, load_bearing=False)) == 0


class TestBuildChecklist:
    def test_no_hint_at_l3_is_data_gap(self):
        from reasoning.interfaces import DataContext
        verdicts = build_checklist(DataContext(), ReasoningDepth.L3)
        assert all(v == ChecklistVerdict.DATA_GAP for v in verdicts.values())

    def test_no_hint_below_l3_is_unchecked(self):
        from reasoning.interfaces import DataContext
        verdicts = build_checklist(DataContext(), ReasoningDepth.L2)
        assert all(v == ChecklistVerdict.UNCHECKED for v in verdicts.values())

    def test_hints_honored(self):
        from reasoning.interfaces import DataContext
        verdicts = build_checklist(
            DataContext(checklist_hints={"qb_behavior": "CLEAR"}), ReasoningDepth.L4)
        assert verdicts["qb_behavior"] == ChecklistVerdict.CLEAR
        assert verdicts["trust_signals"] == ChecklistVerdict.DATA_GAP


class TestTraceStore:
    def test_save_load_round_trip_preserves_types(self, tmp_path):
        store = TraceStore(str(tmp_path))
        trace = ReasoningTrace(
            trace_id="rt", depth=ReasoningDepth.L4, question="q",
            chains=[CausalChain(id="ch", links=[
                CausalLink(id="l", cause="c", mechanism="m", outcome="o",
                           verification=Verification.INFERENCE,
                           breaking_conditions=[BreakingCondition(
                               id="bc", text="t", metric="m", op="<", threshold=1.0)])])],
            checklist={"qb_behavior": ChecklistVerdict.CONFLICT},
            observed_values={"m": 0.5},
            levels={"L1": {"claims": ["x"]}},
            hierarchy_order=["offensive_line", "coaching_scheme", "qb_behavior"],
        )
        h = store.save(trace)
        loaded = store.load(h)
        assert isinstance(loaded.chains[0], CausalChain)
        assert isinstance(loaded.chains[0].links[0], CausalLink)
        assert isinstance(loaded.chains[0].links[0].breaking_conditions[0], BreakingCondition)
        assert loaded.chains[0].links[0].verification == Verification.INFERENCE
        assert loaded.checklist["qb_behavior"] == ChecklistVerdict.CONFLICT
        assert loaded.depth == ReasoningDepth.L4
        assert loaded.hierarchy_order[0] == "offensive_line"

    def test_content_hash_is_stable_and_content_addressed(self, tmp_path):
        store = TraceStore(str(tmp_path))
        t1 = ReasoningTrace(trace_id="a", depth=ReasoningDepth.L1, question="same")
        t2 = ReasoningTrace(trace_id="a", depth=ReasoningDepth.L1, question="same")
        t3 = ReasoningTrace(trace_id="a", depth=ReasoningDepth.L1, question="different")
        assert content_hash(t1) == content_hash(t2)
        assert content_hash(t1) != content_hash(t3)
        assert store.save(t1) == content_hash(t1)

    def test_resume_never_rewrites_original_levels(self, tmp_path):
        store = TraceStore(str(tmp_path))
        original = ReasoningTrace(trace_id="w", depth=ReasoningDepth.L3,
                                  levels={"L1": {"claims": ["wed"]}})
        h = store.save(original)
        resumed = store.resume(h, "L4_update", {"claims": ["thu"]}, note="news")
        assert resumed.levels["L1"] == {"claims": ["wed"]}
        assert resumed.levels["L4_update"] == {"claims": ["thu"]}
        assert resumed.trace_id == "w::resumed"
        # The stored original is untouched.
        assert store.load(h).levels == {"L1": {"claims": ["wed"]}}

    def test_trace_to_dict_from_dict_round_trip(self):
        trace = ReasoningTrace(
            trace_id="d", depth=ReasoningDepth.L2,
            track_evidence={"qb_behavior": [("Flacco TTT 2.1s", Verification.COMPUTED)]},
        )
        restored = trace_from_dict(trace_to_dict(trace))
        assert restored.track_evidence == trace.track_evidence
        assert restored.track_evidence["qb_behavior"][0][1] == Verification.COMPUTED


class TestSpecialists:
    def test_registry_default_five(self):
        names = {s.name for s in SpecialistRegistry().all()}
        assert names == {"stat", "scheme", "behavior", "signal", "adversary"}

    def test_stat_specialist_records_tool_calls(self):
        from reasoning.interfaces import AnalysisRequest, DataContext, GameRequest
        trace = ReasoningTrace(trace_id="s", depth=ReasoningDepth.L1)
        req = AnalysisRequest(game=GameRequest(away="A", home="B", week=1, season=2026),
                              question="q")
        ctx = DataContext(market={"spread": "A -3"})
        reg = SpecialistRegistry()
        stat = next(s for s in reg.all() if s.name == "stat")
        out = stat.run(ReasoningDepth.L1, req, ctx, trace)
        assert out.claims, "market data must produce claims"
        assert trace.tool_calls, "every number auditable to its source (spec §2.4)"


class TestHierarchy:
    def test_hierarchy_order_constant(self):
        assert HIERARCHY_ORDER.index("offensive_line") < HIERARCHY_ORDER.index("coaching_scheme")
        assert HIERARCHY_ORDER.index("coaching_scheme") < HIERARCHY_ORDER.index("qb_behavior")

    def test_check_hierarchy_defaults(self):
        trace = ReasoningTrace(trace_id="h", depth=ReasoningDepth.L5)
        assert check_hierarchy(trace) is True  # falls back to HIERARCHY_ORDER
