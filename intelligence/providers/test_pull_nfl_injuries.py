"""Tests for the gate-checked NFL injury pull (G-02 production caller).

The refusal path is fully offline: when the gate refuses (now < Friday 18:00 ET
of the requested week), fetch_injuries is never called. The digest parser is
tested on a tiny inline fixture.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "intelligence"))
sys.path.insert(0, str(REPO_ROOT / "intelligence" / "providers"))

import pull_nfl_injuries as pull  # noqa: E402


def test_gate_refuses_before_friday_18et_and_never_fetches(monkeypatch, capsys):
    def _boom(*_a, **_k):
        raise AssertionError("fetch_injuries must NOT be called when the gate refuses")

    monkeypatch.setattr(pull, "fetch_injuries", _boom)
    # main reads sys.argv via argparse; call through a patched argv instead
    monkeypatch.setattr(sys, "argv", ["pull_nfl_injuries", "--week", "7", "--friday", "2099-01-01"])
    rc = pull.main()
    out = capsys.readouterr().out
    assert rc == 3
    assert "REFUSED by gate" in out


def test_digest_parses_teams_and_rows():
    payload = {
        "injuries": [
            {
                "team": {"abbreviation": "TST", "displayName": "Testers"},
                "injuries": [
                    {
                        "athlete": {"displayName": "A Player", "position": {"abbreviation": "QB"}},
                        "status": "Out",
                        "date": "2026-10-13T00:00:00Z",
                        "details": {"type": "Knee", "side": "Left", "returnDate": "2026-11-01"},
                        "type": {"description": "Knee"},
                    }
                ],
            }
        ]
    }
    d = pull.digest(payload)
    assert d["team_count"] == 1
    assert d["row_count"] == 1
    assert d["teams"][0]["team"] == "TST"
    assert d["teams"][0]["injuries"][0]["athlete"] == "A Player"
