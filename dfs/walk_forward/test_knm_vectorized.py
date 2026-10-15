#!/usr/bin/env python3
"""test_knm_vectorized.py -- guards for the vectorized walk-forward.

The two most important tests here pin the bugs that were in the handed-over
implementation, because both failed SILENTLY and would have produced a
plausible-looking number rather than an error.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import numpy as np
import knm_vectorized as kv


class TestCumulativeFallbackCounters(unittest.TestCase):
    """BUG 1 REGRESSION GUARD.

    The handed-over PriorStore incremented only the full (rest, spread, total)
    key. The coarser keys never accumulated, so the fallback ladder was dead:
    every game fell through to 'pure_gaussian' and the hybrid silently collapsed
    onto the Gaussian. Nothing raised; the delta just looked like "no effect".
    """

    def test_coarse_levels_accumulate(self):
        store = kv.PriorStore()
        for _ in range(40):
            store.add(3.0, rest=0.5, spread=2.0, total=44.0)
        # full cell
        p3, p7, lvl = store.excess(0.5, 2.0, 44.0)
        self.assertEqual(lvl, "rest_spread_total")
        self.assertAlmostEqual(p3, 1.0, places=9)
        # coarsening the total must still find the cell, proving the counter exists
        p3b, p7b, lvlb = store.excess(0.5, 2.0, 70.0)
        self.assertEqual(lvlb, "rest_spread")
        self.assertAlmostEqual(p3b, 1.0, places=9)

    def test_rest_only_and_global_levels_accumulate(self):
        store = kv.PriorStore()
        for _ in range(40):
            store.add(7.0, rest=0.5, spread=2.0, total=44.0)
        _, _, lvl_rest = store.excess(0.5, 99.0, 99.0)
        self.assertEqual(lvl_rest, "rest")
        _, _, lvl_glob = store.excess(9.9, 99.0, 99.0)
        self.assertEqual(lvl_glob, "global")

    def test_global_counts_every_game(self):
        store = kv.PriorStore()
        for i in range(40):
            store.add(float(i % 9 - 4), rest=(i % 4) / 4.0,
                      spread=float(i), total=40.0 + i)
        n = store.counts.get((-1, -1, -1), 0)
        self.assertEqual(n, 40, "global counter must see every added game")

    def test_ladder_falls_through_when_thin(self):
        store = kv.PriorStore()
        for _ in range(5):
            store.add(3.0, rest=0.5, spread=2.0, total=44.0)
        p3, p7, lvl = store.excess(0.5, 2.0, 44.0)
        self.assertEqual(lvl, "pure_gaussian")
        self.assertEqual((p3, p7), (0.0, 0.0))


class TestCellPartitionsAreRepoStandard(unittest.TestCase):
    """BUG 2 REGRESSION GUARD.

    The handed-over version rounded |spread| to 0..20 and total to 30..70, i.e.
    21 x 41 = 861 cells over 2462 games. That guarantees sparse cells. The repo
    already defines SPREAD_EDGES/TOTAL_EDGES; reuse them rather than inventing a
    second, finer binning.
    """

    def test_spread_buckets_are_coarse(self):
        self.assertEqual(kv._bucket_spread(2.0), 0)
        self.assertEqual(kv._bucket_spread(5.0), 1)
        self.assertEqual(kv._bucket_spread(20.0), 2)
        self.assertLessEqual(kv._bucket_spread(100.0), len(kv.SPREAD_EDGES))

    def test_total_buckets_are_coarse(self):
        self.assertEqual(kv._bucket_total(38.0), 0)
        self.assertEqual(kv._bucket_total(43.0), 1)
        self.assertEqual(kv._bucket_total(60.0), 3)
        self.assertEqual(kv._bucket_total(None), -1)

    def test_number_of_cells_is_small(self):
        n_rest = 4
        n_cells = n_rest * (len(kv.SPREAD_EDGES) + 1) * (len(kv.TOTAL_EDGES) + 1)
        self.assertLessEqual(n_cells, 64, f"{n_cells} cells is too fine for n=2462")


class TestMeanPreservation(unittest.TestCase):
    def test_100_random_draws_within_1e12(self):
        import random
        rnd = random.Random(7)
        worst = 0.0
        for _ in range(100):
            mu = rnd.uniform(-20, 20)
            p3 = rnd.uniform(0.0, 0.25)
            p7 = rnd.uniform(0.0, 0.12)
            worst = max(worst, abs(kv.hybrid_mean(mu, p3, p7) - mu))
        self.assertLessEqual(worst, 1e-12)


class TestPureGaussianLimit(unittest.TestCase):
    def test_vectorized_matches_energy_form_to_1e12(self):
        import random
        rnd = random.Random(11)
        worst = 0.0
        for _ in range(200):
            mu = rnd.uniform(-14, 14)
            sd = rnd.uniform(8.0, 20.0)
            y = rnd.gauss(mu, sd)
            a = float(kv.crps_gaussian(y, mu, sd))
            # hybrid_crps signature is (mu, sd, p3, p7, y) -- observation LAST.
            b = kv.hc.crps_energy(mu, sd, 0.0, 0.0, y)
            worst = max(worst, abs(a - b))
        self.assertLessEqual(worst, 1e-12, f"worst {worst!r}")

    def test_array_broadcast(self):
        y = np.array([0.0, 3.0, -10.0])
        out = kv.crps_gaussian(y, 2.5, 13.45)
        self.assertEqual(out.shape, (3,))
        for i in range(3):
            self.assertAlmostEqual(float(out[i]),
                                   kv.hc.crps_energy(2.5, 13.45, 0.0, 0.0, float(y[i])),
                                   places=9)


class TestBetaFitIsVectorizedAndBounded(unittest.TestCase):
    def _priors(self, n, beta_true, seed=3):
        import random
        rnd = random.Random(seed)
        out = []
        for _ in range(n):
            rest = rnd.choice([0.0, 0.5, 1.0])
            sd = 13.45 * np.exp(beta_true * rest)
            out.append({"y": rnd.gauss(0.0, sd), "mu": 0.0, "rest": rest})
        return out

    def test_recovers_negative_beta(self):
        grid = np.linspace(-0.28, 0.0, 121)
        b = kv.fit_beta_vectorized(self._priors(400, -0.20), grid)
        self.assertLess(b, -0.05)

    def test_respects_bound(self):
        grid = np.linspace(-0.28, 0.0, 121)
        b = kv.fit_beta_vectorized(self._priors(400, -0.60), grid)
        self.assertLessEqual(b, 0.28 + 1e-12)

    def test_thin_history_returns_zero(self):
        self.assertEqual(kv.fit_beta_vectorized([], np.linspace(-0.28, 0.0, 121)), 0.0)
        self.assertEqual(
            kv.fit_beta_vectorized(self._priors(10, -0.2), np.linspace(-0.28, 0.0, 121)),
            0.0)


class TestNoLookahead(unittest.TestCase):
    def test_priors_update_only_after_block_scored(self):
        """A game's own outcome must not be visible when it is scored."""
        from load_filter import load_filter
        games, _ = load_filter()
        games = sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))
        prior = kv.PriorStore()
        n_before = prior.n
        # simulate: score a block, THEN add it
        block = games[:16]
        for g in block:
            prior.excess(g["home_rest"] and (abs(g["home_rest"] - g["away_rest"]) / 7.0),
                         g["spread"], g.get("total_line"))
        self.assertEqual(prior.n, n_before, "excess() must never mutate the store")
        for g in block:
            prior.add(g["margin"] - g["spread"],
                      abs(g["home_rest"] - g["away_rest"]) / 7.0,
                      g["spread"], g.get("total_line"))
        self.assertEqual(prior.n, len(block))


if __name__ == "__main__":
    unittest.main()
