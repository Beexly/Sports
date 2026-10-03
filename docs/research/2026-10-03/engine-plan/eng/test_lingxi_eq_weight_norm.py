"""Kill test for lingxi_eq_weight_norm. Fails if ||v|| is not divided out."""
from __future__ import annotations

import unittest

import lingxi_eq_weight_norm as m


class TestWeightNorm(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("weight_norm",))

    def test_unit_direction_times_gain(self) -> None:
        got = m.weight_norm([3.0, 4.0], 10.0)
        self.assertEqual(got, [6.0, 8.0])
        self.assertNotEqual(got, [30.0, 40.0])
        self.assertNotEqual(got, [0.6, 0.8])

    def test_negative_gain_flips(self) -> None:
        self.assertEqual(m.weight_norm([0.0, 2.0], -4.0), [0.0, -4.0])

    def test_nulls(self) -> None:
        self.assertIsNone(m.weight_norm(None, 1.0))
        self.assertIsNone(m.weight_norm([1.0], None))
        self.assertIsNone(m.weight_norm([], 1.0))
        self.assertIsNone(m.weight_norm([0.0, 0.0], 1.0))
        self.assertIsNone(m.weight_norm([1.0, None], 1.0))


if __name__ == "__main__":
    unittest.main()