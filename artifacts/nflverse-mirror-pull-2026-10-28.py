"""Pull FTN charting and PFR advanced stats from the nflverse release mirror.

No site scraping. Both come off nflverse-data GitHub release assets as parquet.
Records the fields present, the row counts and the attribution; does not interpret.
"""
import hashlib
import json
import subprocess
from pathlib import Path

import pandas as pd

BASE = "https://github.com/nflverse/nflverse-data/releases/download"
DEST = Path("C:/Users/Garrett/Sports/data/nflverse")
DEST.mkdir(parents=True, exist_ok=True)

ASSETS = [
    ("ftn_charting", "ftn_charting_2026.parquet"),
    ("pfr_advstats", "advstats_season_def.parquet"),
    ("pfr_advstats", "advstats_season_pass.parquet"),
    ("pfr_advstats", "advstats_season_rec.parquet"),
    ("pfr_advstats", "advstats_season_rush.parquet"),
]

out = {"ftn": {}, "pfr": {}, "attribution": {
    "ftn": "FTN Data via nflverse",
    "pfr": "Pro-Football-Reference via nflverse pfr_advstats mirror",
}}

for tag, name in ASSETS:
    url = f"{BASE}/{tag}/{name}"
    dest = DEST / name
    r = subprocess.run(["curl", "-sL", "--max-time", "180", "-o", str(dest), url],
                       capture_output=True, text=True)
    if not dest.exists() or dest.stat().st_size < 1000:
        print(f"FAIL {name}")
        continue
    sha = hashlib.sha256(dest.read_bytes()).hexdigest()
    df = pd.read_parquet(dest)
    rec = {"file": name, "rows": int(len(df)), "cols": int(df.shape[1]),
           "sha256": sha, "fields": list(df.columns)}
    bucket = "ftn" if tag == "ftn_charting" else "pfr"
    out[bucket][name] = rec
    print(f"{name}: {len(df)} rows, {df.shape[1]} cols, sha {sha[:12]}")

json.dump(out, open("C:/Users/Garrett/Sports/artifacts/nflverse-mirror-fields-2026-10-28.json", "w"), indent=1)
print("\nftn files:", len(out["ftn"]), "pfr files:", len(out["pfr"]))
