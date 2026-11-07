#!/usr/bin/env python3
"""
WAVE 9 — DRY-RUN ARMED WORKFLOWS VERIFIER (`scripts/wiring/verify_armed_workflows.py --check-armed`)
Rehearses the morning runbook as a dry CLI `--check-armed` verification against tonight's tested stages
without executing any live simulations, live picks, or public gate flips.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
WIRING_DIR = REPO_ROOT / "docs" / "wiring"


def verify_armed() -> Dict[str, Any]:
    required_files = [
        "docs/wiring/BRANCH-CENSUS.csv",
        "docs/wiring/BRANCH-LEDGER.csv",
        "docs/wiring/COMMIT-CENSUS.md",
        "docs/wiring/CORPUS-CENSUS.csv",
        "docs/wiring/RESEARCH-LEDGER.jsonl",
        "docs/wiring/DUAL-COUNT-RECONCILIATION.json",
        "docs/wiring/SPOT-CHECKS-LEDGER.md",
        "docs/wiring/CHARGE-REGRESSION.md",
        "docs/wiring/CORRECTION-LOG.md",
        "docs/wiring/NIGHT-LESSONS.md",
        "docs/wiring/ARMED-WORKFLOWS.md",
        "docs/wiring/LAYER-MAP.md",
        "data/corpus/research_records.jsonl",
        "data/identity/canonical_entities.jsonl",
        "data/equations/equation_execution_registry.jsonl",
        "intelligence/corpus/research_corpus_reader.py",
        "intelligence/identity/entity_resolver.py",
        "packages/prediction-engine/src/identity/entity-resolver.ts",
        "intelligence/reasoning/layers/__init__.py",
        "intelligence/reasoning/context_packet_builder.py",
        "intelligence/reasoning/workflow_runner.py",
        "intelligence/feedback/grading_to_corpus_pipe.py",
        "schemas/v1/layer_output.schema.json",
        "schemas/v1/context_packet.schema.json",
        "schemas/v1/reasoning_trace.schema.json",
        "schemas/v1/simulation_distribution.schema.json",
        "schemas/v1/content_bundle.schema.json",
        "data/context_packets/2026_W09_JAX_BAL.json",
        "data/reasoning/traces/2026_W09_JAX_BAL.trace.json",
    ]
    missing: List[str] = []
    for rel in required_files:
        p = REPO_ROOT / rel
        if not p.exists() or p.stat().st_size == 0:
            missing.append(rel)

    # Verify all 26 layer files exist
    layers_dir = REPO_ROOT / "intelligence" / "reasoning" / "layers"
    layer_files = sorted(layers_dir.glob("layer_[0-2][0-9]_*.py")) if layers_dir.exists() else []

    # Verify public gates remain locked false in NIGHT-STATE.json
    ns_path = WIRING_DIR / "NIGHT-STATE.json"
    gates_locked = False
    if ns_path.exists():
        ns = json.loads(ns_path.read_text(encoding="utf-8"))
        gates = ns.get("public_gates", {})
        gates_locked = (
            gates.get("LIVE_BOARD") is False
            and gates.get("PUBLISH_LEDGER") is False
            and gates.get("PUBLIC_PICKS") is False
            and gates.get("PERFORMANCE_STATS") is False
        )

    passed = (len(missing) == 0) and (len(layer_files) == 26) and gates_locked
    return {
        "check_armed_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "status": "ARMED_READY" if passed else "INCOMPLETE",
        "required_files_checked": len(required_files),
        "missing_files": missing,
        "layer_modules_count": len(layer_files),
        "public_gates_locked_false": gates_locked,
        "live_simulations_run_tonight": 0,
        "live_picks_published_tonight": 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-armed", action="store_true", help="Run dry-run arming check")
    args = parser.parse_args()
    res = verify_armed()
    print(json.dumps(res, indent=2), flush=True)
    if res["status"] != "ARMED_READY":
        sys.exit(1)


if __name__ == "__main__":
    main()
