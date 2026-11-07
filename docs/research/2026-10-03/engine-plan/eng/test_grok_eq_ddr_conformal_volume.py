import unittest
import math
from grok_eq_ddr_conformal_volume import ddr_conformal_volume

class TestDdrConformalVolume(unittest.TestCase):
    def test_basic_volume(self):
        # t=2, qhat=1, det_w=1
        # num = (sqrt(pi)*1)**2 = pi
        # gamma(2/2 +1)=gamma(2)=1
        # denom=1*1=1
        # vol=pi
        v = ddr_conformal_volume(1.0, 2, 1.0)
        self.assertAlmostEqual(v, math.pi)

    def test_higher_t(self):
        v = ddr_conformal_volume(0.5, 1, 4.0)
        self.assertIsNotNone(v)
        self.assertGreater(v, 0)

    def test_fail_closed_neg_q(self):
        self.assertIsNone(ddr_conformal_volume(-1, 2, 1.0))

    def test_fail_closed_zero_det(self):
        self.assertIsNone(ddr_conformal_volume(1.0, 2, 0.0))

    def test_fail_closed_bad_t(self):
        self.assertIsNone(ddr_conformal_volume(1.0, 0, 1.0))

    def test_fail_closed_inf(self):
        self.assertIsNone(ddr_conformal_volume(float("inf"), 2, 1.0))

if __name__ == "__main__":
    unittest.main()
