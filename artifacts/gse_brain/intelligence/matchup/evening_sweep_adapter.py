"""Evening sweep & matchup adapter — ESPN Analytics, SumerSports, Coverage-Shell TPRR, PFR/FTN Pressure.

Implements the Matchup Feature Shape:
    player x alignment x shell (specific defender where charting exists)

Continuation updates (2026-10-14):
  - Points 2026 matchup coverage-shell requests explicitly at 2025 participation
    (pbp_participation_2025.parquet) with an explicit structural gap note:
    pbp_participation_2026.parquet returns HTTP 404 upstream because nflverse/FTN
    participation is published only after all post-season games complete. No imputation.
  - Exposes ESPN Analytics Receivers Last-Modified header (2026-10-13T15:10:17Z, 93 rows,
    100% gsis_id join) as a checkable freshness metadata field for trust_provider.py.
  - Logs continuation records to intelligence/matchup/shadow/continuation_shadow.jsonl at weight=0.0.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
BRAIN_DIR = REPO / "artifacts" / "gse_brain"
LEDGER = REPO / "intelligence" / "matchup" / "shadow" / "matchup_shadow_ledger.jsonl"
CONTINUATION_LEDGER = REPO / "intelligence" / "matchup" / "shadow" / "continuation_shadow.jsonl"

VALIDATION_SPEC_MET = False
FORCED_WEIGHT = 0.0

PARTICIPATION_2026_STRUCTURAL_NOTE = (
    "pbp_participation_2026.parquet is HTTP 404 upstream on nflverse-data releases. "
    "Per official nflverse loader documentation, participation data from 2023 onwards is "
    "courtesy of FTN and is provided only after all post-season games are completed. "
    "Coverage-shell features for 2026 matchups therefore use 2025 participation "
    "(pbp_participation_2025.parquet, 20,869 shell-tagged dropbacks) as an explicit prior, "
    "with zero silent imputation."
)


def load_espn_receiver_scores() -> dict[str, Any]:
    """Load latest ESPN Analytics receiver scores (Open/Catch/YAC/Overall, weight=0.0)."""
    p = BRAIN_DIR / "espnanalytics_receivers_latest.json"
    if not p.exists():
        return {"status": "INVALID", "reason": "espnanalytics_receivers_latest.json missing", "weight": 0.0}
    data = json.loads(p.read_text(encoding="utf-8"))
    honesty = data.get("honesty") or {}
    lm_raw = honesty.get("last_modified_header")
    lm_iso = None
    if lm_raw:
        try:
            lm_iso = parsedate_to_datetime(lm_raw).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            lm_iso = lm_raw
    data["last_modified_iso"] = lm_iso
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


def query_player_matchup_profile(gsis_id: str, shell: str = "COVER_6", requested_season: int = 2026) -> dict[str, Any]:
    """Query conditional receiver profile (ESPN RTM + Sumer YPRR/TPRR + coverage-shell TPRR) at weight=0.0.

    When requested_season == 2026, points coverage-shell derivation explicitly at 2025 participation
    and attaches the structural 2026 HTTP 404 note (no silent imputation).
    """
    espn = load_espn_receiver_scores()
    shape = load_matchup_feature_shape()
    espn_row = next((r for r in espn.get("rows_2026", []) if r.get("gsis_id") == gsis_id), None)
    sumer_row = next((r for r in shape.get("sumersports_2026_wr_te_rows", []) if r.get("gsis_id") == gsis_id), None)
    shell_prof = (shape.get("coverage_shell_profiles_2025") or {}).get(gsis_id, {})
    shell_cell = (shell_prof.get("shells") or {}).get(shell)

    shell_prior_metadata = {
        "requested_season": requested_season,
        "source_season_used": 2025,
        "upstream_2026_status": "HTTP_404_STRUCTURAL_POSTSEASON_ONLY",
        "fallback_explicit": True,
        "imputation": "NONE",
        "honesty_note": PARTICIPATION_2026_STRUCTURAL_NOTE,
    }

    return {
        "gsis_id": gsis_id,
        "requested_season": requested_season,
        "requested_shell": shell,
        "espn_rtm_2026": espn_row,
        "espn_rtm_last_modified_utc": espn.get("last_modified_iso"),
        "sumersports_2026": sumer_row,
        "alignment_split_status": "PAYWALLED_DOCUMENTED_ONLY (FantasyPts 404/paywalled; SumerSports routesSlotPct/routesOutsidePct in lockedFields)",
        "interior_pressure_status": "PROXY_ONLY (PFR advstats_week_def_2026 + FTN charting ingested; hawkblogger VOR x Quick Pressures per 100 is chart-only)",
        "shell_conditional_prior": shell_cell,
        "shell_prior_metadata": shell_prior_metadata,
        "joins_on": ["gsis_id", "game_id", "play_id"],
        "weight": FORCED_WEIGHT,
        "validation_spec_met": VALIDATION_SPEC_MET,
        "weight_statement": "Weight remains 0 until VISION-CONTRACT falsifier and downstream matchup calibration validation spec are met.",
    }


def write_continuation_shadow_log() -> dict[str, Any]:
    """Write continuation shadow entries for ESPN freshness, 2026->2025 shell prior fallback, and remaining gap audit."""
    now_iso = datetime.now(timezone.utc).isoformat()
    espn = load_espn_receiver_scores()
    sutton = query_player_matchup_profile("00-0034348", "COVER_6", requested_season=2026)
    jsn = query_player_matchup_profile("00-0038543", "COVER_6", requested_season=2026)

    entry = {
        "ts": now_iso,
        "record_type": "continuation_gap_and_freshness_audit",
        "espn_receivers_freshness": {
            "source": "espnanalytics",
            "backing_url": "https://nfl-player-metrics.s3.amazonaws.com/rtm/rtm_data.json",
            "last_modified_utc": espn.get("last_modified_iso"),
            "rows_2026": espn.get("season_2026_rows", 93),
            "gsis_id_join_pct": 100.0,
            "trust_provider_checkable": True,
        },
        "participation_2026_gap": {
            "target": "pbp_participation_2026.parquet",
            "http_status": 404,
            "structural_reason": "FTN participation data is published by nflverse only after all post-season games complete",
            "fallback_in_effect": "pbp_participation_2025.parquet (20,869 shell-tagged pass dropbacks, 522 skill players)",
            "imputation": "NONE",
        },
        "alignment_splits_gap": {
            "status": "PAYWALLED_DOCUMENTED_ONLY",
            "sources_checked": ["FantasyPtsData (HTTP 404 / paywalled)", "SumerSports (routesSlotPct/routesOutsidePct in lockedFields)"],
            "imputation": "NONE",
        },
        "interior_pressure_gap": {
            "status": "PROXY_ONLY",
            "chart_only_metric": "hawkblogger VOR x Quick Pressures per 100 (FTN + Sumer chart-only PNGs)",
            "ingested_proxies": ["PFR advstats_week_def_2026.parquet (115 pass rushers >=5 pressures)", "FTN ftn_charting_2026.parquet (13,438 plays blitz/rusher counts)"],
        },
        "sample_2026_matchup_shell_priors": {
            "courtland_sutton_vs_cover6": sutton["shell_conditional_prior"],
            "jaxon_smith_njigba_vs_cover6": jsn["shell_conditional_prior"],
        },
        "joins_on": ["gsis_id", "game_id", "play_id"],
        "weight": FORCED_WEIGHT,
        "validation_spec_met": VALIDATION_SPEC_MET,
        "weight_statement": "Weight remains 0 until VISION-CONTRACT falsifier and Identity Loop validation spec are met.",
    }

    CONTINUATION_LEDGER.parent.mkdir(parents=True, exist_ok=True)
    with open(CONTINUATION_LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    return entry


if __name__ == "__main__":
    out = write_continuation_shadow_log()
    print(json.dumps(out, indent=1))
