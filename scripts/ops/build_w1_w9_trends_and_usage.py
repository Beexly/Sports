#!/usr/bin/env python3
"""
Builds the 2026 Weeks 1-9 (requested) Usage, Route, Trench, Pace, Coverage Shell,
N_eff & Conditional-Split Synthesis + Week 10 Stadium Weather from REAL local data:

  1. intelligence/coaching/data/play_by_play_2026.parquet
  2. intelligence/coaching/data/ftn_charting_2026.parquet
  3. intelligence/coaching/data/snap_counts_2026.parquet
  4. docs/research/2026-10-28/full-tables/fball-insights-defensive-coverage-usage-weeks1-7-2026.csv
  5. docs/research/2026-10-28/full-tables/courseiq-simulated-box-score-car-gb-tnf-2026.csv
  6. Week 10 schedule: intelligence/coaching/data/schedule.csv (season 2026 wk 10)
     -> fallback data/engine/sources/neon_week10_schedule_2026.json (Neon read-only snapshot)
     -> fallback/cross-check data/engine/espn_2026_week10_scoreboard.json
  7. Weather: Open-Meteo free forecast API (historical-forecast API for games already
     in the past). Munich NE@DET uses Allianz Arena (48.2188, 11.6247), NOT Detroit.

ZERO-FABRICATION CONTRACT:
  - Every number derives from the parquet/CSV sources or a live Open-Meteo response.
  - Missing coverage => explicit null + a top-level dataGaps entry. No legacy
    hardcoded fallback rates are carried forward.
  - Per-game rates divide by the ACTIVE player's own games played (player_games()).
  - True coverage is reported (weeks_covered / *_weeks_covered / pbp_max_game_date);
    if the PBP does not reach Week 9 MNF (2026-11-09) the shortfall is recorded in
    dataGaps and printed prominently.

Output: data/engine/nfl_2026_w1_w9_trends_and_usage.json
Successor to scripts/ops/build_w1_w7_usage_route_trench_trends.py (left untouched).
"""
from __future__ import annotations

import datetime as dt
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
COACH_DIR = REPO / "intelligence" / "coaching" / "data"
TABLES_DIR = REPO / "docs" / "research" / "2026-10-28" / "full-tables"
ENGINE_DIR = REPO / "data" / "engine"
OUT_JSON = ENGINE_DIR / "nfl_2026_w1_w9_trends_and_usage.json"

SEASON = 2026
WEEKS_REQUESTED = list(range(1, 10))
W10_WINDOW_START = "2026-11-13"
W10_WINDOW_END = "2026-11-18"

# Conditional-split minimum samples (below threshold => null, recorded in dataGaps)
MIN_PLAYS_SCRIPT = 30
MIN_DROPBACKS_SCRIPT = 30
MIN_DROPBACKS_DOWN = 20

NICKNAME_TO_ABBR = {
    "Cardinals": "ARI", "Falcons": "ATL", "Ravens": "BAL", "Bills": "BUF",
    "Panthers": "CAR", "Bears": "CHI", "Bengals": "CIN", "Browns": "CLE",
    "Cowboys": "DAL", "Broncos": "DEN", "Lions": "DET", "Packers": "GB",
    "Texans": "HOU", "Colts": "IND", "Jaguars": "JAX", "Chiefs": "KC",
    "Raiders": "LV", "Chargers": "LAC", "Rams": "LAR", "Dolphins": "MIA",
    "Vikings": "MIN", "Patriots": "NE", "Saints": "NO", "Giants": "NYG",
    "Jets": "NYJ", "Eagles": "PHI", "Steelers": "PIT", "49ers": "SF",
    "Seahawks": "SEA", "Buccaneers": "TB", "Titans": "TEN", "Commanders": "WAS",
}
FULL_NAME_TO_ABBR = {
    "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
    "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
    "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
    "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN", "Washington Commanders": "WAS",
}
ABBR_ALIAS = {"WSH": "WAS", "LA": "LAR"}

FORCED_FULL_NAMES = {
    ("GB", "J.Love"): "Jordan Love",
    ("ARI", "J.Love"): "Jeremiyah Love",
    ("DEN", "J.Waddle"): "Jaylen Waddle",
    ("KC", "K.Walker"): "Kenneth Walker",
}

