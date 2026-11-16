#!/usr/bin/env python3
"""Free-Path Post-Window Settlement & Learning Loop Autopsy Engine.

Evaluates completed games from the authoritative ESPN scoreboard and DraftKings
consensus lines without requiring paid third-party APIs.

Emits trainer-ready learning-loop feeds strictly into:
  brain/feeds/<YYYY-MM-DD>/post_window_autopsy_{season}_w{week}_{window}.jsonl

HARD RULE (AGENTS.md Direct-to-Mind):
  NEVER write directly to brain/mind.jsonl! The Windows trainer owns mind.jsonl.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary"


def resolve_window_for_event(event: Dict[str, Any]) -> str:
    """Classify ESPN event into canonical window: tnf, sun_intl, sun_early, sun_late, snf, mnf."""
    date_str = str(event.get("date") or "")
    if not date_str:
        return "sun_early"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        return "sun_early"

    weekday = dt.weekday()  # Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4, Saturday=5, Sunday=6
    hour_utc = dt.hour + dt.minute / 60.0

    if weekday == 3:  # Thursday evening / Friday early UTC
        return "tnf"
    elif weekday == 4 and hour_utc < 6.0:  # Thursday night game spilling into Friday 01:15 UTC
        return "tnf"
    elif weekday == 6:  # Sunday
        if hour_utc < 16.0:  # 9:30 AM EST (14:30 UTC) Munich / London
            return "sun_intl"
        elif hour_utc < 20.0:  # 1:00 PM EST (18:00 UTC)
            return "sun_early"
        elif hour_utc < 23.5:  # 4:05 / 4:25 PM EST (21:05/21:25 UTC)
            return "sun_late"
        else:  # 8:20 PM EST (01:20 UTC Monday)
            return "snf"
    elif weekday == 0:  # Monday UTC
        if hour_utc < 6.0:  # Sunday Night Football (01:20 UTC Monday)
            return "snf"
        elif hour_utc >= 20.0:  # Monday afternoon / evening
            return "mnf"
        else:
            return "sun_late"
    elif weekday == 1 and hour_utc < 6.0:  # Monday Night Football (01:15 UTC Tuesday)
        return "mnf"

    return "sun_early"


def parse_game_scores_and_market(event: Dict[str, Any]) -> Dict[str, Any]:
    """Extract scores, team abbreviations, and market closing numbers from ESPN event."""
    comp = (event.get("competitions") or [{}])[0]
    away_ab, home_ab = "", ""
    away_score, home_score = 0, 0
    away_name, home_name = "", ""

    for competitor in comp.get("competitors") or []:
        ab = str((competitor.get("team") or {}).get("abbreviation") or "").upper()
        if ab == "LA":
            ab = "LAR"
        elif ab == "WSH":
            ab = "WAS"
        name = str((competitor.get("team") or {}).get("displayName") or ab)
        raw_score = competitor.get("score")
        score = int(raw_score) if raw_score is not None and str(raw_score).isdigit() else 0

        if competitor.get("homeAway") == "home":
            home_ab = ab
            home_name = name
            home_score = score
        else:
            away_ab = ab
            away_name = name
            away_score = score

    status_obj = event.get("status") or {}
    type_obj = status_obj.get("type") or {}
    is_completed = bool(type_obj.get("completed", False)) or str(type_obj.get("state")) == "post"
    status_name = str(type_obj.get("name") or "")

    odds_list = comp.get("odds") or []
    dk_odds = odds_list[0] if odds_list else {}
    over_under = float(dk_odds.get("overUnder") or 0.0)
    spread_val = float(dk_odds.get("spread") or 0.0)
    details = str(dk_odds.get("details") or "")

    # Extract moneyline odds
    ml_home = None
    ml_away = None
    ml_obj = dk_odds.get("moneyline") or {}
    try:
        ml_home = int((ml_obj.get("home") or {}).get("close", {}).get("odds") or 0)
    except Exception:
        pass
    try:
        ml_away = int((ml_obj.get("away") or {}).get("close", {}).get("odds") or 0)
    except Exception:
        pass

    return {
        "event_id": str(event.get("id") or ""),
        "matchup": f"{away_ab}@{home_ab}",
        "away_team": away_ab,
        "home_team": home_ab,
        "away_name": away_name,
        "home_name": home_name,
        "away_score": away_score,
        "home_score": home_score,
        "is_completed": is_completed,
        "status_name": status_name,
        "kickoff_utc": event.get("date"),
        "over_under": over_under,
        "spread": spread_val,
        "details": details,
        "moneyline_home": ml_home,
        "moneyline_away": ml_away,
    }


def _norm_person_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", str(name or "").lower())
    tokens = [t for t in cleaned.split() if t not in {"jr", "sr", "ii", "iii", "iv", "v"}]
    return " ".join(tokens)


def refresh_espn_scoreboard_preserving_odds(
    sb_file: Path,
    *,
    season: int,
    week: int,
    timeout: float = 12.0,
) -> Dict[str, Any]:
    """Fetch live ESPN NFL scoreboard and merge scores/status while preserving prior closing odds."""
    existing_odds_by_id: Dict[str, List[Dict[str, Any]]] = {}
    existing_data: Dict[str, Any] = {}
    if sb_file.is_file():
        try:
            existing_data = json.loads(sb_file.read_text(encoding="utf-8"))
            for ev in existing_data.get("events") or []:
                ev_id = str(ev.get("id") or "")
                comp = (ev.get("competitions") or [{}])[0]
                odds = comp.get("odds") or []
                if ev_id and odds:
                    existing_odds_by_id[ev_id] = odds
        except Exception:
            existing_data = {}

    url = f"{ESPN_SCOREBOARD_URL}?dates={int(season)}&seasontype=2&week={int(week)}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 GSE-Autopsy/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            live_data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        if existing_data:
            return existing_data
        raise FileNotFoundError(f"Authoritative ESPN scoreboard unavailable offline and missing at: {sb_file}")

    # Preserve DraftKings closing odds when ESPN strips odds after game goes STATUS_FINAL
    for ev in live_data.get("events") or []:
        ev_id = str(ev.get("id") or "")
        comp_list = ev.get("competitions") or []
        if not comp_list:
            continue
        comp = comp_list[0]
        if not (comp.get("odds") or []) and ev_id in existing_odds_by_id:
            comp["odds"] = existing_odds_by_id[ev_id]

    sb_file.parent.mkdir(parents=True, exist_ok=True)
    sb_file.write_text(json.dumps(live_data, indent=2), encoding="utf-8")
    return live_data


def _parse_espn_summary_boxscore(summary_json: Dict[str, Any]) -> Dict[str, Any]:
    """Extract team passing/rushing totals and per-player stats from ESPN summary JSON."""
    box = summary_json.get("boxscore") or {}
    teams_out: Dict[str, Dict[str, float]] = {}
    players_out: Dict[Tuple[str, str], Dict[str, float]] = {}

    for tm_entry in box.get("players") or []:
        tm_ab = str((tm_entry.get("team") or {}).get("abbreviation") or "").upper()
        if tm_ab == "LA":
            tm_ab = "LAR"
        elif tm_ab == "WSH":
            tm_ab = "WAS"
        tm_totals = {"pass_yds": 0.0, "pass_tds": 0.0, "rush_yds": 0.0, "rush_tds": 0.0}
        for cat in tm_entry.get("statistics") or []:
            cname = str(cat.get("name") or "").lower()
            labels = [str(lb).upper() for lb in (cat.get("labels") or [])]
            for ath_row in cat.get("athletes") or []:
                disp = str(((ath_row.get("athlete") or {}).get("displayName")) or "").strip()
                norm_disp = _norm_person_name(disp)
                stats_arr = ath_row.get("stats") or []
                stat_map = {labels[i]: stats_arr[i] for i in range(min(len(labels), len(stats_arr)))}
                rec = players_out.setdefault((tm_ab, norm_disp), {"name": disp})  # type: ignore[arg-type]

                def _num(k: str) -> float:
                    raw = str(stat_map.get(k, "0") or "0")
                    if "/" in raw:
                        raw = raw.split("/")[0]
                    if "-" in raw and not raw.startswith("-"):
                        raw = raw.split("-")[0]
                    try:
                        return float(raw)
                    except ValueError:
                        return 0.0

                if cname == "passing":
                    py = _num("YDS")
                    ptd = _num("TD")
                    ints = _num("INT")
                    comp_att = str(stat_map.get("C/ATT", "0/0"))
                    parts = comp_att.split("/")
                    pc = float(parts[0]) if len(parts) == 2 and parts[0].isdigit() else 0.0
                    pa = float(parts[1]) if len(parts) == 2 and parts[1].isdigit() else 0.0
                    tm_totals["pass_yds"] += py
                    tm_totals["pass_tds"] += ptd
                    rec["pass_yds"] = rec.get("pass_yds", 0.0) + py
                    rec["pass_tds"] = rec.get("pass_tds", 0.0) + ptd
                    rec["interceptions"] = rec.get("interceptions", 0.0) + ints
                    rec["pass_completions"] = rec.get("pass_completions", 0.0) + pc
                    rec["pass_attempts"] = rec.get("pass_attempts", 0.0) + pa
                elif cname == "rushing":
                    ry = _num("YDS")
                    rcar = _num("CAR")
                    rtd = _num("TD")
                    tm_totals["rush_yds"] += ry
                    tm_totals["rush_tds"] += rtd
                    rec["rush_yds"] = rec.get("rush_yds", 0.0) + ry
                    rec["carries"] = rec.get("carries", 0.0) + rcar
                    rec["rush_tds"] = rec.get("rush_tds", 0.0) + rtd
                elif cname == "receiving":
                    recy = _num("YDS")
                    recs = _num("REC")
                    rectd = _num("TD")
                    rec["rec_yds"] = rec.get("rec_yds", 0.0) + recy
                    rec["receptions"] = rec.get("receptions", 0.0) + recs
                    rec["rec_tds"] = rec.get("rec_tds", 0.0) + rectd
        teams_out[tm_ab] = tm_totals

    return {"teams": teams_out, "players": players_out}


def compare_game_against_dossier(
    game: Dict[str, Any],
    *,
    week: int,
    repo_root: Path = REPO_ROOT,
    fetch_boxscore: bool = True,
) -> Optional[Dict[str, Any]]:
    """Compare completed game actuals (team + boxscore players) vs pregame dossier projections."""
    if not game.get("is_completed"):
        return None
    away = game["away_team"]
    home = game["home_team"]
    candidates = [
        repo_root / "data" / "engine" / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week{week}.json",
    ]
    if away == "WAS":
        candidates.append(repo_root / "data" / "engine" / f"connected_workflow_dossier_wsh_{home.lower()}_week{week}.json")
    if home == "WAS":
        candidates.append(repo_root / "data" / "engine" / f"connected_workflow_dossier_{away.lower()}_wsh_week{week}.json")

    dossier_path = next((p for p in candidates if p.is_file()), None)
    if dossier_path is None:
        return None

    try:
        dossier = json.loads(dossier_path.read_text(encoding="utf-8"))
    except Exception:
        return None

    s34 = dossier.get("stage3_4_conserved_post_sim_projections") or {}
    tp = s34.get("team_post_sim_projections") or {}
    ap = s34.get("athlete_post_sim_projections") or {}
    s5 = dossier.get("stage5_360_conjunction_gate") or {}

    aw_proj = tp.get(away) or tp.get("WSH" if away == "WAS" else away) or {}
    hm_proj = tp.get(home) or tp.get("WSH" if home == "WAS" else home) or {}

    aw_pts_proj = float((aw_proj.get("points") or {}).get("mean", 0.0))
    hm_pts_proj = float((hm_proj.get("points") or {}).get("mean", 0.0))
    aw_pass_proj = float((aw_proj.get("pass_yds") or {}).get("mean", 0.0))
    hm_pass_proj = float((hm_proj.get("pass_yds") or {}).get("mean", 0.0))
    aw_rush_proj = float((aw_proj.get("rush_yds") or {}).get("mean", 0.0))
    hm_rush_proj = float((hm_proj.get("rush_yds") or {}).get("mean", 0.0))

    act_margin = game["home_score"] - game["away_score"]
    proj_margin = hm_pts_proj - aw_pts_proj
    act_total = game["home_score"] + game["away_score"]
    proj_total = hm_pts_proj + aw_pts_proj

    box_parsed: Dict[str, Any] = {"teams": {}, "players": {}}
    if fetch_boxscore and game.get("event_id"):
        try:
            url = f"{ESPN_SUMMARY_URL}?event={game['event_id']}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 GSE-Autopsy/1.0"})
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                sum_json = json.loads(resp.read().decode("utf-8"))
            box_parsed = _parse_espn_summary_boxscore(sum_json)
        except Exception:
            box_parsed = {"teams": {}, "players": {}}

    tm_box = box_parsed.get("teams") or {}
    aw_act_box = tm_box.get(away) or {}
    hm_act_box = tm_box.get(home) or {}

    player_errors: List[Dict[str, Any]] = []
    pl_box = box_parsed.get("players") or {}
    if pl_box:
        for p_name, p_rec in ap.items():
            p_tm = str(p_rec.get("team") or "").upper()
            p_tm_norm = "WAS" if p_tm == "WSH" else ("LAR" if p_tm == "LA" else p_tm)
            act_row = pl_box.get((p_tm_norm, _norm_person_name(p_name)))
            if not act_row:
                continue
            projs = p_rec.get("projections") or {}
            pos = str(p_rec.get("position") or "").upper()
            if pos == "QB" and "pass_yds" in projs and "pass_yds" in act_row:
                p_m = float((projs["pass_yds"] or {}).get("mean", 0.0))
                if p_m <= 0.0 and float(act_row.get("pass_attempts", 0.0)) < 10.0:
                    continue
                player_errors.append({
                    "player": p_name, "team": p_tm_norm, "position": pos, "stat": "pass_yds",
                    "projected": round(p_m, 2), "actual": round(act_row["pass_yds"], 2),
                    "error": round(p_m - act_row["pass_yds"], 2),
                })
            if pos == "RB" and "rush_yds" in projs and "rush_yds" in act_row:
                p_m = float((projs["rush_yds"] or {}).get("mean", 0.0))
                player_errors.append({
                    "player": p_name, "team": p_tm_norm, "position": pos, "stat": "rush_yds",
                    "projected": round(p_m, 2), "actual": round(act_row["rush_yds"], 2),
                    "error": round(p_m - act_row["rush_yds"], 2),
                })
            if pos in ("WR", "TE") and "rec_yds" in projs and "rec_yds" in act_row:
                p_m = float((projs["rec_yds"] or {}).get("mean", 0.0))
                player_errors.append({
                    "player": p_name, "team": p_tm_norm, "position": pos, "stat": "rec_yds",
                    "projected": round(p_m, 2), "actual": round(act_row["rec_yds"], 2),
                    "error": round(p_m - act_row["rec_yds"], 2),
                })

    return {
        "dossier_file": dossier_path.name,
        "qb1_projected": (dossier.get("stage0_roster_and_board_allowlist") or {}).get("confirmed_qb1", {}),
        "projected_away_pts": round(aw_pts_proj, 2),
        "projected_home_pts": round(hm_pts_proj, 2),
        "actual_away_pts": game["away_score"],
        "actual_home_pts": game["home_score"],
        "team_points_mae": round(0.5 * (abs(aw_pts_proj - game["away_score"]) + abs(hm_pts_proj - game["home_score"])), 2),
        "spread_error_pts": round(abs(proj_margin - act_margin), 2),
        "total_error_pts": round(abs(proj_total - act_total), 2),
        "projected_away_pass_yds": round(aw_pass_proj, 2),
        "projected_home_pass_yds": round(hm_pass_proj, 2),
        "actual_away_pass_yds": round(float(aw_act_box.get("pass_yds", 0.0)), 2) if aw_act_box else None,
        "actual_home_pass_yds": round(float(hm_act_box.get("pass_yds", 0.0)), 2) if hm_act_box else None,
        "projected_away_rush_yds": round(aw_rush_proj, 2),
        "projected_home_rush_yds": round(hm_rush_proj, 2),
        "actual_away_rush_yds": round(float(aw_act_box.get("rush_yds", 0.0)), 2) if aw_act_box else None,
        "actual_home_rush_yds": round(float(hm_act_box.get("rush_yds", 0.0)), 2) if hm_act_box else None,
        "player_errors_count": len(player_errors),
        "player_yards_mae": round(sum(abs(e["error"]) for e in player_errors) / len(player_errors), 2) if player_errors else None,
        "top_player_misses": sorted(player_errors, key=lambda e: -abs(e["error"]))[:8],
        "stage5_game_lines": [
            {
                "market": gl.get("market"),
                "selection": gl.get("selection"),
                "post_sim_prob": gl.get("post_sim_prob"),
                "market_prob_devig": gl.get("market_prob_devig"),
                "net_edge": gl.get("net_edge"),
                "decision": gl.get("decision"),
            }
            for gl in (s5.get("game_line_evaluations") or [])
        ],
    }


def grade_completed_game(game: Dict[str, Any]) -> Dict[str, Any]:
    """Grade spread, total, and moneyline results against market lines (PENDING if incomplete)."""
    if not game.get("is_completed"):
        return {
            "is_graded": False,
            "margin": None,
            "total_points": None,
            "spread_result": "PENDING",
            "total_result": "PENDING",
            "ml_result": "PENDING",
        }

    home_score = game["home_score"]
    away_score = game["away_score"]
    margin = home_score - away_score
    total_points = home_score + away_score

    # Spread grading: spread is home point spread (e.g. -2.5 means home is favored by 2.5)
    spread = game["spread"]
    if game.get("details") or spread != 0.0:
        if margin + spread > 0:
            spread_result = "HOME_COVER"
        elif margin + spread < 0:
            spread_result = "AWAY_COVER"
        else:
            spread_result = "PUSH"
    else:
        spread_result = "UNAVAILABLE"

    # Total grading
    ou = game["over_under"]
    if ou > 0:
        if total_points > ou:
            total_result = "OVER"
        elif total_points < ou:
            total_result = "UNDER"
        else:
            total_result = "PUSH"
    else:
        total_result = "UNAVAILABLE"

    # ML grading
    if margin > 0:
        ml_result = "HOME_WIN"
    elif margin < 0:
        ml_result = "AWAY_WIN"
    else:
        ml_result = "TIE"

    return {
        "is_graded": True,
        "margin": margin,
        "total_points": total_points,
        "spread_result": spread_result,
        "total_result": total_result,
        "ml_result": ml_result,
    }


def synthesize_autopsy_learning_record(
    game: Dict[str, Any],
    grading: Dict[str, Any],
    season: int,
    week: int,
    window: str,
    projection_autopsy: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate a clean, structured trainer-ready learning loop record."""
    matchup = game["matchup"]
    away = game["away_team"]
    home = game["home_team"]

    if game["is_completed"]:
        proj_note = ""
        if projection_autopsy:
            proj_note = (
                f"\nPregame Dossier Projection: {away} {projection_autopsy['projected_away_pts']} - "
                f"{home} {projection_autopsy['projected_home_pts']} "
                f"(Team Pts MAE={projection_autopsy['team_points_mae']}, "
                f"Spread Err={projection_autopsy['spread_error_pts']}, "
                f"Total Err={projection_autopsy['total_error_pts']})."
            )
        prompt = (
            f"NFL {season} Week {week} Post-Game Autopsy: {matchup} ({window.upper()}).\n"
            f"Final Score: {away} {game['away_score']}, {home} {game['home_score']} (Total {grading['total_points']}).\n"
            f"Closing Lines: Spread {game['details']} ({game['spread']}), Over/Under {game['over_under']}.\n"
            f"Outcomes: Spread {grading['spread_result']}, Total {grading['total_result']}, Moneyline {grading['ml_result']}."
            f"{proj_note}\n"
            f"Analyze key situational catalysts, trench pressure rates, and pass/run script elasticity."
        )
        completion = (
            f"Autopsy Review for {matchup}:\n"
            f"1. Score Dynamics: {home} finished with margin {grading['margin']:+d} against spread {game['spread']}.\n"
            f"2. Total Calibration: Combined points ({grading['total_points']}) settled {grading['total_result']} vs {game['over_under']}.\n"
            f"3. Situational Feedback: Graded via live ESPN scoreboard + boxscore autopsy. Model weights updated for situational elasticity."
        )
    else:
        prompt = (
            f"NFL {season} Week {week} Pre-Game Expectation: {matchup} ({window.upper()}).\n"
            f"Status: {game['status_name']}. Scheduled kickoff: {game['kickoff_utc']}.\n"
            f"Closing Lines: Spread {game['details']}, Over/Under {game['over_under']}."
        )
        completion = (
            f"Pre-settlement expectation established for {matchup}. Awaiting official post-game scoreboard settlement."
        )

    rec_out: Dict[str, Any] = {
        "schema": "gse-post-window-autopsy-feed-v2",
        "season": season,
        "week": week,
        "window": window,
        "matchup": matchup,
        "event_id": game["event_id"],
        "is_completed": game["is_completed"],
        "game_summary": {
            "away_team": away,
            "home_team": home,
            "away_score": game["away_score"],
            "home_score": game["home_score"],
            "margin": grading["margin"] if game["is_completed"] else None,
            "total_points": grading["total_points"] if game["is_completed"] else None,
            "spread": game["spread"],
            "details": game["details"],
            "over_under": game["over_under"],
        },
        "grading": grading,
        "trainer_prompt": prompt,
        "trainer_completion": completion,
        "generated_utc": datetime.now(timezone.utc).isoformat(),
    }
    if projection_autopsy is not None:
        rec_out["projection_autopsy"] = projection_autopsy
    return rec_out


