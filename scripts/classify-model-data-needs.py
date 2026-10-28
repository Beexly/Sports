"""Classify the 196 disabled model modules by whether their input data exists.

Every disabled module exports bespoke functions whose parameters are typed with
module-specific structures (TrackPoint, SimState, MotionFrame, PpoStep...). There
is no shared interface, so "wiring a module" means manufacturing the specific
input structure that module wants.

This script buckets each module by the kind of input it requires and whether the
repository actually contains data that can produce that input. The point is to
separate modules that can be wired today from modules that would require inventing
data or inventing an upstream model.

Tiers:
  TIER_A_GAME_LEVEL   needs only settled game outcomes / box-score-like inputs,
                      which data/gse-dataset/games.jsonl and
                      data/nflverse/games_harness_rows.jsonl can supply.
  TIER_B_SLATE_LEVEL   needs week-3 slate context (injuries, snap counts, depth
                      charts, drive starts, situational, NGS pace) which exists
                      for week 3 only in data/gse-dataset/current/.
  TIER_C_TRACKING     needs player-tracking or motion data (TrackPoint,
                      MotionFrame, TrajectoryStep) which is NOT in the repo.
  TIER_D_MODEL_ARTIFACT needs an upstream model's output (embeddings, LLM text,
                      trained weights, adapter blocks) which is NOT in the repo.
  TIER_E_UNKNOWN      input type could not be classified from the signature.

Usage:
    python scripts/classify-model-data-needs.py [--json PATH]
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "packages" / "prediction-engine" / "src"

# Keyword buckets applied to the set of type tokens a module requires.
BUCKETS = [
    ("TIER_C_TRACKING", [
        "Track", "Trajectory", "Motion", "Frame", "Player", "Position", "Kinematic",
        "Pose", "Velocity", "Acceleration", "Route", "Coverage", "Separation",
        "Ball", "Air", "Punt", "Kick", "Return", "Snap", "Block",
    ]),
    ("TIER_D_MODEL_ARTIFACT", [
        "Embedding", "Adapter", "Backbone", "Llm", "LLM", "Transformer", "Token",
        "Latent", "Weight", "Parameter", "Gradient", "Policy", "Reward", "Logit",
        "Attention", "Vector", "Prototype", "Prompt", "Completion", "Inference",
    ]),
    ("TIER_B_SLATE_LEVEL", [
        "Injury", "Depth", "Chart", "Drive", "Situational", "Pace", "Ngs",
        "Lineup", "Slate", "Odds", "Market", "Prop", "Salary", "Contest",
        "Calibration", "Environment", "Weather", "Wind", "Rest", "Schedule",
    ]),
    ("TIER_A_GAME_LEVEL", [
        "Game", "Score", "Margin", "Total", "Spread", "Result", "Team", "Win",
        "Opponent", "Season", "Week", "Epa", "Success", "Play", "Down",
        "Distance", "Quarter", "Half", "Drive",
    ]),
]


def _rel(p: Path) -> str:
    return os.path.relpath(p, SRC).replace(os.sep, "/")


def _required_types(txt: str) -> set[str]:
    """Collect capitalised type tokens appearing in exported function params."""
    found: set[str] = set()
    for params in re.findall(r"^export (?:async )?function \w+\s*\((.*?)\)\s*:", txt, re.M | re.S):
        for tok in re.findall(r"[A-Z][A-Za-z0-9_]*(?=\[\]|\s*\||,|$|\s*=|\s*\)|\s*:)", params):
            found.add(tok)
        # also catch "readonly Foo[]" and "Foo<Bar>"
        for tok in re.findall(r"readonly\s+([A-Z][A-Za-z0-9_]*)", params):
            found.add(tok)
    return found


def _classify(types: set[str]) -> str:
    for tier, keywords in BUCKETS:
        for kw in keywords:
            for t in types:
                if kw.lower() in t.lower():
                    return tier
    if not types:
        return "TIER_A_GAME_LEVEL"
    return "TIER_E_UNKNOWN"


def _available_data() -> dict[str, str]:
    """What the repo actually has, with row counts."""
    out = {}
    candidates = [
        REPO / "data" / "gse-dataset" / "games.jsonl",
        REPO / "data" / "nflverse" / "games_harness_rows.jsonl",
        REPO / "data" / "gse-dataset" / "current" / "injuries_2026.csv",
        REPO / "data" / "gse-dataset" / "current" / "snap_counts_2026.csv",
        REPO / "data" / "gse-dataset" / "current" / "depth_charts_2026.csv",
    ]
    for p in candidates:
        if p.exists():
            try:
                n = sum(1 for _ in p.open(encoding="utf-8", errors="ignore"))
                out[_rel(p) if p.is_relative_to(SRC) else str(p.relative_to(REPO)).replace(os.sep, "/")] = f"{n} rows"
            except OSError:
                pass
    # week3 jsonl set
    w3 = REPO / "data" / "gse-dataset" / "current"
    if w3.exists():
        files = sorted(p.name for p in w3.glob("week3-*.jsonl"))
        out["data/gse-dataset/current/week3-*.jsonl"] = f"{len(files)} files"
    return out


def build() -> dict:
    mods = []
    for p in SRC.rglob("*.ts"):
        if ".test." in p.name or "node_modules" in p.parts or p.name == "index.ts":
            continue
        txt = p.read_text(encoding="utf-8", errors="ignore")
        if "ENABLED = false" in txt:
            mods.append(p)

    rows = []
    for m in mods:
        txt = m.read_text(encoding="utf-8", errors="ignore")
        types = _required_types(txt)
        tier = _classify(types)
        exports = re.findall(r"^export (?:async )?function (\w+)", txt, re.M)
        rows.append({
            "module": _rel(m),
            "lines": txt.count("\n") + 1,
            "tier": tier,
            "exports": exports,
            "required_types": sorted(types),
            "has_test": m.with_suffix(".test.ts").exists(),
        })

    by_tier = defaultdict(list)
    for r in rows:
        by_tier[r["tier"]].append(r["module"])

    counts = Counter(r["tier"] for r in rows)
    return {
        "generated": "2026-10-27",
        "branch": "engine/public-baseline-2026-10-24",
        "total_modules": len(rows),
        "tier_counts": dict(sorted(counts.items())),
        "available_data": _available_data(),
        "tier_meaning": {
            "TIER_A_GAME_LEVEL": "needs settled game outcomes; data present",
            "TIER_B_SLATE_LEVEL": "needs week-3 slate context; present for week 3 only",
            "TIER_C_TRACKING": "needs player-tracking/motion data; ABSENT from repo",
            "TIER_D_MODEL_ARTIFACT": "needs upstream model output/weights; ABSENT from repo",
            "TIER_E_UNKNOWN": "input type not classifiable from signature",
        },
        "tiers": {k: sorted(v) for k, v in sorted(by_tier.items())},
        "modules": rows,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", default=str(REPO / "artifacts" / "model-data-needs-2026-10-27.json"))
    args = ap.parse_args()
    data = build()
    Path(args.json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.json).write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"total_modules={data['total_modules']}")
    for tier, n in data["tier_counts"].items():
        print(f"  {tier:26s} {n:4d}  {data['tier_meaning'].get(tier, '')}")
    print(f"wrote {args.json}")


if __name__ == "__main__":
    main()
