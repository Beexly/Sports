"""Offline identity tests for tinkabot_eq_ml_rmse. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_rmse as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("root_mean_squared_error",))
        self.assertTrue(callable(m.root_mean_squared_error))

    def test_no_forbidden_copies(self):
        for name in (
            "rbf_kernel",
            "exponential_decay",
            "mean_absolute_error",
            "mean_squared_error",
            "hinge_loss",
            "huber_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestRmse(unittest.TestCase):
    def test_stated_form(self):
        # (1-2)²+(2-2)²+(3-5)² = 1+0+4 = 5; /3; then √.
        self.assertAlmostEqual(
            m.root_mean_squared_error([1.0, 2.0, 3.0], [2.0, 2.0, 5.0]),
            (5.0 / 3.0) ** 0.5,
        )
        self.assertEqual(m.root_mean_squared_error([0.0], [0.0]), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.root_mean_squared_error(None, [1.0]))
        self.assertIsNone(m.root_mean_squared_error([1.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.root_mean_squared_error([], []))
        self.assertIsNone(m.root_mean_squared_error([1.0], [1.0, 2.0]))
        self.assertIsNone(m.root_mean_squared_error(["bad"], [1.0]))


if __name__ == "__main__":
    unittest.main()
