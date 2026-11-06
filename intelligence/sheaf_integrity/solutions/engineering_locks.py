"""Deterministic seeds, holonomy eps, import-graph smoke, Block-CRC disclaimer."""
from __future__ import annotations
import importlib
import sys
from pathlib import Path

CORE = Path(__file__).resolve().parents[1] / "core"
sys.path.insert(0, str(CORE))

HOLONOMY_EPS = 1e-6
ENERGY_CONSISTENT_EPS = 1e-8
NUMPY_PIN = "numpy>=1.24,<3"
SEED = 42


def import_graph_smoke() -> list[str]:
    mods = [
        "crc", "sheaf_core", "repair_loop", "surgery", "surgery_equivalence",
        "holonomy_cheeger", "cycle_space", "cohomology", "block_crc",
        "ingest_multisource", "product_modes", "ledger_policy", "ranker_bakeoff",
    ]
    loaded = []
    for m in mods:
        try:
            importlib.import_module(m)
            loaded.append(m)
        except Exception as e:
            loaded.append(f"{m}:FAIL:{type(e).__name__}")
    return loaded


def block_crc_disclaimer() -> str:
    return (
        "Block-CRC is approximate: CRC per Fiedler block; "
        "cross-block edges counted not fully reduced. "
        "Do not claim global optimality."
    )


if __name__ == "__main__":
    print("HOLONOMY_EPS", HOLONOMY_EPS)
    print("SEED", SEED)
    print("imports", import_graph_smoke())
    print(block_crc_disclaimer())
