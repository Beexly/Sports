import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score_hybrid as sh


def _frozen():
    from load_filter import load_filter
    games, _ = load_filter()
    return sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))


class TestLeak(unittest.TestCase):
    def test_prior_only_not_better_than_leaky(self):
        """Prior-only beta must not beat the leaky all-data beta by more than noise."""
        games = _frozen()
        prior = sh.score(games, leak=False)
        leaky = sh.score(games, leak=True)
        self.assertEqual(prior["n"], 2462)
        self.assertAlmostEqual(prior["gaussian_crps"], 7.154021, places=5)
        # Leaky is allowed to be better; prior-only must not be better than leaky.
        self.assertGreaterEqual(prior["hybrid_crps"], leaky["hybrid_crps"] - 1e-9)

    def test_one_week_shift_placebo(self):
        """Shifting the scored window by one week must not materially improve CRPS."""
        a = sh.score(_frozen(), leak=False)
        shifted = [g for g in _frozen() if not (g["season"] == 2017 and g["week"] == 1)]
        b = sh.score(shifted, leak=False)
        self.assertLessEqual(abs(a["hybrid_crps"] - b["hybrid_crps"]), 0.05)

    def test_last_week_perturbation_is_inert(self):
        """Perturbing the final week's margins must not change any earlier score."""
        games = _frozen()
        last_season = max(g["season"] for g in games)
        last_week = max(g["week"] for g in games if g["season"] == last_season)
        base = sh.score(games, leak=False)
        pert = []
        for g in games:
            g2 = dict(g)
            if (g2["season"], g2["week"]) == (last_season, last_week):
                g2["margin"] = g2["margin"] + 1000.0
            pert.append(g2)
        after = sh.score(pert, leak=False)
        self.assertAlmostEqual(base["hybrid_crps"], after["hybrid_crps"], places=9)


class TestFrozenFilter(unittest.TestCase):
    def test_n_and_baseline_are_locked(self):
        res = sh.score(_frozen(), leak=False)
        self.assertEqual(res["n"], 2462)
        self.assertAlmostEqual(res["gaussian_crps"], 7.154021, places=5)

    def test_passed_is_always_false(self):
        for leak in (False, True):
            self.assertIs(sh.score(_frozen(), leak=leak)["passed"], False)

    def test_mu_is_never_fitted(self):
        res = sh.score(_frozen(), leak=False)
        self.assertEqual(res["mu"], "spread_line")


if __name__ == "__main__":
    unittest.main()
