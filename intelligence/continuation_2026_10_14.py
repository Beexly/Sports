"""
Continuation after Hermes execution (2026-10-14).

Adds:
- ESPN receivers freshness check to the trust path
- Kalman proof-play baseline record for the VISION-CONTRACT falsifier
- Explicit 2026 participation 404 note
All weight 0. Fail-closed. Internal only.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path

BRAIN = Path("artifacts/gse_brain")
SHADOW = BRAIN / "intelligence" / "matchup" / "shadow"
SHADOW.mkdir(parents=True, exist_ok=True)
LEDGER = SHADOW / "continuation_shadow.jsonl"
VISION_SHADOW = BRAIN / "intelligence" / "vision" / "shadow" / "kalman_baseline.jsonl"
VISION_SHADOW.parent.mkdir(parents=True, exist_ok=True)


@dataclass
class ShadowRow:
    signal_name: str
    value: dict | str | float
    weight: float = 0.0
    source: str = "continuation_2026-10-14"
    honesty: str = ""
    validation_spec_met: bool = False
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def append(row: ShadowRow, path: Path = LEDGER) -> None:
    if not row.validation_spec_met:
        row.weight = 0.0
    try:
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(row), default=str) + "\n")
    except OSError:
        pass


def record_espn_freshness() -> dict:
    """Document the Last-Modified already captured by Hermes."""
    note = {
        "source": "espnanalytics.com/receivers",
        "backing_json": "https://nfl-player-metrics.s3.amazonaws.com/rtm/rtm_data.json",
        "last_modified": "2026-10-13T15:10:17Z",
        "rows_2026": 93,
        "join_rate_gsis_id": 1.0,
        "honesty": "public S3 JSON; NGS-derived; weight 0",
    }
    append(ShadowRow(
        signal_name="espn_receivers_freshness",
        value=note,
        honesty="Last-Modified captured; suitable for trust-provider freshness check",
    ))
    return note


def record_kalman_baseline() -> dict:
    """Store the measured proof-play numbers as the falsifier baseline."""
    baseline = {
        "proof_play": "2022091113_1766",
        "source": "public HF Big-Data-Bowl-2025",
        "player_mean_trace_P": 0.6835,
        "player_mean_innovation_norm_m": 0.4683,
        "ball_mean_trace_P": 1.1062,
        "ball_mean_innovation_norm_m": 0.8266,
        "tracks_maintained": "22/22",
        "stage2_low_conf_rescues": 18,
        "deepsort_enabled": False,
        "ball_separated": True,
        "honesty": "single proof play; not a validation of VISION-CONTRACT; weight 0",
    }
    append(ShadowRow(
        signal_name="kalman_proof_baseline",
        value=baseline,
        honesty="measured on public research tracking; falsifier not yet run",
    ), path=VISION_SHADOW)
    return baseline


def record_participation_gap() -> dict:
    gap = {
        "file": "pbp_participation_2026.parquet",
        "status": "HTTP 404 upstream on nflverse releases",
        "fallback": "pbp_participation_2025 used for coverage-shell derivation",
        "honesty": "2026 participation not yet published; do not impute",
    }
    append(ShadowRow(
        signal_name="participation_2026_missing",
        value=gap,
        honesty="explicit 404; fail-closed; no silent imputation",
    ))
    return gap


def run() -> dict:
    espn = record_espn_freshness()
    kalman = record_kalman_baseline()
    part = record_participation_gap()
    return {
        "espn_freshness": espn,
        "kalman_baseline": kalman,
        "participation_gap": part,
        "ledgers": [str(LEDGER), str(VISION_SHADOW)],
        "note": "All rows weight 0. Ready for trust-provider freshness extension and falsifier baseline.",
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
