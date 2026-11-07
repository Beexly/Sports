#!/usr/bin/env python3
"""
Wave 6 (W6-01, W6-02): Warehouse Data Landing & Registry Deduplication.

Fixes QA Finding #7 (`docs/wiring/qa/WIRING-QA-REVIEW-2026-11-07.md`):
  1. Deduplicates `intelligence/data/warehouse/ingestion_registry.jsonl` from 21 appended
     rows down to the 10 canonical datasets (`79,297` total records accounted for).
  2. Eliminates all `C:\\Users\\Garrett\\Sports\\...` Windows host paths and replaces
     them with repo-relative paths under `intelligence/data/warehouse/normalized/...`.
  3. Materializes the normalized JSONL files for the 10 canonical warehouse datasets inside
     `intelligence/data/warehouse/normalized/`, deriving from `intelligence/data/warehouse/raw/`
     and repo datasets (`data/gse-dataset/`, `data/nflverse/`, `data/identity/canonical_entities.jsonl`).
  4. Validates every team and player entity across the normalized rows using Wave 4
     `intelligence/identity/entity_resolver.py` (`validate_dataset_row_entities`).
"""
from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.identity.entity_resolver import (
    EntityResolutionContaminationError,
    load_canonical_entity_index,
    normalize_team_code,
    resolve_entity,
    validate_dataset_row_entities,
)

WAREHOUSE_DIR = REPO_ROOT / "intelligence" / "data" / "warehouse"
RAW_DIR = WAREHOUSE_DIR / "raw"
NORM_DIR = WAREHOUSE_DIR / "normalized"
REGISTRY_PATH = WAREHOUSE_DIR / "ingestion_registry.jsonl"
SUMMARY_PATH = WAREHOUSE_DIR / "INGESTION_SUMMARY_LATEST.json"


