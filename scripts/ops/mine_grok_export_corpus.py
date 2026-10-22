#!/usr/bin/env python3
"""Index the Grok export zip. Does not extract auth, billing, or asset bytes."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from collections import Counter
from pathlib import Path

ZIP_PATH = Path(r"C:/Users/Garrett/Downloads/6ecc171c-d711-47ae-9421-43a2266d7894.zip")
OUT = Path(__file__).resolve().parents[2] / "docs" / "engine" / "research" / "2026-10-21" / "GROK-EXPORT-CORPUS-INDEX-2026-10-21.md"
REFUSED_PARTS = ("prod-mc-auth", "prod-mc-billing", "credential", "secret")


def index_zip(path: Path) -> dict:
    if not path.is_file():
        return {"error": "missing", "path": str(path)}
    with zipfile.ZipFile(path) as zf:
        infos = zf.infolist()
        ext = Counter()
        refused = 0
        refused_bytes = 0
        other_bytes = 0
        for info in infos:
            low = info.filename.lower()
            suffix = Path(info.filename).suffix.lower() or "(none)"
            ext[suffix] += 1
            if any(part in low for part in REFUSED_PARTS):
                refused += 1
                refused_bytes += info.file_size
            else:
                other_bytes += info.file_size
        return {
            "path": str(path),
            "zip_bytes": path.stat().st_size,
            "entries": len(infos),
            "extensions": dict(ext),
            "refused_entries": refused,
            "refused_uncompressed_bytes": refused_bytes,
            "other_uncompressed_bytes": other_bytes,
            "extracted": False,
            "note": "Auth, billing, and asset bytes were not extracted or committed.",
        }


def render(payload: dict) -> str:
    return (
        "# Grok export corpus index 2026-10-21\n\n"
        "Measured from the zip central directory. No conversation bodies, auth, billing, or asset bytes were extracted.\n\n"
        "```json\n"
        + json.dumps(payload, indent=2)
        + "\n```\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    payload = index_zip(ZIP_PATH)
    if args.verify:
        if not OUT.is_file():
            print("VERIFY FAIL: index missing")
            return 1
        text = OUT.read_text(encoding="utf-8")
        if "error" in payload:
            print(f"VERIFY FAIL: {payload['error']}")
            return 1
        if f'"entries": {payload["entries"]}' not in text:
            print("VERIFY FAIL: entry count drift")
            return 1
        if "prod-mc-auth" in text and "sk-" in text:
            print("VERIFY FAIL: secret-looking content in index")
            return 1
        print(f"VERIFY OK entries={payload['entries']}")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render(payload), encoding="utf-8", newline="\n")
    print(f"wrote {OUT} entries={payload.get('entries')}")
    return 0 if "error" not in payload else 1


if __name__ == "__main__":
    sys.exit(main())
