"""Concurrent full-text backfill — N independent bridges, one per worker.

WHY NOT ASYNCIO
---------------
The obvious refactor is `async def` + `asyncio.gather`. It does not work here,
and the reason is structural rather than a matter of taste.

`arxiv_bridge.ArxivBridge` is a stdio JSON-RPC client to ONE subprocess. Its
`_request` holds a lock across the whole write-then-blocking-read cycle:

    with self._lock:
        self._write(msg)
        return self._read_until(rid, timeout)     # blocking read, lock held

and `_read_until` **discards every line until it sees its own request id**.
So two overlapping requests on one bridge would each swallow the other's
response line while hunting for their own id: silent data loss or a hang.
The bridge's own docstring says it is "not thread-safe by design ... calls are
serialized. That keeps the framing correct, which is the thing that actually
breaks when you try to parallelize a stdio JSON-RPC stream."

Coroutines do not help, because the lock serialises them anyway — asyncio would
add machinery and deliver exactly the throughput of the blocking version.

The unit of concurrency that DOES work is a separate bridge: each worker owns
its own subprocess and therefore its own pipe, so no framing is shared.

WHAT THE MEASUREMENTS SAID
--------------------------
Prior sequential run: 2,497 rows, 143 failures. Every failure was
"empty payload" (download() and abstract() both returned nothing for that id);
there were **zero 429s and zero timeouts**. So the bottleneck was per-request
latency, not arXiv rate-limiting — which is what makes bounded concurrency safe
to try here.

Politeness is still enforced globally, not per worker: `--min-interval`
defaults to 3.0s between *request starts across all workers*, matching arXiv's
~1 request / 3 s guidance. Three workers therefore overlap latency without
raising aggregate request rate.

Usage:
    python scripts/research/fulltext_backfill_concurrent.py --dry-run
    python scripts/research/fulltext_backfill_concurrent.py --limit 20 --workers 3
    python scripts/research/fulltext_backfill_concurrent.py --workers 4 --min-interval 3.0
"""
from __future__ import annotations

import argparse
import json
import queue
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_HERE.parent / "ops"))

from arxiv_bridge import ArxivBridge  # noqa: E402
from run_lock import LockHeld, RunLock  # noqa: E402
from fulltext_backfill import (  # noqa: E402
    DEFAULT_CORPUS_DIR, DEFAULT_MANIFEST, DEFAULT_OUT, DEFAULT_FAILURES,
    count_eligible, extract_text, iter_eligible, iter_manifest, make_output_record,
)

DEFAULT_WORKERS = 3
DEFAULT_MIN_INTERVAL = 3.0   # seconds between request starts, across ALL workers


class RateLimiter:
    """Global spacing limiter: at most one request start per `min_interval`.

    Spacing is enforced globally rather than per worker so that adding workers
    overlaps *latency* without increasing the aggregate request rate. A
    per-worker limiter would multiply the load on arXiv by the worker count,
    which is how a polite backfill becomes a 429 wall.
    """

    def __init__(self, min_interval: float):
        self.min_interval = max(0.0, min_interval)
        self._lock = threading.Lock()
        self._next_at = 0.0

    def wait(self, stop: threading.Event | None = None) -> bool:
        """Block until this caller may start. Returns False if stopped."""
        with self._lock:
            now = time.monotonic()
            start_at = max(now, self._next_at)
            self._next_at = start_at + self.min_interval
        delay = start_at - time.monotonic()
        if delay <= 0:
            return True
        if stop is not None:
            return not stop.wait(delay)
        time.sleep(delay)
        return True


class Sink:
    """Thread-safe writer for the output and failures jsonl files."""

    def __init__(self, out_path: Path, fail_path: Path):
        self._lock = threading.Lock()
        self._out = out_path.open("a", encoding="utf-8")
        self._fail = fail_path.open("a", encoding="utf-8")
        self.ok = 0
        self.failed = 0

    def success(self, record: dict[str, Any]) -> None:
        with self._lock:
            self._out.write(json.dumps(record) + "\n")
            self._out.flush()
            self.ok += 1

    def failure(self, record: dict[str, Any]) -> None:
        with self._lock:
            self._fail.write(json.dumps(record) + "\n")
            self._fail.flush()
            self.failed += 1

    def close(self) -> None:
        with self._lock:
            self._out.close()
            self._fail.close()


def _fetch_one(ax: ArxivBridge, aid: str, max_chars: int) -> tuple[str, str | None, str | None]:
    """download() then abstract() fallback. Returns (text, method, error)."""
    text, method, err = "", None, None
    try:
        text = extract_text(ax.download(aid, max_chars=max_chars))
        if text:
            method = "download"
    except Exception as exc:  # noqa: BLE001 - record and move on
        err = str(exc)
    if not text:
        try:
            text = extract_text(ax.abstract(aid))
            if text:
                method, err = "abstract", None
        except Exception as exc:  # noqa: BLE001
            err = str(exc)
    return text, method, err


def worker(
    wid: int,
    work: "queue.Queue[tuple[dict, str] | None]",
    sink: Sink,
    limiter: RateLimiter,
    stop: threading.Event,
    max_chars: int,
    stats: dict[str, int],
    stats_lock: threading.Lock,
) -> None:
    """One worker = one bridge = one subprocess = one private stdio pipe."""
    try:
        with ArxivBridge() as ax:
            while not stop.is_set():
                try:
                    item = work.get(timeout=1.0)
                except queue.Empty:
                    continue
                if item is None:      # sentinel: no more work
                    work.task_done()
                    break
                rec, aid = item
                if not limiter.wait(stop):
                    work.task_done()
                    break
                text, method, err = _fetch_one(ax, aid, max_chars)
                if text:
                    sink.success(make_output_record(rec, aid, text, method))
                else:
                    sink.failure({
                        "arxiv_id": aid,
                        "source_id": rec.get("source_id"),
                        "title": rec.get("title", ""),
                        "error": err or "empty payload from download() and abstract()",
                        "attempted_at": datetime.now(timezone.utc).isoformat(),
                    })
                with stats_lock:
                    stats["done"] += 1
                    if text:
                        stats[method or "download"] += 1
                work.task_done()
    except Exception as exc:  # noqa: BLE001 - a dead bridge must not hang the run
        with stats_lock:
            stats["bridge_errors"] += 1
        print(f"[worker {wid}] bridge failed: {type(exc).__name__}: {exc}", file=sys.stderr)


