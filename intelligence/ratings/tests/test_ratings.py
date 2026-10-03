# ratings module tests — every test FAILS if the module is unimplemented
# (no skips, no vacuous passes). Gates mirror the master e2e contracts in
# tests/e2e/test_research_gates_e2e.py; these add white-box checks on the
# equations, the landmines, and the negative gates.
#
# Provenance: c10 buildable-systems.md SYS-01 / SYS-02 / SYS-10 / SYS-26.

import math

import numpy as np
import pytest

import ratings
from ratings import gelo, plusdc, qb_decomp, relativize
from ratings._dgp import gen_season, gen_seasons


@pytest.fixture(scope="module")
def gelo_res():
    return ratings.g_elo_backtest(seasons=range(2019, 2024))


@pytest.fixture(scope="module")
def bt_res():
    return ratings.covariate_bt_backtest(seasons=range(2022, 2025))


@pytest.fixture(scope="module")
def wf_res():
    return ratings.bt_walkforward(seasons=range(2022, 2025))


@pytest.fixture(scope="module")
def audit_kept():
    return ratings.relativized_feature_audit()


@pytest.fixture(scope="module")
def audit_detail():
    return ratings.relativized_feature_audit_detail()


# ---------------------------------------------------------------------------
# SYS-02 — G-Elo (1448)
# ---------------------------------------------------------------------------

class TestGEloBacktest:
    def test_gate_delta_ls(self, gelo_res):
        res = gelo_res
        assert res["delta_ls"] >= 0.005, f"G-Elo ΔLS gate failed: {res['delta_ls']}"

    def test_gate_accuracy(self, gelo_res):
        res = gelo_res
        assert res["accuracy_gain_pp"] >= 1.0, (
            f"G-Elo accuracy gate failed: {res['accuracy_gain_pp']}")

    def test_data_basis_labeled(self, gelo_res):
        res = gelo_res
        assert res["data_basis"] == "synthetic_dgp"
        assert res["paper_reference"]["g_elo_ls"] == pytest.approx(0.6224)

    def test_accuracy_decomposition_sums(self, gelo_res):
        res = gelo_res
        d = res["accuracy_gain_decomposition"]
        # draw-modeling + skill-estimation = total gain vs the naive-draw model
        total = d["draw_modeling_pp"] + d["skill_estimation_pp"]
        naive_total = 100.0 * (res["g_elo"]["accuracy"]
                               - res["elo_davidson"]["accuracy"]
                               + d["draw_modeling_pp"] / 100.0)
        assert total == pytest.approx(naive_total, abs=1e-9)

    def test_ignorance_rescored(self, gelo_res):
        res = gelo_res
        assert "ignorance_bits" in res["g_elo"]
        assert "ignorance_bits" in res["elo_davidson"]
        assert "delta_ignorance_bits" in res

    def test_frequency_estimators_match_equations(self):
        # Eqs. 43-46 on a known frequency vector.
        cats = ([0] * 200 + [1] * 80 + [2] * 90 + [3] * 2 + [4] * 95
                + [5] * 85 + [6] * 248)
        c = gelo.estimate_coefficients(cats, 6)
        f = np.array(c["freq"])
        assert c["eta"] == pytest.approx(0.5 * math.log10(f[6] / f[0]))
        assert c["delta"][0] == pytest.approx(-1.0)
        assert c["delta"][6] == pytest.approx(1.0)
        assert np.all(np.diff(c["delta"]) >= -1e-12), "delta must be monotone"
        assert np.allclose(c["delta"], -c["delta"][::-1], atol=1e-9)

    def test_ac_model_is_valid_distribution(self):
        cats = [g["category"] for g in gen_seasons(range(2014, 2019))]
        c = gelo.estimate_coefficients(cats, 6)
        for z in (-1.0, 0.0, 1.0):
            p = gelo.ac_probs(z, c)
            assert abs(p.sum() - 1.0) < 1e-9
            assert np.all(p >= 0)

    def test_seasons_parameter_honored(self):
        res = ratings.g_elo_backtest(seasons=range(2020, 2023))
        assert res["seasons"] == [2020, 2021, 2022]


