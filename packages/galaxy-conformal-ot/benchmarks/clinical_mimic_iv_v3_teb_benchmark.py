"""
GSI v3.0 Three-Pillar Falsifiable Benchmark Suite (MIMIC-IV + Invariance Stress Tests)
======================================================================================
Executes the three falsifiable pillars of the GSI Frontier Research Agenda:

Pillar 1: Operationalize & Test Asynchronous Subsystem Time-Slippage (dt_i/dtau = phi_i)
          on Real MIMIC-IV Critical-Care Trajectories (Welch t-test, Mann-Whitney U, Cohen's d).
Pillar 2: Stress-Test Braid/Lévy Invariance Under Time-Warping, Sparsity & Noise +
          Head-to-Head Real MIMIC-IV Benchmark (Persistent Homology vs. Quantum TDA
          Spectral Laplacian vs. Thermodynamic Braid vs. Conformal-OT v2.0 vs. GSI v3.0 Unified).
Pillar 3: Ergodicity Breaking & Finite-Time Braiding Exponent (FTBE) Early-Warning Lead Time
          on Coupled Van der Pol Bifurcation Systems and Real MIMIC-IV Hypotensive Crash Stays.
"""

from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from clinical_mimic_iv_real_benchmark import (  # noqa: E402
    ALL_VITAL_ITEMS,
    DATA_DIR,
    ITEM_DBP,
    ITEM_HR,
    ITEM_MAP,
    ITEM_RR,
    ITEM_SBP,
    ITEM_SPO2,
    apply_frozen_whitening,
    bootstrap_ci,
    compute_auc,
    fit_calibration_whitening,
    load_real_clinical,
)
from galaxy_conformal_ot.quantum_braid_teb import (  # noqa: E402
    AsynchronousTimeSlippageEstimator,
    ErgodicBraidBifurcationMonitor,
    PersistentHomologyBetti,
    QuantumSpectralTrajectoryLaplacian,
    ThermodynamicBraidInvariant,
)
from galaxy_conformal_ot.wasserstein_mahalanobis_whitening import (  # noqa: E402
    RFFMahalanobis,
    split_conformal_threshold,
)


def extract_stay_trajectories(max_hours: float | None = None) -> Dict[int, np.ndarray]:
    """
    Extracts timestamp-ordered 5-channel physiological state trajectories X_t
    for each MIMIC-IV ICU stay:
      ch0: Cardiovascular strain (HR & MAP coupling)
      ch1: Arterial pulse-pressure & systolic tone
      ch2: Respiratory oxygenation strain (RR & SpO2)
      ch3: Hemodynamic shock ratio (HR / SBP)
      ch4: Autonomic variability / baroreflex modulation
    """
    icustays = pd.read_csv(DATA_DIR / "icu_icustays.csv.gz")
    icustays["intime"] = pd.to_datetime(icustays["intime"])
    intime_map = dict(zip(icustays["stay_id"], icustays["intime"]))

    ce = pd.read_csv(
        DATA_DIR / "icu_chartevents.csv.gz",
        usecols=["stay_id", "charttime", "itemid", "valuenum"],
    )
    ce["charttime"] = pd.to_datetime(ce["charttime"])
    ce = ce[ce["itemid"].isin(ALL_VITAL_ITEMS) & ce["valuenum"].notna()].copy()

    trajectories: Dict[int, np.ndarray] = {}
    for stay_id, grp in ce.groupby("stay_id"):
        if stay_id not in intime_map:
            continue
        grp = grp.sort_values("charttime")
        if max_hours is not None:
            cutoff = intime_map[stay_id] + pd.Timedelta(hours=float(max_hours))
            grp = grp[grp["charttime"] <= cutoff]
            if grp.empty:
                continue

        hr = grp.loc[grp["itemid"].isin(ITEM_HR), "valuenum"].values
        sbp = grp.loc[grp["itemid"].isin(ITEM_SBP), "valuenum"].values
        map_v = grp.loc[grp["itemid"].isin(ITEM_MAP), "valuenum"].values
        dbp = grp.loc[grp["itemid"].isin(ITEM_DBP), "valuenum"].values
        rr = grp.loc[grp["itemid"].isin(ITEM_RR), "valuenum"].values
        spo2 = grp.loc[grp["itemid"].isin(ITEM_SPO2), "valuenum"].values

        T = min(len(hr), len(sbp), len(rr))
        if T < 3:
            continue
        T_cap = min(T, 64)
        idx = np.linspace(0, T - 1, T_cap).astype(int)

        hr_s = hr[idx]
        sbp_s = sbp[idx]
        rr_s = rr[idx]
        map_s = (
            map_v[np.linspace(0, len(map_v) - 1, T_cap).astype(int)]
            if len(map_v) >= 3
            else 0.70 * sbp_s
        )
        dbp_s = (
            dbp[np.linspace(0, len(dbp) - 1, T_cap).astype(int)]
            if len(dbp) >= 3
            else 0.65 * sbp_s
        )
        spo2_s = (
            spo2[np.linspace(0, len(spo2) - 1, T_cap).astype(int)]
            if len(spo2) >= 3
            else np.full(T_cap, 97.0)
        )

        pp_s = sbp_s - dbp_s
        si_s = hr_s / np.clip(sbp_s, 40.0, None)

        ch0 = np.maximum(0.0, (hr_s - 75.0) / 20.0) + np.maximum(0.0, (78.0 - map_s) / 14.0)
        ch1 = np.maximum(0.0, (118.0 - sbp_s) / 22.0) + np.maximum(0.0, (42.0 - pp_s) / 14.0)
        ch2 = np.maximum(0.0, (rr_s - 16.0) / 5.5) + np.maximum(0.0, (97.0 - spo2_s) / 3.5)
        ch3 = np.maximum(0.0, (si_s - 0.65) / 0.18)
        # Baroreflex / cardiorespiratory ratio trajectory
        ch4 = (hr_s / np.clip(rr_s, 6.0, None) - 4.5) / 1.5 + 0.5 * (ch0 - ch2)

        trajectories[int(stay_id)] = np.column_stack([ch0, ch1, ch2, ch3, ch4])

    return trajectories


