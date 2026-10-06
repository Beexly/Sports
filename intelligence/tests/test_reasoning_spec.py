# PROVENANCE: implements reasoning-depth-spec.md §8 (mandatory test assertions T1–T7).
# Every assertion is on the trace OBJECT, never on prose (spec §8 preamble).
"""Spec §8 acceptance tests for the unified intelligence API."""
from __future__ import annotations

import os
import tempfile
import unittest

from integration import (
    AnalysisRequest,
    BetLeg,
    Exposure,
    ReasoningDepth,
    analyze,
    correlated_theses,
    validate_checklist,
)
from integration.checklist import ChecklistVerdict
from integration.pipeline import build_causal_chains
from integration.stubs import fixture_game, fixture_league_avgs, fixture_registry
from integration.trace import FileTraceStore, resume_trace
from integration.types import BreakingCondition, Verification

try:  # package-qualified (pytest / unittest tests.test_reasoning_spec)
    from tests.helpers import NOW, card_request, funnel_legs, gap_trust_registry, no_ol_registry
except ImportError:  # top-level (unittest discover -s tests)
    from helpers import NOW, card_request, funnel_legs, gap_trust_registry, no_ol_registry


def _run(req, providers, **kw):
    return analyze(req, providers, league_avgs=fixture_league_avgs(),
                   now_iso=NOW, **kw)


class TestT1FunnelDiesAtL4(unittest.TestCase):
    """T1 (MANDATORY): the Steelers-Browns pressure-funnel stack must die at L4."""

    @classmethod
    def setUpClass(cls):
        cls.trace = _run(card_request(), fixture_registry())

    def test_depth_l5_final(self):
        self.assertEqual(self.trace.depth, ReasoningDepth.L5)
        self.assertEqual(self.trace.label, "FINAL")

    def test_l3_chain_with_breaking_condition(self):
        chains = self.trace.levels["L3"]["chains"]
        self.assertTrue(chains, "expected at least one L3 causal chain")
        links = chains[0]["links"]
        self.assertTrue(any(
            "TTT > 2.6s or quick-game < 0.55" in (lnk.get("breaking_condition") or "")
            for lnk in links),
            "L3 chain must carry the breaking condition 'TTT > 2.6s or quick-game < 0.55'")
        causes = " ".join(lnk.get("cause", "") for lnk in links)
        mechanisms = " ".join(lnk.get("mechanism", "") for lnk in links)
        outcomes = " ".join(lnk.get("outcome", "") for lnk in links)
        self.assertIn("OL", causes)                       # OL injuries...
        self.assertIn("quick game", mechanisms)           # ...Monken compensation...
        self.assertIn("pressure", outcomes)               # ...pressure neutralization

    def test_adversary_marks_breaking_conditions_met(self):
        l4 = self.trace.levels["L4"]
        self.assertTrue(l4["breaking_conditions_met"],
                        "both pre-kickoff thresholds (quick-game, TTT) were satisfied")
        self.assertGreaterEqual(len(l4["evaluated_conditions"]), 2)

    def test_four_legs_one_correlated_thesis(self):
        bundles = self.trace.levels["L4"]["correlated_theses"]
        self.assertEqual(len(bundles), 1)
        b = bundles[0]
        self.assertEqual(b["shared_link"], "pit_pressure_lands")
        self.assertEqual(
            sorted(l["leg_id"] for l in b["legs"]),
            sorted(["watson_under_187.5", "under_38.5", "watt_sacks_o0.5", "both_teams_2fg"]))
        self.assertTrue(b["thesis_broken"])

    def test_recommendation_rejects_stack(self):
        rec = self.trace.levels["L5"]["recommendation"]
        self.assertIn("REJECT", rec)

    def test_checklist_matches_spec_example(self):
        cl = self.trace.checklist
        self.assertEqual(cl["qb_behavior"], ChecklistVerdict.CLEAR)
        self.assertEqual(cl["coaching_scheme"], ChecklistVerdict.CLEAR)
        self.assertEqual(cl["offensive_line"], ChecklistVerdict.CLEAR)
        self.assertEqual(cl["trust_signals"], ChecklistVerdict.CLEAR)
        self.assertEqual(cl["scheme_matchup"], ChecklistVerdict.CONFLICT)


