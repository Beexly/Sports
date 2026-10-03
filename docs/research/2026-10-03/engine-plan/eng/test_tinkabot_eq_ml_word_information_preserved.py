"""Offline identity tests for tinkabot_eq_ml_word_information_preserved."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_word_information_preserved as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("word_information_preserved",))
        self.assertTrue(callable(m.word_information_preserved))

    def test_no_forbidden_copies(self):
        for name in (
            "word_information_lost",
            "word_error_rate",
            "match_error_rate",
            "normalised_wer",
            "adam_bias_corrected_m",
            "adam_bias_corrected_v",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestWordInformationPreserved(unittest.TestCase):
    def test_stated_form(self):
        # H=8,S=1,D=1,I=0 → N1=10,N2=9, WIP=64/90
        self.assertAlmostEqual(m.word_information_preserved(1, 1, 0, 8), 64 / 90)
        self.assertAlmostEqual(m.word_information_preserved(0, 0, 0, 10), 1.0)
        self.assertAlmostEqual(m.word_information_preserved(5, 0, 0, 0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.word_information_preserved(None, 0, 0, 1))
        self.assertIsNone(m.word_information_preserved(0, None, 0, 1))
        self.assertIsNone(m.word_information_preserved(0, 0, None, 1))
        self.assertIsNone(m.word_information_preserved(0, 0, 0, None))

    def test_null_bad(self):
        self.assertIsNone(m.word_information_preserved(-1, 0, 0, 1))
        self.assertIsNone(m.word_information_preserved(0, 0, 0, 0))
        self.assertIsNone(m.word_information_preserved(float("nan"), 0, 0, 1))
        self.assertIsNone(m.word_information_preserved("1", 0, 0, 1))
        self.assertIsNone(m.word_information_preserved(True, 0, 0, 1))


if __name__ == "__main__":
    unittest.main()
