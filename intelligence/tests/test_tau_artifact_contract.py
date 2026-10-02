"""The served tau table is the file on disk, not a story about the file.

Pins the manifest against the CSV so a refit that changes the bytes, the row
count, or the fallback mix cannot land silently. Does not fit anything and
does not call a model.
"""
import csv
import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "coaching", "data")


def test_tau_csv_matches_manifest():
    manifest = json.load(open(os.path.join(DATA, "tau_hat.manifest.json"), encoding="utf-8"))
    raw = open(os.path.join(DATA, "tau_hat.csv"), "rb").read()
    assert hashlib.sha256(raw).hexdigest() == manifest["sha256"]
    rows = list(csv.DictReader(raw.decode("utf-8").splitlines()))
    assert len(rows) == manifest["rows"] == 1523
    assert manifest["point_in_time"] is False
    levels = {}
    for r in rows:
        levels[r["fallback_level"]] = levels.get(r["fallback_level"], 0) + 1
    assert levels == manifest["fallback_level_counts"]
    # A unit cell is a measurement. A prior cell is not. Both must stay labeled.
    assert levels["unit"] == 55
    assert manifest["source_license"].startswith("nflverse/nflverse-data")
    assert manifest["point_in_time"] is False
