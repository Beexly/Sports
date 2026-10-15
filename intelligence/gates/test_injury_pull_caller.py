"""G-02 production-caller tests: the injury pull cannot run around its gate.

Gate under test: intelligence/providers/injury_gate.py
(`require_injury_published` — refuse a live injury pull before Friday 18:00 ET).
Caller under test: intelligence/providers/pull_nfl_injuries.py `main()`.

Battery:
  (a) Before the cutoff, the gate's decision takes effect: exit 3, the
      refusal is the gate's, and ZERO network fetches happen.
  (b) After the cutoff, the pull behaves identically to the ungated
      fetch+digest: same file, same digest contents — the gate adds no
      transformation once the report is published.
  (c) The caller cannot be silently skipped: behaviorally, the gate is
      invoked before any fetch on the allowed path and is the ONLY call
      on the refused path; structurally, the gate call precedes the fetch
      call in main()'s source, so a future edit cannot quietly move the
      fetch above the gate without failing this suite.
"""
from __future__ import annotations

import inspect
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

import providers.pull_nfl_injuries as caller

ET = ZoneInfo("America/New_York")

FRIDAY = "2026-10-16"  # a Friday; the week's report publishes 18:00 ET this day
BEFORE_CUTOFF = datetime(2026, 10, 15, 12, 0, tzinfo=ET)  # Thursday noon ET
AFTER_CUTOFF = datetime(2026, 10, 16, 18, 30, tzinfo=ET)  # Friday 18:30 ET

FIXTURE_PAYLOAD = {
    "injuries": [
        {
            "team": {"abbreviation": "KC", "displayName": "Kansas City Chiefs"},
            "injuries": [
                {
                    "athlete": {"displayName": "Player One", "position": {"abbreviation": "QB"}},
                    "status": "Questionable",
                    "date": "2026-10-15",
                    "details": {"type": "Ankle", "side": "Right", "returnDate": "2026-10-18"},
                },
                {
                    "athlete": {"displayName": "Player Two", "position": {"abbreviation": "WR"}},
                    "status": "Out",
                    "date": "2026-10-14",
                    "details": {"type": "Knee", "side": "Left", "returnDate": "2026-11-01"},
                },
            ],
        },
        {
            # No entry-level team: team lives only on the athlete.
            "injuries": [
                {
                    "athlete": {
                        "displayName": "Player Three",
                        "position": {"abbreviation": "CB"},
                        "team": {"abbreviation": "DEN", "displayName": "Denver Broncos"},
                    },
                    "status": "Doubtful",
                    "date": "2026-10-15",
                    "details": {"type": "Shoulder", "side": "Right", "returnDate": "2026-10-25"},
                },
            ],
        },
    ]
}


class FrozenDateTime(datetime):
    """datetime subclass whose now() is pinned; constructor stays real."""

    frozen: datetime | None = None

    @classmethod
    def now(cls, tz=None):
        assert cls.frozen is not None
        return cls.frozen if tz is None else cls.frozen.astimezone(tz)


@pytest.fixture()
def frozen_now(monkeypatch):
    def _freeze(moment: datetime) -> None:
        FrozenDateTime.frozen = moment
        monkeypatch.setattr(caller, "datetime", FrozenDateTime)

    return _freeze


def _run_main(monkeypatch, tmp_path, week: int = 7) -> int:
    monkeypatch.setattr(
        sys,
        "argv",
        ["pull_nfl_injuries.py", "--week", str(week), "--friday", FRIDAY, "--out-dir", str(tmp_path)],
    )
    return caller.main()


def test_gate_refusal_blocks_fetch_before_cutoff(monkeypatch, tmp_path, frozen_now, capsys):
    """(a) Qualifying state (report not yet published): gate refuses, no fetch."""
    frozen_now(BEFORE_CUTOFF)
    fetch_calls: list[str] = []
    monkeypatch.setattr(caller, "fetch_injuries", lambda: fetch_calls.append("fetch") or FIXTURE_PAYLOAD)

    rc = _run_main(monkeypatch, tmp_path)

    assert rc == 3  # the gate-refusal exit code, distinct from success (0)
    assert fetch_calls == []  # the pull never touched the network
    assert list(tmp_path.iterdir()) == []  # and landed no file
    assert "REFUSED by gate" in capsys.readouterr().out


def test_allowed_pull_matches_ungated_digest_after_cutoff(monkeypatch, tmp_path, frozen_now):
    """(b) No qualifying state (report published): identical behavior to the
    ungated fetch+digest — the gate contributes nothing past the cutoff."""
    frozen_now(AFTER_CUTOFF)
    monkeypatch.setattr(caller, "fetch_injuries", lambda: FIXTURE_PAYLOAD)

    rc = _run_main(monkeypatch, tmp_path)

    assert rc == 0
    out_path = tmp_path / "espn_nfl_injuries_week7.json"
    assert out_path.exists()
    written = json.loads(out_path.read_text(encoding="utf-8"))
    expected = caller.digest(FIXTURE_PAYLOAD)
    assert written["teams"] == expected["teams"]
    assert written["team_count"] == expected["team_count"] == 2
    assert written["row_count"] == expected["row_count"] == 3
    assert written["week"] == 7
    assert written["source"] == caller.ESPN_INJURIES_URL


def test_gate_runs_before_fetch_and_cannot_be_skipped(monkeypatch, tmp_path, frozen_now):
    """(c) Ordering regression: gate first, fetch second — in behavior and
    in source. If the fetch ever moves above the gate, this test fails."""
    calls: list[str] = []
    real_gate = caller.require_injury_published

    def recording_gate(week, now, friday):
        calls.append("gate")
        return real_gate(week, now, friday)

    def recording_fetch():
        calls.append("fetch")
        return FIXTURE_PAYLOAD

    monkeypatch.setattr(caller, "require_injury_published", recording_gate)
    monkeypatch.setattr(caller, "fetch_injuries", recording_fetch)

    frozen_now(AFTER_CUTOFF)
    assert _run_main(monkeypatch, tmp_path) == 0
    assert calls == ["gate", "fetch"]

    calls.clear()
    frozen_now(BEFORE_CUTOFF)
    assert _run_main(monkeypatch, tmp_path) == 3
    assert calls == ["gate"]  # refused path: gate ran, fetch never did

    src = inspect.getsource(caller.main)
    assert src.index("require_injury_published(") < src.index("fetch_injuries(")
