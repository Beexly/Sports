import unittest
from grok_eq_spectral_quantile_high import spectral_quantile_high

class TestSpectralQuantileHigh(unittest.TestCase):
    def test_basic_positive(self):
        self.assertAlmostEqual(spectral_quantile_high(1.0, 0.5, 2.0, 1.0), 2.0)

    def test_relu_zero(self):
        self.assertAlmostEqual(spectral_quantile_high(1.0, 0.5, -1.0, 1.0), 1.0)

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(spectral_quantile_high("bad", 0.5, 1.0, 1.0))

    def test_fail_closed_inf(self):
        self.assertIsNone(spectral_quantile_high(1.0, float("inf"), 1.0, 1.0))

    def test_fail_closed_negative_alpha(self):
        self.assertIsNone(spectral_quantile_high(1.0, -0.1, 1.0, 1.0))

if __name__ == "__main__":
    unittest.main()
