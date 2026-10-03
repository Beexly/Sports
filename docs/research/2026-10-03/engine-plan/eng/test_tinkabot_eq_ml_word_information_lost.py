"""Offline identity tests for tinkabot_eq_ml_word_information_lost. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_word_information_lost as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("word_information_lost",))
        self.assertTrue(callable(m.word_information_lost))

    def test_no_forbidden_copies(self):
        for name in (
            "word_error_rate",
            "match_error_rate",
            "gleu_score",
            "rouge_l_f",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestWordInformationLost(unittest.TestCase):
    def test_stated_form(self):
        # H=8,S=1,D=1,I=0 → N1=10,N2=9, WIP=64/90, WIL=1-64/90
        self.assertAlmostEqual(m.word_information_lost(1, 1, 0, 8), 1 - 64 / 90)
        # perfect: H=10,S=D=I=0 → WIP=1, WIL=0
        self.assertAlmostEqual(m.word_information_lost(0, 0, 0, 10), 0.0)
        # no hits: H=0,S=5,D=0,I=0 → WIP=0, WIL=1
        self.assertAlmostEqual(m.word_information_lost(5, 0, 0, 0), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.word_information_lost(None, 0, 0, 1))
        self.assertIsNone(m.word_information_lost(0, None, 0, 1))
        self.assertIsNone(m.word_information_lost(0, 0, None, 1))
        self.assertIsNone(m.word_information_lost(0, 0, 0, None))

    def test_null_bad(self):
        self.assertIsNone(m.word_information_lost(-1, 0, 0, 1))
        self.assertIsNone(m.word_information_lost(0, 0, 0, 0))  # N1=N2=0
        self.assertIsNone(m.word_information_lost(float("nan"), 0, 0, 1))
        self.assertIsNone(m.word_information_lost("1", 0, 0, 1))
        self.assertIsNone(m.word_information_lost(True, 0, 0, 1))


if __name__ == "__main__":
    unittest.main()
