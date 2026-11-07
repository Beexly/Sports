#!/usr/bin/env python3
"""
Seeded 25-Item End-to-End Spot-Check Verifier (Part 6 of AGY Overnight Total Wiring Master Order).
Selects 25 random items per wave using a logged RNG seed and independently re-derives / traces
every item from raw sources. Any single failure fails the wave gate.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
WIRING_DIR = REPO_ROOT / "docs" / "wiring"
SPOT_LEDGER_PATH = WIRING_DIR / "SPOT-CHECKS-LEDGER.md"


def run_git(args: List[str]) -> str:
    proc = subprocess.run(
        ["git"] + args,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return proc.stdout.strip()


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(131072), b""):
            h.update(chunk)
    return h.hexdigest()


def spot_check_wave_1(seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    branch_csv = WIRING_DIR / "BRANCH-CENSUS.csv"
    corpus_csv = WIRING_DIR / "CORPUS-CENSUS.csv"

    with branch_csv.open("r", encoding="utf-8") as f:
        branches = list(csv.DictReader(f))
    with corpus_csv.open("r", encoding="utf-8") as f:
        corpus = [r for r in csv.DictReader(f) if "#" not in r["location"] and not r["location"].startswith("drive://")]

    sampled_branches = rng.sample(branches, min(13, len(branches)))
    sampled_corpus = rng.sample(corpus, min(12, len(corpus)))

    results: List[Dict[str, Any]] = []
    for idx, b in enumerate(sampled_branches, 1):
        actual_sha = run_git(["rev-parse", b["remote_ref"]])
        lr = run_git(["rev-list", "--left-right", "--count", f"origin/main...{b['remote_ref']}"]).split()
        actual_behind, actual_ahead = (int(lr[0]), int(lr[1])) if len(lr) == 2 else (-1, -1)
        passed = (
            actual_sha == b["head_sha"]
            and actual_ahead == int(b["ahead_vs_main"])
            and actual_behind == int(b["behind_vs_main"])
        )
        results.append(
            {
                "check_num": idx,
                "kind": "branch_census",
                "target": b["remote_ref"],
                "expected": f"sha={b['head_sha'][:10]} ahead={b['ahead_vs_main']} behind={b['behind_vs_main']}",
                "observed": f"sha={actual_sha[:10]} ahead={actual_ahead} behind={actual_behind}",
                "status": "PASS" if passed else "FAIL",
            }
        )

    for idx, c in enumerate(sampled_corpus, len(sampled_branches) + 1):
        loc = c["location"]
        p = Path(loc) if Path(loc).is_absolute() else (REPO_ROOT / loc)
        exists = p.exists() and p.is_file()
        actual_sha = sha256_file(p) if exists else "MISSING"
        actual_sz = p.stat().st_size if exists else -1
        passed = exists and actual_sha == c["sha256"] and actual_sz == int(c["size_bytes"])
        results.append(
            {
                "check_num": idx,
                "kind": "corpus_census",
                "target": loc,
                "expected": f"sha={c['sha256'][:10]} bytes={c['size_bytes']}",
                "observed": f"sha={actual_sha[:10]} bytes={actual_sz}",
                "status": "PASS" if passed else "FAIL",
            }
        )

    return results


def append_spot_ledger(wave: str, seed: int, checks: List[Dict[str, Any]]) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    passed = sum(1 for c in checks if c["status"] == "PASS")
    if not SPOT_LEDGER_PATH.exists():
        header = (
            "# 25-ITEM SEEDED SPOT-CHECK LEDGER (`docs/wiring/SPOT-CHECKS-LEDGER.md`)\n\n"
            "End-to-end independent re-derivation of 25 randomly sampled items per wave (Part 6).\n\n"
        )
    else:
        header = SPOT_LEDGER_PATH.read_text(encoding="utf-8")

    lines = [
        f"## {wave} — Seed `{seed}` — `{ts}` (`{passed}/{len(checks)}` PASS)\n",
        "| # | Kind | Target | Expected (Ledger) | Observed (Raw Source) | Verdict |",
        "|---:|---|---|---|---|---|",
    ]
    for c in checks:
        lines.append(
            f"| {c['check_num']} | `{c['kind']}` | `{c['target']}` | `{c['expected']}` | `{c['observed']}` | **{c['status']}** |"
        )
    lines.append("\n")
    SPOT_LEDGER_PATH.write_text(header + "\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wave", default="WAVE_1", help="Wave identifier")
    parser.add_argument("--seed", type=int, default=2026110701, help="Deterministic RNG seed")
    args = parser.parse_args()

    checks = spot_check_wave_1(args.seed)
    append_spot_ledger(args.wave, args.seed, checks)
    passed = sum(1 for c in checks if c["status"] == "PASS")
    print(json.dumps({"wave": args.wave, "seed": args.seed, "passed": passed, "total": len(checks)}, indent=2))
    if passed != len(checks):
        sys.exit(1)


if __name__ == "__main__":
    main()
