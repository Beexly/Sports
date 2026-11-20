#!/usr/bin/env python3
"""
GSE Two-Sided Prop Odds Merger (`merge_two_sided_prop_odds.py`)
===============================================================
Merges live two-sided Over/Under American odds across all positions (QB/RB/WR/TE/PK/IDP)
from:
  1. Verified local JSON or CSV sportsbook snapshot (`local_odds_snapshot_path`)
  2. Keyless adapters in `scripts/ops/all_odds_sources.py` (when `allow_live_fetch=True`)
  3. Governed `ODDS_API_KEY` endpoints via `intelligence/data_sources/odds_api_governor.py`
Never invents missing sides: any prop lacking finite two-sided Over + Under American odds
is explicitly tagged `pricing_status="UNPRICED_LINE_ONLY"` so Stage 5 fails closed to PASS.
"""
from __future__ import annotations

import csv
import json
import math
import os
import re
from pathlib import Path
from typing import Any

_SUFFIX_RE = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b\.?", re.IGNORECASE)

_MARKET_CANONICAL_MAP: dict[str, str] = {
    "player_pass_yds": "passing_yards",
    "total passing yards (incl. overtime)": "passing_yards",
    "passing yards": "passing_yards",
    "player_pass_tds": "passing_tds",
    "total passing touchdowns (incl. overtime)": "passing_tds",
    "passing touchdowns": "passing_tds",
    "player_pass_completions": "pass_completions",
    "total pass completions (incl. overtime)": "pass_completions",
    "pass completions": "pass_completions",
    "player_pass_attempts": "pass_attempts",
    "total passing attempts (incl. overtime)": "pass_attempts",
    "passing attempts": "pass_attempts",
    "player_pass_interceptions": "interceptions",
    "total interceptions (incl. overtime)": "interceptions",
    "player_rush_yds": "rushing_yards",
    "total rushing yards (incl. overtime)": "rushing_yards",
    "rushing yards": "rushing_yards",
    "player_rush_attempts": "carries",
    "total carries (incl. overtime)": "carries",
    "carries": "carries",
    "player_reception_yds": "receiving_yards",
    "total receiving yards (incl. overtime)": "receiving_yards",
    "receiving yards": "receiving_yards",
    "player_receptions": "receptions",
    "total receptions (incl. overtime)": "receptions",
    "receptions": "receptions",
    "player_kicking_points": "kicking_points",
    "total kicking points (incl. overtime)": "kicking_points",
    "player_field_goals": "fg_made",
    "total field goals made (incl. overtime)": "fg_made",
    "player_tackles_assists": "tackles_plus_assists",
    "total tackles plus assists (incl. overtime)": "tackles_plus_assists",
    "total tackles + assists (incl. overtime)": "tackles_plus_assists",
    "player_solo_tackles": "solo_tackles",
    "total solo tackles (incl. overtime)": "solo_tackles",
    "player_sacks": "sacks",
    "total sacks (incl. overtime)": "sacks",
    "player_anytime_td": "anytime_td",
    "anytime touchdown scorer": "anytime_td",
}


def normalize_athlete_name(name: str) -> str:
    s = _SUFFIX_RE.sub("", str(name or "").strip().lower())
    s = s.replace(".", " ").replace("'", "").replace("-", " ")
    return " ".join(s.split())


def normalize_market_name(market: str) -> str:
    raw = " ".join(str(market or "").strip().lower().split())
    return _MARKET_CANONICAL_MAP.get(raw, raw)


def _to_valid_american(val: Any) -> int | None:
    if val is None or isinstance(val, bool) or str(val).strip() == "":
        return None
    try:
        f = float(val)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(f) or f == 0.0:
        return None
    i = int(round(f))
    if -99 < i < 100:
        return None
    return i


