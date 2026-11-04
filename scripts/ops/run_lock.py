"""Single-flight run lock for tasks that must never run twice at once.

Why this exists: two `fulltext_backfill.py` processes were launched against the
same output file. Both appended, and the result was 2,019 rows with only 1,069
unique — 949 duplicated records that then had to be deduped by hand. Nothing in
the script stopped it, because "resumable" and "single-instance" are different
guarantees: resume logic reads what is already on disk, it does not stop a
second writer from starting.

The lock is an atomically-created file holding:
    {"pid": 1234, "host": "...", "started_at": "...", "task": "backfill"}

Takeover rules, in order:
  1. Lock absent -> create it, own it.
  2. Lock present, holder PID is alive on this host -> raise LockHeld.
  3. Lock present, holder PID is dead -> the previous run crashed; take over.
  4. Lock present, older than `stale_after_s` -> take over (covers a PID that
     was reused, or a holder on another host that will never answer).

PID liveness uses psutil. `os.kill(pid, 0)` is NOT usable here: on Windows it
maps to TerminateProcess and would kill the very process we are checking.

Usage:
    with RunLock(path, task="backfill") as lock:
        if not lock.acquired:
            ...  # another run holds it; exit cleanly

Or as a hard guard:
    with RunLock(path, task="backfill"):
        run()
"""
from __future__ import annotations

import json
import os
import socket
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import psutil
except ImportError:  # pragma: no cover - psutil is present in this env
    psutil = None


class LockHeld(RuntimeError):
    """Another live process owns the lock."""

    def __init__(self, holder: dict):
        self.holder = holder
        super().__init__(
            f"lock held by pid={holder.get('pid')} "
            f"on {holder.get('host')} since {holder.get('started_at')} "
            f"(task={holder.get('task')})"
        )


def _pid_alive(pid: int, host: str) -> bool:
    """True only when the PID is alive *on this host*.

    A PID from another host means nothing locally, so foreign-host locks are
    judged by age instead.
    """
    if host != socket.gethostname():
        return True  # cannot verify; do not steal
    if not isinstance(pid, int) or pid <= 0:
        return False
    if psutil is not None:
        return psutil.pid_exists(pid)
    # Conservative fallback: assume alive. Age-based takeover still applies.
    return True


class RunLock:
    def __init__(self, path: Path | str, task: str = "unknown",
                 stale_after_s: int = 6 * 3600):
        self.path = Path(path)
        self.task = task
        self.stale_after_s = stale_after_s
        self.acquired = False
        self.holder: dict | None = None

    # -- internals --------------------------------------------------------
    def _read_holder(self) -> dict | None:
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    def _is_stale(self, holder: dict) -> bool:
        try:
            pid = int(holder.get("pid", -1))
        except (TypeError, ValueError):
            # A malformed holder cannot be verified. Reclaim it: otherwise a
            # process killed mid-write would wedge the pipeline permanently.
            return True
        if not _pid_alive(pid, str(holder.get("host", ""))):
            return True
        try:
            started = datetime.fromisoformat(holder["started_at"])
        except (KeyError, ValueError):
            return True
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - started > timedelta(seconds=self.stale_after_s)

    def _write(self) -> None:
        payload = {
            "pid": os.getpid(),
            "host": socket.gethostname(),
            "started_at": datetime.now(timezone.utc).isoformat(),
            "task": self.task,
        }
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # O_EXCL is the atomic claim; two processes cannot both succeed.
        fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=1)
        self.holder = payload
        self.acquired = True

    # -- context manager --------------------------------------------------
    def __enter__(self) -> "RunLock":
        try:
            self._write()
            return self
        except FileExistsError:
            pass
        holder = self._read_holder()
        if holder is None:
            # Corrupt or half-written lock: treat as stale and reclaim.
            self._force_remove()
            self._write()
            return self
        if not self._is_stale(holder):
            raise LockHeld(holder)
        self._force_remove()
        self._write()
        return self

    def _force_remove(self) -> None:
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass

    def __exit__(self, exc_type, exc, tb) -> None:
        # Only remove the lock if it is still ours. A takeover by another
        # process must not have its lock deleted by our exit.
        holder = self._read_holder()
        if holder and holder.get("pid") == os.getpid() and \
                holder.get("host") == socket.gethostname():
            self._force_remove()
        self.acquired = False


def acquire_or_none(path: Path | str, task: str, stale_after_s: int = 6 * 3600) -> RunLock | None:
    """Non-raising helper: returns None when the lock is already held."""
    lock = RunLock(path, task=task, stale_after_s=stale_after_s)
    try:
        lock.__enter__()
        return lock
    except LockHeld:
        return None