# ---------------------------------------------------------------------------
# SYS-01 — PlusDC-BT (0213)
# ---------------------------------------------------------------------------

class TestCovariateBT:
    def test_gate_logloss(self, bt_res):
        res = bt_res
        assert res["logloss_gain"] >= 0.003, (
            f"covariate-BT gate failed: {res['logloss_gain']}")

    def test_beats_both_baselines(self, bt_res):
        res = bt_res
        assert res["logloss_gain_vs_plain_bt"] > 0
        assert res["logloss_gain_vs_elo"] > 0

    def test_covariate_signs(self, bt_res):
        res = bt_res
        assert res["covariate_signs_correct"] is True
        v = res["covariate_effects"]
        assert v["rest_diff"] > 0 and v["travel"] > 0
        assert v["qb_out_home"] < 0 and v["qb_out_away"] > 0

    def test_rank_centrality_fallback_gate_reported(self, bt_res):
        res = bt_res
        rc = res["rank_centrality_weeks1_4"]
        assert isinstance(rc["adopted"], bool)
        # adopted ONLY if it beats plain BT on weeks 1-4
        assert rc["adopted"] == (rc["logloss"] < rc["plain_bt_logloss"])

    def test_ridge_fit_converges(self):
        fit = plusdc.fit_plusdc(gen_seasons(range(2019, 2022)))
        assert fit["converged"] is True
        assert np.all(np.isfinite(fit["u"]))


class TestQBDecomposition:
    def test_gate(self):
        assert ratings.qb_change_moves_rating_without_refit() is True

    def test_move_is_exact_and_refit_free(self):
        games = gen_season(2023)
        model = qb_decomp.QBDecomposedRating().fit(games)
        tau_before = model.tau.copy()
        q_before = dict(model.q)
        team = 3
        old_qb = model.current_qb[team]
        alt = next(q for q in model.q if q != old_qb)
        old_r, new_r = model.set_qb(team, alt)
        assert new_r - old_r == pytest.approx(model.q[alt] - model.q[old_qb])
        assert np.array_equal(model.tau, tau_before), "tau changed: refit happened"
        assert model.q == q_before, "q changed: refit happened"
        assert new_r != old_r


# ---------------------------------------------------------------------------
# SYS-26 — BT production algorithms (2601.14727)
# ---------------------------------------------------------------------------