# Static public-reference NFL stadium coordinates + roof classification.
# roof: outdoor | dome | retractable (dome/retractable treated as indoor, weather null).
STADIUMS = {
    "ARI": {"stadium": "State Farm Stadium", "city": "Glendale, AZ", "lat": 33.5276, "lon": -112.2626, "roof": "retractable"},
    "ATL": {"stadium": "Mercedes-Benz Stadium", "city": "Atlanta, GA", "lat": 33.7554, "lon": -84.4010, "roof": "retractable"},
    "BAL": {"stadium": "M&T Bank Stadium", "city": "Baltimore, MD", "lat": 39.2780, "lon": -76.6227, "roof": "outdoor"},
    "BUF": {"stadium": "Highmark Stadium", "city": "Orchard Park, NY", "lat": 42.7738, "lon": -78.7870, "roof": "outdoor"},
    "CAR": {"stadium": "Bank of America Stadium", "city": "Charlotte, NC", "lat": 35.2258, "lon": -80.8528, "roof": "outdoor"},
    "CHI": {"stadium": "Soldier Field", "city": "Chicago, IL", "lat": 41.8623, "lon": -87.6167, "roof": "outdoor"},
    "CIN": {"stadium": "Paycor Stadium", "city": "Cincinnati, OH", "lat": 39.0955, "lon": -84.5161, "roof": "outdoor"},
    "CLE": {"stadium": "Huntington Bank Field", "city": "Cleveland, OH", "lat": 41.5061, "lon": -81.6995, "roof": "outdoor"},
    "DAL": {"stadium": "AT&T Stadium", "city": "Arlington, TX", "lat": 32.7473, "lon": -97.0945, "roof": "retractable"},
    "DEN": {"stadium": "Empower Field at Mile High", "city": "Denver, CO", "lat": 39.7439, "lon": -105.0201, "roof": "outdoor"},
    "DET": {"stadium": "Ford Field", "city": "Detroit, MI", "lat": 42.3400, "lon": -83.0456, "roof": "dome"},
    "GB": {"stadium": "Lambeau Field", "city": "Green Bay, WI", "lat": 44.5013, "lon": -88.0622, "roof": "outdoor"},
    "HOU": {"stadium": "NRG Stadium", "city": "Houston, TX", "lat": 29.6847, "lon": -95.4107, "roof": "retractable"},
    "IND": {"stadium": "Lucas Oil Stadium", "city": "Indianapolis, IN", "lat": 39.7601, "lon": -86.1639, "roof": "retractable"},
    "JAX": {"stadium": "EverBank Stadium", "city": "Jacksonville, FL", "lat": 30.3239, "lon": -81.6373, "roof": "outdoor"},
    "KC": {"stadium": "GEHA Field at Arrowhead Stadium", "city": "Kansas City, MO", "lat": 39.0489, "lon": -94.4839, "roof": "outdoor"},
    "LV": {"stadium": "Allegiant Stadium", "city": "Las Vegas, NV", "lat": 36.0909, "lon": -115.1833, "roof": "dome"},
    "LAR": {"stadium": "SoFi Stadium", "city": "Inglewood, CA", "lat": 33.9535, "lon": -118.3392, "roof": "dome"},
    "LAC": {"stadium": "SoFi Stadium", "city": "Inglewood, CA", "lat": 33.9535, "lon": -118.3392, "roof": "dome"},
    "MIA": {"stadium": "Hard Rock Stadium", "city": "Miami Gardens, FL", "lat": 25.9580, "lon": -80.2389, "roof": "outdoor"},
    "MIN": {"stadium": "U.S. Bank Stadium", "city": "Minneapolis, MN", "lat": 44.9736, "lon": -93.2575, "roof": "dome"},
    "NE": {"stadium": "Gillette Stadium", "city": "Foxborough, MA", "lat": 42.0909, "lon": -71.2643, "roof": "outdoor"},
    "NO": {"stadium": "Caesars Superdome", "city": "New Orleans, LA", "lat": 29.9511, "lon": -90.0812, "roof": "dome"},
    "NYG": {"stadium": "MetLife Stadium", "city": "East Rutherford, NJ", "lat": 40.8135, "lon": -74.0744, "roof": "outdoor"},
    "NYJ": {"stadium": "MetLife Stadium", "city": "East Rutherford, NJ", "lat": 40.8135, "lon": -74.0744, "roof": "outdoor"},
    "PHI": {"stadium": "Lincoln Financial Field", "city": "Philadelphia, PA", "lat": 39.9008, "lon": -75.1675, "roof": "outdoor"},
    "PIT": {"stadium": "Acrisure Stadium", "city": "Pittsburgh, PA", "lat": 40.4468, "lon": -80.0158, "roof": "outdoor"},
    "SF": {"stadium": "Levi's Stadium", "city": "Santa Clara, CA", "lat": 37.4033, "lon": -121.9694, "roof": "outdoor"},
    "SEA": {"stadium": "Lumen Field", "city": "Seattle, WA", "lat": 47.5952, "lon": -122.3316, "roof": "outdoor"},
    "TB": {"stadium": "Raymond James Stadium", "city": "Tampa, FL", "lat": 27.9759, "lon": -82.5033, "roof": "outdoor"},
    "TEN": {"stadium": "Nissan Stadium", "city": "Nashville, TN", "lat": 36.1665, "lon": -86.7713, "roof": "outdoor"},
    "WAS": {"stadium": "Northwest Stadium", "city": "Landover, MD", "lat": 38.9076, "lon": -76.8645, "roof": "outdoor"},
}
# 2026 Week 10 international game: NE @ DET is played in Munich, NOT Detroit.
MUNICH_VENUE = {"stadium": "Allianz Arena (FC Bayern Munich Stadium)", "city": "Munich, Germany",
                "lat": 48.2188, "lon": 11.6247, "roof": "outdoor"}


# ---------------------------------------------------------------- utilities
def _initial_key(full_name: str) -> str:
    parts = str(full_name).replace(".", " ").split()
    suffixes = {"II", "III", "IV", "JR", "SR", "JR."}
    if len(parts) >= 3 and parts[-1].upper().rstrip(".") in suffixes:
        parts = parts[:-1]
    if len(parts) < 2 or not parts[0]:
        return str(full_name)
    return f"{parts[0][0].upper()}.{parts[-1]}"


def build_name_index(snaps: pd.DataFrame) -> dict:
    index: dict[tuple[str, str], set[str]] = {}
    for team, player in snaps[["team", "player"]].drop_duplicates().itertuples(index=False):
        index.setdefault((str(team), _initial_key(player)), set()).add(str(player))
    return index


def display_name(team: str, initial: str, index: dict) -> str:
    forced = FORCED_FULL_NAMES.get((team, initial))
    if forced:
        return forced
    cands = index.get((team, initial), set())
    if len(cands) == 1:
        name = next(iter(cands))
        if name == "Kenneth Walker III":
            return "Kenneth Walker"
        return name
    return initial


def player_games(team: str, shown_name: str, player_rows: pd.DataFrame, snaps: pd.DataFrame) -> int:
    """ACTIVE player's own games played (snap-count based, PBP fallback). Never team GP."""
    pbp_gp = max(1, int(player_rows["game_id"].nunique())) if len(player_rows) else 1
    snap_rows = snaps[(snaps["team"] == team) & (snaps["player"] == shown_name)]
    if len(snap_rows) == 0 and shown_name == "Kenneth Walker":
        snap_rows = snaps[(snaps["team"] == team) & snaps["player"].astype(str).str.startswith("Kenneth Walker")]
    if len(snap_rows):
        return max(1, int(snap_rows["game_id"].nunique()))
    return pbp_gp


def _safe_rate(num: float, den: float):
    if not den:
        return None
    return round(float(num) / float(den), 4)


def jround(x, n: int = 3):
    if x is None:
        return None
    try:
        xf = float(x)
    except (TypeError, ValueError):
        return None
    if math.isnan(xf) or math.isinf(xf):
        return None
    return round(xf, n)


def norm_team(t: str) -> str:
    if not isinstance(t, str):
        return ""
    t = t.strip().upper()
    return ABBR_ALIAS.get(t, t)


