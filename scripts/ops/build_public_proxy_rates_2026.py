#!/usr/bin/env python3
"""Public proxies for the three inputs the TNF gate called unavailable.

- RB YBC 2026: Pro-Football-Reference advanced rushing (measured, not a proxy).
- Two-high 2026: Sharp Football "Middle Open Rate" (charting proxy for two-high shells).
- Dime 2026: no free team-level charting source; FTN light-box rate is the
  documented substitute (n_defense_box <= 6). Shell-split EPA is replaced by the
  box-split EPA already computed from nflverse pbp + FTN.

Every value carries its source and what it stands in for.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
PFR = ROOT / "data" / "engine" / "sources" / "pfr_rush_advanced_2026.html"
SHARP = ROOT / "data" / "engine" / "sources" / "sharp_coverage_2026.html"
OUT = ROOT / "data" / "engine" / "public_proxy_rates_2026.json"

NAME_TO_ABBR = {
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


def pfr_ybc() -> dict:
    soup = BeautifulSoup(PFR.read_text(encoding="utf-8", errors="replace"), "html.parser")
    table = soup.find("table", id="adv_rushing")
    agg: dict[str, dict] = {}
    for tr in table.find_all("tr"):
        cells = {c.get("data-stat"): c.get_text(strip=True) for c in tr.find_all(["th", "td"]) if c.get("data-stat")}
        team, att, ybc = cells.get("team_name_abbr"), cells.get("rush_att"), cells.get("rush_yds_before_contact")
        if not (team and att and ybc):
            continue
        try:
            att_i, ybc_i = int(att), int(ybc)
        except ValueError:
            continue
        a = agg.setdefault(team, {"att": 0, "ybc": 0})
        a["att"] += att_i
        a["ybc"] += ybc_i
    return {t: {"att": v["att"], "ybc": v["ybc"], "ybc_att": round(v["ybc"] / v["att"], 4) if v["att"] else None}
            for t, v in agg.items()}


def sharp_shells() -> dict:
    tables = pd.read_html(SHARP)
    df = next(t for t in tables if "Middle Open Rate" in t.columns)
    out = {}
    for _, r in df.iterrows():
        abbr = NAME_TO_ABBR.get(str(r["Team"]).strip())
        if not abbr:
            continue
        out[abbr] = {
            "man_rate": float(r["Man Rate"]) / 100,
            "zone_rate": float(r["Zone Rate"]) / 100,
            "middle_closed_rate": float(r["Middle Closed Rate"]) / 100,
            "middle_open_rate": float(r["Middle Open Rate"]) / 100,
        }
    return out


def ftn_box() -> dict:
    ftn = pq.read_table(ROOT / "data" / "nflverse" / "ftn_charting_2026.parquet",
                        columns=["nflverse_game_id", "nflverse_play_id", "n_defense_box"]).to_pandas()
    pbp = pq.read_table(ROOT / "data" / "nflverse" / "pbp" / "play_by_play_2026.parquet",
                        columns=["game_id", "play_id", "defteam", "qb_dropback"]).to_pandas()
    pbp["play_id"] = pbp["play_id"].astype("Int64")
    ftn["play_id"] = pd.to_numeric(ftn["nflverse_play_id"], errors="coerce").astype("Int64")
    m = ftn.merge(pbp, left_on=["nflverse_game_id", "play_id"], right_on=["game_id", "play_id"], how="inner")
    m = m[m["n_defense_box"].notna()]
    g = m.groupby("defteam")["n_defense_box"]
    return {
        "light_box_rate": (g.apply(lambda s: (s <= 6).mean())).round(4).to_dict(),
        "dime_or_fewer_box_rate": (g.apply(lambda s: (s <= 5).mean())).round(4).to_dict(),
        "plays": g.size().to_dict(),
    }


def main() -> dict:
    ybc = pfr_ybc()
    shells = sharp_shells()
    box = ftn_box()
    payload = {
        "schema": "public_proxy_rates_2026_v1",
        "generated_at": "2026-11-05",
        "sources": {
            "rb_ybc": {"source": "Pro-Football-Reference 2026 Advanced Rushing", "url": "https://www.pro-football-reference.com/years/2026/rushing_advanced.htm", "status": "measured"},
            "two_high": {"source": "Sharp Football Analysis coverage schemes", "url": "https://www.sharpfootballanalysis.com/stats-nfl/nfl-coverage-schemes/", "updated": "2026-10-27", "status": "proxy = middle-open rate"},
            "dime": {"source": "nflverse FTN charting 2026 n_defense_box", "status": "proxy = light-box rate (<=6 in box); no free team-level dime charting exists"},
        },
        "rb_ybc": ybc,
        "coverage": shells,
        "box": box,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("teams ybc", len(ybc), "coverage", len(shells), "box", len(box["plays"]))
    for t in ("BAL", "JAX"):
        print(t, "ybc/att", ybc.get(t), "middle_open", shells.get(t, {}).get("middle_open_rate"),
              "light_box", box["light_box_rate"].get(t), "<=5 box", box["dime_or_fewer_box_rate"].get(t))
    print("saved", OUT)
    return payload


if __name__ == "__main__":
    main()
