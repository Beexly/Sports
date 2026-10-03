"""Kill test for lingxi_eq_mixup.

Fails if reduced to x_i alone, x_j alone, or arithmetic mean without λ.
"""
from __future__ import annotations

import unittest

import lingxi_eq_mixup as m


class TestMixup(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("mixup",))

    def test_printed_convex_combo(self) -> None:
        # λ=0.7, x_i=10, x_j=0 → 7
        got = m.mixup(10.0, 0.0, 0.7)
        self.assertAlmostEqual(got, 7.0)
        self.assertNotAlmostEqual(got, 10.0)
        self.assertNotAlmostEqual(got, 0.0)
        self.assertNotAlmostEqual(got, 5.0)  # not unweighted mean
        # λ=0 → x_j; λ=1 → x_i
        self.assertAlmostEqual(m.mixup(10.0, 3.0, 0.0), 3.0)
        self.assertAlmostEqual(m.mixup(10.0, 3.0, 1.0), 10.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.mixup(None, 1.0, 0.5))
        self.assertIsNone(m.mixup(1.0, None, 0.5))
        self.assertIsNone(m.mixup(1.0, 2.0, None))
        self.assertIsNone(m.mixup(1.0, 2.0, -0.1))
        self.assertIsNone(m.mixup(1.0, 2.0, 1.1))
        self.assertIsNone(m.mixup(float("nan"), 2.0, 0.5))


if __name__ == "__main__":
    unittest.main()
