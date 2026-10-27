import unittest
from grok_eq_gaussian_copula_kinship import gaussian_copula_kinship

class TestGaussianCopulaKinship(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(gaussian_copula_kinship(0.5, 0.3, 0.2, 0.5), 0.5)
    def test_invalid_phi(self):
        self.assertIsNone(gaussian_copula_kinship(0.5, 0.3, 0.2, 1.5))
    def test_invalid_type(self):
        self.assertIsNone(gaussian_copula_kinship("a", 0.3, 0.2, 0.5))
    def test_abs_rho(self):
        self.assertIsNone(gaussian_copula_kinship(2.0, 0.0, 0.0, 1.0))
    def test_zero(self):
        self.assertEqual(gaussian_copula_kinship(0, 0, 0, 0.5), 0.0)

if __name__ == "__main__":
    unittest.main()
