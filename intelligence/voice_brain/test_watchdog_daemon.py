"""
Unit tests for the sovereign voice watchdog daemon's doctrine gate.

The edge announcer is a publish surface with a speaker attached, so it obeys
the fleet's publish gate: no DIAGNOSTIC stamp, or residual-versus-close not
cleared, means silence -- no matter how loud the board's rows are.

Run:
    python -m pytest intelligence/voice_brain/test_watchdog_daemon.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from watchdog_daemon import EdgeWatcher, build_parser  # noqa: E402

ROW = {
    "player": "test player",
    "stat": "pass_yards",
    "side": "OVER",
    "pp_line": 218.5,
    "ev_pct": 25.0,
    "tier": "A",
}

STAMP = {
    "label": "DIAGNOSTIC",
    "is_pick": False,
    "is_edge_claim": False,
    "caveat": "DIAGNOSTIC ONLY — residual-versus-close has NOT cleared.",
}


def _watcher(tmp_path: Path, payload) -> EdgeWatcher:
    board = tmp_path / "board.json"
    board.write_text(json.dumps(payload), encoding="utf-8")
    return EdgeWatcher(board=board)


def test_unstamped_board_is_silent(tmp_path):
    """A legacy board with rows but no stamp must never be announced."""
    watcher = _watcher(tmp_path, {"board": [ROW]})
    assert watcher.poll() == []


def test_stamped_board_without_rvc_clearance_is_silent(tmp_path):
    """The stamp alone is not enough: uncleared RVC keeps the gate shut."""
    watcher = _watcher(tmp_path, {**STAMP, "rvc_cleared": False, "board": [ROW]})
    assert watcher.poll() == []


def test_cleared_stamped_board_announces(tmp_path):
    """Full stamp + rvc_cleared true + an investment-grade row -> one event."""
    watcher = _watcher(tmp_path, {**STAMP, "rvc_cleared": True, "board": [ROW]})
    msgs = watcher.poll()
    assert len(msgs) == 1
    assert "Test Player" in msgs[0]


def test_gate_rejects_partial_stamps_and_list_payloads():
    assert EdgeWatcher.board_gate_open({**STAMP, "rvc_cleared": True}) is True
    # Missing is_pick/is_edge_claim: not the generator's stamp.
    assert EdgeWatcher.board_gate_open({"label": "DIAGNOSTIC", "rvc_cleared": True}) is False
    # A stamp that claims pick status contradicts itself; treat as unstamped.
    assert EdgeWatcher.board_gate_open({**STAMP, "is_pick": True, "rvc_cleared": True}) is False
    # Truthy is not True: the clearance flag must be literally set.
    assert EdgeWatcher.board_gate_open({**STAMP, "rvc_cleared": "yes"}) is False
    # List payloads and unreadable artifacts never open the gate.
    assert EdgeWatcher.board_gate_open([ROW]) is False
    assert EdgeWatcher.board_gate_open(None) is False


def test_bare_run_leaves_both_announcers_off():
    """No flags -> watchers OFF. The daemon must never auto-enable speech."""
    args = build_parser().parse_args([])
    assert args.announce_edge is False
    assert args.announce_bus is False
