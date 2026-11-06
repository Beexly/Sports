"""Scaled fraud bench: diluted components + temporal windows."""

from __future__ import annotations

import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
from crc import EdgeMap, crc_connection  # noqa: E402


def make_ring(prefix: str, n: int, value: np.ndarray, theta: float = 0.0):
    nodes = [f"{prefix}{i}" for i in range(n)]
    maps = [EdgeMap(nodes[i], nodes[(i + 1) % n], "link", theta) for i in range(n)]
    feats = {nd: value.copy() for nd in nodes}
    return nodes, maps, feats


def diluted_components(n_bad: int = 3, n_good: int = 12, ring_size: int = 4) -> dict:
    vip, std = np.array([1.0, 0.0]), np.array([0.0, 1.0])
    nodes, maps, feats, refs = [], [], {}, {}
    for i in range(n_bad):
        ns, ms, fs = make_ring(f"bad{i}_", ring_size, vip)
        nodes += ns
        maps += ms
        feats.update(fs)
        refs.update({nd: std.copy() for nd in ns})
    for i in range(n_good):
        ns, ms, fs = make_ring(f"good{i}_", ring_size, std)
        nodes += ns
        maps += ms
        feats.update(fs)
        refs.update({nd: std.copy() for nd in ns})

    report = crc_connection(nodes, maps, feats, reference=refs)
    vd = sum(float(np.sum(np.abs(feats[k] - refs[k]))) for k in feats) / len(feats)
    return {
        "n_nodes": len(nodes),
        "n_bad_rings": n_bad,
        "n_good_rings": n_good,
        "relative_status": report.relative["status"],
        "self_energy": report.energy,
        "mean_value_diff": vd,
        "crc_flags_fraud": report.relative["status"] == "self_consistent_wrong_vs_ledger",
        "dilution_ratio_bad_nodes": n_bad * ring_size / len(nodes),
    }


def temporal_windows(n_windows: int = 8, inject_fraud_at: int = 4) -> list[dict]:
    rng = np.random.default_rng(42)
    std = np.array([0.0, 1.0])
    vip = np.array([1.0, 0.0])
    rows = []
    for w in range(n_windows):
        nodes, maps, feats = make_ring("t_", 5, std)
        refs = {nd: std.copy() for nd in nodes}
        if w >= inject_fraud_at:
            feats = {nd: vip.copy() for nd in nodes}
        else:
            feats = {nd: std + rng.normal(0, 0.03, 2) for nd in nodes}
        report = crc_connection(nodes, maps, feats, reference=refs)
        vd = sum(float(np.sum(np.abs(feats[k] - refs[k]))) for k in feats)
        rows.append(
            {
                "window": w,
                "phase": "fraud" if w >= inject_fraud_at else "honest",
                "relative_status": report.relative["status"],
                "repair_class": report.repair_class,
                "self_energy": report.energy,
                "value_diff": vd,
                "crc_fraud_label": report.relative["status"] == "self_consistent_wrong_vs_ledger",
            }
        )
    return rows


def run() -> dict:
    diluted = diluted_components()
    temporal = temporal_windows()
    fraud_windows = [r for r in temporal if r["phase"] == "fraud"]
    honest_windows = [r for r in temporal if r["phase"] == "honest"]
    return {
        "diluted": diluted,
        "temporal": temporal,
        "temporal_summary": {
            "honest_false_positive_rate": mean_bool(honest_windows, "crc_fraud_label"),
            "fraud_detection_rate": mean_bool(fraud_windows, "crc_fraud_label"),
            "inject_at": 4,
        },
    }


def mean_bool(rows, key):
    if not rows:
        return 0.0
    return sum(1 for r in rows if r[key]) / len(rows)


if __name__ == "__main__":
    import json
    print(json.dumps(run(), indent=2, default=float))
