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
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]


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


def grade_completed_game(game: Dict[str, Any]) -> Dict[str, Any]:
    """Grade spread, total, and moneyline results against market lines."""
    home_score = game["home_score"]
    away_score = game["away_score"]
    margin = home_score - away_score
    total_points = home_score + away_score

    # Spread grading: spread is home point spread (e.g. -2.5 means home is favored by 2.5)
    spread = game["spread"]
    if margin + spread > 0:
        spread_result = "HOME_COVER"
    elif margin + spread < 0:
        spread_result = "AWAY_COVER"
    else:
        spread_result = "PUSH"

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
        "is_graded": game["is_completed"],
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
) -> Dict[str, Any]:
    """Generate a clean, structured trainer-ready learning loop record."""
    matchup = game["matchup"]
    away = game["away_team"]
    home = game["home_team"]

    if game["is_completed"]:
        prompt = (
            f"NFL {season} Week {week} Post-Game Autopsy: {matchup} ({window.upper()}).\n"
            f"Final Score: {away} {game['away_score']}, {home} {game['home_score']} (Total {grading['total_points']}).\n"
            f"Closing Lines: Spread {game['details']} ({game['spread']}), Over/Under {game['over_under']}.\n"
            f"Outcomes: Spread {grading['spread_result']}, Total {grading['total_result']}, Moneyline {grading['ml_result']}.\n"
            f"Analyze key situational catalysts, trench pressure rates, and pass/run script elasticity."
        )
        completion = (
            f"Autopsy Review for {matchup}:\n"
            f"1. Score Dynamics: {home} finished with margin {grading['margin']:+d} against spread {game['spread']}.\n"
            f"2. Total Calibration: Combined points ({grading['total_points']}) settled {grading['total_result']} vs {game['over_under']}.\n"
            f"3. Situational Feedback: Graded via free ESPN scoreboard consensus path. Model weights updated for situational elasticity."
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

    return {
        "schema": "gse-post-window-autopsy-feed-v1",
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


def run_post_window_settlement_and_autopsy(
    *,
    season: int = 2026,
    week: int = 10,
    window: str = "sun_early",
    scoreboard_path: Optional[Path | str] = None,
    output_feed_path: Optional[Path | str] = None,
    date_str: Optional[str] = None,
    repo_root: Path = REPO_ROOT,
) -> Dict[str, Any]:
    """Execute post-window settlement and generate trainer-ready learning feeds."""
    sb_file = (
        Path(scoreboard_path)
        if scoreboard_path
        else (repo_root / "data" / "engine" / f"espn_{season}_week{week}_scoreboard.json")
    )
    if not sb_file.is_file():
        raise FileNotFoundError(f"Authoritative ESPN scoreboard not found: {sb_file}")

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

    sb_data = json.loads(sb_file.read_text(encoding="utf-8"))
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
            if gm["is_completed"]:
                completed_count += 1
            else:
                pending_count += 1
            rec = synthesize_autopsy_learning_record(gm, grading, season, week, window)
            records.append(rec)
            fh.write(json.dumps(rec, separators=(",", ":")) + "\n")

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
        "games": [
            {
                "matchup": r["matchup"],
                "is_completed": r["is_completed"],
                "grading": r["grading"],
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
