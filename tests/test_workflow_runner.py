"""Tests for scripts/ops/workflow_runner.py.

Seats 2-5 shell out to the trainer, the calibration gate, the DFS builder and
pytest. Running all of those inside a test would take minutes and duplicate the
suite, so the heavy seats are monkeypatched here and exercised through their
real code paths only where the check itself is cheap (seat 0 disk/ledger/.env,
seat 1 manifest membership, checkpoint writing, flag plumbing).
"""

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "ops"))

import workflow_runner as wr  # noqa: E402


@pytest.fixture(autouse=True)
def isolated_runs_dir(tmp_path, monkeypatch):
    """Keep test checkpoints out of the repo's real workflow_runs directory."""
    d = tmp_path / "workflow_runs"
    d.mkdir()
    monkeypatch.setattr(wr, "RUNS_DIR", d)
    yield d


# ---------------------------------------------------------------- seat 0


def test_seat0_shape_and_real_ledger():
    r = wr.seat0_cleanup_doctor(dry_run=True)
    assert r["seat"] == 0
    assert r["name"] == "cleanup_doctor"
    assert r["status"] in ("PASS", "FAIL")
    assert isinstance(r["details"], dict)
    led = r["details"]["ledger"]
    assert led["exists"] is True
    assert led["verified_record"] == "36-13-1"
    assert led["verified_record_matches"] is True
    for rec in ("38-13-1", "40-15-1", "47-19-1"):
        assert rec in led["secondary_view_records"], rec
    assert led["secondary_missing"] == []


def test_seat0_reports_env_honestly():
    r = wr.seat0_cleanup_doctor(dry_run=True)
    env = r["details"]["env"]
    assert env["env_file"] in ("PRESENT", "MISSING")
    assert env["declared_keys"] > 0
    # A missing .env must be reported as missing, never invented as present.
    if env["env_file"] == "MISSING":
        assert len(env["set"]) == 0
        assert len(env["missing"]) == env["declared_keys"]


def test_seat0_dry_run_never_cleans_cache():
    r = wr.seat0_cleanup_doctor(dry_run=True)
    action = r["details"]["npm_cache"]["action"]
    assert "WOULD_CLEAN" in action or "SKIPPED" in action
    assert not isinstance(action, dict), "dry-run executed a subprocess"


def test_seat0_ledger_failure_is_detected(monkeypatch, tmp_path):
    bad = tmp_path / "ledger.json"
    bad.write_text(
        json.dumps({"verified_record": {"record": "99-99-9"}, "secondary_views": []}),
        encoding="utf-8",
    )
    monkeypatch.setattr(wr, "LEDGER", bad)
    r = wr.seat0_cleanup_doctor(dry_run=True)
    assert r["passed"] is False
    assert r["checks"]["ledger_verified_record"] is False
    assert r["checks"]["ledger_secondary_views"] is False


# ---------------------------------------------------------------- seat 1


def test_seat1_targets_are_declared_six():
    assert len(wr.SEAT1_TARGETS) == 6


def test_seat1_passes_when_all_targets_indexed(monkeypatch, tmp_path):
    manifest = tmp_path / "manifest.json"
    manifest.write_text(
        json.dumps({"files": [{"rel_path": n} for n in wr.SEAT1_TARGETS]}), encoding="utf-8"
    )
    monkeypatch.setattr(wr, "MANIFEST", manifest)
    r = wr.seat1_downloads_ingest(dry_run=True)
    assert r["checks"]["all_indexed"] is True
    assert r["details"]["not_indexed"] == []


def test_seat1_flags_unindexed_file(monkeypatch, tmp_path):
    manifest = tmp_path / "manifest.json"
    indexed = [n for n in wr.SEAT1_TARGETS if n != "DKSalaries (2).csv"]
    manifest.write_text(
        json.dumps({"files": [{"rel_path": n} for n in indexed]}), encoding="utf-8"
    )
    monkeypatch.setattr(wr, "MANIFEST", manifest)
    r = wr.seat1_downloads_ingest(dry_run=True)
    assert r["passed"] is False
    assert "DKSalaries (2).csv" in r["details"]["not_indexed"]
    assert r["details"]["remediation"]


