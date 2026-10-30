#!/usr/bin/env python3
"""
tests/intelligence/test_week8_three_module_wiring.py
====================================================
Unit test and visible BEFORE/AFTER verification log for the 3 production modules
wired into the Week 8 GSE pipeline:
1. `intelligence/math/vmls_and_numpy_kernels.py`:
   - `unpadded_drive_reduceat` + `kkt_constrained_least_squares` in `gse_coach_mind_simulator.py`
   - `solve_opponent_adjusted_bayesian_ridge` in weekly power ratings
2. `intelligence/math/effective_theory_and_large_deviations.py`:
   - `fft_compound_poisson_pmf` in game-total / spread key-number pricing
   - `cramer_large_deviation_tilt` in milestone / alt-line pricing
   - `wigner_semicircle_marchenko_pastur_denoise` in the SGP copula covariance step
3. `intelligence/coaching/qb_disguise_blitz_matrix.py`:
   - `evaluate_qb_matchup_2x2` + `encode_mnar_missingness` in Stage 1 (`pressure_answer.py`)
     and Stage 4 (`gse_coach_mind_simulator.py`) for `KC@DEN`, `CAR@GB`, and the Sunday slate.
"""

from __future__ import annotations
import math
import sys
from pathlib import Path
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.coaching.pressure_answer import (
    idp_tackle_funnel_adjustment,
    sack_tandem_gate_weight,
    stage1_qb_pressure_disguise_overlay,
)
from intelligence.coaching.redzone import get_rz_td_pct
from scripts.ops.gse_coach_mind_simulator import (
    ALL_32_TEAM_RATINGS,
    compute_weekly_bayesian_ridge_power_ratings,
    conserve_target_shares_kkt,
    load_sealed_object_readonly,
    simulate_matchup_pbp,
    sinkhorn_reallocate_weights,
)


