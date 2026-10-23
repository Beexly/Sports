import unittest
from grok_eq_l1_nonconformity import l1_nonconformity

class TestL1Nonconformity(unittest.TestCase):
    def test_scalar_zero(self):
        self.assertEqual(l1_nonconformity(5.0, 5.0), 0.0)

    def test_scalar_positive(self):
        self.assertAlmostEqual(l1_nonconformity(10.0, 7.0), 3.0)

    def test_vector(self):
        self.assertAlmostEqual(l1_nonconformity([1.0, 2.0], [4.0, 6.0]), 7.0)

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(l1_nonconformity("bad", 1.0))

    def test_fail_closed_mismatch_len(self):
        self.assertIsNone(l1_nonconformity([1.0], [1.0, 2.0]))

    def test_fail_closed_inf(self):
        self.assertIsNone(l1_nonconformity(float("inf"), 1.0))

if __name__ == "__main__":
    unittest.main()
