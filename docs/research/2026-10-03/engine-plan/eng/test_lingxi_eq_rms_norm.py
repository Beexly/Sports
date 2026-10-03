"""Kill test for lingxi_eq_rms_norm. Fails if the mean is subtracted."""
from __future__ import annotations

import math
import unittest

import lingxi_eq_rms_norm as m


class TestRmsNorm(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("rms_norm",))

    def test_printed_rms_not_layer_center(self) -> None:
        got = m.rms_norm([0.0, 2.0], [1.0, 1.0])
        self.assertAlmostEqual(got[0], 0.0)
        self.assertAlmostEqual(got[1], math.sqrt(2.0))
        self.assertNotAlmostEqual(got[0], -1.0)
        self.assertNotAlmostEqual(got[1], 1.0)

    def test_gain_scales(self) -> None:
        got = m.rms_norm([3.0, 0.0], [2.0, 5.0])
        self.assertAlmostEqual(got[0], 2.0 * math.sqrt(2.0))
        self.assertAlmostEqual(got[1], 0.0)
        self.assertNotAlmostEqual(got[0], math.sqrt(2.0))

    def test_nulls(self) -> None:
        self.assertIsNone(m.rms_norm(None, [1.0]))
        self.assertIsNone(m.rms_norm([1.0], None))
        self.assertIsNone(m.rms_norm([], []))
        self.assertIsNone(m.rms_norm([1.0, 2.0], [1.0]))
        self.assertIsNone(m.rms_norm([0.0, 0.0], [1.0, 1.0]))
        self.assertIsNone(m.rms_norm([1.0, None], [1.0, 1.0]))


if __name__ == "__main__":
    unittest.main()