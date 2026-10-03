"""Offline identity tests for tinkabot_eq_ml_softplus. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_softplus as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("softplus",))
        self.assertTrue(callable(m.softplus))

    def test_no_forbidden_copies(self):
        for name in (
            "gaussian_pdf",
            "jaccard_index",
            "dice_coefficient",
            "huber_loss",
            "binary_log_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSoftplus(unittest.TestCase):
    def test_at_zero(self):
        self.assertAlmostEqual(m.softplus(0.0), math.log(2.0), places=12)

    def test_stated_form_small(self):
        self.assertAlmostEqual(m.softplus(1.0), math.log(1.0 + math.exp(1.0)), places=12)
        self.assertAlmostEqual(m.softplus(-1.0), math.log(1.0 + math.exp(-1.0)), places=12)

    def test_large_positive_stable(self):
        # softplus(x) → x for large x
        self.assertAlmostEqual(m.softplus(40.0), 40.0 + math.log1p(math.exp(-40.0)), places=12)

    def test_null_missing(self):
        self.assertIsNone(m.softplus(None))


if __name__ == "__main__":
    unittest.main()
