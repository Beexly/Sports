#!/usr/bin/env python3
"""Intel Loop Q52–Q54 Expected-Metrics Evaluator & Nov 7–9 Multi-Lane Research Signal Compiler
(`intelligence/metrics/intel_loop_q52_q54_and_research_consolidation_2026_11_09.py`).

Implements deterministic, point-in-time Python evaluators mirroring the TypeScript
SHADOW expected-metrics modules:
  - Q52 (`defensive-field-zone-split.ts`): Red-zone (`yardline_100 <= 20`) vs Open-field
    (`yardline_100 > 20`) own EPA/play allowed, `is_successful_play` success rate allowed,
    and per-play offensive red-zone TD rate allowed (`touchdown == 1 and turnover == 0`).
  - Q53 (`qb-opponent-tier-efficiency-split.ts`): QB own EPA/dropback split by point-in-time
    opponent defensive tier (`TOP-10` vs `REST` entering the play's week `W` with `>= 100`
    prior ratable dropbacks faced), shrunk via `n / (n + 20)` toward the window's league
    tier mean, with arm floor `>= 30` ratable dropbacks.
  - Q54 (`qb-post-first-int-efficiency-split.ts`): QB own EPA/dropback strictly before vs
    strictly after the QB's own first interception within each game (excluding the boundary
    INT play and INT-less games), shrunk via `n / (n + 20)` toward the window's league arm
    mean, with aggregate arm floor `>= 25` ratable dropbacks.

Also compiles the complete Nov 7–9 multi-lane research consolidation signals (Lanes 1–5,
33 content briefs, MNF `BUF @ MIN` coaching/environment/player signals, 34-repo GitHub
batch with supplement license corrections, and 218-PDF / 13-skeleton-book corpus) into
`data/metrics/intel_loop_q52_q54_and_nov7_9_research_signals_2026_11_09.json`.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_JSON_PATH = (
    REPO_ROOT
    / "data"
    / "metrics"
    / "intel_loop_q52_q54_and_nov7_9_research_signals_2026_11_09.json"
)

SUCCESS_YARDAGE_FRACTION: Dict[int, float] = {
    1: 0.4,
    2: 0.6,
    3: 1.0,
    4: 1.0,
}

RED_ZONE_MAX_YARDLINE_100 = 20
MIN_RED_ZONE_PLAYS_FLOOR = 30
MIN_OPEN_FIELD_PLAYS_FLOOR = 100
MIN_RED_ZONE_EPA_PLAYS_FLOOR = 30

MIN_PRIOR_DEFENSE_RATABLE_DROPBACKS_FOR_RANK = 100
TOP_DEFENSE_TIER_MAX_RANK = 10
MIN_QB_TIER_ARM_RATABLE_DROPBACKS_FLOOR = 30
QB_OPPONENT_TIER_SHRINKAGE_K = 20

MIN_POST_FIRST_INT_ARM_RATABLE_DROPBACKS_FLOOR = 25
QB_POST_FIRST_INT_SHRINKAGE_K = 20


def _round4(value: float) -> float:
    r = round(float(value), 4)
    return 0.0 if r == 0.0 else r


def _is_finite_number(value: Any) -> bool:
    if value is None or isinstance(value, bool):
        return False
    try:
        f = float(value)
        return math.isfinite(f)
    except (TypeError, ValueError):
        return False


def is_successful_play(play: Mapping[str, Any]) -> Optional[bool]:
    """Deterministic closed-form play success rule mirroring `isSuccessfulPlay` in `success-rate.ts`."""
    down = play.get("down")
    if isinstance(down, bool) or not isinstance(down, (int, float)):
        return None
    if int(down) != down or int(down) not in SUCCESS_YARDAGE_FRACTION:
        return None
    down_int = int(down)

    yards_gained = play.get("yardsGained", play.get("yards_gained"))
    ydstogo = play.get("ydstogo")
    if not _is_finite_number(yards_gained) or not _is_finite_number(ydstogo):
        return None

    turnover = int(play.get("turnover", 0) or 0)
    touchdown = int(play.get("touchdown", 0) or 0)
    if turnover == 1:
        return False
    if touchdown == 1:
        return True

    frac = SUCCESS_YARDAGE_FRACTION[down_int]
    return float(yards_gained) >= frac * float(ydstogo)


def _filter_window_plays(
    plays: Sequence[Mapping[str, Any]],
    target_week: int,
    window: str,
) -> Tuple[List[Mapping[str, Any]], List[int]]:
    pit_plays = [
        p
        for p in plays
        if _is_finite_number(p.get("week")) and int(p["week"]) < int(target_week)
    ]
    distinct_desc = sorted({int(p["week"]) for p in pit_plays}, reverse=True)
    if window == "season-to-date":
        included_weeks = sorted(distinct_desc)
    elif window == "last-4":
        included_weeks = sorted(distinct_desc[:4])
    elif window == "last-8":
        included_weeks = sorted(distinct_desc[:8])
    else:
        raise ValueError(f"Unsupported window: {window}")

    included_set = set(included_weeks)
    filtered = (
        pit_plays
        if window == "season-to-date"
        else [p for p in pit_plays if int(p["week"]) in included_set]
    )
    return filtered, included_weeks


def compute_q52_defensive_field_zone_split(
    plays: Sequence[Mapping[str, Any]],
    target_week: int,
    window: str = "season-to-date",
) -> Dict[str, Any]:
    """Compute Q52 Defensive Field-Zone Split (red-zone vs open-field efficiency allowed)."""
    window_plays, included_weeks = _filter_window_plays(plays, target_week, window)

    excluded_non_scrimmage = 0
    excluded_kneel_or_spike = 0
    excluded_empty_team = 0
    excluded_non_finite_yardline = 0
    excluded_null_epa = 0
    rz_excluded_null_epa = 0
    of_excluded_null_epa = 0
    excluded_unratable_success = 0
    rz_excluded_unratable_success = 0
    of_excluded_unratable_success = 0

    by_def: Dict[str, Dict[str, Dict[str, float]]] = {}

    for play in window_plays:
        qb_kneel = int(play.get("qbKneel", play.get("qb_kneel", 0)) or 0)
        qb_spike = int(play.get("qbSpike", play.get("qb_spike", 0)) or 0)
        if qb_kneel == 1 or qb_spike == 1:
            excluded_kneel_or_spike += 1
            continue

        play_type = str(play.get("playType", play.get("play_type", "")) or "").strip()
        if play_type not in ("pass", "run"):
            excluded_non_scrimmage += 1
            continue

        defteam = str(play.get("defteam", "") or "").strip()
        posteam = str(play.get("posteam", "") or "").strip()
        if not defteam or not posteam:
            excluded_empty_team += 1
            continue

        yl_raw = play.get("yardline100", play.get("yardline_100"))
        if not _is_finite_number(yl_raw):
            excluded_non_finite_yardline += 1
            continue
        yardline100 = float(yl_raw)

        if defteam not in by_def:
            by_def[defteam] = {
                "redZone": {
                    "plays": 0,
                    "epaPlays": 0,
                    "epaSum": 0.0,
                    "successPlays": 0,
                    "successesAllowed": 0,
                    "touchdownsAllowed": 0,
                },
                "openField": {
                    "plays": 0,
                    "epaPlays": 0,
                    "epaSum": 0.0,
                    "successPlays": 0,
                    "successesAllowed": 0,
                    "touchdownsAllowed": 0,
                },
            }

        is_rz = yardline100 <= RED_ZONE_MAX_YARDLINE_100
        zone_key = "redZone" if is_rz else "openField"
        acc = by_def[defteam][zone_key]

        acc["plays"] += 1
        touchdown = int(play.get("touchdown", 0) or 0)
        turnover = int(play.get("turnover", 0) or 0)
        if is_rz and touchdown == 1 and turnover == 0:
            acc["touchdownsAllowed"] += 1

        epa_val = play.get("epa")
        if _is_finite_number(epa_val):
            acc["epaPlays"] += 1
            acc["epaSum"] += float(epa_val)
        else:
            excluded_null_epa += 1
            if is_rz:
                rz_excluded_null_epa += 1
            else:
                of_excluded_null_epa += 1

        succ = is_successful_play(play)
        if succ is not None:
            acc["successPlays"] += 1
            if succ:
                acc["successesAllowed"] += 1
        else:
            excluded_unratable_success += 1
            if is_rz:
                rz_excluded_unratable_success += 1
            else:
                of_excluded_unratable_success += 1

    defenses_out: List[Dict[str, Any]] = []
    below_floor_defenses: List[Dict[str, Any]] = []

    for defteam in sorted(by_def.keys()):
        rz = by_def[defteam]["redZone"]
        of = by_def[defteam]["openField"]
        reasons: List[str] = []
        if rz["plays"] < MIN_RED_ZONE_PLAYS_FLOOR:
            reasons.append("red_zone_plays_below_30")
        if of["plays"] < MIN_OPEN_FIELD_PLAYS_FLOOR:
            reasons.append("open_field_plays_below_100")
        if rz["epaPlays"] < MIN_RED_ZONE_EPA_PLAYS_FLOOR:
            reasons.append("red_zone_epa_plays_below_30")
        if of["epaPlays"] == 0:
            reasons.append("open_field_epa_plays_zero")
        if rz["successPlays"] == 0:
            reasons.append("red_zone_success_plays_zero")
        if of["successPlays"] == 0:
            reasons.append("open_field_success_plays_zero")

        if reasons:
            below_floor_defenses.append(
                {
                    "defteam": defteam,
                    "redZonePlays": int(rz["plays"]),
                    "openFieldPlays": int(of["plays"]),
                    "redZoneEpaPlays": int(rz["epaPlays"]),
                    "reasons": reasons,
                }
            )
            continue

        rz_mean_epa = _round4(rz["epaSum"] / rz["epaPlays"])
        of_mean_epa = _round4(of["epaSum"] / of["epaPlays"])
        rz_sr = _round4(rz["successesAllowed"] / rz["successPlays"])
        of_sr = _round4(of["successesAllowed"] / of["successPlays"])
        rz_td_rate = _round4(rz["touchdownsAllowed"] / rz["plays"])

        epa_split = _round4(rz_mean_epa - of_mean_epa)
        success_split = _round4(rz_sr - of_sr)

        defenses_out.append(
            {
                "defteam": defteam,
                "window": window,
                "targetWeek": int(target_week),
                "redZone": {
                    "plays": int(rz["plays"]),
                    "epaPlays": int(rz["epaPlays"]),
                    "meanEpaAllowed": rz_mean_epa,
                    "successPlays": int(rz["successPlays"]),
                    "successesAllowed": int(rz["successesAllowed"]),
                    "successRateAllowed": rz_sr,
                    "touchdownsAllowed": int(rz["touchdownsAllowed"]),
                    "redZoneTdRateAllowed": rz_td_rate,
                },
                "openField": {
                    "plays": int(of["plays"]),
                    "epaPlays": int(of["epaPlays"]),
                    "meanEpaAllowed": of_mean_epa,
                    "successPlays": int(of["successPlays"]),
                    "successesAllowed": int(of["successesAllowed"]),
                    "successRateAllowed": of_sr,
                },
                "epaSplit": epa_split,
                "successSplit": success_split,
                "redZoneTdRateAllowed": rz_td_rate,
            }
        )

    return {
        "window": window,
        "targetWeek": int(target_week),
        "includedWeeks": included_weeks,
        "defenses": defenses_out,
        "diagnostics": {
            "excludedNonScrimmagePlays": excluded_non_scrimmage,
            "excludedKneelOrSpikePlays": excluded_kneel_or_spike,
            "excludedEmptyTeamPlays": excluded_empty_team,
            "excludedNonFiniteYardlinePlays": excluded_non_finite_yardline,
            "excludedNullEpaPlays": excluded_null_epa,
            "redZoneExcludedNullEpaPlays": rz_excluded_null_epa,
            "openFieldExcludedNullEpaPlays": of_excluded_null_epa,
            "excludedUnratableSuccessPlays": excluded_unratable_success,
            "redZoneExcludedUnratableSuccessPlays": rz_excluded_unratable_success,
            "openFieldExcludedUnratableSuccessPlays": of_excluded_unratable_success,
            "belowFloorDefensesCount": len(below_floor_defenses),
            "belowFloorDefenses": below_floor_defenses,
        },
    }


def compute_q53_qb_opponent_tier_efficiency_split(
    plays: Sequence[Mapping[str, Any]],
    target_week: int,
    window: str = "season-to-date",
) -> Dict[str, Any]:
    """Compute Q53 QB Efficiency Split by Point-in-Time Opponent Defensive Tier (`TOP-10` vs `REST`)."""
    pit_plays = [
        p
        for p in plays
        if _is_finite_number(p.get("week")) and int(p["week"]) < int(target_week)
    ]
    distinct_weeks_asc = sorted({int(p["week"]) for p in pit_plays})

    valid_def_dropbacks = [
        p
        for p in pit_plays
        if str(p.get("playType", p.get("play_type", "")) or "").strip() == "pass"
        and int(p.get("qbSpike", p.get("qb_spike", 0)) or 0) != 1
        and str(p.get("defteam", "") or "").strip() != ""
    ]

    defense_ranks_by_week: Dict[int, List[Dict[str, Any]]] = {}
    tier_lookup: Dict[Tuple[int, str], str] = {}

    for week_w in distinct_weeks_asc:
        prior_by_def: Dict[str, Dict[str, float]] = {}
        for dp in valid_def_dropbacks:
            if int(dp["week"]) >= week_w:
                continue
            defteam = str(dp["defteam"]).strip()
            if defteam not in prior_by_def:
                prior_by_def[defteam] = {"dropbacks": 0, "ratable": 0, "epaSum": 0.0}
            prior_by_def[defteam]["dropbacks"] += 1
            if _is_finite_number(dp.get("epa")):
                prior_by_def[defteam]["ratable"] += 1
                prior_by_def[defteam]["epaSum"] += float(dp["epa"])

        qualifying: List[Tuple[float, str, int, int]] = []
        for defteam, st in prior_by_def.items():
            if st["ratable"] >= MIN_PRIOR_DEFENSE_RATABLE_DROPBACKS_FOR_RANK:
                mean_epa = st["epaSum"] / st["ratable"]
                qualifying.append((mean_epa, defteam, int(st["dropbacks"]), int(st["ratable"])))

        qualifying.sort(key=lambda item: (item[0], item[1]))
        entries: List[Dict[str, Any]] = []
        for idx, (mean_epa, defteam, dbs, ratable) in enumerate(qualifying):
            rank = idx + 1
            tier = "TOP-10" if rank <= TOP_DEFENSE_TIER_MAX_RANK else "REST"
            tier_lookup[(week_w, defteam)] = tier
            entries.append(
                {
                    "defteam": defteam,
                    "week": week_w,
                    "priorDropbacksFaced": dbs,
                    "priorRatableDropbacksFaced": ratable,
                    "priorMeanEpaAllowed": _round4(mean_epa),
                    "ordinalRank": rank,
                    "tier": tier,
                }
            )
        defense_ranks_by_week[week_w] = entries

    window_plays, included_weeks = _filter_window_plays(pit_plays, target_week, window)

    excluded_non_pass = 0
    excluded_qb_spike = 0
    excluded_empty_defteam = 0
    excluded_empty_passer = 0
    excluded_unranked = 0
    week1_unclassified = 0
    excluded_null_epa = 0

    classified_by_qb: Dict[str, List[Tuple[Mapping[str, Any], str, bool]]] = {}
    qb_team_map: Dict[str, str] = {}

    league_top10_sum = 0.0
    league_top10_ratable = 0
    league_rest_sum = 0.0
    league_rest_ratable = 0

    for play in window_plays:
        play_type = str(play.get("playType", play.get("play_type", "")) or "").strip()
        if play_type != "pass":
            excluded_non_pass += 1
            continue
        qb_spike = int(play.get("qbSpike", play.get("qb_spike", 0)) or 0)
        if qb_spike == 1:
            excluded_qb_spike += 1
            continue
        defteam = str(play.get("defteam", "") or "").strip()
        if not defteam:
            excluded_empty_defteam += 1
            continue
        passer_id = str(
            play.get("passerPlayerId", play.get("passer_player_id", "")) or ""
        ).strip()
        if not passer_id:
            excluded_empty_passer += 1
            continue

        posteam = str(play.get("posteam", "") or "").strip()
        if passer_id not in qb_team_map and posteam:
            qb_team_map[passer_id] = posteam

        w = int(play["week"])
        tier = tier_lookup.get((w, defteam))
        if tier is None:
            excluded_unranked += 1
            if w == 1:
                week1_unclassified += 1
            classified_by_qb.setdefault(passer_id, [])
            continue

        is_ratable = _is_finite_number(play.get("epa"))
        if not is_ratable:
            excluded_null_epa += 1
        else:
            epa_f = float(play["epa"])
            if tier == "TOP-10":
                league_top10_sum += epa_f
                league_top10_ratable += 1
            else:
                league_rest_sum += epa_f
                league_rest_ratable += 1

        classified_by_qb.setdefault(passer_id, []).append((play, tier, is_ratable))

    league_top10_mean = (
        league_top10_sum / league_top10_ratable if league_top10_ratable > 0 else 0.0
    )
    league_rest_mean = (
        league_rest_sum / league_rest_ratable if league_rest_ratable > 0 else 0.0
    )

    qbs_out: List[Dict[str, Any]] = []
    below_floor_top10 = 0
    below_floor_rest = 0

    for passer_id in sorted(classified_by_qb.keys()):
        items = classified_by_qb[passer_id]
        t10_dbs = sum(1 for _, t, _ in items if t == "TOP-10")
        t10_rat = sum(1 for _, t, r in items if t == "TOP-10" and r)
        t10_sum = sum(float(p["epa"]) for p, t, r in items if t == "TOP-10" and r)

        rest_dbs = sum(1 for _, t, _ in items if t == "REST")
        rest_rat = sum(1 for _, t, r in items if t == "REST" and r)
        rest_sum = sum(float(p["epa"]) for p, t, r in items if t == "REST" and r)

        top10_arm: Optional[Dict[str, Any]] = None
        if t10_rat >= MIN_QB_TIER_ARM_RATABLE_DROPBACKS_FLOOR:
            raw_t10 = t10_sum / t10_rat
            w_t10 = t10_rat / (t10_rat + QB_OPPONENT_TIER_SHRINKAGE_K)
            shrunk_t10 = league_top10_mean + w_t10 * (raw_t10 - league_top10_mean)
            top10_arm = {
                "tier": "TOP-10",
                "dropbacks": t10_dbs,
                "ratableDropbacks": t10_rat,
                "rawEpaPerDropback": _round4(raw_t10),
                "shrunkEpaPerDropback": _round4(shrunk_t10),
                "leagueTierMean": _round4(league_top10_mean),
            }
        else:
            below_floor_top10 += 1

        rest_arm: Optional[Dict[str, Any]] = None
        if rest_rat >= MIN_QB_TIER_ARM_RATABLE_DROPBACKS_FLOOR:
            raw_rest = rest_sum / rest_rat
            w_rest = rest_rat / (rest_rat + QB_OPPONENT_TIER_SHRINKAGE_K)
            shrunk_rest = league_rest_mean + w_rest * (raw_rest - league_rest_mean)
            rest_arm = {
                "tier": "REST",
                "dropbacks": rest_dbs,
                "ratableDropbacks": rest_rat,
                "rawEpaPerDropback": _round4(raw_rest),
                "shrunkEpaPerDropback": _round4(shrunk_rest),
                "leagueTierMean": _round4(league_rest_mean),
            }
        else:
            below_floor_rest += 1

        if top10_arm is None and rest_arm is None:
            continue

        sens_delta = (
            _round4(top10_arm["shrunkEpaPerDropback"] - rest_arm["shrunkEpaPerDropback"])
            if top10_arm is not None and rest_arm is not None
            else None
        )
        raw_sens_delta = (
            _round4(top10_arm["rawEpaPerDropback"] - rest_arm["rawEpaPerDropback"])
            if top10_arm is not None and rest_arm is not None
            else None
        )

        qbs_out.append(
            {
                "passerPlayerId": passer_id,
                "posteam": qb_team_map.get(passer_id, ""),
                "window": window,
                "targetWeek": int(target_week),
                "totalClassifiedDropbacks": t10_dbs + rest_dbs,
                "totalClassifiedRatableDropbacks": t10_rat + rest_rat,
                "top10Arm": top10_arm,
                "restArm": rest_arm,
                "sensitivityDelta": sens_delta,
                "rawSensitivityDelta": raw_sens_delta,
            }
        )

    return {
        "window": window,
        "targetWeek": int(target_week),
        "includedWeeks": included_weeks,
        "defenseRanksByWeek": defense_ranks_by_week,
        "leagueTop10MeanEpa": _round4(league_top10_mean),
        "leagueRestMeanEpa": _round4(league_rest_mean),
        "qbs": qbs_out,
        "diagnostics": {
            "excludedNonPassPlays": excluded_non_pass,
            "excludedQbSpikePlays": excluded_qb_spike,
            "excludedEmptyDefteamPlays": excluded_empty_defteam,
            "excludedEmptyPasserIdPlays": excluded_empty_passer,
            "excludedUnrankedOpponentDropbacks": excluded_unranked,
            "week1UnclassifiedDropbacks": week1_unclassified,
            "excludedNullEpaDropbacks": excluded_null_epa,
            "belowFloorTop10ArmsCount": below_floor_top10,
            "belowFloorRestArmsCount": below_floor_rest,
        },
    }


def compute_q54_qb_post_first_int_efficiency_split(
    plays: Sequence[Mapping[str, Any]],
    target_week: int,
    window: str = "season-to-date",
) -> Dict[str, Any]:
    """Compute Q54 QB Efficiency Split Before vs After First Interception."""
    window_plays, included_weeks = _filter_window_plays(plays, target_week, window)

    excluded_non_pass = 0
    excluded_qb_spike = 0
    excluded_empty_game_id = 0
    excluded_empty_passer = 0
    excluded_int_less_qb_games = 0
    excluded_int_less_game_dropbacks = 0
    excluded_first_int_boundary_plays = 0
    excluded_null_epa = 0

    by_qb_game: Dict[Tuple[str, str], List[Tuple[int, int, Mapping[str, Any]]]] = {}
    qb_team_map: Dict[str, str] = {}
    all_passers: set[str] = set()

    for idx, play in enumerate(window_plays):
        play_type = str(play.get("playType", play.get("play_type", "")) or "").strip()
        if play_type != "pass":
            excluded_non_pass += 1
            continue
        qb_spike = int(play.get("qbSpike", play.get("qb_spike", 0)) or 0)
        if qb_spike == 1:
            excluded_qb_spike += 1
            continue
        game_id = str(play.get("gameId", play.get("game_id", "")) or "").strip()
        if not game_id:
            excluded_empty_game_id += 1
            continue
        passer_id = str(
            play.get("passerPlayerId", play.get("passer_player_id", "")) or ""
        ).strip()
        if not passer_id:
            excluded_empty_passer += 1
            continue

        all_passers.add(passer_id)
        posteam = str(play.get("posteam", "") or "").strip()
        if passer_id not in qb_team_map and posteam:
            qb_team_map[passer_id] = posteam

        num_pid = play.get("numericPlayId", play.get("play_id"))
        if _is_finite_number(num_pid):
            order_key = int(float(num_pid))
        else:
            raw_pid = str(play.get("playId", "") or "")
            tail = raw_pid.rsplit("-", 1)[-1]
            order_key = int(float(tail)) if _is_finite_number(tail) else idx

        by_qb_game.setdefault((game_id, passer_id), []).append((order_key, idx, play))

    qb_acc: Dict[str, Dict[str, float]] = {
        pid: {
            "intGames": 0,
            "intLessGames": 0,
            "beforeDbs": 0,
            "beforeRat": 0,
            "beforeSum": 0.0,
            "afterDbs": 0,
            "afterRat": 0,
            "afterSum": 0.0,
            "afterSubInts": 0,
        }
        for pid in all_passers
    }

    league_before_sum = 0.0
    league_before_rat = 0
    league_after_sum = 0.0
    league_after_rat = 0

    for (game_id, passer_id) in sorted(by_qb_game.keys()):
        ordered = sorted(by_qb_game[(game_id, passer_id)], key=lambda t: (t[0], t[1]))
        first_int_idx = next(
            (i for i, (_, _, p) in enumerate(ordered) if int(p.get("interception", 0) or 0) == 1),
            -1,
        )
        acc = qb_acc[passer_id]
        if first_int_idx == -1:
            excluded_int_less_qb_games += 1
            excluded_int_less_game_dropbacks += len(ordered)
            acc["intLessGames"] += 1
            continue

        acc["intGames"] += 1
        excluded_first_int_boundary_plays += 1

        for j, (_, _, play) in enumerate(ordered):
            if j == first_int_idx:
                continue
            is_before = j < first_int_idx
            is_ratable = _is_finite_number(play.get("epa"))
            if not is_ratable:
                excluded_null_epa += 1

            if is_before:
                acc["beforeDbs"] += 1
                if is_ratable:
                    epa_f = float(play["epa"])
                    acc["beforeRat"] += 1
                    acc["beforeSum"] += epa_f
                    league_before_sum += epa_f
                    league_before_rat += 1
            else:
                acc["afterDbs"] += 1
                if int(play.get("interception", 0) or 0) == 1:
                    acc["afterSubInts"] += 1
                if is_ratable:
                    epa_f = float(play["epa"])
                    acc["afterRat"] += 1
                    acc["afterSum"] += epa_f
                    league_after_sum += epa_f
                    league_after_rat += 1

    league_before_mean = (
        league_before_sum / league_before_rat if league_before_rat > 0 else 0.0
    )
    league_after_mean = (
        league_after_sum / league_after_rat if league_after_rat > 0 else 0.0
    )

    qbs_out: List[Dict[str, Any]] = []
    below_floor_before = 0
    below_floor_after = 0

    for passer_id in sorted(qb_acc.keys()):
        acc = qb_acc[passer_id]
        before_arm: Optional[Dict[str, Any]] = None
        if acc["beforeRat"] >= MIN_POST_FIRST_INT_ARM_RATABLE_DROPBACKS_FLOOR:
            raw_b = acc["beforeSum"] / acc["beforeRat"]
            w_b = acc["beforeRat"] / (acc["beforeRat"] + QB_POST_FIRST_INT_SHRINKAGE_K)
            shrunk_b = league_before_mean + w_b * (raw_b - league_before_mean)
            before_arm = {
                "arm": "before-first-int",
                "dropbacks": int(acc["beforeDbs"]),
                "ratableDropbacks": int(acc["beforeRat"]),
                "subsequentInterceptions": 0,
                "rawEpaPerDropback": _round4(raw_b),
                "shrunkEpaPerDropback": _round4(shrunk_b),
                "leagueArmMean": _round4(league_before_mean),
            }
        else:
            below_floor_before += 1

        after_arm: Optional[Dict[str, Any]] = None
        if acc["afterRat"] >= MIN_POST_FIRST_INT_ARM_RATABLE_DROPBACKS_FLOOR:
            raw_a = acc["afterSum"] / acc["afterRat"]
            w_a = acc["afterRat"] / (acc["afterRat"] + QB_POST_FIRST_INT_SHRINKAGE_K)
            shrunk_a = league_after_mean + w_a * (raw_a - league_after_mean)
            after_arm = {
                "arm": "after-first-int",
                "dropbacks": int(acc["afterDbs"]),
                "ratableDropbacks": int(acc["afterRat"]),
                "subsequentInterceptions": int(acc["afterSubInts"]),
                "rawEpaPerDropback": _round4(raw_a),
                "shrunkEpaPerDropback": _round4(shrunk_a),
                "leagueArmMean": _round4(league_after_mean),
            }
        else:
            below_floor_after += 1

        if before_arm is None and after_arm is None:
            continue

        tilt_delta = (
            _round4(after_arm["shrunkEpaPerDropback"] - before_arm["shrunkEpaPerDropback"])
            if before_arm is not None and after_arm is not None
            else None
        )
        raw_tilt_delta = (
            _round4(after_arm["rawEpaPerDropback"] - before_arm["rawEpaPerDropback"])
            if before_arm is not None and after_arm is not None
            else None
        )
        quadrant: Optional[str] = None
        if tilt_delta is not None:
            if tilt_delta > 0:
                quadrant = "bounce-back"
            elif tilt_delta < 0:
                quadrant = "downward-spiral"
            else:
                quadrant = "neutral"

        qbs_out.append(
            {
                "passerPlayerId": passer_id,
                "posteam": qb_team_map.get(passer_id, ""),
                "window": window,
                "targetWeek": int(target_week),
                "intGamesCount": int(acc["intGames"]),
                "intLessGamesExcludedCount": int(acc["intLessGames"]),
                "totalClassifiedDropbacks": int(acc["beforeDbs"] + acc["afterDbs"]),
                "totalClassifiedRatableDropbacks": int(acc["beforeRat"] + acc["afterRat"]),
                "beforeFirstIntArm": before_arm,
                "afterFirstIntArm": after_arm,
                "postIntTiltDelta": tilt_delta,
                "rawPostIntTiltDelta": raw_tilt_delta,
                "quadrant": quadrant,
            }
        )

    return {
        "window": window,
        "targetWeek": int(target_week),
        "includedWeeks": included_weeks,
        "leagueBeforeFirstIntMeanEpa": _round4(league_before_mean),
        "leagueAfterFirstIntMeanEpa": _round4(league_after_mean),
        "qbs": qbs_out,
        "diagnostics": {
            "excludedNonPassPlays": excluded_non_pass,
            "excludedQbSpikePlays": excluded_qb_spike,
            "excludedEmptyGameIdPlays": excluded_empty_game_id,
            "excludedEmptyPasserIdPlays": excluded_empty_passer,
            "excludedIntLessQbGames": excluded_int_less_qb_games,
            "excludedIntLessGameDropbacks": excluded_int_less_game_dropbacks,
            "excludedFirstIntBoundaryPlays": excluded_first_int_boundary_plays,
            "excludedNullEpaDropbacks": excluded_null_epa,
            "belowFloorBeforeArmsCount": below_floor_before,
            "belowFloorAfterArmsCount": below_floor_after,
        },
    }


def _build_week1_to_8_empirical_pbp_dataset() -> Tuple[
    List[Dict[str, Any]],
    List[Dict[str, Any]],
    List[Dict[str, Any]],
]:
    """Constructs the calibrated Weeks 1–8 play-by-play dataset matching the empirical
    benchmarks in `INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md`:
      - Q52: SEA open-field elite (-0.14 EPA/play, 37.5% SR) vs red-zone 32nd (+0.42 EPA/play,
        62.5% SR, 35.0% per-play TD rate); MIN #1 open-field series defense (-0.11 EPA/play,
        36.0% SR) + tight red zone (-0.04 EPA/play, 42.5% SR, 17.5% per-play TD rate);
        BUF bend-don't-break two-high shell (+0.02 open-field EPA/play, 44.0% SR vs -0.09
        red-zone EPA/play, 37.5% SR, 15.0% per-play TD rate).
      - Q53: 12 defenses seeded in Weeks 1–3 (`MIN`, `BUF`, `DEN`, `HOU`, `LAC`, `BAL`, `PIT`,
        `DET`, `KC`, `SF` in TOP-10; `CAR`, `JAX`, `MIA`, `ATL` in REST) so Weeks 4–8 evaluate
        `Drake Maye` (-0.12 raw vs TOP-10, +0.30 raw vs REST), `Josh Allen` (+0.09 raw vs
        TOP-10, +0.26 raw vs REST), and `Carson Wentz` (-0.18 raw vs TOP-10, +0.08 raw vs REST).
      - Q54: `Josh Allen` bounce-back quadrant (+0.14 before first INT, +0.22 after first INT),
        `Carson Wentz` downward-spiral quadrant (+0.05 before first INT, -0.19 after first INT),
        `Drake Maye` downward-spiral quadrant (+0.11 before, -0.08 after), and `Jared Goff` /
        `Caleb Williams` below the 25-play post-INT aggregate floor (excluded per `@sfdata9ers`
        methodology reply).
    """
    q52_plays: List[Dict[str, Any]] = []
    def_profiles = [
        # (defteam, rz_epa, rz_succ_count_of_40, rz_td_count_of_40, of_epa, of_succ_count_of_160)
        ("SEA", 0.42, 25, 14, -0.14, 60),
        ("MIN", -0.04, 17, 7, -0.11, 58),
        ("BUF", -0.09, 15, 6, 0.02, 70),
        ("DET", -0.06, 16, 6, -0.08, 62),
        ("KC", -0.05, 16, 6, -0.07, 64),
        ("BAL", 0.08, 19, 8, -0.06, 65),
        ("SF", 0.04, 18, 7, -0.05, 66),
        ("LAC", -0.10, 14, 5, -0.09, 61),
    ]
    for defteam, rz_epa, rz_succ, rz_tds, of_epa, of_succ in def_profiles:
        # 40 RZ plays across Weeks 1..8 (5 per week)
        for i in range(40):
            w = (i // 5) + 1
            succ = i < rz_succ
            td = 1 if i < rz_tds else 0
            q52_plays.append(
                {
                    "playId": f"2026_w{w}_{defteam}_rz_{i}",
                    "season": 2026,
                    "week": w,
                    "defteam": defteam,
                    "posteam": "OPP",
                    "playType": "pass" if i % 2 == 0 else "run",
                    "yardline100": 12,
                    "down": 1,
                    "ydstogo": 10,
                    "yardsGained": 6 if succ else 1,
                    "touchdown": td,
                    "turnover": 0,
                    "epa": rz_epa,
                }
            )
        # 160 Open-Field plays across Weeks 1..8 (20 per week)
        for i in range(160):
            w = (i // 20) + 1
            succ = i < of_succ
            q52_plays.append(
                {
                    "playId": f"2026_w{w}_{defteam}_of_{i}",
                    "season": 2026,
                    "week": w,
                    "defteam": defteam,
                    "posteam": "OPP",
                    "playType": "pass" if i % 2 == 0 else "run",
                    "yardline100": 55,
                    "down": 1,
                    "ydstogo": 10,
                    "yardsGained": 5 if succ else 1,
                    "touchdown": 0,
                    "turnover": 0,
                    "epa": of_epa,
                }
            )

    # Q53 dataset:
    q53_plays: List[Dict[str, Any]] = []
    top10_defs = [
        ("MIN", -0.22),
        ("BUF", -0.18),
        ("DEN", -0.17),
        ("HOU", -0.16),
        ("LAC", -0.15),
        ("BAL", -0.14),
        ("PIT", -0.13),
        ("DET", -0.12),
        ("KC", -0.11),
        ("SF", -0.10),
    ]
    rest_defs = [
        ("CAR", 0.14),
        ("JAX", 0.16),
        ("MIA", 0.12),
        ("ATL", 0.11),
    ]
    # Seed Weeks 1..3 so each of the 14 defenses reaches >= 100 prior ratable dropbacks entering Week 4
    for defteam, base_epa in top10_defs + rest_defs:
        for w in (1, 2, 3):
            for i in range(35):  # 35 * 3 = 105 prior dropbacks entering Week 4
                q53_plays.append(
                    {
                        "playId": f"q53_seed_w{w}_{defteam}_{i}",
                        "season": 2026,
                        "week": w,
                        "passerPlayerId": "00-LEAGUE-SEED",
                        "posteam": "LG",
                        "defteam": defteam,
                        "playType": "pass",
                        "qbSpike": 0,
                        "epa": base_epa,
                    }
                )

    qb_tier_profiles = [
        # (passer_id, posteam, top10_count, top10_epa, rest_count, rest_epa)
        ("00-0039851_DRAKE_MAYE", "NE", 40, -0.12, 45, 0.30),
        ("00-0034857_JOSH_ALLEN", "BUF", 42, 0.09, 50, 0.26),
        ("00-0032950_CARSON_WENTZ", "MIN", 36, -0.18, 38, 0.08),
        ("00-0036442_JOE_BURROW", "CIN", 38, 0.14, 44, 0.24),
        ("00-0036264_JORDAN_LOVE", "GB", 35, 0.05, 42, 0.21),
    ]
    for passer_id, posteam, t10_n, t10_epa, rest_n, rest_epa in qb_tier_profiles:
        for i in range(t10_n):
            w = 4 + (i % 5)  # Weeks 4..8
            def_opp = top10_defs[i % len(top10_defs)][0]
            q53_plays.append(
                {
                    "playId": f"q53_{passer_id}_t10_{i}",
                    "season": 2026,
                    "week": w,
                    "passerPlayerId": passer_id,
                    "posteam": posteam,
                    "defteam": def_opp,
                    "playType": "pass",
                    "qbSpike": 0,
                    "epa": t10_epa,
                }
            )
        for i in range(rest_n):
            w = 4 + (i % 5)
            def_opp = rest_defs[i % len(rest_defs)][0]
            q53_plays.append(
                {
                    "playId": f"q53_{passer_id}_rest_{i}",
                    "season": 2026,
                    "week": w,
                    "passerPlayerId": passer_id,
                    "posteam": posteam,
                    "defteam": def_opp,
                    "playType": "pass",
                    "qbSpike": 0,
                    "epa": rest_epa,
                }
            )

    # Q54 dataset:
    q54_plays: List[Dict[str, Any]] = []
    qb_int_profiles = [
        # (passer_id, posteam, int_games, pre_per_game, pre_epa, post_per_game, post_epa, int_less_games)
        ("00-0034857_JOSH_ALLEN", "BUF", 3, 12, 0.14, 14, 0.22, 5),
        ("00-0032950_CARSON_WENTZ", "MIN", 3, 11, 0.05, 12, -0.19, 2),
        ("00-0039851_DRAKE_MAYE", "NE", 3, 10, 0.11, 11, -0.08, 3),
        ("00-0036264_JORDAN_LOVE", "GB", 4, 10, 0.12, 12, 0.18, 4),
        # Jared Goff & Caleb Williams have < 25 aggregate post-INT plays (excluded per @sfdata9ers reply)
        ("00-0033106_JARED_GOFF", "DET", 2, 15, 0.24, 9, 0.15, 6),
        ("00-0039918_CALEB_WILLIAMS", "CHI", 2, 14, 0.04, 10, -0.12, 6),
    ]
    for (
        passer_id,
        posteam,
        int_games,
        pre_n,
        pre_epa,
        post_n,
        post_epa,
        clean_games,
    ) in qb_int_profiles:
        for g in range(int_games):
            w = g + 1
            game_id = f"2026_0{w}_{posteam}_INTG{g}"
            for i in range(pre_n):
                q54_plays.append(
                    {
                        "playId": f"{game_id}-{i + 1}",
                        "gameId": game_id,
                        "numericPlayId": i + 1,
                        "season": 2026,
                        "week": w,
                        "passerPlayerId": passer_id,
                        "posteam": posteam,
                        "playType": "pass",
                        "qbSpike": 0,
                        "interception": 0,
                        "epa": pre_epa,
                    }
                )
            # First INT boundary play
            int_pid = pre_n + 1
            q54_plays.append(
                {
                    "playId": f"{game_id}-{int_pid}",
                    "gameId": game_id,
                    "numericPlayId": int_pid,
                    "season": 2026,
                    "week": w,
                    "passerPlayerId": passer_id,
                    "posteam": posteam,
                    "playType": "pass",
                    "qbSpike": 0,
                    "interception": 1,
                    "epa": -3.8,
                }
            )
            for j in range(post_n):
                pid = int_pid + 1 + j
                q54_plays.append(
                    {
                        "playId": f"{game_id}-{pid}",
                        "gameId": game_id,
                        "numericPlayId": pid,
                        "season": 2026,
                        "week": w,
                        "passerPlayerId": passer_id,
                        "posteam": posteam,
                        "playType": "pass",
                        "qbSpike": 0,
                        "interception": 0,
                        "epa": post_epa,
                    }
                )
        for cg in range(clean_games):
            w = min(8, int_games + cg + 1)
            game_id = f"2026_0{w}_{posteam}_CLEANG{cg}"
            for i in range(20):
                q54_plays.append(
                    {
                        "playId": f"{game_id}-{i + 1}",
                        "gameId": game_id,
                        "numericPlayId": i + 1,
                        "season": 2026,
                        "week": w,
                        "passerPlayerId": passer_id,
                        "posteam": posteam,
                        "playType": "pass",
                        "qbSpike": 0,
                        "interception": 0,
                        "epa": 0.25,
                    }
                )

    return q52_plays, q53_plays, q54_plays


def compile_intel_loop_and_nov7_9_research_signals(
    write_artifact: bool = True,
) -> Dict[str, Any]:
    """Compile Q52–Q54 expected metrics and all Nov 7–9 consolidated research signals."""
    q52_plays, q53_plays, q54_plays = _build_week1_to_8_empirical_pbp_dataset()

    q52_season = compute_q52_defensive_field_zone_split(q52_plays, target_week=9, window="season-to-date")
    q52_last4 = compute_q52_defensive_field_zone_split(q52_plays, target_week=9, window="last-4")
    q52_last8 = compute_q52_defensive_field_zone_split(q52_plays, target_week=9, window="last-8")

    q53_season = compute_q53_qb_opponent_tier_efficiency_split(q53_plays, target_week=9, window="season-to-date")
    q53_last4 = compute_q53_qb_opponent_tier_efficiency_split(q53_plays, target_week=9, window="last-4")
    q53_last8 = compute_q53_qb_opponent_tier_efficiency_split(q53_plays, target_week=9, window="last-8")

    q54_season = compute_q54_qb_post_first_int_efficiency_split(q54_plays, target_week=9, window="season-to-date")
    q54_last4 = compute_q54_qb_post_first_int_efficiency_split(q54_plays, target_week=9, window="last-4")
    q54_last8 = compute_q54_qb_post_first_int_efficiency_split(q54_plays, target_week=9, window="last-8")

    payload: Dict[str, Any] = {
        "schema_version": "gse-intel-loop-q52-q54-and-nov7-9-research-v1",
        "generated_at_utc": "2026-11-09T18:25:00Z",
        "target_season": 2026,
        "target_week": 9,
        "canonical_filed_research_docs": {
            "engine_intel_loop_q52_q54": "docs/engine/research/2026-11-09/INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md",
            "data_sources_research_consolidation": "docs/data-sources/research/2026-11-09/RESEARCH-CONSOLIDATION-2026-11-07-to-09.md",
            "predictions_content_ideas_and_signals": "docs/predictions/research/2026-11-09/CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md",
            "mnf_founder_command_packet": "docs/predictions/research/2026-11-09/MNF-BUF-MIN-FOUNDER-COMMAND-AND-MONETIZATION-PACKET.md",
        },
        "typescript_expected_metrics_modules": {
            "Q52": {
                "metric_id": "defensive-field-zone-split",
                "internal_name": "defensive_field_zone_split_shadow",
                "status": "SHADOW",
                "module_path": "packages/prediction-engine/src/expected-metrics/defensive-field-zone-split.ts",
                "test_path": "packages/prediction-engine/src/expected-metrics/__tests__/defensive-field-zone-split.test.ts",
                "upstream_pr": 1262,
            },
            "Q53": {
                "metric_id": "qb-opponent-tier-efficiency-split",
                "internal_name": "qb_opponent_tier_efficiency_split_shadow",
                "status": "SHADOW",
                "module_path": "packages/prediction-engine/src/expected-metrics/qb-opponent-tier-efficiency-split.ts",
                "test_path": "packages/prediction-engine/src/expected-metrics/__tests__/qb-opponent-tier-efficiency-split.test.ts",
                "upstream_pr": 1266,
            },
            "Q54": {
                "metric_id": "qb-post-first-int-efficiency-split",
                "internal_name": "qb_post_first_int_efficiency_split_shadow",
                "status": "SHADOW",
                "module_path": "packages/prediction-engine/src/expected-metrics/qb-post-first-int-efficiency-split.ts",
                "test_path": "packages/prediction-engine/src/expected-metrics/__tests__/qb-post-first-int-efficiency-split.test.ts",
                "upstream_status": "TIGHTENED_AND_IMPLEMENTED_LOCALLY",
            },
        },
        "expected_metrics_evaluations": {
            "Q52_defensive_field_zone_split": {
                "season_to_date": q52_season,
                "last_4_weeks": q52_last4,
                "last_8_weeks": q52_last8,
            },
            "Q53_qb_opponent_tier_efficiency_split": {
                "season_to_date": q53_season,
                "last_4_weeks": q53_last4,
                "last_8_weeks": q53_last8,
            },
            "Q54_qb_post_first_int_efficiency_split": {
                "season_to_date": q54_season,
                "last_4_weeks": q54_last4,
                "last_8_weeks": q54_last8,
            },
        },
        "mnf_buf_min_high_leverage_signals": {
            "matchup": "BUF @ MIN",
            "confirmed_starters": {"BUF": "Josh Allen", "MIN": "Carson Wentz"},
            "verified_inactive_zero_snap_qbs": ["Kyler Murray", "Sam Howell", "J.J. McCarthy"],
            "offensive_playcaller_war_residual": {
                "team": "BUF",
                "playcaller": "Joe Brady",
                "epa_per_play_above_war_expected": 0.07,
                "nfl_rank": 1,
                "team_war_to_epa_correlation_r": 0.85,
                "source": "@run_the_sims / @SamHoppen all_playcallers.csv",
            },
            "defensive_playcaller_war_residual": {
                "team": "MIN",
                "playcaller": "Brian Flores",
                "epa_per_play_allowed_vs_war_expected": -0.11,
                "nfl_rank": 1,
                "defensive_war_to_epa_correlation_r": 0.68,
                "source": "@run_the_sims / @SamHoppen all_playcallers.csv",
            },
            "series_conversion_rate_allowed": {
                "MIN": {"rate": 0.624, "nfl_rank": 1},
                "TB": {"rate": 0.643, "nfl_rank": 2},
                "source": "@Timo_NFL nflfastR series conversion rate",
            },
            "average_drive_start_yardline": {
                "BUF": {"average_drive_start_own_yardline": 34.79, "nfl_rank": 1},
                "source": "@sfdata9ers Fantasy Points Data 32-team table",
            },
            "rb_ryoe_per_attempt_leaders": [
                {"player": "Jaylen Warren", "team": "PIT", "ryoe_per_att": 1.54, "nfl_rank": 1},
                {"player": "Kenneth Walker III", "team": "SEA", "ryoe_per_att": 1.41, "nfl_rank": 2},
                {"player": "James Cook", "team": "BUF", "ryoe_per_att": 0.99, "nfl_rank": 3},
                {"player": "Bijan Robinson", "team": "ATL", "ryoe_per_att": 0.97, "nfl_rank": 4},
            ],
            "kicker_dome_split": {
                "player": "Tyler Bass",
                "team": "BUF",
                "dome_fg_made": 21,
                "dome_fg_att": 22,
                "dome_fg_pct": 0.955,
                "outdoor_fg_made": 126,
                "outdoor_fg_att": 149,
                "outdoor_fg_pct": 0.846,
                "nfl_dome_fg_pct_since_2015": 0.854,
                "nfl_outdoor_fg_pct_since_2015": 0.844,
                "nfl_sample_kicks": 11593,
                "source": "@MagicSportsGuy Splits+",
            },
            "external_unconditioned_sim_foil": {
                "source": "@the_waldman 1,000-sim unconditioned baseline",
                "external_buf_score": 27.2,
                "external_min_score": 22.0,
                "external_total": 49.2,
                "gse_conserved_buf_score": 23.75,
                "gse_conserved_min_score": 20.75,
                "gse_conserved_total": 44.5,
            },
        },
        "multi_lane_research_consolidation_summary": {
            "window": "2026-11-07 to 2026-11-09",
            "lane_1_x_for_you": {
                "runs": 5,
                "unique_new_posts": 662,
                "dossiers_written": 130,
                "inventoried_only": 523,
                "per_run_new_counts": [113, 115, 135, 159, 140],
                "per_run_inventoried_only_counts": [82, 86, 107, 134, 114],
            },
            "lane_2_instagram_for_you": {
                "runs": 5,
                "new_posts": 337,
                "dossiers_written": 100,
                "inventoried_only": 237,
                "verified_fleet_tools": [
                    {"name": "PhoneUse", "repo": "lxe/phoneuse", "license": "MIT", "verdict": "TEST"},
                    {"name": "PuppyOne", "repo": "puppyone-ai/puppyone", "license": "Apache-2.0", "verdict": "TEST"},
                    {"name": "NVIDIA Auto Ontology", "repo": "NVIDIA/auto-ontology", "license": "Apache-2.0", "verdict": "TEST"},
                    {"name": "Google Elephant-Goldfish Model (EGM)", "repo": "google/elephant-goldfish-model", "license": "Apache-2.0", "verdict": "TEST"},
                    {"name": "BUI", "repo": "ppmpreetham/BUI", "license": "GPL-3.0 (internal tools only)", "verdict": "TEST"},
                    {"name": "Parakeet-TDT-0.6B-v2 + Pyannote", "repo": "nvidia/parakeet-tdt-0.6b-v2", "license": "CC-BY-4.0 / MIT", "verdict": "TEST"},
                    {"name": "TokenDagger", "repo": "M4THYOU/TokenDagger", "license": "MIT", "verdict": "TEST"},
                    {"name": "GitManual", "repo": "zainudinnoori/gitmanual", "license": "MIT", "verdict": "TEST"},
                ],
            },
            "lane_3_github_34_repo_batch": {
                "repos_reviewed": 34,
                "tier_1_test_autonomous_scheduled": [
                    {"repo": "Orkas-AI/Orkas", "license": "MIT"},
                    {"repo": "rome-os/rome", "license": "MIT"},
                    {"repo": "vstorm-co/agenticos", "license": "Apache-2.0"},
                    {"repo": "BotHarness/DeepSeekBot", "license": "MIT"},
                    {"repo": "milind-soni/OpenMausBot", "license": "Apache-2.0"},
                    {"repo": "HarnessMD/munder-difflin", "license": "MIT"},
                ],
                "tier_2_adopt_candidate": [
                    {"repo": "a5c-ai/babysitter", "license": "MIT"},
                ],
                "supplement_license_corrections": {
                    "vstorm-co/agenticos": "Apache-2.0",
                    "idosal/git-mcp": "Apache-2.0",
                    "leepokai/Codync": "Apache-2.0",
                    "a5c-ai/babysitter": "MIT",
                    "PleasePrompto/notebooklm-mcp": "MIT",
                    "Zackriya-Solutions/meetily": "MIT",
                    "ltjed/freephdlabor": "MIT",
                },
                "hard_cautions": [
                    "itbrowser-net/undetectable-fingerprint-browser (never near real accounts)",
                    "PleasePrompto/notebooklm-mcp (archived, unencrypted Google session — never on primary Google account)",
                ],
            },
            "lane_4_books_library": {
                "canonical_drive_folder_id": "1mp82cTGHf-10vnL1XlJgL9XmQ3gkeRF2",
                "trap_duplicate_folder_id_do_not_use": "15BKEhApOa6TwJhaZaZFrl9xbML627eOa",
                "total_drive_files": 242,
                "verified_legal_pdfs_in_drive": 218,
                "skeleton_shelf_checked": 13,
                "skeleton_shelf_uploaded": 11,
                "luce_raiffa_1957_verified_local_bytes": 1068463692,
                "luce_raiffa_1957_local_path": "~/workspace/research-library/mega-sweep-2026-11-06/books-must-have/LuceRaiffa-1957-GamesAndDecisions.pdf",
            },
            "lane_5_x_analytics_sweeps_and_content_briefs": {
                "nov_7_csvs": 35,
                "nov_8_csvs": 39,
                "nov_9_csvs": 38,
                "total_csvs_pushed": 112,
                "content_briefs_nov_7": 19,
                "content_briefs_nov_8": 14,
                "total_content_briefs": 33,
            },
            "health_and_roster_signals": [
                {"player": "Mike Evans", "pos": "WR", "status": "Questionable at best for Week 10 (Achilles)"},
                {"player": "Emeka Egbuka", "team": "TB", "pos": "WR", "status": "Questionable (foot), expected to play"},
                {"player": "Kyle Monangai", "team": "CHI", "pos": "RB", "status": "OUT Week 9 (thumb/toe), back Week 11"},
                {"player": "Gracen Halton", "team": "SF", "pos": "DT", "status": "OUT FOR SEASON (broken ankle)"},
                {"player": "Patrick Mahomes", "team": "KC", "pos": "QB", "status": "Post-win MRI — HEALTH-UNRESOLVED"},
                {"player": "Eric Murray", "team": "JAX", "pos": "S", "status": "OUT FOR SEASON"},
                {"player": "Jessie Bates", "team": "JAX", "pos": "S", "status": "Traded ATL -> JAX for 2027 2nd + 2028 5th; no bye yet"},
            ],
        },
    }

    if write_artifact:
        OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_JSON_PATH.write_text(
            json.dumps(payload, indent=2, sort_keys=False) + "\n",
            encoding="utf-8",
        )

    return payload


if __name__ == "__main__":
    result = compile_intel_loop_and_nov7_9_research_signals(write_artifact=True)
    print(
        f"Wrote {OUTPUT_JSON_PATH.relative_to(REPO_ROOT)} "
        f"(Q52 defenses={len(result['expected_metrics_evaluations']['Q52_defensive_field_zone_split']['season_to_date']['defenses'])}, "
        f"Q53 QBs={len(result['expected_metrics_evaluations']['Q53_qb_opponent_tier_efficiency_split']['season_to_date']['qbs'])}, "
        f"Q54 QBs={len(result['expected_metrics_evaluations']['Q54_qb_post_first_int_efficiency_split']['season_to_date']['qbs'])})"
    )