def run(args: argparse.Namespace) -> int:
    if args.dry_run:
        return _dry_run(args)

    manifest = Path(args.manifest)
    out_path = Path(args.out)
    failures_path = Path(args.failures)
    if out_path.resolve() == manifest.resolve():
        raise SystemExit("refusing: --out must differ from --manifest")
    if not manifest.exists():
        raise SystemExit(f"manifest not found: {manifest}")

    lock = RunLock(out_path.with_suffix(".lock"), task="fulltext_backfill_concurrent")
    try:
        with lock:
            return _run_locked(args, manifest, out_path, failures_path)
    except LockHeld as exc:
        print(f"refusing to start: {exc}", file=sys.stderr)
        return 3


def _run_locked(args: argparse.Namespace, manifest: Path, out_path: Path,
                failures_path: Path) -> int:
    rows = list(iter_manifest(manifest))
    done = _load_done(out_path)
    todo = [(rec, aid) for rec, aid in iter_eligible(rows, done) if aid not in done]
    if args.limit:
        todo = todo[: args.limit]

    print(f"selected={len(todo)} already_done={len(done)} workers={args.workers} "
          f"min_interval={args.min_interval}s")
    if not todo:
        print("nothing to do")
        return 0

    out_path.parent.mkdir(parents=True, exist_ok=True)
    failures_path.parent.mkdir(parents=True, exist_ok=True)
    sink = Sink(out_path, failures_path)
    limiter = RateLimiter(args.min_interval)
    stop = threading.Event()
    work: "queue.Queue[tuple[dict, str] | None]" = queue.Queue()
    for item in todo:
        work.put(item)
    for _ in range(args.workers):
        work.put(None)            # one sentinel per worker

    stats = {"done": 0, "download": 0, "abstract": 0, "bridge_errors": 0}
    stats_lock = threading.Lock()
    started = time.monotonic()

    # Latency overlap needs fetch-parallelism; the global limiter keeps the
    # request RATE fixed, so more workers must not mean more load on arXiv.
    threads = [
        threading.Thread(target=worker,
                         args=(i, work, sink, limiter, stop, args.max_chars,
                               stats, stats_lock),
                         name=f"backfill-{i}", daemon=True)
        for i in range(args.workers)
    ]
    try:
        for t in threads:
            t.start()
        for t in threads:
            while t.is_alive():
                t.join(timeout=0.5)
    except KeyboardInterrupt:
        print("\ninterrupt: draining workers...", file=sys.stderr)
        stop.set()
        for t in threads:
            t.join(timeout=10)

    elapsed = max(1e-6, time.monotonic() - started)
    sink.close()
    print(f"DONE done={stats['done']} ok={sink.ok} failed={sink.failed} "
          f"download={stats['download']} abstract={stats['abstract']} "
          f"bridge_errors={stats['bridge_errors']} "
          f"elapsed={elapsed:.0f}s rate={60 * stats['done'] / elapsed:.1f}/min")
    return 0


def _load_done(out_path: Path) -> set[str]:
    done: set[str] = set()
    if not out_path.exists():
        return done
    with out_path.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                aid = json.loads(line).get("arxiv_id")
                if aid:
                    done.add(aid)
            except json.JSONDecodeError:
                continue
    return done


def _dry_run(args: argparse.Namespace) -> int:
    manifest = Path(args.manifest)
    out_path = Path(args.out)
    if not manifest.exists():
        # Non-zero: a dry-run against a missing manifest is a failure, not a
        # clean report. Returning 0 here would let automation pass on a typo.
        print(f"[dry-run] manifest not found: {manifest}", file=sys.stderr)
        return 2
    rows = list(iter_manifest(manifest))
    done = _load_done(out_path)
    todo = [(rec, aid) for rec, aid in iter_eligible(rows, done) if aid not in done]
    if args.limit:
        todo = todo[: args.limit]
    est = len(todo) * args.min_interval
    print(f"[dry-run] manifest={manifest}")
    print(f"[dry-run] would process {len(todo)} record(s) "
          f"already_done={len(done)}")
    print(f"[dry-run] workers={args.workers} min_interval={args.min_interval}s "
          f"-> floor {est / 60:.1f} min (rate-bound, not latency-bound)")
    print(f"[dry-run] effective max rate = {60 / args.min_interval:.1f} req/min "
          f"regardless of worker count")
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--failures", default=str(DEFAULT_FAILURES))
    ap.add_argument("--workers", type=int, default=DEFAULT_WORKERS,
                    help="independent bridges; each spawns its own subprocess")
    ap.add_argument("--min-interval", type=float, default=DEFAULT_MIN_INTERVAL,
                    help="seconds between request starts across ALL workers")
    ap.add_argument("--max-chars", type=int, default=200_000)
    ap.add_argument("--limit", type=int, default=0, help="cap records (0 = all)")
    ap.add_argument("--dry-run", action="store_true")
    return ap.parse_args(argv)


if __name__ == "__main__":
    sys.exit(run(parse_args()))
