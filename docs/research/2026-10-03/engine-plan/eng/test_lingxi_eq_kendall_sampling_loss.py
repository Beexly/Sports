"""Kill test for lingxi_eq_kendall_sampling_loss.

Fails if only adjacent pairs are counted, the indicators are flipped to
discordant pairs, or the sampling cost c*T is dropped.
"""
from __future__ import annotations

import unittest

import lingxi_eq_kendall_sampling_loss as m


class TestKendallSamplingLoss(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("kendall_sampling_loss",))

    def test_three_pairs_not_adjacent_only(self) -> None:
        # All three pairs agree. Adjacent-only would return 2. Discordant would return 0.
        got = m.kendall_sampling_loss([3.0, 2.0, 1.0], [3.0, 2.0, 1.0], 1.0, 0.0)
        self.assertEqual(got, 3.0)
        self.assertNotEqual(got, 2.0)
        self.assertNotEqual(got, 0.0)

    def test_cost_and_printed_direction(self) -> None:
        # One concordant pair plus c*T = 0.5*2.
        agree = m.kendall_sampling_loss([2.0, 1.0], [5.0, 4.0], 0.5, 2.0)
        self.assertEqual(agree, 2.0)
        disagree = m.kendall_sampling_loss([2.0, 1.0], [4.0, 5.0], 0.5, 2.0)
        self.assertEqual(disagree, 1.0)
        self.assertNotEqual(agree, 1.0)
        self.assertNotEqual(disagree, 2.0)

    def test_tie_adds_nothing(self) -> None:
        self.assertEqual(m.kendall_sampling_loss([1.0, 1.0], [2.0, 3.0], 1.0, 0.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.kendall_sampling_loss(None, [1.0, 0.0], 1.0, 0.0))
        self.assertIsNone(m.kendall_sampling_loss([1.0, 0.0], None, 1.0, 0.0))
        self.assertIsNone(m.kendall_sampling_loss([1.0, 0.0], [1.0, 0.0], None, 0.0))
        self.assertIsNone(m.kendall_sampling_loss([1.0, 0.0], [1.0, 0.0], 1.0, None))
        self.assertIsNone(m.kendall_sampling_loss([1.0, 0.0], [1.0, 0.0], 0.0, 1.0))
        self.assertIsNone(m.kendall_sampling_loss([1.0, 0.0], [1.0, 0.0], -1.0, 1.0))
        self.assertIsNone(m.kendall_sampling_loss([1.0, 0.0], [1.0, 0.0], 1.0, -1.0))
        self.assertIsNone(m.kendall_sampling_loss([1.0], [1.0], 1.0, 0.0))
        self.assertIsNone(m.kendall_sampling_loss([1.0, 0.0], [1.0], 1.0, 0.0))
        self.assertIsNone(m.kendall_sampling_loss([float("nan"), 0.0], [1.0, 0.0], 1.0, 0.0))


if __name__ == "__main__":
    unittest.main()