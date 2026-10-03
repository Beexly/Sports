"""Kill test for lingxi_eq_relative_information_lost.

Fails if RIL is replaced by I/H, by 1-I*H, by WIL-style
H*H/(N1*N2), or by WER/MER ratios.
"""
from __future__ import annotations

import unittest

import lingxi_eq_relative_information_lost as m


class TestRelativeInformationLost(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS), ("relative_information_lost",)
        )

    def test_printed_one_minus_ratio(self) -> None:
        got = m.relative_information_lost(1.0, 4.0)
        self.assertAlmostEqual(got, 1.0 - 1.0 / 4.0)
        self.assertNotAlmostEqual(got, 1.0 / 4.0)
        self.assertNotAlmostEqual(got, 1.0 - 1.0 * 4.0)
        # WIL-style with unrelated H/N counts must not match this RIL
        self.assertNotAlmostEqual(got, 1.0 - (3.0 * 3.0) / (4.0 * 5.0))

    def test_perfect_preservation(self) -> None:
        self.assertEqual(m.relative_information_lost(3.0, 3.0), 0.0)

    def test_total_loss(self) -> None:
        self.assertEqual(m.relative_information_lost(0.0, 2.5), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.relative_information_lost(None, 2.0))
        self.assertIsNone(m.relative_information_lost(1.0, None))
        self.assertIsNone(m.relative_information_lost(1.0, 0.0))
        self.assertIsNone(m.relative_information_lost(3.0, 2.0))
        self.assertIsNone(m.relative_information_lost(-0.1, 2.0))
        self.assertIsNone(m.relative_information_lost(1.0, float("nan")))


if __name__ == "__main__":
    unittest.main()
