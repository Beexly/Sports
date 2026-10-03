"""Offline identity tests for tinkabot_eq_ml_adam_bias_corrected_v. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_adam_bias_corrected_v as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("adam_bias_corrected_v",))
        self.assertTrue(callable(m.adam_bias_corrected_v))

    def test_no_forbidden_copies(self):
        for name in (
            "adam_bias_corrected_m",
            "adam_moments",
            "adam_step",
            "attention_scale",
            "scaled_dot_product_attention",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestAdamBiasCorrectedV(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.adam_bias_corrected_v(0.01, 0.999, 1), 0.01 / (1 - 0.999))
        self.assertAlmostEqual(m.adam_bias_corrected_v(0.01, 0.999, 2), 0.01 / (1 - 0.999 ** 2))
        self.assertAlmostEqual(m.adam_bias_corrected_v(0.0, 0.999, 5), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.adam_bias_corrected_v(None, 0.999, 1))
        self.assertIsNone(m.adam_bias_corrected_v(0.01, None, 1))
        self.assertIsNone(m.adam_bias_corrected_v(0.01, 0.999, None))

    def test_null_bad(self):
        self.assertIsNone(m.adam_bias_corrected_v(0.01, 1.0, 1))
        self.assertIsNone(m.adam_bias_corrected_v(0.01, -0.1, 1))
        self.assertIsNone(m.adam_bias_corrected_v(0.01, 0.999, 0))
        self.assertIsNone(m.adam_bias_corrected_v(0.01, 0.999, 1.5))
        self.assertIsNone(m.adam_bias_corrected_v(0.01, 0.999, float("nan")))
        self.assertIsNone(m.adam_bias_corrected_v("0.01", 0.999, 1))
        self.assertIsNone(m.adam_bias_corrected_v(True, 0.999, 1))


if __name__ == "__main__":
    unittest.main()
