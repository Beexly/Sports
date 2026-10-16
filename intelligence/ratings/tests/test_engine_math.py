# engine_math tests — self-check that every public function imports and runs,
# plus targeted checks for the fixes made when landing the module
# (math. prefixes, gauss_solve singular guard, Murphy reliability,
# Shin devig on -110/-110 and reduced-juice -105/-105, market_strengths).
#
# Pure stdlib (unittest); also collected by pytest (Test* classes).
# engine_math.py is loaded by file path so this test does not import the
# ratings package __init__ (which pulls numpy for gelo/plusdc).
#
# Run from repo root:  python3 -m unittest intelligence/ratings/tests/test_engine_math.py -v

import importlib.util
import inspect
import math
import os
import unittest

_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "engine_math.py")
_spec = importlib.util.spec_from_file_location("engine_math", _PATH)
em = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(em)

# One valid call per public function. Keep in sync with engine_math.py:
# test_every_public_function_has_a_call fails if a function is added without one.
CALLS = {
    "bt_prob": lambda: em.bt_prob(1600, 1500),
    "elo_update": lambda: em.elo_update(1500, 1500, 1.0),
    "bt_fit": lambda: em.bt_fit([("A", "B"), ("B", "C"), ("C", "A"), ("A", "C")], iters=20),
    "pois": lambda: em.pois(2, 1.4),
    "dc_tau": lambda: em.dc_tau(0, 0, 1.4, 1.1, -0.05),
    "dc_prob": lambda: em.dc_prob(1, 1, 1.4, 1.1),
    "dc_grid": lambda: em.dc_grid(1.4, 1.1),
    "norm_cdf": lambda: em.norm_cdf(0.5),
    "prob_from_american": lambda: em.prob_from_american(-110),
    "amer_from_prob": lambda: em.amer_from_prob(0.6),
    "alt_ladder": lambda: em.alt_ladder(-3.0),
    "skellam_pmf": lambda: em.skellam_pmf(1, 1.4, 1.1),
    "brier_decompose": lambda: em.brier_decompose([(0.2, 0), (0.7, 1), (0.6, 0), (0.9, 1)]),
    "isotonic": lambda: em.isotonic([(0.1, 0), (0.4, 1), (0.5, 0), (0.8, 1)]),
    "kelly_binary": lambda: em.kelly_binary(0.55, -110),
    "kelly_ev_growth": lambda: em.kelly_ev_growth(0.55, -110, 0.02, n=50, trials=5),
    "shin_devig": lambda: em.shin_devig(0.6, 0.45),
    "kalman_ratings": lambda: em.kalman_ratings([("A", "B", 7), ("B", "C", -3), ("C", "A", 10)]),
    "inv_norm": lambda: em.inv_norm(0.975),
    "prop_price": lambda: em.prop_price(250.5, 45.0, 245.5),
    "teaser_mc": lambda: em.teaser_mc(-1.5, 2.5, n=2000),
    "fair": lambda: em.fair(0.55, 0.50),
    "live_repricing": lambda: em.live_repricing(7, 0.5, -3.0),
    "wp_in_game": lambda: em.wp_in_game(7, 0.5),
    "weather_adj": lambda: em.weather_adj(45.5, wind_mph=15, precip="rain"),
    "injury_adj": lambda: em.injury_adj(-3.0, "QB"),
    "situational_adj": lambda: em.situational_adj(-3.0, days_rest_diff=3, tz_shift="we"),
    "phi_pdf": lambda: em.phi_pdf(0.0),
    "crps_gaussian": lambda: em.crps_gaussian(0.0, 1.0, 0.5),
    "pit_histogram": lambda: em.pit_histogram([0, 0, 0], [1, 1, 1], [-1.0, 0.1, 1.2]),
    "deflated_sharpe": lambda: em.deflated_sharpe(0.1, 250, 20),
    "gauss_solve": lambda: em.gauss_solve([[2.0, 1.0], [1.0, 3.0]], [3.0, 5.0]),
    "market_strengths": lambda: em.market_strengths([("A", "B"), ("B", "C"), ("C", "A")], [3.0, -2.0, 1.0]),
    "stack_with_market": lambda: em.stack_with_market(0.6, 0.55, None, 0.3),
    "hmm2_fit": lambda: em.hmm2_fit([-3, -4, -2, 5, 3, 4, 6, -3, -2, -5, 4, 3], iters=10),
}