def _load_local_snapshot(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8", newline="") as fh:
            return [dict(row) for row in csv.DictReader(fh)]
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if isinstance(payload, dict):
        for key in ("props", "items", "odds", "propBets", "records"):
            val = payload.get(key)
            if isinstance(val, list):
                return [r for r in val if isinstance(r, dict)]
    return []


def _fetch_live_two_sided_rows(game_meta: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    # Governed Odds API call only when explicitly permitted and quota clears
    if os.environ.get("ODDS_API_KEY"):
        try:
            from intelligence.data_sources.odds_api_governor import fetch_governed_nfl_props  # type: ignore

            res = fetch_governed_nfl_props(game_meta=game_meta or {})
            if isinstance(res, list):
                rows.extend(r for r in res if isinstance(r, dict))
        except Exception:
            pass
    # Keyless multi-book probes via all_odds_sources.py (normalized if structured player quotes present)
    try:
        from scripts.ops import all_odds_sources

        for fn_name in ("fetch_action_network", "fetch_sx_bet", "fetch_pinnacle_guest"):
            fn = getattr(all_odds_sources, fn_name, None)
            if callable(fn):
                status, _cnt, _msg, payload = fn()
                if status == 200 and isinstance(payload, dict) and isinstance(payload.get("props"), list):
                    rows.extend(r for r in payload["props"] if isinstance(r, dict))
    except Exception:
        pass
    return rows


def merge_two_sided_prop_odds(
    board_props: list[dict[str, Any]],
    game_meta: dict[str, Any] | None = None,
    local_odds_snapshot_path: str | Path | None = None,
    allow_live_fetch: bool = False,
) -> list[dict[str, Any]]:
    """Attach verified two-sided Over/Under American odds and fail closed when unpriced."""
    snap_rows: list[dict[str, Any]] = []
    if local_odds_snapshot_path is not None:
        snap_rows.extend(_load_local_snapshot(Path(local_odds_snapshot_path)))
    if allow_live_fetch:
        snap_rows.extend(_fetch_live_two_sided_rows(game_meta=game_meta))

    idx: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for sr in snap_rows:
        ath_k = normalize_athlete_name(str(sr.get("athlete") or sr.get("player") or sr.get("playerName") or ""))
        mkt_k = normalize_market_name(str(sr.get("market") or sr.get("propType") or ""))
        if ath_k and mkt_k:
            idx.setdefault((ath_k, mkt_k), []).append(sr)

    out: list[dict[str, Any]] = []
    for raw in board_props:
        row = dict(raw)
        over_am = _to_valid_american(row.get("over_odds") if row.get("over_odds") is not None else row.get("over_american"))
        under_am = _to_valid_american(row.get("under_odds") if row.get("under_odds") is not None else row.get("under_american"))
        odds_source = str(row.get("odds_source") or ("board_inline" if over_am is not None and under_am is not None else ""))

        if over_am is None or under_am is None:
            ath_k = normalize_athlete_name(str(row.get("athlete") or ""))
            mkt_k = normalize_market_name(str(row.get("market") or ""))
            line_v = row.get("line")
            cands = idx.get((ath_k, mkt_k), [])
            matched: dict[str, Any] | None = None
            for cand in cands:
                c_line = cand.get("line")
                if line_v is not None and c_line not in (None, ""):
                    try:
                        if abs(float(line_v) - float(c_line)) > 0.05:
                            continue
                    except (TypeError, ValueError):
                        continue
                matched = cand
                break
            if matched is not None:
                m_over = _to_valid_american(matched.get("over_odds") if matched.get("over_odds") is not None else matched.get("over_american"))
                m_under = _to_valid_american(matched.get("under_odds") if matched.get("under_odds") is not None else matched.get("under_american"))
                if m_over is not None:
                    over_am = m_over
                if m_under is not None:
                    under_am = m_under
                odds_source = str(matched.get("odds_source") or "verified_snapshot")

        row["over_odds"] = over_am
        row["under_odds"] = under_am
        row["over_american"] = over_am
        row["under_american"] = under_am
        if over_am is not None and under_am is not None:
            row["pricing_status"] = "PRICED_TWO_SIDED"
            row["odds_source"] = odds_source or "verified_snapshot"
        else:
            row["pricing_status"] = "UNPRICED_LINE_ONLY"
            row["odds_source"] = odds_source or "none"
        out.append(row)
    return out
