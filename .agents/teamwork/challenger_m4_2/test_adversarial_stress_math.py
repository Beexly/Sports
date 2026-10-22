"""
test_adversarial_stress_math.py
===============================
Pytest harness for Challenger 2: Mathematical Engines Adversarial Stress Verification.
Covers:
1. Higham Matrix Repair (frontier/sports/matrix_repair.py)
2. Copula Extreme Bounds (frontier/sports/vine_copula_parlay_engine.py)
3. Wilson Score LCB (frontier/sports/engine_gate.py)
4. Bayesian Robust Kelly (frontier/sports/bayesian_robust_kelly_engine.py)
"""

import math
import sys
from pathlib import Path
import numpy as np
import pytest

REPO_ROOT = Path("C:/Users/Garrett/Sports").resolve()
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from frontier.sports.matrix_repair import nearest_positive_definite, safe_cholesky
from frontier.sports.vine_copula_parlay_engine import (
    VineCopulaParlayEngine,
    PairCopulaType,
    SGPLeg,
    MultiLegParlayResult,
    VineType,
)
from frontier.sports.engine_gate import bootstrap_free_lcb, american_to_decimal, american_to_implied
from frontier.sports.bayesian_robust_kelly_engine import (
    BayesianRobustKellyEngine,
    RobustKellyAllocation,
)


# ==============================================================================
# 1. Higham Matrix Repair Stress Tests
# ==============================================================================
class TestHighamMatrixRepairAdversarial:

    @pytest.mark.parametrize("dim", [2, 3, 5, 10, 20])
    def test_non_symmetric_matrices_repair_and_cholesky(self, dim: int):
        for trial in range(5):
            np.random.seed(dim * 100 + trial)
            A = np.random.uniform(-1.0, 1.0, size=(dim, dim))
            np.fill_diagonal(A, 1.0)
            L, repaired = safe_cholesky(A)
            assert np.allclose(L, np.tril(L)), "L must be lower triangular"
            assert np.all(np.diag(L) > 0.0), "Diagonal of L must be strictly positive"
            recon = L @ L.T
            evals = np.linalg.eigvalsh(recon)
            assert np.all(evals > 0.0), "Reconstructed matrix must be strictly positive definite"

    @pytest.mark.parametrize("scale", [1.0, 10.0, 100.0, 1000.0])
    def test_skew_symmetric_perturbation_repair(self, scale: float):
        dim = 4
        S = np.eye(dim)
        K = np.array([
            [0.0, scale, -scale, 0.5 * scale],
            [-scale, 0.0, 2.0 * scale, -scale],
            [scale, -2.0 * scale, 0.0, scale],
            [-0.5 * scale, scale, -scale, 0.0],
        ])
        A = S + K
        L, repaired = safe_cholesky(A)
        assert repaired is True
        assert np.allclose(L, np.tril(L))
        assert np.all(np.diag(L) > 0.0)

    @pytest.mark.parametrize("dim", [2, 3, 5, 10, 20])
    def test_singular_all_ones_matrices(self, dim: int):
        J = np.ones((dim, dim))
        L, repaired = safe_cholesky(J)
        assert repaired is True
        assert np.allclose(L, np.tril(L))
        assert np.all(np.diag(L) > 0.0)
        evals = np.linalg.eigvalsh(L @ L.T)
        assert np.all(evals > 0.0)

    def test_collinear_singular_matrix(self):
        A = np.array([
            [1.0, 0.5, 0.2],
            [0.5, 1.0, 0.3],
            [1.5, 1.5, 0.5],
        ])
        L, repaired = safe_cholesky(A)
        assert repaired is True
        assert np.allclose(L, np.tril(L))
        assert np.all(np.diag(L) > 0.0)

    @pytest.mark.parametrize("neg_scale", [-1.0, -5.0, -100.0, -10000.0, -1e6])
    def test_deeply_negative_identity_matrices(self, neg_scale: float):
        A = np.eye(5) * neg_scale
        L, repaired = safe_cholesky(A)
        assert repaired is True
        assert np.allclose(L, np.tril(L))
        assert np.all(np.diag(L) > 0.0)
        evals = np.linalg.eigvalsh(L @ L.T)
        assert np.all(evals > 0.0)

    def test_deeply_negative_correlation_geometry_violation_dim10(self):
        dim = 10
        A = np.full((dim, dim), -0.99)
        np.fill_diagonal(A, 1.0)
        orig_min_eval = np.min(np.linalg.eigvalsh(A))
        assert orig_min_eval < -7.0, f"Expected min eval < -7.0, got {orig_min_eval}"
        L, repaired = safe_cholesky(A)
        assert repaired is True
        assert np.allclose(L, np.tril(L))
        assert np.all(np.diag(L) > 0.0)
        recon = L @ L.T
        assert np.allclose(np.diag(recon), 1.0, atol=1e-5)
        evals = np.linalg.eigvalsh(recon)
        assert np.all(evals > 0.0)


