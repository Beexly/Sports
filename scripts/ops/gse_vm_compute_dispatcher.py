#!/usr/bin/env python3
"""
Zero-Cost Remote VM & GPU Compute Dispatcher
Supports:
1. kaggle_gpu (30hr/wk free T4x2 GPU VMs for kernel.cu, BDB 2027 tracking, DeepSeek LoRA SFT)
2. gcp_vm (galaxysportsedge)
3. cloud_shell (interactive free zero-cost ephemeral cloud environment)
"""

import os
import sys
from typing import Any, Dict, List

SUPPORTED_TARGETS = ("kaggle_gpu", "gcp_vm", "cloud_shell")


def build_kaggle_gpu_kernel_metadata(
    kernel_slug: str,
    script_path: str,
    enable_gpu: bool = True,
    enable_internet: bool = True,
) -> Dict[str, Any]:
    """
    Constructs Kaggle kernel metadata dictionary for pushing GPU jobs.
    """
    code_file = os.path.basename(script_path)
    is_notebook = script_path.endswith(".ipynb")
    return {
        "id": f"garrett/{kernel_slug}",
        "title": kernel_slug.replace("-", " ").title(),
        "code_file": code_file,
        "language": "python" if code_file.endswith(".py") else "bash" if code_file.endswith(".sh") else "cpp" if code_file.endswith((".cu", ".cpp")) else "python",
        "kernel_type": "notebook" if is_notebook else "script",
        "is_private": True,
        "enable_gpu": enable_gpu,
        "enable_tpu": False,
        "enable_internet": enable_internet,
        "dataset_sources": [],
        "competition_sources": ["nfl-big-data-bowl-2025", "nfl-big-data-bowl-2026"],
        "kernel_sources": [],
        "accelerator": "gpu" if enable_gpu else "none",
    }


def build_gcp_vm_dispatch_command(
    project_id: str,
    zone: str,
    instance: str,
    command: str,
) -> List[str]:
    """
    Builds gcloud compute ssh command to execute remote jobs on GCP VM.
    """
    return [
        "gcloud",
        "compute",
        "ssh",
        instance,
        f"--project={project_id}",
        f"--zone={zone}",
        f"--command={command}",
    ]


def dispatch_compute_job(
    target: str,
    job_spec: Dict[str, Any],
    dry_run: bool = True,
) -> Dict[str, Any]:
    """
    Dispatches a compute job to the specified target.
    Supported: 'kaggle_gpu', 'gcp_vm', 'cloud_shell'
    """
    if target not in SUPPORTED_TARGETS:
        raise ValueError(
            f"Unsupported compute target: '{target}'. Supported targets: {', '.join(SUPPORTED_TARGETS)}"
        )

    if target == "kaggle_gpu":
        kernel_slug = job_spec.get("kernel_slug", "gse-cuda-entropy-kernel")
        script_path = job_spec.get("script_path", "kernel.cu")
        enable_gpu = job_spec.get("enable_gpu", True)
        enable_internet = job_spec.get("enable_internet", True)
        work_dir = job_spec.get("work_dir", ".")

        metadata = build_kaggle_gpu_kernel_metadata(
            kernel_slug=kernel_slug,
            script_path=script_path,
            enable_gpu=enable_gpu,
            enable_internet=enable_internet,
        )
        cmd = ["kaggle", "kernels", "push", "-p", work_dir]

        return {
            "target": "kaggle_gpu",
            "status": "DRY_RUN" if dry_run else "DISPATCHED",
            "dry_run": dry_run,
            "kernel_slug": kernel_slug,
            "metadata": metadata,
            "command": cmd,
            "description": "30hr/wk free T4x2 GPU VMs for kernel.cu, BDB 2027 tracking, DeepSeek LoRA SFT",
        }

    elif target == "gcp_vm":
        project_id = job_spec.get("project_id", "galaxysportsedge")
        zone = job_spec.get("zone", "us-central1-a")
        instance = job_spec.get("instance", "gse-compute-node-1")
        command = job_spec.get("command", "python3 run_pipeline.py")

        cmd = build_gcp_vm_dispatch_command(
            project_id=project_id,
            zone=zone,
            instance=instance,
            command=command,
        )

        return {
            "target": "gcp_vm",
            "status": "DRY_RUN" if dry_run else "DISPATCHED",
            "dry_run": dry_run,
            "project_id": project_id,
            "zone": zone,
            "instance": instance,
            "command": cmd,
            "description": "Google Cloud Compute Engine VM for galaxysportsedge",
        }

    elif target == "cloud_shell":
        command = job_spec.get("command", "echo 'GSE Cloud Shell Dispatch'")
        cmd = ["gcloud", "cloud-shell", "ssh", f"--command={command}"]

        return {
            "target": "cloud_shell",
            "status": "DRY_RUN" if dry_run else "DISPATCHED",
            "dry_run": dry_run,
            "command": cmd,
            "description": "Google Cloud Shell free interactive environment",
        }

    raise ValueError(f"Unhandled target: {target}")


if __name__ == "__main__":
    test_job = {
        "kernel_slug": "nfl-bdb-tracking-cuda",
        "script_path": "kernel.cu",
        "enable_gpu": True,
    }
    result = dispatch_compute_job("kaggle_gpu", test_job, dry_run=True)
    print(f"Kaggle GPU Dispatch test: {result['status']} -> {result['kernel_slug']}")
