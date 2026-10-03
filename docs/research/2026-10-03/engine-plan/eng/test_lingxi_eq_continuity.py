"""Kill test for lingxi_eq_continuity. Fails if the areas are swapped."""
from __future__ import annotations

import unittest

import lingxi_eq_continuity as m


class TestContinuity(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("continuity_downstream_speed",))

    def test_narrower_pipe_is_faster(self) -> None:
        got = m.continuity_downstream_speed(2.0, 3.0, 6.0)
        self.assertEqual(got, 1.0)
        self.assertNotEqual(got, 9.0)
        self.assertNotEqual(got, 36.0)

    def test_product_conserved(self) -> None:
        v2 = m.continuity_downstream_speed(4.0, 5.0, 2.0)
        self.assertEqual(v2, 10.0)
        self.assertEqual(4.0 * 5.0, 2.0 * v2)

    def test_nulls(self) -> None:
        self.assertIsNone(m.continuity_downstream_speed(None, 1.0, 1.0))
        self.assertIsNone(m.continuity_downstream_speed(1.0, None, 1.0))
        self.assertIsNone(m.continuity_downstream_speed(1.0, 1.0, None))
        self.assertIsNone(m.continuity_downstream_speed(1.0, 1.0, 0.0))
        self.assertIsNone(m.continuity_downstream_speed(0.0, 1.0, 1.0))
        self.assertIsNone(m.continuity_downstream_speed(-1.0, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()