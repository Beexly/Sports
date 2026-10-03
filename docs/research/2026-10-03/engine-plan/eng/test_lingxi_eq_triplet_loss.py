"""Kill test for lingxi_eq_triplet_loss. Fails if the margin is dropped or the hinge is flipped."""
from __future__ import annotations

import unittest

import lingxi_eq_triplet_loss as m


class TestTripletLoss(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("triplet_loss",))

    def test_hinge_with_margin(self) -> None:
        got = m.triplet_loss(2.0, 1.0, 0.5)
        self.assertEqual(got, 1.5)
        self.assertNotEqual(got, 1.0)
        self.assertNotEqual(got, 0.0)

    def test_satisfied_triplet_is_zero(self) -> None:
        self.assertEqual(m.triplet_loss(1.0, 3.0, 0.2), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.triplet_loss(None, 1.0, 0.2))
        self.assertIsNone(m.triplet_loss(1.0, None, 0.2))
        self.assertIsNone(m.triplet_loss(1.0, 1.0, None))
        self.assertIsNone(m.triplet_loss(-1.0, 1.0, 0.2))
        self.assertIsNone(m.triplet_loss(1.0, -1.0, 0.2))


if __name__ == "__main__":
    unittest.main()