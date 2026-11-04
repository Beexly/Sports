"""Tests for the single-flight run lock.

The regression this prevents: two fulltext_backfill processes ran against the
same output file and produced 2,019 rows with only 1,069 unique.
"""
from __future__ import annotations

import importlib.util
import json
import os
import socket
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

_SRC = Path(__file__).resolve().parents[1] / "scripts" / "ops" / "run_lock.py"


@pytest.fixture(scope="module")
def rl():
    spec = importlib.util.spec_from_file_location("run_lock", _SRC)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["run_lock"] = mod
    spec.loader.exec_module(mod)
    return mod


def test_acquire_on_fresh_path(tmp_path, rl):
    p = tmp_path / "t.lock"
    with rl.RunLock(p, task="t") as lock:
        assert lock.acquired
        assert p.exists()
        holder = json.loads(p.read_text())
        assert holder["pid"] == os.getpid()
        assert holder["task"] == "t"
    assert not p.exists(), "release must delete the lock"


def test_second_acquire_raises_lockheld(tmp_path, rl):
    p = tmp_path / "t.lock"
    with rl.RunLock(p, task="first"):
        with pytest.raises(rl.LockHeld) as exc:
            with rl.RunLock(p, task="second"):
                pass
        assert exc.value.holder["task"] == "first"


def test_release_then_reacquire_works(tmp_path, rl):
    p = tmp_path / "t.lock"
    with rl.RunLock(p, task="a"):
        pass
    with rl.RunLock(p, task="b") as lock:
        assert lock.acquired


def test_stale_lock_with_dead_pid_is_taken_over(tmp_path, rl):
    p = tmp_path / "t.lock"
    p.write_text(json.dumps({
        "pid": 999999999,  # certainly not running
        "host": socket.gethostname(),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "task": "crashed",
    }))
    with rl.RunLock(p, task="new") as lock:
        assert lock.acquired
        assert json.loads(p.read_text())["task"] == "new"


def test_old_lock_is_taken_over_even_if_pid_alive(tmp_path, rl):
    p = tmp_path / "t.lock"
    old = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
    p.write_text(json.dumps({
        "pid": os.getpid(),  # alive, but the lock is ancient
        "host": socket.gethostname(),
        "started_at": old,
        "task": "ancient",
    }))
    with rl.RunLock(p, task="new", stale_after_s=3600) as lock:
        assert lock.acquired


def test_corrupt_lock_is_reclaimed(tmp_path, rl):
    p = tmp_path / "t.lock"
    p.write_text("{not valid json")
    with rl.RunLock(p, task="new") as lock:
        assert lock.acquired


def test_foreign_host_lock_is_not_stolen(tmp_path, rl):
    p = tmp_path / "t.lock"
    p.write_text(json.dumps({
        "pid": 1,
        "host": "some-other-machine",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "task": "remote",
    }))
    with pytest.raises(rl.LockHeld):
        with rl.RunLock(p, task="local"):
            pass


def test_acquire_or_none_returns_none_when_held(tmp_path, rl):
    p = tmp_path / "t.lock"
    with rl.RunLock(p, task="holder"):
        assert rl.acquire_or_none(p, task="contender") is None


def test_acquire_or_none_returns_lock_when_free(tmp_path, rl):
    p = tmp_path / "t.lock"
    lock = rl.acquire_or_none(p, task="winner")
    assert lock is not None and lock.acquired
    lock.__exit__(None, None, None)
    assert not p.exists()


def test_backfill_run_refuses_when_lock_held(tmp_path, rl):
    """The real integration: fulltext_backfill.run() must refuse a second writer.

    This is the exact failure that produced 949 duplicates.
    """
    fbf_src = Path(__file__).resolve().parents[1] / "scripts" / "research" / "fulltext_backfill.py"
    spec = importlib.util.spec_from_file_location("fulltext_backfill_locktest", fbf_src)
    fbf = importlib.util.module_from_spec(spec)
    sys.modules["fulltext_backfill_locktest"] = fbf
    spec.loader.exec_module(fbf)

    out = tmp_path / "backfill.jsonl"
    manifest = tmp_path / "m.jsonl"
    manifest.write_text("", encoding="utf-8")

    args = fbf.parse_args([
        "--manifest", str(manifest), "--out", str(out),
        "--failures", str(tmp_path / "f.jsonl"), "--max-records", "1",
    ])

    lock_path = out.with_suffix(".lock")
    with rl.RunLock(lock_path, task="holder"):
        rc = fbf.run(args)
        assert rc == 3, f"backfill started while another writer held the lock (rc={rc})"
        assert not out.exists(), "the refused run must not have written output"


def test_backfill_dry_run_is_exempt_from_lock(tmp_path, rl):
    fbf_src = Path(__file__).resolve().parents[1] / "scripts" / "research" / "fulltext_backfill.py"
    spec = importlib.util.spec_from_file_location("fulltext_backfill_drytest", fbf_src)
    fbf = importlib.util.module_from_spec(spec)
    sys.modules["fulltext_backfill_drytest"] = fbf
    spec.loader.exec_module(fbf)

    manifest = tmp_path / "m.jsonl"
    manifest.write_text("", encoding="utf-8")
    out = tmp_path / "backfill.jsonl"
    args = fbf.parse_args([
        "--manifest", str(manifest), "--out", str(out),
        "--failures", str(tmp_path / "f.jsonl"), "--dry-run",
    ])
    with rl.RunLock(out.with_suffix(".lock"), task="holder"):
        # Dry-run only reads; it must not be blocked by a writer.
        assert fbf.run(args) == 0


def test_exit_does_not_delete_another_processes_lock(tmp_path, rl):
    """A takeover must not have its lock deleted by the original's exit."""
    p = tmp_path / "t.lock"
    ours = rl.RunLock(p, task="ours")
    ours.__enter__()
    # Simulate another process taking over by rewriting the holder.
    p.write_text(json.dumps({
        "pid": os.getpid() + 1,
        "host": socket.gethostname(),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "task": "theirs",
    }))
    ours.__exit__(None, None, None)
    assert p.exists(), "we deleted a lock we no longer own"
