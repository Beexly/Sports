"""Research pipeline DAG runner.

Airflow is not in this stack (not installed, not configured, no references),
so this applies the Airflow *patterns* without the Airflow dependency:

  * declarative task graph with explicit upstream dependencies
  * idempotency — a task is skipped when all its outputs are newer than all
    its inputs, so re-running the DAG after a partial failure resumes rather
    than re-doing work
  * retries with exponential backoff, for the network tasks that hit 429
  * per-task timeout
  * a structured JSON run log, one line per task, timestamped
  * a FAILED sentinel written on failure so an external watcher can alert

If the stack ever adopts Airflow, `dags/research_pipeline.py` holds the same
graph in Airflow form and these task definitions map 1:1.

Usage:
    python scripts/ops/research_pipeline_dag.py --list
    python scripts/ops/research_pipeline_dag.py --dry-run
    python scripts/ops/research_pipeline_dag.py                 # run all
    python scripts/ops/research_pipeline_dag.py --force         # ignore freshness
    python scripts/ops/research_pipeline_dag.py --from build_index
    python scripts/ops/research_pipeline_dag.py --only eval
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(r"C:\c\wt-week8-forensic")
CORPUS = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus")
PY = r"C:\Users\Garrett\AppData\Local\Programs\Python\Python313\python.exe"

MERGED = CORPUS / "merged_manifest_2026-11-04.jsonl"
BACKFILL = CORPUS / "fulltext_backfill.jsonl"
STATS = REPO / "intelligence" / "corpus" / "corpus_index_stats.json"
EVAL_OUT = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\retrieval_eval_2026_11_04.json")
FAILED_SENTINEL = CORPUS / "_pipeline_failed.json"


@dataclass
class Task:
    name: str
    command: list[str]
    inputs: list[Path]
    outputs: list[Path]
    upstream: list[str] = field(default_factory=list)
    retries: int = 0
    timeout: int = 3600
    # A long-running network task whose output is append-only: freshness is
    # judged on the output alone, not against inputs.
    output_only: bool = False
    # Exit code meaning "another process owns the lock". Not a failure: the
    # work is already being done, so downstream should wait, not abort.
    lock_held_rc: int | None = None


def build_tasks() -> dict[str, Task]:
    tasks = [
        Task(
            name="sweep_arxiv",
            command=[PY, "scripts/research/arxiv_sweep_2026_11_04.py"],
            inputs=[],
            outputs=[REPO / "data" / "research" / "arxiv_sweep_2026-11-04.jsonl"],
            retries=3,
            timeout=3600,
            output_only=True,
        ),
        Task(
            name="backfill",
            command=[PY, "scripts/research/fulltext_backfill.py",
                     "--manifest", str(MERGED),
                     "--out", str(BACKFILL),
                     "--max-records", "2500", "--delay", "1.5"],
            inputs=[MERGED],
            outputs=[BACKFILL],
            retries=2,
            timeout=14400,
            output_only=True,
            lock_held_rc=3,
        ),
        Task(
            name="consolidate",
            command=[PY, "scripts/research/consolidate_final_2026_11_04.py"],
            inputs=[BACKFILL,
                    REPO / "data" / "research" / "arxiv_sweep_2026-11-04.jsonl"],
            outputs=[MERGED],
            upstream=["sweep_arxiv", "backfill"],
            retries=1,
            timeout=1200,
        ),
        Task(
            name="build_index",
            command=[PY, "scripts/ops/build_corpus_index.py",
                     "--manifest", str(MERGED)],
            inputs=[MERGED],
            outputs=[STATS],
            upstream=["consolidate"],
            retries=1,
            timeout=1200,
        ),
        Task(
            name="eval",
            command=[PY, "scripts/research/retrieval_eval_2026_11_04.py"],
            inputs=[MERGED],
            outputs=[EVAL_OUT],
            upstream=["build_index"],
            retries=0,
            timeout=1800,
        ),
    ]
    return {t.name: t for t in tasks}


def topo_order(tasks: dict[str, Task], only: str | None = None) -> list[str]:
    """Kahn's algorithm over `upstream`. Deterministic for a stable run log."""
    if only:
        if only not in tasks:
            raise KeyError(f"unknown task {only!r}; known: {sorted(tasks)}")
        # Keep the task and everything it transitively depends on.
        need, stack = set(), [only]
        while stack:
            n = stack.pop()
            if n in need:
                continue
            need.add(n)
            stack.extend(tasks[n].upstream)
        tasks = {k: v for k, v in tasks.items() if k in need}

    indeg = {n: len([u for u in t.upstream if u in tasks]) for n, t in tasks.items()}
    ready = sorted(n for n, d in indeg.items() if d == 0)
    order: list[str] = []
    while ready:
        n = ready.pop(0)
        order.append(n)
        for m, t in tasks.items():
            if n in t.upstream:
                indeg[m] -= 1
                if indeg[m] == 0:
                    ready.append(m)
        ready.sort()
    if len(order) != len(tasks):
        raise ValueError(f"cycle in DAG: {sorted(set(tasks) - set(order))}")
    return order


