"""Offline identity tests for tinkabot_eq_ml_match_error_rate. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_match_error_rate as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("match_error_rate",))
        self.assertTrue(callable(m.match_error_rate))

    def test_no_forbidden_copies(self):
        for name in (
            "word_error_rate",
            "gleu_score",
            "smatch_score",
            "pointwise_mutual_info",
            "cohen_kappa",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestMatchErrorRate(unittest.TestCase):
    def test_stated_form(self):
        # S=1,D=1,I=1,H=7 → (3)/(10)=0.3 = 1 - 7/10
        self.assertAlmostEqual(m.match_error_rate(1, 1, 1, 7), 0.3)
        self.assertAlmostEqual(m.match_error_rate(0, 0, 0, 10), 0.0)
        self.assertAlmostEqual(m.match_error_rate(5, 0, 0, 0), 1.0)
        # differs from WER: I counts in denominator
        self.assertAlmostEqual(m.match_error_rate(5, 0, 5, 0), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.match_error_rate(None, 0, 0, 1))
        self.assertIsNone(m.match_error_rate(0, None, 0, 1))
        self.assertIsNone(m.match_error_rate(0, 0, None, 1))
        self.assertIsNone(m.match_error_rate(0, 0, 0, None))

    def test_null_bad(self):
        self.assertIsNone(m.match_error_rate(-1, 0, 0, 1))
        self.assertIsNone(m.match_error_rate(0, 0, 0, 0))
        self.assertIsNone(m.match_error_rate(float("nan"), 0, 0, 1))
        self.assertIsNone(m.match_error_rate("1", 0, 0, 1))
        self.assertIsNone(m.match_error_rate(True, 0, 0, 1))


if __name__ == "__main__":
    unittest.main()
