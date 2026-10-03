"""Offline identity tests for tinkabot_eq_ml_momentum_velocity. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_momentum_velocity as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("momentum_velocity",))
        self.assertTrue(callable(m.momentum_velocity))

    def test_no_forbidden_copies(self):
        for name in (
            "adagrad_step",
            "adagrad_accumulate",
            "adam_step",
            "label_smoothing",
            "dropout_thin",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestMomentumVelocity(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.momentum_velocity(1.0, 0.9, 0.1, 2.0), 0.7)
        self.assertAlmostEqual(m.momentum_velocity(0.0, 0.9, 0.01, 5.0), -0.05)

    def test_null_missing(self):
        self.assertIsNone(m.momentum_velocity(None, 0.9, 0.1, 1.0))
        self.assertIsNone(m.momentum_velocity(1.0, None, 0.1, 1.0))
        self.assertIsNone(m.momentum_velocity(1.0, 0.9, None, 1.0))
        self.assertIsNone(m.momentum_velocity(1.0, 0.9, 0.1, None))

    def test_null_bad(self):
        self.assertIsNone(m.momentum_velocity(1.0, -0.1, 0.1, 1.0))
        self.assertIsNone(m.momentum_velocity(1.0, 1.1, 0.1, 1.0))
        self.assertIsNone(m.momentum_velocity(1.0, 0.9, 0.0, 1.0))
        self.assertIsNone(m.momentum_velocity(float("nan"), 0.9, 0.1, 1.0))
        self.assertIsNone(m.momentum_velocity(True, 0.9, 0.1, 1.0))


if __name__ == "__main__":
    unittest.main()
