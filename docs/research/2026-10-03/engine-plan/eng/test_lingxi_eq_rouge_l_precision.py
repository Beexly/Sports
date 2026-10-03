"""Kill test for lingxi_eq_rouge_l_precision.

Fails if precision is replaced by recall-style division by a
different length, by LCS alone, or by 1 - LCS/n.
"""
from __future__ import annotations

import unittest

import lingxi_eq_rouge_l_precision as m


class TestRougeLPrecision(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS), ("rouge_l_precision",)
        )

    def test_printed_ratio(self) -> None:
        got = m.rouge_l_precision(3.0, 4.0)
        self.assertAlmostEqual(got, 0.75)
        self.assertNotAlmostEqual(got, 3.0)
        self.assertNotAlmostEqual(got, 1.0 - 3.0 / 4.0)
        self.assertNotAlmostEqual(got, 3.0 / 5.0)  # wrong denominator

    def test_perfect(self) -> None:
        self.assertEqual(m.rouge_l_precision(5.0, 5.0), 1.0)

    def test_zero_match(self) -> None:
        self.assertEqual(m.rouge_l_precision(0.0, 8.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.rouge_l_precision(None, 4.0))
        self.assertIsNone(m.rouge_l_precision(3.0, None))
        self.assertIsNone(m.rouge_l_precision(3.0, 0.0))
        self.assertIsNone(m.rouge_l_precision(5.0, 4.0))
        self.assertIsNone(m.rouge_l_precision(2.0, float("nan")))


if __name__ == "__main__":
    unittest.main()
