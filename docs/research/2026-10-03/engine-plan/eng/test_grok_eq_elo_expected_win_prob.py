import unittest
from grok_eq_elo_expected_win_prob import elo_expected_win_prob

class TestEloExpectedWinProb(unittest.TestCase):
    def test_equal_ratings(self):
        self.assertAlmostEqual(elo_expected_win_prob(1500, 1500), 0.5)

    def test_stronger_player(self):
        p = elo_expected_win_prob(1600, 1400)
        self.assertGreater(p, 0.5)
        self.assertAlmostEqual(p, 1.0 / (1.0 + 10 ** (-200 / 400)))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(elo_expected_win_prob("bad", 1500))

    def test_fail_closed_inf(self):
        self.assertIsNone(elo_expected_win_prob(float("inf"), 1500))

if __name__ == "__main__":
    unittest.main()
