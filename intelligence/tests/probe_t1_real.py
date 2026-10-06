# PROVENANCE — gse-intelligence-build / tests / probe_t1_real.py (scratch, not a test)
"""Reproduce the real-provider T1 run that tests/e2e/real_data_t1.py claims.

That script hard-codes /home/hatch/... build paths and was never runnable here.
This one uses the worktree-relative paths that actually work, so the PARTIAL
verdict can be observed rather than asserted from a stale note.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "qb-behavior", "src"))

from integration.api import analyze
from integration.providers import ProviderRegistry
from coaching.provider import CoachingEngineProvider
from qb_behavior.situational.provider import SituationalQBProvider
from tests.helpers import card_request, fixture_league_avgs

reg = ProviderRegistry(qb=SituationalQBProvider(),
                       coaching=CoachingEngineProvider(),
                       trust=None, ol=None)
trace = analyze(card_request(), reg, league_avgs=fixture_league_avgs())

print("label:    ", getattr(trace, "label", None))
print("depth:    ", trace.depth)
print("checklist:", {k: (v.value if hasattr(v, "value") else v)
                     for k, v in (trace.checklist or {}).items()})
print("levels:   ", list(trace.levels.keys()))
for name in ("L4", "L5"):
    lvl = trace.levels.get(name, {})
    if isinstance(lvl, dict):
        print(f"{name} bc_met:", lvl.get("breaking_conditions_met"))
        print(f"{name} theses:", lvl.get("correlated_theses"))
        print(f"{name} verdicts:", lvl.get("thesis_verdicts"))
        print(f"{name} layer_verdicts:", lvl.get("layer_verdicts"))
for track, ev in (getattr(trace, "track_evidence", {}) or {}).items():
    for text, _v in ev:
        print(f"  EV {track}: {text[:120]}")