def _public_functions():
    return sorted(n for n, f in vars(em).items()
                  if inspect.isfunction(f) and f.__module__ == "engine_math" and not n.startswith("_"))


class TestSelfCheck(unittest.TestCase):
    def test_every_public_function_has_a_call(self):
        self.assertEqual(sorted(CALLS), _public_functions())

    def test_every_public_function_runs(self):
        for name in _public_functions():
            with self.subTest(fn=name):
                CALLS[name]()


class TestFixes(unittest.TestCase):
    def test_math_prefixed_functions(self):
        self.assertAlmostEqual(em.phi_pdf(0.0), 1 / math.sqrt(2 * math.pi))
        # CRPS of N(0,1) at its mean = 2*phi(0) - 1/sqrt(pi)
        self.assertAlmostEqual(em.crps_gaussian(0.0, 1.0, 0.0), 2 * em.phi_pdf(0.0) - 1 / math.sqrt(math.pi))
        self.assertAlmostEqual(em.stack_with_market(0.6, 0.6, None, 0.5), 0.6)
        p, sr0 = em.deflated_sharpe(0.1, 250, 20)
        self.assertTrue(0.0 <= p <= 1.0 and sr0 > 0)

    def test_gauss_solve_solution(self):
        x = em.gauss_solve([[2.0, 1.0], [1.0, 3.0]], [3.0, 5.0])
        self.assertAlmostEqual(x[0], 0.8); self.assertAlmostEqual(x[1], 1.4)

    def test_gauss_solve_singular_raises(self):
        with self.assertRaisesRegex(ValueError, "singular"):
            em.gauss_solve([[1.0, 2.0], [2.0, 4.0]], [1.0, 2.0])

    def test_gauss_solve_non_square_raises(self):
        with self.assertRaisesRegex(ValueError, "square"):
            em.gauss_solve([[1.0, 2.0], [2.0, 4.0], [1.0, 0.0]], [1.0, 2.0, 3.0])

    def test_brier_reliability_uses_mean_forecast(self):
        # All forecasts 0.12 in bin [0.1,0.2): perfectly calibrated if outcome rate = 0.12.
        # Midpoint (0.15) would give REL = (0.12-0.15)^2 = 9e-4; Murphy gives 0.
        pairs = [(0.12, 1)] * 3 + [(0.12, 0)] * 22
        bs, rel, res, unc = em.brier_decompose(pairs)
        self.assertAlmostEqual(rel, 0.0)
        self.assertAlmostEqual(bs, rel - res + unc)

    def test_market_strengths_runs_and_fits(self):
        s, fits = em.market_strengths([("A", "B"), ("B", "C"), ("C", "A")], [3.0, -2.0, 1.0])
        self.assertEqual(set(s), {"A", "B", "C"}); self.assertEqual(len(fits), 3)

    def test_teaser_probability_in_range(self):
        r = em.teaser_mc(-1.5, 2.5, n=5000)
        self.assertTrue(0.0 < r["p_win"] < 1.0)


class TestShinDevig(unittest.TestCase):
    def _check_pair(self, a1, a2):
        z, p1, p2 = em.shin_devig(em.prob_from_american(a1), em.prob_from_american(a2))
        self.assertAlmostEqual(p1 + p2, 1.0, places=9)
        self.assertAlmostEqual(p1, 0.5, places=6)
        self.assertAlmostEqual(p2, 0.5, places=6)
        self.assertTrue(0.0 <= z < 1.0)
        return z

    def test_standard_minus110_pair(self):
        self._check_pair(-110, -110)

    def test_reduced_juice_minus105_pair(self):
        z105 = self._check_pair(-105, -105)
        z110 = self._check_pair(-110, -110)
        self.assertLess(z105, z110)  # less overround -> smaller insider share

    def test_unequal_pair_sums_to_one_and_favors_favorite(self):
        pi1, pi2 = em.prob_from_american(-150), em.prob_from_american(130)
        z, p1, p2 = em.shin_devig(pi1, pi2)
        self.assertAlmostEqual(p1 + p2, 1.0, places=9)
        self.assertGreater(p1, pi1 / (pi1 + pi2))  # Shin shifts mass toward the favorite

    def test_no_overround_uses_multiplicative_fallback(self):
        z, p1, p2 = em.shin_devig(0.5, 0.45)
        self.assertEqual(z, 0.0)
        self.assertAlmostEqual(p1, 0.5 / 0.95); self.assertAlmostEqual(p2, 0.45 / 0.95)


if __name__ == "__main__":
    unittest.main()
