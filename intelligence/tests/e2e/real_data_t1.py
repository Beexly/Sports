# PROVENANCE — gse-intelligence-build / tests/e2e / real_data_t1.py (scratch validation script, not a test).
# Real-data validation lead run 2026-10-02: T1 pressure-funnel kill on REAL nflverse
# providers (qb-behavior situational, coaching engine, empty trust intake). OL track
# has NO real provider (nflverse pbp has no injury columns — verified DATA-GAP).
# This script is evidence-gathering, not part of the test suite.
"""Run integration.analyze() on the PIT@CLE Week 4 fixture with REAL providers."""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, "/home/hatch/workspace/gse-intelligence-build")

from integration.api import analyze
from integration.providers import ProviderRegistry
from integration.stubs import fixture_game
from tests.helpers import card_request, funnel_legs, fixture_league_avgs

import importlib.util as _ilu


def _load_trust_pkg():
    pkg_dir = "/home/hatch/workspace/gse-intelligence-build/trust-signals"
    spec = _ilu.spec_from_file_location(
        "trust_signals", os.path.join(pkg_dir, "__init__.py"),
        submodule_search_locations=[pkg_dir])
    mod = _ilu.module_from_spec(spec)
    sys.modules["trust_signals"] = mod
    spec.loader.exec_module(mod)
    return mod


_ts = _load_trust_pkg()
from trust_signals.provider import FileStoreTrustSignalProvider
from trust_signals.store import IntakeStore
from coaching.provider import CoachingEngineProvider

import os
sys.path.insert(0, "/home/hatch/workspace/gse-intelligence-build/qb-behavior/src")
from qb_behavior.situational.provider import SituationalQBProvider


def main() -> None:
    qb = SituationalQBProvider()
    coaching = CoachingEngineProvider()
    empty_root = "/tmp/gse-real-t1-empty-intake"
    os.makedirs(empty_root, exist_ok=True)
    trust = FileStoreTrustSignalProvider(store=IntakeStore(empty_root))
    reg = ProviderRegistry(qb=qb, coaching=coaching, trust=trust, ol=None)

    req = card_request()  # fixture game, funnel legs, exposure=CARD, depth=L1
    trace = analyze(req, reg, league_avgs=fixture_league_avgs())

    out = {
        "label": getattr(trace, "label", None),
        "depth": getattr(trace.depth, "value", str(trace.depth)),
        "checklist": {k: (v.value if hasattr(v, "value") else str(v))
                      for k, v in (getattr(trace, "checklist", {}) or {}).items()},
        "levels": list(getattr(trace, "levels", {}).keys()),
        "escalation": [str(e) for e in getattr(trace, "escalation_log", [])],
    }
    l3 = trace.levels.get("L3", {})
    out["L3_chains"] = l3.get("chains", []) if isinstance(l3, dict) else None
    l4 = trace.levels.get("L4", {})
    if isinstance(l4, dict):
        out["L4_breaking_conditions_met"] = l4.get("breaking_conditions_met")
        out["L4_theses"] = l4.get("correlated_theses")
        out["L4_evaluated"] = l4.get("evaluated_conditions")
        out["L4_gap_assumptions"] = l4.get("gap_assumptions")
        out["L4_counter"] = (l4.get("counter_argument") or "")[:300]
    l5 = trace.levels.get("L5", {})
    if isinstance(l5, dict):
        out["L5_layer_verdicts"] = l5.get("layer_verdicts")
    with open("/tmp/gse-real-t1-report.json", "w") as f:
        json.dump(out, f, indent=2, default=str)
    print(json.dumps(out, indent=2, default=str)[:4000])


if __name__ == "__main__":
    main()
