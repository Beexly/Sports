"""
FastAPI surface for Knowledge Integrity API v0.2.
Run: uvicorn server.app:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "core"))

from crc import EdgeMap, crc_connection, crc_constant_graph  # noqa: E402

app = FastAPI(
    title="Knowledge Integrity API",
    version="0.2.0",
    description="CRC consistency + proposals. No Riemannian jargon on the wire.",
)


class NodeIn(BaseModel):
    id: str
    features: list[float] | None = None
    system: str | None = None


class EdgeIn(BaseModel):
    source: str
    target: str
    relation: str = "related"
    theta: float = 0.0


class GraphIn(BaseModel):
    nodes: list[NodeIn]
    edges: list[EdgeIn]
    feature_dim: int = 2
    reference_features: dict[str, list[float]] | None = None
    top_k: int = 5


def _build(payload: GraphIn):
    nodes = [n.id for n in payload.nodes]
    d = payload.feature_dim
    features: dict[str, np.ndarray] = {}
    for n in payload.nodes:
        if n.features is None:
            features[n.id] = np.zeros(d)
        else:
            v = np.asarray(n.features, dtype=float).ravel()
            if v.size < d:
                v = np.pad(v, (0, d - v.size))
            features[n.id] = v[:d]

    use_connection = d == 2 and any(abs(e.theta) > 1e-12 for e in payload.edges)
    reference = None
    if payload.reference_features:
        reference = {
            k: np.asarray(v, dtype=float).ravel()[:d]
            for k, v in payload.reference_features.items()
        }

    if use_connection or d == 2:
        maps = [
            EdgeMap(e.source, e.target, e.relation, float(e.theta)) for e in payload.edges
        ]
        feats2 = {k: v[:2] if v.size >= 2 else np.pad(v, (0, 2 - v.size)) for k, v in features.items()}
        ref2 = None
        if reference:
            ref2 = {
                k: v[:2] if v.size >= 2 else np.pad(v, (0, max(0, 2 - v.size)))
                for k, v in reference.items()
            }
        report = crc_connection(nodes, maps, feats2, reference=ref2)
    else:
        edges = [(e.source, e.target, e.relation) for e in payload.edges]
        report = crc_constant_graph(nodes, edges, features, d, reference=reference)
    return report


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "knowledge-integrity", "version": "0.2.0"}


@app.post("/v1/consistency")
def consistency(body: GraphIn) -> dict[str, Any]:
    try:
        report = _build(body)
        return report.to_dict()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/v1/propose")
def propose(body: GraphIn) -> dict[str, Any]:
    try:
        report = _build(body)
        props = report.proposals[: body.top_k]
        return {
            "baseline_energy": report.energy,
            "repair_class": report.repair_class,
            "proposals": props,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
