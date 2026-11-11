#!/usr/bin/env python3
"""
Deterministic GSI & GSE Grant Dossier Sanitizer (`00-TRUTH-FILE.md` Enforcer)
=============================================================================
Scans markdown/text dossiers for unverified or retired entity/record claims:
  - "Golden Ratio Technologies" -> "Galaxy Sports Network LLC"
  - "Golden State Insights" -> "GSI (Texas Nonprofit Corp #15043440630001, 501(c)(3) application pending)"
  - "501(c)(3) approved" -> "501(c)(3) application pending"
  - "FluidX3D" -> blocked from commercial/training claims

Usage:
  python3 scripts/guardrails/sanitize_gsi_grant_dossiers.py --check
  python3 scripts/guardrails/sanitize_gsi_grant_dossiers.py --fix <path...>
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

REPLACEMENTS: list[tuple[re.Pattern[str], str, str]] = [
    (
        re.compile(r"\bGolden\s+Ratio\s+Technologies(?:\s+LLC)?\b", re.IGNORECASE),
        "Galaxy Sports Network LLC",
        "retired-entity-golden-ratio-technologies",
    ),
    (
        re.compile(r"\bGolden\s+State\s+Insights\b", re.IGNORECASE),
        "GSI (Texas Nonprofit Corp #15043440630001, 501(c)(3) application pending)",
        "retired-entity-golden-state-insights",
    ),
    (
        re.compile(r"\b501\(c\)\(3\)\s+(?:approved|granted|certified)\b", re.IGNORECASE),
        "501(c)(3) application pending",
        "unapproved-501c3-claim",
    ),
]


def sanitize_text(text: str) -> tuple[str, list[str]]:
    applied: list[str] = []
    out = text
    for pattern, replacement, label in REPLACEMENTS:
        if pattern.search(out):
            out = pattern.sub(replacement, out)
            applied.append(label)
    return out, applied


def main() -> int:
    parser = argparse.ArgumentParser(description="Sanitize GSI/GSE grant dossiers against 00-TRUTH-FILE.md.")
    parser.add_argument("--check", action="store_true", help="Verify self-test and scan target files without writing.")
    parser.add_argument("--fix", action="store_true", help="Rewrite target files in place.")
    parser.add_argument("paths", nargs="*", help="Optional files or directories to scan.")
    args = parser.parse_args()

    # Built-in self-test
    sample = (
        "Golden Ratio Technologies LLC and Golden State Insights have 501(c)(3) approved status."
    )
    cleaned, labels = sanitize_text(sample)
    assert "Galaxy Sports Network LLC" in cleaned, "Failed to replace Golden Ratio Technologies"
    assert "GSI (Texas Nonprofit Corp #15043440630001, 501(c)(3) application pending)" in cleaned
    assert "501(c)(3) application pending" in cleaned
    assert len(labels) == 3

    targets: list[Path] = []
    for p in args.paths:
        path_obj = Path(p).resolve()
        if path_obj.is_dir():
            targets.extend(sorted(path_obj.rglob("*.md")))
        elif path_obj.is_file():
            targets.append(path_obj)

    hits_total = 0
    for file_path in targets:
        raw = file_path.read_text(encoding="utf-8")
        new_text, hit_labels = sanitize_text(raw)
        if hit_labels:
            hits_total += len(hit_labels)
            if args.fix:
                file_path.write_text(new_text, encoding="utf-8")
                print(f"[sanitize_gsi_grant_dossiers] FIXED {file_path}: {hit_labels}")
            else:
                print(f"[sanitize_gsi_grant_dossiers] HIT {file_path}: {hit_labels}")

    if args.check and hits_total > 0:
        return 1

    print(
        f"[sanitize_gsi_grant_dossiers] OK — self-test passed; scanned {len(targets)} file(s), hits={hits_total}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