class TestT2ChecklistGate(unittest.TestCase):
    """T2: trust-signal DATA-GAP is recorded (not silent), adversary assumes worst-plausible."""

    @classmethod
    def setUpClass(cls):
        req = AnalysisRequest(game=fixture_game(),
                              question="analyze the game",
                              exposure=Exposure.ANALYSIS,
                              requested_depth=ReasoningDepth.L3)
        cls.trace = _run(req, gap_trust_registry())

    def test_data_gap_recorded_not_unchecked(self):
        self.assertEqual(self.trace.checklist["trust_signals"], ChecklistVerdict.DATA_GAP)

    def test_validate_checklist_passes_with_named_gap(self):
        result = validate_checklist(self.trace)
        self.assertTrue(result.valid)
        self.assertEqual(result.verdicts["trust_signals"], ChecklistVerdict.DATA_GAP)

    def test_adversary_records_worst_plausible_assumption(self):
        gap_assumptions = self.trace.levels["L4"].get("gap_assumptions", {})
        self.assertIn("trust_signals", gap_assumptions)
        self.assertTrue(gap_assumptions["trust_signals"])


class TestT3Escalation(unittest.TestCase):
    """T3: escalation triggers fire and are logged."""

    def test_causal_claim_escalates_l2_to_l3(self):
        req = AnalysisRequest(
            game=fixture_game(),
            question="will Pittsburgh's pressure overwhelm the OL?",
            exposure=Exposure.ANALYSIS,
            requested_depth=ReasoningDepth.L2)
        trace = _run(req, fixture_registry())
        hops = [(e.from_depth.value, e.to_depth.value, e.trigger)
                for e in trace.escalation_log]
        self.assertIn(("L2", "L3", "causal_claim"), hops)

    def test_three_legs_force_l4_to_l5(self):
        legs = funnel_legs()[:3]
        req = AnalysisRequest(game=fixture_game(), question="3-leg card",
                              exposure=Exposure.ANALYSIS,
                              requested_depth=ReasoningDepth.L1, legs=legs)
        trace = _run(req, fixture_registry())
        hops = [(e.from_depth.value, e.to_depth.value) for e in trace.escalation_log]
        self.assertIn(("L4", "L5"), hops)
        self.assertEqual(trace.depth, ReasoningDepth.L5)

    def test_exposure_card_requires_l5(self):
        trace = _run(card_request(), fixture_registry())
        self.assertEqual(trace.depth, ReasoningDepth.L5)


class TestT4CorrelatedTheses(unittest.TestCase):
    """T4: legs sharing a causal link bundle into one ThesisBundle."""

    def test_shared_link_bundles(self):
        legs = (BetLeg("a", "leg a", ("x_link",)),
                BetLeg("b", "leg b", ("x_link",)),
                BetLeg("c", "leg c", ("x_link",)),
                BetLeg("d", "leg d", ("other_link",)))
        conds = {"x_link": [BreakingCondition("x", "m", ">=", 1.0, 2.0, Verification.COMPUTED)]}
        bundles = correlated_theses(legs, conds)
        self.assertEqual(len(bundles), 1)
        b = bundles[0]
        self.assertEqual(b.shared_link, "x_link")
        self.assertEqual(sorted(l.leg_id for l in b.legs), ["a", "b", "c"])
        self.assertTrue(b.thesis_broken)  # 2.0 >= 1.0 met

    def test_unmet_condition_leaves_thesis_alive(self):
        legs = (BetLeg("a", "leg a", ("x_link",)), BetLeg("b", "leg b", ("x_link",)))
        conds = {"x_link": [BreakingCondition("x", "m", ">=", 5.0, 2.0, Verification.COMPUTED)]}
        bundles = correlated_theses(legs, conds)
        self.assertFalse(bundles[0].thesis_broken)

    def test_unevaluable_condition_is_not_met(self):
        # Silence is not evidence: observed=None never counts as met.
        legs = (BetLeg("a", "leg a", ("x_link",)), BetLeg("b", "leg b", ("x_link",)))
        conds = {"x_link": [BreakingCondition("x", "m", ">=", 1.0, None, Verification.INFERENCE)]}
        bundles = correlated_theses(legs, conds)
        self.assertFalse(bundles[0].thesis_broken)


