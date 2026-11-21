#!/usr/bin/env python3
"""
Verified Google 30TB Ultra Vault Offloader (`scripts/ops/offload_to_gdrive_30tb_vault.py`)
==========================================================================================
Zero-data-loss offloader from constrained local SSD (`C:`) to Garrett's
30 TiB Google Drive Ultra Vault (`gdrive:GSE-Ultra-30TB-Vault/`, ~29.82 TiB free)
using authenticated `rclone` with mandatory cryptographic/parity checks.

Hard Safety Invariants:
  1. Never touches active repositories, git worktrees (`wt-owner`, `wt-migration`,
     `Sports`), credential stores, `.hermes`, `.gemini`, `.ssh`, `.aws`, or live DBs
     (`pg-verify`).
  2. Never deletes any local file until either `rclone check --one-way` exits 0
     (`verify_copy_then_prune`) OR `rclone move` verifies destination size + MD5.
  3. Writes a local JSON restore receipt (`OFFLOADED_TO_GDRIVE_30TB_VAULT.json`)
     for every offloaded archive.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import stat
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

DEFAULT_REMOTE_ROOT = "gdrive:GSE-Ultra-30TB-Vault"

PROTECTED_DIR_NAMES: frozenset[str] = frozenset({
    "wt-owner",
    "wt-migration",
    "wt-wp22",
    "sports",
    "sports-worktrees",
    ".hermes",
    ".gemini",
    ".ssh",
    ".aws",
    ".gse-secrets",
    "offline_credential_vault",
    "pg-verify",
    ".git",
    "windows",
    "program files",
    "program files (x86)",
    "gse-ml-service",
})

PROTECTED_EXACT_PREFIXES: tuple[Path, ...] = (
    Path(r"C:\c\wt-owner"),
    Path(r"C:\c\wt-migration"),
    Path(r"C:\c\wt-wp22"),
    Path(r"C:\Users\Garrett\Sports"),
    Path(r"C:\Users\Garrett\Sports-worktrees"),
    Path(r"C:\Users\Garrett\.hermes"),
    Path(r"C:\Users\Garrett\.gemini"),
    Path(r"C:\Users\Garrett\.ssh"),
    Path(r"C:\Users\Garrett\.aws"),
    Path(r"C:\Users\Garrett\Offline_Credential_Vault"),
    Path(r"C:\Users\Garrett\gse-ml-service"),
    Path(r"C:\Windows"),
)


def is_protected_path(candidate: Path) -> bool:
    """Return True if candidate overlaps any protected workspace, credential, or OS tree."""
    try:
        resolved = candidate.expanduser().resolve(strict=False)
    except OSError:
        resolved = candidate.expanduser()
    low_str = str(resolved).lower()
    for pref in PROTECTED_EXACT_PREFIXES:
        p_low = str(pref).lower()
        if low_str == p_low or low_str.startswith(p_low + os.sep) or p_low.startswith(low_str + os.sep):
            return True
    for part in resolved.parts:
        p_low = part.lower().strip("\\/:")
        if p_low in PROTECTED_DIR_NAMES:
            return True
        if p_low.startswith(".env"):
            return True
    if (resolved / ".git").exists() and resolved.name.lower().startswith("wt-"):
        return True
    return False


def _count_files_and_bytes(root: Path) -> tuple[int, int]:
    if root.is_file():
        return (1, int(root.stat().st_size))
    n_files = 0
    total_b = 0
    for dirpath, _dirnames, filenames in os.walk(root, followlinks=False):
        dp = Path(dirpath)
        for fn in filenames:
            fp = dp / fn
            try:
                st = fp.lstat()
                if not stat.S_ISLNK(st.st_mode):
                    n_files += 1
                    total_b += int(st.st_size)
            except OSError:
                continue
    return (n_files, total_b)


def _on_rm_error(func, path, _exc_info):
    os.chmod(path, stat.S_IWRITE)
    func(path)


def verify_copy_then_prune(
    src: Path,
    remote_dest: str,
    *,
    dry_run: bool = False,
    write_receipt: bool = True,
    transfers: int = 12,
    checkers: int = 12,
) -> dict[str, Any]:
    """Copy `src` to `remote_dest`, verify parity via `rclone check --one-way`, then prune local."""
    src_p = src.expanduser().resolve(strict=False)
    if not src_p.exists():
        raise FileNotFoundError(f"Source does not exist: {src_p}")
    if is_protected_path(src_p):
        raise ValueError(f"Refusing to offload protected path: {src_p}")
    if not remote_dest or ":" not in remote_dest:
        raise ValueError(f"Invalid rclone remote destination: {remote_dest!r}")

    n_files, total_bytes = _count_files_and_bytes(src_p)
    du_before = shutil.disk_usage("C:\\").free

    if dry_run:
        return {
            "status": "dry_run",
            "src": str(src_p),
            "remote_dest": remote_dest,
            "file_count": n_files,
            "total_bytes": total_bytes,
            "free_before_bytes": du_before,
        }

    copy_cmd = [
        "rclone",
        "copy",
        str(src_p),
        remote_dest,
        f"--transfers={transfers}",
        f"--checkers={checkers}",
        "--fast-list",
        "--create-empty-src-dirs",
        "--stats=0",
        "--log-level=NOTICE",
    ]
    cp_copy = subprocess.run(copy_cmd, capture_output=True, text=True, check=False)
    if cp_copy.returncode != 0:
        raise RuntimeError(
            f"rclone copy failed (rc={cp_copy.returncode}) for {src_p} -> {remote_dest}: {cp_copy.stderr}"
        )

    check_cmd = [
        "rclone",
        "check",
        str(src_p),
        remote_dest,
        "--one-way",
        f"--checkers={checkers}",
        "--fast-list",
        "--log-level=NOTICE",
    ]
    cp_chk = subprocess.run(check_cmd, capture_output=True, text=True, check=False)
    if cp_chk.returncode != 0:
        raise RuntimeError(
            f"rclone check --one-way FAILED (rc={cp_chk.returncode}); local files preserved at {src_p}: {cp_chk.stderr}"
        )

    receipt = {
        "schema": "gse_30tb_vault_offload_receipt_v1",
        "verified_utc": datetime.now(timezone.utc).isoformat(),
        "source_path": str(src_p),
        "remote_uri": remote_dest,
        "file_count": n_files,
        "total_bytes": total_bytes,
        "rclone_check_one_way_rc": 0,
        "restore_command": f'rclone copy "{remote_dest}" "{src_p}" --transfers=12 --checkers=12',
    }

    if src_p.is_dir():
        shutil.rmtree(src_p, onerror=_on_rm_error)
        if write_receipt:
            src_p.mkdir(parents=True, exist_ok=True)
            (src_p / "OFFLOADED_TO_GDRIVE_30TB_VAULT.json").write_text(
                json.dumps(receipt, indent=2) + "\n", encoding="utf-8"
            )
    else:
        src_p.unlink()
        if write_receipt:
            receipt_path = src_p.with_name(src_p.name + ".OFFLOADED_TO_GDRIVE_30TB_VAULT.json")
            receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    du_after = shutil.disk_usage("C:\\").free
    receipt["free_before_bytes"] = du_before
    receipt["free_after_bytes"] = du_after
    receipt["freed_bytes"] = max(0, du_after - du_before)
    return receipt


def background_verified_move(
    targets: Sequence[tuple[Path, str]],
    manifest_path: Path,
    log_path: Path | None = None,
    *,
    dry_run: bool = False,
    transfers: int = 8,
    checkers: int = 12,
) -> dict[str, Any]:
    """Run verified `rclone move` (size+hash check per file before unlink) across cold targets."""
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    if log_path is not None:
        log_path.parent.mkdir(parents=True, exist_ok=True)

    results: list[dict[str, Any]] = []
    du_start = shutil.disk_usage("C:\\").free

    for raw_src, remote_dest in targets:
        src_p = Path(raw_src).expanduser().resolve(strict=False)
        if is_protected_path(src_p):
            results.append({"src": str(src_p), "status": "BLOCKED_PROTECTED"})
            continue
        if not src_p.exists():
            results.append({"src": str(src_p), "status": "SKIPPED_MISSING"})
            continue

        n_files, total_bytes = _count_files_and_bytes(src_p)
        if n_files == 0:
            results.append({"src": str(src_p), "status": "SKIPPED_EMPTY"})
            continue

        du_b = shutil.disk_usage("C:\\").free
        entry: dict[str, Any] = {
            "src": str(src_p),
            "remote_uri": remote_dest,
            "file_count_before": n_files,
            "bytes_before": total_bytes,
            "started_utc": datetime.now(timezone.utc).isoformat(),
            "restore_command": f'rclone copy "{remote_dest}" "{src_p}" --transfers=12 --checkers=12',
        }
        if dry_run:
            entry["status"] = "dry_run"
            results.append(entry)
            continue

        move_cmd = [
            "rclone",
            "move",
            str(src_p),
            remote_dest,
            "--delete-empty-src-dirs",
            f"--transfers={transfers}",
            f"--checkers={checkers}",
            "--fast-list",
            "--stats=30s",
            "--log-level=NOTICE",
        ]
        if log_path is not None:
            move_cmd.append(f"--log-file={log_path}")

        cp = subprocess.run(move_cmd, capture_output=True, text=True, check=False)
        du_a = shutil.disk_usage("C:\\").free
        entry["completed_utc"] = datetime.now(timezone.utc).isoformat()
        entry["rclone_move_rc"] = int(cp.returncode)
        entry["freed_bytes"] = max(0, du_a - du_b)
        entry["status"] = "VERIFIED_OFFLOADED" if cp.returncode == 0 else "PARTIAL_OR_RETRY_NEEDED"
        if cp.returncode == 0 and src_p.is_dir():
            src_p.mkdir(parents=True, exist_ok=True)
            (src_p / "OFFLOADED_TO_GDRIVE_30TB_VAULT.json").write_text(
                json.dumps(entry, indent=2) + "\n", encoding="utf-8"
            )
        results.append(entry)

        payload = {
            "schema": "gse_30tb_vault_batch_manifest_v1",
            "updated_utc": datetime.now(timezone.utc).isoformat(),
            "free_start_gb": round(du_start / (1024 ** 3), 2),
            "free_now_gb": round(du_a / (1024 ** 3), 2),
            "results": results,
        }
        manifest_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    du_end = shutil.disk_usage("C:\\").free
    final = {
        "schema": "gse_30tb_vault_batch_manifest_v1",
        "updated_utc": datetime.now(timezone.utc).isoformat(),
        "free_start_gb": round(du_start / (1024 ** 3), 2),
        "free_now_gb": round(du_end / (1024 ** 3), 2),
        "total_freed_gb": round(max(0, du_end - du_start) / (1024 ** 3), 2),
        "results": results,
    }
    manifest_path.write_text(json.dumps(final, indent=2) + "\n", encoding="utf-8")
    return final


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Verified offload to Google 30TB Ultra Vault via rclone")
    ap.add_argument("--mode", choices=("verify-offload", "batch-move"), required=True)
    ap.add_argument("--src", help="Source path for verify-offload")
    ap.add_argument("--remote", help="Remote gdrive: URI for verify-offload")
    ap.add_argument("--targets-json", help="JSON file of [[src, remote_dest], ...] pairs for batch-move")
    ap.add_argument("--manifest", default=r"C:\Users\Garrett\OFFLOADED_TO_GDRIVE_30TB_VAULT_MANIFEST_2026_11_20.json")
    ap.add_argument("--log-file", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    if args.mode == "verify-offload":
        if not args.src or not args.remote:
            print("--src and --remote are required for verify-offload", file=sys.stderr)
            return 2
        res = verify_copy_then_prune(Path(args.src), args.remote, dry_run=args.dry_run)
        print(json.dumps(res, indent=2))
        return 0

    if not args.targets_json:
        print("--targets-json is required for batch-move", file=sys.stderr)
        return 2
    pairs_raw = json.loads(Path(args.targets_json).read_text(encoding="utf-8"))
    pairs = [(Path(a), str(b)) for a, b in pairs_raw]
    log_p = Path(args.log_file) if args.log_file else None
    res = background_verified_move(pairs, Path(args.manifest), log_path=log_p, dry_run=args.dry_run)
    print(json.dumps(res, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