# ---------------------------------------------------------------- seat 2 plumbing


def test_seat2_skips_video_without_flag():
    r = wr.seat2_replay_trainer(dry_run=True, allow_video=False, epochs=2)
    assert "SKIPPED" in r["details"]["video_harvester"]
    assert r["details"]["cpu_only"] is True


def test_seat2_enables_video_with_flag():
    r = wr.seat2_replay_trainer(dry_run=True, allow_video=True, epochs=2)
    assert r["details"]["video_harvester"] == "ENABLED"


# ---------------------------------------------------------------- runner / checkpoint


def test_runner_writes_checkpoint_and_exits_zero(isolated_runs_dir, monkeypatch):
    monkeypatch.setitem(wr.SEATS, 0, lambda dry_run: _fake(0, "PASS"))
    monkeypatch.setitem(wr.SEATS, 1, lambda dry_run: _fake(1, "FAIL"))
    code = wr.main(["--stage", "1", "--dry-run"])
    assert code == 0, "runner must exit 0 even when a seat fails"
    runs = sorted(isolated_runs_dir.glob("run_*.json"))
    assert len(runs) == 1
    state = json.loads(runs[0].read_text(encoding="utf-8"))
    assert [s["seat"] for s in state["seats"]] == [0, 1]
    assert state["summary"]["failed"] == ["seat_1"]
    assert "updated_at_utc" in state


def test_stage_limit_controls_seat_count(isolated_runs_dir, monkeypatch):
    for i in range(6):
        monkeypatch.setitem(wr.SEATS, i, (lambda n: lambda *a, **k: _fake(n, "SKIP"))(i))
    assert wr.main(["--stage", "2"]) == 0
    runs = sorted(isolated_runs_dir.glob("run_*.json"))
    state = json.loads(runs[-1].read_text(encoding="utf-8"))
    assert len(state["seats"]) == 3
    assert all(s["status"] == "SKIP" for s in state["seats"])


def test_status_prints_last_run(capsys, isolated_runs_dir):
    p = isolated_runs_dir / "run_20260101T000000Z.json"
    p.write_text(json.dumps({"run_id": "run_20260101T000000Z", "seats": []}), encoding="utf-8")
    assert wr.main(["--status"]) == 0
    out = capsys.readouterr().out
    assert "run_20260101T000000Z" in out


def test_status_with_no_runs_is_not_an_error(capsys, isolated_runs_dir):
    assert wr.main(["--status"]) == 0
    assert "no workflow runs" in capsys.readouterr().out


def test_seat_crash_is_captured_not_raised(isolated_runs_dir, monkeypatch):
    def boom(dry_run):
        raise RuntimeError("simulated seat crash")

    monkeypatch.setitem(wr.SEATS, 0, boom)
    assert wr.main(["--stage", "0"]) == 0
    runs = sorted(isolated_runs_dir.glob("run_*.json"))
    state = json.loads(runs[-1].read_text(encoding="utf-8"))
    assert state["seats"][0]["status"] == "ERROR"
    assert "simulated seat crash" in state["seats"][0]["details"]["error"]


def test_npm_cmd_resolves_or_is_none():
    """Windows needs npm.cmd; a bare 'npm' string fails CreateProcess."""
    cmd = wr._npm_cmd("cache", "clean", "--force")
    if cmd is not None:
        assert Path(cmd[0]).exists(), cmd[0]
        assert cmd[1:] == ["cache", "clean", "--force"]
    else:
        assert cmd is None  # npm genuinely absent is acceptable, a crash is not


def _fake(seat, status):
    return {
        "seat": seat,
        "name": f"seat_{seat}",
        "status": status,
        "passed": status == "PASS",
        "checks": {},
        "details": {},
    }
