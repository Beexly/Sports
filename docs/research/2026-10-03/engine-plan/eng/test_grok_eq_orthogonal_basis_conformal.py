import unittest
from grok_eq_orthogonal_basis_conformal import orthogonal_basis_conformal_score

class TestOrthogonalBasisConformal(unittest.TestCase):
    def test_zero_residual(self):
        self.assertAlmostEqual(orthogonal_basis_conformal_score([1.0, 2.0], [1.0, 2.0], [1.0, 1.0]), 0.0)

    def test_simple_norm(self):
        # sqrt(1)*1 = 1, so norm 1
        self.assertAlmostEqual(orthogonal_basis_conformal_score([2.0], [1.0], [1.0]), 1.0)

    def test_weighted(self):
        # sqrt(4)*1 = 2
        self.assertAlmostEqual(orthogonal_basis_conformal_score([2.0], [1.0], [4.0]), 2.0)

    def test_fail_closed_negative_w(self):
        self.assertIsNone(orthogonal_basis_conformal_score([1.0], [0.0], [-1.0]))

    def test_fail_closed_mismatch_len(self):
        self.assertIsNone(orthogonal_basis_conformal_score([1.0, 2.0], [1.0], [1.0]))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(orthogonal_basis_conformal_score(["bad"], [1.0], [1.0]))

    def test_fail_closed_inf(self):
        self.assertIsNone(orthogonal_basis_conformal_score([float("inf")], [0.0], [1.0]))

if __name__ == "__main__":
    unittest.main()