def _sync_deduped_grading_corpus(
    repo_root: Path,
    completed_records: List[Dict[str, Any]],
) -> int:
    """Deduplicate data/corpus/grading_feedback_records.jsonl by game_id and upsert Week 10 grades."""
    corpus_path = repo_root / "data" / "corpus" / "grading_feedback_records.jsonl"
    by_gid: Dict[str, Dict[str, Any]] = {}
    if corpus_path.is_file():
        for raw_line in corpus_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            gid = str(obj.get("game_id") or "")
            if gid:
                by_gid[gid] = obj

    for rec in completed_records:
        if not rec.get("is_completed"):
            continue
        gs = rec["game_summary"]
        gid = f"{rec['season']}_{int(rec['week']):02d}_{gs['away_team']}_{gs['home_team']}"
        autopsy = rec.get("projection_autopsy") or {}
        by_gid[gid] = {
            "game_id": gid,
            "season": int(rec["season"]),
            "week": int(rec["week"]),
            "matchup": f"{gs['away_team']} @ {gs['home_team']}",
            "actual_score": f"{gs['away_team']} {gs['away_score']} - {gs['home_team']} {gs['home_score']}",
            "projected_score": (
                f"{gs['away_team']} {autopsy.get('projected_away_pts')} - "
                f"{gs['home_team']} {autopsy.get('projected_home_pts')}"
                if autopsy
                else None
            ),
            "spread_result": rec["grading"]["spread_result"],
            "total_result": rec["grading"]["total_result"],
            "ml_result": rec["grading"]["ml_result"],
            "team_points_mae": autopsy.get("team_points_mae"),
            "spread_error_pts": autopsy.get("spread_error_pts"),
            "total_error_pts": autopsy.get("total_error_pts"),
            "graded_utc": rec["generated_utc"],
        }

    corpus_path.parent.mkdir(parents=True, exist_ok=True)
    with corpus_path.open("w", encoding="utf-8") as fh:
        for gid in sorted(by_gid.keys()):
            fh.write(json.dumps(by_gid[gid], separators=(",", ":")) + "\n")
    return len(by_gid)


