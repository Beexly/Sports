"""Data loading for the GSE signal pack.

Sources (all public):
- nflverse play-by-play + rosters, from the nflverse-data GitHub releases.
- Pro Football Reference season advanced tables (passing / defense),
  fetched with a browser user-agent and cached as raw HTML.

Files cache under ``<pack>/data/``. Nothing here touches a credential.
"""
from __future__ import annotations

import io
import os
import re

import pandas as pd
import requests

PACK_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PACK_DIR, "data")

PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.csv.gz"
ROSTER_URL = "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_{season}.csv"
PFR_PASSING_ADV_URL = "https://www.pro-football-reference.com/years/{season}/passing_advanced.htm"
PFR_DEFENSE_ADV_URL = "https://www.pro-football-reference.com/years/{season}/defense_advanced.htm"
BROWSER_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

PBP_COLS = [
    "game_id", "week", "season_type", "posteam", "defteam", "play_type",
    "pass_attempt", "rush_attempt", "qb_dropback", "qb_spike", "sack",
    "two_point_attempt", "yardline_100", "qtr", "epa", "success",
    "yards_gained", "touchdown", "pass_touchdown", "rush_touchdown",
    "receiver_id", "receiver_player_name", "rusher_id",
    "rusher_player_name", "passer_id", "passer_player_name",
]

# PFR team abbreviations -> nflverse abbreviations.
PFR_TO_NFLVERSE = {
    "GNB": "GB", "KAN": "KC", "NWE": "NE", "NOR": "NO", "SFO": "SF",
    "TAM": "TB", "LVR": "LV", "WSH": "WAS",
}


def _ensure(path: str, url: str, binary: bool = True) -> str:
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            if binary:
                r = requests.get(url, timeout=300)
                r.raise_for_status()
                with open(path, "wb") as f:
                    f.write(r.content)
            else:
                r = requests.get(url, headers={"User-Agent": BROWSER_UA}, timeout=120)
                r.raise_for_status()
                with open(path, "w", encoding="utf-8") as f:
                    f.write(r.text)
        except requests.RequestException:
            return path
    return path


def pbp_path(season: int = 2026) -> str:
    return _ensure(
        os.path.join(DATA_DIR, f"play_by_play_{season}.csv.gz"),
        PBP_URL.format(season=season),
    )


def roster_path(season: int = 2026) -> str:
    return _ensure(
        os.path.join(DATA_DIR, f"roster_{season}.csv"),
        ROSTER_URL.format(season=season),
    )


def pfr_passing_adv_path(season: int = 2026) -> str:
    return _ensure(
        os.path.join(DATA_DIR, f"pfr_passing_advanced_{season}.html"),
        PFR_PASSING_ADV_URL.format(season=season),
        binary=False,
    )


def pfr_defense_adv_path(season: int = 2026) -> str:
    return _ensure(
        os.path.join(DATA_DIR, f"pfr_defense_advanced_{season}.html"),
        PFR_DEFENSE_ADV_URL.format(season=season),
        binary=False,
    )


def load_pbp(season: int = 2026, weeks: list[int] | None = None) -> pd.DataFrame:
    """Regular-season play-by-play with a real defense on the field."""
    df = pd.read_csv(pbp_path(season), usecols=PBP_COLS, low_memory=False)
    df = df[(df.season_type == "REG") & df.defteam.notna() & df.posteam.notna()].copy()
    if weeks is not None:
        df = df[df.week.isin(weeks)]
    return df


def load_roster(season: int = 2026) -> pd.DataFrame:
    ros = pd.read_csv(roster_path(season), usecols=["gsis_id", "full_name", "position"])
    return ros.drop_duplicates("gsis_id")


def position_map(season: int = 2026) -> dict:
    ros = load_roster(season)
    return dict(zip(ros.gsis_id, ros.position))


def complete_weeks(pbp: pd.DataFrame, min_games: int = 13) -> list[int]:
    """Weeks that look finished: at least ``min_games`` distinct games."""
    games = pbp.groupby("week").game_id.nunique()
    return sorted(int(w) for w, n in games.items() if n >= min_games)


def position_group(pos: str | float) -> str:
    if pos in ("QB", "RB", "WR", "TE"):
        return str(pos)
    return "OTHER"


# ---------------------------------------------------------------------------
# PFR HTML parsing (tables sometimes hide inside HTML comments on PFR).
# ---------------------------------------------------------------------------

def _pfr_tables(html: str) -> list[pd.DataFrame]:
    clean = html.replace("<!--", "").replace("-->", "")
    return pd.read_html(io.StringIO(clean))


def _flatten(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [
        c[-1] if isinstance(c, tuple) else str(c) for c in df.columns
    ]
    return df


def parse_pfr_passing_accuracy(html: str) -> pd.DataFrame:
    """Player-level Advanced Passing table: Att / ThAwy / Spikes per QB.

    PFR serves the player page as one wide table (team column 'Team');
    the season hub serves per-team tables (column 'Tm'). Both handled.
    """
    for t in _pfr_tables(html):
        flat_cols = [
            c[-1] if isinstance(c, tuple) else str(c) for c in t.columns
        ]
        if "ThAwy" in flat_cols and "Player" in flat_cols:
            df = _flatten(t)
            df = df[df.Player.notna() & (df.Player != "Player")]
            df["Player"] = df.Player.str.replace(r"[*+]$", "", regex=True)
            team_col = "Team" if "Team" in df.columns else "Tm"
            out = df[["Player", team_col, "Att", "ThAwy", "Spikes"]].copy()
            out = out.rename(columns={team_col: "Tm"})
            for c in ["Att", "ThAwy", "Spikes"]:
                out[c] = pd.to_numeric(out[c], errors="coerce")
            return out.dropna(subset=["Att"]).reset_index(drop=True)
    raise ValueError("passing accuracy table (ThAwy) not found in PFR HTML")


def parse_pfr_defense_advanced(html: str) -> pd.DataFrame:
    """Player-level Advanced Defense table: missed tackles (MTkl) by player."""
    # The defense page's player table is easier to read via data-stat attrs.
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.S):
        cells = dict(
            re.findall(r'data-stat="([a-z_0-9]+)"[^>]*>(.*?)</t[hd]>', tr, flags=re.S)
        )
        if "tackles_missed" in cells and "name_display" in cells:
            strip = lambda s: re.sub(r"<[^>]+>", "", s).strip()
            try:
                mtkl = float(strip(cells["tackles_missed"]) or 0)
            except ValueError:
                continue
            team = strip(cells.get("team_name_abbr", ""))
            name = strip(cells["name_display"])
            if not team or not name:
                continue  # header / league-average artifact rows
            rows.append(
                {
                    "player": name,
                    "team_pfr": team,
                    "mtkl": mtkl,
                    "mtkl_pct": strip(cells.get("tackles_missed_pct", "")),
                }
            )
    if not rows:
        raise ValueError("no player rows with tackles_missed found in PFR HTML")
    return pd.DataFrame(rows)
