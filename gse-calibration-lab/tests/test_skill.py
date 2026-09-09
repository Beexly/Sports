"""The skill floor gap: a zero-skill forecaster must be shown to pass the gate."""

from __future__ import annotations

import unittest

from gsecal.gate import DEFAULT_FLOORS, LiveMetrics, MurphyTerms, evaluate_eligibility
from gsecal.skill import assess_skill, no_skill_baseline


class TestNoSkillBaseline(unittest.TestCase):
    def test_constant_forecast_is_perfectly_calibrated(self) -> None:
        b = no_skill_baseline(0.694, 458)
        self.assertLess(b.ece, 0.001)
        self.assertLess(b.reliability, 0.001)
        self.assertAlmostEqual(b.resolution, 0.0, delta=1e-9)

    def test_zero_skill_passes_every_floor_on_recorded_conditions(self) -> None:
        """The finding: all four floors fall to the same trivial forecaster."""
        b = no_skill_baseline(0.694, 458)
        self.assertTrue(b.passes_n_floor)
        self.assertTrue(b.passes_ece_floor)
        self.assertTrue(b.passes_brier_floor)
        self.assertTrue(b.passes_reliability_floor)
        self.assertTrue(b.passes_every_floor)

    def test_the_gate_itself_reads_green_on_zero_skill(self) -> None:
        """End-to-end through the production gate mirror, not just the floors."""
        b = no_skill_baseline(0.694, 458)
        report = evaluate_eligibility(
            metrics=LiveMetrics(
                n=b.n, brier=b.brier, ece=b.ece, mce=None,
                murphy=MurphyTerms(b.reliability, b.resolution, b.uncertainty),
            ),
            canonical_settled=b.n,
            min_settled_for_learning=100,
            settlement_healthy=True,
            consecutive_green_prior=2,
            streak_required=3,
        )
        self.assertEqual(report.status, "GREEN")
        self.assertEqual(list(report.reasons), [])

    def test_brier_equals_uncertainty_for_a_constant_forecast(self) -> None:
        """Sanity: the no-skill Brier IS the irreducible uncertainty term."""
        b = no_skill_baseline(0.694, 458)
        self.assertAlmostEqual(b.brier, b.uncertainty, delta=0.001)

    def test_extreme_base_rate_is_caught_by_the_brier_floor(self) -> None:
        """The floors DO discriminate when uncertainty is high (base rate ~0.5)."""
        b = no_skill_baseline(0.5, 458)
        self.assertFalse(b.passes_brier_floor)
        self.assertFalse(b.passes_every_floor)

    def test_rejects_invalid_inputs(self) -> None:
        for bad in (-0.1, 1.1):
            with self.assertRaises(ValueError):
                no_skill_baseline(bad, 100)
        with self.assertRaises(ValueError):
            no_skill_baseline(0.5, 0)


class TestSkillAssessment(unittest.TestCase):
    def test_zero_resolution_is_no_demonstrated_skill(self) -> None:
        v = assess_skill(model_resolution=0.0, model_brier=0.2122, base_rate=0.694, n=458)
        self.assertIn("NO DEMONSTRATED SKILL", v.verdict())

    def test_immaterial_resolution_is_no_demonstrated_skill(self) -> None:
        """A RES below the repo's own 0.01 "material" bar is not skill.

        NOTE ON PROVENANCE: the deployed model's actual RES is NOT recorded in
        AGENTS.md — only Murphy RELIABILITY 0.0053 is, which is a different term
        pulling the opposite way (lower is better for REL, higher for RES). The
        0.004 below is an ILLUSTRATIVE value chosen to exercise the branch, not a
        measured figure for any model. Do not read it as one.
        """
        v = assess_skill(model_resolution=0.004, model_brier=0.1926, base_rate=0.694, n=458)
        self.assertFalse(v.has_material_resolution)
        self.assertIn("NO DEMONSTRATED SKILL", v.verdict())

    def test_material_resolution_beating_baseline_has_skill(self) -> None:
        v = assess_skill(model_resolution=0.05, model_brier=0.16, base_rate=0.694, n=458)
        self.assertTrue(v.has_material_resolution)
        self.assertIn("HAS SKILL", v.verdict())

    def test_floors_that_discriminate_are_reported_as_such(self) -> None:
        v = assess_skill(model_resolution=0.0, model_brier=0.24, base_rate=0.5, n=458)
        self.assertIn("floors do", v.verdict())


if __name__ == "__main__":
    unittest.main()
