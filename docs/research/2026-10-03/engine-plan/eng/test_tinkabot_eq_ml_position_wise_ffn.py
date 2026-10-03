"""Offline identity tests for tinkabot_eq_ml_position_wise_ffn. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_position_wise_ffn as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("position_wise_ffn",))
        self.assertTrue(callable(m.position_wise_ffn))

    def test_no_forbidden_copies(self):
        for name in (
            "positional_encoding",
            "attention_scale",
            "adamax_infinity_norm",
            "adam_bias_corrected_m",
            "word_information_preserved",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestPositionWiseFfn(unittest.TestCase):
    def test_stated_form(self):
        # x=2,w1=3,b1=1 → hidden=7 → max=7; *w2=0.5 +b2=1 → 4.5
        self.assertAlmostEqual(m.position_wise_ffn(2, 3, 1, 0.5, 1), 4.5)
        # ReLU zero: hidden negative
        self.assertAlmostEqual(m.position_wise_ffn(-1, 1, 0, 2, 3), 3.0)
        self.assertAlmostEqual(m.position_wise_ffn(0, 1, 0, 1, 0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.position_wise_ffn(None, 1, 0, 1, 0))
        self.assertIsNone(m.position_wise_ffn(1, None, 0, 1, 0))
        self.assertIsNone(m.position_wise_ffn(1, 1, None, 1, 0))
        self.assertIsNone(m.position_wise_ffn(1, 1, 0, None, 0))
        self.assertIsNone(m.position_wise_ffn(1, 1, 0, 1, None))

    def test_null_bad(self):
        self.assertIsNone(m.position_wise_ffn(float("nan"), 1, 0, 1, 0))
        self.assertIsNone(m.position_wise_ffn(1, float("inf"), 0, 1, 0))
        self.assertIsNone(m.position_wise_ffn("1", 1, 0, 1, 0))
        self.assertIsNone(m.position_wise_ffn(True, 1, 0, 1, 0))


if __name__ == "__main__":
    unittest.main()
