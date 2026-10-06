# Provenance: reasoning-depth-spec.md §5 (the gate), §6.3 (verdicts), §7
# (validateChecklist signature; published_pick/card MUST be L5), §8 T2
# (checklist gate blocks blind analysis).

"""Tests for the no-blind-spots checklist validator (reasoning/checklist.py)."""

import pytest

from reasoning.checklist import depth_contract_ok, describe_gate, validate_checklist
from reasoning.enums import TRACKS, ChecklistVerdict, Exposure, ReasoningDepth
from reasoning.schemas import ChecklistResult, ReasoningTrace


def _trace(depth: ReasoningDepth, **verdicts: ChecklistVerdict) -> ReasoningTrace:
    base = {t: ChecklistVerdict.CLEAR for t in TRACKS}
    base.update(verdicts)
    return ReasoningTrace(trace_id="t", depth=depth, checklist=base)


# --- T2: checklist gate blocks blind analysis ----------------------------------

class TestT2ChecklistGate:
    def test_trust_signal_gap_is_data_gap_not_unchecked(self):
        # The track was CHECKED and found to have no data → DATA-GAP.
        trace = _trace(ReasoningDepth.L3, trust_signals=ChecklistVerdict.DATA_GAP)
        result = validate_checklist(trace)
        assert result.valid is True
        assert result.verdicts["trust_signals"] == ChecklistVerdict.DATA_GAP
        assert result.data_gaps == ["trust_signals"]

    def test_unchecked_track_at_l3_invalid(self):
        trace = _trace(ReasoningDepth.L3, trust_signals=ChecklistVerdict.UNCHECKED)
        result = validate_checklist(trace)
        assert result.valid is False
        assert "trust_signals" in result.invalid_reason

    def test_missing_track_defaults_to_unchecked_and_invalid_at_l3(self):
        trace = ReasoningTrace(trace_id="t", depth=ReasoningDepth.L3, checklist={})
        result = validate_checklist(trace)
        assert result.valid is False
        assert "qb_behavior" in result.invalid_reason

    def test_unchecked_allowed_below_l3(self):
        trace = _trace(ReasoningDepth.L2, trust_signals=ChecklistVerdict.UNCHECKED)
        result = validate_checklist(trace)
        assert result.valid is True

    def test_data_gap_triggers_adversary_worst_plausible(self):
        # Spec §5 gate: DATA-GAP + load-bearing → adversary assumes worst-plausible.
        from reasoning.adversary import adversary_review
        trace = _trace(ReasoningDepth.L4, trust_signals=ChecklistVerdict.DATA_GAP)
        report = adversary_review(trace)
        assert any(g.track == "trust_signals" for g in report.gap_assumptions)
        assert any("worst-plausible" in g.assumed_value for g in report.gap_assumptions)

    def test_two_conflicts_require_l5(self):
        trace = _trace(
            ReasoningDepth.L4,
            scheme_matchup=ChecklistVerdict.CONFLICT,
            offensive_line=ChecklistVerdict.CONFLICT,
        )
        result = validate_checklist(trace)
        assert result.valid is True  # conflicts are checked, not unchecked
        assert result.requires_l5 is True
        assert sorted(result.conflicts) == ["offensive_line", "scheme_matchup"]

    def test_single_conflict_does_not_require_l5(self):
        trace = _trace(ReasoningDepth.L4, scheme_matchup=ChecklistVerdict.CONFLICT)
        result = validate_checklist(trace)
        assert result.requires_l5 is False

    def test_nothing_material_counts_as_checked(self):
        trace = _trace(ReasoningDepth.L5, trust_signals=ChecklistVerdict.NOTHING_MATERIAL)
        result = validate_checklist(trace)
        assert result.valid is True


# --- Depth/exposure contract -----------------------------------------------------

class TestDepthContract:
    @pytest.mark.parametrize("exposure", [Exposure.PUBLISHED_PICK, Exposure.CARD])
    def test_published_surfaces_require_l5(self, exposure):
        assert depth_contract_ok(ReasoningDepth.L5, exposure) is True
        for depth in (ReasoningDepth.L1, ReasoningDepth.L2, ReasoningDepth.L3, ReasoningDepth.L4):
            assert depth_contract_ok(depth, exposure) is False

    @pytest.mark.parametrize("exposure", [Exposure.NONE, Exposure.ANALYSIS])
    def test_internal_work_any_depth(self, exposure):
        for depth in ReasoningDepth.ordered():
            assert depth_contract_ok(depth, exposure) is True


# --- Gate description --------------------------------------------------------------

class TestDescribeGate:
    def test_invalid_described(self):
        trace = _trace(ReasoningDepth.L3, trust_signals=ChecklistVerdict.UNCHECKED)
        text = describe_gate(validate_checklist(trace))
        assert text.startswith("INVALID")
        assert "trust_signals" in text

    def test_pass_with_flags(self):
        trace = _trace(
            ReasoningDepth.L5,
            trust_signals=ChecklistVerdict.DATA_GAP,
            scheme_matchup=ChecklistVerdict.CONFLICT,
            offensive_line=ChecklistVerdict.CONFLICT,
        )
        text = describe_gate(validate_checklist(trace))
        assert text.startswith("PASS")
        assert "L5 required" in text


# --- Phase-5 improvements: stub-mode honesty, no-bet code mapping -------------

class TestStubModeHonesty:
    def test_stub_track_forced_to_data_gap(self):
        trace = _trace(ReasoningDepth.L3)
        trace.stub_tracks = ["qb_behavior"]
        result = validate_checklist(trace)
        assert result.valid is True
        assert result.verdicts["qb_behavior"] == ChecklistVerdict.DATA_GAP
        assert result.stub_downgraded == ["qb_behavior"]
        assert "qb_behavior" in result.data_gaps

    def test_stub_downgrade_overrides_clear(self):
        # A CLEAR verdict backed by fixture data must not survive validation.
        trace = _trace(ReasoningDepth.L5, qb_behavior=ChecklistVerdict.CLEAR)
        trace.stub_tracks = ["qb_behavior"]
        result = validate_checklist(trace)
        assert result.verdicts["qb_behavior"] == ChecklistVerdict.DATA_GAP

    def test_no_stubs_no_downgrade(self):
        result = validate_checklist(_trace(ReasoningDepth.L5))
        assert result.stub_downgraded == []


class TestNoBetCodes:
    def test_unchecked_at_l3_fires_missing_required_data(self):
        trace = _trace(ReasoningDepth.L3, trust_signals=ChecklistVerdict.UNCHECKED)
        result = validate_checklist(trace)
        assert "missing_required_data" in result.no_bet_codes

    def test_conflict_fires_model_disagreement(self):
        trace = _trace(ReasoningDepth.L5, scheme_matchup=ChecklistVerdict.CONFLICT)
        result = validate_checklist(trace)
        assert result.valid is True
        assert "model_disagreement" in result.no_bet_codes

    def test_clean_trace_fires_nothing(self):
        result = validate_checklist(_trace(ReasoningDepth.L5))
        assert result.no_bet_codes == []
