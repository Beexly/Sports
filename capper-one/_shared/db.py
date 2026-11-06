#!/usr/bin/env python3
"""One way to open the capper DB, so no worker gets to pick a bad one.

Two failures in a row came from the same thing: scripts opened the database themselves, one of
them without busy_timeout, and a lock raised straight out of a hot loop. WAL was also off on the
file, which makes a lock fatal instead of momentary.

Rules encoded here:
  - WAL is set on every connect and checked, because it is the only mode where a writer does not
    freeze readers.
  - busy_timeout is 30s, so a contended write waits instead of raising.
  - write() retries with backoff and re-raises at the end, so a real failure is still loud.

Usage:
    from db import connect, write
    con = connect()
    write(con, "INSERT ...", (a, b))
"""
import sqlite3
import time

DB = r"C:/Users/Garrett/capper-one/_shared/capper.db"


def connect(path: str = DB) -> sqlite3.Connection:
    con = sqlite3.connect(path, timeout=30, isolation_level=None)
    con.execute("PRAGMA busy_timeout=30000")
    mode = con.execute("PRAGMA journal_mode=WAL").fetchone()[0]
    if mode.lower() != "wal":
        raise RuntimeError(f"journal_mode is {mode}, expected wal")
    con.execute("PRAGMA synchronous=NORMAL")
    return con


def write(con: sqlite3.Connection, sql: str, params: tuple = (), attempts: int = 8):
    """Execute one write with backoff. Returns the cursor. Re-raises on the last attempt."""
    delay = 0.5
    for attempt in range(attempts):
        try:
            return con.execute(sql, params)
        except sqlite3.OperationalError as err:
            if "locked" not in str(err) and "busy" not in str(err):
                raise
            if attempt == attempts - 1:
                raise
            time.sleep(delay)
            delay = min(delay * 1.7, 8.0)
