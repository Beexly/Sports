# PROVENANCE — gse-intelligence-build / tests / test_p1_gap_honesty.py
# Adversarial-audit P1 regression suite. Pins the three silent-degradation
# contracts in integration/api.py::_build_data_context:
#   1. target_hhi is withheld, never zero-filled (was: None -> 0.0)
#   2. a DataGapError from any qb_behavior sub-provider writes gap evidence
#      (was: three bare `except DataGapError: pass`)
#   3. qb_behavior never reads CLEAR when nothing was checked (empty qbs map)
# These are the fixes; a regression that reintroduces a quiet zero or a quiet
# CLEAR must fail here, not in production.
"""Tests: P1 gap-honesty contracts in the integration façade."""
from __future__ import annotations

import os
import sys
import unittest
from dataclasses import dataclass
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "qb-behavior", "src"))

from integration.api import _build_data_context
from integration.providers import DataGapError, ProviderRegistry
from integration.types import Verification


# --- minimal fakes: we are testing the façade's bookkeeping, not the data ---

@dataclass
class _Profile:
    name: str = "Test QB"
    epa_per_dropback: float = 0.01
    pressure_to_sack_rate: float = 0.20
    target_hhi: Optional[float] = None
    verification: Verification = Verification.LIVE_VERIFIED


class FakeQB:
    """Provider whose sub-providers are individually switchable.

    Every sub-provider either returns a value, returns None (withheld), or
    raises DataGapError (failed) depending on the flags.
    """

    def __init__(self, *, hhi: Optional[float] = None,
                 form_epa: Optional[float] = None, gap_note: Optional[str] = None,
                 form_raises: bool = False, splits_raises: bool = False):
        self.hhi = hhi
        self.form_epa = form_epa
        self.gap_note = gap_note
        self.form_raises = form_raises
        self.splits_raises = splits_raises

    def get_qb_profile(self, qb_id, week, season):
        return _Profile(name=f"QB {qb_id}")

    def get_pressure_splits(self, qb_id, week, season):
        if self.splits_raises:
            raise DataGapError("qb_behavior", "no pressure splits for this week")
        return type("S", (), {"int_rate_clean": 0.02,
                              "int_rate_pressure": 0.08,
                              "verification": Verification.LIVE_VERIFIED})()

    def get_form(self, qb_id, season, week):
        if self.form_raises:
            raise DataGapError("qb_behavior", "form store unavailable")
        if self.form_epa is None:
            return {"qb_id": qb_id, "form_epa": None, "n_games": 2,
                    "availability": 0.5, "gap_note": self.gap_note}
        return {"qb_id": qb_id, "form_epa": self.form_epa, "n_games": 16,
                "availability": 0.95, "gap_note": None}

    def get_trust_targets(self, qb_id, season, week):
        return {"qb_id": qb_id, "hhi": self.hhi, "gap_note": "below MIN_TARGETS",
                "shares": [{"receiver_id": "r1", "receiver_name": "Rec One",
                            "targets": 30, "share": 0.25}]}


def _reg(qb) -> ProviderRegistry:
    return ProviderRegistry(qb=qb, coaching=None, trust=None, ol=None)


def _game(qbs: Optional[dict] = None) -> dict[str, Any]:
    g = {"away": "PIT", "home": "CLE", "week": 3, "season": 2026}
    g["qbs"] = {"PIT": "qb-pit"} if qbs is None else qbs
    return g


def _evidence_text(ctx) -> str:
    """Flatten qb_behavior evidence into one searchable string."""
    return " | ".join(t for t, _ in ctx.track_evidence.get("qb_behavior", []))


class TestTargetHHINeverZeroFilled(unittest.TestCase):
    """P1 #2: missing HHI must OMIT the observation, never record 0.0."""

    def test_withheld_hhi_is_omitted_not_zeroed(self):
        ctx, _, _ = _build_data_context(
            _game(), _reg(FakeQB(hhi=None)))
        key = "trust.qb-pit.target_hhi"
        self.assertNotIn(key, ctx.observations,
                         "withheld HHI must be absent, not 0.0")
        # And it must never appear as a falsy zero.
        self.assertNotEqual(ctx.observations.get(key), 0.0)

    def test_present_hhi_is_recorded(self):
        ctx, _, _ = _build_data_context(
            _game(), _reg(FakeQB(hhi=0.1403)))
        self.assertAlmostEqual(
            ctx.observations["trust.qb-pit.target_hhi"], 0.1403, places=4)

    def test_withheld_hhi_writes_gap_evidence(self):
        ctx, _, _ = _build_data_context(
            _game(), _reg(FakeQB(hhi=None)))
        text = _evidence_text(ctx)
        self.assertIn("DATA-GAP", text)
        self.assertIn("HHI withheld", text)


class TestSwallowedDataGapErrors(unittest.TestCase):
    """P1 #3: a failed sub-provider must leave evidence, never vanish."""

    def test_form_exception_is_not_swallowed(self):
        ctx, _, _ = _build_data_context(
            _game(), _reg(FakeQB(form_raises=True)))
        text = _evidence_text(ctx)
        self.assertIn("rolling form", text)
        self.assertIn("form store unavailable", text)

    def test_pressure_split_exception_is_not_swallowed(self):
        ctx, _, _ = _build_data_context(
            _game(), _reg(FakeQB(splits_raises=True)))
        self.assertIn("pressure splits", _evidence_text(ctx))

    def test_withheld_form_gap_note_reaches_l4(self):
        # The P1 headline: a withheld form gate must surface its reason.
        ctx, _, _ = _build_data_context(
            _game(), _reg(FakeQB(form_epa=None, gap_note="100-dropback gate")))
        text = _evidence_text(ctx)
        self.assertIn("rolling form withheld", text)
        self.assertIn("100-dropback gate", text)
        # And the observation stays absent — withheld, never zeroed.
        self.assertNotIn("form.qb-pit.epa", ctx.observations)


class TestClearRequiresEvidence(unittest.TestCase):
    """P1 #4: withheld/missing evidence must never read CLEAR."""

    def test_empty_qbs_map_is_not_CLEAR(self):
        ctx, _, _ = _build_data_context(
            _game(qbs={}), _reg(FakeQB(hhi=0.14, form_epa=0.02)))
        self.assertEqual(ctx.checklist_hints["qb_behavior"], "UNCHECKED")
        self.assertIn("never checked", _evidence_text(ctx))

    def test_all_subproviders_failed_is_DATA_GAP(self):
        ctx, _, _ = _build_data_context(
            _game(), _reg(FakeQB(hhi=None, form_epa=None,
                                 form_raises=True, splits_raises=True)))
        self.assertEqual(ctx.checklist_hints["qb_behavior"], "DATA-GAP")

    def test_fully_served_track_is_CLEAR(self):
        # Negative control: the fixes must not make CLEAR unreachable.
        ctx, _, _ = _build_data_context(
            _game(), _reg(FakeQB(hhi=0.14, form_epa=0.02)))
        self.assertEqual(ctx.checklist_hints["qb_behavior"], "CLEAR")

    def test_gap_flags_do_not_leak_across_qbs(self):
        # One QB fully gapped, one QB clean -> the track is still served.
        game = {"away": "PIT", "home": "CLE", "week": 3, "season": 2026,
                "qbs": {"PIT": "qb-pit", "CLE": "qb-cle"}}
        ctx, _, _ = _build_data_context(
            game, _reg(FakeQB(hhi=0.14, form_epa=0.02)))
        self.assertEqual(ctx.checklist_hints["qb_behavior"], "CLEAR")


if __name__ == "__main__":
    unittest.main()
