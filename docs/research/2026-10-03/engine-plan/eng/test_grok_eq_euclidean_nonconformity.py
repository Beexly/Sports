import unittest
import math
from grok_eq_euclidean_nonconformity import euclidean_nonconformity

class TestEuclideanNonconformity(unittest.TestCase):
    def test_scalar_zero(self):
        self.assertEqual(euclidean_nonconformity(5.0, 5.0), 0.0)

    def test_scalar_positive(self):
        self.assertAlmostEqual(euclidean_nonconformity(10.0, 7.0), 3.0)

    def test_vector(self):
        self.assertAlmostEqual(euclidean_nonconformity([0.0, 0.0], [3.0, 4.0]), 5.0)

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(euclidean_nonconformity("bad", 1.0))

    def test_fail_closed_mismatch_len(self):
        self.assertIsNone(euclidean_nonconformity([1.0], [1.0, 2.0]))

    def test_fail_closed_inf(self):
        self.assertIsNone(euclidean_nonconformity(float("inf"), 1.0))

if __name__ == "__main__":
    unittest.main()