def is_fresh(task: Task) -> bool:
    """True when every output exists and is newer than every input."""
    if not task.outputs:
        return False
    if any(not p.exists() for p in task.outputs):
        return False
    out_mtime = min(p.stat().st_mtime for p in task.outputs)
    if task.output_only:
        return True
    if not task.inputs:
        return True
    in_mtime = max(p.stat().st_mtime for p in task.inputs if p.exists())
    return out_mtime >= in_mtime


def run_task(task: Task, cwd: Path, dry_run: bool, log: list[dict]) -> dict:
    started = datetime.now(timezone.utc)
    record = {"task": task.name, "started_at": started.isoformat(),
              "attempts": 0, "status": "pending"}
    if dry_run:
        record["status"] = "dry_run"
        record["command"] = " ".join(task.command)
        print(f"[dry-run] {task.name}: {' '.join(task.command)}")
        return record

    delay = 5.0
    for attempt in range(1, task.retries + 2):
        record["attempts"] = attempt
        try:
            proc = subprocess.run(task.command, cwd=str(cwd),
                                  capture_output=True, text=True,
                                  timeout=task.timeout)
        except subprocess.TimeoutExpired:
            record["status"] = "timeout"
            record["error"] = f"exceeded {task.timeout}s"
            print(f"[FAIL] {task.name}: timeout after {task.timeout}s")
            break
        if proc.returncode == 0:
            record["status"] = "success"
            record["stdout_tail"] = proc.stdout[-600:]
            print(f"[ OK ] {task.name} (attempt {attempt})")
            break
        if task.lock_held_rc is not None and proc.returncode == task.lock_held_rc:
            # Another process is already doing this work. Not a failure and
            # not a retry: retrying would just hit the same lock.
            record["status"] = "skipped_locked"
            record["stderr_tail"] = (proc.stderr or proc.stdout)[-400:]
            print(f"[skip] {task.name}: another run holds the single-flight lock")
            break
        record["status"] = "failed"
        record["returncode"] = proc.returncode
        record["stderr_tail"] = (proc.stderr or proc.stdout)[-800:]
        if attempt <= task.retries:
            print(f"[retry] {task.name} rc={proc.returncode}; backing off {delay:.0f}s")
            time.sleep(delay)
            delay *= 2
        else:
            print(f"[FAIL] {task.name} rc={proc.returncode}")

    record["finished_at"] = datetime.now(timezone.utc).isoformat()
    record["duration_s"] = round(
        (datetime.now(timezone.utc) - started).total_seconds(), 1)
    return record


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Research pipeline DAG runner")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="ignore freshness, run everything")
    ap.add_argument("--only", help="run one task and its upstream dependencies")
    ap.add_argument("--from", dest="from_task", help="run from this task onward")
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args(argv)

    tasks = build_tasks()
    order = topo_order(tasks, only=args.only)

    if args.list:
        for n in order:
            t = tasks[n]
            print(f"{n:<14} upstream={t.upstream or []} retries={t.retries} "
                  f"fresh={is_fresh(t)}")
        return 0

    if args.from_task:
        if args.from_task not in order:
            print(f"unknown task {args.from_task!r}; known: {order}", file=sys.stderr)
            return 2
        order = order[order.index(args.from_task):]

    print(f"=== research pipeline: {len(order)} task(s) ===")
    log: list[dict] = []
    failed = False
    for name in order:
        task = tasks[name]
        if not args.force and not args.dry_run and is_fresh(task):
            print(f"[skip] {name} (up to date)")
            log.append({"task": name, "status": "skipped_fresh"})
            continue
        rec = run_task(task, REPO, args.dry_run, log)
        log.append(rec)
        if rec["status"] not in ("success", "dry_run", "skipped_locked"):
            failed = True
            break  # downstream tasks cannot run on a failed dependency

    run_log = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "tasks": log,
        "failed": failed,
    }
    (CORPUS / "_pipeline_run_log.json").write_text(
        json.dumps(run_log, indent=1), encoding="utf-8")

    if failed:
        FAILED_SENTINEL.write_text(json.dumps(
            {"failed_at": run_log["run_at"],
             "task": next((r["task"] for r in log if r["status"] not in
                           ("success", "skipped_fresh", "dry_run",
                            "skipped_locked")), None)},
            indent=1), encoding="utf-8")
        print(f"=== FAILED — sentinel at {FAILED_SENTINEL} ===")
        return 1
    if FAILED_SENTINEL.exists():
        FAILED_SENTINEL.unlink()
    print("=== pipeline complete ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