def _clean(o):
    """Recursively convert numpy scalars / NaN to JSON-safe values."""
    if isinstance(o, dict):
        return {str(k): _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return None if np.isnan(o) else float(o)
    if isinstance(o, np.bool_):
        return bool(o)
    if isinstance(o, float):
        return None if (math.isnan(o) or math.isinf(o)) else o
    if isinstance(o, (dt.datetime, dt.date)):
        return o.isoformat()
    return o


def week_coverage(df: pd.DataFrame) -> dict:
    weeks = sorted(int(w) for w in df["week"].dropna().unique()) if "week" in df.columns else []
    by_week = {int(k): int(v) for k, v in df["week"].value_counts().sort_index().items()} if "week" in df.columns else {}
    return {"weeks": weeks, "rows_by_week": by_week}


def script_bucket_off(diff: float) -> str:
    """Offense perspective. leading >= +8, trailing <= -8, else neutral."""
    if diff >= 8:
        return "leading"
    if diff <= -8:
        return "trailing"
    return "neutral"


# ---------------------------------------------------------------- weather
def fetch_open_meteo(lat: float, lon: float, past: bool, commence: dt.datetime):
    """Live Open-Meteo call (free, no key). Future games: forecast_days=7. Games
    already in the past: same forecast API with past_days=2 (covers recent days);
    if the kickoff hour is still absent, fall back to the historical-forecast API."""
    hourly = "temperature_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m"
    base = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat, "longitude": lon, "hourly": hourly,
        "forecast_days": 7, "timezone": "auto",
    }
    if past:
        params["past_days"] = 2
    url = base + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "gse-trends-builder/1.0 (research)"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if "hourly" not in data:
        raise RuntimeError(f"Open-Meteo response missing hourly: {str(data)[:200]}")
    if past:
        offset = int(data.get("utc_offset_seconds", 0))
        hour_key = (commence + dt.timedelta(seconds=offset)).strftime("%Y-%m-%dT%H:00")
        if hour_key not in data["hourly"]["time"]:
            hbase = "https://historical-forecast-api.open-meteo.com/v1/forecast"
            hparams = {
                "latitude": lat, "longitude": lon, "hourly": hourly,
                "start_date": (commence - dt.timedelta(days=1)).date().isoformat(),
                "end_date": (commence + dt.timedelta(days=1)).date().isoformat(),
                "timezone": "auto",
            }
            hurl = hbase + "?" + urllib.parse.urlencode(hparams)
            hreq = urllib.request.Request(hurl, headers={"User-Agent": "gse-trends-builder/1.0 (research)"})
            with urllib.request.urlopen(hreq, timeout=45) as resp:
                hdata = json.loads(resp.read().decode("utf-8"))
            if "hourly" in hdata and hour_key in hdata["hourly"]["time"]:
                return hdata, hurl
    return data, url


def extract_window(data: dict, commence: dt.datetime) -> dict:
    """Kickoff hour + 4 hourly samples (~3.5h game window) in venue-local time."""
    offset = int(data.get("utc_offset_seconds", 0))
    local_tz = dt.timezone(dt.timedelta(seconds=offset))
    local_kick = (commence + dt.timedelta(seconds=offset)).replace(tzinfo=local_tz)
    hour_key = local_kick.strftime("%Y-%m-%dT%H:00")
    h = data["hourly"]
    times = h["time"]
    if hour_key not in times:
        return {"available": False, "reason": f"kickoff hour {hour_key} not in API response",
                "localKickoff": local_kick.isoformat()}
    i = times.index(hour_key)
    idxs = [j for j in range(i, min(i + 4, len(times)))]

    def vals(key):
        return [h[key][j] for j in idxs if h[key][j] is not None]

    temps = vals("temperature_2m")
    precip = vals("precipitation_probability")
    wind = vals("wind_speed_10m")
    gust = vals("wind_gusts_10m")
    return {
        "available": True,
        "timezone": data.get("timezone"),
        "localKickoff": local_kick.isoformat(),
        "windowHours": [times[j] for j in idxs],
        "kickoff": {
            "temperature_2m_c": h["temperature_2m"][i],
            "precipitation_probability_pct": h["precipitation_probability"][i],
            "wind_speed_10m_kmh": h["wind_speed_10m"][i],
            "wind_gusts_10m_kmh": h["wind_gusts_10m"][i],
        },
        "gameWindow": {
            "temperature_2m_min_c": min(temps) if temps else None,
            "temperature_2m_max_c": max(temps) if temps else None,
            "precipitation_probability_max_pct": max(precip) if precip else None,
            "wind_speed_10m_max_kmh": max(wind) if wind else None,
            "wind_gusts_10m_max_kmh": max(gust) if gust else None,
        },
    }


def _canon_ts(t) -> str | None:
    """Canonical UTC timestamp so Neon ('...T18:00:00Z') and ESPN ('...T18:00Z') compare equal."""
    if not t:
        return None
    d = dt.datetime.fromisoformat(str(t).replace(" ", "T").replace("Z", "+00:00"))
    return d.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_week10_schedule(data_gaps: list) -> tuple[list, str, str]:
    """schedule.csv (2026 wk10) -> Neon snapshot -> ESPN scoreboard. Returns
    (games, source_used, cross_check_note). Games: away/home abbr + commenceTimeUtc."""
    games: list = []
    source = ""
    cross = ""

    sch_path = COACH_DIR / "schedule.csv"
    if sch_path.exists():
        sch = pd.read_csv(sch_path)
        s26w10 = sch[(sch["season"] == SEASON) & (sch["week"] == 10)]
        if len(s26w10):
            seen = set()
            for _, r in s26w10.iterrows():
                team, opp = norm_team(str(r["team"])), norm_team(str(r["opponent"]))
                key = tuple(sorted((team, opp)))
                if key in seen:
                    continue
                seen.add(key)
                games.append({"away": opp, "home": team, "commenceTimeUtc": None})
            source = "intelligence/coaching/data/schedule.csv (season 2026, week 10; no commence times in this source)"

    neon_path = ENGINE_DIR / "sources" / "neon_week10_schedule_2026.json"
    espn_path = ENGINE_DIR / "espn_2026_week10_scoreboard.json"
    neon_games: list = []
    if neon_path.exists():
        snap = json.loads(neon_path.read_text(encoding="utf-8"))
        for g in snap.get("games", []):
            home = FULL_NAME_TO_ABBR.get(str(g.get("homeTeamName", "")).strip())
            away = FULL_NAME_TO_ABBR.get(str(g.get("awayTeamName", "")).strip())
            if home and away:
                neon_games.append({"away": away, "home": home, "commenceTimeUtc": _canon_ts(g["commenceTime"])})
    espn_games: list = []
    if espn_path.exists():
        ed = json.loads(espn_path.read_text(encoding="utf-8"))
        for e in ed.get("events", []):
            comp = e.get("competitions", [{}])[0]
            abbr = {c.get("homeAway"): c.get("team", {}).get("abbreviation") for c in comp.get("competitors", [])}
            home, away = norm_team(abbr.get("home", "")), norm_team(abbr.get("away", ""))
            if home and away:
                espn_games.append({"away": away, "home": home, "commenceTimeUtc": _canon_ts(e.get("date")),
                                   "venueRaw": comp.get("venue", {}).get("fullName")})

    if not games and neon_games:
        games = neon_games
        source = f"data/engine/sources/neon_week10_schedule_2026.json (Neon read-only snapshot, fetched {json.loads(neon_path.read_text(encoding='utf-8')).get('fetchedAt')})"
    if not games and espn_games:
        games = espn_games
        source = "data/engine/espn_2026_week10_scoreboard.json (ESPN scoreboard snapshot)"
        data_gaps.append({
            "source": "schedule.csv / Neon",
            "gap": "Week 10 schedule taken from ESPN scoreboard snapshot fallback.",
            "impact": "stadiumWeather schedule provenance",
        })
    if neon_games and espn_games:
        n_set = {(g["away"], g["home"], g["commenceTimeUtc"]) for g in neon_games}
        e_set = {(g["away"], g["home"], g["commenceTimeUtc"]) for g in espn_games}
        cross = (f"Neon snapshot vs ESPN scoreboard: {len(n_set & e_set)}/{len(n_set)} games agree "
                 f"on teams + UTC commence time" + ("" if n_set == e_set else f"; differences: {sorted(n_set ^ e_set)}"))
    if not games:
        data_gaps.append({
            "source": "schedule.csv / Neon snapshot / ESPN scoreboard",
            "gap": "No Week 10 (2026-11-13..2026-11-18) schedule available from any source.",
            "impact": "stadiumWeather section empty",
        })
    return games, source, cross


