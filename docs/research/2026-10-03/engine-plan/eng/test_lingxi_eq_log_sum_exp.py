"""Kill test for lingxi_eq_log_sum_exp. Fails if the log or the sum is dropped."""
from __future__ import annotations

import math
import unittest

import lingxi_eq_log_sum_exp as m


class TestLogSumExp(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("log_sum_exp",))

    def test_two_zeros_is_log_two_not_the_sum(self) -> None:
        got = m.log_sum_exp([0.0, 0.0])
        self.assertAlmostEqual(got, math.log(2.0))
        self.assertNotAlmostEqual(got, 2.0)
        self.assertNotAlmostEqual(got, 1.0)

    def test_not_the_max(self) -> None:
        got = m.log_sum_exp([0.0, 1.0])
        self.assertAlmostEqual(got, math.log(1.0 + math.e))
        self.assertNotAlmostEqual(got, 1.0)

    def test_singleton(self) -> None:
        self.assertAlmostEqual(m.log_sum_exp([3.0]), 3.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.log_sum_exp(None))
        self.assertIsNone(m.log_sum_exp([]))
        self.assertIsNone(m.log_sum_exp([1.0, None]))
        self.assertIsNone(m.log_sum_exp([float("nan")]))


if __name__ == "__main__":
    unittest.main()