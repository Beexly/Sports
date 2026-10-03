"""Offline identity tests for tinkabot_eq_ml_gaussian_pdf. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_gaussian_pdf as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("gaussian_pdf",))
        self.assertTrue(callable(m.gaussian_pdf))

    def test_no_forbidden_copies(self):
        for name in (
            "jaccard_index",
            "dice_coefficient",
            "huber_loss",
            "binary_log_loss",
            "shannon_entropy",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestGaussianPdf(unittest.TestCase):
    def test_standard_normal_at_zero(self):
        # φ(0;0,1) = 1/√(2π)
        want = 1.0 / math.sqrt(2.0 * math.pi)
        self.assertAlmostEqual(m.gaussian_pdf(0.0, 0.0, 1.0), want, places=12)

    def test_stated_form_scaled(self):
        # x=μ → 1/(σ√(2π))
        self.assertAlmostEqual(
            m.gaussian_pdf(2.0, 2.0, 3.0),
            1.0 / (3.0 * math.sqrt(2.0 * math.pi)),
            places=12,
        )

    def test_null_missing(self):
        self.assertIsNone(m.gaussian_pdf(None, 0.0, 1.0))
        self.assertIsNone(m.gaussian_pdf(0.0, None, 1.0))
        self.assertIsNone(m.gaussian_pdf(0.0, 0.0, None))

    def test_null_bad_sigma(self):
        self.assertIsNone(m.gaussian_pdf(0.0, 0.0, 0.0))
        self.assertIsNone(m.gaussian_pdf(0.0, 0.0, -1.0))


if __name__ == "__main__":
    unittest.main()
