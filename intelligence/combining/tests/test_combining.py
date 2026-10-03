# PROVENANCE — gse-intelligence-build / combining / tests / test_combining.py
# Module tests for the combining package.
#   SYS-04 angular combining (arXiv:2305.16735v2), SYS-16 information-graph
#   audit, SYS-07 afCRPS training + EECRPS (0748/1582).
#   Corpus: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md
#           ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipelines 4, 7)
# Every test FAILS if the module is unimplemented (no skips, no vacuous
# passes). All evaluations run on seeded SYNTHETIC DGPs.
"""Tests for the combining module (angular combining + afCRPS machinery)."""

import math

import numpy as np
import pytest

import combining
import combining.afcrps as C
import combining.angular as A
import combining.audit as AU
import combining.synthetic as S


# ---------------------------------------------------------------------------
# SYS-04 — angular combining
# ---------------------------------------------------------------------------
class TestAngularFallback:
    def test_fallback_theta_is_exactly_67_5(self):
        assert combining.angular_fallback_theta_deg() == 67.5
        assert abs(combining.angular_fallback_theta_deg() - 67.5) < 1e-9


class TestAngularConstruction:
    """The 1550 construction: theta=0 -> horizontal, theta=90 -> vertical."""

    def _normals(self):
        grid = np.linspace(-6, 6, 241)
        F = np.stack([
            S.normal_cdf_grid(grid, mu, sd)
            for mu, sd in [(-0.5, 1.2), (0.3, 0.9), (0.1, 1.5), (-0.2, 1.0)]
        ])
        return grid, F

    def test_theta_90_is_linear_opinion_pool(self):
        grid, F = self._normals()
        w = np.full(4, 0.25)
        got = A.angular_combine(F, grid, 90.0, w)
        want = A.vertical_average(F, w)
        assert np.max(np.abs(got - want)) < 1e-12

    def test_theta_0_is_quantile_averaging(self):
        grid, F = self._normals()
        w = np.full(4, 0.25)
        got = A.angular_combine(F, grid, 0.0, w)
        want = A.horizontal_average(F, grid, w)
        assert np.max(np.abs(got - want)) < 1e-12

    def test_combined_cdf_is_valid(self):
        grid, F = self._normals()
        for th in (10.0, 45.0, 67.5, 80.0):
            c = A.angular_combine(F, grid, th)
            assert np.all(np.diff(c) >= -1e-12), f"CDF not monotone at {th}"
            assert c[0] < 0.01 and c[-1] > 0.99, f"CDF range bad at {th}"

    def test_mean_property(self):
        """Paper result: mean of angular average = average of component means."""
        grid, F = self._normals()
        w = np.full(4, 0.25)
        combined = A.angular_combine(F, grid, 67.5, w)
        mean_combined = A.distribution_mean(combined, grid)
        mean_of_means = float(np.mean(
            [A.distribution_mean(F[i], grid) for i in range(4)]))
        assert abs(mean_combined - mean_of_means) < 1e-3

    def test_variance_ordering(self):
        """Paper result: var(horizontal) <= var(angular) <= var(vertical)."""
        grid, F = self._normals()
        w = np.full(4, 0.25)
        v_h = A.distribution_variance(A.horizontal_average(F, grid, w), grid)
        v_a = A.distribution_variance(A.angular_combine(F, grid, 67.5, w), grid)
        v_v = A.distribution_variance(A.vertical_average(F, w), grid)
        assert v_h <= v_a + 1e-9
        assert v_a <= v_v + 1e-9

    def test_mqs_is_proper_direction(self):
        """MQS of the true distribution beats MQS of a shifted one (sanity)."""
        grid = np.linspace(-6, 6, 241)
        rng = np.random.default_rng(11)
        y = rng.normal(0, 1, 300)
        f_true = S.normal_cdf_grid(grid, 0.0, 1.0)
        f_bad = S.normal_cdf_grid(grid, 1.5, 2.0)
        s_true = np.mean([A.mean_quantile_score(f_true, grid, v) for v in y])
        s_bad = np.mean([A.mean_quantile_score(f_bad, grid, v) for v in y])
        assert s_true < s_bad


