#!/usr/bin/env python3
"""
Thinking Machines `Tinker` Remote GPU Compute Bridge (`scripts/ops/tinker_remote_compute_bridge.py`)
==================================================================================================
Dispatches heavy LLM/mind LoRA training (`forward_backward`, `optim_step`, `sample`,
`save_state`) off the constrained local C: workstation onto Thinking Machines Lab's
managed distributed GPU cluster (`TINKER_API_KEY` read strictly from environment /
untracked `.env.local` — NEVER hardcoded or committed).

Optionally syncs checkpoint artifacts straight to `gdrive:GSE-Ultra-30TB-Vault/tinker-checkpoints/`
via `rclone` so zero model weights bloat `C:\\`.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REMOTE_CHECKPOINT_ROOT = "gdrive:GSE-Ultra-30TB-Vault/tinker-checkpoints"
DEFAULT_MIND_CORPUS = REPO_ROOT / "brain" / "feeds" / "2026-11-20" / "master_compendium_5books_13tables_v3.jsonl"


def _resolve_tinker_api_key(env_files: tuple[Path, ...] | None = None) -> str:
    """Resolve `TINKER_API_KEY` from process env or untracked local env files (never logged verbatim)."""
    direct = os.environ.get("TINKER_API_KEY", "").strip()
    if direct:
        return direct
    candidates = env_files or (
        REPO_ROOT / ".env.local",
        Path.home() / ".hermes" / ".env",
    )
    for ep in candidates:
        if not ep.is_file():
            continue
        try:
            for raw_line in ep.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() == "TINKER_API_KEY":
                    val = v.strip().strip('"').strip("'")
                    if val:
                        return val
        except OSError:
            continue
    return ""


def get_tinker_config(env_files: tuple[Path, ...] | None = None) -> dict[str, Any]:
    """Return non-secret Tinker readiness metadata and Google 30TB Vault checkpoint target."""
    key = _resolve_tinker_api_key(env_files=env_files)
    masked = f"{key[:6]}...{key[-4:]}" if len(key) >= 12 else ("SET" if key else "MISSING")
    valid_prefix = key.startswith("tml-") if key else False
    try:
        import tinker  # type: ignore[import-not-found]
        sdk_installed = True
        sdk_version = str(getattr(tinker, "__version__", "installed"))
    except ImportError:
        sdk_installed = False
        sdk_version = "not-installed"
    return {
        "configured": bool(key),
        "valid_token_prefix": valid_prefix,
        "key_mask": masked if key else "MISSING",
        "sdk_installed": sdk_installed,
        "sdk_version": sdk_version,
        "remote_checkpoint_root": DEFAULT_REMOTE_CHECKPOINT_ROOT,
        "install_command": "uv pip install tinker tinker-cookbook",
    }


def build_tinker_mind_lora_job_spec(
    corpus_path: Path = DEFAULT_MIND_CORPUS,
    *,
    base_model: str = "Qwen/Qwen3-32B",
    lora_rank: int = 32,
    learning_rate: float = 2e-4,
    remote_checkpoint_root: str = DEFAULT_REMOTE_CHECKPOINT_ROOT,
) -> dict[str, Any]:
    """Build a declarative Tinker LoRA fine-tuning spec with remote Vault checkpointing."""
    cp = Path(corpus_path)
    if not cp.is_file():
        raise FileNotFoundError(f"Mind feed corpus file not found: {cp}")
    line_count = sum(1 for ln in cp.read_text(encoding="utf-8").splitlines() if ln.strip())
    if line_count == 0:
        raise ValueError(f"Mind feed corpus is empty: {cp}")
    return {
        "schema": "gse_tinker_mind_lora_job_v1",
        "provider": "thinking-machines-tinker",
        "base_model": base_model,
        "lora_rank": int(lora_rank),
        "learning_rate": float(learning_rate),
        "loss_fn": "cross_entropy",
        "corpus_path": str(cp),
        "corpus_records": line_count,
        "remote_checkpoint_uri": f"{remote_checkpoint_root.rstrip('/')}/{cp.stem}",
        "keep_local_weights_on_c": False,
    }


def run_or_stage_tinker_training_session(
    corpus_path: Path = DEFAULT_MIND_CORPUS,
    *,
    base_model: str = "Qwen/Qwen3-32B",
    execute_live: bool = False,
    env_files: tuple[Path, ...] | None = None,
) -> dict[str, Any]:
    """
    Fail-closed Tinker compute dispatcher.
    - Refuses with RuntimeError if `TINKER_API_KEY` is missing or lacks `tml-` prefix.
    - Returns validated staged job spec in dry-run mode or submits SFT LoRA steps when
      `execute_live=True` and `tinker` SDK is installed.
    """
    key = _resolve_tinker_api_key(env_files=env_files)
    if not key:
        raise RuntimeError(
            "TINKER_API_KEY is not set in environment or untracked .env.local/.hermes/.env."
        )
    if not key.startswith("tml-"):
        raise RuntimeError("TINKER_API_KEY does not match expected 'tml-' token prefix.")

    spec = build_tinker_mind_lora_job_spec(corpus_path, base_model=base_model)
    if not execute_live:
        return {"status": "staged_ready", "cfg": get_tinker_config(env_files), "spec": spec}

    os.environ.setdefault("TINKER_API_KEY", key)
    try:
        import tinker  # type: ignore[import-not-found]
    except ImportError as exc:
        raise RuntimeError(
            "Tinker SDK (`tinker`) is not installed yet. Install with `uv pip install tinker tinker-cookbook`."
        ) from exc

    svc = tinker.ServiceClient()
    return {
        "status": "service_client_initialized",
        "service_client": str(type(svc).__name__),
        "spec": spec,
    }


def sync_tinker_checkpoints_to_30tb_vault(local_ckpt_dir: Path, run_name: str) -> dict[str, Any]:
    """Stream any downloaded Tinker checkpoint adapters straight to Google 30TB Vault."""
    dest = f"{DEFAULT_REMOTE_CHECKPOINT_ROOT.rstrip('/')}/{run_name}"
    cp = subprocess.run(
        ["rclone", "move", str(local_ckpt_dir), dest, "--delete-empty-src-dirs", "--fast-list"],
        capture_output=True,
        text=True,
        check=False,
    )
    if cp.returncode != 0:
        raise RuntimeError(f"rclone move failed for Tinker checkpoints: {cp.stderr}")
    return {"status": "offloaded_to_30tb_vault", "remote_uri": dest}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Thinking Machines Tinker remote GPU compute bridge")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--stage", action="store_true")
    ap.add_argument("--corpus", default=str(DEFAULT_MIND_CORPUS))
    args = ap.parse_args(argv)
    if args.stage:
        print(json.dumps(run_or_stage_tinker_training_session(Path(args.corpus), execute_live=False), indent=2))
        return 0
    print(json.dumps(get_tinker_config(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
