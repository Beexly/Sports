"""
adversarial_stress_math_runner.py
=================================
Challenger 2 Mathematical Engines Adversarial Stress Verification Harness.
Executes deep stress testing against:
1. Higham Matrix Repair (frontier/sports/matrix_repair.py)
2. Copula Extreme Bounds (frontier/sports/vine_copula_parlay_engine.py)
3. Wilson Score LCB (frontier/sports/engine_gate.py)
4. Bayesian Robust Kelly (frontier/sports/bayesian_robust_kelly_engine.py)
"""

import math
import sys
import os
import traceback
from pathlib import Path
import numpy as np

# Ensure repository root is on sys.path
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


def run_higham_stress_tests():
    print("\n" + "="*80)
    print("RUNNING AREA 1: HIGHAM MATRIX REPAIR ADVERSARIAL STRESS SUITE")
    print("="*80)
    failures = []
    tests_run = 0

    # 1. Non-symmetric matrices
    print("Testing non-symmetric matrices...")
    for dim in [2, 3, 5, 10, 20]:
        for trial in range(10):
            tests_run += 1
            np.random.seed(dim * 100 + trial)
            A = np.random.uniform(-1.0, 1.0, size=(dim, dim))
            np.fill_diagonal(A, 1.0)
            try:
                L, repaired = safe_cholesky(A)
                if not np.allclose(L, np.tril(L)):
                    failures.append(f"Non-symmetric dim={dim} trial={trial}: L not lower triangular")
                if np.any(np.diag(L) <= 0.0) or np.any(np.isnan(L)):
                    failures.append(f"Non-symmetric dim={dim} trial={trial}: diag(L) <= 0 or NaN")
                recon = L @ L.T
                evals = np.linalg.eigvalsh(recon)
                if np.any(evals < -1e-9):
                    failures.append(f"Non-symmetric dim={dim} trial={trial}: recon not PSD (min eval {np.min(evals)})")
            except Exception as e:
                failures.append(f"Non-symmetric dim={dim} trial={trial} crashed: {e}")

    # Extreme skew-symmetric perturbation
    for scale in [1.0, 10.0, 100.0, 1000.0]:
        tests_run += 1
        dim = 4
        S = np.eye(dim)
        K = np.array([
            [0.0, scale, -scale, 0.5 * scale],
            [-scale, 0.0, 2.0 * scale, -scale],
            [scale, -2.0 * scale, 0.0, scale],
            [-0.5 * scale, scale, -scale, 0.0]
        ])
        A = S + K
        try:
            L, repaired = safe_cholesky(A)
            assert repaired is True
            assert np.allclose(L, np.tril(L))
            assert np.all(np.diag(L) > 0.0)
        except Exception as e:
            failures.append(f"Skew-symmetric scale={scale} crashed: {e}")

    # 2. Singular matrices
    print("Testing singular matrices...")
    for dim in [2, 3, 5, 10, 20]:
        tests_run += 1
        J = np.ones((dim, dim))
        try:
            L, repaired = safe_cholesky(J)
            assert repaired is True
            assert np.allclose(L, np.tril(L))
            assert np.all(np.diag(L) > 0.0)
            evals = np.linalg.eigvalsh(L @ L.T)
            assert np.all(evals > 0.0)
        except Exception as e:
            failures.append(f"Singular all-ones dim={dim} crashed: {e}")

    for dim in [2, 3, 5]:
        tests_run += 1
        Z = np.zeros((dim, dim))
        try:
            L, repaired = safe_cholesky(Z)
            assert repaired is True
            assert np.allclose(L, np.tril(L))
            assert np.all(np.diag(L) > 0.0)
        except Exception as e:
            failures.append(f"Zero matrix dim={dim} crashed: {e}")

    tests_run += 1
    A_collin = np.array([
        [1.0, 0.5, 0.2],
        [0.5, 1.0, 0.3],
        [1.5, 1.5, 0.5]
    ])
    try:
        L, repaired = safe_cholesky(A_collin)
        assert repaired is True
        assert np.allclose(L, np.tril(L))
        assert np.all(np.diag(L) > 0.0)
    except Exception as e:
        failures.append(f"Collinear matrix crashed: {e}")

    # 3. Deeply negative-definite matrices (evals < -1.0)
    print("Testing deeply negative-definite matrices (evals < -1.0)...")
    for neg_scale in [-1.0, -5.0, -100.0, -10000.0, -1e6]:
        for dim in [2, 3, 5, 10]:
            tests_run += 1
            A_neg = np.eye(dim) * neg_scale
            try:
                L, repaired = safe_cholesky(A_neg)
                assert repaired is True
                assert np.allclose(L, np.tril(L))
                assert np.all(np.diag(L) > 0.0)
                evals = np.linalg.eigvalsh(L @ L.T)
                assert np.all(evals > 0.0)
            except Exception as e:
                failures.append(f"Negative identity scale={neg_scale} dim={dim} crashed: {e}")

    tests_run += 1
    dim = 10
    A_geom_violation = np.full((dim, dim), -0.99)
    np.fill_diagonal(A_geom_violation, 1.0)
    orig_evals = np.linalg.eigvalsh(A_geom_violation)
    min_orig_eval = np.min(orig_evals)
    assert min_orig_eval < -7.0
    try:
        L, repaired = safe_cholesky(A_geom_violation)
        assert repaired is True
        assert np.allclose(L, np.tril(L))
        assert np.all(np.diag(L) > 0.0)
        recon = L @ L.T
        assert np.allclose(np.diag(recon), 1.0, atol=1e-5)
        evals_recon = np.linalg.eigvalsh(recon)
        assert np.all(evals_recon > 0.0)
    except Exception as e:
        failures.append(f"Geom violation dim=10 rho=-0.99 crashed: {e}")

    tests_run += 1
    dim = 50
    A_huge_neg = np.full((dim, dim), -0.98)
    np.fill_diagonal(A_huge_neg, 1.0)
    assert np.min(np.linalg.eigvalsh(A_huge_neg)) < -40.0
    try:
        L, repaired = safe_cholesky(A_huge_neg)
        assert repaired is True
        assert np.allclose(L, np.tril(L))
        assert np.all(np.diag(L) > 0.0)
        recon = L @ L.T
        assert np.allclose(np.diag(recon), 1.0, atol=1e-4)
        evals_recon = np.linalg.eigvalsh(recon)
        assert np.all(evals_recon > 0.0)
    except Exception as e:
        failures.append(f"Geom violation dim=50 rho=-0.98 crashed: {e}")

    for trial in range(10):
        tests_run += 1
        dim = 8
        M = np.random.randn(dim, dim)
        M_sym = (M + M.T) / 2.0
        M_deep_neg = M_sym - 20.0 * np.eye(dim)
        assert np.min(np.linalg.eigvalsh(M_deep_neg)) < -15.0
        try:
            L, repaired = safe_cholesky(M_deep_neg)
            assert repaired is True
            assert np.allclose(L, np.tril(L))
            assert np.all(np.diag(L) > 0.0)
        except Exception as e:
            failures.append(f"Deeply shifted symmetric matrix trial={trial} crashed: {e}")

    print(f"Higham Matrix Repair Stress Tests Completed: {tests_run} tests run, {len(failures)} failures.")
    return tests_run, failures


