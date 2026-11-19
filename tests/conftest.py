"""Shared fixtures for the epistemic test suite.

Keep this file inert: fixtures here must be explicitly requested (or wrapped by
a module-level autouse fixture) so they never silently change a test's clock,
paths, or environment.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

import pytest


@pytest.fixture()
def stage0_frozen_clock(monkeypatch):
    """Pin the Stage-0 roster gate's clock to the fixture config's as_of + 1 day.

    scripts/ops/preflight_live_roster_injury_gate.py is fail-closed on config
    age in production (max_age_days). Tests of settled, fixture-dated slates
    must evaluate that gate at the fixture's date instead of the wall clock,
    or they rot on the calendar (the gate raises "as_of ... is N days old"
    purely because time passed, not because an invariant broke).

    This patches only the gate module's `date` symbol, so every importer
    (load_config / require_week / builders) sees the same frozen clock while
    the rest of the process keeps the real one. The live-clock invariant --
    including the boundary pass and the stale-config raise -- stays covered
    by tests/test_stage0_zero_hallucination_gate.py, which injects `today=`
    explicitly and asserts both sides of the freshness boundary.
    """
    import scripts.ops.preflight_live_roster_injury_gate as gate

    cfg = json.loads(Path(gate.DEFAULT_CONFIG).read_text(encoding="utf-8"))
    pinned = date.fromisoformat(cfg["as_of"]) + timedelta(days=1)

    class _FrozenDate(date):
        @classmethod
        def today(cls) -> date:
            return pinned

    monkeypatch.setattr(gate, "date", _FrozenDate)
    return pinned