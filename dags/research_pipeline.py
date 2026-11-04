"""Airflow DAG definition for the research corpus pipeline.

Airflow is NOT installed in this environment. This file exists so the graph can
be adopted without re-deriving it if the stack ever adds Airflow, and so the
dependency structure is reviewable in Airflow's own vocabulary. The working
runner today is `scripts/ops/research_pipeline_dag.py`, which implements the
same graph with idempotency, retries and a structured run log.

To use this file: `pip install apache-airflow`, put this directory on
`AIRFLOW__CORE__DAGS_FOLDER`, and set the connection/env vars below. The BashOperator
commands are identical to the runner's task commands.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta

try:
    from airflow import DAG
    from airflow.operators.bash import BashOperator
    from airflow.utils.dates import days_ago
except ImportError:  # Airflow is not installed; keep the file importable.
    DAG = None  # type: ignore[assignment]

REPO = os.environ.get("GSE_REPO", r"C:\c\wt-week8-forensic")
PY = os.environ.get("GSE_PYTHON", "python")
CORPUS = os.environ.get(
    "GSE_CORPUS",
    r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus",
)
MERGED = os.path.join(CORPUS, "merged_manifest_2026-11-04.jsonl")

default_args = {
    "owner": "gse",
    "depends_on_past": False,
    # Network tasks hit 429; retry with Airflow's own backoff rather than
    # threading a second retry loop through the scripts.
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=60),
    "execution_timeout": timedelta(hours=4),
    "email_on_failure": False,   # wire an SMTP connection before enabling
    "email_on_retry": False,
}

if DAG is not None:
    with DAG(
        dag_id="research_corpus_pipeline",
        description="arXiv/OpenAlex sweep -> backfill -> consolidate -> index -> eval",
        default_args=default_args,
        schedule="0 6 * * *",          # daily 06:00 local
        start_date=days_ago(1),
        catchup=False,                 # never backfill history automatically
        max_active_runs=1,             # one corpus write at a time
        tags=["research", "corpus"],
    ) as dag:

        sweep_arxiv = BashOperator(
            task_id="sweep_arxiv",
            bash_command=f"cd {REPO} && {PY} scripts/research/arxiv_sweep_2026_11_04.py",
        )

        backfill = BashOperator(
            task_id="backfill",
            bash_command=(
                f"cd {REPO} && {PY} scripts/research/fulltext_backfill.py "
                f"--manifest {MERGED} --max-records 2500 --delay 1.5"
            ),
            # The backfill is append-only and resumable; a retry costs nothing
            # because already_done is honoured on startup.
            retries=2,
            execution_timeout=timedelta(hours=8),
        )

        consolidate = BashOperator(
            task_id="consolidate",
            bash_command=f"cd {REPO} && {PY} scripts/research/consolidate_final_2026_11_04.py",
        )

        build_index = BashOperator(
            task_id="build_index",
            bash_command=(
                f"cd {REPO} && {PY} scripts/ops/build_corpus_index.py "
                f"--manifest {MERGED}"
            ),
        )

        evaluate = BashOperator(
            task_id="eval",
            bash_command=f"cd {REPO} && {PY} scripts/research/retrieval_eval_2026_11_04.py",
            retries=0,  # a failing eval is a real regression, not a flake
        )

        # Both producers feed consolidation; neither depends on the other, so
        # they run in parallel.
        [sweep_arxiv, backfill] >> consolidate >> build_index >> evaluate
