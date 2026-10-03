# PROVENANCE — gse-intelligence-build / tests / test_real_provider_wiring.py
# Tests the cross-module wiring added in Batches 2–4 against the REAL
# providers (not fixtures): rolling form, familiarity, trust-targets,
# pressure-answer, and scheme-regime staleness flow from providers through
# the integration façade into the DataContext.
"""Tests: real providers -> façade observations (form/fam/trust/scheme)."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "qb-behavior", "src"))

from integration.api import _build_data_context
from integration.providers import ProviderRegistry
from qb_behavior.situational.provider import SituationalQBProvider
from coaching.provider import CoachingEngineProvider


def _reg():
    return ProviderRegistry(qb=SituationalQBProvider(),
                            coaching=CoachingEngineProvider(),
                            trust=None, ol=None)


def _game(week=3, season=2026):
    return {"away": "PIT", "home": "CLE", "week": week, "season": season,
            "qbs": {"PIT": "00-0023459", "CLE": "00-0033537"}}


class TestRealProviderWiring(unittest.TestCase):
    def test_form_observations(self):
        ctx, _, _ = _build_data_context(_game(), _reg())
        # Rodgers: enough trailing dropbacks -> form served.
        k = "form.00-0023459.epa"
        self.assertIn(k, ctx.observations, k)
        self.assertTrue(-1.0 < ctx.observations[k] < 1.0)
        # Watson: only 57 trailing dropbacks (< 100) -> honestly withheld,
        # never zeroed into the context.
        self.assertNotIn("form.00-0033537.epa", ctx.observations)

    def test_form_withheld_has_gap_note(self):
        q = SituationalQBProvider()
        f = q.get_form("00-0033537", 2026, 3)
        self.assertIsNone(f["form_epa"])
        self.assertIn("100", f["gap_note"])

    def test_familiarity_observations(self):
        ctx, _, _ = _build_data_context(_game(), _reg())
        self.assertIn("fam.CLE.starter_share", ctx.observations)
        self.assertIn("fam.PIT.starter_share", ctx.observations)
        # CLE was unstable into 2026-W3 (validator-confirmed).
        self.assertLess(ctx.observations["fam.CLE.starter_share"], 0.5)

    def test_trust_target_observations(self):
        ctx, _, _ = _build_data_context(_game(), _reg())
        self.assertIn("trust.00-0023459.top_target_share", ctx.observations)
        self.assertGreater(
            ctx.observations["trust.00-0023459.top_target_share"], 0.0)

    def test_pressure_answer_observation_when_off_elite_rush(self):
        # BAL 2024-W4: coming off DAL (top-5 rush) -> observation fires.
        game = {"away": "BAL", "home": "KC", "week": 4, "season": 2024,
                "qbs": {}}
        ctx, _, _ = _build_data_context(game, _reg())
        self.assertEqual(ctx.observations.get("scheme.BAL.off_elite_rush"), 1.0)

    def test_coaching_get_adjustment_shape(self):
        p = CoachingEngineProvider()
        a = p.get_adjustment(2024, "BAL", 4)
        self.assertIsNotNone(a)
        self.assertIn("top_decile", a)
        self.assertIsNone(p.get_adjustment(2024, "BAL", 99))

    def test_qb_get_familiarity_and_trust_targets(self):
        q = SituationalQBProvider()
        fam = q.get_familiarity("CLE", 2026, 3, "00-0033537")
        self.assertIsNotNone(fam)
        self.assertIn("backup_flag", fam)
        tt = q.get_trust_targets("00-0023459", 2026, 3)
        self.assertIsNotNone(tt)
        self.assertTrue(tt["shares"])


if __name__ == "__main__":
    unittest.main()
