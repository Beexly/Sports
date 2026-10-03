"""Kill test for lingxi_eq_rouge_s_skip2_recall.

Fails if C(m,2) is replaced by m, the ratio is inverted, or a
zero overlap is reported as 1.
"""
from __future__ import annotations

import unittest

import lingxi_eq_rouge_s_skip2_recall as m


class TestRougeSSkip2Recall(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("rouge_s_skip2_recall",))

    def test_printed_ratio_not_the_swap(self) -> None:
        # paper example: S1 length 4 => C(4,2)=6; S2 has 3 skip matches => 0.5
        got = m.rouge_s_skip2_recall(3.0, 4.0)
        self.assertEqual(got, 0.5)
        self.assertNotEqual(got, 3.0 / 4.0)
        self.assertNotEqual(got, 4.0 / 3.0)

    def test_identical_and_empty_overlap(self) -> None:
        self.assertEqual(m.rouge_s_skip2_recall(6.0, 4.0), 1.0)
        self.assertEqual(m.rouge_s_skip2_recall(0.0, 4.0), 0.0)
        self.assertNotEqual(m.rouge_s_skip2_recall(0.0, 4.0), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.rouge_s_skip2_recall(None, 4.0))
        self.assertIsNone(m.rouge_s_skip2_recall(2.0, None))
        self.assertIsNone(m.rouge_s_skip2_recall(2.0, 1.0))
        self.assertIsNone(m.rouge_s_skip2_recall(2.0, 0.0))
        self.assertIsNone(m.rouge_s_skip2_recall(-1.0, 4.0))
        self.assertIsNone(m.rouge_s_skip2_recall(7.0, 4.0))
        self.assertIsNone(m.rouge_s_skip2_recall(float("nan"), 4.0))


if __name__ == "__main__":
    unittest.main()