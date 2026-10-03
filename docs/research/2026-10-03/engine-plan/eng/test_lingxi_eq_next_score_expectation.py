"""Kill test for lingxi_eq_next_score_expectation. One source path. No score."""
from __future__ import annotations

import unittest

import lingxi_eq_next_score_expectation as m


class TestNextScoreExpectation(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("next_score_expectation",))

    def test_printed_sum(self) -> None:
        # Certain FG: P(FG)=1, value=3 -> EP=3
        self.assertEqual(m.next_score_expectation([1.0], [3.0]), 3.0)
        # Two-way: 0.5*7 + 0.5*(-7) = 0
        self.assertEqual(m.next_score_expectation([0.5, 0.5], [7.0, -7.0]), 0.0)
        # Mixture: 0.2*7 + 0.3*3 + 0.5*0 = 2.3
        self.assertAlmostEqual(
            m.next_score_expectation([0.2, 0.3, 0.5], [7.0, 3.0, 0.0]), 2.3
        )

    def test_kill_nulls(self) -> None:
        self.assertIsNone(m.next_score_expectation(None, [1.0]))
        self.assertIsNone(m.next_score_expectation([1.0], None))
        self.assertIsNone(m.next_score_expectation([], []))
        self.assertIsNone(m.next_score_expectation([1.0, 0.0], [7.0]))
        self.assertIsNone(m.next_score_expectation([1.0], [None]))
        self.assertIsNone(m.next_score_expectation(["x"], [3.0]))


if __name__ == "__main__":
    unittest.main()