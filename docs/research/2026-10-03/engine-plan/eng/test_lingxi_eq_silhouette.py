"""Kill test for lingxi_eq_silhouette.

Fails if (a−b)/max (sign flip), if (b−a)/(a+b), or if b−a alone.
"""
from __future__ import annotations

import unittest

import lingxi_eq_silhouette as m


class TestSilhouette(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("silhouette",))

    def test_printed_s(self) -> None:
        # a=1, b=3 → (3−1)/max(1,3)=2/3
        got = m.silhouette(1.0, 3.0)
        self.assertAlmostEqual(got, 2.0 / 3.0)
        self.assertNotAlmostEqual(got, (1.0 - 3.0) / 3.0)  # sign flip
        self.assertNotAlmostEqual(got, (3.0 - 1.0) / (1.0 + 3.0))  # not /(a+b)
        self.assertNotAlmostEqual(got, 3.0 - 1.0)  # not b−a

    def test_zero_max(self) -> None:
        self.assertEqual(m.silhouette(0.0, 0.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.silhouette(None, 1.0))
        self.assertIsNone(m.silhouette(-0.1, 1.0))
        self.assertIsNone(m.silhouette(1.0, float("nan")))


if __name__ == "__main__":
    unittest.main()