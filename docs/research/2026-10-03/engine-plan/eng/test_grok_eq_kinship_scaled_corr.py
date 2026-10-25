import unittest
from grok_eq_kinship_scaled_corr import kinship_scaled_corr

class TestKinshipScaledCorr(unittest.TestCase):
    def test_sisters(self):
        # phi=1/4 for sisters, h=0.8 -> 0.2
        self.assertAlmostEqual(kinship_scaled_corr(0.8, 0.25), 0.2)

    def test_full(self):
        self.assertAlmostEqual(kinship_scaled_corr(1.0, 1.0), 1.0)
        self.assertAlmostEqual(kinship_scaled_corr(0.0, 0.5), 0.0)

    def test_fail_closed_range(self):
        self.assertIsNone(kinship_scaled_corr(-0.1, 0.5))
        self.assertIsNone(kinship_scaled_corr(1.1, 0.5))
        self.assertIsNone(kinship_scaled_corr(0.5, -0.1))
        self.assertIsNone(kinship_scaled_corr(0.5, 1.1))

    def test_fail_closed_type(self):
        self.assertIsNone(kinship_scaled_corr(None, 0.5))
        self.assertIsNone(kinship_scaled_corr(0.5, None))
        self.assertIsNone(kinship_scaled_corr("bad", 0.5))
        self.assertIsNone(kinship_scaled_corr(0.5, "bad"))

if __name__ == "__main__":
    unittest.main()