class TestT5VerificationPropagation(unittest.TestCase):
    """T5: INFERENCE load-bearing links are flagged; breaking conditions machine-checkable."""

    def test_weak_link_flagged_at_l4(self):
        trace = _run(card_request(), fixture_registry())
        self.assertTrue(trace.levels["L4"]["weak_link"],
                        "the neutralization projection is INFERENCE — must be flagged")

    def test_breaking_conditions_machine_checkable(self):
        trace = _run(card_request(), fixture_registry())
        for c in trace.levels["L4"]["evaluated_conditions"]:
            self.assertIn(c["operator"], (">=", "<=", ">", "<", "=="))
            self.assertIsInstance(c["threshold"], float)
            # machine-checkable: re-evaluate from the serialized form
            bc = BreakingCondition(c["description"], c["metric"], c["operator"],
                                   c["threshold"], c["observed"],
                                   Verification(c["verification"]))
            self.assertIsInstance(bc.is_met(), bool)

    def test_published_output_carries_weak_link_flag(self):
        # Legs on an unrelated link: thesis unevaluated, but the INFERENCE chain stands.
        legs = (BetLeg("x", "unrelated prop", ("unrelated_link",)),)
        req = AnalysisRequest(game=fixture_game(), question="a single prop",
                              exposure=Exposure.PUBLISHED_PICK,
                              requested_depth=ReasoningDepth.L1, legs=legs)
        trace = _run(req, fixture_registry())
        self.assertEqual(trace.depth, ReasoningDepth.L5)
        rec = trace.levels["L5"]["recommendation"]
        self.assertIn("INFERENCE", rec)


class TestT6Hierarchy(unittest.TestCase):
    """T6: L5 synthesis honors OL -> scheme -> QB, every layer's verdict recorded."""

    def test_layer_order_and_verdicts(self):
        trace = _run(card_request(), fixture_registry())
        layers = trace.levels["L5"]["layer_verdicts"]
        self.assertEqual(list(layers.keys()),
                         ["offensive_line", "coaching_scheme", "qb_behavior"])
        for name, layer in layers.items():
            self.assertIn("verdict", layer, f"{name} must record its verdict")

    def test_missing_ol_layer_invalidates(self):
        req = AnalysisRequest(game=fixture_game(), question="analyze",
                              exposure=Exposure.ANALYSIS,
                              requested_depth=ReasoningDepth.L3)
        trace = _run(req, no_ol_registry())
        self.assertEqual(trace.label, "INVALID")
        result = validate_checklist(trace)
        self.assertFalse(result.valid)
        self.assertIn("offensive_line", result.invalid_reason)


class TestT7Resume(unittest.TestCase):
    """T7: resume merges new signals as a new level; Wednesday's reasoning is never rewritten."""

    def test_resume_trace_direct(self):
        with tempfile.TemporaryDirectory() as d:
            store = FileTraceStore(os.path.join(d, "traces.jsonl"))
            trace = _run(card_request(), fixture_registry(), store=store)
            original_levels = dict(trace.levels)
            merged = resume_trace(store, trace.trace_id, "injury_news_thu",
                                  {"news": "CLE LG downgraded to OUT"},
                                  trigger="thursday_injury_report")
            for k, v in original_levels.items():
                self.assertEqual(merged.levels[k], v, f"original level {k} was rewritten")
            self.assertEqual(merged.levels["injury_news_thu"],
                             {"news": "CLE LG downgraded to OUT"})
            triggers = [e.trigger for e in merged.escalation_log]
            self.assertTrue(any("resume_merge" in t for t in triggers))
            self.assertNotEqual(merged.trace_id, trace.trace_id)

    def test_resume_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            store = FileTraceStore(os.path.join(d, "traces.jsonl"))
            trace = _run(card_request(), fixture_registry(), store=store)
            with self.assertRaises(ValueError):
                resume_trace(store, trace.trace_id, "L5", {"x": 1}, trigger="sneaky")

    def test_analyze_with_resume_trace_id(self):
        with tempfile.TemporaryDirectory() as d:
            store = FileTraceStore(os.path.join(d, "traces.jsonl"))
            trace = _run(card_request(), fixture_registry(), store=store)
            req = AnalysisRequest(game=fixture_game(), question="thursday update",
                                  exposure=Exposure.ANALYSIS,
                                  requested_depth=ReasoningDepth.L2,
                                  resume_trace_id=trace.trace_id)
            merged = _run(req, fixture_registry(), store=store)
            self.assertIn("L5", merged.levels)  # original levels preserved
            update_keys = [k for k in merged.levels if k.startswith("update_")]
            self.assertTrue(update_keys, "new signals must land as a new level entry")


if __name__ == "__main__":
    unittest.main()
