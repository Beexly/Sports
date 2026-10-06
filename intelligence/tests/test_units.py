# PROVENANCE: unit tests for the integration module's building blocks.
# Research basis: reasoning-depth-spec.md §4–§7; c09-map.md #19 (quarantine), #13 (resolution).
"""Unit tests: escalation, checklist, breaking conditions, trace store, contracts."""
from __future__ import annotations

import os
import tempfile
import unittest

from integration import (
    AnalysisRequest,
    Exposure,
    ReasoningDepth,
)
from integration.checklist import (
    resolve_conflict,
    validate_checklist,
    worst_plausible_assumption,
)
from integration.escalation import AnalysisContext, compute_depth
from integration.pipeline import weakest_verification
from integration.providers import ProviderRegistry
from integration.trace import FileTraceStore, make_trace_id
from integration.types import (
    BreakingCondition,
    ChecklistVerdict,
    ReasoningTrace,
    Verification,
    VERIFICATION_PRECEDENCE,
)


class TestEscalation(unittest.TestCase):
    def _req(self, **kw):
        base = dict(game={"away": "PIT", "home": "CLE", "week": 4, "season": 2026},
                    question="q", exposure=Exposure.ANALYSIS,
                    requested_depth=ReasoningDepth.L1)
        base.update(kw)
        return AnalysisRequest(**base)

    def test_no_triggers_stays_l1(self):
        req = AnalysisRequest(game={}, question="", exposure=Exposure.NONE,
                              requested_depth=ReasoningDepth.L1)
        depth, log = compute_depth(req, AnalysisContext(), "t")
        self.assertEqual(depth, ReasoningDepth.L1)
        self.assertEqual(log, [])

    def test_never_skips_levels(self):
        req = self._req(exposure=Exposure.CARD)
        depth, log = compute_depth(req, AnalysisContext(has_matchup=True), "t")
        self.assertEqual(depth, ReasoningDepth.L5)
        for i in range(1, len(log)):
            prev_to = log[i - 1].to_depth.value
            cur_from = log[i].from_depth.value
            self.assertEqual(prev_to, cur_from, "levels must chain without skipping")

    def test_market_contradiction_over_5_fires_l4(self):
        req = self._req()
        ctx = AnalysisContext(has_matchup=True, bet_requested=True,
                              market_contradiction_pct=7.5)
        depth, log = compute_depth(req, ctx, "t")
        self.assertGreaterEqual(depth, ReasoningDepth.L4)
        self.assertTrue(any("market_contradiction" in e.trigger for e in log))

    def test_requested_depth_is_floor_not_ceiling(self):
        req = self._req(requested_depth=ReasoningDepth.L4)
        depth, _ = compute_depth(req, AnalysisContext(), "t")
        self.assertEqual(depth, ReasoningDepth.L4)


class TestChecklist(unittest.TestCase):
    def _trace(self, depth, checklist):
        return ReasoningTrace(trace_id="t", game={}, depth=depth, checklist=checklist)

    def test_below_l3_not_enforced(self):
        t = self._trace(ReasoningDepth.L2, {})
        self.assertTrue(validate_checklist(t).valid)

    def test_unchecked_at_l3_invalid_names_track(self):
        t = self._trace(ReasoningDepth.L3, {
            "qb_behavior": ChecklistVerdict.CLEAR,
            "coaching_scheme": ChecklistVerdict.CLEAR,
            "offensive_line": ChecklistVerdict.CLEAR,
            "trust_signals": ChecklistVerdict.CLEAR,
            # scheme_matchup missing -> UNCHECKED
        })
        result = validate_checklist(t)
        self.assertFalse(result.valid)
        self.assertIn("scheme_matchup", result.invalid_reason)

    def test_two_conflicts_force_l5(self):
        t = self._trace(ReasoningDepth.L4, {
            "qb_behavior": ChecklistVerdict.CONFLICT,
            "coaching_scheme": ChecklistVerdict.CLEAR,
            "offensive_line": ChecklistVerdict.CONFLICT,
            "trust_signals": ChecklistVerdict.CLEAR,
            "scheme_matchup": ChecklistVerdict.CLEAR,
        })
        result = validate_checklist(t)
        self.assertTrue(result.valid)
        self.assertTrue(result.escalated_to_l5)

    def test_precedence_order(self):
        self.assertEqual(
            resolve_conflict([Verification.INFERENCE, Verification.CORPUS,
                              Verification.SINGLE_SOURCE]),
            Verification.CORPUS)
        self.assertEqual(
            resolve_conflict([Verification.COMPUTED, Verification.LIVE_VERIFIED]),
            Verification.LIVE_VERIFIED)
        # full order sanity
        ordered = sorted(Verification, key=lambda v: VERIFICATION_PRECEDENCE[v])
        self.assertEqual(ordered[-1], Verification.LIVE_VERIFIED)
        self.assertEqual(ordered[0], Verification.INFERENCE)

    def test_worst_plausible_assumptions_cover_all_tracks(self):
        for track in ("qb_behavior", "coaching_scheme", "offensive_line",
                      "trust_signals", "scheme_matchup"):
            self.assertTrue(worst_plausible_assumption(track))


class TestBreakingCondition(unittest.TestCase):
    def test_operators(self):
        self.assertTrue(BreakingCondition("d", "m", ">=", 0.6, 0.639, Verification.COMPUTED).is_met())
        self.assertTrue(BreakingCondition("d", "m", "<=", 2.3, 2.18, Verification.COMPUTED).is_met())
        self.assertFalse(BreakingCondition("d", "m", ">", 0.6, 0.6, Verification.COMPUTED).is_met())
        self.assertTrue(BreakingCondition("d", "m", "==", 1.0, 1.0, Verification.COMPUTED).is_met())

    def test_none_observed_is_not_met(self):
        bc = BreakingCondition("d", "m", ">=", 0.6, None, Verification.INFERENCE)
        self.assertIsNone(bc.is_met())

    def test_weakest_link(self):
        self.assertEqual(
            weakest_verification(Verification.CORPUS, Verification.COMPUTED, Verification.INFERENCE),
            Verification.INFERENCE)


class TestTraceStore(unittest.TestCase):
    def test_roundtrip_and_content_addressing(self):
        with tempfile.TemporaryDirectory() as d:
            store = FileTraceStore(os.path.join(d, "t.jsonl"))
            t = ReasoningTrace(trace_id="x", game={"a": 1}, depth=ReasoningDepth.L2,
                               levels={"L1": {"claims": []}})
            t.trace_id = make_trace_id(t.game, t.depth, t.levels)
            store.save(t)
            loaded = store.load(t.trace_id)
            self.assertIsNotNone(loaded)
            assert loaded is not None
            self.assertEqual(loaded.trace_id, t.trace_id)
            self.assertEqual(loaded.depth, ReasoningDepth.L2)
            # content-addressed: same content -> same id
            self.assertEqual(make_trace_id(t.game, t.depth, t.levels), t.trace_id)

    def test_load_missing_returns_none(self):
        with tempfile.TemporaryDirectory() as d:
            store = FileTraceStore(os.path.join(d, "t.jsonl"))
            self.assertIsNone(store.load("trace_nope"))


class TestContracts(unittest.TestCase):
    def test_missing_tracks_reported(self):
        reg = ProviderRegistry()
        self.assertEqual(set(reg.missing_tracks()),
                         {"qb_behavior", "coaching_scheme", "trust_signals", "offensive_line"})


if __name__ == "__main__":
    unittest.main()
