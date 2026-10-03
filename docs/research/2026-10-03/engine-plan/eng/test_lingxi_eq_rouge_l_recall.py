"""Kill test for lingxi_eq_rouge_l_recall.

Fails if the ratio is inverted, the match count is subtracted
from 1, or a zero overlap is reported as 1.
"""
from __future__ import annotations

import unittest

import lingxi_eq_rouge_l_recall as m


class TestRougeLRecall(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("rouge_l_recall",))

    def test_printed_ratio_not_the_swap(self) -> None:
        got = m.rouge_l_recall(2.0, 4.0)
        self.assertEqual(got, 0.5)
        self.assertNotEqual(got, 2.0)
        self.assertNotEqual(got, 0.5 * 0.5)

    def test_identical_and_empty_overlap(self) -> None:
        self.assertEqual(m.rouge_l_recall(5.0, 5.0), 1.0)
        self.assertEqual(m.rouge_l_recall(0.0, 5.0), 0.0)
        self.assertNotEqual(m.rouge_l_recall(0.0, 5.0), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.rouge_l_recall(None, 4.0))
        self.assertIsNone(m.rouge_l_recall(2.0, None))
        self.assertIsNone(m.rouge_l_recall(2.0, 0.0))
        self.assertIsNone(m.rouge_l_recall(2.0, -1.0))
        self.assertIsNone(m.rouge_l_recall(-1.0, 4.0))
        self.assertIsNone(m.rouge_l_recall(5.0, 4.0))
        self.assertIsNone(m.rouge_l_recall(float("nan"), 4.0))


if __name__ == "__main__":
    unittest.main()