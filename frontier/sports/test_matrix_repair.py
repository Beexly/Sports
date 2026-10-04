"""
test_matrix_repair.py
=====================
Adversarial crash test harness for matrix repair and safe Cholesky decomposition.
Tests non-positive-definite matrices, eigenvalue clipping, and LinAlgError prevention.
"""

import unittest
import numpy as np
try:
    from intelligence.optimizer.matrix_repair import nearest_positive_definite, safe_cholesky
except ImportError:
    from matrix_repair import nearest_positive_definite, safe_cholesky


class TestMatrixRepair(unittest.TestCase):

    def test_superheavygrok_attack_case_repaired(self):
        """
        Tests the exact matrix reported by Superheavygrok in crash_repro_2026_10_04.py:
        A = [[ 1.0,  0.9, -0.9],
             [ 0.9,  1.0,  0.9],
             [-0.9,  0.9,  1.0]]
        Raw numpy.linalg.cholesky(A) raises LinAlgError.
        safe_cholesky(A) must repair and succeed without error.
        """
        A = np.array([
            [1.0,  0.9, -0.9],
            [0.9,  1.0,  0.9],
            [-0.9, 0.9,  1.0]
        ], dtype=float)

        # Confirm that raw Cholesky indeed crashes with LinAlgError
        with self.assertRaises(np.linalg.LinAlgError):
            np.linalg.cholesky(A)

        # safe_cholesky must intercept, repair, and produce valid factor L
        L, was_repaired = safe_cholesky(A)
        self.assertTrue(was_repaired)
        self.assertEqual(L.shape, (3, 3))
        self.assertTrue(np.all(np.isfinite(L)))

        # Reconstructed matrix L @ L.T must be positive definite with unit diagonal
        A_reconstructed = L @ L.T
        np.testing.assert_allclose(np.diag(A_reconstructed), 1.0, atol=1e-5)
        evals = np.linalg.eigvalsh(A_reconstructed)
        self.assertTrue(np.all(evals > 0), "All eigenvalues of repaired matrix must be strictly positive")

    def test_already_positive_definite_matrix(self):
        """An already positive definite matrix does not trigger repair."""
        A = np.array([
            [1.0, 0.3, 0.2],
            [0.3, 1.0, 0.1],
            [0.2, 0.1, 1.0]
        ], dtype=float)

        L, was_repaired = safe_cholesky(A)
        self.assertFalse(was_repaired)
        np.testing.assert_allclose(L @ L.T, A, atol=1e-6)


if __name__ == "__main__":
    unittest.main()
