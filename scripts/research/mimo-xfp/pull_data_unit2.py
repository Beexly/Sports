"""Pull nflverse play-by-play CSVs for MIMO Unit 2 (catchable vs raw air yards).

Attribution: Data via nflverse (nflverse-data), CC BY 4.0.
FTN charting via nflverse is CC BY-SA 4.0 ("FTN Data via nflverse").
"""

from __future__ import annotations

import hashlib
import json
import sys
import urllib.request
from pathlib import Path

NFLVERSE_BASE = "https://github.com/nflverse/nflverse-data/releases/download"
SEASONS = (2022, 2023, 2024, 2025)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        print(f"cached {dest} ({dest.stat().st_size} bytes)")
        return dest
    print(f"GET {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "gse-mimo-xfp-research/1.0"})
    with urllib.request.urlopen(req, timeout=300) as resp, dest.open("wb") as out:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")
    return dest


def main() -> int:
    data_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "data/mimo-xfp").resolve()
    manifest_path = data_dir / "manifest_unit2.json"
    manifest = {
        "attribution_nflverse": "Data via nflverse (nflverse-data), CC BY 4.0",
        "attribution_ftn": "FTN Data via nflverse, CC BY-SA 4.0",
        "assets": {},
    }
    for season in SEASONS:
        url = f"{NFLVERSE_BASE}/pbp/play_by_play_{season}.csv"
        path = download(url, data_dir / f"play_by_play_{season}.csv")
        manifest["assets"][f"pbp_{season}"] = {
            "url": url,
            "path": str(path),
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
        }
        ftn_url = f"{NFLVERSE_BASE}/ftn_charting/ftn_charting_{season}.csv"
        ftn_path = download(ftn_url, data_dir / f"ftn_charting_{season}.csv")
        manifest["assets"][f"ftn_{season}"] = {
            "url": ftn_url,
            "path": str(ftn_path),
            "bytes": ftn_path.stat().st_size,
            "sha256": sha256_file(ftn_path),
            "license": "CC BY-SA 4.0",
        }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"manifest {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
