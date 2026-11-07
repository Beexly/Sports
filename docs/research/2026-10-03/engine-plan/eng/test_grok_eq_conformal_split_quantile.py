import unittest
from grok_eq_conformal_split_quantile import conformal_split_quantile

class TestConformalSplitQuantile(unittest.TestCase):
    def test_basic_quantile(self):
        res = [0.1, 0.2, 0.3, 0.4, 0.5]
        # alpha=0.1, n=5, ceil(0.9*6)/5 = ceil(5.4)/5 = 6/5 = 1.2 -> cap 1, last
        q = conformal_split_quantile(res, 0.1)
        self.assertAlmostEqual(q, 0.5)

    def test_smaller_alpha(self):
        res = [1, 2, 3, 4, 5]
        q = conformal_split_quantile(res, 0.2)
        self.assertIsNotNone(q)

    def test_fail_closed_empty(self):
        self.assertIsNone(conformal_split_quantile([], 0.1))

    def test_fail_closed_bad_alpha(self):
        self.assertIsNone(conformal_split_quantile([1, 2], 1.5))

    def test_fail_closed_inf(self):
        self.assertIsNone(conformal_split_quantile([1, float("inf")], 0.1))

    def test_fail_closed_non_list(self):
        self.assertIsNone(conformal_split_quantile(None, 0.1))

if __name__ == "__main__":
    unittest.main()
