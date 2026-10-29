import pytest
import os
import sys

# Ensure scripts/ops is importable
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, os.path.join(repo_root, "scripts", "ops"))

from gse_vm_compute_dispatcher import (
    build_kaggle_gpu_kernel_metadata,
    build_gcp_vm_dispatch_command,
    dispatch_compute_job,
    SUPPORTED_TARGETS,
)
from reconcile_all_downloads_and_workspaces import (
    resolve_canonical_bucket,
    reconcile_workspace_inventory,
    CANONICAL_BUCKETS,
)


def test_build_kaggle_gpu_kernel_metadata():
    metadata = build_kaggle_gpu_kernel_metadata(
        kernel_slug="entropy-cholesky-cu",
        script_path="src/cuda/kernel.cu",
        enable_gpu=True,
        enable_internet=True,
    )
    assert metadata["id"] == "garrett/entropy-cholesky-cu"
    assert metadata["code_file"] == "kernel.cu"
    assert metadata["enable_gpu"] is True
    assert metadata["accelerator"] == "gpu"
    assert metadata["enable_internet"] is True
    assert "nfl-big-data-bowl-2025" in metadata["competition_sources"]


def test_build_gcp_vm_dispatch_command():
    cmd = build_gcp_vm_dispatch_command(
        project_id="galaxysportsedge",
        zone="us-central1-a",
        instance="gse-primary-vm",
        command="python3 train.py",
    )
    assert cmd == [
        "gcloud",
        "compute",
        "ssh",
        "gse-primary-vm",
        "--project=galaxysportsedge",
        "--zone=us-central1-a",
        "--command=python3 train.py",
    ]


def test_dispatch_compute_job_targets():
    # 1. Kaggle GPU
    res_kaggle = dispatch_compute_job(
        "kaggle_gpu",
        {"kernel_slug": "bdb-2027-track", "script_path": "kernel.cu"},
        dry_run=True,
    )
    assert res_kaggle["target"] == "kaggle_gpu"
    assert res_kaggle["status"] == "DRY_RUN"
    assert "kaggle" in res_kaggle["command"][0]

    # 2. GCP VM
    res_gcp = dispatch_compute_job(
        "gcp_vm",
        {
            "project_id": "galaxysportsedge",
            "zone": "us-central1-a",
            "instance": "compute-1",
            "command": "python test.py",
        },
        dry_run=True,
    )
    assert res_gcp["target"] == "gcp_vm"
    assert res_gcp["status"] == "DRY_RUN"
    assert res_gcp["command"][0] == "gcloud"

    # 3. Cloud Shell
    res_cs = dispatch_compute_job(
        "cloud_shell",
        {"command": "pytest"},
        dry_run=True,
    )
    assert res_cs["target"] == "cloud_shell"
    assert res_cs["status"] == "DRY_RUN"

    # 4. Unsupported target raises ValueError
    with pytest.raises(ValueError, match="Unsupported compute target"):
        dispatch_compute_job("aws_ec2_unknown", {})


def test_resolve_canonical_bucket_exact():
    # Specific mandatory test case from directive
    assert (
        resolve_canonical_bucket("circa_observations.db")
        == "docs/data-sources/research/2026-10-28"
    )

    # Data sources
    assert (
        resolve_canonical_bucket("pbp_nflverse_2026.sqlite")
        == "docs/data-sources/research/2026-10-28"
    )

    # Arxiv program
    assert (
        resolve_canonical_bucket("2309-00756-inverse-mdp-fourth-down.ts")
        == "docs/arxiv-program/research/2026-10-28"
    )
    assert (
        resolve_canonical_bucket("arxiv_math_foundations.pdf")
        == "docs/arxiv-program/research/2026-10-28"
    )

    # DFS
    assert (
        resolve_canonical_bucket("week8_draftkings_gpp_optimizer.py")
        == "docs/dfs/research/2026-10-28"
    )

    # Props
    assert (
        resolve_canonical_bucket("mahomes_touchdown_prop_model.ts")
        == "docs/props/research/2026-10-28"
    )

    # Fantasy
    assert (
        resolve_canonical_bucket("dynasty_fantasy_superflex_cheatsheet.csv")
        == "docs/fantasy/research/2026-10-28"
    )

    # Predictions
    assert (
        resolve_canonical_bucket("spread_market_clv_eval.ts")
        == "docs/predictions/research/2026-10-28"
    )

    # Engine fallback
    assert (
        resolve_canonical_bucket("kernel.cu")
        == "docs/engine/research/2026-10-28"
    )
    assert (
        resolve_canonical_bucket("docx_omml_equations_extracted.txt")
        == "docs/engine/research/2026-10-28"
    )


def test_reconcile_workspace_inventory():
    ledger = reconcile_workspace_inventory()
    assert ledger["status"] == "RECONCILED"
    assert ledger["totalFilesScanned"] > 0
    assert "docs/data-sources/research/2026-10-28" in ledger["bucketDistribution"]
    assert "docs/engine/research/2026-10-28" in ledger["bucketDistribution"]
    assert isinstance(ledger["files"], list)
