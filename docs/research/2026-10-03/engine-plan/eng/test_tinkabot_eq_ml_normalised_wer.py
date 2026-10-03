"""Offline identity tests for tinkabot_eq_ml_normalised_wer. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_normalised_wer as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("normalised_wer",))
        self.assertTrue(callable(m.normalised_wer))

    def test_no_forbidden_copies(self):
        for name in (
            "word_error_rate",
            "match_error_rate",
            "word_information_lost",
            "gleu_score",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestNormalisedWer(unittest.TestCase):
    def test_stated_form(self):
        # S=1,D=1,I=1,H=7 → N1=9,N2=9, (3)/9
        self.assertAlmostEqual(m.normalised_wer(1, 1, 1, 7), 3 / 9)
        # S=5,H=D=I=0 → N1=5,N2=5 → 1.0
        self.assertAlmostEqual(m.normalised_wer(5, 0, 0, 0), 1.0)
        # S=5,I=5,H=D=0 → N1=5,N2=10 → 10/10=1.0 (unlike raw WER=2)
        self.assertAlmostEqual(m.normalised_wer(5, 0, 5, 0), 1.0)
        self.assertAlmostEqual(m.normalised_wer(0, 0, 0, 10), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.normalised_wer(None, 0, 0, 1))
        self.assertIsNone(m.normalised_wer(0, None, 0, 1))
        self.assertIsNone(m.normalised_wer(0, 0, None, 1))
        self.assertIsNone(m.normalised_wer(0, 0, 0, None))

    def test_null_bad(self):
        self.assertIsNone(m.normalised_wer(-1, 0, 0, 1))
        self.assertIsNone(m.normalised_wer(0, 0, 0, 0))
        self.assertIsNone(m.normalised_wer(float("nan"), 0, 0, 1))
        self.assertIsNone(m.normalised_wer("1", 0, 0, 1))
        self.assertIsNone(m.normalised_wer(True, 0, 0, 1))


if __name__ == "__main__":
    unittest.main()