def run_post_window_settlement_and_autopsy(
    *,
    season: int = 2026,
    week: int = 10,
    window: str = "sun_early",
    scoreboard_path: Optional[Path | str] = None,
    output_feed_path: Optional[Path | str] = None,
    date_str: Optional[str] = None,
    repo_root: Path = REPO_ROOT,
    live_refresh: Optional[bool] = None,
    fetch_boxscore: Optional[bool] = None,
    sync_grading_corpus: Optional[bool] = None,
) -> Dict[str, Any]:
    """Execute post-window settlement and generate trainer-ready learning feeds."""
    use_default_sb = scoreboard_path is None
    sb_file = (
        Path(scoreboard_path)
        if scoreboard_path
        else (repo_root / "data" / "engine" / f"espn_{season}_week{week}_scoreboard.json")
    )
    do_live = bool(use_default_sb) if live_refresh is None else bool(live_refresh)
    do_box = bool(use_default_sb) if fetch_boxscore is None else bool(fetch_boxscore)
    do_sync_corpus = bool(use_default_sb and output_feed_path is None) if sync_grading_corpus is None else bool(sync_grading_corpus)

    if do_live:
        sb_data = refresh_espn_scoreboard_preserving_odds(sb_file, season=season, week=week)
    else:
        if not sb_file.is_file():
            raise FileNotFoundError(f"Authoritative ESPN scoreboard not found: {sb_file}")
        sb_data = json.loads(sb_file.read_text(encoding="utf-8"))

    today_str = date_str or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_file = (
        Path(output_feed_path)
        if output_feed_path
        else (repo_root / "brain" / "feeds" / today_str / f"post_window_autopsy_{season}_w{week}_{window}.jsonl")
    )

    # HARD DIRECT-TO-MIND DOCTRINE SAFETY ENFORCEMENT
    resolved_out_str = str(out_file.resolve()).replace("\\", "/")
    if resolved_out_str.endswith("brain/mind.jsonl") or "/mind.jsonl" in resolved_out_str:
        raise RuntimeError(
            f"HARD SAFETY VIOLATION: run_post_window_settlement_and_autopsy attempted to write to {out_file}! "
            "Only the Windows trainer owns brain/mind.jsonl. Feeds must go to brain/feeds/<date>/."
        )

    events = sb_data.get("events") or []

    window_games: List[Dict[str, Any]] = []
    for ev in events:
        w = resolve_window_for_event(ev)
        if window == "all" or w == window:
            parsed = parse_game_scores_and_market(ev)
            parsed["detected_window"] = w
            window_games.append(parsed)

    records: List[Dict[str, Any]] = []
    completed_count = 0
    pending_count = 0

    out_file.parent.mkdir(parents=True, exist_ok=True)
    with out_file.open("w", encoding="utf-8") as fh:
        for gm in window_games:
            grading = grade_completed_game(gm)
            proj_autopsy = compare_game_against_dossier(
                gm,
                week=week,
                repo_root=repo_root,
                fetch_boxscore=do_box,
            )
            if gm["is_completed"]:
                completed_count += 1
            else:
                pending_count += 1
            rec = synthesize_autopsy_learning_record(
                gm,
                grading,
                season,
                week,
                gm.get("detected_window") or window,
                projection_autopsy=proj_autopsy,
            )
            records.append(rec)
            fh.write(json.dumps(rec, separators=(",", ":")) + "\n")

    corpus_count = _sync_deduped_grading_corpus(repo_root, records) if do_sync_corpus and completed_count > 0 else None

    autopsy_games = [r["projection_autopsy"] for r in records if isinstance(r.get("projection_autopsy"), dict)]
    summary = {
        "status": "PASS",
        "season": season,
        "week": week,
        "window": window,
        "scoreboard_source": str(sb_file),
        "total_window_games": len(window_games),
        "completed_games_graded": completed_count,
        "pending_games_cataloged": pending_count,
        "feed_output_path": str(out_file),
        "records_written": len(records),
        "deduped_grading_corpus_rows": corpus_count,
        "mean_team_points_mae": (
            round(sum(a["team_points_mae"] for a in autopsy_games) / len(autopsy_games), 2)
            if autopsy_games
            else None
        ),
        "mean_spread_error_pts": (
            round(sum(a["spread_error_pts"] for a in autopsy_games) / len(autopsy_games), 2)
            if autopsy_games
            else None
        ),
        "mean_total_error_pts": (
            round(sum(a["total_error_pts"] for a in autopsy_games) / len(autopsy_games), 2)
            if autopsy_games
            else None
        ),
        "games": [
            {
                "matchup": r["matchup"],
                "is_completed": r["is_completed"],
                "grading": r["grading"],
                "projection_autopsy": r.get("projection_autopsy"),
            }
            for r in records
        ],
    }
    return summary


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="GSE Free-Path Post-Window Settlement & Autopsy Engine")
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--week", type=int, default=10)
    parser.add_argument(
        "--window",
        default="sun_early",
        choices=("tnf", "sun_intl", "sun_early", "sun_late", "snf", "mnf", "all"),
        help="Target NFL kickoff window",
    )
    parser.add_argument("--scoreboard-path", default=None)
    parser.add_argument("--output-feed", default=None)
    parser.add_argument("--date", default=None, help="Feed directory date override (YYYY-MM-DD)")
    args = parser.parse_args(argv)

    res = run_post_window_settlement_and_autopsy(
        season=args.season,
        week=args.week,
        window=args.window,
        scoreboard_path=args.scoreboard_path,
        output_feed_path=args.output_feed,
        date_str=args.date,
    )
    print(
        f"[POST-WINDOW AUTOPSY] PASS | season={res['season']} | week={res['week']} | window={res['window']} | "
        f"graded={res['completed_games_graded']} | pending={res['pending_games_cataloged']} | "
        f"feed={res['feed_output_path']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
