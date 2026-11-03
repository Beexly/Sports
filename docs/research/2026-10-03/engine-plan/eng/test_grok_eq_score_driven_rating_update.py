import unittest
from grok_eq_score_driven_rating_update import score_driven_rating_update

class TestScoreDrivenRatingUpdate(unittest.TestCase):
    def test_positive_score(self):
        self.assertAlmostEqual(score_driven_rating_update(1500.0, 16.0, 0.25), 1504.0)

    def test_negative_score(self):
        self.assertAlmostEqual(score_driven_rating_update(1500.0, 32.0, -0.5), 1484.0)

    def test_zero_score(self):
        self.assertEqual(score_driven_rating_update(1200.0, 16.0, 0.0), 1200.0)

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(score_driven_rating_update("bad", 16.0, 0.1))

    def test_fail_closed_inf(self):
        self.assertIsNone(score_driven_rating_update(float("inf"), 16.0, 0.1))

    def test_fail_closed_non_positive_k(self):
        self.assertIsNone(score_driven_rating_update(1500.0, 0.0, 0.1))
        self.assertIsNone(score_driven_rating_update(1500.0, -1.0, 0.1))

if __name__ == "__main__":
    unittest.main()
