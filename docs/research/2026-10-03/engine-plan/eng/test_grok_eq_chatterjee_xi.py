import unittest
from grok_eq_chatterjee_xi import chatterjee_xi

class TestChatterjeeXi(unittest.TestCase):
    def test_independence(self):
        # For independence, partial_1 C = v, integral of v^2 = 1/3, but wait: integral_0^1 v^2 dv = 1/3, times integral du=1, so I=1/3
        # xi = 6*(1/3) - 2 = 0
        self.assertAlmostEqual(chatterjee_xi(1.0/3), 0.0)

    def test_comonotonicity(self):
        # For M, xi=1, so 6*I -2 =1 => I=0.5
        self.assertAlmostEqual(chatterjee_xi(0.5), 1.0)

    def test_partial(self):
        # I=0.4, xi=6*0.4 -2 =0.4
        self.assertAlmostEqual(chatterjee_xi(0.4), 0.4)

    def test_fail_closed_bad_integral(self):
        self.assertIsNone(chatterjee_xi(-0.1))
        self.assertIsNone(chatterjee_xi(0.6))
        self.assertIsNone(chatterjee_xi(None))
        self.assertIsNone(chatterjee_xi(float("inf")))
        self.assertIsNone(chatterjee_xi("bad"))

    def test_fail_closed_out_of_range_xi(self):
        # edge that would make xi slightly over due to float, but we guard
        self.assertIsNone(chatterjee_xi(0.5001))

if __name__ == "__main__":
    unittest.main()