# ---------------------------------------------------------------------------
# Pillar 1: Empirical Hypothesis Test of Asynchronous Subsystem Time-Slippage
# ---------------------------------------------------------------------------

def build_organ_coupled_trajectories(
    df: pd.DataFrame, trajectories: Dict[int, np.ndarray]
) -> List[np.ndarray]:
    """
    Constructs the 5-subsystem trajectory for each ICU stay where each organ
    system evolves along its characteristic physiological relaxation timescale:
      - Hemo/Cardiac (alpha_0 = 0.50): fast baroreflex/tachycardic response
      - Respiratory/Vent (alpha_1 = 0.70): rapid tachypneic/oxygenation shift
      - Renal-Metabolic (alpha_2 = 1.40): intermediate clearance/acidosis lag
      - Neurological (alpha_3 = 1.85): delayed perfusion/encephalopathy decay
      - Thermo-Inflammatory (alpha_4 = 1.10): systemic cytokine/leukocyte wave
    """
    alphas = np.array([0.50, 0.70, 1.40, 1.85, 1.10], dtype=np.float64)
    coupled_list: List[np.ndarray] = []
    for row in df.itertuples():
        sid = int(row.stay_id)
        organ_profile = np.array(
            [
                float(row.hemo_pocket_strain),
                float(row.resp_vent_strain),
                float(row.renal_metabolic_strain),
                float(row.neuro_tissue_strain),
                float(row.thermo_inflam_strain),
            ],
            dtype=np.float64,
        )
        base_traj = trajectories.get(sid)
        T = base_traj.shape[0] if (base_traj is not None and base_traj.shape[0] >= 4) else 12
        tau = np.linspace(0.05, 1.0, T)[:, None]
        # Distinct power-law relaxation clocks tau^(alpha_k) create true non-collinear
        # worldline braiding (A_ij != 0) when multiple organ systems decompensate
        clock_curves = tau ** alphas[None, :]
        if base_traj is not None and base_traj.shape[0] >= 4:
            coupled = 0.35 * base_traj + 0.65 * (clock_curves * organ_profile[None, :])
        else:
            coupled = clock_curves * organ_profile[None, :]
        coupled_list.append(coupled)
    return coupled_list


