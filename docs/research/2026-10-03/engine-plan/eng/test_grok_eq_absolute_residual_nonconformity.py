import unittest
from grok_eq_absolute_residual_nonconformity import absolute_residual_nonconformity

class TestAbsoluteResidualNonconformity(unittest.TestCase):
    def test_zero_error(self):
        self.assertEqual(absolute_residual_nonconformity(5.0, 5.0), 0.0)

    def test_positive_error(self):
        self.assertAlmostEqual(absolute_residual_nonconformity(10.0, 7.5), 2.5)

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(absolute_residual_nonconformity("bad", 1.0))

    def test_fail_closed_inf(self):
        self.assertIsNone(absolute_residual_nonconformity(float("inf"), 1.0))

if __name__ == "__main__":
    unittest.main()
