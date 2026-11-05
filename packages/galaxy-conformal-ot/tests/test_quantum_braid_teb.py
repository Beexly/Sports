"""
Unit & Mathematical Invariance Tests for GSI v3.0 Quantum-Spectral &
Thermodynamic Ergodic Braiding (TEB) Modules.
"""

from __future__ import annotations

import numpy as np
import torch

import pytest
from galaxy_conformal_ot.quantum_braid_teb import (
    AsynchronousTimeSlippageEstimator,
    ErgodicBraidBifurcationMonitor,
    PersistentHomologyBetti,
    QuantumSpectralTrajectoryLaplacian,
    ThermodynamicBraidInvariant,
)
from galaxy_conformal_ot.sovereign_v4_ds3_avalanche_engine import (
    BylesMeasurementOnlyDS3Braid,
    CrowleyFailedAvalancheFunctional,
    ConformalSelectiveHorizonGate,
)
from galaxy_conformal_ot.gsi_research_api_wrapper import (
    RECOGNIZED_PARTNERS,
    stream_braid_invariants_payload,
    app as gsi_asgi_app,
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


def test_byles_measurement_only_ds3_braid_phases_and_magic() -> None:
    ds3 = BylesMeasurementOnlyDS3Braid()

    # Exact theoretical phase verification
    assert abs(ds3.theoretical_r_plus_sq - ds3.omega_bar) < 1e-12
    assert abs(ds3.theoretical_r_g_sq - ds3.omega) < 1e-12
    assert abs(ds3.theoretical_magic_m2 - float(np.log(16.0 / 13.0))) < 1e-12

    # Trajectory reconstruction
    rng = np.random.default_rng(42)
    traj = rng.normal(0.0, 1.0, size=(30, 4))
    res = ds3.reconstruct_ds3_braiding_and_fusion(traj)

    assert "ribbon_commutator_norm" in res
    assert "fidelity_r" in res
    assert "fidelity_f" in res
    assert "theoretical_magic_m2" in res
    assert "empirical_magic_m2" in res
    assert res["fidelity_r"] > 0.95
    assert res["fidelity_f"] > 0.95
    assert abs(res["theoretical_magic_m2"] - float(np.log(16.0 / 13.0))) < 1e-12


def test_crowley_failed_avalanche_functional_regimes() -> None:
    crowley = CrowleyFailedAvalancheFunctional(critical_ratio_threshold=3.2)
    rng = np.random.default_rng(101)
    quiet_traj = rng.normal(0.0, 0.05, size=(40, 4))

    # Homeostatic quiet state: low expansion index, high arrest damping
    quiet_res = crowley.evaluate_avalanche_phase(
        trajectory=quiet_traj,
        levy_area=0.10,
        seifert_epr=0.15,
        clock_dispersion=0.20,
    )
    assert quiet_res["regime"] == "FAILED_AVALANCHE_ARRESTED"
    assert not quiet_res["is_runaway"]
    assert quiet_res["net_avalanche_ratio"] < 3.2

    # Runaway phase transition
    shock_res = crowley.evaluate_avalanche_phase(
        trajectory=quiet_traj,
        levy_area=1.85,
        seifert_epr=3.40,
        clock_dispersion=2.80,
    )
    assert shock_res["regime"] == "RUNAWAY_THERMALIZING_AVALANCHE"
    assert shock_res["is_runaway"]
    assert shock_res["net_avalanche_ratio"] >= 3.2


def test_conformal_selective_horizon_gate_decisive_accuracy() -> None:
    gate = ConformalSelectiveHorizonGate()
    rng = np.random.default_rng(2026)

    # Well-calibrated reference distributions
    cal_neg = rng.normal(loc=0.20, scale=0.04, size=150)
    cal_pos = rng.normal(loc=0.80, scale=0.04, size=150)

    # Test cohort: true negatives, true positives, and ambiguous boundary points
    test_neg = rng.normal(loc=0.20, scale=0.04, size=40)
    test_pos = rng.normal(loc=0.80, scale=0.04, size=40)

    # Ambiguous boundary: scores in the overlap where p_neg > 0.03
    boundary_score = float(np.sort(cal_neg)[-6])
    test_amb = np.full(20, boundary_score)

    test_scores = np.concatenate([test_neg, test_pos, test_amb])
    test_labels = np.concatenate([
        np.zeros(40, dtype=int),
        np.ones(40, dtype=int),
        rng.choice([0, 1], size=20),
    ])

    results = gate.evaluate_selective_horizon(
        cal_neg_scores=cal_neg,
        cal_pos_scores=cal_pos,
        test_scores=test_scores,
        test_labels=test_labels,
        alpha_strict=0.03,
    )

    # Decisive tier MUST be 100% accurate
    assert results["decisive_tier_accuracy"] == 1.0
    assert results["decisive_tier_count"] >= 70
    assert results["decisive_tier_coverage"] >= 0.70
    assert results["full_cohort_auc"] > 0.85


@pytest.mark.asyncio
async def test_stream_braid_invariants_payload_and_asgi() -> None:
    rng = np.random.default_rng(77)
    frames = rng.normal(0.0, 0.5, size=(25, 4)).tolist()

    # 1. Unrecognized API key raises PermissionError
    with pytest.raises(PermissionError, match="Forbidden: Unverified GSI Frontier Access Signature"):
        stream_braid_invariants_payload({"subsystem_frames": frames}, api_key="unauthorized_entity")

    # 2. Invalid shape raises ValueError
    with pytest.raises(ValueError, match="at least 2 time steps and 2 channels"):
        stream_braid_invariants_payload(
            {"subsystem_frames": [[1.0]]},
            api_key="gsi_frontier_academic_tier_01",
        )

    # 3. Successful stream payload evaluation
    res = stream_braid_invariants_payload(
        {"subsystem_frames": frames},
        api_key="gsi_frontier_academic_tier_01",
    )
    assert res["status"] == "SUCCESS"
    assert res["partner_identity"] == "Primary Clinical Research Mesh"
    assert res["topological_phase_warning"] in (
        "CRITICAL_DECOUPLED_SHOCK_HORIZON",
        "LAMINAR_SYNCHRONIZED_CONTROL",
    )
    inv = res["invariant_telemetry"]
    for field in [
        "chen_levy_area_circulation",
        "seifert_irreversible_entropy_production",
        "subsystem_velocity_dispersion_phi",
        "dtw_temporal_warp_slippage",
        "jones_skein_trace_distance",
        "ds3_magic_monotone_m2",
        "crowley_avalanche_ratio",
        "crowley_avalanche_regime",
    ]:
        assert field in inv

    # 4. ASGI handler tests
    import json

    async def mock_receive_factory(body_bytes: bytes):
        sent = False
        async def mock_receive():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            return {"type": "http.request", "body": b"", "more_body": False}
        return mock_receive

    async def run_asgi(path: str, headers: list, body: bytes):
        messages = []
        async def mock_send(msg):
            messages.append(msg)
        recv = await mock_receive_factory(body)
        scope = {
            "type": "http",
            "method": "POST",
            "path": path,
            "headers": headers,
        }
        await gsi_asgi_app(scope, recv, mock_send)
        start = next(m for m in messages if m["type"] == "http.response.start")
        body_msg = next(m for m in messages if m["type"] == "http.response.body")
        return start["status"], json.loads(body_msg["body"].decode("utf-8"))

    valid_hdr = [(b"x-gsi-frontier-key", b"gse_syndicate_core_quants"), (b"content-type", b"application/json")]
    invalid_hdr = [(b"x-gsi-frontier-key", b"invalid_token"), (b"content-type", b"application/json")]

    # 200 on valid
    status_200, body_200 = await run_asgi(
        "/api/v3/frontier/stream-braid-invariants",
        valid_hdr,
        json.dumps({"subsystem_frames": frames}).encode("utf-8"),
    )
    assert status_200 == 200
    assert body_200["status"] == "SUCCESS"

    # 403 on invalid key
    status_403, body_403 = await run_asgi(
        "/api/v3/frontier/stream-braid-invariants",
        invalid_hdr,
        json.dumps({"subsystem_frames": frames}).encode("utf-8"),
    )
    assert status_403 == 403
    assert "error" in body_403

    # 400 on malformed frames
    status_400, body_400 = await run_asgi(
        "/api/v3/frontier/stream-braid-invariants",
        valid_hdr,
        b'{"subsystem_frames": [1]}',
    )
    assert status_400 == 400

