"""Kill test for lingxi_eq_bernoulli. Fails if the 1/2 on dynamic pressure is dropped."""
from __future__ import annotations

import unittest

import lingxi_eq_bernoulli as m


class TestBernoulli(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bernoulli_sum",))

    def test_printed_half_not_full_dynamic_pressure(self) -> None:
        got = m.bernoulli_sum(1.0, 2.0, 3.0, 10.0, 4.0)
        self.assertEqual(got, 90.0)
        self.assertNotEqual(got, 99.0)
        self.assertNotEqual(got, 10.0)

    def test_zero_speed_and_height(self) -> None:
        self.assertEqual(m.bernoulli_sum(7.0, 1.0, 0.0, 9.0, 0.0), 7.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.bernoulli_sum(None, 1.0, 0.0, 1.0, 0.0))
        self.assertIsNone(m.bernoulli_sum(1.0, None, 0.0, 1.0, 0.0))
        self.assertIsNone(m.bernoulli_sum(1.0, 1.0, None, 1.0, 0.0))
        self.assertIsNone(m.bernoulli_sum(1.0, 1.0, 0.0, None, 0.0))
        self.assertIsNone(m.bernoulli_sum(1.0, 1.0, 0.0, 1.0, None))
        self.assertIsNone(m.bernoulli_sum(1.0, 0.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.bernoulli_sum(1.0, -1.0, 1.0, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()