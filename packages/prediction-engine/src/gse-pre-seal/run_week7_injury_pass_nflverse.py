#!/usr/bin/env python3
"""
Week-7 injury_realloc pass against the REFRESHED nflverse week-7 table.

Reads data/gse-dataset/current/injuries_2026.csv (2,139 rows; 350 week-7 rows,
28 teams) and attaches injury_realloc to every week-7 slate game whose teams
have at least one week-7 injury row.

Evidence-only: writes docs/ops/week7-injury-pass-nflverse-2026-10-26.json and
does not write the candidate, so the candidate hash is unchanged.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from verify_engine import (  # noqa: E402
    SEAL_PATH,
    SLATE_PATH,
    assert_tau_sealed,
    candidate_hash,
    injury_realloc,
    load_candidate,
)

CSV_PATH = Path("C:/Users/Garrett/Sports/data/gse-dataset/current/injuries_2026.csv")
OUT_PATH = Path("C:/Users/Garrett/Sports/docs/ops/week7-injury-pass-nflverse-2026-10-26.json")

PLAYERS = ["QB1", "RB1", "WR1", "WR2", "TE1"]
PRE_SHARES = {"QB1": 0.35, "RB1": 0.20, "WR1": 0.20, "WR2": 0.15, "TE1": 0.10}
POST_SHARES = {"QB1": 0.0, "RB1": 0.30, "WR1": 0.28, "WR2": 0.24, "TE1": 0.18}
ROLE_OF = {"QB1": "QB1", "RB1": "RB1", "WR1": "WR1", "WR2": "WR2", "TE1": "TE1"}
COST = [[0.1 * abs(i - j) for j in range(5)] for i in range(5)]

# nflverse team abbreviations that differ from the slate.
def nflverse_code(team: str) -> str:
    return {"LAR": "LA"}.get(team, team)


def main() -> dict:
    cand = load_candidate()
    if cand is None:
        raise SystemExit("candidate baseline missing")
    parent = cand["parent_seal_hash"]
    hash_before = candidate_hash()

    with CSV_PATH.open(encoding="utf-8", errors="ignore") as f:
        week7 = [r for r in csv.DictReader(f) if r["week"] == "7"]

    by_team: dict[str, list[dict]] = {}
    for r in week7:
        by_team.setdefault(r["team"], []).append(r)

    slate = json.loads(SLATE_PATH.read_text())
    rows = []
    for g in slate["evaluatedGames"]:
        away, home = g["awayTeam"], g["homeTeam"]
        injuries = by_team.get(nflverse_code(away), []) + by_team.get(nflverse_code(home), [])
        if not injuries:
            continue
        env = injury_realloc(PRE_SHARES, POST_SHARES, ROLE_OF, COST, PLAYERS, parent)
        out = env["output"]
        rows.append({
            "game": g["matchup"],
            "week7_injury_rows": len(injuries),
            "players": [
                {
                    "team": r["team"],
                    "player": r["full_name"],
                    "position": r["position"],
                    "status": r.get("report_status") or "",
                    "injury": r.get("report_primary_injury") or "",
                }
                for r in injuries
            ],
            "injury_mass_loss": out["mass_loss"],
            "residual_before": out["total_mass_before"],
            "residual_after": out["total_mass_after"],
            "residual_delta": round(out["total_mass_before"] - out["total_mass_after"], 6),
            "hash_unchanged": out["hash_unchanged"],
            "sinkhorn_converged": out["sinkhorn"]["converged"],
        })

    hash_after = candidate_hash()
    seal = json.loads(SEAL_PATH.read_text())

    evidence = {
        "pass": "week7_injury_realloc_nflverse",
        "date": "2026-10-26",
        "source": str(CSV_PATH),
        "week7_rows_in_table": len(week7),
        "week7_teams_in_table": len(by_team),
        "sealed_week": seal.get("week"),
        "sealed_merkle": seal.get("merkle"),
        "candidate_parent_seal_hash": parent,
        "candidate_hash_before": hash_before,
        "candidate_hash_after": hash_after,
        "candidate_hash_unchanged": hash_before == hash_after,
        "assertTauSealed": assert_tau_sealed(seal.get("tau"), seal.get("tau")),
        "games_processed": len(rows),
        "all_hash_unchanged": all(r["hash_unchanged"] for r in rows),
        "residuals": rows,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    return evidence


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
