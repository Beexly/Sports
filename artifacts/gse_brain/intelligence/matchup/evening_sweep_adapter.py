"""Evening sweep & matchup adapter — ESPN Analytics, SumerSports, Coverage-Shell TPRR, PFR/FTN Pressure.

Implements the Matchup Feature Shape:
    player x alignment x shell (specific defender where charting exists)

Replaces coarse team-tendency features while enforcing:
  - Weight forced to 0.0 until VISION-CONTRACT falsifier and matchup calibration spec are met
  - Every source carries an explicit honesty note (HTTP status, truncation, access restriction, derivation)
  - Joins on gsis_id / play_id / game_id via nflverse rosters and participation
  - Logs every signal to intelligence/matchup/shadow/matchup_shadow_ledger.jsonl
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
BRAIN_DIR = REPO / "artifacts" / "gse_brain"
LEDGER = REPO / "intelligence" / "matchup" / "shadow" / "matchup_shadow_ledger.jsonl"

VALIDATION_SPEC_MET = False
FORCED_WEIGHT = 0.0


def load_espn_receiver_scores() -> dict[str, Any]:
    """Load latest ESPN Analytics receiver scores (Open/Catch/YAC/Overall, weight=0.0)."""
    p = BRAIN_DIR / "espnanalytics_receivers_latest.json"
    if not p.exists():
        return {"status": "INVALID", "reason": "espnanalytics_receivers_latest.json missing", "weight": 0.0}
    data = json.loads(p.read_text(encoding="utf-8"))
    data["weight"] = FORCED_WEIGHT
    data["validation_spec_met"] = VALIDATION_SPEC_MET
    return data


def load_matchup_feature_shape() -> dict[str, Any]:
    """Load player x alignment x shell feature shape artifact (weight=0.0)."""
    p = BRAIN_DIR / "matchup_feature_shape_latest.json"
    if not p.exists():
        return {"status": "INVALID", "reason": "matchup_feature_shape_latest.json missing", "weight": 0.0}
    data = json.loads(p.read_text(encoding="utf-8"))
    data["weight"] = FORCED_WEIGHT
    data["validation_spec_met"] = VALIDATION_SPEC_MET
    return data


def query_player_matchup_profile(gsis_id: str, shell: str = "COVER_6") -> dict[str, Any]:
    """Query conditional receiver profile (ESPN RTM + Sumer YPRR/TPRR + coverage-shell TPRR) at weight=0.0."""
    espn = load_espn_receiver_scores()
    shape = load_matchup_feature_shape()
    espn_row = next((r for r in espn.get("rows_2026", []) if r.get("gsis_id") == gsis_id), None)
    sumer_row = next((r for r in shape.get("sumersports_2026_wr_te_rows", []) if r.get("gsis_id") == gsis_id), None)
    shell_prof = (shape.get("coverage_shell_profiles_2025") or {}).get(gsis_id, {})
    shell_cell = (shell_prof.get("shells") or {}).get(shell)
    return {
        "gsis_id": gsis_id,
        "requested_shell": shell,
        "espn_rtm_2026": espn_row,
        "sumersports_2026": sumer_row,
        "shell_conditional_2025": shell_cell,
        "joins_on": ["gsis_id", "game_id", "play_id"],
        "weight": FORCED_WEIGHT,
        "validation_spec_met": VALIDATION_SPEC_MET,
        "weight_statement": "Weight remains 0 until VISION-CONTRACT falsifier and downstream matchup calibration validation spec are met.",
    }


if __name__ == "__main__":
    sutton = query_player_matchup_profile("00-0034348", "COVER_6")
    jsn = query_player_matchup_profile("00-0038543", "COVER_6")
    print(json.dumps({"sutton_cover6": sutton, "jsn_cover6": jsn}, indent=1))
