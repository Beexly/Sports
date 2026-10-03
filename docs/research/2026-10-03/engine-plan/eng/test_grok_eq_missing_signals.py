import unittest
from grok_eq_missing_signals import (
    batch_norm_transform,
    expected_calibration_error,
    label_smooth,
    residual_add,
)
import math


class MissingSignalTest(unittest.TestCase):
    def test_ece_perfect_is_zero(self):
        self.assertAlmostEqual(expected_calibration_error([1.0, 1.0, 0.0, 0.0], [1, 1, 0, 0], 2), 0.0)

    def test_ece_half_on_always_wrong_certain(self):
        self.assertAlmostEqual(expected_calibration_error([1.0, 1.0], [0, 0], 2), 1.0)

    def test_ece_rejects_conf_above_one(self):
        self.assertIsNone(expected_calibration_error([1.2], [1], 5))

    def test_ece_rejects_empty(self):
        self.assertIsNone(expected_calibration_error([], [], 5))

    def test_residual(self):
        self.assertEqual(residual_add(2.0, 3.0), 5.0)
        self.assertIsNone(residual_add(math.nan, 1.0))

    def test_batch_norm(self):
        self.assertAlmostEqual(batch_norm_transform(3.0, 1.0, 3.0, 1.0), 1.0)
        self.assertIsNone(batch_norm_transform(1.0, 0.0, -1.0, 1e-5))

    def test_label_smooth(self):
        self.assertAlmostEqual(label_smooth(1.0, 0.1, 10), 0.91)
        self.assertAlmostEqual(label_smooth(0.0, 0.1, 10), 0.01)
        self.assertIsNone(label_smooth(1.0, 1.0, 10))


if __name__ == "__main__":
    unittest.main()
