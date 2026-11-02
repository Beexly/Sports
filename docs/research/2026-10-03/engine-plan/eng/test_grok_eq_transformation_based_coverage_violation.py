import unittest
from grok_eq_transformation_based_coverage_violation import transformation_based_coverage_violation

class TestTransformationBasedCoverageViolation(unittest.TestCase):
    def test_perfect_coverage(self):
        self.assertEqual(transformation_based_coverage_violation([0.9, 0.9, 0.9], 0.1), 0.0)

    def test_max_deviation(self):
        self.assertAlmostEqual(transformation_based_coverage_violation([0.8, 1.0, 0.85], 0.1), 0.1)

    def test_fail_closed_none(self):
        self.assertIsNone(transformation_based_coverage_violation(None, 0.1))

    def test_fail_closed_empty(self):
        self.assertIsNone(transformation_based_coverage_violation([], 0.1))

    def test_fail_closed_bad_alpha(self):
        self.assertIsNone(transformation_based_coverage_violation([0.9], 1.5))

    def test_fail_closed_bad_cov(self):
        self.assertIsNone(transformation_based_coverage_violation([0.9, float('nan')], 0.1))

if __name__ == '__main__':
    unittest.main()
