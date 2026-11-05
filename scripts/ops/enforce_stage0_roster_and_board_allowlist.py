#!/usr/bin/env python3
"""
scripts/ops/enforce_stage0_roster_and_board_allowlist.py

Permanent Stage-0 Zero-Hallucination & Live Roster/Board Allowlist Gate.
Connects:
  1. scripts/ops/preflight_live_roster_injury_gate.py (require_week)
  2. data/nflverse/week{week}_live_roster_transactions_and_starters_2026.json
  3. Live game board JSON (e.g. data/engine/tnf_jax_bal_dk_full_board_2026_11_05.json)
  4. data/nflverse/pbp/play_by_play_2026.parquet & data/nflverse/injuries_2026.csv

Hard-blocks any LLM-memory roster hallucination or excluded/IR player from
entering Stage 1-5 simulations, projections, or call-sheet dossiers.
"""
from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Mapping

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.preflight_live_roster_injury_gate import require_week  # noqa: E402


class Stage0RosterContaminationError(RuntimeError):
    """Raised when an excluded/IR player or off-roster hallucinated name is detected."""


# Players who are NOT on 2026 JAX or BAL active rosters and must never appear as active players
OFF_ROSTER_HALLUCINATION_DENYLIST: dict[str, str] = {
    "tank bigsby": "Not on 2026 JAX active roster / live board (0 JAX board props; JAX RBs are Bhayshul Tuten, Chris Rodriguez Jr., Ameer Abdullah, LeQuint Allen Jr.).",
    "isaiah likely": "Not on 2026 BAL active roster / live board (WEEK8_INACTIVE_NAMES; BAL TEs are Mark Andrews, Josh Cuevas, Matt Hibner, Nick Vannett).",
    "justin tucker": "Not on 2026 BAL active roster / live board (BAL PK on live board is Jake Moody; 2026 PBP kicker is T.Loop).",
    "travis etienne": "Excluded in week9_live_roster_transactions_and_starters_2026.json (not on 2026 JAX roster; 2026 PBP carries on NO/CAR).",
    "travis etienne jr.": "Excluded in week9_live_roster_transactions_and_starters_2026.json (not on 2026 JAX roster; 2026 PBP carries on NO/CAR).",
    "richie james": "WEEK8_INACTIVE_NAMES hard-blocked.",
    "trey benson": "WEEK8_INACTIVE_NAMES hard-blocked.",
    "jalen mcmillan": "WEEK8_INACTIVE_NAMES hard-blocked.",
}


def _match_pbp_short_name(full_name: str) -> list[str]:
    """Generate candidate nflverse PBP abbreviated names (e.g., 'Trevor Lawrence' -> ['T.Lawrence'])."""
    clean = full_name.replace(" Jr.", "").replace(" Sr.", "").replace(" III", "").replace(" II", "").strip()
    parts = clean.split()
    if len(parts) < 2:
        return [clean]
    first, last = parts[0], parts[-1]
    cands = [f"{first[0]}.{last}", f"{first[:2]}.{last}", f"{first[:3]}.{last}"]
    if full_name == "Brian Thomas Jr.":
        cands.insert(0, "Bri.Thomas")
    return cands


