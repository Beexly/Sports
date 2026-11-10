"""Nov 8, 2026 Morning Sweep External Charting Loader (`morning_sweep_2026_11_08.py`).

Loads and parses the 39 external charting CSV tables located in:
  `docs/research/2026-11-08/full-tables/*.csv`

Specifically parses:
  1. `sfdata-epa-previews-week9-2026.csv`:
     - Exact Week 9 spreads (`DET @ MIA` = `DET -7.0`, `NYJ @ KC` = `KC -7.5`, etc.)
     - Real offensive, defensive, and net EPA/play for all Week 9 matchups (`MIA` net EPA = -0.093 #32).
  2. `gridiron-matchup-cards-week9-2026.csv`:
     - Real team-level Points, Pass Yards, Rushing Yards by RB/QB, Receiving Yards by WR/TE/RB
       for vs-opponent projections (`DET` = 29.0 pts, `MIA` = 16.7 pts, `MIA` Pass Yards = 181.1).
  3. `gridiron-pressure-rate-allowed-2026.csv`:
     - Real 32-team offensive line pressure rate allowed % (`LAR` 15.8%, `MIA` 26.4%, `SEA` 28.1%).
  4. `omardouk-edge-prwr-2026.csv`:
     - Pass-rush win rate vs true pass sets (`Myles Garrett`, `Aidan Hutchinson`, `Will Anderson Jr.`, etc.).
"""

from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
NOV8_TABLES_DIR = REPO_ROOT / "docs" / "research" / "2026-11-08" / "full-tables"


def _parse_leading_float(val: Any, default: float = 0.0) -> float:
    """Extract leading signed float from strings like `-0.093 #32` or `29.0 #3`."""
    if val is None:
        return default
    s = str(val).strip()
    m = re.search(r"[-+]?\d+(?:\.\d+)?", s)
    if not m:
        return default
    try:
        return float(m.group(0))
    except ValueError:
        return default


def load_nov8_sfdata_epa_previews() -> Dict[str, Dict[str, Any]]:
    """Parse `sfdata-epa-previews-week9-2026.csv` keyed by `AWAY@HOME` (e.g., `DET@MIA`)."""
    csv_path = NOV8_TABLES_DIR / "sfdata-epa-previews-week9-2026.csv"
    out: Dict[str, Dict[str, Any]] = {}
    if not csv_path.exists():
        return out
    with csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            matchup_raw = str(row.get("matchup_away_at_home") or "").strip()
            if "@" in matchup_raw:
                parts = [p.strip().upper() for p in matchup_raw.split("@", 1)]
                away, home = parts[0], parts[1]
            else:
                away = str(row.get("away_team", "")).strip().upper()
                home = str(row.get("home_team", "")).strip().upper()
            if not away or not home:
                continue
            matchup_key = f"{away}@{home}"
            spread_total_raw = str(row.get("spread_total") or "").strip()
            if "/" in spread_total_raw:
                st_parts = [p.strip() for p in spread_total_raw.split("/", 1)]
                spread_away = _parse_leading_float(st_parts[0], 0.0)
                book_total = _parse_leading_float(st_parts[1], 45.5)
                book_spread_home = round(-spread_away, 1)
                fav_team = away if spread_away < 0 else home
                spread_mag = abs(spread_away)
            else:
                fav_str = str(row.get("favorite_and_spread", "")).strip()
                fav_parts = fav_str.split()
                fav_team = fav_parts[0].upper() if fav_parts else home
                spread_mag = abs(_parse_leading_float(fav_parts[1] if len(fav_parts) > 1 else "0.0", 0.0))
                book_spread_home = round(-spread_mag if fav_team == home else spread_mag, 1)
                book_total = 45.5
            entry = {
                "matchup": matchup_key,
                "away_team": away,
                "home_team": home,
                "favorite_team": fav_team,
                "spread_magnitude": spread_mag,
                "book_spread_home": book_spread_home,
                "book_total": book_total,
                "away_net_epa": _parse_leading_float(row.get("net_epa_away") or row.get("away_net_epa"), 0.0),
                "home_net_epa": _parse_leading_float(row.get("net_epa_home") or row.get("home_net_epa"), 0.0),
                "away_off_epa": _parse_leading_float(row.get("off_epa_away") or row.get("away_off_epa"), 0.0),
                "away_def_epa": _parse_leading_float(row.get("def_epa_away") or row.get("away_def_epa"), 0.0),
                "home_off_epa": _parse_leading_float(row.get("off_epa_home") or row.get("home_off_epa"), 0.0),
                "home_def_epa": _parse_leading_float(row.get("def_epa_home") or row.get("home_def_epa"), 0.0),
            }
            out[matchup_key] = entry
    return out