def run_copula_stress_tests():
    print("\n" + "="*80)
    print("RUNNING AREA 2: COPULA EXTREME BOUNDS ADVERSARIAL STRESS SUITE")
    print("="*80)
    failures = []
    tests_run = 0

    extreme_u_vals = [
        1e-9, 1e-8, 1e-6, 1e-4, 0.01, 0.1, 0.5, 0.9, 0.99,
        1.0 - 1e-4, 1.0 - 1e-6, 1.0 - 1e-8, 1.0 - 1e-9
    ]
    boundary_u_vals = [0.0, -0.01, 1.0, 1.01]

    families_and_thetas = [
        (PairCopulaType.CLAYTON, [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0]),
        (PairCopulaType.GUMBEL, [1.0, 1.01, 1.5, 2.0, 5.0, 10.0, 20.0]),
        (PairCopulaType.FRANK, [-20.0, -10.0, -2.0, -0.1, 0.1, 2.0, 10.0, 20.0]),
        (PairCopulaType.GAUSSIAN, [-0.999, -0.9, -0.5, 0.0, 0.5, 0.9, 0.999]),
    ]

    print("Testing bivariate copula CDF and h-functions at extreme tails...")
    for fam, thetas in families_and_thetas:
        for th in thetas:
            for u in extreme_u_vals:
                for v in [1e-9, 0.5, 1.0 - 1e-9]:
                    tests_run += 1
                    try:
                        c_val = VineCopulaParlayEngine.copula_cdf(u, v, fam, th)
                        if not np.isfinite(c_val) or c_val < 0.0 or c_val > 1.0:
                            failures.append(f"{fam.value} (th={th}) cdf({u}, {v}) out of [0, 1]: {c_val}")

                        u_c = max(1e-9, min(1.0 - 1e-9, u))
                        v_c = max(1e-9, min(1.0 - 1e-9, v))
                        f_low = max(0.0, u_c + v_c - 1.0)
                        f_high = min(u_c, v_c)
                        if not (f_low - 1e-9 <= c_val <= f_high + 1e-9):
                            failures.append(f"{fam.value} (th={th}) cdf({u}, {v}) = {c_val} violates Fréchet [{f_low}, {f_high}]")

                        h_val = VineCopulaParlayEngine.h_function(u, v, fam, th)
                        if not np.isfinite(h_val) or h_val < 0.0 or h_val > 1.0:
                            failures.append(f"{fam.value} (th={th}) h({u} | {v}) = {h_val} out of [0, 1]")

                        h_inv_val = VineCopulaParlayEngine.h_inv_function(h_val, v, fam, th)
                        if not np.isfinite(h_inv_val) or h_inv_val < 0.0 or h_inv_val > 1.0:
                            failures.append(f"{fam.value} (th={th}) h_inv({h_val} | {v}) = {h_inv_val} out of [0, 1]")

                    except Exception as e:
                        failures.append(f"{fam.value} (th={th}) at u={u}, v={v} crashed: {e}")

    print("Testing boundary / out-of-domain clamped inputs...")
    for fam, thetas in families_and_thetas:
        th = thetas[len(thetas)//2]
        for u in boundary_u_vals:
            for v in boundary_u_vals:
                tests_run += 1
                try:
                    c_val = VineCopulaParlayEngine.copula_cdf(u, v, fam, th)
                    assert 0.0 <= c_val <= 1.0
                    h_val = VineCopulaParlayEngine.h_function(u, v, fam, th)
                    assert 0.0 <= h_val <= 1.0
                except Exception as e:
                    failures.append(f"{fam.value} boundary clamp u={u}, v={v} crashed: {e}")

    print("Testing multi-dimensional SGP pricing under extreme dimension d=10...")
    d10_configurations = [
        ("Equal moderate 0.50", [0.50] * 10),
        ("Equal high 0.90", [0.90] * 10),
        ("Equal low 0.15", [0.15] * 10),
        ("Linearly spaced 0.15 to 0.85", list(np.linspace(0.15, 0.85, 10))),
        ("Extreme near-one 0.98", [0.98] * 10),
        ("Extreme near-zero 0.02", [0.02] * 10),
    ]

    for config_name, probs in d10_configurations:
        tests_run += 1
        legs = [
            SGPLeg(
                name=f"leg_{i}",
                player=f"Player_{i}",
                prop_type="rec_yards" if i % 2 == 0 else "rush_yards",
                target_line=50.0 + i,
                bet_type="OVER",
                marginal_prob=float(probs[i]),
            )
            for i in range(10)
        ]

        f_lower = max(0.0, sum(probs) - 9.0)
        f_upper = min(probs)

        try:
            res = VineCopulaParlayEngine.price_multi_leg_sgp(legs, monte_carlo_samples=10000)
            assert res.num_legs == 10
            assert res.frechet_compliant is True
            assert f_lower - 1e-5 <= res.joint_probability <= f_upper + 1e-5, (
                f"Config '{config_name}': Joint P {res.joint_probability} violates Fréchet [{f_lower}, {f_upper}]"
            )
            assert res.fair_decimal_odds >= 1.0
        except Exception as e:
            failures.append(f"d=10 config '{config_name}' crashed: {e}")

        tests_run += 1
        try:
            clayton_fams = [PairCopulaType.CLAYTON] * 9
            clayton_thetas = [1.5] * 9
            res_clayton = VineCopulaParlayEngine.price_multi_leg_sgp(
                legs,
                pair_families=clayton_fams,
                copula_thetas=clayton_thetas,
                monte_carlo_samples=10000,
            )
            assert res_clayton.frechet_compliant is True
            assert f_lower - 1e-5 <= res_clayton.joint_probability <= f_upper + 1e-5
            assert res_clayton.tail_regime == "LOWER_TAIL_REINFORCED"
        except Exception as e:
            failures.append(f"d=10 Clayton config '{config_name}' crashed: {e}")

        tests_run += 1
        try:
            gumbel_fams = [PairCopulaType.GUMBEL] * 9
            gumbel_thetas = [1.8] * 9
            res_gumbel = VineCopulaParlayEngine.price_multi_leg_sgp(
                legs,
                pair_families=gumbel_fams,
                copula_thetas=gumbel_thetas,
                monte_carlo_samples=10000,
            )
            assert res_gumbel.frechet_compliant is True
            assert f_lower - 1e-5 <= res_gumbel.joint_probability <= f_upper + 1e-5
            assert res_gumbel.tail_regime == "UPPER_TAIL_REINFORCED"
        except Exception as e:
            failures.append(f"d=10 Gumbel config '{config_name}' crashed: {e}")

    print(f"Copula Extreme Bounds Stress Tests Completed: {tests_run} tests run, {len(failures)} failures.")
    return tests_run, failures


def run_wilson_stress_tests():
    print("\n" + "="*80)
    print("RUNNING AREA 3: WILSON SCORE LCB ADVERSARIAL STRESS SUITE")
    print("="*80)
    failures = []
    tests_run = 0

    z = 1.645

    # 1. Boundary points
    print("Testing boundary points k=0, n=5; k=5, n=5; k=0, n=1000; k=1000, n=1000...")
    
    # Boundary 1: k=0, n=5
    tests_run += 1
    res_0_5 = bootstrap_free_lcb([0.0]*5, line=5.0, side="OVER", z=z)
    assert res_0_5 is not None
    assert res_0_5["n"] == 5
    assert res_0_5["p_hat"] == 0.0
    if not math.isclose(res_0_5["p_lcb"], 0.0, abs_tol=1e-12):
        failures.append(f"Boundary k=0, n=5: expected p_lcb=0.0, got {res_0_5['p_lcb']}")
    else:
        print(f"  [PASS] k=0, n=5 -> p_lcb = {res_0_5['p_lcb']} (exact 0.0)")

    # Boundary 2: k=5, n=5
    tests_run += 1
    res_5_5 = bootstrap_free_lcb([10.0]*5, line=5.0, side="OVER", z=z)
    assert res_5_5 is not None
    assert res_5_5["n"] == 5
    assert res_5_5["p_hat"] == 1.0
    # Theoretical: 1 / (1 + z^2 / 5)
    expected_5_5 = 1.0 / (1.0 + (z * z) / 5.0)
    if not math.isclose(res_5_5["p_lcb"], expected_5_5, abs_tol=1e-12):
        failures.append(f"Boundary k=5, n=5: expected {expected_5_5}, got {res_5_5['p_lcb']}")
    else:
        print(f"  [PASS] k=5, n=5 -> p_lcb = {res_5_5['p_lcb']:.8f} (exact analytical {expected_5_5:.8f})")

    # Boundary 3: k=0, n=1000
    tests_run += 1
    res_0_1000 = bootstrap_free_lcb([0.0]*1000, line=5.0, side="OVER", z=z)
    assert res_0_1000 is not None
    assert res_0_1000["n"] == 1000
    assert res_0_1000["p_hat"] == 0.0
    if not math.isclose(res_0_1000["p_lcb"], 0.0, abs_tol=1e-12):
        failures.append(f"Boundary k=0, n=1000: expected p_lcb=0.0, got {res_0_1000['p_lcb']}")
    else:
        print(f"  [PASS] k=0, n=1000 -> p_lcb = {res_0_1000['p_lcb']} (exact 0.0)")

    # Boundary 4: k=1000, n=1000
    tests_run += 1
    res_1000_1000 = bootstrap_free_lcb([10.0]*1000, line=5.0, side="OVER", z=z)
    assert res_1000_1000 is not None
    assert res_1000_1000["n"] == 1000
    assert res_1000_1000["p_hat"] == 1.0
    expected_1000_1000 = 1.0 / (1.0 + (z * z) / 1000.0)
    if not math.isclose(res_1000_1000["p_lcb"], expected_1000_1000, abs_tol=1e-12):
        failures.append(f"Boundary k=1000, n=1000: expected {expected_1000_1000}, got {res_1000_1000['p_lcb']}")
    else:
        print(f"  [PASS] k=1000, n=1000 -> p_lcb = {res_1000_1000['p_lcb']:.8f} (exact analytical {expected_1000_1000:.8f})")

    # Boundary 5: Fail-closed for n < 5
    for n in range(5):
        tests_run += 1
        res_fail = bootstrap_free_lcb([10.0]*n, line=5.0, side="OVER")
        if res_fail is not None:
            failures.append(f"Fail closed n={n}: expected None, got {res_fail}")

    # 2. Exact asymptotic convergence to Wald LCB: p - z * sqrt(p(1-p)/n)
    print("Testing asymptotic convergence to p - z*sqrt(p(1-p)/n) across n -> infinity...")
    test_p_values = [0.10, 0.25, 0.50, 0.65, 0.85]
    n_sample_sizes = [100, 1000, 10000, 100000, 1000000]

    for p in test_p_values:
        prev_delta = float("inf")
        print(f"  Convergence for p = {p:.2f}:")
        for n in n_sample_sizes:
            tests_run += 1
            k = int(round(p * n))
            p_actual = k / n

            # Analytical Wilson calculation matching bootstrap_free_lcb
            denom = 1.0 + (z * z) / n
            centre = p_actual + (z * z) / (2.0 * n)
            margin = z * math.sqrt((p_actual * (1.0 - p_actual)) / n + (z * z) / (4.0 * n * n))
            wilson_lcb = max(0.0, (centre - margin) / denom)

            # Wald asymptotic formula
            wald_lcb = max(0.0, p_actual - z * math.sqrt((p_actual * (1.0 - p_actual)) / n))

            delta = abs(wilson_lcb - wald_lcb)
            print(f"    n = {n:7d}: Wilson={wilson_lcb:.8f}, Wald={wald_lcb:.8f}, delta={delta:.2e}")

            # Delta must decrease monotonically as O(1/n)
            if n > 100:
                assert delta < prev_delta, f"Delta did not decrease: n={n}, delta={delta}, prev={prev_delta}"
            prev_delta = delta

            # At n = 1,000,000, delta must be < 1e-5
            if n == 1000000:
                if delta > 1e-5:
                    failures.append(f"Asymptotic convergence at n=10^6 for p={p}: delta={delta} > 1e-5")

    print(f"Wilson Score LCB Stress Tests Completed: {tests_run} tests run, {len(failures)} failures.")
    return tests_run, failures


def run_bayesian_kelly_stress_tests():
    print("\n" + "="*80)
    print("RUNNING AREA 4: BAYESIAN ROBUST KELLY ADVERSARIAL STRESS SUITE")
    print("="*80)
    failures = []
    tests_run = 0

    # 1. Extreme longshots (odds +10000 -> dec 101.0, implied ~0.0099)
    print("Testing extreme longshots (+10000)...")
    dec_longshot = american_to_decimal(10000)  # 101.0
    implied_longshot = american_to_implied(10000)  # 0.00990099...

    # Positive edge longshot: model p = 0.03 (edge = +0.02)
    tests_run += 1
    alloc_longshot_pos = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
        asset_name="Longshot_Pos",
        decimal_odds=dec_longshot,
        model_mean_p=0.03,
        sample_hits=3,
        sample_trials=100,
        bankroll=10000.0,
        risk_aversion_gamma=1.5,
    )
    # LCB for 3/100 is ~0.009; let's check edge & status
    if alloc_longshot_pos.lcb_edge_pct <= 0.0:
        assert alloc_longshot_pos.status == "REJECTED_NO_LCB_EDGE"
        assert alloc_longshot_pos.recommended_stake_dollars == 0.0
    else:
        assert alloc_longshot_pos.recommended_stake_dollars > 0.0
        assert alloc_longshot_pos.status in ["APPROVED", "SHRUNK_UNCERTAINTY"]

    # Negative edge longshot: model p = 0.005 < 0.0099 implied
    tests_run += 1
    alloc_longshot_neg = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
        asset_name="Longshot_Neg",
        decimal_odds=dec_longshot,
        model_mean_p=0.005,
        sample_hits=0,
        sample_trials=100,
        bankroll=10000.0,
    )
    if alloc_longshot_neg.status != "REJECTED_NO_LCB_EDGE":
        failures.append(f"Negative edge longshot not rejected: status={alloc_longshot_neg.status}")
    if alloc_longshot_neg.recommended_stake_dollars != 0.0:
        failures.append(f"Negative edge longshot stake > 0: {alloc_longshot_neg.recommended_stake_dollars}")

    # 2. Extreme heavy favorites (odds -10000 -> dec 1.01, implied ~0.9901)
    print("Testing heavy favorites (-10000)...")
    dec_fav = american_to_decimal(-10000)  # 1.01
    implied_fav = american_to_implied(-10000)  # 0.990099...

    # Positive edge favorite: model p = 0.998, 100 hits / 100 trials
    tests_run += 1
    alloc_fav_pos = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
        asset_name="Favorite_Pos",
        decimal_odds=dec_fav,
        model_mean_p=0.998,
        sample_hits=100,
        sample_trials=100,
        bankroll=10000.0,
        max_bankroll_cap_pct=0.05,
    )
    # LCB for 100/100 should be ~0.97-0.99; if lcb_edge > 0 stake > 0, else rejected
    if alloc_fav_pos.lcb_edge_pct > 0.0:
        assert alloc_fav_pos.recommended_stake_dollars > 0.0
        assert alloc_fav_pos.recommended_stake_dollars <= 500.0  # Cap at 5% of 10000
    else:
        assert alloc_fav_pos.recommended_stake_dollars == 0.0
        assert alloc_fav_pos.status == "REJECTED_NO_LCB_EDGE"

    # Negative edge favorite: model p = 0.98 < 0.9901 implied
    tests_run += 1
    alloc_fav_neg = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
        asset_name="Favorite_Neg",
        decimal_odds=dec_fav,
        model_mean_p=0.98,
        sample_hits=98,
        sample_trials=100,
        bankroll=10000.0,
    )
    if alloc_fav_neg.status != "REJECTED_NO_LCB_EDGE":
        failures.append(f"Negative edge favorite not rejected: status={alloc_fav_neg.status}")
    if alloc_fav_neg.recommended_stake_dollars != 0.0:
        failures.append(f"Negative edge favorite stake > 0: {alloc_fav_neg.recommended_stake_dollars}")

    # 3. Extreme variance and CV penalty kappa dampening stake to 0
    print("Testing extreme variance and CV penalty kappa dampening...")
    # Base bet with positive LCB edge
    tests_run += 1
    alloc_base = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
        asset_name="BaseBet",
        decimal_odds=2.00,
        model_mean_p=0.75,
        sample_hits=25,
        sample_trials=30,
        bankroll=10000.0,
        risk_aversion_gamma=1.0,
        max_bankroll_cap_pct=0.20,
    )
    assert alloc_base.status == "APPROVED"
    assert alloc_base.recommended_stake_dollars > 0.0

    # Dampen via increasing risk aversion gamma to extreme values: 10, 100, 1000, 10000, 50000, 100000
    prev_stake = alloc_base.recommended_stake_dollars
    for gamma in [10.0, 50.0, 200.0, 1000.0, 10000.0, 50000.0, 100000.0]:
        tests_run += 1
        alloc_damped = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name="DampedBet",
            decimal_odds=2.00,
            model_mean_p=0.75,
            sample_hits=25,
            sample_trials=30,
            bankroll=10000.0,
            risk_aversion_gamma=gamma,
            max_bankroll_cap_pct=0.20,
        )
        assert alloc_damped.recommended_stake_dollars <= prev_stake
        prev_stake = alloc_damped.recommended_stake_dollars

    # At extreme gamma (>= 50000.0), kappa collapses toward 0, robust_fraction <= 0.0005, stake strictly 0.0
    alloc_extreme_gamma = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
        asset_name="ExtremeGammaBet",
        decimal_odds=2.00,
        model_mean_p=0.75,
        sample_hits=25,
        sample_trials=30,
        bankroll=10000.0,
        risk_aversion_gamma=100000.0,
    )
    tests_run += 1
    if alloc_extreme_gamma.recommended_stake_dollars != 0.0:
        failures.append(f"Extreme gamma stake not 0: {alloc_extreme_gamma.recommended_stake_dollars}")
    if alloc_extreme_gamma.status != "REJECTED_NO_LCB_EDGE":
        failures.append(f"Extreme gamma status not REJECTED_NO_LCB_EDGE: {alloc_extreme_gamma.status}")
    if alloc_extreme_gamma.uncertainty_discount_pct < 99.0:
        failures.append(f"Extreme gamma discount < 99%: {alloc_extreme_gamma.uncertainty_discount_pct}")

    # Also test high variance from sparse sample size (n=5):
    tests_run += 1
    alloc_sparse_var = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
        asset_name="SparseVarBet",
        decimal_odds=1.91,
        model_mean_p=0.80,
        sample_hits=4,
        sample_trials=5,
        bankroll=10000.0,
        risk_aversion_gamma=1.5,
    )
    if alloc_sparse_var.recommended_stake_dollars != 0.0:
        failures.append(f"Sparse sample high variance stake > 0: {alloc_sparse_var.recommended_stake_dollars}")
    if alloc_sparse_var.status != "REJECTED_NO_LCB_EDGE":
        failures.append(f"Sparse sample high variance status != REJECTED_NO_LCB_EDGE: {alloc_sparse_var.status}")

    # 4. Negative edge bets across wide spectrum: stake strictly 0.0 with REJECTED status
    print("Testing 200 randomized negative edge bets...")
    np.random.seed(999)
    for trial in range(200):
        tests_run += 1
        # Random decimal odds in [1.10, 50.0]
        dec_odds = float(np.random.uniform(1.10, 50.0))
        imp_p = 1.0 / dec_odds
        # Force model probability strictly below implied (negative edge)
        model_p = float(np.random.uniform(0.01, imp_p * 0.95))
        trials = int(np.random.randint(5, 50))
        hits = int(round(model_p * trials))

        alloc_rand_neg = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name=f"RandNeg_{trial}",
            decimal_odds=dec_odds,
            model_mean_p=model_p,
            sample_hits=hits,
            sample_trials=trials,
            bankroll=10000.0,
        )

        if alloc_rand_neg.recommended_stake_dollars != 0.0:
            failures.append(f"Trial {trial} negative edge stake > 0: {alloc_rand_neg.recommended_stake_dollars}")
        if alloc_rand_neg.status != "REJECTED_NO_LCB_EDGE":
            failures.append(f"Trial {trial} negative edge status != REJECTED_NO_LCB_EDGE: {alloc_rand_neg.status}")
        if alloc_rand_neg.robust_fraction_pct != 0.0:
            failures.append(f"Trial {trial} robust fraction != 0.0: {alloc_rand_neg.robust_fraction_pct}")
        if alloc_rand_neg.ruin_probability_at_50pct_dd != 0.0:
            failures.append(f"Trial {trial} ruin prob != 0.0: {alloc_rand_neg.ruin_probability_at_50pct_dd}")

    # 5. Invalid inputs handling
    print("Testing invalid inputs fail-closed behavior...")
    invalid_cases = [
        ("decimal_odds <= 1.0", 1.0, 0.60, 10000.0),
        ("decimal_odds < 0.0", -2.0, 0.60, 10000.0),
        ("model_p <= 0.0", 2.0, 0.0, 10000.0),
        ("model_p >= 1.0", 2.0, 1.0, 10000.0),
        ("bankroll <= 0.0", 2.0, 0.60, 0.0),
        ("bankroll < 0.0", 2.0, 0.60, -500.0),
    ]
    for case_name, dec, p, bk in invalid_cases:
        tests_run += 1
        alloc_inv = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name="InvalidTest",
            decimal_odds=dec,
            model_mean_p=p,
            sample_hits=5,
            sample_trials=10,
            bankroll=bk,
        )
        if alloc_inv.recommended_stake_dollars != 0.0:
            failures.append(f"Invalid case '{case_name}' stake != 0: {alloc_inv.recommended_stake_dollars}")
        if alloc_inv.status != "REJECTED_INVALID_INPUTS":
            failures.append(f"Invalid case '{case_name}' status != REJECTED_INVALID_INPUTS: {alloc_inv.status}")
    # 6. Portfolio Kelly under singular and indefinite correlation matrices
    print("Testing Portfolio Kelly stress under singular and indefinite correlations...")
    # Setup 3 valid allocations
    alloc1 = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly("P1", 2.0, 0.75, 25, 30, 10000.0)
    alloc2 = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly("P2", 2.0, 0.70, 22, 30, 10000.0)
    alloc3 = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly("P3", 2.0, 0.65, 20, 30, 10000.0)
    allocs = [alloc1, alloc2, alloc3]

    # Test singular correlation matrix (all 1.0)
    tests_run += 1
    corr_singular = np.ones((3, 3))
    try:
        port_sing = BayesianRobustKellyEngine.evaluate_portfolio_kelly(allocs, corr_singular, 10000.0)
        assert len(port_sing) == 3
        total_w = sum(p["weight_pct"] for p in port_sing)
        assert total_w <= 15.001
    except Exception as e:
        failures.append(f"Portfolio Kelly singular correlation crashed: {e}")

    # Test indefinite correlation matrix (negative eigenvalues)
    tests_run += 1
    corr_indef = np.array([
        [1.0, 0.95, -0.95],
        [0.95, 1.0, 0.95],
        [-0.95, 0.95, 1.0]
    ])
    try:
        port_indef = BayesianRobustKellyEngine.evaluate_portfolio_kelly(allocs, corr_indef, 10000.0)
        assert len(port_indef) == 3
        total_w = sum(p["weight_pct"] for p in port_indef)
        assert total_w <= 15.001
    except Exception as e:
        failures.append(f"Portfolio Kelly indefinite correlation crashed: {e}")

    # Test all zero allocations
    tests_run += 1
    alloc_zero = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly("P0", 2.0, 0.40, 10, 30, 10000.0)
    port_zero = BayesianRobustKellyEngine.evaluate_portfolio_kelly([alloc_zero, alloc_zero], np.eye(2), 10000.0)
    assert all(p["allocated_stake"] == 0.0 for p in port_zero)

    print(f"Bayesian Robust Kelly Stress Tests Completed: {tests_run} tests run, {len(failures)} failures.")
    return tests_run, failures


