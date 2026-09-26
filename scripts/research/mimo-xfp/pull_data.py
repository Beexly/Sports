"""Pull free nflverse assets for MIMO Unit 1 (xFP / FPOE).

Attribution: Data via nflverse (nflverse-data), CC BY 4.0.
Read-only downloads. No database. No credentials.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

NFLVERSE_BASE = "https://github.com/nflverse/nflverse-data/releases/download"
ASSETS = {
    "player_stats": f"{NFLVERSE_BASE}/player_stats/player_stats.csv.gz",
    "players": f"{NFLVERSE_BASE}/players/players.csv",
}


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
    with urllib.request.urlopen(req, timeout=180) as resp, dest.open("wb") as out:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")
    return dest


def main() -> int:
    data_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/mimo-xfp")
    data_dir = data_dir.resolve()
    manifest = {"attribution": "Data via nflverse (nflverse-data), CC BY 4.0", "assets": {}}
    for name, url in ASSETS.items():
        filename = url.rsplit("/", 1)[-1]
        path = download(url, data_dir / filename)
        entry = {"url": url, "path": str(path), "bytes": path.stat().st_size, "sha256": sha256_file(path)}
        # sanity: gzip magic if .gz
        if path.suffix == ".gz" or path.name.endswith(".csv.gz"):
            with path.open("rb") as f:
                magic = f.read(2)
            if magic != b"\x1f\x8b":
                raise SystemExit(f"not gzip: {path} magic={magic!r}")
            # peek first decompressed bytes
            with gzip.open(path, "rb") as gz:
                head = gz.read(200)
            entry["decompressed_head"] = head.decode("utf-8", errors="replace")[:200]
        manifest["assets"][name] = entry
        print(f"OK {name}: {entry['bytes']} bytes sha256={entry['sha256'][:16]}...")
    man_path = data_dir / "manifest.json"
    man_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"manifest {man_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
