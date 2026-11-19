#!/usr/bin/env python3
"""
audit_worktrees_and_disk_safety.py
Audits git worktrees, disk usage, purges __pycache__ and .pytest_cache, and writes the JSON manifest.
"""
import os
import sys
import subprocess
import shutil
import json
from pathlib import Path

def main():
    repo_path = Path(r"C:\Users\Garrett\Sports-wt-triage")
    if not repo_path.exists():
        print(f"Error: Repo path {repo_path} does not exist.")
        sys.exit(1)

    # 1. Disk usage before purge
    disk_before = shutil.disk_usage(r"C:\\")
    free_gb_before = disk_before.free / (1024 ** 3)

    # 2. Purge __pycache__ and .pytest_cache
    purged_dirs_count = 0
    purged_bytes = 0
    
    for root, dirs, files in os.walk(repo_path, topdown=False):
        # skip .git or node_modules
        if ".git" in Path(root).parts or "node_modules" in Path(root).parts:
            continue
        for d in dirs:
            if d in ("__pycache__", ".pytest_cache"):
                target_dir = Path(root) / d
                try:
                    # calculate size
                    dir_size = sum(f.stat().st_size for f in target_dir.glob('**/*') if f.is_file())
                    shutil.rmtree(target_dir, ignore_errors=True)
                    purged_dirs_count += 1
                    purged_bytes += dir_size
                except Exception as e:
                    print(f"Warning: could not remove {target_dir}: {e}")

    disk_after = shutil.disk_usage(r"C:\\")
    free_gb_after = disk_after.free / (1024 ** 3)

    # 3. Worktree audit via git worktree list --porcelain
    worktrees = []
    try:
        wt_result = subprocess.run(
            ["git", "-C", str(repo_path), "worktree", "list", "--porcelain"],
            capture_output=True, text=True, check=True
        )
        current_wt = {}
        for line in wt_result.stdout.splitlines():
            if not line.strip():
                if current_wt:
                    worktrees.append(current_wt)
                    current_wt = {}
                continue
            if line.startswith("worktree "):
                current_wt["path"] = line.split(" ", 1)[1]
            elif line.startswith("HEAD "):
                current_wt["head"] = line.split(" ", 1)[1]
            elif line.startswith("branch "):
                current_wt["branch"] = line.split(" ", 1)[1]
            elif line.startswith("bare"):
                current_wt["bare"] = True
            elif line.startswith("detached"):
                current_wt["detached"] = True
        if current_wt:
            worktrees.append(current_wt)
    except Exception as e:
        print(f"Warning: failed to list worktrees: {e}")

    # Enrich worktrees with dirty status and ahead/behind counts
    enriched_worktrees = []
    clean_count = 0
    dirty_count = 0

    for wt in worktrees:
        wt_path = wt.get("path")
        wt_info = {
            "path": wt_path,
            "head": wt.get("head"),
            "branch": wt.get("branch", "detached"),
            "dirty_files_count": 0,
            "ahead": 0,
            "behind": 0
        }
        if wt_path and Path(wt_path).exists():
            try:
                status_res = subprocess.run(
                    ["git", "-C", wt_path, "status", "--porcelain"],
                    capture_output=True, text=True, check=True
                )
                dirty_lines = [l for l in status_res.stdout.splitlines() if l.strip()]
                wt_info["dirty_files_count"] = len(dirty_lines)
                if len(dirty_lines) > 0:
                    dirty_count += 1
                else:
                    clean_count += 1
            except Exception:
                pass

            try:
                ab_res = subprocess.run(
                    ["git", "-C", wt_path, "rev-list", "--left-right", "--count", "origin/main...HEAD"],
                    capture_output=True, text=True, check=True
                )
                parts = ab_res.stdout.strip().split()
                if len(parts) == 2:
                    wt_info["behind"] = int(parts[0])
                    wt_info["ahead"] = int(parts[1])
            except Exception:
                pass
        enriched_worktrees.append(wt_info)

    manifest = {
        "timestamp": "2026-11-15T18:57:38Z",
        "disk_safety": {
            "free_gb_before": round(free_gb_before, 2),
            "free_gb_after": round(free_gb_after, 2),
            "purged_dirs_count": purged_dirs_count,
            "purged_bytes": purged_bytes,
            "purged_mb": round(purged_bytes / (1024 * 1024), 2)
        },
        "worktrees_summary": {
            "total_worktrees": len(enriched_worktrees),
            "clean_worktrees": clean_count,
            "dirty_worktrees": dirty_count
        },
        "worktrees": enriched_worktrees
    }

    manifest_path = repo_path / "docs" / "engine" / "research" / "2026-11-15" / "worktree_consolidation_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("=== WORKTREE & DISK SAFETY AUDIT SUMMARY ===")
    print(f"C: Free GB Before: {free_gb_before:.2f} GB")
    print(f"C: Free GB After:  {free_gb_after:.2f} GB")
    print(f"Purged Dirs: {purged_dirs_count} ({purged_bytes / (1024*1024):.2f} MB)")
    print(f"Total Worktrees: {len(enriched_worktrees)} (Clean: {clean_count}, Dirty: {dirty_count})")
    print(f"Manifest written to: {manifest_path}")

if __name__ == "__main__":
    main()
