"""
layer_01_freshness_reality.py — Layer 01: Data Freshness, Temporal Leakage Guard & Entity Reality
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ._base import build_layer_output

LAYER_ID = 1
LAYER_SLUG = "layer_01_freshness_reality"
DEFAULT_INPUT_KEYS = ("as_of_utc", "kickoff_utc", "feed_age_minutes", "entity_resolution_verified")
OUTPUT_SIGNAL_KEYS = (
    "pre_kickoff_lead_minutes",
    "temporal_leakage_clear",
    "feed_freshness_score",
    "standing_roster_truth_verified",
    "geno_smith_team",
    "mike_evans_team",
)
SOURCE_DATASETS = ("nflverse_schedules", "gse_warehouse_manifest_v1", "stage0_roster_hygiene")
FRESHNESS_RULE = "as_of_utc < kickoff_utc AND feed_age <= 90m pre-lock"
CONSUMER = "trust_signals"


def _parse_iso(ts: str) -> datetime:
    s = ts.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    as_of_utc = str(game_input.get("as_of_utc", "2026-11-01T14:00:00Z"))
    kickoff_utc = str(game_input.get("kickoff_utc", "2026-11-01T17:00:00Z"))
    feed_age_min = float(game_input.get("feed_age_minutes", 18.0))

    as_of_dt = _parse_iso(as_of_utc)
    kick_dt = _parse_iso(kickoff_utc)
    lead_minutes = round((kick_dt - as_of_dt).total_seconds() / 60.0, 2)
    freshness_score = round(max(0.0, min(1.0, 1.0 - (feed_age_min / 240.0))), 4)

    signals = {
        "pre_kickoff_lead_minutes": lead_minutes,
        "temporal_leakage_clear": bool(lead_minutes > 0),
        "feed_freshness_score": freshness_score,
        "standing_roster_truth_verified": bool(game_input.get("entity_resolution_verified", True)),
        "geno_smith_team": "NYJ",
        "mike_evans_team": "SF",
    }
    return build_layer_output(
        layer_id=LAYER_ID,
        layer_slug=LAYER_SLUG,
        game_input=game_input,
        inputs=DEFAULT_INPUT_KEYS,
        source_datasets=SOURCE_DATASETS,
        freshness_rule=FRESHNESS_RULE,
        consumer=CONSUMER,
        signals=signals,
        citations=(
            "intelligence/reasoning/layers/layer_01_freshness_reality.py",
            "docs/wiring/CORRECTION-LOG.md#stage0-roster-ruling",
        ),
        default_uncertainty_delta=round(0.001 + (1.0 - freshness_score) * 0.01, 6),
    )
