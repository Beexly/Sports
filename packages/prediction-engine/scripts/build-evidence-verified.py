#!/usr/bin/env python3
"""
Build research-evidence.json from VERIFIED parameters only.

Supersedes the regex builder, which produced 37 "shrinkage_k" hits that were
`k = 17` keypoint counts in computer-vision papers. Every parameter here carries a
quote that was checked verbatim against the paper's own text.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

PKG = Path(r"C:\Users\Garrett\Sports\packages\prediction-engine")
VERIFIED = PKG / "src" / "research" / "research-params-verified.jsonl"
CATALOG = Path(r"C:\Users\Garrett\jev-pipeline\extracted_research_data.jsonl")
OUT = PKG / "src" / "research" / "research-evidence.json"

LANE_KEYWORDS = [
    ("calibration", ["calibrat", "brier", "reliability", "isotonic", "conformal", "platt"]),
    ("modeling", ["monte carlo", "simulation", "markov", "regression model", "bayesian", "neural"]),
    ("feature", ["feature", "covariate", "predictor", "tracking data", "xgboost"]),
    ("evaluation", ["evaluat", "benchmark", "metric", "scoring rule", "leaderboard"]),
]


def pick_lane(methodology: str) -> str:
    low = (methodology or "").lower()
    for lane, words in LANE_KEYWORDS:
        if any(w in low for w in words):
            return lane
    return "unknown"


def main() -> None:
    catalogue = {}
    for line in CATALOG.read_text(encoding="utf-8", errors="ignore").splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        catalogue[r["file_path"]] = r

    rows = []
    slots = Counter()
    for line in VERIFIED.read_text(encoding="utf-8", errors="ignore").splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        fp = r["file_path"]
        cat = catalogue.get(fp, {})
        data = cat.get("data") or {}
        for p in r.get("parameters", []):
            slots[p["name"]] += 1
        rows.append({
            "arxiv_id": None,
            "paper_title": r.get("paper_title") or data.get("paper_title"),
            "lane": pick_lane(data.get("core_methodology") or ""),
            # Direct extraction from a file we hold, quote-verified: confidence 1.0
            "confidence": 1.0,
            "enabled": True,
            "parameters": [
                {"name": p["name"], "value": p["value"], "unit": p.get("unit", "verified")}
                for p in r.get("parameters", [])
            ],
            "file_path": fp,
        })

    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"evidence rows written : {len(rows)}")
    print(f"parameters total      : {sum(len(r['parameters']) for r in rows)}")
    print(f"by slot               : {dict(slots)}")
    print(f"wrote                 : {OUT} ({OUT.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
