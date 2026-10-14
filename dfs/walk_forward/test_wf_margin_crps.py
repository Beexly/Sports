import json, math, os, sys, tempfile, time, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wf_margin_crps as w


def _mid(f, a, b, n):
    h = (b - a) / n
    return h * sum(f(a + (i + 0.5) * h) for i in range(n))


def numeric_crps(cdf, x, lo, hi, n=100000):
    """Integral of (F(z) - 1{z>=x})^2, split at x so the step never sits inside a cell."""
    return _mid(lambda z: cdf(z) ** 2, lo, x, n) + _mid(lambda z: (1 - cdf(z)) ** 2, x, hi, n)


class TestLaplace(unittest.TestCase):
    def test_crps_laplace_vs_integration(self):
        for mu, b, x in [(3.0, 10.0, 7.0), (-6.5, 11.6, 14.0), (0.0, 7.512, 0.0)]:
            num = numeric_crps(lambda z: w.laplace_cdf(z, mu, b), x, mu - 40 * b, mu + 40 * b)
            self.assertAlmostEqual(w.crps_laplace(mu, b, x), num, places=4)

    def test_crps_gaussian_import_vs_integration(self):
        cdf = lambda z: 0.5 * (1 + math.erf((z - 2.5) / (13.45 * math.sqrt(2))))
        self.assertAlmostEqual(w.crps_gaussian(2.5, 13.45, -4.0), numeric_crps(cdf, -4.0, -200, 200), places=4)

    def test_cdf_formula(self):
        mu, b = 3.0, 11.0
        self.assertAlmostEqual(w.laplace_cdf(-5.0, mu, b), 0.5 * math.exp(-8.0 / 11.0))
        self.assertAlmostEqual(w.laplace_cdf(10.0, mu, b), 1 - 0.5 * math.exp(-7.0 / 11.0))
        self.assertAlmostEqual(w.laplace_cdf(mu, mu, b), 0.5)

    def test_p_cover_half(self):
        for s in (-14.0, -3.0, 0.0, 2.5, 7.0):
            self.assertEqual(w.p_cover(s, 12.0), 0.5)

    def test_p_home_win(self):
        self.assertAlmostEqual(w.p_home_win(3.0, 11.0), 1 - 0.5 * math.exp(-3.0 / 11.0))
        self.assertAlmostEqual(w.p_home_win(0.0, 11.0), 0.5)


class TestFailClosed(unittest.TestCase):
    def test_missing_field_stops(self):
        d = {"observed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
             "manifest_rows": [{"game_id": "x", "season": 2023, "week": 1, "spread_line": 3.0,
                                "total_line": 44.0, "home_score": 20, "away_score": None}]}
        p = os.path.join(tempfile.mkdtemp(), "m.json"); json.dump(d, open(p, "w"))
        with self.assertRaises(w.FailClosed):
            w.run(p, p + ".out", ledger=False)


if __name__ == "__main__":
    unittest.main()


import numpy as np
import wf_models as m


class TestNewFamilies(unittest.TestCase):
    P = {"laplace_mixture_2": {"pi": 0.3, "b1": 5.0, "b2": 13.0},
         "student_t": {"nu": 4.0, "scale": 11.0},
         "normal_mixture_2": {"pi": 0.15, "s1": 3.0, "s2": 13.5},
         "gaussian_fitted_sigma": {"sigma": 12.7}}

    def _cdfs(self):
        for k, p in self.P.items():
            yield k, m.CONT[k][1](p)

    def test_numeric_crps_matches_closed_form(self):
        for mu, b, x in [(3.0, 10.0, 7.0), (-6.5, 11.6, 14.0), (2.5, 9.0, 2.5)]:
            self.assertAlmostEqual(m.crps_numeric(lambda y: m.cdf_laplace(y - mu, b), x), w.crps_laplace(mu, b, x), places=3)
        for mu, s, x in [(2.5, 13.45, -4.0), (-7.0, 13.45, 20.0), (0.0, 12.7, 0.0)]:
            self.assertAlmostEqual(m.crps_numeric(lambda y: m.cdf_normal(y - mu, s), x), w.crps_gaussian(mu, s, x), places=3)

    def test_mixture_closed_form(self):
        # E|X-y| - 0.5 E|X-X'| for a two-Laplace mixture centered at 0
        pi, b1, b2, y = 0.3, 5.0, 13.0, 6.0
        ea = lambda b: abs(y) + b * math.exp(-abs(y) / b)
        exx = lambda a, b: (a * a + a * b + b * b) / (a + b)
        cf = pi * ea(b1) + (1 - pi) * ea(b2) - 0.5 * (pi * pi * exx(b1, b1) + 2 * pi * (1 - pi) * exx(b1, b2) + (1 - pi) ** 2 * exx(b2, b2))
        num = m.crps_numeric(lambda z: m.cdf_lap_mix(z, self.P["laplace_mixture_2"]), y)
        self.assertAlmostEqual(num, cf, places=3)

    def test_monotone_median_cover(self):
        z = np.linspace(-80, 80, 4001)
        for k, c in self._cdfs():
            F = c(z)
            self.assertTrue(np.all(np.diff(F) >= -1e-12), k)
            self.assertAlmostEqual(float(c(np.array([0.0]))[0]), 0.5, places=6, msg=k)   # F(mu)=0.5 = P(cover)
            self.assertLess(F[0], 0.02, k); self.assertGreater(F[-1], 0.98, k)

    def test_t_cdf_reference(self):
        self.assertAlmostEqual(m.t_cdf_std(1.0, 5.0), 0.8183912662, places=8)
        self.assertAlmostEqual(m.t_cdf_std(-2.0, 3.0), 0.0696629842, places=8)

    def test_fits_recover(self):
        rng = np.random.default_rng(0)
        r = rng.standard_t(6, 20000) * 11.0
        f = m.fit_t(r); self.assertTrue(4 <= f["nu"] <= 10); self.assertAlmostEqual(f["scale"], 11.0, delta=0.5)
        r = np.where(rng.random(20000) < 0.2, rng.normal(0, 3, 20000), rng.normal(0, 13, 20000))
        f = m.fit_norm_mix(r); self.assertAlmostEqual(f["pi"], 0.2, delta=0.04); self.assertAlmostEqual(f["s1"], 3, delta=0.5)

    def test_key_probs_symmetric(self):
        pk = m.key_probs([3, -3, 3, 7, 0, 10, -7, 1])
        self.assertAlmostEqual(pk[3], 3 / 8 / 2); self.assertAlmostEqual(pk[-3], 3 / 8 / 2)
        self.assertAlmostEqual(pk[7], 2 / 8 / 2); self.assertAlmostEqual(pk[-7], 2 / 8 / 2)

    def test_hybrid_cdf(self):
        pk = {3: 0.07, -3: 0.08, 7: 0.04, -7: 0.04}
        c = lambda z: m.cdf_normal(z, 13.45)
        mu = -2.5
        F = lambda y: float(m.hybrid_cdf(np.array([y]), mu, c, pk)[0])
        for k, p in pk.items():
            self.assertAlmostEqual(F(k) - F(k - 1e-9), p, places=6)
        cont = 1 - sum(pk.values())
        self.assertAlmostEqual(F(mu), cont * 0.5 + pk[-3] + pk[-7], places=6)   # P(cover) not 0.5 in general
        ys = np.linspace(-60, 60, 2001); Fs = m.hybrid_cdf(ys, mu, c, pk)
        self.assertTrue(np.all(np.diff(Fs) >= 0)); self.assertAlmostEqual(float(Fs[-1]), 1.0, places=4)
