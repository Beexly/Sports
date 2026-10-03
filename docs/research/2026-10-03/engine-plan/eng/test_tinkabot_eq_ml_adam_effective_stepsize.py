"""Offline identity tests for tinkabot_eq_ml_adam_effective_stepsize. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_adam_effective_stepsize as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("adam_effective_stepsize",))
        self.assertTrue(callable(m.adam_effective_stepsize))

    def test_no_forbidden_copies(self):
        for name in (
            "adam_moments",
            "adam_step",
            "adam_bias_corrected_m",
            "adam_bias_corrected_v",
            "adamax_infinity_norm",
            "position_wise_ffn",
            "positional_encoding",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestAdamEffectiveStepsize(unittest.TestCase):
    def test_stated_form(self):
        # α=0.001, β1=0.9, β2=0.999, t=1 → 0.001 * sqrt(0.001) / 0.1
        expected = 0.001 * math.sqrt(1.0 - 0.999) / (1.0 - 0.9)
        self.assertAlmostEqual(
            m.adam_effective_stepsize(0.001, 0.9, 0.999, 1), expected
        )
        # t=2
        expected2 = 0.001 * math.sqrt(1.0 - 0.999**2) / (1.0 - 0.9**2)
        self.assertAlmostEqual(
            m.adam_effective_stepsize(0.001, 0.9, 0.999, 2), expected2
        )

    def test_null_missing(self):
        self.assertIsNone(m.adam_effective_stepsize(None, 0.9, 0.999, 1))
        self.assertIsNone(m.adam_effective_stepsize(0.001, None, 0.999, 1))
        self.assertIsNone(m.adam_effective_stepsize(0.001, 0.9, None, 1))
        self.assertIsNone(m.adam_effective_stepsize(0.001, 0.9, 0.999, None))

    def test_null_bad(self):
        self.assertIsNone(m.adam_effective_stepsize(0.0, 0.9, 0.999, 1))
        self.assertIsNone(m.adam_effective_stepsize(-0.001, 0.9, 0.999, 1))
        self.assertIsNone(m.adam_effective_stepsize(0.001, 1.0, 0.999, 1))
        self.assertIsNone(m.adam_effective_stepsize(0.001, 0.9, 0.999, 0))
        self.assertIsNone(m.adam_effective_stepsize(0.001, 0.9, 0.999, 1.5))
        self.assertIsNone(m.adam_effective_stepsize(float("nan"), 0.9, 0.999, 1))
        self.assertIsNone(m.adam_effective_stepsize(0.001, 0.9, 0.999, True))


if __name__ == "__main__":
    unittest.main()
