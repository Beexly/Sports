"""Kill test for lingxi_eq_group_norm. Fails if all channels share one mean."""
from __future__ import annotations

import math
import unittest

import lingxi_eq_group_norm as m


class TestGroupNorm(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("group_norm",))

    def test_two_groups_not_one_mean(self) -> None:
        got = m.group_norm([0.0, 2.0, 0.0, 4.0], [1.0, 1.0, 1.0, 1.0], [0.0, 0.0, 0.0, 0.0], 2, 0.0)
        self.assertEqual(got, [-1.0, 1.0, -1.0, 1.0])
        whole_mu = 1.5
        whole_sigma = math.sqrt(2.75)
        self.assertNotAlmostEqual(got[0], (0.0 - whole_mu) / whole_sigma)

    def test_affine_inside_group(self) -> None:
        got = m.group_norm([0.0, 2.0], [2.0, 3.0], [4.0, 5.0], 1, 0.0)
        self.assertEqual(got, [2.0, 8.0])

    def test_nulls(self) -> None:
        self.assertIsNone(m.group_norm(None, [1.0], [0.0], 1, 0.0))
        self.assertIsNone(m.group_norm([0.0, 2.0], [1.0], [0.0, 0.0], 1, 0.0))
        self.assertIsNone(m.group_norm([0.0, 2.0], [1.0, 1.0], [0.0, 0.0], 3, 0.0))
        self.assertIsNone(m.group_norm([5.0, 5.0], [1.0, 1.0], [0.0, 0.0], 1, 0.0))
        self.assertIsNone(m.group_norm([0.0, 2.0], [1.0, 1.0], [0.0, 0.0], 1, -1.0))
        self.assertIsNone(m.group_norm([], [], [], 1, 0.0))


if __name__ == "__main__":
    unittest.main()