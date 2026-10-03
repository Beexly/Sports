"""Kill test for lingxi_eq_instance_norm. Fails if the mean is not removed."""
from __future__ import annotations

import math
import unittest

import lingxi_eq_instance_norm as m


class TestInstanceNorm(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("instance_norm",))

    def test_centered_not_rms(self) -> None:
        got = m.instance_norm([0.0, 2.0], 1.0, 0.0, 0.0)
        self.assertEqual(got, [-1.0, 1.0])
        self.assertNotAlmostEqual(got[0], 0.0)
        self.assertNotAlmostEqual(got[1], math.sqrt(2.0))

    def test_scalar_affine(self) -> None:
        self.assertEqual(m.instance_norm([0.0, 2.0], 2.0, 4.0, 0.0), [2.0, 6.0])

    def test_nulls(self) -> None:
        self.assertIsNone(m.instance_norm(None, 1.0, 0.0, 0.0))
        self.assertIsNone(m.instance_norm([0.0, 2.0], None, 0.0, 0.0))
        self.assertIsNone(m.instance_norm([0.0, 2.0], 1.0, None, 0.0))
        self.assertIsNone(m.instance_norm([0.0, 2.0], 1.0, 0.0, None))
        self.assertIsNone(m.instance_norm([], 1.0, 0.0, 0.0))
        self.assertIsNone(m.instance_norm([5.0, 5.0], 1.0, 0.0, 0.0))
        self.assertIsNone(m.instance_norm([0.0, 2.0], 1.0, 0.0, -1.0))


if __name__ == "__main__":
    unittest.main()