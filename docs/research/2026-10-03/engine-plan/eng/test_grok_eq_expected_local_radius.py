import unittest
from grok_eq_expected_local_radius import expected_local_radius

class TestExpectedLocalRadius(unittest.TestCase):
    def test_uniform_beta1(self):
        # distances 1,2,3,4 ; beta=1 → average = 2.5
        self.assertAlmostEqual(expected_local_radius([4, 1, 3, 2], 1.0), 2.5)

    def test_beta_half(self):
        # sorted 1,2,3,4 ; beta=0.5 → integral over first half ≈ (1+2)/4 = 0.75; /0.5 = 1.5
        self.assertAlmostEqual(expected_local_radius([1.0, 2.0, 3.0, 4.0], 0.5), 1.5)

    def test_fail_closed_bad_beta(self):
        self.assertIsNone(expected_local_radius([1.0, 2.0], 0.0))
        self.assertIsNone(expected_local_radius([1.0, 2.0], 1.1))
        self.assertIsNone(expected_local_radius([1.0, 2.0], float("inf")))

    def test_fail_closed_negative(self):
        self.assertIsNone(expected_local_radius([1.0, -0.1], 0.5))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(expected_local_radius([1.0, "bad"], 0.5))

    def test_fail_closed_empty(self):
        self.assertIsNone(expected_local_radius([], 0.5))

if __name__ == "__main__":
    unittest.main()
