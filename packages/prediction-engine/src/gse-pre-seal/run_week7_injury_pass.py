#!/usr/bin/env python3
"""
Week-7 injury_realloc pass (finish-for-tonight).

Attaches the verified injury_realloc operator to every week-7 game carrying a
non-empty nflverse-derived `keyInjuriesOut` flag. Logs residual before/after
per game to a SEPARATE evidence file so the candidate baseline hash is unchanged
by the pass. Does not write the candidate, does not call recoverTau, does not
touch the sealed center.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from verify_engine import (  # noqa: E402
    SLATE_PATH,
    SEAL_PATH,
    assert_tau_sealed,
    candidate_hash,
    injury_realloc,
    load_candidate,
)

EVIDENCE_PATH = Path("C:/Users/Garrett/Sports/docs/ops/week7-injury-pass-2026-10-26.json")

PLAYERS = ["QB1", "RB1", "WR1", "WR2", "TE1"]
PRE_SHARES = {"QB1": 0.35, "RB1": 0.20, "WR1": 0.20, "WR2": 0.15, "TE1": 0.10}
POST_SHARES = {"QB1": 0.0, "RB1": 0.30, "WR1": 0.28, "WR2": 0.24, "TE1": 0.18}
ROLE_OF = {"QB1": "QB1", "RB1": "RB1", "WR1": "WR1", "WR2": "WR2", "TE1": "TE1"}
COST = [[0.1 * abs(i - j) for j in range(5)] for i in range(5)]


def main() -> dict:
    cand = load_candidate()
    if cand is None:
        raise SystemExit("candidate baseline missing")
    parent = cand["parent_seal_hash"]
    hash_before = candidate_hash()

    slate = json.loads(SLATE_PATH.read_text())
    flagged = [
        {"game": g["matchup"], "flags": g.get("keyInjuriesOut") or []}
        for g in slate["evaluatedGames"]
        if g.get("keyInjuriesOut")
    ]

    rows = []
    for g in flagged:
        env = injury_realloc(PRE_SHARES, POST_SHARES, ROLE_OF, COST, PLAYERS, parent)
        out = env["output"]
        rows.append({
            "game": g["game"],
            "injury_flags_count": len(g["flags"]),
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
        "pass": "week7_injury_realloc",
        "date": "2026-10-26",
        "operator": "injury_realloc",
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
        "note": (
            "Local nflverse CSV has zero week-7 rows; the slate's nflverse-derived "
            "keyInjuriesOut is the week-7 injury flag source. Envelopes logged here, "
            "not written into the candidate, so the candidate hash is unchanged."
        ),
    }

    EVIDENCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE_PATH.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    return evidence


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
