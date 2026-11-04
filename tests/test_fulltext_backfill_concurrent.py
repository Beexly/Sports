"""Tests for the concurrent full-text backfill.

The properties that matter are not "it goes faster" — they are the safety
properties that make concurrency legitimate here at all:

  1. the global limiter caps REQUEST RATE regardless of worker count, so adding
     workers overlaps latency without adding load on arXiv
  2. each worker gets its own bridge (never shares a stdio pipe)
  3. the shared writer never interleaves partial lines
  4. a stop event drains workers instead of hanging
"""
from __future__ import annotations

import importlib.util
import json
import sys
import threading
import time
from pathlib import Path

import pytest

_SRC = Path(__file__).resolve().parents[1] / "scripts" / "research" / "fulltext_backfill_concurrent.py"


@pytest.fixture(scope="module")
def conc():
    spec = importlib.util.spec_from_file_location("fulltext_backfill_concurrent", _SRC)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["fulltext_backfill_concurrent"] = mod
    spec.loader.exec_module(mod)
    return mod


# -- rate limiting -------------------------------------------------------

def test_limiter_spaces_requests_globally(conc):
    """Three callers may not start faster than min_interval apart, in aggregate."""
    lim = conc.RateLimiter(0.20)
    starts: list[float] = []
    lock = threading.Lock()

    def hit():
        lim.wait()
        with lock:
            starts.append(time.monotonic())

    ts = [threading.Thread(target=hit) for _ in range(4)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()

    starts.sort()
    gaps = [b - a for a, b in zip(starts, starts[1:])]
    assert len(starts) == 4
    # Allow scheduling slop, but no gap may be materially shorter than the
    # interval: that is the difference between politeness and a 429 wall.
    assert min(gaps) >= 0.15, f"gap {min(gaps):.3f}s below interval 0.20s: {gaps}"


def test_limiter_is_not_per_worker(conc):
    """The limiter must be a shared object; a per-worker one would multiply load."""
    lim = conc.RateLimiter(0.05)
    t0 = time.monotonic()
    for _ in range(5):
        lim.wait()
    elapsed = time.monotonic() - t0
    # 5 calls => 4 intervals of 0.05 = 0.20s minimum
    assert elapsed >= 0.18, f"limiter did not compound: {elapsed:.3f}s"


def test_limiter_stop_event_returns_false(conc):
    lim = conc.RateLimiter(5.0)
    lim.wait()                      # consume the immediate slot
    stop = threading.Event()
    stop.set()
    t0 = time.monotonic()
    ok = lim.wait(stop)
    assert ok is False
    assert time.monotonic() - t0 < 1.0, "stop must not wait out the full interval"


def test_zero_interval_does_not_block(conc):
    lim = conc.RateLimiter(0.0)
    t0 = time.monotonic()
    for _ in range(10):
        lim.wait()
    assert time.monotonic() - t0 < 0.5


# -- shared writer -------------------------------------------------------

def test_sink_writes_whole_lines_under_concurrency(conc, tmp_path):
    """N threads writing at once must not interleave partial JSON lines."""
    sink = conc.Sink(tmp_path / "out.jsonl", tmp_path / "fail.jsonl")

    def burst(tid):
        for i in range(25):
            sink.success({"arxiv_id": f"{tid}-{i}", "text": "x" * 200})

    ts = [threading.Thread(target=burst, args=(t,)) for t in range(8)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    sink.close()

    lines = (tmp_path / "out.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 200
    for line in lines:
        json.loads(line)          # every line must parse on its own
    assert sink.ok == 200
    assert sink.failed == 0


def test_sink_counts_success_and_failure_separately(conc, tmp_path):
    sink = conc.Sink(tmp_path / "o.jsonl", tmp_path / "f.jsonl")
    sink.success({"arxiv_id": "a"})
    sink.failure({"arxiv_id": "b", "error": "empty payload"})
    sink.close()
    assert sink.ok == 1 and sink.failed == 1
    assert len((tmp_path / "o.jsonl").read_text().splitlines()) == 1
    assert len((tmp_path / "f.jsonl").read_text().splitlines()) == 1


# -- resume --------------------------------------------------------------

def test_load_done_reads_ids_and_skips_garbage(conc, tmp_path):
    p = tmp_path / "out.jsonl"
    p.write_text(
        json.dumps({"arxiv_id": "2401.00001"}) + "\n"
        + "\n"
        + "not json\n"
        + json.dumps({"no_id": True}) + "\n"
        + json.dumps({"arxiv_id": "2401.00002"}) + "\n",
        encoding="utf-8")
    done = conc._load_done(p)
    assert done == {"2401.00001", "2401.00002"}


def test_load_done_missing_file_is_empty(conc, tmp_path):
    assert conc._load_done(tmp_path / "absent.jsonl") == set()


# -- CLI contract --------------------------------------------------------

def test_dry_run_missing_manifest_exits_nonzero(conc, tmp_path, capsys):
    """A missing manifest must not read as a clean dry-run."""
    args = conc.parse_args(["--dry-run", "--manifest", str(tmp_path / "nope.jsonl")])
    assert conc.run(args) == 2
    assert "not found" in capsys.readouterr().err


def test_defaults_are_polite(conc):
    args = conc.parse_args([])
    assert args.workers >= 1
    # arXiv guidance is ~1 request / 3s; the default must not exceed it.
    assert args.min_interval >= 3.0, \
        f"default interval {args.min_interval}s exceeds arXiv guidance"


def test_effective_rate_independent_of_workers(conc, tmp_path, capsys):
    m = tmp_path / "m.jsonl"
    m.write_text(json.dumps({"arxiv_id": "2401.00001"}) + "\n", encoding="utf-8")
    for workers in (1, 8):
        conc.run(conc.parse_args(["--dry-run", "--manifest", str(m),
                                  "--out", str(tmp_path / "o.jsonl"),
                                  "--workers", str(workers)]))
        out = capsys.readouterr().out
        assert "20.0 req/min" in out, "rate ceiling must not scale with workers"


# -- worker shape --------------------------------------------------------

def test_worker_uses_its_own_bridge(conc, monkeypatch):
    """Every worker must construct its own bridge — never share one."""
    created = []

    class FakeBridge:
        def __init__(self):
            created.append(self)

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return None

    monkeypatch.setattr(conc, "ArxivBridge", FakeBridge)
    monkeypatch.setattr(conc, "_fetch_one", lambda ax, aid, mc: ("text", "download", None))

    import queue
    work = queue.Queue()
    work.put(({"title": "t"}, "2401.00001"))
    work.put(None)
    sink = conc.Sink(Path(tmp := __import__("tempfile").mkdtemp()) / "o.jsonl",
                     Path(tmp) / "f.jsonl")
    stats = {"done": 0, "download": 0, "abstract": 0, "bridge_errors": 0}
    conc.worker(0, work, sink, conc.RateLimiter(0.0), threading.Event(), 1000,
                stats, threading.Lock())
    sink.close()
    assert len(created) == 1, "worker must open exactly one bridge"
    assert stats["done"] == 1
