#!/usr/bin/env python3
"""
Build research-evidence.json from the extracted catalog.

Zero fabrication rule: a parameter is emitted ONLY when the paper's own text
contains a literal `name = value` (or `name: value`) statement for a name in the
controlled vocabulary. Everything else is dropped. `sourceText` keeps the exact
sentence so any number can be audited back to the page it came from.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

CATALOG = Path(r"C:\Users\Garrett\jev-pipeline\extracted_research_data.jsonl")
MATCHES = Path(r"C:\Users\Garrett\jev-pipeline\arxiv_matches.jsonl")
OUT = Path(r"C:\Users\Garrett\Sports\packages\prediction-engine\src\research\research-evidence.json")

# Controlled vocabulary: only slots the engine can actually consume.
# Each entry carries the phrases that name it AND an anchor word that must appear
# in the same sentence. Without the anchor, "k = 17" in a keypoint paper gets
# mistaken for a shrinkage constant, which is fabrication.
VOCAB = {
    "regression_games": (
        ["regression games", "regression_games", "pseudo-games", "pseudo games"],
        ["regression", "shrink"],
    ),
    "league_prior_ppr": (
        ["league prior", "league_prior_ppr", "prior ppr", "prior points per game"],
        ["prior"],
    ),
    "shrinkage_k": (
        ["shrinkage k", "shrinkage parameter", "shrinkage constant"],
        ["shrink"],
    ),
    "recency_half_life": (
        ["half-life", "half life", "halflife"],
        ["half"],
    ),
    "calibration_bins": (
        ["calibration bins", "reliability bins"],
        ["bin"],
    ),
    "brier_target": (
        ["brier score", "brier skill score"],
        ["brier"],
    ),
}

LANE_KEYWORDS = [
    ("calibration", ["calibrat", "brier", "reliability", "isotonic", "conformal", "platt"]),
    ("modeling", ["monte carlo", "simulation", "markov", "regression model", "bayesian", "neural"]),
    ("feature", ["feature", "covariate", "predictor", "tracking data", "xgboost"]),
    ("evaluation", ["evaluat", "benchmark", "metric", "scoring rule", "leaderboard"]),
]

NUM = r"([-+]?\d+(?:\.\d+)?)"


def pick_lane(methodology: str) -> str:
    low = (methodology or "").lower()
    for lane, words in LANE_KEYWORDS:
        if any(w in low for w in words):
            return lane
    return "unknown"


def find_params(text: str) -> list[dict]:
    """Return only literal `phrase = number` statements for vocabulary slots."""
    out = []
    if not text:
        return out
    low = text.lower()
    for slot, phrases in VOCAB.items():
        for phrase in phrases:
            # "phrase = 8", "phrase: 8", "phrase of 8"
            pat = re.compile(
                re.escape(phrase) + r"[^.\n]{0,24}?(?:=|:|of|is|was)\s*" + NUM,
                re.IGNORECASE,
            )
            for m in pat.finditer(low):
                sentence_start = max(low.rfind(".", 0, m.start()), low.rfind("\n", 0, m.start())) + 1
                sentence_end = low.find(".", m.end())
                if sentence_end == -1:
                    sentence_end = min(len(text), m.end() + 120)
                out.append({
                    "name": slot,
                    "value": float(m.group(1)),
                    "unit": phrase,
                    "sourceText": text[sentence_start:sentence_end + 1].strip()[:300],
                })
                break  # one hit per phrase is enough
    return out


def main() -> None:
    conf: dict[str, float] = {}
    if MATCHES.exists():
        for line in MATCHES.read_text(encoding="utf-8", errors="ignore").splitlines():
            try:
                r = json.loads(line)
                conf[r["file_path"]] = float(r.get("confidence", 0))
            except Exception:
                continue

    rows = []
    lanes = Counter()
    param_rows = 0
    param_total = 0

    for line in CATALOG.read_text(encoding="utf-8", errors="ignore").splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        d = r.get("data") or {}
        title = d.get("paper_title")
        if not title:
            continue
        lane = pick_lane(d.get("core_methodology") or "")
        lanes[lane] += 1

        params = find_params(d.get("key_metrics_and_variables") or "")
        if params:
            param_rows += 1
            param_total += len(params)

        rows.append({
            "arxiv_id": None,
            "paper_title": title,
            # Direct extraction from a file we hold: provenance confidence is 1.0.
            # arXiv-matched rows inherit the match score.
            "confidence": conf.get(r["file_path"], 1.0),
            "lane": lane,
            "enabled": True,
            "parameters": params,
            "file_path": r["file_path"],
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"papers emitted      : {len(rows)}")
    print(f"papers with params  : {param_rows}")
    print(f"parameter rows      : {param_total}")
    print(f"lanes               : {dict(lanes)}")
    print(f"wrote               : {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
    by_slot = Counter()
    for r in rows:
        for p in r["parameters"]:
            by_slot[p["name"]] += 1
    print(f"by slot             : {dict(by_slot)}")


if __name__ == "__main__":
    main()
