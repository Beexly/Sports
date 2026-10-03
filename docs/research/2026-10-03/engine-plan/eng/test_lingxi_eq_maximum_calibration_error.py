"""Kill test for lingxi_eq_maximum_calibration_error.

Fails if the mean/ECE average replaces the max, the absolute
value is dropped, or a zero-gap set scores as 1.
"""
from __future__ import annotations

import unittest

import lingxi_eq_maximum_calibration_error as m


class TestMaximumCalibrationError(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS), ("maximum_calibration_error",)
        )

    def test_max_not_mean(self) -> None:
        # gaps 0.1, 0.4, 0.2 => MCE=0.4, not ECE-style mean 0.233...
        got = m.maximum_calibration_error([0.9, 0.5, 0.7], [0.8, 0.9, 0.5])
        self.assertAlmostEqual(got, 0.4)
        self.assertNotAlmostEqual(got, (0.1 + 0.4 + 0.2) / 3.0)
        self.assertNotAlmostEqual(got, 0.1)

    def test_perfect_calibration_is_zero(self) -> None:
        self.assertEqual(
            m.maximum_calibration_error([0.2, 0.8], [0.2, 0.8]), 0.0
        )
        self.assertNotEqual(
            m.maximum_calibration_error([0.2, 0.8], [0.2, 0.8]), 1.0
        )

    def test_nulls(self) -> None:
        self.assertIsNone(m.maximum_calibration_error(None, [0.5]))
        self.assertIsNone(m.maximum_calibration_error([0.5], None))
        self.assertIsNone(m.maximum_calibration_error([], []))
        self.assertIsNone(m.maximum_calibration_error([0.5], [0.5, 0.6]))
        self.assertIsNone(m.maximum_calibration_error([1.1], [0.5]))
        self.assertIsNone(m.maximum_calibration_error([0.5], [float("nan")]))


if __name__ == "__main__":
    unittest.main()