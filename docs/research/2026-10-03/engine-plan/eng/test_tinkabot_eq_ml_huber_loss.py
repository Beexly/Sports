"""Offline identity tests for tinkabot_eq_ml_huber_loss. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_huber_loss as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("huber_loss",))
        self.assertTrue(callable(m.huber_loss))

    def test_no_forbidden_copies(self):
        for name in (
            "binary_log_loss",
            "shannon_entropy",
            "nosofsky_similarity",
            "difference_of_supplied_l",
            "brier_skill",
            "temperature_scale",
            "epa_success",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestHuber(unittest.TestCase):
    def test_quadratic_region(self):
        # |a| <= delta → 0.5 a^2
        self.assertEqual(m.huber_loss(0.0, 1.0), 0.0)
        self.assertEqual(m.huber_loss(1.0, 1.0), 0.5)
        self.assertEqual(m.huber_loss(-0.5, 1.0), 0.125)

    def test_linear_region(self):
        # |a| > delta → delta*(|a| - 0.5*delta); a=3, delta=1 → 1*(3-0.5)=2.5
        self.assertEqual(m.huber_loss(3.0, 1.0), 2.5)
        self.assertEqual(m.huber_loss(-3.0, 1.0), 2.5)

    def test_null_missing(self):
        self.assertIsNone(m.huber_loss(None, 1.0))
        self.assertIsNone(m.huber_loss(1.0, None))

    def test_null_bad_delta(self):
        self.assertIsNone(m.huber_loss(1.0, 0.0))
        self.assertIsNone(m.huber_loss(1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
