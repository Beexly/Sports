"""Offline identity tests for tinkabot_eq_ml_adam_bias_corrected_m. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_adam_bias_corrected_m as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("adam_bias_corrected_m",))
        self.assertTrue(callable(m.adam_bias_corrected_m))

    def test_no_forbidden_copies(self):
        for name in (
            "adam_moments",
            "adam_step",
            "attention_scale",
            "word_error_rate",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestAdamBiasCorrectedM(unittest.TestCase):
    def test_stated_form(self):
        # m=0.1, beta1=0.9, t=1 → 0.1/(1-0.9)=1.0
        self.assertAlmostEqual(m.adam_bias_corrected_m(0.1, 0.9, 1), 1.0)
        # t=2 → 0.1/(1-0.81)=0.1/0.19
        self.assertAlmostEqual(m.adam_bias_corrected_m(0.1, 0.9, 2), 0.1 / 0.19)
        self.assertAlmostEqual(m.adam_bias_corrected_m(0.0, 0.9, 5), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.adam_bias_corrected_m(None, 0.9, 1))
        self.assertIsNone(m.adam_bias_corrected_m(0.1, None, 1))
        self.assertIsNone(m.adam_bias_corrected_m(0.1, 0.9, None))

    def test_null_bad(self):
        self.assertIsNone(m.adam_bias_corrected_m(0.1, 1.0, 1))  # beta1 not < 1
        self.assertIsNone(m.adam_bias_corrected_m(0.1, -0.1, 1))
        self.assertIsNone(m.adam_bias_corrected_m(0.1, 0.9, 0))
        self.assertIsNone(m.adam_bias_corrected_m(0.1, 0.9, 1.5))
        self.assertIsNone(m.adam_bias_corrected_m(0.1, 0.9, float("nan")))
        self.assertIsNone(m.adam_bias_corrected_m("0.1", 0.9, 1))
        self.assertIsNone(m.adam_bias_corrected_m(True, 0.9, 1))


if __name__ == "__main__":
    unittest.main()
