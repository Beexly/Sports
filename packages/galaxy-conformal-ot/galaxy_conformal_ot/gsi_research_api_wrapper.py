"""
galaxy_conformal_ot.gsi_research_api_wrapper
============================================
Production ASGI/FastAPI & pure-Python microservice wrapper for real-time
GSE-GSI Wasserstein-Mahalanobis Conformal-OT trajectory evaluation (`POST /v2/evaluate_trajectory`)
and GSI Frontier v4.0 Topological-Ergodic Braid Streaming (`POST /api/v3/frontier/stream-braid-invariants`).
"""
from __future__ import annotations

import json
from typing import Any, Dict
import numpy as np

from .gse_gsi_unified_hyperloop import UnifiedHyperloopOrchestrator
from .wasserstein_mahalanobis_whitening import GSEClinicalEngine, ProductionWhiteningEngine
from .quantum_braid_teb import AsynchronousTimeSlippageEstimator, ThermodynamicBraidInvariant
from .sovereign_v4_ds3_avalanche_engine import (
    BylesMeasurementOnlyDS3Braid,
    CrowleyFailedAvalancheFunctional,
)

# Ensure AsynchronousTimeSlippageEstimator has estimate_slippage alias
if not hasattr(AsynchronousTimeSlippageEstimator, "estimate_slippage"):
    AsynchronousTimeSlippageEstimator.estimate_slippage = AsynchronousTimeSlippageEstimator.evaluate_trajectory  # type: ignore[attr-defined]

RECOGNIZED_PARTNERS: Dict[str, str] = {
    "gsi_frontier_academic_tier_01": "Primary Clinical Research Mesh",
    "gse_syndicate_core_quants": "High-Velocity Edge Analytics",
}


