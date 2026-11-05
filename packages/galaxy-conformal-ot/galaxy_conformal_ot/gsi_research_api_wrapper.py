"""
galaxy_conformal_ot.gsi_research_api_wrapper
============================================
Production ASGI/FastAPI & pure-Python microservice wrapper for real-time
GSE-GSI Wasserstein-Mahalanobis Conformal-OT trajectory evaluation (`POST /v2/evaluate_trajectory`).
"""
from __future__ import annotations

from typing import Any
import numpy as np

from .gse_gsi_unified_hyperloop import UnifiedHyperloopOrchestrator
from .wasserstein_mahalanobis_whitening import GSEClinicalEngine, ProductionWhiteningEngine


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


async def app(scope: dict[str, Any], receive: Any, send: Any) -> None:
    """Minimal zero-dependency ASGI application exposing `POST /v2/evaluate_trajectory` and `GET /healthz`."""
    import json

    if scope["type"] != "http":
        return
    path = scope.get("path", "")
    method = scope.get("method", "GET").upper()

    if path == "/healthz" and method == "GET":
        body = json.dumps({"status": "ok", "engine": "gse-gsi-conformal-ot-v2.0"}).encode("utf-8")
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

    await send({"type": "http.response.start", "status": 404, "headers": [(b"content-type", b"application/json")]})
    await send({"type": "http.response.body", "body": b'{"error":"not_found"}'})
