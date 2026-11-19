#!/usr/bin/env python3
"""CI and pre-deploy guard ensuring apps/web/public contains zero vault or data leaks.

Scans every file under `--public-dir` (default: `apps/web/public/`) and fails
non-zero if any forbidden extension (`.csv`, `.jsonl`, `.parquet`, `.env`, etc.)
or sensitive path/filename token (`vault`, `signal`, `equation`, `mind_staging`,
`secret`, `credential`, `private_key`) appears outside the explicit static visual
media allowlist in `apps/web/public/immersive/`.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

DEFAULT_PUBLIC_DIR = REPO_ROOT / "apps" / "web" / "public"

BANNED_EXTENSIONS = frozenset(
    {
        ".csv",
        ".jsonl",
        ".parquet",
        ".pkl",
        ".npy",
        ".npz",
        ".sqlite",
        ".db",
        ".tsv",
        ".env",
    }
)

BANNED_TOKENS = (
    "vault",
    "signal",
    "equation",
    "vip-vault",
    "mind_staging",
    "secret",
    "credential",
    "private_key",
)

# Exact static media brand plates stored under apps/web/public/immersive/
ALLOWLISTED_BRAND_MEDIA_RELPATHS = frozenset(
    {
        "immersive/intelligence-deepsignal.webp",
        "immersive/signal-room-hero-a.webp",
        "immersive/signal-room-hero-b.webp",
        "immersive/signal-room-hero.mp4",
        "immersive/signal-room-schematic.webp",
        "immersive/signal-room-vertical.webp",
    }
)


def scan_public_root(public_dir: Path = DEFAULT_PUBLIC_DIR) -> dict[str, Any]:
    """Scan public_dir recursively for forbidden extensions or sensitive tokens."""
    if not public_dir.is_dir():
        raise FileNotFoundError(f"Public directory does not exist: {public_dir}")

    files_scanned = 0
    violations: list[dict[str, str]] = []

    for fpath in sorted(public_dir.rglob("*")):
        if not fpath.is_file():
            continue
        files_scanned += 1
        rel = fpath.relative_to(public_dir).as_posix()
        low_rel = rel.lower()
        name_low = fpath.name.lower()
        suffix_low = fpath.suffix.lower()

        reasons: list[str] = []
        if suffix_low in BANNED_EXTENSIONS or name_low == ".env" or name_low.startswith(".env."):
            reasons.append(f"banned_extension:{suffix_low or name_low}")

        if rel not in ALLOWLISTED_BRAND_MEDIA_RELPATHS:
            matched_tokens = [tok for tok in BANNED_TOKENS if tok in low_rel]
            if matched_tokens:
                reasons.append(f"banned_token:{','.join(matched_tokens)}")

        if reasons:
            violations.append(
                {
                    "relpath": rel,
                    "reasons": ";".join(reasons),
                }
            )

    return {
        "public_dir": public_dir.as_posix(),
        "files_scanned": files_scanned,
        "violation_count": len(violations),
        "violations": violations,
        "clean": len(violations) == 0,
    }


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Verify apps/web/public contains zero vault, CSV, JSONL, env, or signal leaks."
    )
    parser.add_argument(
        "--public-dir",
        type=Path,
        default=DEFAULT_PUBLIC_DIR,
        help="Public root directory to scan (default: apps/web/public).",
    )
    args = parser.parse_args(argv)
    report = scan_public_root(args.public_dir)
    print(json.dumps(report, indent=2))
    return 0 if report["clean"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
