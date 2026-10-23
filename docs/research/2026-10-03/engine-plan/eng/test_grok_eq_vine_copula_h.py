import unittest
from grok_eq_vine_copula_h import vine_copula_h

class TestVineCopulaH(unittest.TestCase):
    def test_independence(self):
        self.assertAlmostEqual(vine_copula_h(0.3, 0.7, family="independence"), 0.3)

    def test_clayton_positive(self):
        h = vine_copula_h(0.4, 0.6, theta=1.0, family="clayton")
        self.assertIsNotNone(h)
        self.assertTrue(0.0 < h < 1.0)

    def test_fail_closed_out_of_range(self):
        self.assertIsNone(vine_copula_h(1.5, 0.5))

    def test_fail_closed_bad_family(self):
        self.assertIsNone(vine_copula_h(0.5, 0.5, family="unknown"))

if __name__ == "__main__":
    unittest.main()