def load_stage0_game_roster_allowlist(
    away: str = "JAX",
    home: str = "BAL",
    week: int = 9,
    board_rel_path: str = "data/engine/tnf_jax_bal_dk_full_board_2026_11_05.json",
) -> dict[str, Any]:
    """
    Build the cryptographically hashed Stage-0 roster, injury, and empirical 2026 PBP
    usage allowlist for (away, home, week).
    """
    stage0_cfg = require_week(week)
    matchup_key = f"{away}@{home}"

    board_path = REPO_ROOT / board_rel_path
    if not board_path.is_file():
        raise Stage0RosterContaminationError(f"STAGE0_FAIL: Live board file missing: {board_path}")
    board = json.loads(board_path.read_text(encoding="utf-8"))

    pbp_path = REPO_ROOT / "data" / "nflverse" / "pbp" / "play_by_play_2026.parquet"
    if not pbp_path.is_file():
        raise Stage0RosterContaminationError(f"STAGE0_FAIL: 2026 PBP parquet missing: {pbp_path}")
    pbp = pd.read_parquet(pbp_path)
    pbp_teams = pbp[(pbp["posteam"].isin([away, home])) | (pbp["defteam"].isin([away, home]))]

    # Load 2026 injuries CSV for latest designations
    inj_path = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"
    injury_map: dict[tuple[str, str], dict[str, str]] = {}
    if inj_path.is_file():
        with inj_path.open("r", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        rows.sort(key=lambda r: int(r.get("week") or 0))
        for r in rows:
            tm = str(r.get("team") or "").strip()
            fn = str(r.get("full_name") or "").strip()
            if tm in (away, home) and fn:
                injury_map[(tm, fn.lower())] = {
                    "week": str(r.get("week") or ""),
                    "report_status": str(r.get("report_status") or "").strip(),
                    "practice_status": str(r.get("practice_status") or "").strip(),
                    "primary_injury": str(r.get("report_primary_injury") or r.get("practice_primary_injury") or "").strip(),
                }

    # Explicit Week 9 Thursday Night Football injury overrides from verified reports
    if away == "JAX" and home == "BAL" and week == 9:
        injury_map[("JAX", "bhayshul tuten")] = {
            "week": "9",
            "report_status": "Questionable",
            "practice_status": "Did Not Participate In Practice",
            "primary_injury": "Ankle / Foot (DNP; 17:45 CT inactives gate)",
        }
        injury_map[("BAL", "joe fagnano")] = {
            "week": "9",
            "report_status": "Active",
            "practice_status": "Full Participation in Practice",
            "primary_injury": "Ankle (FP, no game designation; confirmed Week 9 QB1 starter)",
        }

    confirmed_qb1 = {
        away: stage0_cfg.get("confirmed_qb1", {}).get(away),
        home: stage0_cfg.get("confirmed_qb1", {}).get(home),
    }
    if not confirmed_qb1[away] or not confirmed_qb1[home]:
        raise Stage0RosterContaminationError(
            f"STAGE0_FAIL: Missing confirmed_qb1 for {away} or {home} in week{week} config: {confirmed_qb1}"
        )

    excluded_players = [
        ep for ep in stage0_cfg.get("excluded_players", [])
        if ep.get("team") in (away, home)
    ]
    excluded_names_lower = {str(ep["name"]).strip().lower(): ep for ep in excluded_players}

    traded_players = [
        tp for tp in stage0_cfg.get("traded_players", [])
        if tp.get("to") in (away, home) or tp.get("from") in (away, home)
    ]

    situational_mults = (stage0_cfg.get("situational_multipliers_unfitted") or {}).get(matchup_key, {})

    # Extract all verified named athletes and their core lines from the live board
    athletes: dict[str, dict[str, Any]] = {}
    for p in board.get("props", []):
        name = str(p.get("athlete") or "").strip()
        if not name or name in ("Unknown", "Jacksonville Jaguars", "Baltimore Ravens", "Game"):
            continue
        if name.lower() in excluded_names_lower:
            raise Stage0RosterContaminationError(
                f"STAGE0_FAIL: Excluded player {name} appeared on live board allowlist!"
            )
        if name.lower() in OFF_ROSTER_HALLUCINATION_DENYLIST:
            raise Stage0RosterContaminationError(
                f"STAGE0_FAIL: Off-roster player {name} appeared on live board allowlist!"
            )
        tm = str(p.get("team") or "").strip()
        pos = str(p.get("position") or "").strip()
        rec = athletes.setdefault(
            name,
            {
                "athlete": name,
                "team": tm,
                "position": pos,
                "prop_count": 0,
                "core_lines": {},
                "open_lines": {},
            },
        )
        rec["prop_count"] += 1
        mkt = str(p.get("market") or "").strip()
        line = p.get("line")
        open_line = p.get("open_line")
        if line is not None and mkt not in rec["core_lines"]:
            rec["core_lines"][mkt] = float(line)
            if open_line is not None:
                rec["open_lines"][mkt] = float(open_line)

    # Enrich each verified board athlete with empirical 2026 PBP stats & per-player active GP
    team_totals: dict[str, dict[str, float]] = {}
    for tm in (away, home):
        tm_off = pbp_teams[pbp_teams["posteam"] == tm]
        tm_def = pbp_teams[pbp_teams["defteam"] == tm]
        team_totals[tm] = {
            "team_gp": float(tm_off["game_id"].nunique()),
            "pass_attempts": float(tm_off["passer_player_name"].notna().sum()),
            "targets": float(tm_off["receiver_player_name"].notna().sum()),
            "carries": float(tm_off["rusher_player_name"].notna().sum()),
            "def_plays": float(len(tm_def)),
        }

    for name, info in athletes.items():
        tm = info["team"]
        cands = _match_pbp_short_name(name)
        tm_off = pbp_teams[pbp_teams["posteam"] == tm]
        tm_def = pbp_teams[pbp_teams["defteam"] == tm]

        pass_rows = tm_off[tm_off["passer_player_name"].isin(cands)]
        rush_rows = tm_off[tm_off["rusher_player_name"].isin(cands)]
        rec_rows = tm_off[tm_off["receiver_player_name"].isin(cands)]
        kick_rows = tm_off[tm_off["kicker_player_name"].isin(cands)]
        solo_rows = tm_def[tm_def["solo_tackle_1_player_name"].isin(cands)]
        ast1_rows = tm_def[tm_def["assist_tackle_1_player_name"].isin(cands)]
        ast2_rows = tm_def[tm_def["assist_tackle_2_player_name"].isin(cands)]
        sack_rows = tm_def[tm_def["sack_player_name"].isin(cands)]

        game_ids = set()
        for df_part in (pass_rows, rush_rows, rec_rows, kick_rows, solo_rows, ast1_rows, ast2_rows, sack_rows):
            if len(df_part):
                game_ids.update(df_part["game_id"].dropna().unique().tolist())

        player_gp = max(1, len(game_ids)) if game_ids else 1
        has_pbp_snaps = len(game_ids) > 0

        targets = int(len(rec_rows))
        receptions = int(rec_rows["complete_pass"].fillna(0).sum()) if len(rec_rows) else 0
        rec_yds = float(rec_rows["receiving_yards"].fillna(0).sum()) if len(rec_rows) else 0.0
        rec_tds = int(rec_rows["pass_touchdown"].fillna(0).sum()) if len(rec_rows) else 0
        air_yds = float(rec_rows["air_yards"].fillna(0).sum()) if len(rec_rows) else 0.0

        carries = int(len(rush_rows))
        rush_yds = float(rush_rows["rushing_yards"].fillna(0).sum()) if len(rush_rows) else 0.0
        rush_tds = int(rush_rows["rush_touchdown"].fillna(0).sum()) if len(rush_rows) else 0

        dropbacks = int(len(pass_rows))
        completions = int(pass_rows["complete_pass"].fillna(0).sum()) if len(pass_rows) else 0
        pass_yds = float(pass_rows["passing_yards"].fillna(0).sum()) if len(pass_rows) else 0.0
        pass_tds = int(pass_rows["pass_touchdown"].fillna(0).sum()) if len(pass_rows) else 0
        interceptions = int(pass_rows["interception"].fillna(0).sum()) if len(pass_rows) else 0
        pass_epa_per_play = float(pass_rows["epa"].dropna().mean()) if len(pass_rows) else 0.0

        solo_tackles = int(len(solo_rows))
        assist_tackles = int(len(ast1_rows) + len(ast2_rows))
        total_tackles = solo_tackles + assist_tackles
        sacks = float(len(sack_rows))

        fg_rows = kick_rows[kick_rows["play_type"] == "field_goal"] if len(kick_rows) else pd.DataFrame()
        xp_rows = kick_rows[kick_rows["play_type"] == "extra_point"] if len(kick_rows) else pd.DataFrame()
        fg_att = int(len(fg_rows))
        fg_made = int((fg_rows["field_goal_result"] == "made").sum()) if len(fg_rows) else 0
        xp_att = int(len(xp_rows))
        xp_made = int((xp_rows["extra_point_result"] == "good").sum()) if len(xp_rows) else 0

        inj_info = injury_map.get((tm, name.lower()), {
            "week": str(week),
            "report_status": "Active",
            "practice_status": "Full Participation in Practice",
            "primary_injury": "",
        })

        # Apply unfitted situational multiplier from Stage-0 config if present
        pos_key = f"{tm} {info['position']}"
        player_key = f"{tm} {info['position']}:{name}"
        sit_mult = float(situational_mults.get(player_key, situational_mults.get(pos_key, 1.0)))

        info["pbp_2026"] = {
            "pbp_short_names_checked": cands,
            "has_2026_pbp_plays": has_pbp_snaps,
            "player_gp": int(player_gp) if has_pbp_snaps else 0,
            "team_gp": int(team_totals[tm]["team_gp"]),
            "dropbacks": dropbacks,
            "completions": completions,
            "pass_yds": round(pass_yds, 1),
            "pass_tds": pass_tds,
            "interceptions": interceptions,
            "pass_epa_per_dropback": round(pass_epa_per_play, 4),
            "carries": carries,
            "rush_yds": round(rush_yds, 1),
            "rush_tds": rush_tds,
            "rush_yds_per_pg": round(rush_yds / player_gp, 2) if has_pbp_snaps else 0.0,
            "targets": targets,
            "receptions": receptions,
            "rec_yds": round(rec_yds, 1),
            "rec_tds": rec_tds,
            "air_yds": round(air_yds, 1),
            "rec_yds_per_pg": round(rec_yds / player_gp, 2) if has_pbp_snaps else 0.0,
            "targets_per_pg": round(targets / player_gp, 2) if has_pbp_snaps else 0.0,
            "carries_per_pg": round(carries / player_gp, 2) if has_pbp_snaps else 0.0,
            "solo_tackles": solo_tackles,
            "assist_tackles": assist_tackles,
            "total_tackles": total_tackles,
            "tackles_per_pg": round(total_tackles / player_gp, 2) if has_pbp_snaps else 0.0,
            "sacks": sacks,
            "fg_att": fg_att,
            "fg_made": fg_made,
            "xp_att": xp_att,
            "xp_made": xp_made,
        }
        info["injury_status"] = inj_info
        info["situational_multiplier"] = sit_mult

    allowlist_payload = {
        "schema": "gse_stage0_game_roster_allowlist_v1",
        "week": week,
        "matchup": f"{away} @ {home}",
        "away": away,
        "home": home,
        "confirmed_qb1": confirmed_qb1,
        "traded_players": traded_players,
        "excluded_players": excluded_players,
        "off_roster_hallucination_denylist": OFF_ROSTER_HALLUCINATION_DENYLIST,
        "situational_multipliers_unfitted": situational_mults,
        "team_totals_2026_pbp": team_totals,
        "verified_board_athletes_count": len(athletes),
        "verified_board_athletes": athletes,
    }
    canonical = json.dumps(allowlist_payload, sort_keys=True)
    allowlist_payload["stage0_receipt_sha256"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return allowlist_payload


def assert_zero_roster_contamination(
    payload_or_text: Any,
    allowlist: Mapping[str, Any] | None = None,
    context_label: str = "output",
) -> None:
    """
    Scan any dictionary, list, or markdown string for:
      1. Off-roster hallucinated names (Tank Bigsby, Isaiah Likely, Justin Tucker, Travis Etienne Jr., etc.)
         unless explicitly inside an `excluded_players` / `off_roster_hallucination_denylist` audit block.
      2. Excluded/IR players (Lamar Jackson, Tyler Huntley, Skylar Thompson) being assigned positive
         active projections or marked as active starters.
    """
    if isinstance(payload_or_text, str):
        text_lower = payload_or_text.lower()
        combined_denylist = dict(OFF_ROSTER_HALLUCINATION_DENYLIST)
        for default_excl in ("lamar jackson", "tyler huntley", "skylar thompson"):
            combined_denylist.setdefault(default_excl, "Excluded Week 9 inactive/IR player")
        if isinstance(allowlist, Mapping):
            for ep in allowlist.get("excluded_players", []):
                ep_name = str(ep.get("name") or "").strip().lower()
                if ep_name:
                    combined_denylist.setdefault(ep_name, str(ep.get("reason") or "Excluded player"))
        for bad_name, reason in combined_denylist.items():
            # Allow mentions only if explicitly labeled as EXCLUDED / NOT ON ROSTER / DENYLIST / IR / OUT FOR SEASON
            idx = 0
            while True:
                pos = text_lower.find(bad_name, idx)
                if pos == -1:
                    break
                window = text_lower[max(0, pos - 90): min(len(text_lower), pos + len(bad_name) + 90)]
                allowed_context = any(
                    marker in window
                    for marker in (
                        "excluded",
                        "denylist",
                        "not on",
                        "off-roster",
                        "blocked",
                        "ir",
                        "out for season",
                        "inactive",
                        "thumb surgery",
                        "turf toe",
                        "replaced",
                    )
                )
                if not allowed_context:
                    raise Stage0RosterContaminationError(
                        f"STAGE0_CONTAMINATION in {context_label}: Off-roster/excluded name '{bad_name}' found without exclusion context ({reason}). Snippet: {window!r}"
                    )
                idx = pos + len(bad_name)
        return

    if allowlist is None:
        allowlist = {}

    if isinstance(payload_or_text, Mapping):
        # Check if this mapping represents a player projection row
        p_name = str(
            payload_or_text.get("athlete")
            or payload_or_text.get("player_name")
            or payload_or_text.get("player")
            or ""
        ).strip()
        if p_name:
            p_low = p_name.lower()
            if p_low in OFF_ROSTER_HALLUCINATION_DENYLIST:
                raise Stage0RosterContaminationError(
                    f"STAGE0_CONTAMINATION in {context_label}: Off-roster player '{p_name}' present in player record!"
                )
            excluded_lower = {
                str(ep["name"]).strip().lower() for ep in allowlist.get("excluded_players", [])
            }
            if p_low in excluded_lower:
                # Must not have positive projection or active starter status
                for stat_k in ("proj", "mean", "p50", "median", "pass_yds_mean", "rush_yds_mean", "rec_yds_mean"):
                    val = payload_or_text.get(stat_k)
                    if isinstance(val, (int, float)) and float(val) > 0.0:
                        raise Stage0RosterContaminationError(
                            f"STAGE0_CONTAMINATION in {context_label}: Excluded player '{p_name}' has positive projection {stat_k}={val}!"
                        )
            verified_names = {k.lower() for k in (allowlist.get("verified_board_athletes") or {}).keys()}
            traded_names = {str(tp.get("name", "")).lower() for tp in (allowlist.get("traded_players") or [])}
            if p_low not in verified_names and p_low not in traded_names and p_low not in excluded_lower:
                raise Stage0RosterContaminationError(
                    f"STAGE0_CONTAMINATION in {context_label}: Unverified player '{p_name}' not in Stage-0 allowlist!"
                )

        for k, v in payload_or_text.items():
            if k in ("off_roster_hallucination_denylist", "excluded_players"):
                continue
            assert_zero_roster_contamination(v, allowlist, f"{context_label}.{k}")
    elif isinstance(payload_or_text, (list, tuple)):
        for i, item in enumerate(payload_or_text):
            assert_zero_roster_contamination(item, allowlist, f"{context_label}[{i}]")


if __name__ == "__main__":
    al = load_stage0_game_roster_allowlist("JAX", "BAL", 9)
    assert_zero_roster_contamination(al, al, "self_check")
    print(
        f"[STAGE-0 ALLOWLIST VERIFIED] matchup={al['matchup']} | "
        f"confirmed_qb1={al['confirmed_qb1']} | "
        f"verified_athletes={al['verified_board_athletes_count']} | "
        f"excluded={len(al['excluded_players'])} | "
        f"sha256={al['stage0_receipt_sha256'][:16]}"
    )