def load_nov8_gridiron_matchup_cards() -> Dict[str, Dict[str, Dict[str, float]]]:
    """Parse `gridiron-matchup-cards-week9-2026.csv` keyed by matchup and team (`DET`, `MIA`, etc.)."""
    csv_path = NOV8_TABLES_DIR / "gridiron-matchup-cards-week9-2026.csv"
    by_team: Dict[str, Dict[str, float]] = {}
    by_matchup: Dict[str, Dict[str, Dict[str, float]]] = {}
    if not csv_path.exists():
        return by_matchup
    with csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_game = str(row.get("game", "")).strip()
            team = str(row.get("team_offense") or row.get("team") or "").strip().upper()
            metric = str(row.get("metric_per_game") or row.get("metric") or "").strip()
            if not team or not metric:
                continue
            team_avg = _parse_leading_float(row.get("offense_value") or row.get("team_avg"), 0.0)
            opp_avg = _parse_leading_float(row.get("opponent_allowed_value") or row.get("vs_opp_avg"), team_avg)
            blended = round(0.55 * team_avg + 0.45 * opp_avg, 2)
            t_dict = by_team.setdefault(team, {})
            t_dict[f"{metric}_team_avg"] = team_avg
            t_dict[f"{metric}_vs_opp_avg"] = opp_avg
            t_dict[f"{metric}_blended"] = blended
            if raw_game:
                m_dict = by_matchup.setdefault(raw_game, {})
                m_dict[team] = t_dict
    return by_matchup


def load_nov8_pressure_rates_allowed() -> Dict[str, float]:
    """Parse `gridiron-pressure-rate-allowed-2026.csv` -> `{team: pressure_rate_decimal}`."""
    csv_path = NOV8_TABLES_DIR / "gridiron-pressure-rate-allowed-2026.csv"
    out: Dict[str, float] = {}
    if not csv_path.exists():
        return out
    with csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tm = str(row.get("team", "")).strip().upper()
            pct = _parse_leading_float(row.get("pressure_rate_allowed_pct"), 22.0)
            if tm:
                out[tm] = round(pct / 100.0, 4)
    return out


def load_nov8_edge_prwr() -> List[Dict[str, Any]]:
    """Parse `omardouk-edge-prwr-2026.csv`."""
    csv_path = NOV8_TABLES_DIR / "omardouk-edge-prwr-2026.csv"
    out: List[Dict[str, Any]] = []
    if not csv_path.exists():
        return out
    with csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            out.append(
                {
                    "player": str(row.get("player") or row.get("player_name") or "").strip(),
                    "team": str(row.get("team", "")).strip().upper(),
                    "true_pass_set_snaps": int(_parse_leading_float(row.get("plays") or row.get("true_pass_set_rush_snaps"), 100)),
                    "prwr_pct": _parse_leading_float(row.get("prwr_pct") or row.get("pass_rush_win_rate_pct"), 18.0),
                }
            )
    return out


def load_all_nov8_morning_sweep_summary() -> Dict[str, Any]:
    """Load summary and parsed tables for all CSVs in `docs/research/2026-11-08/full-tables/`."""
    csv_files = sorted(NOV8_TABLES_DIR.glob("*.csv")) if NOV8_TABLES_DIR.exists() else []
    row_counts: Dict[str, int] = {}
    for p in csv_files:
        try:
            with p.open("r", encoding="utf-8-sig") as f:
                row_counts[p.name] = max(0, sum(1 for _ in f) - 1)
        except OSError:
            row_counts[p.name] = 0

    epa_previews = load_nov8_sfdata_epa_previews()
    matchup_cards = load_nov8_gridiron_matchup_cards()
    pressure_rates = load_nov8_pressure_rates_allowed()
    edge_prwr = load_nov8_edge_prwr()

    # Flatten team matchup card lookup
    team_cards: Dict[str, Dict[str, float]] = {}
    for _, teams_map in matchup_cards.items():
        for tm, metrics in teams_map.items():
            team_cards[tm] = metrics

    return {
        "sweep_date": "2026-11-08",
        "tables_dir": str(NOV8_TABLES_DIR),
        "csv_files_count": len(csv_files),
        "total_rows_across_csvs": sum(row_counts.values()),
        "table_row_counts": row_counts,
        "sfdata_epa_previews_by_matchup": epa_previews,
        "gridiron_matchup_cards_by_team": team_cards,
        "pressure_rate_allowed_by_team": pressure_rates,
        "omardouk_edge_prwr": edge_prwr,
    }


load_nov8_pressure_rate_allowed = load_nov8_pressure_rates_allowed
load_nov8_ol_pressure_rate_allowed = load_nov8_pressure_rates_allowed