def run_all_wiring_tests() -> None:
    sealed_obj, digest = load_sealed_object_readonly()
    print("=" * 88)
    print("WEEK 8 THREE-MODULE WIRING VERIFICATION — BEFORE vs. AFTER LOG")
    print("=" * 88)

    # 1. Wiring Point 1A: KKT Target/Carry Share Conservation + Unpadded Drive Reduceat
    base_shares = [0.26, 0.21, 0.17, 0.20, 0.16]
    raw_sh, _ = sinkhorn_reallocate_weights(sealed_obj["costMatrixC"], base_shares, ["WR1", "TE1"])
    perturbed_sh = raw_sh * np.array([1.04, 0.98, 1.03, 0.95, 1.05])  # Pre-KKT empirical blend drift
    kkt_sh = conserve_target_shares_kkt(perturbed_sh)
    assert abs(float(np.sum(kkt_sh)) - 1.0) < 1e-12
    print(
        f"[1A] KKT Share Conservation | BEFORE sum={np.sum(perturbed_sh):.6f} "
        f"-> AFTER KKT sum={np.sum(kkt_sh):.10f} (err={abs(np.sum(kkt_sh)-1.0):.2e})"
    )

    # 2. Wiring Point 1B: Opponent-Adjusted Bayesian Ridge Weekly Power Ratings
    ridge_ratings = compute_weekly_bayesian_ridge_power_ratings(str(REPO_ROOT))
    assert len(ridge_ratings) == 32
    for tm in ("KC", "DEN", "GB", "CAR", "DET", "BAL"):
        raw_net = ALL_32_TEAM_RATINGS[tm]["off_epa"] - ALL_32_TEAM_RATINGS[tm]["def_epa"]
        print(
            f"[1B] Bayesian Ridge Power Rating ({tm:3s}) | BEFORE static net_epa={raw_net:+.4f} "
            f"-> AFTER 12wk Ridge+Shrinkage={ridge_ratings[tm]:+.5f}"
        )

    # 3. Wiring Point 2A: FFT Compound-Poisson Key-Number Pricing vs. Gaussian Normal
    kc_den = simulate_matchup_pbp("KC", "DEN", [], [], sealed_obj, digest, n_sims=3000, seed=42, return_vectors=True)
    sprd_vec = kc_den["vectors"]["home_margin_out"]
    mu_s, sd_s = float(np.mean(sprd_vec)), float(np.std(sprd_vec))
    # Gaussian approximation for P(|margin| == 3) and P(|margin| == 7) using unit-width continuity correction
    gauss_p3 = (
        0.5 * (math.erf((3.5 - mu_s) / (sd_s * math.sqrt(2))) - math.erf((2.5 - mu_s) / (sd_s * math.sqrt(2))))
        + 0.5 * (math.erf((-2.5 - mu_s) / (sd_s * math.sqrt(2))) - math.erf((-3.5 - mu_s) / (sd_s * math.sqrt(2))))
    )
    gauss_p7 = (
        0.5 * (math.erf((7.5 - mu_s) / (sd_s * math.sqrt(2))) - math.erf((6.5 - mu_s) / (sd_s * math.sqrt(2))))
        + 0.5 * (math.erf((-6.5 - mu_s) / (sd_s * math.sqrt(2))) - math.erf((-7.5 - mu_s) / (sd_s * math.sqrt(2))))
    )
    fft_masses = kc_den["fft_key_number_masses"]
    assert fft_masses[3] > gauss_p3 and fft_masses[7] > gauss_p7
    print(
        f"[2A] Key-Number Pricing (KC@DEN) | BEFORE Gaussian P(|m|=3)={gauss_p3:.4f}, P(|m|=7)={gauss_p7:.4f} "
        f"-> AFTER Exact FFT P(|m|=3)={fft_masses[3]:.4f}, P(|m|=7)={fft_masses[7]:.4f}"
    )

    # 4. Wiring Point 2B: Cramér Large Deviation Tilting for Tail Milestone Pricing
    cramer_info = kc_den["cramer_tail_milestone"]
    assert cramer_info["theta_star"] > 0.0 and cramer_info["rate_I_a"] > 0.0
    print(
        f"[2B] Cramér Tail Milestone Tilt  | BEFORE un-tilted MC tail variance "
        f"-> AFTER theta*={cramer_info['theta_star']:.4f}, I(a)={cramer_info['rate_I_a']:.4f}, "
        f"Chernoff_10d={cramer_info['chernoff_bound_10_drives']:.5f}"
    )

    # 5. Wiring Point 2C: Marchenko-Pastur SGP Copula Covariance Denoising
    n_clipped = kc_den["vectors"]["sgp_noise_eigenvalues_clipped"]
    denoised_corr = kc_den["vectors"]["sgp_corr_denoised"]
    assert n_clipped >= 1 and denoised_corr.shape == (6, 6)
    print(
        f"[2C] Marchenko-Pastur SGP Copula | BEFORE 6x6 noisy sample corr "
        f"-> AFTER clipped {n_clipped}/6 Marchenko-Pastur noise eigenvalues (diag={np.diag(denoised_corr).round(3).tolist()})"
    )

    # 6. Wiring Point 3: Stage 1 & Stage 4 2x2 QB Disguise x Blitz Matrix + MNAR + Sunday PBP Overlays
    s1_mahomes = stage1_qb_pressure_disguise_overlay("KC", opp_disguise_rate=0.38, opp_blitz_rate=30.0, injury_features={"wr1_dnp": None})
    s1_nix = stage1_qb_pressure_disguise_overlay("DEN", opp_disguise_rate=0.38, opp_blitz_rate=36.0, injury_features={"qb_clean": 1.0})
    assert s1_mahomes["mnar_features"]["wr1_dnp__is_missing_mnar"] == 1.0
    assert s1_nix["matchup_expected_epa_db"] < 0.0
    assert get_rz_td_pct(2026, "GB") is not None and get_rz_td_pct(2026, "GB") < 0.25
    assert idp_tackle_funnel_adjustment(36.2) == 0.15
    assert sack_tandem_gate_weight(4.53, 6.30) == 0.40

    car_gb = simulate_matchup_pbp("CAR", "GB", [], [], sealed_obj, digest, n_sims=3000, seed=42)
    print(
        f"[3A] KC @ DEN 2x2 QB Matrix      | Mahomes (vs DEN disguise): shift={kc_den['qb_2x2_overlay']['away']['epa_shift_vs_baseline']:+.4f} EPA/DB | "
        f"Bo Nix (vs KC Spagnuolo blitz+disguise): exp={kc_den['qb_2x2_overlay']['home']['matchup_expected_epa_db']:+.4f} EPA/DB, "
        f"INT_mult={kc_den['qb_2x2_overlay']['home']['int_prob_multiplier']:.3f}x, Sack_mult={kc_den['qb_2x2_overlay']['home']['sack_prob_multiplier']:.3f}x"
    )
    print(
        f"[3B] CAR @ GB PBP + 2x2 Overlays | MedTot={car_gb['median_total']:.2f}, MedSprd(H)={car_gb['median_spread_home']:+.2f}, "
        f"GB_RZ_TD={get_rz_td_pct(2026, 'GB'):.4f}, CAR_LB_Funnel=+{car_gb['qb_2x2_overlay']['away_lb_tackle_funnel_boost']:.2f} tkl"
    )
    print("=" * 88)
    print("ALL 6 WIRING POINTS VERIFIED AND PASSED.")


if __name__ == "__main__":
    run_all_wiring_tests()
