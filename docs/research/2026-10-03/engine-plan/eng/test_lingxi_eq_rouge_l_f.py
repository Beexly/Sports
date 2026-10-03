"""Kill test for lingxi_eq_rouge_l_f.

Fails if the F-measure is replaced by arithmetic mean, product,
min(R,P), or the inverted ratio.
"""
from __future__ import annotations

import unittest

import lingxi_eq_rouge_l_f as m


class TestRougeLF(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("rouge_l_f",))

    def test_beta_one_harmonic(self) -> None:
        got = m.rouge_l_f(0.8, 0.4, 1.0)
        self.assertAlmostEqual(got, (2.0 * 0.8 * 0.4) / (0.8 + 0.4))
        self.assertNotAlmostEqual(got, (0.8 + 0.4) / 2.0)
        self.assertNotAlmostEqual(got, 0.8 * 0.4)
        self.assertNotAlmostEqual(got, min(0.8, 0.4))
        self.assertNotAlmostEqual(got, (0.8 + 0.4) / (2.0 * 0.8 * 0.4))

    def test_beta_weight(self) -> None:
        # β=2 -> (1+4)RP / (R+4P) = 5RP/(R+4P)
        got = m.rouge_l_f(0.5, 0.5, 2.0)
        self.assertAlmostEqual(got, (5.0 * 0.5 * 0.5) / (0.5 + 4.0 * 0.5))

    def test_perfect(self) -> None:
        self.assertEqual(m.rouge_l_f(1.0, 1.0, 1.0), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.rouge_l_f(None, 0.5, 1.0))
        self.assertIsNone(m.rouge_l_f(0.5, None, 1.0))
        self.assertIsNone(m.rouge_l_f(0.5, 0.5, None))
        self.assertIsNone(m.rouge_l_f(0.0, 0.0, 1.0))
        self.assertIsNone(m.rouge_l_f(1.1, 0.5, 1.0))
        self.assertIsNone(m.rouge_l_f(0.5, 0.5, -1.0))
        self.assertIsNone(m.rouge_l_f(0.5, float("nan"), 1.0))


if __name__ == "__main__":
    unittest.main()
