import math
import os
import random
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "intelligence", "ratings"))
import engine_math as em
import hybrid_crps as hc


class TestMeanPreservation(unittest.TestCase):
    def test_hybrid_mean_equals_mu_within_1e12(self):
        rnd = random.Random(11)
        for _ in range(100):
            mu = rnd.uniform(-20, 20)
            p3 = rnd.uniform(0.0, 0.10)
            p7 = rnd.uniform(0.0, 0.05)
            m = hc.hybrid_mean(mu, p3, p7)
            self.assertLessEqual(abs(m - mu), 1e-12,
                                 f"mu={mu} p3={p3} p7={p7} got {m!r}")

    def test_hybrid_mean_pure_gaussian_limit(self):
        self.assertAlmostEqual(hc.hybrid_mean(-4.25, 0.0, 0.0), -4.25, places=15)


class TestPureGaussianLimit(unittest.TestCase):
    def test_matches_crps_gaussian_on_200_draws(self):
        rnd = random.Random(5)
        worst = 0.0
        for _ in range(200):
            mu = rnd.uniform(-14, 14)
            sd = rnd.uniform(8.0, 20.0)
            y = rnd.gauss(mu, sd)
            got = hc.crps_energy(mu, sd, 0.0, 0.0, y)
            want = em.crps_gaussian(mu, sd, y)
            worst = max(worst, abs(got - want))
        self.assertLessEqual(worst, 1e-12, f"worst abs diff {worst!r}")

    def test_matches_on_frozen_filter_subsample(self):
        from load_filter import load_filter
        rows, _ = load_filter()
        # Deterministic stride subsample of >= 200 games. game_id ends with a team
        # abbreviation, so filter on position instead of the trailing character.
        sub = rows[:: max(1, len(rows) // 200)][:200]
        self.assertGreaterEqual(len(sub), 200)
        worst = 0.0
        for g in sub:
            got = hc.crps_energy(g["spread"], 13.45, 0.0, 0.0, g["margin"])
            want = em.crps_gaussian(g["spread"], 13.45, g["margin"])
            worst = max(worst, abs(got - want))
        self.assertLessEqual(worst, 1e-12, f"worst abs diff {worst!r}")


class TestPureAtomLimit(unittest.TestCase):
    def test_symmetric_pair_matches_known_discrete_crps(self):
        # p3 = 1, p7 = 0 => pc = 0. Mass 0.5 at mu+3, 0.5 at mu-3.
        # E|X-y| = 0.5*|mu+3-y| + 0.5*|mu-3-y|
        # E|X-X'| = 0.25*|(+3)-(-3)| * 2 = 3.0
        # CRPS = E|X-y| - 0.5*E|X-X'| = E|X-y| - 1.5
        for mu, y in [(0.0, 3.0), (7.5, 1.0), (-4.0, 11.0), (2.0, 2.0), (0.0, 0.0)]:
            e_abs = 0.5 * abs(mu + 3 - y) + 0.5 * abs(mu - 3 - y)
            self.assertAlmostEqual(hc.crps_energy(mu, 1.0, 1.0, 0.0, y),
                                   e_abs - 1.5, places=9)

    def test_four_atoms_no_continuous(self):
        # p3 = 0.4, p7 = 0.6 => pc = 0. Reference by explicit enumeration.
        mu, y = 1.5, -2.0
        locs = [(3.0, 0.2), (-3.0, 0.2), (7.0, 0.3), (-7.0, 0.3)]
        e_abs = sum(p * abs(mu + k - y) for k, p in locs)
        e_xx = sum(pi * pj * abs(ki - kj) for ki, pi in locs for kj, pj in locs)
        self.assertAlmostEqual(hc.crps_energy(mu, 9.0, 0.4, 0.6, y),
                               e_abs - 0.5 * e_xx, places=9)

    def test_pair_around_zero_scored_at_zero(self):
        # By hand: E|X| = 3, E|X-X'| = 3, CRPS = 3 - 1.5 = 1.5.
        self.assertAlmostEqual(hc.crps_energy(0.0, 1.0, 1.0, 0.0, 0.0), 1.5, places=9)


class TestDeterminism(unittest.TestCase):
    def test_repeated_calls_bit_identical(self):
        """The energy form is closed-form, so repeated calls must be bit-identical.
        There is no Monte-Carlo term, so estimator variance is exactly zero."""
        vals = [hc.crps_energy(3.0, 13.45, 0.147, 0.085, -4.0) for _ in range(50)]
        self.assertEqual(len(set(vals)), 1)


class TestInputGuards(unittest.TestCase):
    def test_rejects_excess_over_one(self):
        with self.assertRaises(ValueError):
            hc.crps_energy(0.0, 13.45, 0.8, 0.4, 0.0)

    def test_rejects_negative_mass(self):
        with self.assertRaises(ValueError):
            hc.crps_energy(0.0, 13.45, -0.1, 0.0, 0.0)

    def test_rejects_nonpositive_sd(self):
        with self.assertRaises(ValueError):
            hc.crps_energy(0.0, 0.0, 0.0, 0.0, 0.0)


if __name__ == "__main__":
    unittest.main()
