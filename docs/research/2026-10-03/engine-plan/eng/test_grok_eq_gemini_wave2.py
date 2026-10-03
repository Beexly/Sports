"""Fail-closed tests for grok_eq_gemini_wave2. Not a clear. No mint."""
from __future__ import annotations

import math
import unittest

import grok_eq_gemini_wave2 as m


class TestSoftTargets(unittest.TestCase):
    def test_sums_to_one(self):
        q = m.distillation_soft_targets([1.2, 0.8, -0.5], 2.0)
        self.assertIsNotNone(q)
        self.assertAlmostEqual(sum(q), 1.0, places=12)

    def test_zero_temperature(self):
        self.assertIsNone(m.distillation_soft_targets([1.2, 0.8], 0.0))


class TestDDPM(unittest.TestCase):
    def test_zero_and_unit(self):
        self.assertEqual(m.ddpm_simple_squared_error([0.1, -0.2], [0.1, -0.2]), 0.0)
        self.assertEqual(m.ddpm_simple_squared_error([1.0], [0.0]), 1.0)


class TestPlattMurphy(unittest.TestCase):
    def test_center(self):
        self.assertAlmostEqual(m.platt_survey(0.0, 1.0, 0.0), 0.5, places=12)
        self.assertEqual(m.PLATT_PAGE, "UNVERIFIED")

    def test_identity_and_kill(self):
        self.assertAlmostEqual(m.murphy_brier_identity(0.1, 0.2, 0.3), 0.2, places=12)
        self.assertIsNone(m.murphy_brier_identity(-0.1, 0.2, 0.3))


class TestVAEBradleyProspect(unittest.TestCase):
    def test_elbo_kill(self):
        self.assertAlmostEqual(m.vae_elbo(-1.0, 0.2), -1.2, places=12)
        self.assertIsNone(m.vae_elbo(-1.0, 0.2, marginal=-1.5))

    def test_bradley(self):
        self.assertAlmostEqual(m.bradley_terry(1.0, 3.0), 0.25, places=12)
        self.assertAlmostEqual(m.bradley_terry(1.0, 3.0) + m.bradley_terry(3.0, 1.0), 1.0, places=12)
        self.assertIsNone(m.bradley_terry(0.0, 1.0))

    def test_prospect(self):
        self.assertAlmostEqual(m.prospect_value(4.0, 0.5, 0.5, 2.25), 2.0, places=12)
        self.assertAlmostEqual(m.prospect_value(-2.0, 0.5, 1.0, 2.25), -4.5, places=12)
        self.assertIsNone(m.prospect_value(4.0, 1.5, 0.5, 2.25))


if __name__ == "__main__":
    unittest.main()
