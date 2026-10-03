"""Offline identity tests for tinkabot_eq_ml_word_error_rate. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_word_error_rate as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("word_error_rate",))
        self.assertTrue(callable(m.word_error_rate))

    def test_no_forbidden_copies(self):
        for name in (
            "gleu_score",
            "smatch_score",
            "bertscore_f",
            "translation_edit_rate",
            "bleu_score",
            "expected_calibration_error",
            "cohen_kappa",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestWordErrorRate(unittest.TestCase):
    def test_stated_form(self):
        # S=1,D=1,I=1,H=7 → (1+1+1)/(7+1+1)=3/9
        self.assertAlmostEqual(m.word_error_rate(1, 1, 1, 7), 3 / 9)
        # all hits
        self.assertAlmostEqual(m.word_error_rate(0, 0, 0, 10), 0.0)
        # paper example S=N1, H=D=I=0 → 100%
        self.assertAlmostEqual(m.word_error_rate(5, 0, 0, 0), 1.0)
        # S=N1, I=N1 → 200%
        self.assertAlmostEqual(m.word_error_rate(5, 0, 5, 0), 2.0)

    def test_null_missing(self):
        self.assertIsNone(m.word_error_rate(None, 0, 0, 1))
        self.assertIsNone(m.word_error_rate(0, None, 0, 1))
        self.assertIsNone(m.word_error_rate(0, 0, None, 1))
        self.assertIsNone(m.word_error_rate(0, 0, 0, None))

    def test_null_bad(self):
        self.assertIsNone(m.word_error_rate(-1, 0, 0, 1))
        self.assertIsNone(m.word_error_rate(0, 0, 0, 0))  # zero N1
        self.assertIsNone(m.word_error_rate(float("nan"), 0, 0, 1))
        self.assertIsNone(m.word_error_rate("1", 0, 0, 1))
        self.assertIsNone(m.word_error_rate(True, 0, 0, 1))


if __name__ == "__main__":
    unittest.main()
