#!/usr/bin/env python3
"""One-cycle supervisor. Does not spawn hermes.exe.

hermes -z one-shot mode has hung on alias/lockfile resolution, and spawning
another Hermes from inside Hermes would recurse. This supervisor harvest-verifies,
secret-scans the salvage, and runs the stream tests that exist. It does not
invent a green result for tests that were not written.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / "docs" / "ops" / "HERMES-OVERNIGHT-RUN-LEDGER-2026-10-21.md"


def run(cmd: list[str]) -> tuple[int, str]:
    if cmd and cmd[0] == "python":
        cmd = [sys.executable, *cmd[1:]]
    proc = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
    tail = (proc.stdout + "\n" + proc.stderr).strip()
    return proc.returncode, tail[-2000:]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test-one-cycle", action="store_true")
    args = parser.parse_args()
    if not args.self_test_one_cycle:
        print("refusing unbounded run; pass --self-test-one-cycle")
        return 2
    steps = [
        ["python", "scripts/ops/harvest_hermes_workspaces.py", "--verify"],
        ["python", "scripts/ops/mine_grok_export_corpus.py", "--verify"],
        ["python", "scripts/ops/scan_sensitive.py", "--self-test"],
        ["python", "-m", "pytest", "intelligence/tests/test_pinhole_jacobian_and_bdb2027.py", "-q"],
    ]
    results = []
    failed = 0
    for cmd in steps:
        code, tail = run(cmd)
        results.append((cmd, code, tail))
        print(f"exit={code} {' '.join(cmd)}")
        if code != 0:
            failed += 1
            print(tail)
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [f"\n## {stamp} self-test-one-cycle", "", f"failed_steps={failed}", ""]
    for cmd, code, _tail in results:
        lines.append(f"- exit {code}: `{' '.join(cmd)}`")
    lines.append("")
    lines.append("hermes.exe was not spawned. Unbounded overnight mode is refused.")
    prev = LEDGER.read_text(encoding="utf-8") if LEDGER.is_file() else "# Hermes overnight run ledger 2026-10-21\n"
    LEDGER.write_text(prev.rstrip() + "\n" + "\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
