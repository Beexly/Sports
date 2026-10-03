"""Kill test for lingxi_eq_bertscore_f.

Fails if the harmonic mean is replaced by arithmetic mean, product,
or the inverted ratio (P+R)/(2PR).
"""
from __future__ import annotations

import unittest

import lingxi_eq_bertscore_f as m


class TestBertscoreF(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bertscore_f",))

    def test_harmonic_mean(self) -> None:
        got = m.bertscore_f(0.8, 0.4)
        self.assertAlmostEqual(got, (2.0 * 0.8 * 0.4) / (0.8 + 0.4))
        self.assertNotAlmostEqual(got, (0.8 + 0.4) / 2.0)
        self.assertNotAlmostEqual(got, 0.8 * 0.4)
        self.assertNotAlmostEqual(got, (0.8 + 0.4) / (2.0 * 0.8 * 0.4))

    def test_perfect(self) -> None:
        self.assertEqual(m.bertscore_f(1.0, 1.0), 1.0)

    def test_equal_passthrough(self) -> None:
        self.assertAlmostEqual(m.bertscore_f(0.7, 0.7), 0.7)

    def test_nulls(self) -> None:
        self.assertIsNone(m.bertscore_f(None, 0.5))
        self.assertIsNone(m.bertscore_f(0.5, None))
        self.assertIsNone(m.bertscore_f(0.0, 0.0))
        self.assertIsNone(m.bertscore_f(1.1, 0.5))
        self.assertIsNone(m.bertscore_f(0.5, float("nan")))


if __name__ == "__main__":
    unittest.main()