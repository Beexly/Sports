"""A committed data file without a sibling manifest is a fixture."""
from __future__ import annotations

import json
import os
import subprocess
import sys

REQUIRED = ("source", "producer", "sha256", "bytes", "rows", "date_range", "license", "point_in_time", "host", "commit")
DATA_EXT = {".csv", ".parquet", ".json"}


def staged_data_files(root: str) -> list[str]:
    out = subprocess.run(["git", "diff", "--cached", "--name-only", "--diff-filter=A"], cwd=root, capture_output=True, text=True)
    files = []
    for line in out.stdout.splitlines():
        ext = os.path.splitext(line)[1].lower()
        if ext in DATA_EXT and "manifest" not in os.path.basename(line):
            files.append(line)
    return files


def missing_manifest(root: str, rel: str) -> str | None:
    base, ext = os.path.splitext(rel)
    sibling = base + ".manifest.json"
    path = os.path.join(root, sibling)
    if not os.path.exists(path):
        return f"{rel}: no {sibling}"
    man = json.load(open(path, encoding="utf-8"))
    missing = [k for k in REQUIRED if k not in man]
    if missing:
        return f"{sibling}: missing {missing}"
    return None


def main() -> None:
    root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    errors = [e for rel in staged_data_files(root) if (e := missing_manifest(root, rel))]
    if errors:
        raise SystemExit("MANIFEST FAIL\n" + "\n".join(errors))
    print("manifest check OK")


if __name__ == "__main__":
    main()
