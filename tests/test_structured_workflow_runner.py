"""Tests for scripts/ops/gse_structured_workflow_runner.py.

Seats 2-5 shell out to the harvester, the trainer, the calibration gate, the DFS
builder and pytest. Those are exercised in their own test modules; here they are
monkeypatched so this file stays fast and tests the runner's contract:
seat shape, check names, checkpointing, dry-run safety, and exit-code behaviour.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "ops"))

import gse_structured_workflow_runner as runner  # noqa: E402


@pytest.fixture(autouse=True)
def isolated_runs(tmp_path, monkeypatch):
    d = tmp_path / "workflow_runs"
    d.mkdir()
    monkeypatch.setattr(runner, "RUNS_DIR", d)
    return d


def _fake(seat, status):
    return {
        "seat": seat,
        "name": f"seat_{seat}",
        "status": status,
        "passed": status in {"PASS", "SKIP"},
        "checks": {},
        "details": {},
        "elapsed_s": 0.0,
    }


# ---------------------------------------------------------------- structure


def test_six_seats_are_registered_with_contract_names():
    assert sorted(runner.SEATS) == [0, 1, 2, 3, 4, 5]
    names = [
        "cleanup_and_doctor",
        "ingest_and_provenance",
        "vision_and_simulation",
        "equations_and_situational",
        "market_and_dfs_gate",
        "audit_and_voice_briefing",
    ]
    for i, expected in enumerate(names):
        fn = runner.SEATS[i]
        assert expected in fn.__name__, (i, fn.__name__, expected)


def test_seat1_declares_six_targets():
    assert len(runner.SEAT1_TARGETS) == 6
    assert "DKSalaries (2).csv" in runner.SEAT1_TARGETS
    assert "DKSalaries (3).csv" in runner.SEAT1_TARGETS


def test_contract_constants_match_the_ledger():
    assert runner.LEDGER_VERIFIED_RECORD == "36-13-1"
    assert runner.LEDGER_VERIFIED_UNITS == "+20.14u"
    assert runner.LEDGER_SECONDARY_RECORD == "38-13-1"


# ---------------------------------------------------------------- seat 0


def test_seat0_doctors_real_ledger():
    r = runner.seat0_cleanup_and_doctor(dry_run=True)
    assert r["seat"] == 0
    assert r["name"] == "cleanup_and_doctor"
    assert r["status"] in {"PASS", "FAIL"}
    checks = r["checks"]
    for key in ("git_head_reachable", "ledger_verified_record", "ledger_verified_units",
                "ledger_secondary_record", "free_space_positive"):
        assert key in checks, key
    details = r["details"]
    assert details["ledger"]["verified_record"] == "36-13-1"
    assert details["ledger"]["verified_net_units"] == "+20.14u"
    assert details["ledger"]["secondary_record"] == "38-13-1"
    assert details["git"]["branch"]
    assert details["env"]["OPENROUTER_API_KEY"] in {"SET", "MISSING"}


def test_seat0_reports_cleanup_decision_without_side_effects():
    r = runner.seat0_cleanup_and_doctor(dry_run=True)
    d = r["details"]
    assert isinstance(d["cleanup_triggered"], bool)
    assert d["free_gb_before"] > 0
    assert d["free_gb_after"] > 0
    # dry-run must never execute npm or git worktree remove
    npm = d.get("npm")
    if npm is not None:
        assert "action" in npm
        assert "run" not in npm
    for wt in d.get("worktrees") or []:
        assert wt.get("action") != "removed"


def test_seat0_flags_bad_ledger(monkeypatch, tmp_path):
    bad = tmp_path / "ledger.json"
    bad.write_text(json.dumps({
        "verified_record": {"record": "99-99-9", "net_units": "+0.00u"},
        "secondary_views": [{"record": "1-1-1", "name": "nope"}],
    }), encoding="utf-8")
    monkeypatch.setattr(runner, "LEDGER", bad)
    r = runner.seat0_cleanup_and_doctor(dry_run=True)
    assert r["status"] == "FAIL"
    assert r["checks"]["ledger_verified_record"] is False
    assert r["checks"]["ledger_secondary_record"] is False


# ---------------------------------------------------------------- seat 1


def test_seat1_checks_disk_and_manifest(monkeypatch, tmp_path):
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps({
        "files": [{"rel_path": n} for n in runner.SEAT1_TARGETS],
        "total_files": len(runner.SEAT1_TARGETS),
    }), encoding="utf-8")
    monkeypatch.setattr(runner, "MANIFEST", manifest)
    r = runner.seat1_ingest_and_provenance(dry_run=True)
    assert r["seat"] == 1
    assert len(r["details"]["targets"]) == 6
    assert "not_indexed" in r["details"]


def test_seat1_flags_missing_index_entry(monkeypatch, tmp_path):
    manifest = tmp_path / "manifest.json"
    keep = [n for n in runner.SEAT1_TARGETS if n != "2026-11-03-AM.md"]
    manifest.write_text(json.dumps({"files": [{"rel_path": n} for n in keep]}), encoding="utf-8")
    monkeypatch.setattr(runner, "MANIFEST", manifest)
    r = runner.seat1_ingest_and_provenance(dry_run=True)
    assert "2026-11-03-AM.md" in r["details"]["not_indexed"]
    assert r["details"]["remediation"]


# ---------------------------------------------------------------- dry-run


def test_all_heavy_seats_skip_on_dry_run():
    for fn, kwargs in (
        (runner.seat2_vision_and_simulation, {"epochs": 1}),
        (runner.seat3_equations_and_situational, {}),
        (runner.seat4_market_and_dfs_gate, {}),
        (runner.seat5_audit_and_voice_briefing, {}),
    ):
        r = fn(dry_run=True, **kwargs)
        assert r["status"] == "SKIP", (fn.__name__, r["status"])
        assert r["details"]["reason"] == "dry-run"


# ---------------------------------------------------------------- runner


def test_run_all_maps_to_stage_five(isolated_runs, monkeypatch):
    seen = []
    for i in range(6):
        monkeypatch.setitem(runner.SEATS, i, (lambda n: lambda **kw: (seen.append(n), _fake(n, "PASS"))[1])(i))
    assert runner.main(["--run-all", "--dry-run"]) == 0
    assert seen == [0, 1, 2, 3, 4, 5]
    state = json.loads(sorted(isolated_runs.glob("run_*.json"))[-1].read_text(encoding="utf-8"))
    assert state["stage_limit"] == 5
    assert state["summary"]["passed"] == 6


def test_stage_limits_seat_count(isolated_runs, monkeypatch):
    for i in range(6):
        monkeypatch.setitem(runner.SEATS, i, (lambda n: lambda **kw: _fake(n, "PASS"))(i))
    assert runner.main(["--stage", "2", "--dry-run"]) == 0
    state = json.loads(sorted(isolated_runs.glob("run_*.json"))[-1].read_text(encoding="utf-8"))
    assert [s["seat"] for s in state["seats"]] == [0, 1, 2]


def test_seat_failure_does_not_change_exit_code(isolated_runs, monkeypatch):
    monkeypatch.setitem(runner.SEATS, 0, lambda **kw: _fake(0, "FAIL"))
    monkeypatch.setitem(runner.SEATS, 1, lambda **kw: _fake(1, "PASS"))
    assert runner.main(["--stage", "1", "--dry-run"]) == 0
    state = json.loads(sorted(isolated_runs.glob("run_*.json"))[-1].read_text(encoding="utf-8"))
    assert state["summary"]["failed"] == ["seat_0"]


def test_seat_crash_is_recorded_as_error(isolated_runs, monkeypatch):
    def boom(**kw):
        raise RuntimeError("seat exploded")

    monkeypatch.setitem(runner.SEATS, 0, boom)
    assert runner.main(["--stage", "0"]) == 0
    state = json.loads(sorted(isolated_runs.glob("run_*.json"))[-1].read_text(encoding="utf-8"))
    assert state["seats"][0]["status"] == "ERROR"
    assert "seat exploded" in state["seats"][0]["details"]["error"]


def test_checkpoint_rewritten_after_each_seat(isolated_runs, monkeypatch):
    seen = []
    original_write = runner._write

    def spy(state, path):
        seen.append(len(state["seats"]))
        return original_write(state, path)

    monkeypatch.setattr(runner, "_write", spy)
    for i in range(6):
        monkeypatch.setitem(runner.SEATS, i, (lambda n: lambda **kw: _fake(n, "PASS"))(i))
    runner.main(["--run-all", "--dry-run"])
    assert seen[:7] == [0, 1, 2, 3, 4, 5, 6]


def test_status_prints_last_checkpoint(isolated_runs, capsys):
    p = isolated_runs / "run_20260101T000000Z.json"
    p.write_text(json.dumps({"run_id": "run_20260101T000000Z", "seats": []}), encoding="utf-8")
    assert runner.main(["--status"]) == 0
    assert "run_20260101T000000Z" in capsys.readouterr().out


def test_no_args_prints_help(isolated_runs):
    assert runner.main([]) == 2


def test_rel_handles_paths_outside_repo(tmp_path):
    outside = tmp_path / "x.json"
    assert runner._rel(outside) == str(outside)
    assert runner._rel(runner.ROOT / "data") == str(Path("data"))