class TestAngularGate:
    def test_angular_vs_linear_pool_contract(self):
        res = combining.angular_vs_linear_pool()
        assert res["theta_deg"] == pytest.approx(67.5)
        assert res["mqs_gain_pct"] >= 0.0, (
            f"angular combining lost to the linear pool: {res}")
        assert res["synthetic"] is True

    def test_sys16_audit_is_pre_step(self):
        """The SYS-16 audit must run before the combination is trusted."""
        res = combining.angular_vs_linear_pool()
        audit = res["audit"]
        for key in ("passes", "concentration", "dominant_source",
                    "lemma1_collapse", "recommendation"):
            assert key in audit, f"audit missing {key}"
        assert res["trusted"] == audit["passes"]


# ---------------------------------------------------------------------------
# SYS-16 — information-graph audit
# ---------------------------------------------------------------------------
class TestInformationGraphAudit:
    def test_attention_centrality_hand_computed(self):
        # A uses {s1, s2} (d=2); B uses {s1} (d=1).
        # alpha_s1 = 1/2 + 1/1 - 1 = 0.5; alpha_s2 = 1/2 - 1 = -0.5.
        sets = [{"s1", "s2"}, {"s1"}]
        assert AU.attention_centrality("s1", sets) == pytest.approx(0.5)
        assert AU.attention_centrality("s2", sets) == pytest.approx(-0.5)

    def test_star_topology_fails(self):
        """Star topology (all models on one hub) is the worst case."""
        comps = [
            {"name": f"m{i}",
             "sources": {"vegas_consensus": 0.9, f"own_{i}": 0.1}}
            for i in range(4)
        ]
        audit = AU.information_graph_audit(comps)
        assert audit["dominant_source"] == "vegas_consensus"
        assert audit["concentration"] == pytest.approx(0.9)
        assert audit["passes"] is False
        assert "down-weight" in audit["recommendation"]

    def test_balanced_topology_passes(self):
        comps = [
            {"name": "a", "sources": {"s1": 0.5, "s2": 0.5}},
            {"name": "b", "sources": {"s3": 0.5, "s4": 0.5}},
        ]
        audit = AU.information_graph_audit(comps)
        assert audit["passes"] is True
        assert audit["concentration"] <= 0.5

    def test_lemma1_collapse_flag(self):
        """Identical information everywhere -> pooling rule adds nothing."""
        comps = [
            {"name": "a", "sources": {"hub": 1.0}},
            {"name": "b", "sources": {"hub": 1.0}},
        ]
        audit = AU.information_graph_audit(comps)
        assert audit["lemma1_collapse"] is True
        assert audit["passes"] is False
        assert "simple average" in audit["recommendation"]


# ---------------------------------------------------------------------------
# SYS-07 — afCRPS
# ---------------------------------------------------------------------------
class TestAfcrpsLoss:
    def test_rearrangement_matches_naive(self):
        """Stable positive-terms form == alpha*fCRPS + (1-alpha)*CRPS."""
        rng = np.random.default_rng(3)
        worst = 0.0
        for _ in range(50):
            m = int(rng.integers(2, 17))
            x = rng.normal(size=m)
            y = float(rng.normal())
            a = C.afcrps(x, y)
            b = C.afcrps_naive(x, y)
            worst = max(worst, abs(a - b))
        assert worst < 1e-10

    def test_per_term_nonnegativity(self):
        """fp16 fix: every (j,k) term of the rearrangement is >= 0."""
        rng = np.random.default_rng(5)
        for _ in range(50):
            m = int(rng.integers(2, 17))
            x = rng.normal(size=m)
            y = float(rng.normal())
            eps = (1.0 - C.ALPHA) / m
            d_obs = np.abs(x - y)
            d_pair = np.abs(x[:, None] - x[None, :])
            terms = d_obs[:, None] + d_obs[None, :] - (1.0 - eps) * d_pair
            np.fill_diagonal(terms, 0.0)
            assert np.all(terms >= -1e-12)

    def test_degeneracy_mechanism(self):
        """0748 degeneracy: M-1 members at y, one free member at y+delta.

        Pure fCRPS is invariant in delta (free member unconstrained);
        afCRPS_0.95 penalizes it — the (1-alpha) admixture is doing work.
        """
        y0, M = 1.0, 8
        f_vals, a_vals = [], []
        for d in (0.5, 2.0, 8.0):
            ens = np.array([y0] * (M - 1) + [y0 + d])
            f_vals.append(C.fair_crps(ens, y0))
            a_vals.append(C.afcrps(ens, y0))
        assert max(f_vals) - min(f_vals) < 1e-12, "fCRPS should be flat in delta"
        assert a_vals[0] < a_vals[1] < a_vals[2], "afCRPS must grow with delta"

    def test_alpha_is_0_95(self):
        assert C.ALPHA == 0.95

    def test_crps_known_value(self):
        """CRPS of N(0,1) ensemble -> ~0.564 (sanity on a large sample)."""
        rng = np.random.default_rng(9)
        xs = rng.normal(size=(2000, 64))
        ys = rng.normal(size=2000)
        est = float(np.mean([C.crps(xs[t], ys[t]) for t in range(2000)]))
        assert abs(est - 0.5642) < 0.02


