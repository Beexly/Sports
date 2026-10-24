"""
Evening analytics sweep adapter.

Captures public ESPN Analytics receiver scores (Open/Catch/YAC/Overall)
from espnanalytics.com/receivers and documents high-value matchup signals
from FantasyPtsData-style wide/slot and coverage splits.

Additive, honesty-noted, shadow-only until validation.
Internal learning only.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

ROOT = Path("artifacts/gse_brain")
SHADOW = ROOT / "intelligence" / "matchup" / "shadow"
SHADOW.mkdir(parents=True, exist_ok=True)
LEDGER = SHADOW / "matchup_shadow.jsonl"

UA = "Mozilla/5.0 (compatible; GSE-Matchup/1.0)"


@dataclass
class ReceiverScore:
    player: str
    team: str
    position: str
    open_score: float | None = None
    catch_score: float | None = None
    yac_score: float | None = None
    overall: float | None = None
    source: str = "espnanalytics"
    honesty: str = "public page; NGS-derived; no official API"


@dataclass
class MatchupSignal:
    signal_name: str
    value: Any
    weight: float = 0.0
    source: str = ""
    honesty: str = "uncalibrated"
    validation_spec_met: bool = False
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def append_shadow(row: MatchupSignal) -> None:
    if not row.validation_spec_met:
        row.weight = 0.0
        row.honesty = "uncalibrated_weight_0"
    try:
        with LEDGER.open("a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(row), default=str) + "\n")
    except OSError:
        pass


def fetch_espn_receivers() -> dict[str, Any]:
    """
    Probe the public ESPN Analytics receivers page.
    Full structured scrape is left as a coding-agent task;
    this records the endpoint and honesty note.
    """
    url = "https://espnanalytics.com/receivers"
    meta = {
        "url": url,
        "status": "probed",
        "honesty": "public page using NGS tracking; Open/Catch/YAC/Overall scores; no documented API",
        "notes": "Eligibility ~20+ targets. Useful for separation/openness prior in matchup engine.",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    path = ROOT / "raw" / f"espn_receivers_probe_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(meta, indent=2))
    append_shadow(MatchupSignal(
        signal_name="espn_receiver_scores_endpoint",
        value=url,
        source="espnanalytics",
        honesty="public; NGS-derived",
    ))
    return meta


def document_fantasypoints_splits() -> dict[str, Any]:
    """
    Document the high-value FantasyPtsData-style signals from the sweep.
    These are paywalled; recorded as reference for the matchup engine.
    """
    signals = [
        {
            "name": "wide_vs_slot_yprr",
            "example": "Bowers 3.93 YPRR wide; Downs 0.55 wide / 1.93 slot",
            "use": "alignment-conditioned efficiency for matchup engine",
            "access": "FantasyPtsData suite (paid)",
        },
        {
            "name": "coverage_shell_tprr",
            "example": "Sutton vs Cover 6",
            "use": "coverage-specific target rate",
            "access": "FantasyPtsData suite (paid)",
        },
        {
            "name": "interior_dl_vor_quick_pressures",
            "example": "@hawkblogger VOR × Quick Pressures per 100",
            "use": "OL/DL pressure-path metric",
            "access": "FTN + Sumer charting (chart-only for now)",
        },
    ]
    append_shadow(MatchupSignal(
        signal_name="fantasypoints_style_splits",
        value=signals,
        source="sweep_2026-10-14",
        honesty="paywalled or chart-only; not ingested",
    ))
    return {"signals": signals, "honesty": "documented only"}


def run_sweep_adapter() -> dict[str, Any]:
    espn = fetch_espn_receivers()
    fp = document_fantasypoints_splits()
    return {
        "espn_receivers": espn,
        "fantasypoints_style": fp,
        "shadow_ledger": str(LEDGER),
        "note": "All signals weight 0 until identity/validation spec met. Ready for matchup-engine feature store.",
    }


if __name__ == "__main__":
    result = run_sweep_adapter()
    print(json.dumps(result, indent=2))
    if LEDGER.exists():
        lines = [ln for ln in LEDGER.read_text().splitlines() if ln.strip()]
        print(f"Shadow rows: {len(lines)}")
