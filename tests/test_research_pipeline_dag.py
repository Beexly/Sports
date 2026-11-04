"""Tests for the research pipeline DAG runner.

The runner must order tasks correctly, refuse cycles, resume safely (skip
fresh outputs), and never run a downstream task after an upstream failure.
These tests exercise the pure logic; they do not execute the pipeline.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

_SRC = Path(__file__).resolve().parents[1] / "scripts" / "ops" / "research_pipeline_dag.py"


@pytest.fixture(scope="module")
def dag():
    spec = importlib.util.spec_from_file_location("research_pipeline_dag", _SRC)
    mod = importlib.util.module_from_spec(spec)
    # dataclasses resolves annotations through sys.modules[mod.__name__];
    # without this registration exec_module raises AttributeError in
    # dataclasses.py during @dataclass processing.
    sys.modules["research_pipeline_dag"] = mod
    spec.loader.exec_module(mod)
    return mod


def test_task_graph_is_acyclic_and_complete(dag):
    tasks = dag.build_tasks()
    order = dag.topo_order(tasks)
    assert set(order) == set(tasks)
    assert len(order) == len(tasks)


def test_upstream_always_precedes_downstream(dag):
    tasks = dag.build_tasks()
    order = dag.topo_order(tasks)
    pos = {n: i for i, n in enumerate(order)}
    for name, task in tasks.items():
        for up in task.upstream:
            assert pos[up] < pos[name], f"{up} must run before {name}"


def test_real_pipeline_dependency_chain(dag):
    order = dag.topo_order(dag.build_tasks())
    pos = {n: i for i, n in enumerate(order)}
    assert pos["backfill"] < pos["consolidate"]
    assert pos["sweep_arxiv"] < pos["consolidate"]
    assert pos["consolidate"] < pos["build_index"]
    assert pos["build_index"] < pos["eval"]


def test_only_pulls_transitive_upstream(dag):
    tasks = dag.build_tasks()
    order = dag.topo_order(tasks, only="eval")
    assert set(order) == {"backfill", "sweep_arxiv", "consolidate",
                          "build_index", "eval"}


def test_only_on_leaf_pulls_nothing_extra(dag):
    tasks = dag.build_tasks()
    order = dag.topo_order(tasks, only="build_index")
    assert "eval" not in order
    assert "build_index" in order


def test_unknown_task_raises(dag):
    with pytest.raises(KeyError):
        dag.topo_order(dag.build_tasks(), only="does_not_exist")


def test_cycle_is_rejected(dag):
    tasks = dag.build_tasks()
    # Introduce a cycle: sweep_arxiv depends on eval, which depends on sweep.
    tasks["sweep_arxiv"].upstream = ["eval"]
    with pytest.raises(ValueError, match="cycle"):
        dag.topo_order(tasks)


def test_is_fresh_requires_all_outputs(tmp_path, dag):
    out = tmp_path / "out.jsonl"
    task = dag.Task(name="t", command=[], inputs=[], outputs=[out])
    assert not dag.is_fresh(task), "missing output must not count as fresh"
    out.write_text("x", encoding="utf-8")
    assert dag.is_fresh(task)


def test_output_only_ignores_input_age(tmp_path, dag):
    inp = tmp_path / "in.jsonl"
    out = tmp_path / "out.jsonl"
    inp.write_text("i", encoding="utf-8")
    out.write_text("o", encoding="utf-8")
    # Make the output older than the input.
    import os
    os.utime(out, (out.stat().st_atime - 1000, out.stat().st_mtime - 1000))
    task = dag.Task(name="t", command=[], inputs=[inp], outputs=[out],
                    output_only=True)
    assert dag.is_fresh(task), "output_only must skip regardless of input age"


def test_stale_output_is_not_fresh(tmp_path, dag):
    inp = tmp_path / "in.jsonl"
    out = tmp_path / "out.jsonl"
    inp.write_text("i", encoding="utf-8")
    out.write_text("o", encoding="utf-8")
    import os
    os.utime(inp, (inp.stat().st_atime + 1000, inp.stat().st_mtime + 1000))
    task = dag.Task(name="t", command=[], inputs=[inp], outputs=[out])
    assert not dag.is_fresh(task), "output older than input must re-run"


def test_network_tasks_carry_retries(dag):
    tasks = dag.build_tasks()
    assert tasks["sweep_arxiv"].retries >= 1
    assert tasks["backfill"].retries >= 1
    # The local eval step should not silently retry a real failure.
    assert tasks["eval"].retries == 0


def test_backfill_declares_lock_held_exit_code(dag):
    """fulltext_backfill returns 3 when another writer owns the lock."""
    assert dag.build_tasks()["backfill"].lock_held_rc == 3


def test_lock_held_is_not_a_failure(tmp_path, dag):
    """A task exiting with its lock_held_rc must be skipped, not retried."""
    task = dag.Task(
        name="locked", command=[sys.executable, "-c", "import sys; sys.exit(3)"],
        inputs=[], outputs=[tmp_path / "never"], retries=3, lock_held_rc=3)
    rec = dag.run_task(task, tmp_path, False, [])
    assert rec["status"] == "skipped_locked"
    assert rec["attempts"] == 1, "a held lock must not be retried"


def test_ordinary_failure_is_still_a_failure(tmp_path, dag):
    task = dag.Task(
        name="broken", command=[sys.executable, "-c", "import sys; sys.exit(1)"],
        inputs=[], outputs=[tmp_path / "never"], retries=0)
    rec = dag.run_task(task, tmp_path, False, [])
    assert rec["status"] == "failed"


def test_dry_run_writes_run_log(tmp_path, dag, monkeypatch):
    log_path = tmp_path / "_pipeline_run_log.json"
    monkeypatch.setattr(dag, "CORPUS", tmp_path)
    monkeypatch.setattr(dag, "FAILED_SENTINEL", tmp_path / "_failed.json")
    rc = dag.main(["--dry-run", "--force", "--only", "build_index"])
    # build_index's upstream is consolidate; both should be dry-run entries.
    assert rc == 0
    assert (tmp_path / "_pipeline_run_log.json").exists()
    import json
    data = json.loads((tmp_path / "_pipeline_run_log.json").read_text())
    names = [t["task"] for t in data["tasks"]]
    assert "build_index" in names
    assert data["failed"] is False