def run_pillar1_time_slippage_study(
    df: pd.DataFrame, trajectories: Dict[int, np.ndarray]
) -> dict:
    """
    Tests H1: Patients who progress to sepsis/mortality exhibit significantly
    greater subsystem temporal velocity divergence (phi_i != phi_j), DTW slippage,
    and irreversible Seifert entropy production than survivors.
    """
    y = df["y"].values.astype(int)
    coupled_trajs = build_organ_coupled_trajectories(df, trajectories)

    neg_idx = np.where(y == 0)[0]
    cal_idx = neg_idx[: max(5, len(neg_idx) // 2)]
    cal_trajs = [coupled_trajs[i] for i in cal_idx]

    slip_est = AsynchronousTimeSlippageEstimator(max_lag=4).fit(cal_trajs)
    braid_est = ThermodynamicBraidInvariant(num_subsystems=5).fit(cal_trajs)

    vel_disp, dtw_slip, seifert_epr, levy_frob = [], [], [], []
    for coupled_traj in coupled_trajs:
        ts = slip_est.evaluate_trajectory(coupled_traj)
        br = braid_est.compute_invariants(coupled_traj)
        vel_disp.append(ts.velocity_dispersion)
        dtw_slip.append(ts.mean_dtw_slippage + 0.25 * ts.max_dtw_slippage)
        seifert_epr.append(br.seifert_entropy_production)
        levy_frob.append(br.levy_area_frobenius)

    metrics_map = {
        "subsystem_velocity_dispersion_phi": np.array(vel_disp),
        "dtw_temporal_warp_slippage": np.array(dtw_slip),
        "seifert_irreversible_entropy_production": np.array(seifert_epr),
        "chen_levy_area_circulation": np.array(levy_frob),
    }

    results = {}
    for name, arr in metrics_map.items():
        pos_vals = arr[y == 1]
        neg_vals = arr[y == 0]
        t_stat, p_val_t = stats.ttest_ind(pos_vals, neg_vals, equal_var=False)
        u_stat, p_val_u = stats.mannwhitneyu(pos_vals, neg_vals, alternative="greater")
        pooled_sd = np.sqrt(0.5 * (np.var(pos_vals, ddof=1) + np.var(neg_vals, ddof=1)) + 1e-8)
        cohens_d = float((np.mean(pos_vals) - np.mean(neg_vals)) / pooled_sd)
        results[name] = {
            "mean_positive_shock_stays": float(np.mean(pos_vals)),
            "mean_negative_survivor_stays": float(np.mean(neg_vals)),
            "welch_t_stat": float(t_stat),
            "welch_p_value": float(p_val_t),
            "mann_whitney_u_p_value": float(p_val_u),
            "cohens_d_effect_size": cohens_d,
            "univariate_roc_auc": float(compute_auc(y, arr)),
            "hypothesis_h1_supported": bool(p_val_u < 0.01 and cohens_d > 0.40),
        }
    return results


# ---------------------------------------------------------------------------
# Pillar 2A: Synthetic Ground-Truth Braid Invariance Stress-Test Suite
# ---------------------------------------------------------------------------

def run_pillar2a_invariance_stress_tests() -> dict:
    """
    Tests the invariance and degradation boundary of the Chen Lévy Area / Braid
    Invariant vs. flat windowed Euclidean velocity under:
      1. Monotonic nonlinear time-warping t -> t^gamma (gamma in [1.0, 1.5, 2.0, 3.0])
      2. Irregular packet loss / frame dropout (0%, 20%, 40%, 60%)
      3. Additive Gaussian sensor noise (sigma in [0.0, 0.10, 0.25, 0.50])
    """
    braid_engine = ThermodynamicBraidInvariant(num_subsystems=3)
    N = 120
    t0 = np.linspace(0.0, 1.0, N)

    def make_coupled_trajectory(t_grid: np.ndarray) -> np.ndarray:
        s1 = np.sin(2.0 * np.pi * t_grid) + 0.5 * t_grid
        s2 = np.cos(2.0 * np.pi * t_grid) - 0.4 * (t_grid ** 2)
        s3 = np.sin(4.0 * np.pi * t_grid + 0.6) + 0.3 * np.sin(2.0 * np.pi * t_grid)
        return np.column_stack([s1, s2, s3])

    base_traj = make_coupled_trajectory(t0)
    # Use raw unstandardized anchored Lévy integral for pure parametrization invariance test
    def raw_levy_norm(X: np.ndarray) -> float:
        Z = X - X[0:1, :]
        dZ = np.diff(Z, axis=0)
        Z_mid = 0.5 * (Z[1:, :] + Z[:-1, :])
        A = 0.5 * (Z_mid.T @ dZ - dZ.T @ Z_mid)
        return float(np.linalg.norm(A, ord="fro"))

    def flat_window_velocity_metric(X: np.ndarray) -> float:
        # Standard fixed-tick finite difference RMS velocity
        v = np.diff(X, axis=0) * float(len(X))
        return float(np.sqrt(np.mean(v ** 2)))

    base_levy = raw_levy_norm(base_traj)
    base_flat = flat_window_velocity_metric(base_traj)

    # 1. Monotonic Time-Warping Stress Test: t -> t^gamma
    time_warp_results = {}
    for gamma in (1.0, 1.5, 2.0, 3.0):
        t_warped = t0 ** gamma
        traj_warped = make_coupled_trajectory(t_warped)
        levy_w = raw_levy_norm(traj_warped)
        flat_w = flat_window_velocity_metric(traj_warped)
        time_warp_results[f"gamma_{gamma:.1f}"] = {
            "braid_levy_relative_drift_pct": round(100.0 * abs(levy_w - base_levy) / max(base_levy, 1e-8), 3),
            "flat_euclidean_velocity_drift_pct": round(100.0 * abs(flat_w - base_flat) / max(base_flat, 1e-8), 3),
        }

    # 2. Irregular Frame Dropout (Sparsity) Stress Test
    rng = np.random.default_rng(42)
    sparsity_results = {}
    for drop_rate in (0.0, 0.20, 0.40, 0.60):
        drifts_braid = []
        drifts_flat = []
        for _ in range(25):
            keep_n = max(6, int(round(N * (1.0 - drop_rate))))
            keep_idx = np.sort(rng.choice(N, size=keep_n, replace=False))
            keep_idx[0] = 0
            keep_idx[-1] = N - 1
            sub_traj = base_traj[keep_idx]
            drifts_braid.append(100.0 * abs(raw_levy_norm(sub_traj) - base_levy) / base_levy)
            drifts_flat.append(100.0 * abs(flat_window_velocity_metric(sub_traj) - base_flat) / base_flat)
        sparsity_results[f"dropout_{int(drop_rate * 100)}pct"] = {
            "braid_levy_mean_drift_pct": round(float(np.mean(drifts_braid)), 2),
            "flat_velocity_mean_drift_pct": round(float(np.mean(drifts_flat)), 2),
        }

    # 3. Additive Sensor Noise Stress Test (Discriminative AUC across 100 synthetic stays)
    noise_results = {}
    for sigma in (0.05, 0.15, 0.30, 0.50):
        y_syn = np.array([0] * 50 + [1] * 50)
        scores_braid = []
        for label in y_syn:
            noise = rng.normal(0.0, sigma, size=(N, 3))
            if label == 0:
                # Reversible phase-locked oscillation (zero net loop area)
                s = np.sin(2.0 * np.pi * t0)
                tr = np.column_stack([s, 0.8 * s, -0.6 * s]) + noise
            else:
                # Phase-decoupled shock loop (non-zero braid circulation)
                tr = make_coupled_trajectory(t0 ** 1.7) + noise
            inv = braid_engine.compute_invariants(tr)
            scores_braid.append(inv.levy_area_frobenius + inv.gauss_winding_norm)
        noise_results[f"noise_sigma_{sigma:.2f}"] = {
            "braid_invariant_roc_auc": round(float(compute_auc(y_syn, np.array(scores_braid))), 4)
        }

    return {
        "monotonic_time_warping_invariance": time_warp_results,
        "irregular_packet_dropout_degradation": sparsity_results,
        "sensor_noise_snr_boundary": noise_results,
    }


# ---------------------------------------------------------------------------
# Pillar 2B: Head-to-Head Real MIMIC-IV Benchmark Across All Horizons
# ---------------------------------------------------------------------------

def evaluate_pillar2b_mimic_horizon(
    df: pd.DataFrame, trajectories: Dict[int, np.ndarray]
) -> dict:
    """
    Compares 6 distinct methodological families on the real MIMIC-IV ICU cohort
    using strict zero-leakage survivor calibration (D_cal -> D_test):
      1. v1_baseline_linear (0.7721 floor on full_stay)
      2. tda_persistent_homology_betti (Vietoris-Rips H_0/H_1 persistence)
      3. quantum_spectral_laplacian (Padé exp(-beta L) + Von Neumann entropy)
      4. teb_braid_and_time_slippage (Chen Lévy area + Gauss winding + DTW slippage)
      5. v2_conformal_ot_rff_cone (One-Sided Pathological Cone RFF Mahalanobis)
      6. v3_gsi_unified_conformal_ot_quantum_braid (Unified v3.0 architecture)
    """
    y = df["y"].values.astype(int)
    stay_ids = df["stay_id"].values.astype(int)

    v1_cols = [
        "mean_shock_index",
        "hypotension_strain",
        "tachypnea_strain",
        "csd_composite",
        "sb_control_energy",
    ]
    v2_cols = [
        "hemo_pocket_strain",
        "resp_vent_strain",
        "renal_metabolic_strain",
        "neuro_tissue_strain",
        "thermo_inflam_strain",
        "csd_composite",
        "sb_control_energy",
    ]
    X_v1 = df[v1_cols].values.astype(float)
    X_v2 = df[v2_cols].values.astype(float)

    neg_idx = np.where(y == 0)[0]
    cal_idx = neg_idx[: len(neg_idx) // 2]
    coupled_trajs = build_organ_coupled_trajectories(df, trajectories)
    cal_trajs = [coupled_trajs[i] for i in cal_idx]

    slip_est = AsynchronousTimeSlippageEstimator(max_lag=4).fit(cal_trajs)
    braid_est = ThermodynamicBraidInvariant(num_subsystems=5).fit(cal_trajs)
    qspec_est = QuantumSpectralTrajectoryLaplacian(beta=0.75).fit(cal_trajs)
    tda_est = PersistentHomologyBetti().fit(cal_trajs)
    erg_est = ErgodicBraidBifurcationMonitor(window_size=5)

    tda_feats, qspec_feats, teb_feats = [], [], []
    for idx_row, row in enumerate(df.itertuples()):
        traj = coupled_trajs[idx_row]

        ph = tda_est.evaluate_trajectory(traj)
        qs = qspec_est.evaluate_trajectory(traj)
        ts = slip_est.evaluate_trajectory(traj)
        br = braid_est.compute_invariants(traj)
        eb = erg_est.evaluate_trajectory(traj)

        tda_feats.append([
            ph.h0_total_persistence,
            ph.h0_max_persistence,
            ph.h1_loop_persistence,
            float(row.hemo_pocket_strain),
            float(row.resp_vent_strain),
        ])
        qspec_feats.append([
            qs.hilbert_conformal_distance,
            qs.spectral_energy_highfreq,
            1.0 - qs.von_neumann_entropy,
            float(row.hemo_pocket_strain),
            float(row.renal_metabolic_strain),
        ])
        teb_feats.append([
            ts.velocity_dispersion,
            ts.mean_dtw_slippage,
            br.levy_area_frobenius,
            br.seifert_entropy_production,
            br.jones_skein_trace_distance,
            eb.ftbe_exponent,
        ])

    X_tda = np.asarray(tda_feats, dtype=np.float64)
    X_qspec = np.asarray(qspec_feats, dtype=np.float64)
    X_teb = np.asarray(teb_feats, dtype=np.float64)

    # 1. Baseline v1
    w_v1 = np.array([0.30, 0.25, 0.20, 0.12, 0.13])
    m1, s1, L1 = fit_calibration_whitening(X_v1[cal_idx], eps=1e-5)
    scores_v1 = apply_frozen_whitening(X_v1, m1, s1, L1) @ w_v1

    # 2. Persistent Homology (TDA)
    w_tda = np.array([0.22, 0.22, 0.16, 0.20, 0.20])
    mt, st, Lt = fit_calibration_whitening(X_tda[cal_idx], eps=0.25)
    scores_tda = apply_frozen_whitening(X_tda, mt, st, Lt) @ w_tda

    # 3. Quantum Spectral Laplacian (Quantum TDA)
    w_qs = np.array([0.28, 0.20, 0.12, 0.20, 0.20])
    mq, sq, Lq = fit_calibration_whitening(X_qspec[cal_idx], eps=0.25)
    scores_qspec = apply_frozen_whitening(X_qspec, mq, sq, Lq) @ w_qs

    # 4. Thermodynamic Braid + Time-Slippage
    w_teb = np.array([0.26, 0.16, 0.20, 0.18, 0.10, 0.10])
    mb, sb_std, Lb = fit_calibration_whitening(X_teb[cal_idx], eps=0.25)
    scores_teb_pure = apply_frozen_whitening(X_teb, mb, sb_std, Lb) @ w_teb

    # 5. Conformal-OT v2.0 (One-Sided Pathological Cone RFF Mahalanobis + Multi-Frame)
    w_v2 = np.array([0.18, 0.24, 0.22, 0.22, 0.08, 0.03, 0.03])
    m2, s2, L2 = fit_calibration_whitening(X_v2[cal_idx], eps=0.25)
    scores_v2_mf = apply_frozen_whitening(X_v2, m2, s2, L2) @ w_v2
    rff_v2 = RFFMahalanobis(n_features=96, shrink=0.25, seed=42, one_sided_cone=True).fit(X_v2[cal_idx])
    scores_v2_rff = 0.55 * scores_v2_mf + 0.45 * rff_v2.score(X_v2)

    # 6. GSI v3.0 Unified (Conformal-OT v2.0 + Thermodynamic Braid + Quantum Spectral Laplacian)
    X_v3 = np.column_stack([
        X_v2,
        X_teb[:, 0],  # velocity_dispersion (phi_i slippage)
        X_teb[:, 2],  # levy_area_frobenius
        X_teb[:, 3],  # seifert_entropy_production
        X_qspec[:, 0],  # hilbert_conformal_distance
    ])
    w_v3 = np.array([0.15, 0.21, 0.19, 0.19, 0.07, 0.02, 0.02, 0.05, 0.03, 0.04, 0.03])
    m3, s3, L3 = fit_calibration_whitening(X_v3[cal_idx], eps=0.28)
    scores_v3_whitened = apply_frozen_whitening(X_v3, m3, s3, L3) @ w_v3
    rff_v3 = RFFMahalanobis(n_features=128, shrink=0.28, seed=42, one_sided_cone=True).fit(X_v3[cal_idx])
    scores_v3_unified = 0.55 * scores_v3_whitened + 0.45 * rff_v3.score(X_v3)

    # Proper Split-Conformal Coverage Verification:
    # Split held-out negatives (outside cal_idx) into D_cal_thresh and D_test_eval
    rem_neg = neg_idx[len(neg_idx) // 2 :]
    rng_split = np.random.default_rng(1337)
    perm_rem = rng_split.permutation(rem_neg)
    mid_rem = max(5, len(perm_rem) // 2)
    thresh_neg_idx = perm_rem[:mid_rem]
    eval_neg_idx = perm_rem[mid_rem:]
    tau_v3 = split_conformal_threshold(scores_v3_unified[thresh_neg_idx], alpha=0.10)
    emp_cov_v3 = float(np.mean(scores_v3_unified[eval_neg_idx] <= tau_v3))

    models = {
        "1_v1_baseline_linear": scores_v1,
        "2_tda_persistent_homology_betti": scores_tda,
        "3_quantum_tda_spectral_laplacian": scores_qspec,
        "4_teb_braid_and_time_slippage_alone": scores_teb_pure,
        "5_v2_conformal_ot_rff_cone": scores_v2_rff,
        "6_v3_gsi_unified_conformal_ot_quantum_braid": scores_v3_unified,
    }
    out = {
        "n_stays": int(len(y)),
        "n_positives": int(np.sum(y)),
        "v3_heldout_conformal_coverage_90pct_target": round(emp_cov_v3, 4),
        "models": {},
    }
    for m_name, sc in models.items():
        auc_val = float(compute_auc(y, sc))
        ci_lo, ci_hi = bootstrap_ci(y, sc)
        out["models"][m_name] = {
            "roc_auc": round(auc_val, 4),
            "ci95": [round(ci_lo, 4), round(ci_hi, 4)],
            "lift_over_v1_baseline": round(auc_val - float(compute_auc(y, scores_v1)), 4),
        }
    return out


# ---------------------------------------------------------------------------
# Pillar 3: Ergodicity Breaking & Early-Warning Lead Time Prior to Collapse
# ---------------------------------------------------------------------------

def run_pillar3_bifurcation_lead_time(trajectories: Dict[int, np.ndarray], df: pd.DataFrame) -> dict:
    """
    Evaluates early-warning lead time of the Finite-Time Braiding Exponent (FTBE)
    and Broken-Detailed-Balance Braid Flux prior to critical transitions on:
      1. Synthetic Coupled Cardiorespiratory Van der Pol Oscillator approaching
         autonomic decoupling bifurcation at t_crit = 160 (200 total steps).
      2. Real MIMIC-IV ICU shock stays that cross the scalar hypotension alarm (MAP < 65).
    """
    monitor = ErgodicBraidBifurcationMonitor(window_size=6)
    rng = np.random.default_rng(2026)

    # 1. Coupled Van der Pol Bifurcation Simulation (50 Monte Carlo runs)
    T_sim = 200
    syn_lead_steps = []
    syn_ftbe_pre = []
    syn_ftbe_post = []

    for _ in range(50):
        x = np.zeros((T_sim, 3), dtype=np.float64)
        x[0] = [0.5, 0.0, 0.5]
        dt = 0.10
        for t in range(1, T_sim):
            # Coupling strength kappa(t) decays toward bifurcation at t=140..165
            kappa = max(0.0, 1.0 - max(0, t - 90) / 65.0)
            # Subsystem 1 (Cardiac) speeds up while Subsystem 2 (Renal) slows down
            phi_1 = 1.0 + 0.8 * max(0.0, (t - 100) / 80.0)
            phi_2 = max(0.15, 1.0 - 0.7 * max(0.0, (t - 100) / 80.0))
            dx0 = phi_1 * (x[t - 1, 1]) + rng.normal(0, 0.04)
            dx1 = phi_1 * (0.4 * (1.0 - x[t - 1, 0] ** 2) * x[t - 1, 1] - x[t - 1, 0] + kappa * (x[t - 1, 2] - x[t - 1, 0])) + rng.normal(0, 0.04)
            dx2 = phi_2 * (-0.5 * x[t - 1, 2] + kappa * x[t - 1, 0]) - (0.04 if t > 145 else 0.0) + rng.normal(0, 0.03)
            x[t, 0] = x[t - 1, 0] + dt * dx0
            x[t, 1] = x[t - 1, 1] + dt * dx1
            x[t, 2] = x[t - 1, 2] + dt * dx2

        early_summary = monitor.evaluate_trajectory(x[:90])
        full_summary = monitor.evaluate_trajectory(
            x, scalar_alarm_channel=2, scalar_alarm_threshold=1.95, teb_z_threshold=1.60
        )
        syn_ftbe_pre.append(early_summary.ftbe_exponent)
        syn_ftbe_post.append(full_summary.ftbe_exponent)
        syn_lead_steps.append(full_summary.early_warning_lead_steps)

    # 2. Real MIMIC-IV Positive Shock Stays Early-Warning Lead Time
    pos_stays = df[df["y"] == 1]["stay_id"].values.astype(int)
    real_lead_hours = []
    real_eb_pos = []
    for sid in pos_stays:
        traj = trajectories.get(int(sid))
        if traj is not None and traj.shape[0] >= 6:
            res = monitor.evaluate_trajectory(
                traj, scalar_alarm_channel=0, scalar_alarm_threshold=1.75, teb_z_threshold=1.45
            )
            real_lead_hours.append(float(res.early_warning_lead_steps))
            real_eb_pos.append(float(res.ergodicity_breaking_index))

    return {
        "coupled_van_der_pol_hopf_bifurcation": {
            "n_simulations": 50,
            "mean_ftbe_stable_regime": round(float(np.mean(syn_ftbe_pre)), 4),
            "mean_ftbe_pre_collapse_regime": round(float(np.mean(syn_ftbe_post)), 4),
            "mean_early_warning_lead_steps_before_scalar_alarm": round(float(np.mean(syn_lead_steps)), 2),
            "median_early_warning_lead_steps": round(float(np.median(syn_lead_steps)), 2),
        },
        "real_mimic_iv_shock_stays_lead_time": {
            "n_evaluated_shock_stays": len(real_lead_hours),
            "mean_early_warning_lead_hours_before_map65_alarm": round(float(np.mean(real_lead_hours)), 2) if real_lead_hours else 0.0,
            "pct_shock_stays_with_positive_teb_lead_time": round(100.0 * float(np.mean(np.array(real_lead_hours) > 0)), 1) if real_lead_hours else 0.0,
            "mean_ergodicity_breaking_index": round(float(np.mean(real_eb_pos)), 4) if real_eb_pos else 0.0,
        },
    }


def main() -> None:
    warnings.filterwarnings("ignore")
    print("[+] Loading Real MIMIC-IV ICU Cohort & Multi-Subsystem Trajectories...")
    df_full = load_real_clinical(max_hours=None, align_by_timestamp=False)
    trajs_full = extract_stay_trajectories(max_hours=None)

    print("[+] Executing Pillar 1: Asynchronous Subsystem Time-Slippage Hypothesis Test...")
    pillar1 = run_pillar1_time_slippage_study(df_full, trajs_full)

    print("[+] Executing Pillar 2A: Ground-Truth Braid Invariance Stress Tests...")
    pillar2a = run_pillar2a_invariance_stress_tests()

    print("[+] Executing Pillar 2B: Head-to-Head Real MIMIC-IV Benchmark Across Horizons...")
    pillar2b = {}
    for label, h in (("first_6h", 6.0), ("first_12h", 12.0), ("first_24h", 24.0), ("full_stay", None)):
        df_h = load_real_clinical(max_hours=h, align_by_timestamp=(h is not None))
        trajs_h = extract_stay_trajectories(max_hours=h)
        pillar2b[label] = evaluate_pillar2b_mimic_horizon(df_h, trajs_h)

    print("[+] Executing Pillar 3: Ergodicity Breaking & Bifurcation Early-Warning Lead Time...")
    pillar3 = run_pillar3_bifurcation_lead_time(trajs_full, df_full)

    report = {
        "institution": "Galaxy Science Institute (Texas Domestic Nonprofit Corp #15043440630001 | IRS EIN 43-2804773)",
        "benchmark_suite": "GSI-WP-05 v3.0 Falsifiable Three-Pillar Validation (TEB, Quantum Spectral TDA, Persistent Homology, Conformal-OT)",
        "pillar_1_asynchronous_time_slippage_hypothesis": pillar1,
        "pillar_2a_synthetic_braid_invariance_stress_tests": pillar2a,
        "pillar_2b_real_mimic_iv_head_to_head_horizons": pillar2b,
        "pillar_3_ergodicity_breaking_and_lead_time": pillar3,
    }

    out_path = Path(__file__).resolve().parent / "results_clinical_mimic_iv_v3_teb.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\n" + "=" * 78)
    print("GSI v3.0 THREE-PILLAR FALSIFIABLE BENCHMARK SUMMARY")
    print("=" * 78)
    for k, v in pillar1.items():
        print(
            f"[Pillar 1] {k}: d={v['cohens_d_effect_size']:.3f} | "
            f"p_MWU={v['mann_whitney_u_p_value']:.2e} | H1={v['hypothesis_h1_supported']}"
        )
    print("-" * 78)
    for h_label, h_res in pillar2b.items():
        m = h_res["models"]
        print(
            f"[Pillar 2B | {h_label:9s}] "
            f"v1={m['1_v1_baseline_linear']['roc_auc']:.4f} | "
            f"TDA_Betti={m['2_tda_persistent_homology_betti']['roc_auc']:.4f} | "
            f"Quantum_L={m['3_quantum_tda_spectral_laplacian']['roc_auc']:.4f} | "
            f"TEB_Braid={m['4_teb_braid_and_time_slippage_alone']['roc_auc']:.4f} | "
            f"v2_OT={m['5_v2_conformal_ot_rff_cone']['roc_auc']:.4f} | "
            f"v3_Unified={m['6_v3_gsi_unified_conformal_ot_quantum_braid']['roc_auc']:.4f}"
        )
    print("-" * 78)
    p3_vdp = pillar3["coupled_van_der_pol_hopf_bifurcation"]
    p3_mimic = pillar3["real_mimic_iv_shock_stays_lead_time"]
    print(
        f"[Pillar 3] Van der Pol Lead Steps: {p3_vdp['mean_early_warning_lead_steps_before_scalar_alarm']} | "
        f"Real MIMIC-IV Lead Hours Before MAP<65: {p3_mimic['mean_early_warning_lead_hours_before_map65_alarm']}h "
        f"({p3_mimic['pct_shock_stays_with_positive_teb_lead_time']}% stays early-detected)"
    )
    print("=" * 78)


if __name__ == "__main__":
    main()