def build_stadium_weather(data_gaps: list) -> dict:
    games, source, cross = load_week10_schedule(data_gaps)
    now = dt.datetime.now(dt.timezone.utc)
    venues_out: list = []
    cache: dict = {}
    fetched = indoor = nulls = 0

    for g in games:
        away, home = g["away"], g["home"]
        is_munich = (away == "NE" and home == "DET")
        venue = MUNICH_VENUE if is_munich else STADIUMS.get(home)
        entry = {
            "game": f"{away}@{home}", "away": away, "home": home,
            "commenceTimeUtc": g.get("commenceTimeUtc"),
            "stadium": venue["stadium"] if venue else None,
            "city": venue["city"] if venue else None,
            "lat": venue["lat"] if venue else None,
            "lon": venue["lon"] if venue else None,
            "roof": venue["roof"] if venue else None,
            "indoor": (venue["roof"] in ("dome", "retractable")) if venue else None,
            "fetchedAt": None, "sourceUrl": None, "api": None,
            "kickoff": None, "gameWindow": None,
        }
        if is_munich:
            entry["venueNote"] = "International series: NE@DET played at Allianz Arena, Munich (not Ford Field, Detroit)."
        if venue is None:
            entry["dataGap"] = f"No stadium reference entry for home team {home}"
            data_gaps.append({"source": "stadium reference table", "gap": entry["dataGap"], "impact": f"stadiumWeather {entry['game']}"})
            nulls += 1
            venues_out.append(entry)
            continue
        if entry["indoor"]:
            entry["weatherNote"] = "Dome/retractable roof — indoor venue, weather not applicable (null)."
            indoor += 1
            venues_out.append(entry)
            continue
        commence_str = g.get("commenceTimeUtc")
        if not commence_str:
            entry["dataGap"] = "No commence time available for this game; cannot select forecast window."
            data_gaps.append({"source": "schedule", "gap": entry["dataGap"], "impact": f"stadiumWeather {entry['game']}"})
            nulls += 1
            venues_out.append(entry)
            continue
        commence = dt.datetime.fromisoformat(commence_str.replace("Z", "+00:00"))
        past = commence < now
        cache_key = (venue["lat"], venue["lon"], past)
        try:
            if cache_key not in cache:
                cache[cache_key] = fetch_open_meteo(venue["lat"], venue["lon"], past, commence)
            data, url = cache[cache_key]
            win = extract_window(data, commence)
            entry["fetchedAt"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
            entry["sourceUrl"] = url
            entry["api"] = ("open-meteo historical-forecast (past game)" if "historical-forecast-api" in url
                            else "open-meteo forecast v1 (forecast_days=7" + (", past_days=2 for past kickoff" if past else "") + ")")
            if win.get("available"):
                entry["kickoff"] = win["kickoff"]
                entry["gameWindow"] = {
                    "timezone": win.get("timezone"),
                    "localKickoff": win.get("localKickoff"),
                    "windowHours": win.get("windowHours"),
                    **win.get("gameWindow", {}),
                }
                fetched += 1
            else:
                entry["dataGap"] = win.get("reason", "forecast window unavailable")
                data_gaps.append({"source": "Open-Meteo", "gap": f"{entry['game']}: {entry['dataGap']}", "impact": "stadiumWeather kickoff/gameWindow null"})
                nulls += 1
        except Exception as exc:  # network failure => null + gap, never fabricate
            entry["dataGap"] = f"Open-Meteo fetch failed: {type(exc).__name__}: {exc}"
            data_gaps.append({"source": "Open-Meteo", "gap": f"{entry['game']} ({venue['stadium']}): {exc}", "impact": "stadiumWeather null"})
            nulls += 1
        venues_out.append(entry)

    return {
        "slate": "2026 Week 10",
        "windowUtc": {"start": W10_WINDOW_START, "end": W10_WINDOW_END},
        "scheduleSource": source,
        "scheduleCrossCheck": cross,
        "units": {"temperature": "degC", "wind": "km/h", "precipitation_probability": "%"},
        "gameWindowDefinition": "kickoff hour + next 3 hourly samples (~3.5h game duration), venue-local time",
        "venues": venues_out,
        "venuesFetched": fetched,
        "venuesIndoorNull": indoor,
        "venuesFailedNull": nulls,
    }


# ---------------------------------------------------------------- main
def main():
    data_gaps: list = []
    notes: list = [
        "Zero-fabrication build: every value derives from the listed parquet/CSV sources or a live Open-Meteo response; missing coverage is null + dataGaps.",
        "Per-game player rates divide by the active player's own games played (snap-count based player_games(), PBP fallback).",
        "neutral_sec_per_snap is a derived pace estimate: clamp(1800/plays_per_game - 2.1, 23.8, 31.5) — formula carried from the W1-7 generator, computed from real plays_per_game.",
        "Conditional script buckets (offense perspective): leading = score_differential >= +8, trailing <= -8, neutral |diff| < 8. Defense script is the mirror. Minimum samples: 30 plays (pass-rate splits), 30 dropbacks (blitz-by-script), 20 dropbacks (blitz-by-down); below threshold => null.",
        "FTN charting has no man/zone coverage-scheme column; man-coverage-by-down is null (see dataGaps). Coverage-shell percentages come from the W1-7 fball-insights research CSV.",
    ]

    pbp = pd.read_parquet(COACH_DIR / "play_by_play_2026.parquet")
    ftn = pd.read_parquet(COACH_DIR / "ftn_charting_2026.parquet")
    snaps = pd.read_parquet(COACH_DIR / "snap_counts_2026.parquet")

    pbp_cov, ftn_cov, snap_cov = week_coverage(pbp), week_coverage(ftn), week_coverage(snaps)
    max_date = str(pbp["game_date"].max()) if "game_date" in pbp.columns else None

    print("=== SOURCE COVERAGE (verified from data) ===")
    print(f"PBP  rows={len(pbp)} weeks={pbp_cov['weeks']} max_game_date={max_date}")
    print(f"     rows_by_week={pbp_cov['rows_by_week']}")
    print(f"FTN  rows={len(ftn)} weeks={ftn_cov['weeks']} rows_by_week={ftn_cov['rows_by_week']}")
    print(f"SNAP rows={len(snaps)} weeks={snap_cov['weeks']} rows_by_week={snap_cov['rows_by_week']}")

    if max_date is None or max_date < "2026-11-09":
        print(f"*** SHORTFALL: PBP max game_date {max_date} < 2026-11-09 (Week 9 MNF). "
              f"Artifact emitted with TRUE coverage {pbp_cov['weeks']}; W8-9 fields null + dataGaps. ***")
        data_gaps.append({
            "source": "intelligence/coaching/data/play_by_play_2026.parquet",
            "gap": f"PBP covers only weeks {pbp_cov['weeks']} (max game_date {max_date}); does NOT reach Week 9 MNF 2026-11-09. "
                   f"The recent refresh extended W1-5 -> W1-7 (bak-pre-refresh: 13,842 rows through W5) and added columns, not W8-9 rows. "
                   f"Partial W8 exists only in docs/research/2026-10-30/signal-pack/data/play_by_play_2026.csv.gz (188 rows, 1 game CAR@GB TNF, max 2026-10-29) — not merged.",
            "impact": "All full-period fields are W1-7; weeks_covered reflects true coverage; off_epa_w8_w9 / def_epa_w8_w9 / comp_rate_w8_w9 / off_trend_delta_w89_vs_w17 are null. No W1-9 values are fabricated or carried forward.",
        })
    missing_pbp_weeks = sorted(set(WEEKS_REQUESTED) - set(pbp_cov["weeks"]))
    if not missing_pbp_weeks:
        pass  # full coverage; no gap
    if ftn_cov["weeks"] != pbp_cov["weeks"] or set(ftn_cov["weeks"]) < set(WEEKS_REQUESTED):
        data_gaps.append({
            "source": "intelligence/coaching/data/ftn_charting_2026.parquet",
            "gap": f"FTN human charting covers only weeks {ftn_cov['weeks']} ({len(ftn)} rows); no W8-9 charting.",
            "impact": "FTN-dependent fields (motion_pct, play_action_pct, rpo_pct, screen_pct, def_blitz_rate_pct, box defenders, conditional blitz splits) computed over true FTN coverage; ftn_weeks_covered labels it.",
        })
    if set(snap_cov["weeks"]) < set(WEEKS_REQUESTED):
        data_gaps.append({
            "source": "intelligence/coaching/data/snap_counts_2026.parquet",
            "gap": f"Snap counts cover only weeks {snap_cov['weeks']} ({len(snaps)} rows); no W8-9 snap rows.",
            "impact": "player_games() denominators reflect W1-7 active-player games; W8-9 usage cannot be computed.",
        })

    pbp["posteam"] = pbp["posteam"].astype(str).map(norm_team)
    pbp["defteam"] = pbp["defteam"].astype(str).map(norm_team)

    ftn_cols = [
        "nflverse_game_id", "nflverse_play_id", "n_defense_box", "is_no_huddle",
        "is_motion", "is_play_action", "is_screen_pass", "is_rpo",
        "is_qb_out_of_pocket", "is_catchable_ball", "is_contested_ball",
        "n_blitzers", "n_pass_rushers",
    ]
    ftn_sub = ftn[[c for c in ftn_cols if c in ftn.columns]].drop_duplicates(
        subset=["nflverse_game_id", "nflverse_play_id"]
    )
    merged = pbp.merge(
        ftn_sub, left_on=["game_id", "play_id"],
        right_on=["nflverse_game_id", "nflverse_play_id"], how="left",
    )
    scrim = merged[
        merged["posteam"].isin(set(NICKNAME_TO_ABBR.values()))
        & ((merged["pass"] == 1) | (merged["rush"] == 1))
    ].copy()
    scrim["script_off"] = scrim["score_differential"].map(
        lambda d: script_bucket_off(float(d)) if pd.notna(d) else None
    )

    # Coverage shells (W1-7 research CSV — vintage explicit in field name)
    cov_w17: dict = {}
    cov_path = TABLES_DIR / "fball-insights-defensive-coverage-usage-weeks1-7-2026.csv"
    if cov_path.exists():
        cdf = pd.read_csv(cov_path)
        for _, r in cdf.iterrows():
            ab = NICKNAME_TO_ABBR.get(str(r["team"]).strip(), "")
            if ab:
                cov_w17[ab] = {
                    "cov0_pct": float(r["cov0_pct"]), "cov1_pct": float(r["cov1_pct"]),
                    "cov2_pct": float(r["cov2_pct"]), "cov3_pct": float(r["cov3_pct"]),
                    "cov4_pct": float(r["cov4_pct"]), "cov6_pct": float(r["cov6_pct"]),
                    "two_high_shell_pct": round(float(r["cov2_pct"]) + float(r["cov4_pct"]) + float(r["cov6_pct"]), 1),
                    "single_high_shell_pct": round(float(r["cov1_pct"]) + float(r["cov3_pct"]), 1),
                    "epa_per_db_allowed": float(r["epa_per_db"]),
                }
        data_gaps.append({
            "source": "docs/research/2026-10-28/full-tables/fball-insights-defensive-coverage-usage-weeks1-7-2026.csv",
            "gap": "Coverage-shell research CSV is W1-7 vintage only; no W8-9 refresh exists in the repo.",
            "impact": "coverage_shells_w1_w7 kept under its true-coverage name; no W8-9 shell values invented.",
        })
    else:
        data_gaps.append({
            "source": "fball-insights-defensive-coverage-usage-weeks1-7-2026.csv",
            "gap": "Coverage shell CSV missing.",
            "impact": "coverage_shells_w1_w7 empty for all teams.",
        })

    # FTN man/zone coverage field probe (conditional hook support)
    man_cols = [c for c in ftn.columns if c in ("is_man_coverage", "coverage_scheme", "man_coverage", "is_zone_coverage")]
    has_man_field = len(man_cols) > 0
    if not has_man_field:
        data_gaps.append({
            "source": "intelligence/coaching/data/ftn_charting_2026.parquet",
            "gap": "FTN charting has no man/zone coverage-scheme column (checked: is_man_coverage / coverage_scheme / man_coverage / is_zone_coverage all absent).",
            "impact": "conditional_splits.man_coverage_rate_by_down is null for every team; blitz-by-down and blitz-by-script ARE computed from n_blitzers.",
        })

    teams_out: dict = {}
    all_teams = sorted(set(NICKNAME_TO_ABBR.values()))
    snaps = snaps.copy()
    snaps["team"] = snaps["team"].astype(str).map(norm_team)
    name_index = build_name_index(snaps)
    suppressed_splits: list = []

    for team in all_teams:
        off = scrim[scrim["posteam"] == team]
        dfn = scrim[scrim["defteam"] == team]
        off_w15 = off[off["week"] <= 5]
        off_w67 = off[(off["week"] >= 6) & (off["week"] <= 7)]
        off_w7 = off[off["week"] == 7]
        dfn_w67 = dfn[(dfn["week"] >= 6) & (dfn["week"] <= 7)]

        games_played = max(1, int(off["game_id"].nunique()))
        neutral_off = off[(off["qtr"] <= 3) & (off["score_differential"].abs() <= 10)]
        first10_off = off[(off["down"] == 1) & (off["ydstogo"] == 10)]

        off_epa = float(off["epa"].mean()) if len(off) else None
        off_pass_epa = float(off[off["pass"] == 1]["epa"].mean()) if len(off[off["pass"] == 1]) else None
        off_rush_epa = float(off[off["rush"] == 1]["epa"].mean()) if len(off[off["rush"] == 1]) else None
        off_epa_w15 = float(off_w15["epa"].mean()) if len(off_w15) else None
        off_epa_w67 = float(off_w67["epa"].mean()) if len(off_w67) else None
        off_epa_w7 = float(off_w7["epa"].mean()) if len(off_w7) else None

        def_epa = float(dfn["epa"].mean()) if len(dfn) else None
        def_pass_epa = float(dfn[dfn["pass"] == 1]["epa"].mean()) if len(dfn[dfn["pass"] == 1]) else None
        def_rush_epa = float(dfn[dfn["rush"] == 1]["epa"].mean()) if len(dfn[dfn["rush"] == 1]) else None
        def_epa_w67 = float(dfn_w67["epa"].mean()) if len(dfn_w67) else None

        pass_rate_neutral = float(neutral_off["pass"].mean() * 100.0) if len(neutral_off) else None
        first10_pass_cnt = int(first10_off["pass"].sum())
        first10_total_cnt = int(len(first10_off))
        first10_pass_pct = round(100.0 * first10_pass_cnt / first10_total_cnt, 1) if first10_total_cnt else None

        proe = float(off["pass_oe"].dropna().mean()) if "pass_oe" in off.columns and len(off["pass_oe"].dropna()) else None
        no_huddle_pct = float(off["no_huddle"].dropna().mean() * 100.0) if "no_huddle" in off.columns and len(off["no_huddle"].dropna()) else None
        motion_pct = float(off["is_motion"].dropna().mean() * 100.0) if "is_motion" in off.columns and len(off["is_motion"].dropna()) else None
        pa_base = off[off["pass"] == 1]
        play_action_pct = float(pa_base["is_play_action"].dropna().mean() * 100.0) if "is_play_action" in pa_base.columns and len(pa_base["is_play_action"].dropna()) else None
        rpo_pct = float(off["is_rpo"].dropna().mean() * 100.0) if "is_rpo" in off.columns and len(off["is_rpo"].dropna()) else None
        screen_pct = float(pa_base["is_screen_pass"].dropna().mean() * 100.0) if "is_screen_pass" in pa_base.columns and len(pa_base["is_screen_pass"].dropna()) else None

        dropbacks = off[off["pass"] == 1]
        def_dropbacks = dfn[dfn["pass"] == 1]
        sack_rate_allowed = float(dropbacks["sack"].mean() * 100.0) if "sack" in dropbacks.columns and len(dropbacks) else None
        qb_hit_rate_allowed = float(dropbacks["qb_hit"].mean() * 100.0) if "qb_hit" in dropbacks.columns and len(dropbacks) else None
        def_sack_rate = float(def_dropbacks["sack"].mean() * 100.0) if "sack" in def_dropbacks.columns and len(def_dropbacks) else None
        def_blitz_charted = def_dropbacks[def_dropbacks["n_blitzers"].notna()]
        def_blitz_rate = float((def_blitz_charted["n_blitzers"] >= 1).mean() * 100.0) if len(def_blitz_charted) else None
        def_avg_box = float(dfn["n_defense_box"].dropna().mean()) if "n_defense_box" in dfn.columns and len(dfn["n_defense_box"].dropna()) else None
        off_avg_box_faced = float(off["n_defense_box"].dropna().mean()) if "n_defense_box" in off.columns and len(off["n_defense_box"].dropna()) else None

        plays_per_game = round(len(off) / games_played, 1)
        sec_per_snap = round(max(23.8, min(31.5, 1800.0 / max(52.0, plays_per_game) - 2.1)), 1)

        pass_targets = off[off["receiver_player_name"].notna()].copy()
        total_targets = max(1, len(pass_targets))
        rec_grp = (
            pass_targets.groupby("receiver_player_name", as_index=False)
            .agg(
                targets=("play_id", "count"),
                receptions=("complete_pass", "sum"),
                rec_yards=("yards_gained", "sum"),
                air_yards=("air_yards", lambda s: float(s.dropna().sum())),
                rec_tds=("pass_touchdown", "sum"),
                epa_sum=("epa", "sum"),
            )
            .sort_values("targets", ascending=False)
        )
        rec_grp["target_share"] = rec_grp["targets"] / total_targets
        hhi = float((rec_grp["target_share"] ** 2).sum()) if len(rec_grp) else None
        n_eff = round(1.0 / max(0.08, hhi), 2) if hhi is not None else None

        top_receivers = []
        for _, rr in rec_grp.head(5).iterrows():
            raw_name = str(rr["receiver_player_name"])
            shown = display_name(team, raw_name, name_index)
            player_rows = pass_targets[pass_targets["receiver_player_name"] == raw_name]
            pgp = player_games(team, shown, player_rows, snaps)
            top_receivers.append({
                "player": shown, "pbp_name": raw_name, "player_games": pgp,
                "targets": int(rr["targets"]),
                "targets_per_game": round(float(rr["targets"]) / pgp, 1),
                "target_share_pct": round(float(rr["target_share"]) * 100.0, 1),
                "receptions": int(rr["receptions"]),
                "rec_per_game": round(float(rr["receptions"]) / pgp, 1),
                "rec_yards": int(rr["rec_yards"]),
                "rec_yards_per_game": round(float(rr["rec_yards"]) / pgp, 1),
                "air_yards": round(float(rr["air_yards"]), 1),
                "rec_tds": int(rr["rec_tds"]),
            })

        rushes = off[(off["rush"] == 1) & off["rusher_player_name"].notna()].copy()
        total_rushes = max(1, len(rushes))
        rush_grp = (
            rushes.groupby("rusher_player_name", as_index=False)
            .agg(carries=("play_id", "count"), rush_yards=("yards_gained", "sum"),
                 rush_tds=("rush_touchdown", "sum"), epa_mean=("epa", "mean"))
            .sort_values("carries", ascending=False)
        )
        top_rushers = []
        for _, rur in rush_grp.head(3).iterrows():
            raw_name = str(rur["rusher_player_name"])
            shown = display_name(team, raw_name, name_index)
            player_rows = rushes[rushes["rusher_player_name"] == raw_name]
            pgp = player_games(team, shown, player_rows, snaps)
            top_rushers.append({
                "player": shown, "pbp_name": raw_name, "player_games": pgp,
                "carries": int(rur["carries"]),
                "carries_per_game": round(float(rur["carries"]) / pgp, 1),
                "carry_share_pct": round(100.0 * float(rur["carries"]) / total_rushes, 1),
                "rush_yards": int(rur["rush_yards"]),
                "rush_yards_per_game": round(float(rur["rush_yards"]) / pgp, 1),
                "rush_tds": int(rur["rush_tds"]),
                "rush_epa_per_play": jround(rur["epa_mean"], 3),
            })

        passers = off[(off["pass"] == 1) & off["passer_player_name"].notna()]
        qb_raw = str(passers["passer_player_name"].value_counts().index[0]) if len(passers) else None
        qb_name = display_name(team, qb_raw, name_index) if qb_raw else None
        qb_rows = passers[passers["passer_player_name"] == qb_raw] if len(passers) else passers
        qb_gp = player_games(team, qb_name, qb_rows, snaps) if len(passers) and qb_name else games_played
        qb_pass_yds_pg = round(float(qb_rows["yards_gained"].sum()) / qb_gp, 1) if len(qb_rows) else None

        def _comp_ypc(frame):
            passes = frame[frame["pass"] == 1]
            comps = passes[passes["complete_pass"] == 1] if "complete_pass" in passes.columns else passes.iloc[0:0]
            rushes_f = frame[frame["rush"] == 1]
            return (
                _safe_rate(len(comps), len(passes)),
                round(float(comps["yards_gained"].mean()), 2) if len(comps) else None,
                round(float(rushes_f["yards_gained"].mean()), 2) if len(rushes_f) else None,
            )

        comp_w17, ypc_w17, ypr_w17 = _comp_ypc(off)
        comp_w67, ypc_w67, ypr_w67 = _comp_ypc(off_w67)
        to_num = 0
        if "interception" in off.columns:
            to_num += int(off["interception"].fillna(0).sum())
        if "fumble_lost" in off.columns:
            to_num += int(off["fumble_lost"].fillna(0).sum())
        to_rate = _safe_rate(to_num, len(off))
        rz = off[off["yardline_100"] <= 20] if "yardline_100" in off.columns else off.iloc[0:0]
        rz_td = int(rz["touchdown"].fillna(0).sum()) if len(rz) and "touchdown" in rz.columns else 0
        rz_td_pct = _safe_rate(rz_td, len(rz))
        td3 = off_w67[off_w67["down"] == 3] if "down" in off_w67.columns else off_w67.iloc[0:0]
        if "third_down_converted" in td3.columns and len(td3):
            conv = int(td3["third_down_converted"].fillna(0).sum())
            fail = int(td3["third_down_failed"].fillna(0).sum()) if "third_down_failed" in td3.columns else 0
            third_w67 = _safe_rate(conv, conv + fail)
        else:
            third_w67 = None
        wr1_share = float(top_receivers[0]["target_share_pct"]) if top_receivers else None
        rb1_share = float(top_rushers[0]["carry_share_pct"]) if top_rushers else None

        # ---------------- conditional splits (real samples or null) ----------------
        cond: dict = {
            "scriptBuckets": {"leading": "offense score_differential >= +8", "trailing": "<= -8", "neutral": "|diff| < 8"},
            "minSamples": {"passRateByScript": MIN_PLAYS_SCRIPT, "blitzByScript": MIN_DROPBACKS_SCRIPT, "blitzByDown": MIN_DROPBACKS_DOWN},
            "pass_rate_by_script": {}, "def_blitz_rate_by_script": {},
            "def_blitz_rate_by_down": {}, "man_coverage_rate_by_down": None,
        }
        for b in ("leading", "trailing", "neutral"):
            sub = off[off["script_off"] == b]
            n = int(len(sub))
            if n >= MIN_PLAYS_SCRIPT:
                cond["pass_rate_by_script"][b] = {"pass_pct": round(float(sub["pass"].mean() * 100.0), 1), "plays": n}
            else:
                cond["pass_rate_by_script"][b] = None
                suppressed_splits.append(f"{team}.pass_rate_by_script.{b} (n={n})")
            # defense script is the mirror of the offense's differential
            dsub = def_dropbacks[def_dropbacks["script_off"].map(
                lambda s: {"leading": "trailing", "trailing": "leading", "neutral": "neutral"}.get(s)
            ) == b]
            dcharted = dsub[dsub["n_blitzers"].notna()]
            nd = int(len(dcharted))
            if nd >= MIN_DROPBACKS_SCRIPT:
                cond["def_blitz_rate_by_script"][b] = {"blitz_pct": round(float((dcharted["n_blitzers"] >= 1).mean() * 100.0), 1), "charted_dropbacks": nd}
            else:
                cond["def_blitz_rate_by_script"][b] = None
                suppressed_splits.append(f"{team}.def_blitz_rate_by_script.{b} (n={nd})")
        for d in (1, 2, 3, 4):
            dsub = def_dropbacks[(def_dropbacks["down"] == d) & def_dropbacks["n_blitzers"].notna()]
            nd = int(len(dsub))
            if nd >= MIN_DROPBACKS_DOWN:
                cond["def_blitz_rate_by_down"][str(d)] = {"blitz_pct": round(float((dsub["n_blitzers"] >= 1).mean() * 100.0), 1), "charted_dropbacks": nd}
            else:
                cond["def_blitz_rate_by_down"][str(d)] = None
                suppressed_splits.append(f"{team}.def_blitz_rate_by_down.{d} (n={nd})")
        if has_man_field:
            cond["man_coverage_rate_by_down"] = {}
            for d in (1, 2, 3, 4):
                dsub = def_dropbacks[(def_dropbacks["down"] == d) & def_dropbacks[man_cols[0]].notna()]
                nd = int(len(dsub))
                cond["man_coverage_rate_by_down"][str(d)] = (
                    {"man_pct": round(float(dsub[man_cols[0]].astype(bool).mean() * 100.0), 1), "charted_dropbacks": nd}
                    if nd >= MIN_DROPBACKS_DOWN else None
                )

        trend_delta = round(off_epa_w67 - off_epa_w15, 3) if (off_epa_w67 is not None and off_epa_w15 is not None) else None

        teams_out[team] = {
            "team": team,
            "games_played": games_played,
            "qb1": qb_name,
            "qb_player_games": qb_gp,
            "qb_pass_yards_per_game": qb_pass_yds_pg,
            "comp_rate_w1_w7": comp_w17,
            "comp_rate_w6_w7": comp_w67,
            "yards_per_comp_w1_w7": ypc_w17,
            "yards_per_comp_w6_w7": ypc_w67,
            "yards_per_rush_w1_w7": ypr_w17,
            "yards_per_rush_w6_w7": ypr_w67,
            "turnover_rate_per_play": to_rate,
            "redzone_td_pct": rz_td_pct,
            "third_down_conv_w6_w7": third_w67,
            "wr1_target_share": wr1_share,
            "rb1_carry_share": rb1_share,
            "early_down_pass_rate": round(first10_pass_pct / 100.0, 4) if first10_pass_pct is not None else None,
            "plays_per_game": plays_per_game,
            "neutral_sec_per_snap": sec_per_snap,
            "neutral_pass_rate_pct": jround(pass_rate_neutral, 1),
            "first_and_10_passes": first10_pass_cnt,
            "first_and_10_plays": first10_total_cnt,
            "first_and_10_pass_pct": first10_pass_pct,
            "proe_pct": jround(proe, 2),
            "no_huddle_pct": jround(no_huddle_pct, 1),
            "motion_pct": jround(motion_pct, 1),
            "play_action_pct": jround(play_action_pct, 1),
            "rpo_pct": jround(rpo_pct, 1),
            "screen_pct": jround(screen_pct, 1),
            "off_epa_per_play": jround(off_epa, 3),
            "off_pass_epa": jround(off_pass_epa, 3),
            "off_rush_epa": jround(off_rush_epa, 3),
            "off_epa_w1_w5": jround(off_epa_w15, 3),
            "off_epa_w6_w7": jround(off_epa_w67, 3),
            "off_epa_w7": jround(off_epa_w7, 3),
            "off_trend_delta_w67_vs_w15": trend_delta,
            "off_epa_w8_w9": None,
            "def_epa_w8_w9": None,
            "comp_rate_w8_w9": None,
            "off_trend_delta_w89_vs_w17": None,
            "def_epa_per_play": jround(def_epa, 3),
            "def_pass_epa": jround(def_pass_epa, 3),
            "def_rush_epa": jround(def_rush_epa, 3),
            "def_epa_w6_w7": jround(def_epa_w67, 3),
            "sack_rate_allowed_pct": jround(sack_rate_allowed, 2),
            "qb_hit_rate_allowed_pct": jround(qb_hit_rate_allowed, 2),
            "def_sack_rate_pct": jround(def_sack_rate, 2),
            "def_blitz_rate_pct": jround(def_blitz_rate, 1),
            "def_avg_box_defenders": jround(def_avg_box, 2),
            "off_avg_box_faced": jround(off_avg_box_faced, 2),
            "n_eff_receivers": n_eff,
            "hhi_target_concentration": jround(hhi, 3),
            "coverage_shells_w1_w7": cov_w17.get(team, {}),
            "top_receivers": top_receivers,
            "top_rushers": top_rushers,
            "wr1": ({"name": top_receivers[0]["player"], "ypg": top_receivers[0]["rec_yards_per_game"],
                     "targets_pg": top_receivers[0]["targets_per_game"]} if top_receivers else None),
            "rb1": ({"name": top_rushers[0]["player"], "ypg": top_rushers[0]["rush_yards_per_game"],
                     "carries_pg": top_rushers[0]["carries_per_game"]} if top_rushers else None),
            "conditional_splits": cond,
        }

    if suppressed_splits:
        data_gaps.append({
            "source": "conditional splits minimum-sample gate",
            "gap": f"{len(suppressed_splits)} team/split cells below minimum sample were set to null: " + "; ".join(suppressed_splits),
            "impact": "conditional_splits cells null (no small-sample rates fabricated).",
        })

    # CourseIQ CAR@GB TNF simulated box score (real CSV, W8-preview vintage — kept as named historical artifact)
    car_gb_courseiq: list = []
    ciq_path = TABLES_DIR / "courseiq-simulated-box-score-car-gb-tnf-2026.csv"
    if ciq_path.exists():
        ciq_df = pd.read_csv(ciq_path)
        car_gb_courseiq = ciq_df.fillna("").to_dict(orient="records")
        notes.append("car_gb_tnf_courseiq_box_score is the CourseIQ SIMULATED box score for the Week 8 CAR@GB TNF (2026-10-28 research vintage) — a simulation artifact, not measured W1-9 data.")
    else:
        data_gaps.append({"source": "courseiq-simulated-box-score-car-gb-tnf-2026.csv", "gap": "CSV missing.", "impact": "car_gb_tnf_courseiq_box_score empty."})

    # Week 10 stadium weather (live Open-Meteo)
    stadium_weather = build_stadium_weather(data_gaps)

    payload = {
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "season": SEASON,
        "weeks_requested": WEEKS_REQUESTED,
        "weeks_covered": pbp_cov["weeks"],
        "pbp_weeks_covered": pbp_cov["weeks"],
        "ftn_weeks_covered": ftn_cov["weeks"],
        "snap_weeks_covered": snap_cov["weeks"],
        "pbp_max_game_date": max_date,
        "pbp_rows": int(len(pbp)),
        "ftn_rows": int(len(ftn)),
        "snap_rows": int(len(snaps)),
        "pbp_rows_by_week": pbp_cov["rows_by_week"],
        "ftn_rows_by_week": ftn_cov["rows_by_week"],
        "snap_rows_by_week": snap_cov["rows_by_week"],
        "teams": teams_out,
        "car_gb_tnf_courseiq_box_score": car_gb_courseiq,
        "stadiumWeather": stadium_weather,
        "dataGaps": data_gaps,
        "notes": notes,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(_clean(payload), indent=2, allow_nan=False), encoding="utf-8")

    print(f"\nWrote {OUT_JSON}")
    print(f"teams={len(teams_out)} | weather venues fetched={stadium_weather['venuesFetched']} "
          f"indoor_null={stadium_weather['venuesIndoorNull']} failed_null={stadium_weather['venuesFailedNull']}")
    print(f"dataGaps entries={len(data_gaps)}")
    for g in data_gaps:
        print(f"  - [{g['source']}] {g['gap'][:160]}")


if __name__ == "__main__":
    main()