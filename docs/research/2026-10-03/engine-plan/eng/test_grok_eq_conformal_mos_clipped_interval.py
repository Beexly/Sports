import unittest
from grok_eq_conformal_mos_clipped_interval import conformal_mos_clipped_interval

class TestConformalMosClippedInterval(unittest.TestCase):
    def test_no_clip(self):
        self.assertEqual(conformal_mos_clipped_interval(3.0, 0.5), (2.5, 3.5))

    def test_clip_low(self):
        self.assertEqual(conformal_mos_clipped_interval(1.2, 0.5), (1.0, 1.7))

    def test_clip_high(self):
        self.assertEqual(conformal_mos_clipped_interval(4.8, 0.5), (4.3, 5.0))

    def test_full_clip(self):
        self.assertEqual(conformal_mos_clipped_interval(3.0, 10.0), (1.0, 5.0))

    def test_fail_closed(self):
        self.assertIsNone(conformal_mos_clipped_interval(None, 0.5))
        self.assertIsNone(conformal_mos_clipped_interval(3.0, None))
        self.assertIsNone(conformal_mos_clipped_interval(3.0, -0.1))
        self.assertIsNone(conformal_mos_clipped_interval(float("nan"), 0.5))
        self.assertIsNone(conformal_mos_clipped_interval(3.0, float("inf")))

if __name__ == "__main__":
    unittest.main()
