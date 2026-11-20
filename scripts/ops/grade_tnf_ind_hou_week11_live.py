#!/usr/bin/env python3
"""Live and Post-Game Grader for Week 11 TNF IND @ HOU (ESPN Event 401873066).

Grades:
  1. All 24 Play-To 360-Board Props published in writeup-tnf-401873066
  2. All 6 Stage-5 PASS Main Lines (HOU -12.5, IND +12.5, O/U 44.5, MLs) vs Branch B
  3. Garrett's $52.00 Personal Bankroll Allocation (Buckets 1-4)
  4. DraftKings Showdown Cash (CPT Stroud) and GPP Pivot (CPT Collins) Lineups

Supports live ESPN fetch, deterministic fixture JSON testing (offline),
early-cash detection (CASHED_EARLY for OVER props once threshold is cleared),
and full post-game settlement outputs in JSON + pure 7-bit ASCII Markdown.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ESPN_SUMMARY_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401873066"
)
DEFAULT_JSON_OUT = ROOT / "data" / "engine" / "tnf_ind_hou_week11_live_grade_2026_11_19.json"
DEFAULT_MD_OUT = (
    ROOT
    / "docs"
    / "predictions"
    / "research"
    / "2026-11-19"
    / "TNF-IND-AT-HOU-LIVE-GRADING-LEDGER-2026-11-19.md"
)

NAME_ALIASES: dict[str, list[str]] = {
    "C.J. Stroud": ["C.J. Stroud", "CJ Stroud", "C.Stroud"],
    "Daniel Jones": ["Daniel Jones", "D.Jones"],
    "Dalton Schultz": ["Dalton Schultz", "D.Schultz"],
    "Xavier Hutchinson": ["Xavier Hutchinson", "X.Hutchinson"],
    "Tyler Warren": ["Tyler Warren", "T.Warren"],
    "David Montgomery": ["David Montgomery", "D.Montgomery"],
    "Nico Collins": ["Nico Collins", "N.Collins"],
    "Tank Dell": ["Tank Dell", "T.Dell", "Nathaniel Dell", "N.Dell"],
    "CJ Allen": ["CJ Allen", "C.J. Allen", "C.Allen"],
    "Cam Bynum": ["Cam Bynum", "Camryn Bynum", "C.Bynum"],
    "Ka'imi Fairbairn": ["Ka'imi Fairbairn", "K.Fairbairn", "Kaimi Fairbairn"],
    "Will Anderson Jr.": ["Will Anderson Jr.", "Will Anderson", "W.Anderson"],
}

# Canonical 24 props aligned 1:1 with writeup-tnf-401873066 in coach-writeup-engine.ts
OFFICIAL_24_PROPS: list[dict[str, Any]] = [
    {
        "rank": 1,
        "player": "C.J. Stroud",
        "team": "HOU",
        "market": "Passing Touchdowns",
        "stat_key": "passingTouchdowns",
        "window": "FULL",
        "line": 1.5,
        "side": "OVER",
        "win_prob": 0.7043,
        "confidence": "70/100",
        "play_to": -222,
    },
    {
        "rank": 2,
        "player": "C.J. Stroud",
        "team": "HOU",
        "market": "Passing Yards",
        "stat_key": "passingYards",
        "window": "FULL",
        "line": 253.5,
        "side": "OVER",
        "win_prob": 0.6871,
        "confidence": "69/100",
        "play_to": -205,
    },
    {
        "rank": 3,
        "player": "C.J. Stroud",
        "team": "HOU",
        "market": "Pass Completions",
        "stat_key": "completions",
        "window": "FULL",
        "line": 21.5,
        "side": "OVER",
        "win_prob": 0.6786,
        "confidence": "68/100",
        "play_to": -197,
    },
    {
        "rank": 4,
        "player": "C.J. Stroud",
        "team": "HOU",
        "market": "Longest Passing Completion",
        "stat_key": "longPassing",
        "window": "FULL",
        "line": 39.5,
        "side": "UNDER",
        "win_prob": 0.6579,
        "confidence": "66/100",
        "play_to": -180,
    },
    {
        "rank": 5,
        "player": "Daniel Jones",
        "team": "IND",
        "market": "Pass Completions",
        "stat_key": "completions",
        "window": "FULL",
        "line": 18.5,
        "side": "OVER",
        "win_prob": 0.6168,
        "confidence": "62/100",
        "play_to": -151,
    },
    {
        "rank": 6,
        "player": "Daniel Jones",
        "team": "IND",
        "market": "Passing Touchdowns",
        "stat_key": "passingTouchdowns",
        "window": "FULL",
        "line": 0.5,
        "side": "OVER",
        "win_prob": 0.5923,
        "confidence": "59/100",
        "play_to": -137,
    },
    {
        "rank": 7,
        "player": "Dalton Schultz",
        "team": "HOU",
        "market": "Receiving Yards",
        "stat_key": "receivingYards",
        "window": "FULL",
        "line": 29.5,
        "side": "OVER",
        "win_prob": 0.6970,
        "confidence": "70/100",
        "play_to": -214,
    },
    {
        "rank": 8,
        "player": "Dalton Schultz",
        "team": "HOU",
        "market": "1H Receiving Yards",
        "stat_key": "receivingYards_1H",
        "window": "1H",
        "line": 14.5,
        "side": "OVER",
        "win_prob": 0.6880,
        "confidence": "69/100",
        "play_to": -206,
    },
    {
        "rank": 9,
        "player": "Xavier Hutchinson",
        "team": "HOU",
        "market": "1Q Receiving Yards",
        "stat_key": "receivingYards_1Q",
        "window": "1Q",
        "line": 4.5,
        "side": "OVER",
        "win_prob": 0.6946,
        "confidence": "69/100",
        "play_to": -212,
    },
    {
        "rank": 10,
        "player": "Xavier Hutchinson",
        "team": "HOU",
        "market": "Receiving Yards",
        "stat_key": "receivingYards",
        "window": "FULL",
        "line": 36.5,
        "side": "OVER",
        "win_prob": 0.6616,
        "confidence": "66/100",
        "play_to": -183,
    },
    {
        "rank": 11,
        "player": "Tyler Warren",
        "team": "IND",
        "market": "Receptions",
        "stat_key": "receptions",
        "window": "FULL",
        "line": 4.5,
        "side": "OVER",
        "win_prob": 0.6918,
        "confidence": "69/100",
        "play_to": -209,
    },
    {
        "rank": 12,
        "player": "Tyler Warren",
        "team": "IND",
        "market": "1Q Receiving Yards",
        "stat_key": "receivingYards_1Q",
        "window": "1Q",
        "line": 3.5,
        "side": "OVER",
        "win_prob": 0.6840,
        "confidence": "68/100",
        "play_to": -202,
    },
    {
        "rank": 13,
        "player": "Tyler Warren",
        "team": "IND",
        "market": "1H Receiving Yards",
        "stat_key": "receivingYards_1H",
        "window": "1H",
        "line": 15.5,
        "side": "OVER",
        "win_prob": 0.6647,
        "confidence": "66/100",
        "play_to": -185,
    },
    {
        "rank": 14,
        "player": "IND @ HOU 1st Quarter Total",
        "team": "GAME",
        "market": "1st Quarter Total",
        "stat_key": "game_1q_total",
        "window": "1Q",
        "line": 7.5,
        "side": "OVER",
        "win_prob": 0.6239,
        "confidence": "62/100",
        "play_to": -156,
    },
    {
        "rank": 15,
        "player": "David Montgomery",
        "team": "HOU",
        "market": "Anytime Touchdown Scorer",
        "stat_key": "anytimeTouchdowns",
        "window": "FULL",
        "line": 0.5,
        "side": "OVER",
        "win_prob": 0.6605,
        "confidence": "66/100",
        "play_to": -182,
    },
    {
        "rank": 16,
        "player": "David Montgomery",
        "team": "HOU",
        "market": "Rushing Yards",
        "stat_key": "rushingYards",
        "window": "FULL",
        "line": 56.5,
        "side": "OVER",
        "win_prob": 0.6101,
        "confidence": "61/100",
        "play_to": -147,
    },
    {
        "rank": 17,
        "player": "David Montgomery",
        "team": "HOU",
        "market": "Longest Rush",
        "stat_key": "longRushing",
        "window": "FULL",
        "line": 13.5,
        "side": "UNDER",
        "win_prob": 0.7322,
        "confidence": "73/100",
        "play_to": -254,
    },
    {
        "rank": 18,
        "player": "Tank Dell",
        "team": "HOU",
        "market": "Longest Reception",
        "stat_key": "longReception",
        "window": "FULL",
        "line": 20.5,
        "side": "OVER",
        "win_prob": 0.7355,
        "confidence": "74/100",
        "play_to": -258,
    },
    {
        "rank": 19,
        "player": "CJ Allen",
        "team": "IND",
        "market": "Solo Tackles",
        "stat_key": "soloTackles",
        "window": "FULL",
        "line": 4.5,
        "side": "UNDER",
        "win_prob": 0.7198,
        "confidence": "72/100",
        "play_to": -239,
    },
    {
        "rank": 20,
        "player": "CJ Allen",
        "team": "IND",
        "market": "Tackles + Assists",
        "stat_key": "totalTackles",
        "window": "FULL",
        "line": 10.5,
        "side": "UNDER",
        "win_prob": 0.6757,
        "confidence": "68/100",
        "play_to": -195,
    },
    {
        "rank": 21,
        "player": "Cam Bynum",
        "team": "IND",
        "market": "Solo Tackles",
        "stat_key": "soloTackles",
        "window": "FULL",
        "line": 1.5,
        "side": "OVER",
        "win_prob": 0.6592,
        "confidence": "66/100",
        "play_to": -181,
    },
    {
        "rank": 22,
        "player": "Ka'imi Fairbairn",
        "team": "HOU",
        "market": "Extra Points Made",
        "stat_key": "extraPointsMade",
        "window": "FULL",
        "line": 2.5,
        "side": "OVER",
        "win_prob": 0.6251,
        "confidence": "63/100",
        "play_to": -156,
    },
    {
        "rank": 23,
        "player": "Will Anderson Jr.",
        "team": "HOU",
        "market": "Solo Tackles",
        "stat_key": "soloTackles",
        "window": "FULL",
        "line": 1.5,
        "side": "OVER",
        "win_prob": 0.6190,
        "confidence": "62/100",
        "play_to": -153,
    },
    {
        "rank": 24,
        "player": "Will Anderson Jr.",
        "team": "HOU",
        "market": "Sacks",
        "stat_key": "sacks",
        "window": "FULL",
        "line": 0.75,
        "side": "OVER",
        "win_prob": 0.5727,
        "confidence": "57/100",
        "play_to": -126,
    },
]


def _normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _canonical_player_name(raw_name: str) -> str:
    norm = _normalize_name(raw_name)
    for canon, aliases in NAME_ALIASES.items():
        if any(_normalize_name(a) == norm for a in aliases):
            return canon
    return raw_name.strip()


def _parse_float(raw: Any) -> float:
    if raw is None or raw == "" or raw == "--":
        return 0.0
    s = str(raw).strip()
    if "/" in s:
        s = s.split("/", 1)[0]
    elif "-" in s and not s.startswith("-"):
        s = s.split("-", 1)[0]
    try:
        return float(s)
    except ValueError:
        return 0.0


def _parse_made_attempts(raw: Any) -> tuple[float, float]:
    if raw is None or raw == "" or raw == "--":
        return 0.0, 0.0
    s = str(raw).strip()
    if "/" in s:
        parts = s.split("/", 1)
        return _parse_float(parts[0]), _parse_float(parts[1])
    val = _parse_float(s)
    return val, val


@dataclass
class GameClockState:
    status_name: str
    state: str
    completed: bool
    period: int
    clock: str
    detail: str
    away_score: int
    home_score: int
    away_quarters: dict[str, int]
    home_quarters: dict[str, int]


def parse_game_clock_and_scores(summary: dict[str, Any]) -> GameClockState:
    comp = (summary.get("header") or {}).get("competitions", [{}])[0]
    status = comp.get("status") or {}
    st_type = status.get("type") or {}
    status_name = str(st_type.get("name") or "STATUS_SCHEDULED")
    state = str(st_type.get("state") or "pre")
    completed = bool(st_type.get("completed", False)) or status_name == "STATUS_FINAL"
    period = int(status.get("period") or 0)
    clock = str(status.get("displayClock") or "0:00")
    detail = str(st_type.get("detail") or st_type.get("shortDetail") or status_name)

    away_score = 0
    home_score = 0
    away_quarters: dict[str, int] = {"1Q": 0, "2Q": 0, "3Q": 0, "4Q": 0, "OT": 0}
    home_quarters: dict[str, int] = {"1Q": 0, "2Q": 0, "3Q": 0, "4Q": 0, "OT": 0}

    q_labels = ["1Q", "2Q", "3Q", "4Q", "OT"]
    for c in comp.get("competitors", []):
        team_abbr = str((c.get("team") or {}).get("abbreviation") or "").upper()
        home_away = str(c.get("homeAway") or "")
        score_val = int(_parse_float(c.get("score") or 0))
        q_map: dict[str, int] = {"1Q": 0, "2Q": 0, "3Q": 0, "4Q": 0, "OT": 0}
        for idx, ls in enumerate(c.get("linescores") or []):
            label = q_labels[idx] if idx < len(q_labels) else "OT"
            val = int(_parse_float(ls.get("displayValue") or ls.get("value") or 0))
            if label == "OT":
                q_map["OT"] += val
            else:
                q_map[label] = val
        if home_away == "away" or team_abbr == "IND":
            away_score = score_val
            away_quarters = q_map
        elif home_away == "home" or team_abbr == "HOU":
            home_score = score_val
            home_quarters = q_map

    return GameClockState(
        status_name=status_name,
        state=state,
        completed=completed,
        period=period,
        clock=clock,
        detail=detail,
        away_score=away_score,
        home_score=home_score,
        away_quarters=away_quarters,
        home_quarters=home_quarters,
    )


def _iter_unique_plays(summary: dict[str, Any]) -> list[dict[str, Any]]:
    drives_obj = summary.get("drives") or {}
    if not isinstance(drives_obj, dict):
        return []
    raw_drives: list[dict[str, Any]] = []
    prev = drives_obj.get("previous") or []
    curr = drives_obj.get("current")
    if isinstance(prev, list):
        raw_drives.extend([d for d in prev if isinstance(d, dict)])
    if isinstance(curr, dict) and curr:
        raw_drives.append(curr)

    seen_play_ids: set[str] = set()
    plays: list[dict[str, Any]] = []
    for drv in raw_drives:
        for idx, pl in enumerate(drv.get("plays") or []):
            if not isinstance(pl, dict):
                continue
            pid = str(pl.get("id") or f"{drv.get('id', 'd')}_{idx}_{pl.get('text', '')[:30]}")
            if pid in seen_play_ids:
                continue
            seen_play_ids.add(pid)
            plays.append(pl)
    return plays


def extract_player_stats(summary: dict[str, Any], game_state: GameClockState) -> dict[str, dict[str, float]]:
    """Extract normalized per-player stats across full boxscore + 1Q/1H play-by-play."""
    players: dict[str, dict[str, float]] = {}

    def ensure_player(raw_name: str) -> dict[str, float]:
        canon = _canonical_player_name(raw_name)
        if canon not in players:
            players[canon] = {
                "completions": 0.0,
                "passingAttempts": 0.0,
                "passingYards": 0.0,
                "passingTouchdowns": 0.0,
                "passingInterceptions": 0.0,
                "longPassing": 0.0,
                "rushingAttempts": 0.0,
                "rushingYards": 0.0,
                "rushingTouchdowns": 0.0,
                "longRushing": 0.0,
                "receptions": 0.0,
                "receivingTargets": 0.0,
                "receivingYards": 0.0,
                "receivingTouchdowns": 0.0,
                "longReception": 0.0,
                "fumblesLost": 0.0,
                "totalTackles": 0.0,
                "soloTackles": 0.0,
                "sacks": 0.0,
                "fieldGoalsMade": 0.0,
                "fgPoints": 0.0,
                "extraPointsMade": 0.0,
                "receivingYards_1Q": 0.0,
                "receivingYards_1H": 0.0,
                "receptions_1Q": 0.0,
                "receptions_1H": 0.0,
                "anytimeTouchdowns": 0.0,
            }
        return players[canon]

    # 1. Full boxscore category extraction
    box_players = (summary.get("boxscore") or {}).get("players") or []
    for team_block in box_players:
        for cat in team_block.get("statistics") or []:
            cat_name = str(cat.get("name") or "")
            keys = [str(k) for k in (cat.get("keys") or [])]
            for ath_row in cat.get("athletes") or []:
                disp = str((ath_row.get("athlete") or {}).get("displayName") or "")
                if not disp:
                    continue
                p = ensure_player(disp)
                vals = ath_row.get("stats") or []
                kv = dict(zip(keys, vals))

                if cat_name == "passing":
                    c_a = kv.get("completions/passingAttempts")
                    if c_a is not None:
                        comp, att = _parse_made_attempts(c_a)
                        p["completions"] = comp
                        p["passingAttempts"] = att
                    p["passingYards"] = _parse_float(kv.get("passingYards"))
                    p["passingTouchdowns"] = _parse_float(kv.get("passingTouchdowns"))
                    p["passingInterceptions"] = _parse_float(kv.get("interceptions"))
                elif cat_name == "rushing":
                    p["rushingAttempts"] = _parse_float(kv.get("rushingAttempts"))
                    p["rushingYards"] = _parse_float(kv.get("rushingYards"))
                    p["rushingTouchdowns"] = _parse_float(kv.get("rushingTouchdowns"))
                    p["longRushing"] = _parse_float(kv.get("longRushing"))
                elif cat_name == "receiving":
                    p["receptions"] = _parse_float(kv.get("receptions"))
                    p["receivingYards"] = _parse_float(kv.get("receivingYards"))
                    p["receivingTouchdowns"] = _parse_float(kv.get("receivingTouchdowns"))
                    p["longReception"] = _parse_float(kv.get("longReception"))
                    p["receivingTargets"] = _parse_float(kv.get("receivingTargets"))
                elif cat_name == "fumbles":
                    p["fumblesLost"] = _parse_float(kv.get("fumblesLost"))
                elif cat_name == "defensive":
                    p["totalTackles"] = _parse_float(kv.get("totalTackles"))
                    p["soloTackles"] = _parse_float(kv.get("soloTackles"))
                    p["sacks"] = _parse_float(kv.get("sacks"))
                elif cat_name == "kicking":
                    fgm, _ = _parse_made_attempts(kv.get("fieldGoalsMade/fieldGoalAttempts"))
                    xpm, _ = _parse_made_attempts(kv.get("extraPointsMade/extraPointAttempts"))
                    p["fieldGoalsMade"] = fgm
                    p["extraPointsMade"] = xpm
                    # Default FG distance scoring unless PBP supplies exact yards
                    if p["fgPoints"] == 0.0 and fgm > 0:
                        long_fg = _parse_float(kv.get("longFieldGoalMade"))
                        if fgm == 1:
                            p["fgPoints"] = 5.0 if long_fg >= 50 else (4.0 if long_fg >= 40 else 3.0)
                        else:
                            p["fgPoints"] = fgm * 3.0

    # 2. Play-by-play extraction for 1Q/1H receiving, longest completion, and FG distances
    pass_re = re.compile(
        r"pass\s+(?:short|deep)?\s*(?:left|middle|right)?\s*to\s+([A-Z]\.[A-Za-z'\-]+(?:\s+Jr\.|\s+Sr\.|\s+II|\s+III)?)"
        r".*?\bfor\s+(?:(no\s+gain)|(-?\d+)\s+yards?)",
        re.IGNORECASE,
    )
    passer_re = re.compile(r"([A-Z]\.[A-Za-z'\-]+)\s+pass\s+", re.IGNORECASE)
    fg_re = re.compile(
        r"([A-Z]\.[A-Za-z'\-]+)\s+(\d+)\s+yard\s+field\s+goal\s+is\s+GOOD",
        re.IGNORECASE,
    )

    fg_pts_by_kicker: dict[str, float] = {}
    for pl in _iter_unique_plays(summary):
        text = str(pl.get("text") or "")
        low = text.lower()
        if "no play" in low or "reversed" in low:
            continue
        qtr = int((pl.get("period") or {}).get("number") or 0)
        ptype = str((pl.get("type") or {}).get("text") or "")

        fg_m = fg_re.search(text)
        if fg_m:
            k_name = _canonical_player_name(fg_m.group(1))
            dist = int(fg_m.group(2))
            pts = 5.0 if dist >= 50 else (4.0 if dist >= 40 else 3.0)
            fg_pts_by_kicker[k_name] = fg_pts_by_kicker.get(k_name, 0.0) + pts

        is_comp = ptype in ("Pass Reception", "Passing Touchdown") or (
            "pass " in low and "incomplete" not in low and "sacked" not in low and "intercepted" not in low
        )
        if not is_comp:
            continue

        m = pass_re.search(text)
        if m:
            rec_name = _canonical_player_name(m.group(1))
            yds = 0.0 if m.group(2) else float(int(m.group(3)))
            rp = ensure_player(rec_name)
            if qtr == 1:
                rp["receivingYards_1Q"] += yds
                rp["receptions_1Q"] += 1.0
            if qtr in (1, 2):
                rp["receivingYards_1H"] += yds
                rp["receptions_1H"] += 1.0
            if yds > rp["longReception"]:
                rp["longReception"] = yds

            pm = passer_re.search(text)
            if pm:
                qb_p = ensure_player(pm.group(1))
                if yds > qb_p["longPassing"]:
                    qb_p["longPassing"] = yds

    for k_name, pts in fg_pts_by_kicker.items():
        kp = ensure_player(k_name)
        if pts > 0:
            kp["fgPoints"] = pts

    # 3. Cross-check single-QB team max longReception -> QB longPassing, Q1/1H live sync & derived stats
    for team_block in box_players:
        passers: list[str] = []
        max_team_long_rec = 0.0
        for cat in team_block.get("statistics") or []:
            cname = str(cat.get("name") or "")
            keys = [str(k) for k in (cat.get("keys") or [])]
            for ath_row in cat.get("athletes") or []:
                disp = str((ath_row.get("athlete") or {}).get("displayName") or "")
                if not disp:
                    continue
                kv = dict(zip(keys, ath_row.get("stats") or []))
                if cname == "passing":
                    _, att = _parse_made_attempts(kv.get("completions/passingAttempts"))
                    if att > 0:
                        passers.append(_canonical_player_name(disp))
                elif cname == "receiving":
                    lr = _parse_float(kv.get("longReception"))
                    if lr > max_team_long_rec:
                        max_team_long_rec = lr
        if len(passers) == 1 and max_team_long_rec > 0:
            qb_p = ensure_player(passers[0])
            if max_team_long_rec > qb_p["longPassing"]:
                qb_p["longPassing"] = max_team_long_rec

    for canon, p in players.items():
        if game_state.period == 1 and p["receivingYards"] > p["receivingYards_1Q"]:
            p["receivingYards_1Q"] = p["receivingYards"]
            p["receivingYards_1H"] = p["receivingYards"]
        elif game_state.period == 2 and p["receivingYards"] > p["receivingYards_1H"]:
            p["receivingYards_1H"] = p["receivingYards"]
        p["anytimeTouchdowns"] = p["rushingTouchdowns"] + p["receivingTouchdowns"]
        p["rushPlusRecYards"] = p["rushingYards"] + p["receivingYards"]

    return players


def evaluate_prop(
    spec: dict[str, Any],
    player_stats: dict[str, dict[str, float]],
    game_state: GameClockState,
) -> dict[str, Any]:
    window = str(spec.get("window") or "FULL")
    stat_key = str(spec["stat_key"])
    side = str(spec["side"]).upper()
    line = float(spec["line"])

    if stat_key == "game_1q_total":
        actual = float(game_state.away_quarters.get("1Q", 0) + game_state.home_quarters.get("1Q", 0))
    else:
        p = player_stats.get(spec["player"], {})
        actual = float(p.get(stat_key, 0.0))

    if window == "1Q":
        window_finished = game_state.completed or game_state.period > 1
    elif window == "1H":
        window_finished = (
            game_state.completed
            or game_state.period > 2
            or game_state.status_name == "STATUS_HALFTIME"
        )
    else:
        window_finished = game_state.completed

    status = "PENDING"
    if side == "OVER":
        if actual > line:
            status = "WIN" if window_finished else "CASHED_EARLY"
        elif window_finished:
            status = "PUSH" if actual == line else "LOSS"
    elif side == "UNDER":
        if actual > line:
            status = "BUSTED_EARLY" if not window_finished else "LOSS"
        elif window_finished:
            status = "WIN" if actual < line else "PUSH"

    return {
        **spec,
        "actual": round(actual, 2),
        "window_finished": window_finished,
        "status": status,
        "is_win_locked": status in ("WIN", "CASHED_EARLY"),
        "is_loss": status in ("LOSS", "BUSTED_EARLY"),
    }


def american_to_decimal_profit_per_dollar(american_odds: int) -> float:
    if american_odds > 0:
        return american_odds / 100.0
    return 100.0 / abs(american_odds)


def compute_dk_showdown_player_points(
    stats: dict[str, float], is_captain: bool = False
) -> float:
    """Compute DraftKings Showdown points (+1.5x if CPT, +3 bonuses at 300 pass / 100 rush / 100 rec)."""
    pts = 0.0
    pass_yds = stats.get("passingYards", 0.0)
    rush_yds = stats.get("rushingYards", 0.0)
    rec_yds = stats.get("receivingYards", 0.0)

    pts += pass_yds * 0.04
    pts += stats.get("passingTouchdowns", 0.0) * 4.0
    pts -= stats.get("passingInterceptions", 0.0) * 1.0
    if pass_yds >= 300.0:
        pts += 3.0

    pts += rush_yds * 0.1
    pts += stats.get("rushingTouchdowns", 0.0) * 6.0
    if rush_yds >= 100.0:
        pts += 3.0

    pts += stats.get("receptions", 0.0) * 1.0
    pts += rec_yds * 0.1
    pts += stats.get("receivingTouchdowns", 0.0) * 6.0
    if rec_yds >= 100.0:
        pts += 3.0

    pts -= stats.get("fumblesLost", 0.0) * 1.0
    pts += stats.get("extraPointsMade", 0.0) * 1.0
    pts += stats.get("fgPoints", 0.0)

    mult = 1.5 if is_captain else 1.0
    return round(pts * mult, 2)


def grade_dk_showdown_lineups(player_stats: dict[str, dict[str, float]]) -> dict[str, Any]:
    cash_slots = [
        ("CPT", "C.J. Stroud", 14400, True),
        ("FLEX", "David Montgomery", 9400, False),
        ("FLEX", "Nico Collins", 10600, False),
        ("FLEX", "Tyler Warren", 6400, False),
        ("FLEX", "Xavier Hutchinson", 2400, False),
        ("FLEX", "Ka'imi Fairbairn", 4400, False),
    ]
    gpp_slots = [
        ("CPT", "Nico Collins", 15900, True),
        ("FLEX", "C.J. Stroud", 9600, False),
        ("FLEX", "David Montgomery", 9400, False),
        ("FLEX", "Tank Dell", 5200, False),
        ("FLEX", "Dalton Schultz", 3400, False),
        ("FLEX", "Tyler Warren", 6400, False),
    ]

    def score_lineup(slots: list[tuple[str, str, int, bool]], proj_mean: float) -> dict[str, Any]:
        breakdown = []
        total = 0.0
        for role, name, salary, is_cpt in slots:
            pstats = player_stats.get(name, {})
            fpts = compute_dk_showdown_player_points(pstats, is_captain=is_cpt)
            total += fpts
            breakdown.append(
                {
                    "slot": role,
                    "player": name,
                    "salary": salary,
                    "fantasy_points": fpts,
                }
            )
        return {
            "projected_mean": proj_mean,
            "actual_points": round(total, 2),
            "slots": breakdown,
        }

    return {
        "cash_optimal": score_lineup(cash_slots, 99.80),
        "gpp_pivot": score_lineup(gpp_slots, 101.20),
    }


def grade_stage5_main_lines(game_state: GameClockState) -> list[dict[str, Any]]:
    margin_hou = float(game_state.home_score - game_state.away_score)
    total = float(game_state.home_score + game_state.away_score)
    fin = game_state.completed

    def settle(won: bool, pushed: bool = False) -> str:
        if not fin:
            return "LIVE_AHEAD" if won else "LIVE_BEHIND"
        if pushed:
            return "PUSH"
        return "WIN" if won else "LOSS"

    return [
        {
            "market": "Spread",
            "selection": "HOU -12.5",
            "odds": -106,
            "stage5_verdict": "PASS",
            "confidence": "62/100",
            "counterfactual_status": settle(margin_hou > 12.5),
        },
        {
            "market": "Spread",
            "selection": "IND +12.5",
            "odds": -114,
            "stage5_verdict": "PASS",
            "confidence": "51/100",
            "counterfactual_status": settle(margin_hou < 12.5),
        },
        {
            "market": "Total",
            "selection": "Over 44.5",
            "odds": -104,
            "stage5_verdict": "PASS",
            "confidence": "53/100",
            "counterfactual_status": settle(total > 44.5),
        },
        {
            "market": "Total",
            "selection": "Under 44.5",
            "odds": -116,
            "stage5_verdict": "PASS",
            "confidence": "51/100",
            "counterfactual_status": settle(total < 44.5),
        },
        {
            "market": "Moneyline",
            "selection": "HOU ML",
            "odds": -690,
            "stage5_verdict": "PASS",
            "confidence": "53/100",
            "counterfactual_status": settle(margin_hou > 0, pushed=(margin_hou == 0)),
        },
        {
            "market": "Moneyline",
            "selection": "IND ML",
            "odds": 499,
            "stage5_verdict": "PASS",
            "confidence": "51/100",
            "counterfactual_status": settle(margin_hou < 0, pushed=(margin_hou == 0)),
        },
    ]


def grade_personal_bankroll_52(
    graded_by_rank: dict[int, dict[str, Any]],
    player_stats: dict[str, dict[str, float]],
    game_state: GameClockState,
    showdown_res: dict[str, Any],
) -> dict[str, Any]:
    straight_specs = [
        ("Bucket 1 Core #1", 19, 5.00),
        ("Bucket 1 Core #2", 1, 5.00),
        ("Bucket 1 Core #3", 7, 5.00),
        ("Bucket 1 Core #4", 11, 5.00),
        ("Bucket 1 Core #5", 2, 5.00),
        ("Bucket 2 Fast #6", 9, 3.50),
        ("Bucket 2 Fast #7", 12, 3.50),
        ("Bucket 2 Fast #8", 15, 3.50),
        ("Bucket 2 Fast #9", 24, 2.50),
    ]

    straights = []
    realized_pnl_usd = 0.0
    settled_stake_usd = 0.0
    for label, rank, stake in straight_specs:
        g = graded_by_rank[rank]
        st = g["status"]
        pnl = 0.0
        if st in ("WIN", "CASHED_EARLY"):
            pnl = round(stake * american_to_decimal_profit_per_dollar(-110), 2)
            settled_stake_usd += stake
        elif st in ("LOSS", "BUSTED_EARLY"):
            pnl = -stake
            settled_stake_usd += stake
        realized_pnl_usd += pnl
        straights.append(
            {
                "ticket": label,
                "stake_usd": stake,
                "selection": f"{g['player']} {g['side']} {g['line']} {g['market']}",
                "actual": g["actual"],
                "status": st,
                "pnl_at_minus110_usd": pnl,
            }
        )

    # Extra Montgomery Rush+Rec leg used in SGP B
    mont_rr = evaluate_prop(
        {
            "rank": 101,
            "player": "David Montgomery",
            "team": "HOU",
            "market": "Rush + Rec Yards",
            "stat_key": "rushPlusRecYards",
            "window": "FULL",
            "line": 64.5,
            "side": "OVER",
            "win_prob": 0.5865,
            "confidence": "59/100",
            "play_to": -134,
        },
        player_stats,
        game_state,
    )

    sgp_defs = [
        (
            "Bucket 3 SGP 1",
            3.50,
            425,
            [graded_by_rank[2], graded_by_rank[1], graded_by_rank[7], graded_by_rank[11]],
        ),
        (
            "Bucket 3 SGP 2",
            2.50,
            550,
            [graded_by_rank[15], mont_rr, graded_by_rank[24]],
        ),
        (
            "Bucket 3 SGP 3",
            2.00,
            650,
            [graded_by_rank[14], graded_by_rank[10], graded_by_rank[8], graded_by_rank[22]],
        ),
    ]

    sgps = []
    for label, stake, odds, legs in sgp_defs:
        statuses = [l["status"] for l in legs]
        if any(s in ("LOSS", "BUSTED_EARLY") for s in statuses):
            sgp_status = "LOSS"
            pnl = -stake
            settled_stake_usd += stake
        elif all(s in ("WIN", "CASHED_EARLY") for s in statuses):
            sgp_status = "WIN" if game_state.completed else "CASHED_EARLY"
            pnl = round(stake * (odds / 100.0), 2)
            settled_stake_usd += stake
        else:
            sgp_status = "PENDING"
            pnl = 0.0
        realized_pnl_usd += pnl
        sgps.append(
            {
                "ticket": label,
                "stake_usd": stake,
                "benchmark_odds": f"+{odds}",
                "legs_cashed": sum(1 for s in statuses if s in ("WIN", "CASHED_EARLY")),
                "legs_lost": sum(1 for s in statuses if s in ("LOSS", "BUSTED_EARLY")),
                "legs_total": len(legs),
                "status": sgp_status,
                "pnl_usd": pnl,
            }
        )

    return {
        "total_bankroll_usd": 52.00,
        "settled_stake_usd": round(settled_stake_usd, 2),
        "realized_bet_pnl_usd": round(realized_pnl_usd, 2),
        "straights": straights,
        "sgps": sgps,
        "dfs_allocation_usd": 6.00,
        "dfs_live_scores": {
            "cash_optimal_5usd": showdown_res["cash_optimal"]["actual_points"],
            "gpp_pivot_1usd": showdown_res["gpp_pivot"]["actual_points"],
        },
    }


def grade_espn_summary(summary: dict[str, Any]) -> dict[str, Any]:
    game_state = parse_game_clock_and_scores(summary)
    player_stats = extract_player_stats(summary, game_state)

    graded_props = [evaluate_prop(spec, player_stats, game_state) for spec in OFFICIAL_24_PROPS]
    by_rank = {g["rank"]: g for g in graded_props}

    wins = sum(1 for g in graded_props if g["is_win_locked"])
    losses = sum(1 for g in graded_props if g["is_loss"])
    pushes = sum(1 for g in graded_props if g["status"] == "PUSH")
    pending = sum(1 for g in graded_props if g["status"] == "PENDING")

    main_lines = grade_stage5_main_lines(game_state)
    showdown = grade_dk_showdown_lineups(player_stats)
    bankroll = grade_personal_bankroll_52(by_rank, player_stats, game_state, showdown)

    return {
        "schema": "gse_tnf_week11_live_grade_v1",
        "event_id": "401873066",
        "matchup": "IND @ HOU",
        "graded_at_utc": datetime.now(timezone.utc).isoformat(),
        "game_state": {
            "status_name": game_state.status_name,
            "state": game_state.state,
            "completed": game_state.completed,
            "period": game_state.period,
            "clock": game_state.clock,
            "detail": game_state.detail,
            "ind_score": game_state.away_score,
            "hou_score": game_state.home_score,
            "ind_quarters": game_state.away_quarters,
            "hou_quarters": game_state.home_quarters,
            "branch_active": "BRANCH_B_SAUCE_GARDNER_OUT",
        },
        "summary_record": {
            "total_props": len(graded_props),
            "wins_or_cashed_early": wins,
            "losses": losses,
            "pushes": pushes,
            "pending": pending,
            "record_str": f"{wins}-{losses}-{pushes}",
        },
        "props_24": graded_props,
        "stage5_pass_main_lines": main_lines,
        "dk_showdown": showdown,
        "personal_bankroll_52": bankroll,
    }


def render_markdown_ledger(report: dict[str, Any]) -> str:
    gs = report["game_state"]
    rec = report["summary_record"]
    bk = report["personal_bankroll_52"]
    sd = report["dk_showdown"]

    lines: list[str] = [
        "# Week 11 TNF Live Grading Ledger: IND @ HOU (ESPN Event 401873066)",
        "",
        f"- **Updated UTC:** `{report['graded_at_utc']}`",
        f"- **Game Status:** `{gs['detail']}` (`{gs['status_name']}`, Period `{gs['period']}`, Completed `{gs['completed']}`)",
        f"- **Score:** `IND {gs['ind_score']} - HOU {gs['hou_score']}` (1Q IND {gs['ind_quarters']['1Q']} / HOU {gs['hou_quarters']['1Q']} | Total 1Q: {gs['ind_quarters']['1Q'] + gs['hou_quarters']['1Q']})",
        f"- **Official 24-Prop Card Record:** `{rec['record_str']}` (`{rec['wins_or_cashed_early']}` cashed/won, `{rec['losses']}` lost, `{rec['pushes']}` pushed, `{rec['pending']}` pending)",
        "",
        "## 1. All 24 Play-To 360-Board Props",
        "",
        "| # | Player | Market | Pick | Actual | Conf | Play-To | Status |",
        "|---:|---|---|---|---:|---:|---:|---|",
    ]

    for p in report["props_24"]:
        lines.append(
            f"| {p['rank']} | {p['player']} ({p['team']}) | {p['market']} | {p['side']} {p['line']} | {p['actual']} | {p['confidence']} | {p['play_to']} | `{p['status']}` |"
        )

    lines.extend(
        [
            "",
            "## 2. Stage-5 PASS Main Lines (Counterfactual Branch B Tracking)",
            "",
            "| Market | Selection | Odds | Stage-5 Verdict | Conf | Counterfactual Status |",
            "|---|---|---:|---|---:|---|",
        ]
    )
    for m in report["stage5_pass_main_lines"]:
        lines.append(
            f"| {m['market']} | {m['selection']} | {m['odds']} | `{m['stage5_verdict']}` | {m['confidence']} | `{m['counterfactual_status']}` |"
        )

    lines.extend(
        [
            "",
            "## 3. $52.00 Personal Bankroll Allocation Live P&L",
            "",
            f"- **Settled / Early-Cashed Sportsbook P&L:** `${bk['realized_bet_pnl_usd']:+.2f}` on `${bk['settled_stake_usd']:.2f}` settled (`$52.00` total card incl. `$6.00` DFS)",
            "",
            "| Ticket | Stake | Pick | Actual | Status | P&L ($ @ -110) |",
            "|---|---:|---|---:|---|---:|",
        ]
    )
    for t in bk["straights"]:
        lines.append(
            f"| {t['ticket']} | ${t['stake_usd']:.2f} | {t['selection']} | {t['actual']} | `{t['status']}` | ${t['pnl_at_minus110_usd']:+.2f} |"
        )
    for s in bk["sgps"]:
        lines.append(
            f"| {s['ticket']} | ${s['stake_usd']:.2f} | SGP ({s['benchmark_odds']}, {s['legs_cashed']}/{s['legs_total']} legs) | - | `{s['status']}` | ${s['pnl_usd']:+.2f} |"
        )

    lines.extend(
        [
            "",
            "## 4. DraftKings Showdown Optimal 6-Man Live Scores",
            "",
            f"- **Cash Optimal (CPT Stroud, Proj 99.80):** `{sd['cash_optimal']['actual_points']:.2f} pts`",
            f"- **GPP Pivot (CPT Collins, Proj 101.20):** `{sd['gpp_pivot']['actual_points']:.2f} pts`",
            "",
            "| Roster | Slot | Player | Salary | Live DK Pts |",
            "|---|---|---|---:|---:|",
        ]
    )
    for rname, robj in [("Cash Optimal", sd["cash_optimal"]), ("GPP Pivot", sd["gpp_pivot"])]:
        for sl in robj["slots"]:
            lines.append(
                f"| {rname} | {sl['slot']} | {sl['player']} | ${sl['salary']:,} | {sl['fantasy_points']:.2f} |"
            )

    text = "\n".join(lines) + "\n"
    return text.encode("ascii", errors="replace").decode("ascii")


def fetch_espn_summary(url: str = ESPN_SUMMARY_URL) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GSE-LiveGrader/1.0", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Grade Week 11 TNF IND @ HOU live/final.")
    parser.add_argument("--fixture-json", type=str, default=None, help="Offline ESPN summary JSON")
    parser.add_argument("--json-out", type=str, default=str(DEFAULT_JSON_OUT))
    parser.add_argument("--md-out", type=str, default=str(DEFAULT_MD_OUT))
    args = parser.parse_args()

    if args.fixture_json:
        summary = json.loads(Path(args.fixture_json).read_text(encoding="utf-8"))
    else:
        summary = fetch_espn_summary()

    report = grade_espn_summary(summary)
    md = render_markdown_ledger(report)

    json_out = Path(args.json_out)
    json_out.parent.mkdir(parents=True, exist_ok=True)
    json_out.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n", encoding="ascii")

    md_out = Path(args.md_out)
    md_out.parent.mkdir(parents=True, exist_ok=True)
    md_out.write_text(md, encoding="ascii")

    rec = report["summary_record"]
    gs = report["game_state"]
    print(
        f"[TNF GRADER] {gs['detail']} | IND {gs['ind_score']} - HOU {gs['hou_score']} | "
        f"24-Prop Record: {rec['record_str']} ({rec['pending']} pending) | "
        f"DK Cash: {report['dk_showdown']['cash_optimal']['actual_points']:.2f} pts"
    )


if __name__ == "__main__":
    main()