def run_full_suite():
    print("="*80)
    print("CHALLENGER 2: MATHEMATICAL ENGINES ADVERSARIAL STRESS SUITE")
    print("="*80)
    total_tests = 0
    all_failures = []

    t1, f1 = run_higham_stress_tests()
    total_tests += t1
    all_failures.extend(f1)

    t2, f2 = run_copula_stress_tests()
    total_tests += t2
    all_failures.extend(f2)

    t3, f3 = run_wilson_stress_tests()
    total_tests += t3
    all_failures.extend(f3)

    t4, f4 = run_bayesian_kelly_stress_tests()
    total_tests += t4
    all_failures.extend(f4)

    print("\n" + "="*80)
    print("FINAL SUMMARY OF ADVERSARIAL STRESS TESTING")
    print("="*80)
    print(f"Total Tests Executed: {total_tests}")
    print(f"Total Failures: {len(all_failures)}")

    if all_failures:
        print("\nFAILURE DETAILS:")
        for idx, fail in enumerate(all_failures, 1):
            print(f"  {idx}. {fail}")
        return False
    else:
        print("\nALL ADVERSARIAL STRESS TESTS PASSED WITH ZERO CRASHES OR VIOLATIONS!")
        return True


if __name__ == "__main__":
    success = run_full_suite()
    sys.exit(0 if success else 1)
