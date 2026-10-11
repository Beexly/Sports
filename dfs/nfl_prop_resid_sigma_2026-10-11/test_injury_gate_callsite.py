"""Unit test: the wk5 live injury pull in prop_resid_sigma.py goes through
intelligence/providers/injury_gate.require_injury_published (Friday 18:00 ET).

Run from repo root: python3 -m pytest -q dfs/nfl_prop_resid_sigma_2026-10-11/test_injury_gate_callsite.py
No network: the fetch is replaced by a recorder.
"""
import importlib.util
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ET = ZoneInfo("America/New_York")


def _load():
    os.chdir(ROOT)
    sys.argv = [sys.argv[0]]                      # no --commit -> ledger goes to /tmp dry-run path
    spec = importlib.util.spec_from_file_location(
        "prop_resid_sigma", os.path.join(ROOT, "dfs/nfl_prop_resid_sigma_2026-10-11/prop_resid_sigma.py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def test_pull_refused_before_friday_1800_et():
    m = _load()
    calls = []
    with pytest.raises(m.require_injury_published.__globals__["InjuryNotPublished"]):
        m.pull_wk5_injuries(now=datetime(2026, 10, 9, 17, 59, tzinfo=ET), fetch=lambda *a: calls.append(a))
    assert calls == []                             # nothing fetched when the gate refuses


def test_pull_allowed_after_friday_1800_et():
    m = _load()
    calls = []
    out = m.pull_wk5_injuries(now=datetime(2026, 10, 9, 18, 0, tzinfo=ET),
                              fetch=lambda *a: calls.append(a) or "sha16")
    assert out == "sha16" and len(calls) == 1 and "injuries_2026.parquet" in calls[0][0]
