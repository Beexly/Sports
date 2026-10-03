"""Kill test for lingxi_eq_meteor_fmean.

Fails if the 9/10 weights are swapped, the ratio is inverted, or
an arithmetic mean replaces the printed harmonic form.
"""
from __future__ import annotations

import unittest

import lingxi_eq_meteor_fmean as m


class TestMeteorFmean(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("meteor_fmean",))

    def test_printed_weights_not_swapped(self) -> None:
        # P=1, R=0.5 => 10*1*0.5/(0.5+9)=5/9.5
        got = m.meteor_fmean(1.0, 0.5)
        self.assertAlmostEqual(got, 5.0 / 9.5)
        swapped = (10.0 * 1.0 * 0.5) / (1.0 + 9.0 * 0.5)  # 9 on R instead
        self.assertNotAlmostEqual(got, swapped)
        self.assertNotAlmostEqual(got, (1.0 + 0.5) / 2.0)

    def test_perfect_and_zero(self) -> None:
        self.assertEqual(m.meteor_fmean(1.0, 1.0), 1.0)
        self.assertEqual(m.meteor_fmean(0.0, 1.0), 0.0)
        self.assertEqual(m.meteor_fmean(1.0, 0.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.meteor_fmean(None, 0.5))
        self.assertIsNone(m.meteor_fmean(0.5, None))
        self.assertIsNone(m.meteor_fmean(-0.1, 0.5))
        self.assertIsNone(m.meteor_fmean(0.5, 1.1))
        self.assertIsNone(m.meteor_fmean(0.0, 0.0))
        self.assertIsNone(m.meteor_fmean(float("nan"), 0.5))


if __name__ == "__main__":
    unittest.main()