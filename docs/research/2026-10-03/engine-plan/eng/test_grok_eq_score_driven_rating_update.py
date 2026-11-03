import unittest
from grok_eq_score_driven_rating_update import score_driven_rating_update

class TestScoreDrivenRatingUpdate(unittest.TestCase):
    def test_basic_update(self):
        self.assertAlmostEqual(score_driven_rating_update(1500.0, 32.0, 0.5), 1516.0)

    def test_negative_score(self):
        self.assertAlmostEqual(score_driven_rating_update(1600.0, 16.0, -1.0), 1584.0)

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(score_driven_rating_update("bad", 16.0, 0.1))

    def test_fail_closed_inf(self):
        self.assertIsNone(score_driven_rating_update(1500.0, float("inf"), 0.1))

    def test_fail_closed_nonpositive_K(self):
        self.assertIsNone(score_driven_rating_update(1500.0, 0.0, 0.1))
        self.assertIsNone(score_driven_rating_update(1500.0, -1.0, 0.1))

if __name__ == "__main__":
    unittest.main()