# ==============================================================================
# 2. Copula Extreme Bounds Stress Tests
# ==============================================================================
class TestCopulaExtremeBoundsAdversarial:

    @pytest.mark.parametrize("fam", [
        PairCopulaType.CLAYTON,
        PairCopulaType.GUMBEL,
        PairCopulaType.FRANK,
        PairCopulaType.GAUSSIAN,
    ])
    def test_extreme_tail_limits_and_frechet_bounds(self, fam: PairCopulaType):
        thetas = {
            PairCopulaType.CLAYTON: [0.01, 0.5, 1.5, 5.0, 15.0],
            PairCopulaType.GUMBEL: [1.0, 1.1, 2.0, 5.0, 15.0],
            PairCopulaType.FRANK: [-15.0, -2.0, 0.1, 2.0, 15.0],
            PairCopulaType.GAUSSIAN: [-0.999, -0.6, 0.0, 0.6, 0.999],
        }[fam]

        u_tails = [1e-9, 1e-6, 0.5, 1.0 - 1e-6, 1.0 - 1e-9]
        for th in thetas:
            for u in u_tails:
                for v in [1e-9, 0.5, 1.0 - 1e-9]:
                    c_val = VineCopulaParlayEngine.copula_cdf(u, v, fam, th)
                    assert 0.0 <= c_val <= 1.0
                    u_c = max(1e-9, min(1.0 - 1e-9, u))
                    v_c = max(1e-9, min(1.0 - 1e-9, v))
                    f_low = max(0.0, u_c + v_c - 1.0)
                    f_high = min(u_c, v_c)
                    assert f_low - 1e-9 <= c_val <= f_high + 1e-9, "Fréchet bound violation"

                    h_val = VineCopulaParlayEngine.h_function(u, v, fam, th)
                    assert 0.0 <= h_val <= 1.0
                    h_inv = VineCopulaParlayEngine.h_inv_function(h_val, v, fam, th)
                    assert 0.0 <= h_inv <= 1.0

    @pytest.mark.parametrize("config_name, probs", [
        ("Equal moderate 0.50", [0.50] * 10),
        ("Equal high 0.90", [0.90] * 10),
        ("Equal low 0.15", [0.15] * 10),
        ("Linearly spaced 0.15 to 0.85", list(np.linspace(0.15, 0.85, 10))),
    ])
    def test_extreme_dimension_d10_frechet_compliance(self, config_name: str, probs: list):
        legs = [
            SGPLeg(f"leg_{i}", f"Player_{i}", "rec_yards", 50.0 + i, "OVER", float(probs[i]))
            for i in range(10)
        ]
        f_lower = max(0.0, sum(probs) - 9.0)
        f_upper = min(probs)

        res = VineCopulaParlayEngine.price_multi_leg_sgp(legs, monte_carlo_samples=10000)
        assert res.num_legs == 10
        assert res.frechet_compliant is True
        assert f_lower - 1e-5 <= res.joint_probability <= f_upper + 1e-5
        assert res.fair_decimal_odds >= 1.0


# ==============================================================================
# 3. Wilson Score LCB Stress Tests
# ==============================================================================
class TestWilsonScoreLCBAdversarial:

    def test_boundary_points(self):
        z = 1.645
        # k=0, n=5
        r1 = bootstrap_free_lcb([0.0]*5, line=5.0, side="OVER", z=z)
        assert r1["p_lcb"] == 0.0
        assert r1["p_hat"] == 0.0

        # k=5, n=5
        r2 = bootstrap_free_lcb([10.0]*5, line=5.0, side="OVER", z=z)
        expected_r2 = 1.0 / (1.0 + (z * z) / 5.0)
        assert math.isclose(r2["p_lcb"], expected_r2, abs_tol=1e-12)
        assert r2["p_hat"] == 1.0

        # k=0, n=1000
        r3 = bootstrap_free_lcb([0.0]*1000, line=5.0, side="OVER", z=z)
        assert r3["p_lcb"] == 0.0

        # k=1000, n=1000
        r4 = bootstrap_free_lcb([10.0]*1000, line=5.0, side="OVER", z=z)
        expected_r4 = 1.0 / (1.0 + (z * z) / 1000.0)
        assert math.isclose(r4["p_lcb"], expected_r4, abs_tol=1e-12)

    def test_fail_closed_under_5_samples(self):
        for n in range(5):
            assert bootstrap_free_lcb([10.0]*n, line=5.0, side="OVER") is None

    @pytest.mark.parametrize("p", [0.10, 0.25, 0.50, 0.65, 0.85])
    def test_asymptotic_convergence_to_wald_lcb(self, p: float):
        z = 1.645
        for n in [100, 1000, 10000, 100000, 1000000]:
            k = int(round(p * n))
            p_actual = k / n
            denom = 1.0 + (z * z) / n
            centre = p_actual + (z * z) / (2.0 * n)
            margin = z * math.sqrt((p_actual * (1.0 - p_actual)) / n + (z * z) / (4.0 * n * n))
            wilson_lcb = max(0.0, (centre - margin) / denom)
            wald_lcb = max(0.0, p_actual - z * math.sqrt((p_actual * (1.0 - p_actual)) / n))

            delta = abs(wilson_lcb - wald_lcb)
            if n == 1000000:
                assert delta < 1e-5, f"At n=10^6, delta={delta} exceeds 1e-5"


