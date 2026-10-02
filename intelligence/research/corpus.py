"""Load the 2026-10-02 10:00-13:35 arXiv window and refuse to weight it.

The file is the abstracts as returned by the arXiv API that morning.
A slot is a keyword hit on title plus abstract. It is not a claim that
the paper validates a GSE number. weight() withholds every id.
"""
from __future__ import annotations

import json
import os
from typing import Any

WINDOW = "2026-10-02T10:00-13:35"
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "arxiv_2026-10-02_1000-1335.json")

# Keyword hits only. Order is the order a paper is tagged.
SLOT_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("in_game_win_probability", ("win probability", "in-game")),
    ("staking", ("kelly", "portfolio", "cvar", "bankroll")),
    ("conformal", ("conformal", "enbpi", "prediction interval")),
    ("calibration", ("calibration", "brier", "expected calibration")),
    ("ranking", ("bradley-terry", "ranking", "listwise")),
    ("combining", ("ensemble", "forecast combination", "crps")),
    ("weather", ("weather", "precipitation", "wind speed")),
    ("tactics", ("expected goals", "vaep", "formation", "tactical")),
    ("vision", ("video", "tracking", "pose estimation", "camera")),
    ("causal", ("causal", "counterfactual")),
)

# Code that already exists, and what this window does NOT license us to say.
BINDINGS: dict[str, dict[str, str]] = {
    "1704.00197": {
        "module": "research.iwinrnfl_ratings",
        "status": "margin_only",
        "claim": "Least-squares margin is loaded. Table 1 win probability is refused. Sigma 14 is the paper's statement, not a fitted weight.",
    },
    "1601.04302": {
        "module": "research.footballonomics",
        "status": "benefit_only",
        "claim": "Fourth-down benefit equation loads. Net benefit is refused until delta_pi is measured. Not a go-for-it call.",
    },
    "2604.08885": {
        "module": "staking.screening",
        "status": "not_run",
        "claim": "KellyBench was not run on this book. The fixture screen is not that benchmark.",
    },
    "2607.00164": {
        "module": "reasoning_engine.facets",
        "status": "method_only",
        "claim": "H-VAEP is a handball method. It is not an NFL EPA number.",
    },
    "2606.23598": {
        "module": "trust.enbpi",
        "status": "intervals_required",
        "claim": "EnbPI coverage is not claimed. No interval file was checked for this trace.",
    },
}


def base_id(arxiv_id: str) -> str:
    head, sep, tail = arxiv_id.rpartition("v")
    if sep and head and tail.isdigit():
        return head
    return arxiv_id


class Withheld(Exception):
    def __init__(self, paper_id: str) -> None:
        self.paper_id = paper_id
        super().__init__(f"{paper_id}: abstract is not a fitted weight")


def load(path: str = DATA) -> list[dict[str, Any]]:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    rows = json.load(open(path, encoding="utf-8"))
    if not isinstance(rows, list) or not rows:
        raise ValueError("paper window is empty")
    return rows


def slots_for(row: dict[str, Any]) -> list[str]:
    text = f"{row.get('title', '')} {row.get('summary', '')}".lower()
    found = [name for name, keys in SLOT_RULES if any(key in text for key in keys)]
    return found or ["indexed_unslotted"]


def index(path: str = DATA) -> list[dict[str, Any]]:
    out = []
    for row in load(path):
        out.append({
            "id": base_id(row["id"]),
            "arxiv_id": row["id"],
            "title": row.get("title", ""),
            "slots": slots_for(row),
            "weight": None,
            "weight_status": "withheld",
        })
    return out


def weight(paper_id: str) -> float:
    """Every id in this window is withheld. There is no silent 0.5."""
    raise Withheld(paper_id)


def binding(paper_id: str) -> dict[str, str] | None:
    return BINDINGS.get(paper_id)


def cite(paper_id: str, path: str = DATA) -> dict[str, Any]:
    wanted = base_id(paper_id)
    for row in load(path):
        if base_id(row["id"]) == wanted:
            return {
                "id": wanted,
                "arxiv_id": row["id"],
                "title": row.get("title", ""),
                "slots": slots_for(row),
                "binding": binding(wanted),
                "weight": None,
            }
    raise KeyError(paper_id)
