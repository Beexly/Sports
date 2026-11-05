"""
Unit & Mathematical Invariance Tests for GSI v3.0 Quantum-Spectral &
Thermodynamic Ergodic Braiding (TEB) Modules.
"""

from __future__ import annotations

import numpy as np
import torch

from galaxy_conformal_ot.quantum_braid_teb import (
    AsynchronousTimeSlippageEstimator,
    ErgodicBraidBifurcationMonitor,
    PersistentHomologyBetti,
    QuantumSpectralTrajectoryLaplacian,
    ThermodynamicBraidInvariant,
)
from galaxy_conformal_ot.quantum_topology_hyper_embedding import (
    GSEClinicalEngineV3,
    GSIBraidedInvariantEngine,
    TopologicalManifoldQuantumEmbedding,
)


def test_topological_manifold_quantum_embedding_calibrated() -> None:
    torch.manual_seed(1337)
    X_cal = torch.randn(40, 3)
    X_eval = torch.randn(20, 3) + 3.0
    model = TopologicalManifoldQuantumEmbedding(input_dim=3, embedding_dim=12, alpha=0.10)
    model.fit_calibration(X_cal)

    Z_cal = model.compute_quantum_spectral_embedding(X_cal)
    Z_eval = model.compute_quantum_spectral_embedding(X_eval)
    scores_cal = model.extract_conformal_anomaly_scores(Z_cal).detach().numpy()
    scores_eval = model.extract_conformal_anomaly_scores(Z_eval).detach().numpy()

    assert Z_cal.shape == (40, 12)
    assert float(np.mean(scores_eval)) > float(np.mean(scores_cal))


def test_gse_clinical_engine_v3_and_braided_engine_shapes() -> None:
    torch.manual_seed(42)
    X = torch.randn(32, 3)
    v3 = GSEClinicalEngineV3(input_dim=3, embedding_dim=8)
    scores = v3(X)
    assert scores.shape == (32,)
    assert torch.all(scores >= 0.0)

    braid = GSIBraidedInvariantEngine(num_subsystems=3, braid_projection_dim=6)
    inv = braid(X)
    assert inv.shape == (6, 6)
    assert torch.all(torch.isfinite(inv))


def test_chen_levy_area_monotonic_time_warp_invariance() -> None:
    t = np.linspace(0.0, 1.0, 150)
    t_warped = t ** 2.2  # Strong nonlinear monotonic clock warp

    def path_fn(tau: np.ndarray) -> np.ndarray:
        return np.column_stack([
            np.sin(2.0 * np.pi * tau) + 0.5 * tau,
            np.cos(2.0 * np.pi * tau) - 0.3 * (tau ** 2),
            0.7 * (tau ** 1.5),
        ])

    X1 = path_fn(t)
    X2 = path_fn(t_warped)

    # Raw unstandardized Chen Lévy integral is invariant under t -> t^gamma
    def raw_levy_frob(X: np.ndarray) -> float:
        Z = X - X[0:1, :]
        dZ = np.diff(Z, axis=0)
        Z_mid = 0.5 * (Z[1:, :] + Z[:-1, :])
        A = 0.5 * (Z_mid.T @ dZ - dZ.T @ Z_mid)
        return float(np.linalg.norm(A, ord="fro"))

    l1 = raw_levy_frob(X1)
    l2 = raw_levy_frob(X2)
    rel_err = abs(l1 - l2) / max(l1, 1e-8)
    assert rel_err < 0.02, f"Expected <2% time-warp drift, got {rel_err:.4f}"


def test_asynchronous_time_slippage_detects_decoupled_clocks() -> None:
    rng = np.random.default_rng(7)
    t = np.linspace(0.0, 1.0, 30)
    # Calibrate on quiet homeostatic trajectories
    cal_trajs = [rng.normal(0.0, 0.08, size=(30, 4)) for _ in range(20)]
    est = AsynchronousTimeSlippageEstimator(max_lag=4).fit(cal_trajs)

    stable = rng.normal(0.0, 0.08, size=(30, 4))
    # Shock trajectory with asymmetric subsystem velocities (fast ch0, slow ch2)
    shock = np.column_stack([
        3.5 * (t ** 0.45),
        2.8 * (t ** 0.70),
        1.8 * (t ** 1.90),
        0.5 * t,
    ])
    m_stable = est.evaluate_trajectory(stable)
    m_shock = est.evaluate_trajectory(shock)

    assert m_shock.velocity_dispersion > m_stable.velocity_dispersion
    assert m_shock.mean_dtw_slippage > m_stable.mean_dtw_slippage


def test_quantum_spectral_laplacian_von_neumann_entropy_bounds() -> None:
    rng = np.random.default_rng(11)
    cal = [rng.normal(0.0, 0.2, size=(16, 4)) for _ in range(15)]
    qspec = QuantumSpectralTrajectoryLaplacian(beta=0.75).fit(cal)

    summary = qspec.evaluate_trajectory(rng.normal(1.2, 0.4, size=(16, 4)))
    assert 0.0 <= summary.von_neumann_entropy <= 1.0001
    assert 0.0 < summary.heat_kernel_trace <= 1.0001
    assert summary.fiedler_connectivity >= 0.0
    assert summary.hilbert_conformal_distance > 0.0


def test_persistent_homology_betti_detects_loop_vs_line() -> None:
    theta = np.linspace(0.0, 2.0 * np.pi, 24, endpoint=False)
    circle = np.column_stack([np.cos(theta), np.sin(theta), np.zeros_like(theta)])
    line = np.column_stack([np.linspace(-1.0, 1.0, 24), np.zeros(24), np.zeros(24)])

    ph = PersistentHomologyBetti()
    s_circle = ph.evaluate_trajectory(circle)
    s_line = ph.evaluate_trajectory(line)

    assert s_circle.h0_total_persistence > 0.0
    assert s_circle.h1_loop_persistence > s_line.h1_loop_persistence


def test_ergodic_braid_bifurcation_monitor_lead_time() -> None:
    t = np.linspace(0.0, 1.0, 40)
    # Trajectory where braiding/oscillation starts at t=0.35 before scalar threshold crosses at t=0.80
    traj = np.column_stack([
        2.5 * (t ** 3),
        np.sin(6.0 * np.pi * t) * np.maximum(0.0, t - 0.25) * 2.0,
        np.cos(6.0 * np.pi * t) * np.maximum(0.0, t - 0.25) * 2.0,
    ])
    mon = ErgodicBraidBifurcationMonitor(window_size=6)
    res = mon.evaluate_trajectory(traj, scalar_alarm_channel=0, scalar_alarm_threshold=1.8, teb_z_threshold=1.2)
    assert res.ftbe_exponent >= 0.0
    assert res.ergodicity_breaking_index >= 0.0
    assert res.early_warning_lead_steps >= 0