def evaluate_trajectory_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Deterministic handler for `/v2/evaluate_trajectory` requests (usable directly or via ASGI)."""
    matrix = np.asarray(payload.get("trajectory", []), dtype=float)
    if matrix.ndim == 1:
        matrix = matrix[:, None]
    if matrix.size == 0 or len(matrix) < 2:
        raise ValueError("trajectory must contain at least 2 time steps.")

    window_size = int(payload.get("window_size", 12))
    alpha = float(payload.get("alpha", 0.10))
    gamma = float(payload.get("gamma", 0.15))

    engine = GSEClinicalEngine(window_size=window_size, regularization=gamma)
    whitened, mahal_scores = engine.conformal_whitening_transform(matrix)
    prod = ProductionWhiteningEngine(frames=(4, 8, window_size), gamma=gamma)
    summary = prod.analyze_trajectory(matrix)

    n_cal = max(2, len(mahal_scores) // 2)
    tau = engine.calibrate(mahal_scores[:n_cal], target_coverage=1.0 - alpha)
    anomalies = engine.predict_anomaly(mahal_scores)

    hyperloop = UnifiedHyperloopOrchestrator(window_size=window_size, gamma=gamma, alpha=alpha)
    stream_verdicts = hyperloop.simulate_kafka_stream(matrix, primary_col=0)

    return {
        "schema": "gsi.conformal_ot.v2.trajectory_verdict",
        "n_timesteps": int(matrix.shape[0]),
        "n_channels": int(matrix.shape[1]),
        "alpha": alpha,
        "target_coverage": round(1.0 - alpha, 4),
        "calibrated_threshold_tau": round(float(tau), 4),
        "multi_frame_summary": summary,
        "whitened_last_state": [round(float(x), 4) for x in whitened[-1]],
        "mahalanobis_scores": [round(float(x), 4) for x in mahal_scores],
        "anomaly_flags": [bool(x) for x in anomalies],
        "critical_shock_steps": [v.step_index for v in stream_verdicts if v.is_critical_shock],
    }


def stream_braid_invariants_payload(payload: dict[str, Any], api_key: str) -> dict[str, Any]:
    """
    Deterministic telemetry handler for Sovereign v4.0 Topological Braid Invariants
    (`POST /api/v3/frontier/stream-braid-invariants`).
    """
    if api_key not in RECOGNIZED_PARTNERS:
        raise PermissionError("Forbidden: Unverified GSI Frontier Access Signature")

    frames = payload.get("subsystem_frames")
    if frames is None:
        frames = payload.get("trajectory")
    if frames is None:
        raise ValueError("subsystem_frames must contain at least 2 time steps and 2 channels.")

    frames_np = np.asarray(frames, dtype=float)
    if frames_np.ndim != 2 or frames_np.shape[0] < 2 or frames_np.shape[1] < 2:
        raise ValueError("subsystem_frames must contain at least 2 time steps and 2 channels.")

    # 1. Real Asynchronous Time Slippage
    slippage_est = AsynchronousTimeSlippageEstimator()
    slippage_metrics = slippage_est.estimate_slippage(frames_np)

    # 2. Real Thermodynamic Braid Invariants
    braid_est = ThermodynamicBraidInvariant(num_subsystems=frames_np.shape[1])
    braid_summary = braid_est.compute_invariants(frames_np)

    # 3. Real Byles Measurement-Only D(S_3) Braiding & Fusion
    ds3_braid = BylesMeasurementOnlyDS3Braid()
    ds3_res = ds3_braid.reconstruct_ds3_braiding_and_fusion(frames_np)

    # 4. Real Crowley Failed Avalanche Functional
    crowley_fn = CrowleyFailedAvalancheFunctional()
    avalanche_res = crowley_fn.evaluate_avalanche_phase(
        trajectory=frames_np,
        levy_area=float(braid_summary.levy_area_frobenius),
        seifert_epr=float(braid_summary.seifert_entropy_production),
        clock_dispersion=float(slippage_metrics.velocity_dispersion),
    )

    # 5. Dual Shock Horizon Topological Warning
    is_shock = (
        avalanche_res["regime"] == "RUNAWAY_THERMALIZING_AVALANCHE"
        or slippage_metrics.velocity_dispersion > 2.5
        or braid_summary.seifert_entropy_production > 3.0
    )
    warning = "CRITICAL_DECOUPLED_SHOCK_HORIZON" if is_shock else "LAMINAR_SYNCHRONIZED_CONTROL"

    return {
        "status": "SUCCESS",
        "partner_identity": RECOGNIZED_PARTNERS[api_key],
        "invariant_telemetry": {
            "chen_levy_area_circulation": float(round(braid_summary.levy_area_frobenius, 6)),
            "seifert_irreversible_entropy_production": float(round(braid_summary.seifert_entropy_production, 6)),
            "subsystem_velocity_dispersion_phi": float(round(slippage_metrics.velocity_dispersion, 6)),
            "dtw_temporal_warp_slippage": float(round(slippage_metrics.mean_dtw_slippage, 6)),
            "jones_skein_trace_distance": float(round(braid_summary.jones_skein_trace_distance, 6)),
            "ds3_magic_monotone_m2": float(round(ds3_res["empirical_magic_m2"], 6)),
            "crowley_avalanche_ratio": float(round(avalanche_res["net_avalanche_ratio"], 6)),
            "crowley_avalanche_regime": str(avalanche_res["regime"]),
        },
        "topological_phase_warning": warning,
    }


async def app(scope: dict[str, Any], receive: Any, send: Any) -> None:
    """Minimal zero-dependency ASGI application exposing v2 and v3 GSI endpoints."""
    if scope["type"] != "http":
        return
    path = scope.get("path", "")
    method = scope.get("method", "GET").upper()

    if path == "/healthz" and method == "GET":
        body = json.dumps({"status": "ok", "engine": "gse-gsi-conformal-ot-v4.0"}).encode("utf-8")
        await send({"type": "http.response.start", "status": 200, "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": body})
        return

    if path == "/v2/evaluate_trajectory" and method == "POST":
        chunks = []
        while True:
            msg = await receive()
            chunks.append(msg.get("body", b""))
            if not msg.get("more_body", False):
                break
        try:
            payload = json.loads(b"".join(chunks).decode("utf-8"))
            res = evaluate_trajectory_payload(payload)
            status = 200
        except Exception as exc:
            res = {"error": str(exc)}
            status = 400
        body = json.dumps(res).encode("utf-8")
        await send({"type": "http.response.start", "status": status, "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": body})
        return

    if path == "/api/v3/frontier/stream-braid-invariants" and method == "POST":
        chunks = []
        while True:
            msg = await receive()
            chunks.append(msg.get("body", b""))
            if not msg.get("more_body", False):
                break
        try:
            raw_headers = scope.get("headers", [])
            headers_dict = {k.lower(): v for k, v in raw_headers}
            api_key_bytes = headers_dict.get(b"x-gsi-frontier-key", b"")
            api_key = api_key_bytes.decode("utf-8")

            raw_body = b"".join(chunks).decode("utf-8")
            payload = json.loads(raw_body) if raw_body else {}
            res = stream_braid_invariants_payload(payload, api_key=api_key)
            status = 200
        except PermissionError as exc:
            res = {"error": str(exc)}
            status = 403
        except ValueError as exc:
            res = {"error": str(exc)}
            status = 400
        except Exception as exc:
            res = {"error": str(exc)}
            status = 500

        body = json.dumps(res).encode("utf-8")
        await send({"type": "http.response.start", "status": status, "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": body})
        return

    await send({"type": "http.response.start", "status": 404, "headers": [(b"content-type", b"application/json")]})
    await send({"type": "http.response.body", "body": b'{"error":"not_found"}'})
