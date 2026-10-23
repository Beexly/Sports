import unittest
from grok_eq_elo_expected_score import elo_expected_score

class TestEloExpectedScore(unittest.TestCase):
    def test_equal_ratings(self):
        self.assertAlmostEqual(elo_expected_score(1500, 1500), 0.5)

    def test_stronger_player(self):
        p = elo_expected_score(1600, 1400)
        self.assertIsNotNone(p)
        self.assertGreater(p, 0.5)

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(elo_expected_score("bad", 1500))

    def test_fail_closed_inf(self):
        self.assertIsNone(elo_expected_score(float("inf"), 1500))

if __name__ == "__main__":
    unittest.main()
