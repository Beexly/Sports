"""Kill test for lingxi_eq_hamming.

Fails if Canberra, Bray–Curtis, or Manhattan on the same inputs.
"""
from __future__ import annotations

import unittest

import lingxi_eq_hamming as m


class TestHamming(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("hamming",))

    def test_printed(self) -> None:
        # x=[1,0,1], y=[1,1,0]: 2/3 differ
        got = m.hamming([1.0, 0.0, 1.0], [1.0, 1.0, 0.0])
        self.assertAlmostEqual(got, 2.0 / 3.0)
        # same inputs: Canberra = 0/2 + 1/1 + 1/1 = 2; Bray = 2/4 = 0.5; Manh = 2
        self.assertNotAlmostEqual(got, 2.0)
        self.assertNotAlmostEqual(got, 0.5)

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.hamming([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 0.0)

    def test_all_differ(self) -> None:
        self.assertAlmostEqual(m.hamming([0.0, 0.0], [1.0, 1.0]), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.hamming(None, [1.0]))
        self.assertIsNone(m.hamming([], []))
        self.assertIsNone(m.hamming([1.0], [1.0, 2.0]))
        self.assertIsNone(m.hamming([float("nan")], [1.0]))


if __name__ == "__main__":
    unittest.main()