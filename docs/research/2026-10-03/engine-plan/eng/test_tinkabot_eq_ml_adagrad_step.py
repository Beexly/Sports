"""Offline identity tests for tinkabot_eq_ml_adagrad_step. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_adagrad_step as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("adagrad_step",))
        self.assertTrue(callable(m.adagrad_step))

    def test_no_forbidden_copies(self):
        for name in (
            "adam_step",
            "adam_moments",
            "adam_effective_stepsize",
            "label_smoothing",
            "dropout_thin",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestAdagradStep(unittest.TestCase):
    def test_stated_form(self):
        # x=1, η=0.1, g=2, G=4 → 1 - 0.1*2/2 = 0.9
        self.assertAlmostEqual(m.adagrad_step(1.0, 0.1, 2.0, 4.0), 0.9)
        expected = 5.0 - 1.0 * 3.0 / math.sqrt(9.0)
        self.assertAlmostEqual(m.adagrad_step(5.0, 1.0, 3.0, 9.0), expected)

    def test_null_missing(self):
        self.assertIsNone(m.adagrad_step(None, 0.1, 1.0, 1.0))
        self.assertIsNone(m.adagrad_step(1.0, None, 1.0, 1.0))
        self.assertIsNone(m.adagrad_step(1.0, 0.1, None, 1.0))
        self.assertIsNone(m.adagrad_step(1.0, 0.1, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.adagrad_step(1.0, 0.0, 1.0, 1.0))
        self.assertIsNone(m.adagrad_step(1.0, -0.1, 1.0, 1.0))
        self.assertIsNone(m.adagrad_step(1.0, 0.1, 1.0, 0.0))
        self.assertIsNone(m.adagrad_step(1.0, 0.1, 1.0, -1.0))
        self.assertIsNone(m.adagrad_step(float("nan"), 0.1, 1.0, 1.0))
        self.assertIsNone(m.adagrad_step(True, 0.1, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()
