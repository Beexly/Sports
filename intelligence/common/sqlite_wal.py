"""
SQLite WAL concurrency helper with exponential backoff and Python 3.12+ UTC timestamps.
"""

from __future__ import annotations

import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterator, TypeVar

T = TypeVar("T")


def utc_now_iso() -> str:
    """Return timezone-aware UTC ISO-8601 timestamp (zero Python 3.12 deprecation warnings)."""
    return datetime.now(timezone.utc).isoformat()


def connect_wal(
    db_path: str | Path,
    timeout: float = 30.0,
    busy_timeout_ms: int = 30000,
) -> sqlite3.Connection:
    """Open SQLite connection with WAL mode, NORMAL synchronous, and busy_timeout."""
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=timeout)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute(f"PRAGMA busy_timeout={int(busy_timeout_ms)};")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


@contextmanager
def wal_transaction(
    db_path: str | Path,
    timeout: float = 30.0,
    busy_timeout_ms: int = 30000,
) -> Iterator[sqlite3.Connection]:
    """Context manager yielding a WAL-configured SQLite connection with commit/rollback."""
    conn = connect_wal(db_path, timeout=timeout, busy_timeout_ms=busy_timeout_ms)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_with_retry(
    fn: Callable[[], T],
    max_retries: int = 5,
    base_delay_sec: float = 0.05,
) -> T:
    """Retry transient sqlite3.OperationalError ('database is locked') with exponential backoff."""
    last_err: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except sqlite3.OperationalError as exc:
            last_err = exc
            if "locked" not in str(exc).lower() or attempt == max_retries:
                raise
            time.sleep(base_delay_sec * (2**attempt))
    assert last_err is not None
    raise last_err
