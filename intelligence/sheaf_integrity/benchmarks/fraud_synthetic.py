"""Fraud synthetic benchmark.

Plant: systems are INTERNALLY consistent but disagree with ledger
	o self_consistent_wrong_vs_ledger.
"""

from __future__ import annotations

import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
from crc import EdgeMap, crc_connection  # noqa: E402


def value_diff_score(features, reference):
    total = 0.0
    for k in features:
        total += float(np.sum(np.abs(features[k] - reference[k])))
    return total


def case_self_consistent_wrong_ledger():
    nodes = [f"n{i}" for i in range(5)]
    maps = [EdgeMap(nodes[i], nodes[(i + 1) % 5], "link", 0.0) for i in range(5)]
    vip = np.array([1.0, 0.0])
    std = np.array([0.0, 1.0])
    features = {n: vip.copy() for n in nodes}
    reference = {n: std.copy() for n in nodes}
    report = crc_connection(nodes, maps, features, reference=reference)
    vd = value_diff_score(features, reference)
    return {
        "name": "self_consistent_wrong_ledger",
        "repair_class": report.repair_class,
        "relative_status": report.relative["status"],
        "self_energy": report.energy,
        "value_diff": vd,
        "crc_catches_fraud_signal": report.relative["status"] == "self_consistent_wrong_vs_ledger",
    }


def case_noisy_honest():
    nodes = [f"n{i}" for i in range(5)]
    maps = [EdgeMap(nodes[i], nodes[(i + 1) % 5], "link", 0.0) for i in range(5)]
    rng = np.random.default_rng(0)
    base = np.array([0.0, 1.0])
    features = {n: base + rng.normal(0, 0.05, size=2) for n in nodes}
    reference = {n: base.copy() for n in nodes}
    report = crc_connection(nodes, maps, features, reference=reference)
    return {
        "name": "noisy_honest",
        "repair_class": report.repair_class,
        "relative_status": report.relative["status"],
        "self_energy": report.energy,
        "crc_not_fraud_label": report.relative["status"] != "self_consistent_wrong_vs_ledger",
    }


def run_benchmark():
    return {
        "cases": [case_self_consistent_wrong_ledger(), case_noisy_honest()],
        "summary": {
            "leverage": "Relative CRC labels coordinated false agreement vs ledger",
        },
    }


if __name__ == "__main__":
    import json
    print(json.dumps(run_benchmark(), indent=2, default=float))