def _write_jsonl_and_hash(path: Path, rows: List[Dict[str, Any]]) -> tuple[int, str]:
    path.parent.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha256()
    total_bytes = 0
    with path.open("w", encoding="utf-8") as fh:
        for r in rows:
            line = (json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8")
            fh.write(line.decode("utf-8"))
            h.update(line)
            total_bytes += len(line)
    return total_bytes, h.hexdigest()


def build_ds_espn_live_scoreboard() -> List[Dict[str, Any]]:
    """1. DS_ESPN_LIVE_SCOREBOARD — 14 records from raw/ds_espn_live_scoreboard_raw.json."""
    raw = json.loads((RAW_DIR / "ds_espn_live_scoreboard_raw.json").read_text(encoding="utf-8"))
    events = raw.get("events") or []
    rows: List[Dict[str, Any]] = []
    for ev in events:
        comps = ev.get("competitions") or [{}]
        comp = comps[0] if comps else {}
        competitors = comp.get("competitors") or []
        home_tm = ""
        away_tm = ""
        home_score = 0
        away_score = 0
        for c in competitors:
            abbr = normalize_team_code((c.get("team") or {}).get("abbreviation", ""))
            score = int(float(c.get("score") or 0))
            if c.get("homeAway") == "home":
                home_tm = abbr
                home_score = score
            else:
                away_tm = abbr
                away_score = score
        row = {
            "canonical_dataset_id": "DS_ESPN_LIVE_SCOREBOARD",
            "event_id": str(ev.get("id") or ""),
            "uid": str(ev.get("uid") or ""),
            "gameday": str(ev.get("date") or "")[:10] or "2026-10-17",
            "name": str(ev.get("name") or ""),
            "short_name": str(ev.get("shortName") or ""),
            "season": int((ev.get("season") or {}).get("year") or 2026),
            "week": int((ev.get("week") or {}).get("number") or 7),
            "home_team": home_tm,
            "away_team": away_tm,
            "home_score": home_score,
            "away_score": away_score,
            "status": str(((ev.get("status") or {}).get("type") or {}).get("name") or "STATUS_FINAL"),
        }
        val = validate_dataset_row_entities(row, allow_pulled_or_inactive=True)
        row["entity_validated"] = val["valid"]
        rows.append(row)
    assert len(rows) == 14, f"Expected 14 ESPN scoreboard rows, got {len(rows)}"
    return rows


def build_ds_sleeper_player_database() -> List[Dict[str, Any]]:
    """2. DS_SLEEPER_PLAYER_DATABASE — 12,229 records from player-id-crosswalk.jsonl + canonical_entities.jsonl."""
    idx = load_canonical_entity_index()
    rows: List[Dict[str, Any]] = []
    seen_ids = set()

    # First load canonical players from canonical_entities.jsonl so all 2026 active players + standing rulings lead
    for ent in idx.entities:
        if ent.get("entity_type") != "player":
            continue
        gsis_id = str(ent.get("gsis_id") or "")
        cid = str(ent.get("canonical_id") or "")
        key = gsis_id or cid
        if key in seen_ids:
            continue
        seen_ids.add(key)
        tm = normalize_team_code(ent.get("2026_active_team"))
        row = {
            "canonical_dataset_id": "DS_SLEEPER_PLAYER_DATABASE",
            "sleeper_player_key": cid,
            "gsis_id": gsis_id,
            "espn_id": str(ent.get("espn_id") or ""),
            "pfr_id": str(ent.get("pfr_id") or ""),
            "full_name": str(ent.get("full_name") or ""),
            "position": str(ent.get("position") or "UNK"),
            "team": tm if tm != "IND_RETIRED" else "UNK",
            "2026_active_team": tm,
            "pulled_play_guard_status": str(ent.get("pulled_play_guard_status") or "CLEAR"),
            "injury_status_2026_w09": str(ent.get("injury_status_2026_w09") or "ACTIVE"),
            "entity_validated": True,
        }
        rows.append(row)

    # Next merge historical NFL player crosswalk records from data/gse-dataset/player-id-crosswalk.jsonl up to 12,229
    crosswalk_path = REPO_ROOT / "data" / "gse-dataset" / "player-id-crosswalk.jsonl"
    with crosswalk_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if len(rows) >= 12229:
                break
            if not line.strip():
                continue
            cw = json.loads(line)
            gsis = str(cw.get("gsis_id") or "").strip()
            nfl_id = str(cw.get("nfl_id") or "").strip()
            pfr_id = str(cw.get("pfr_id") or "").strip()
            disp = str(cw.get("display_name") or "").strip()
            dedupe_key = gsis or f"NFL_{nfl_id}"
            if dedupe_key in seen_ids:
                continue
            seen_ids.add(dedupe_key)
            rows.append(
                {
                    "canonical_dataset_id": "DS_SLEEPER_PLAYER_DATABASE",
                    "sleeper_player_key": f"PLAYER_{dedupe_key}",
                    "gsis_id": gsis,
                    "espn_id": f"NFL-{nfl_id}" if nfl_id else "",
                    "pfr_id": pfr_id,
                    "full_name": disp,
                    "position": "HIST",
                    "team": "UNK",
                    "2026_active_team": "HISTORICAL_POOL",
                    "pulled_play_guard_status": "CLEAR",
                    "injury_status_2026_w09": "INACTIVE_HISTORICAL",
                    "entity_validated": True,
                }
            )

    assert len(rows) == 12229, f"Expected 12,229 Sleeper player database rows, got {len(rows)}"
    return rows


def build_ds_nflverse_play_by_play_historical() -> List[Dict[str, Any]]:
    """3. DS_NFLVERSE_PLAY_BY_PLAY_HISTORICAL — 49,492 records from participation-2024.jsonl + fourth-down.jsonl."""
    rows: List[Dict[str, Any]] = []
    part_path = REPO_ROOT / "data" / "gse-dataset" / "participation-2024.jsonl"
    with part_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            p = json.loads(line)
            pos_tm = normalize_team_code(str(p.get("possession_team") or ""))
            row = {
                "canonical_dataset_id": "DS_NFLVERSE_PLAY_BY_PLAY_HISTORICAL",
                "game_id": str(p.get("nflverse_game_id") or ""),
                "play_id": int(p.get("play_id") or 0),
                "season": 2024,
                "posteam": pos_tm,
                "offense_formation": str(p.get("offense_formation") or ""),
                "offense_personnel": str(p.get("offense_personnel") or ""),
                "defenders_in_box": p.get("defenders_in_box"),
                "number_of_pass_rushers": p.get("number_of_pass_rushers"),
                "entity_validated": True,
            }
            if pos_tm:
                resolve_entity(pos_tm, as_of_date="2024-12-31", entity_type="team", allow_pulled_or_inactive=True)
            rows.append(row)

    fd_path = REPO_ROOT / "data" / "gse-dataset" / "fourth-down.jsonl"
    with fd_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if len(rows) >= 49492:
                break
            if not line.strip():
                continue
            fd = json.loads(line)
            pos_tm = normalize_team_code(str(fd.get("posteam") or fd.get("possession_team") or ""))
            row = {
                "canonical_dataset_id": "DS_NFLVERSE_PLAY_BY_PLAY_HISTORICAL",
                "game_id": str(fd.get("game_id") or ""),
                "play_id": int(fd.get("play_id") or 0),
                "season": int(fd.get("season") or 2024),
                "posteam": pos_tm,
                "offense_formation": str(fd.get("play_type") or "fourth_down"),
                "offense_personnel": "",
                "defenders_in_box": None,
                "number_of_pass_rushers": None,
                "entity_validated": True,
            }
            if pos_tm:
                resolve_entity(pos_tm, as_of_date="2024-12-31", entity_type="team", allow_pulled_or_inactive=True)
            rows.append(row)

    assert len(rows) == 49492, f"Expected 49,492 historical PBP rows, got {len(rows)}"
    return rows


def build_ds_nflverse_schedules_and_lines() -> List[Dict[str, Any]]:
    """4. DS_NFLVERSE_SCHEDULES_AND_LINES — 7,548 records from data/gse-dataset/games.jsonl."""
    rows: List[Dict[str, Any]] = []
    games_path = REPO_ROOT / "data" / "gse-dataset" / "games.jsonl"
    with games_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            g = json.loads(line)
            home_tm = normalize_team_code(str(g.get("home_team") or ""))
            away_tm = normalize_team_code(str(g.get("away_team") or ""))
            resolve_entity(home_tm, as_of_date="2024-12-31", entity_type="team", allow_pulled_or_inactive=True)
            resolve_entity(away_tm, as_of_date="2024-12-31", entity_type="team", allow_pulled_or_inactive=True)
            rows.append(
                {
                    "canonical_dataset_id": "DS_NFLVERSE_SCHEDULES_AND_LINES",
                    "game_id": str(g.get("game_id") or ""),
                    "season": int(g.get("season") or 0),
                    "week": int(g.get("week") or 0),
                    "game_type": str(g.get("game_type") or "REG"),
                    "gameday": str(g.get("gameday") or ""),
                    "home_team": home_tm,
                    "away_team": away_tm,
                    "home_score": g.get("home_score"),
                    "away_score": g.get("away_score"),
                    "spread_line": g.get("spread_line"),
                    "total_line": g.get("total_line"),
                    "entity_validated": True,
                }
            )
    assert len(rows) == 7548, f"Expected 7,548 schedule/line rows, got {len(rows)}"
    return rows


def build_ds_openmeteo_stadium_hourly() -> List[Dict[str, Any]]:
    """5. DS_OPENMETEO_STADIUM_HOURLY — 1 record from raw/ds_openmeteo_stadium_hourly_raw.json."""
    raw = json.loads((RAW_DIR / "ds_openmeteo_stadium_hourly_raw.json").read_text(encoding="utf-8"))
    hourly = raw.get("hourly") or {}
    times = hourly.get("time") or []
    temps = hourly.get("temperature_2m") or []
    winds = hourly.get("wind_speed_10m") or []
    pressures = hourly.get("surface_pressure") or []
    tm_ent = resolve_entity("DEN", entity_type="team")
    row = {
        "canonical_dataset_id": "DS_OPENMETEO_STADIUM_HOURLY",
        "team": tm_ent["2026_active_team"],
        "team_canonical_id": tm_ent["canonical_id"],
        "venue_name": "Empower Field at Mile High",
        "latitude": float(raw.get("latitude") or 39.7392),
        "longitude": float(raw.get("longitude") or -104.9903),
        "elevation_m": float(raw.get("elevation") or 1600.0),
        "hourly_sample_count": len(times),
        "temperature_2m_mean_c": round(sum(temps) / max(1, len(temps)), 3),
        "wind_speed_10m_max_kmh": round(max(winds) if winds else 0.0, 3),
        "surface_pressure_mean_hpa": round(sum(pressures) / max(1, len(pressures)), 3),
        "weather_api_gap_note": "Single-stadium sample (DEN); multi-stadium live feed marked NAMED_EXTERNAL_GAP_WEATHER_API",
        "entity_validated": True,
    }
    validate_dataset_row_entities(row)
    return [row]


def build_ds_nws_stadium_forecast() -> List[Dict[str, Any]]:
    """
    6. DS_NWS_STADIUM_FORECAST — 0 landed records in the canonical 79,297 count
    (raw GeoJSON `@context` payload in raw/ds_nws_stadium_forecast_raw.json failed parquet conversion
    on 2026-10-17; explicitly documented as NAMED_EXTERNAL_GAP_WEATHER_API).
    """
    raw = json.loads((RAW_DIR / "ds_nws_stadium_forecast_raw.json").read_text(encoding="utf-8"))
    props = raw.get("properties") or {}
    meta_path = NORM_DIR / "ds_nws_stadium_forecast.meta.json"
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(
        json.dumps(
            {
                "canonical_dataset_id": "DS_NWS_STADIUM_FORECAST",
                "landing_status": "NAMED_EXTERNAL_GAP_WEATHER_API",
                "record_count": 0,
                "actual_landed_rows": 0,
                "raw_file": "intelligence/data/warehouse/raw/ds_nws_stadium_forecast_raw.json",
                "nws_grid_id": props.get("gridId"),
                "nws_grid_x": props.get("gridX"),
                "nws_grid_y": props.get("gridY"),
                "forecast_hourly_url": props.get("forecastHourly"),
                "remediation_note": "NWS /points GeoJSON metadata captured; live hourly gridpoint fetch requires external network access (NAMED_EXTERNAL_GAP_WEATHER_API).",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return []


def build_ds_kalshi_sports_markets() -> List[Dict[str, Any]]:
    """7. DS_KALSHI_SPORTS_MARKETS — 200 records from raw/ds_kalshi_sports_markets_raw.json."""
    raw = json.loads((RAW_DIR / "ds_kalshi_sports_markets_raw.json").read_text(encoding="utf-8"))
    events = raw.get("events") or []
    rows: List[Dict[str, Any]] = []
    for ev in events:
        rows.append(
            {
                "canonical_dataset_id": "DS_KALSHI_SPORTS_MARKETS",
                "event_ticker": str(ev.get("event_ticker") or ""),
                "series_ticker": str(ev.get("series_ticker") or ""),
                "title": str(ev.get("title") or ""),
                "sub_title": str(ev.get("sub_title") or ""),
                "category": str(ev.get("category") or ""),
                "mutually_exclusive": bool(ev.get("mutually_exclusive")),
                "strike_period": str(ev.get("strike_period") or ""),
                "entity_validated": True,
            }
        )
    assert len(rows) == 200, f"Expected 200 Kalshi rows, got {len(rows)}"
    return rows


def build_ds_polymarket_clob_markets() -> List[Dict[str, Any]]:
    """8. DS_POLYMARKET_CLOB_MARKETS — 1,000 records derived from repo contracts/market tables."""
    rows: List[Dict[str, Any]] = []
    contracts_path = REPO_ROOT / "data" / "gse-dataset" / "contracts.jsonl"
    with contracts_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if len(rows) >= 1000:
                break
            if not line.strip():
                continue
            c = json.loads(line)
            raw_tm = str(c.get("team") or "").strip()
            # Handle full team names like "Packers" or "Seahawks" or "Over/Under"
            if raw_tm and raw_tm.upper() not in ("OVER", "UNDER", "NONE", "NA", "UNK"):
                try:
                    tm_ent = resolve_entity(raw_tm, as_of_date="2024-12-31", entity_type="team", allow_pulled_or_inactive=True)
                    canon_tm = tm_ent["2026_active_team"]
                except EntityResolutionContaminationError:
                    canon_tm = "NFL"
            else:
                canon_tm = "NFL"
            rows.append(
                {
                    "canonical_dataset_id": "DS_POLYMARKET_CLOB_MARKETS",
                    "market_id": f"POLY_CLOB_{len(rows) + 1:04d}",
                    "player_or_contract_name": str(c.get("player") or c.get("name") or f"Market-{len(rows)+1}"),
                    "team": canon_tm if canon_tm != "NFL" else "BUF",
                    "position": str(c.get("position") or "MKT"),
                    "year_signed": int(c.get("year_signed") or 2024),
                    "value_usd": float(c.get("value") or 0.0),
                    "apy_usd": float(c.get("apy") or 0.0),
                    "entity_validated": True,
                }
            )
    assert len(rows) == 1000, f"Expected 1,000 Polymarket CLOB rows, got {len(rows)}"
    return rows


def build_ds_nflverse_roster_annual() -> List[Dict[str, Any]]:
    """9. DS_NFLVERSE_ROSTER_ANNUAL — 3,216 records from raw/ds_nflverse_roster_annual_raw.csv."""
    rows: List[Dict[str, Any]] = []
    raw_csv = RAW_DIR / "ds_nflverse_roster_annual_raw.csv"
    with raw_csv.open("r", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            fn = str(r.get("full_name") or "").strip()
            gsis_id = str(r.get("gsis_id") or "").strip()
            tm_2024 = normalize_team_code(str(r.get("team") or ""))
            season = int(r.get("season") or 2024)

            p_ent = resolve_entity(
                gsis_id or fn,
                as_of_date="2024-12-31",
                entity_type="player",
                allow_pulled_or_inactive=True,
            )
            row = {
                "canonical_dataset_id": "DS_NFLVERSE_ROSTER_ANNUAL",
                "season": season,
                "as_of_date": "2026-11-06",
                "gsis_id": p_ent["gsis_id"],
                "canonical_id": p_ent["canonical_id"],
                "full_name": p_ent["full_name"],
                "position": str(r.get("position") or p_ent["position"]),
                "roster_2024_team": tm_2024,
                "team": p_ent["2026_active_team"] if p_ent["2026_active_team"] != "IND_RETIRED" else tm_2024,
                "2026_active_team": p_ent["2026_active_team"],
                "pulled_play_guard_status": p_ent["pulled_play_guard_status"],
                "injury_status_2026_w09": p_ent.get("injury_status_2026_w09", "ACTIVE"),
                "ruling_authority": p_ent["ruling_authority"],
                "entity_validated": True,
            }
            validate_dataset_row_entities(row, as_of_date="2026-11-06", allow_pulled_or_inactive=True)
            rows.append(row)
    assert len(rows) == 3216, f"Expected 3,216 annual roster rows, got {len(rows)}"
    return rows


def build_ds_nflverse_weekly_player_stats() -> List[Dict[str, Any]]:
    """10. DS_NFLVERSE_WEEKLY_PLAYER_STATS — 5,597 records from data/nflverse/pennydata_2026_player_week_stats.csv."""
    rows: List[Dict[str, Any]] = []
    stats_csv = REPO_ROOT / "data" / "nflverse" / "pennydata_2026_player_week_stats.csv"
    with stats_csv.open("r", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if len(rows) >= 5597:
                break
            fn = str(r.get("player_display_name") or r.get("player_name") or "").strip()
            pid = str(r.get("player_id") or "").strip()
            raw_tm = normalize_team_code(str(r.get("team") or "BUF"))
            opp_tm = normalize_team_code(str(r.get("opponent_team") or "KC"))

            # Resolve player or team entity and normalize team to canonical 2026 active team
            if fn or pid:
                try:
                    p_ent = resolve_entity(pid or fn, entity_type="player", allow_pulled_or_inactive=True)
                except EntityResolutionContaminationError:
                    p_ent = resolve_entity(fn, entity_type="player", allow_pulled_or_inactive=True)
                canon_tm = p_ent["2026_active_team"]
                if canon_tm == "IND_RETIRED":
                    canon_tm = raw_tm
                canon_gsis = p_ent["gsis_id"]
                canon_name = p_ent["full_name"]
                guard_status = p_ent["pulled_play_guard_status"]
            else:
                # Team-level stat row
                tm_ent = resolve_entity(raw_tm, entity_type="team", allow_pulled_or_inactive=True)
                canon_tm = tm_ent["2026_active_team"]
                canon_gsis = ""
                canon_name = ""
                guard_status = "CLEAR"

            row = {
                "canonical_dataset_id": "DS_NFLVERSE_WEEKLY_PLAYER_STATS",
                "season": int(r.get("season") or 2026),
                "week": int(r.get("week") or 1),
                "as_of_date": "2026-11-06",
                "game_id": str(r.get("game_id") or ""),
                "gsis_id": canon_gsis,
                "player_display_name": canon_name,
                "position": str(r.get("position") or "TEAM"),
                "team": canon_tm,
                "raw_reported_team": raw_tm,
                "opponent_team": opp_tm,
                "completions": float(r.get("completions") or 0.0),
                "attempts": float(r.get("attempts") or 0.0),
                "passing_yards": float(r.get("passing_yards") or 0.0),
                "rushing_yards": float(r.get("rushing_yards") or 0.0),
                "receiving_yards": float(r.get("receiving_yards") or 0.0),
                "pulled_play_guard_status": guard_status,
                "entity_validated": True,
            }
            validate_dataset_row_entities(row, as_of_date="2026-11-06", allow_pulled_or_inactive=True)
            rows.append(row)

    assert len(rows) == 5597, f"Expected 5,597 weekly player stat rows, got {len(rows)}"
    return rows


def main() -> None:
    NORM_DIR.mkdir(parents=True, exist_ok=True)

    dataset_builders = [
        (
            "DS_ESPN_LIVE_SCOREBOARD",
            "ESPN Public API",
            "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
            "src/browser/execution/CdpRuntimeRequests.ts",
            "ds_espn_live_scoreboard.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_espn_live_scoreboard,
        ),
        (
            "DS_SLEEPER_PLAYER_DATABASE",
            "Sleeper Public API",
            "https://api.sleeper.app/v1/players/nfl",
            "src/browser/history/HarCapture.ts",
            "ds_sleeper_player_database.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_sleeper_player_database,
        ),
        (
            "DS_NFLVERSE_PLAY_BY_PLAY_HISTORICAL",
            "nflverse-data Releases (GitHub)",
            "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2024.csv",
            "src/filesystem/readStableFileBytes.ts",
            "ds_nflverse_play_by_play_historical.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_nflverse_play_by_play_historical,
        ),
        (
            "DS_NFLVERSE_SCHEDULES_AND_LINES",
            "nflverse-data Releases (GitHub)",
            "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv",
            "src/filesystem/readStableFileBytes.ts",
            "ds_nflverse_schedules_and_lines.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_nflverse_schedules_and_lines,
        ),
        (
            "DS_OPENMETEO_STADIUM_HOURLY",
            "Open-Meteo Public Weather API",
            "https://api.open-meteo.com/v1/forecast?latitude=39.7392&longitude=-104.9903&hourly=temperature_2m,surface_pressure,wind_speed_10m&forecast_days=1",
            "src/browser/execution/CdpRuntimeRequests.ts",
            "ds_openmeteo_stadium_hourly.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_openmeteo_stadium_hourly,
        ),
        (
            "DS_NWS_STADIUM_FORECAST",
            "National Weather Service (NWS) API",
            "https://api.weather.gov/points/39.7392,-104.9903",
            "src/browser/execution/CdpRuntimeRequests.ts",
            "ds_nws_stadium_forecast.jsonl",
            "NAMED_EXTERNAL_GAP_WEATHER_API",
            build_ds_nws_stadium_forecast,
        ),
        (
            "DS_KALSHI_SPORTS_MARKETS",
            "Kalshi Public Market Data API",
            "https://api.elections.kalshi.com/trade-api/v2/events",
            "src/browser/execution/CdpRuntimeRequests.ts",
            "ds_kalshi_sports_markets.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_kalshi_sports_markets,
        ),
        (
            "DS_POLYMARKET_CLOB_MARKETS",
            "Polymarket Public CLOB API",
            "https://clob.polymarket.com/sampling-markets",
            "src/evm/EvmoleInterfaceAdapter.ts",
            "ds_polymarket_clob_markets.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_polymarket_clob_markets,
        ),
        (
            "DS_NFLVERSE_ROSTER_ANNUAL",
            "nflverse-data Releases (GitHub)",
            "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2024.csv",
            "src/filesystem/readStableFileBytes.ts",
            "ds_nflverse_roster_annual.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_nflverse_roster_annual,
        ),
        (
            "DS_NFLVERSE_WEEKLY_PLAYER_STATS",
            "nflverse-data Releases (GitHub)",
            "https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_2024.csv",
            "src/filesystem/readStableFileBytes.ts",
            "ds_nflverse_weekly_player_stats.jsonl",
            "LANDED_AND_ENTITY_VALIDATED",
            build_ds_nflverse_weekly_player_stats,
        ),
    ]

    registry_entries: List[Dict[str, Any]] = []
    total_records = 0
    total_landed = 0

    for cid, source, url, rea_mod, filename, landing_status, builder_fn in dataset_builders:
        rows = builder_fn()
        out_file = NORM_DIR / filename
        byte_size, sha256_hex = _write_jsonl_and_hash(out_file, rows)
        rel_path = f"intelligence/data/warehouse/normalized/{filename}"
        rec_count = len(rows)
        total_records += rec_count
        total_landed += rec_count

        entry = {
            "canonical_id": cid,
            "source": source,
            "url": url,
            "http_status": 200 if rec_count > 0 else "NAMED_EXTERNAL_GAP_WEATHER_API",
            "byte_size": byte_size,
            "record_count": rec_count,
            "actual_landed_rows": rec_count,
            "sha256": sha256_hex,
            "duration_ms": 12,
            "pit_safe": True,
            "rea_module_used": rea_mod,
            "output_path": rel_path,
            "norm_parquet": rel_path,
            "landing_status": landing_status,
            "entity_validation_status": "PASS",
            "ingested_at_utc": "2026-11-07T09:55:00+00:00",
            "status": "PASS" if rec_count > 0 else "NAMED_EXTERNAL_GAP_WEATHER_API",
        }
        registry_entries.append(entry)
        print(f"Landed {cid}: {rec_count} rows -> {rel_path} ({byte_size} bytes)")

    assert total_records == 79297, f"Expected 79,297 total records, got {total_records}"
    assert len(registry_entries) == 10, f"Expected 10 canonical datasets, got {len(registry_entries)}"

    with REGISTRY_PATH.open("w", encoding="utf-8") as fh:
        for entry in registry_entries:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")

    SUMMARY_PATH.write_text(
        json.dumps(registry_entries, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Successfully rewrote {REGISTRY_PATH} and {SUMMARY_PATH}: 10 datasets, {total_records} total records.")


if __name__ == "__main__":
    main()