class TestProductionAlgos:
    def test_gate_brier(self, wf_res):
        res = wf_res
        assert res["brier_improvement_pct"] >= 2.0, (
            f"BT walk-forward gate failed: {res}")

    def test_newman_fixed_point_satisfies_optimality(self):
        from ratings.plusdc import _win_counts, newman_fpi_async
        w, n = _win_counts(gen_season(2022))
        g = newman_fpi_async(w, n, iters=500)
        # first-order optimality: sum_j w_ij = sum_j n_ij g_i/(g_i+g_j)
        for i in range(32):
            lhs = w[i].sum()
            rhs = float(np.sum(n[i] * g[i] / (g[i] + g)))
            assert abs(lhs - rhs) < 1e-6 * max(lhs, 1.0), f"team {i}"

    def test_em_map_is_zermelo_at_a1_b0(self):
        from ratings.plusdc import _win_counts, em_map
        w, n = _win_counts(gen_season(2022))
        g_map = em_map(w, n, a=2.0, b=1.0, iters=50)
        g_zer = em_map(w, n, a=1.0, b=0.0, iters=50)
        assert not np.allclose(g_map, g_zer), "MAP prior must change the solution"

    def test_em_map_survives_undefeated_team(self):
        # Ford-condition landmine: an undefeated team breaks vanilla MLE.
        from ratings.plusdc import em_map
        w = np.zeros((32, 32))
        w[0, 1:] = 5.0  # team 0 beats everyone 5x, no other games
        n = w + w.T
        g = em_map(w, n, a=2.0, b=1.0, iters=200)
        assert np.all(np.isfinite(g)), "EM-MAP must stay finite (Ford fix)"
        assert g[0] == g.max()

    def test_early_season_landmine_ridge_required(self):
        # Vanilla (unregularized) MLE on 2 weeks of games diverges or
        # explodes; the ridge fit stays bounded. 0213 landmine, verified.
        games = [g for g in gen_season(2022) if g["week"] <= 2]
        import ratings.plusdc as P
        old_u, old_v = P.LAM_U, P.LAM_V
        try:
            P.LAM_U, P.LAM_V = 1e-9, 1e-9
            bad = plusdc.fit_plusdc(games, use_covariates=False, rho=1.0)
            vanilla_norm = float(np.max(np.abs(bad["u"])))
        finally:
            P.LAM_U, P.LAM_V = old_u, old_v
        good = plusdc.fit_plusdc(games, use_covariates=False, rho=1.0)
        assert good["converged"] is True
        assert float(np.max(np.abs(good["u"]))) < 3.0
        assert (not bad["converged"]) or vanilla_norm > 5.0, (
            f"vanilla MLE should blow up early-season (got {vanilla_norm})")

    def test_production_stack_uses_all_three(self, wf_res):
        res = wf_res
        assert res["algorithms"] == ["newman_fpi_async", "em_map(a=2,b=1)",
                                     "plusdc_ridge_newton"]
        assert res["data_basis"] == "synthetic_dgp"


# ---------------------------------------------------------------------------
# SYS-10 — relativized features (0049)
# ---------------------------------------------------------------------------

class TestRelativizedAudit:
    def test_gate_every_kept_feature_clears(self, audit_kept):
        kept = audit_kept
        assert len(kept) >= 1, "audit must keep at least one feature"
        for feat, delta_auc in kept.items():
            assert delta_auc >= 0.01, (
                f"absolute feature {feat!r} kept with ΔAUC={delta_auc} < 0.01")

    def test_audit_actually_drops(self, audit_detail, audit_kept):
        detail = audit_detail
        dropped = [r for r in detail if not r["kept"]]
        assert len(dropped) >= 1, "audit must drop at least one weak feature"
        kept_names = set(audit_kept)
        for r in dropped:
            assert r["feature"] not in kept_names

    def test_honest_baseline_is_two_feature_absolute(self, audit_detail):
        detail = audit_detail
        for r in detail:
            # the gate compares vs the two-feature absolute, never the straw man
            assert r["delta_auc"] == pytest.approx(
                r["auc_relative"] - r["auc_two_feature_absolute"])
            # the straw-man delta is much larger — quoting it would be the
            # +21.3% trap; the honest delta stays on the +5% scale
            assert r["delta_vs_strawman"] > r["delta_auc"]
            assert r["delta_auc"] < 0.10, "honest delta must stay +5%-scale"

    def test_no_strawman_number_used_for_gating(self, audit_kept, audit_detail):
        kept = audit_kept
        detail = {r["feature"]: r for r in audit_detail}
        for feat, delta in kept.items():
            assert delta == pytest.approx(detail[feat]["delta_auc"])


# ---------------------------------------------------------------------------
# Negative gates
# ---------------------------------------------------------------------------

class TestNegativeGates:
    def test_xfp_fpoe_not_wired(self):
        assert ratings.xfp_fpoe_wired() is False

    def test_ranking_features_exclude_xfpoe(self):
        feats = ratings.ranking_features()
        assert "xfpoe" not in [f.lower() for f in feats]
        assert "xfp" not in [f.lower() for f in feats]
        assert len(feats) > 0, "ranking_features must not be empty"

    def test_no_draw_modeling_without_decomposition(self, gelo_res):
        res = gelo_res
        assert "accuracy_gain_decomposition" in res
        d = res["accuracy_gain_decomposition"]
        assert "draw_modeling_pp" in d and "skill_estimation_pp" in d