class TestEecrps:
    def test_eecrps_definition(self):
        rng = np.random.default_rng(21)
        x = rng.normal(size=12)
        y = 0.3
        assert C.eecrps(x, y, 0.65) == pytest.approx(0.65 * C.crps(x, y))
        assert C.eecrps(x, y, -0.65) == pytest.approx(0.65 * C.crps(x, y))

    def test_efi_out_of_range_rejected(self):
        with pytest.raises(ValueError):
            C.eecrps(np.ones(8), 0.0, 1.5)

    def test_efi_bands(self):
        assert C.efi_band(0.2) == "normal"
        assert C.efi_band(0.65) == "unusual"
        assert C.efi_band(-0.9) == "very unusual"

    def test_eecrps_ranking_matches_crps_ranking(self):
        """1582 acceptance: EECRPS ranking matches CRPS ranking."""
        rng = np.random.default_rng(33)
        y = rng.normal(size=300)
        ens = [rng.normal(loc=b, scale=s, size=(300, 10))
               for b, s in [(0, 1), (0.5, 1), (0, 2), (-0.7, 1.3), (0.2, 0.8)]]
        efi = 0.65  # unusual
        cr = [float(np.mean([C.crps(e[t], y[t]) for t in range(300)])) for e in ens]
        ee = [float(np.mean([C.eecrps(e[t], y[t], efi) for t in range(300)])) for e in ens]
        assert np.argsort(cr).tolist() == np.argsort(ee).tolist()


class TestEraGuard:
    def test_cross_era_pooling_raises(self):
        rng = np.random.default_rng(44)
        X = rng.normal(size=(100, 8))
        y = rng.normal(size=100)
        era = np.array(["A"] * 50 + ["B"] * 50)
        with pytest.raises(C.CrossEraPoolingError):
            C.fit_pooled_bias_correction(X, y, era)
        # ...but per-era fitting handles mixed eras correctly
        out = C.fit_bias_corrections(X, y, era)
        assert set(out) == {"A", "B"}

    def test_pooled_fit_single_era_ok(self):
        rng = np.random.default_rng(45)
        X = rng.normal(size=(60, 8))
        y = rng.normal(size=60)
        era = np.array(["A"] * 60)
        beta = C.fit_pooled_bias_correction(X, y, era)
        assert beta.shape == (8,)


class TestAfcrpsTrainingGate:
    def test_gate_contract(self):
        res = combining.afcrps_training_check()
        assert res["crps_gain_pct"] >= 2.0, f"afCRPS gate failed: {res}"
        assert res["ensemble_collapse"] is False
        assert isinstance(res["ensemble_collapse"], bool)
        assert res["alpha"] == 0.95
        assert res["M"] == 12
        assert res["era_boundaries_respected"] is True
        assert res["synthetic"] is True

    def test_training_actually_optimizes_afcrps(self):
        """Mean afCRPS on train must drop after fitting corrections."""
        dgp = S.ensemble_dgp(seed=748, m=12, n_train=1500, n_hold=500)
        Xt, yt, et = dgp["X_train"], dgp["y_train"], dgp["era_train"]
        before = float(np.mean([C.afcrps(Xt[t], yt[t]) for t in range(1500)]))
        corr = C.fit_bias_corrections(Xt, yt, et)
        Xc = C.apply_corrections(Xt, corr, et)
        after = float(np.mean([C.afcrps(Xc[t], yt[t]) for t in range(1500)]))
        assert after < before

    def test_stadium_ladder_marked_inference(self):
        """The stadium-variable ladder is a documented INFERENCE lane."""
        spec = combining.stadium_variable_ladder_spec()
        assert spec["status"].startswith("INFERENCE")
        assert "wind speed" in spec["objective"]
        assert "precipitation" in spec["objective"]
        assert "30 stadium neighborhoods" in spec["objective"]
        assert combining.STADIUM_VARIABLE_LADDER["status"].startswith("INFERENCE")
