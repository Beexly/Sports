"""Kill test for lingxi_eq_bradley_terry. Fails if the ratio is inverted or unnormalized."""
from __future__ import annotations

import unittest

import lingxi_eq_bradley_terry as m


class TestBradleyTerry(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bradley_terry",))

    def test_equal_strength_is_half(self) -> None:
        self.assertEqual(m.bradley_terry(1.0, 1.0), 0.5)

    def test_printed_ratio_not_the_swap(self) -> None:
        got = m.bradley_terry(3.0, 1.0)
        self.assertEqual(got, 0.75)
        self.assertNotEqual(got, 3.0)
        self.assertNotEqual(got, 0.25)

    def test_nulls(self) -> None:
        self.assertIsNone(m.bradley_terry(None, 1.0))
        self.assertIsNone(m.bradley_terry(1.0, None))
        self.assertIsNone(m.bradley_terry(0.0, 0.0))
        self.assertIsNone(m.bradley_terry(-1.0, 1.0))
        self.assertIsNone(m.bradley_terry(1.0, -1.0))


if __name__ == "__main__":
    unittest.main()