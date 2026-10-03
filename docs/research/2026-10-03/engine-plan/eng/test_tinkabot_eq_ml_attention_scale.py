"""Offline identity tests for tinkabot_eq_ml_attention_scale. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_attention_scale as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("attention_scale",))
        self.assertTrue(callable(m.attention_scale))

    def test_no_forbidden_copies(self):
        for name in (
            "word_error_rate",
            "match_error_rate",
            "word_information_lost",
            "normalised_wer",
            "gleu_score",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestAttentionScale(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.attention_scale(64), 1 / math.sqrt(64))
        self.assertAlmostEqual(m.attention_scale(1), 1.0)
        self.assertAlmostEqual(m.attention_scale(100), 0.1)

    def test_null_missing(self):
        self.assertIsNone(m.attention_scale(None))

    def test_null_bad(self):
        self.assertIsNone(m.attention_scale(0))
        self.assertIsNone(m.attention_scale(-4))
        self.assertIsNone(m.attention_scale(float("nan")))
        self.assertIsNone(m.attention_scale(float("inf")))
        self.assertIsNone(m.attention_scale("64"))
        self.assertIsNone(m.attention_scale(True))


if __name__ == "__main__":
    unittest.main()