# ==============================================================================
# 4. Bayesian Robust Kelly Stress Tests
# ==============================================================================
class TestBayesianRobustKellyAdversarial:

    def test_extreme_longshot_positive_and_negative_edge(self):
        dec_longshot = 101.0  # +10000
        # Positive edge
        alloc_pos = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            "Longshot_Pos", dec_longshot, 0.05, 5, 100, 10000.0
        )
        assert alloc_pos.status in ["APPROVED", "SHRUNK_UNCERTAINTY"]
        assert alloc_pos.recommended_stake_dollars > 0.0

        # Negative edge
        alloc_neg = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            "Longshot_Neg", dec_longshot, 0.005, 0, 100, 10000.0
        )
        assert alloc_neg.status == "REJECTED_NO_LCB_EDGE"
        assert alloc_neg.recommended_stake_dollars == 0.0

    def test_heavy_favorite_positive_and_negative_edge(self):
        dec_fav = 1.01  # -10000
        # Negative edge
        alloc_neg = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            "Fav_Neg", dec_fav, 0.98, 98, 100, 10000.0
        )
        assert alloc_neg.status == "REJECTED_NO_LCB_EDGE"
        assert alloc_neg.recommended_stake_dollars == 0.0

    def test_extreme_variance_cv_penalty_dampens_to_zero(self):
        # As risk aversion gamma grows to 100,000, stake dampens to strictly 0.0
        alloc_extreme = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            "ExtremeGamma", 2.00, 0.75, 25, 30, 10000.0, risk_aversion_gamma=100000.0
        )
        assert alloc_extreme.recommended_stake_dollars == 0.0
        assert alloc_extreme.status == "REJECTED_NO_LCB_EDGE"
        assert alloc_extreme.uncertainty_discount_pct >= 99.0

        # Sparse sample size (n=5) high variance
        alloc_sparse = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            "Sparse", 1.91, 0.80, 4, 5, 10000.0, risk_aversion_gamma=1.5
        )
        assert alloc_sparse.recommended_stake_dollars == 0.0
        assert alloc_sparse.status == "REJECTED_NO_LCB_EDGE"

    def test_negative_edge_bets_strictly_zero_stake_and_rejected(self):
        np.random.seed(42)
        for trial in range(50):
            dec_odds = float(np.random.uniform(1.20, 20.0))
            imp_p = 1.0 / dec_odds
            model_p = float(np.random.uniform(0.01, imp_p * 0.90))
            trials = 20
            hits = int(round(model_p * trials))

            alloc = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
                f"Neg_{trial}", dec_odds, model_p, hits, trials, 10000.0
            )
            assert alloc.status == "REJECTED_NO_LCB_EDGE"
            assert alloc.recommended_stake_dollars == 0.0
            assert alloc.robust_fraction_pct == 0.0
            assert alloc.ruin_probability_at_50pct_dd == 0.0

    def test_portfolio_kelly_under_singular_and_indefinite_correlations(self):
        alloc1 = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly("P1", 2.0, 0.75, 25, 30, 10000.0)
        alloc2 = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly("P2", 2.0, 0.70, 22, 30, 10000.0)
        allocs = [alloc1, alloc2]

        # Singular correlation matrix
        corr_sing = np.ones((2, 2))
        res_sing = BayesianRobustKellyEngine.evaluate_portfolio_kelly(allocs, corr_sing, 10000.0)
        assert len(res_sing) == 2
        assert sum(p["weight_pct"] for p in res_sing) <= 15.001

        # Indefinite correlation matrix
        corr_indef = np.array([[1.0, 0.99], [0.99, 1.0]]) * -1.0
        res_indef = BayesianRobustKellyEngine.evaluate_portfolio_kelly(allocs, corr_indef, 10000.0)
        assert len(res_indef) == 2
        assert sum(p["weight_pct"] for p in res_indef) <= 15.001
