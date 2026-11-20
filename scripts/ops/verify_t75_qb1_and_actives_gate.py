#!/usr/bin/env python3
"""
scripts/ops/verify_t75_qb1_and_actives_gate.py

T-75m Pre-Kickoff Active-Roster & Sportsbook QB1 Cross-Check Gate (RC11).
Prevents two verified live-slate failures:
  1. Premature Thursday/Friday hard deletion of players (e.g., WSH@NYG Cam Skattebo,
     Stefon Diggs, Treylon Burks) when official T-90m Game-Day Inactives are not yet confirmed.
  2. Stale/wrong starting QB1 projection (e.g., projecting a backup/injured QB when live
     sportsbook passing props already hang the actual active starter).
"""
from __future__ import annotations

import re
from typing import Any, Mapping, Sequence

HARD_EXCLUSION_STATUSES = {"IR", "INJURED RESERVE", "PUP", "SUSPENDED", "RESERVE", "NFI", "EXEMPT"}
SOFT_GAME_STATUSES = {"OUT", "DOUBTFUL", "INACTIVE", "DNP"}


def _strip_suffix(name: str) -> str:
    s = re.sub(r"['\u2019.]+", "", str(name or "").strip().lower())
    s = re.sub(r"\s+", " ", s)
    for suf in (" jr", " sr", " iii", " ii", " iv", " v"):
        if s.endswith(suf):
            s = s[: -len(suf)].strip()
            break
    return s


def _names_match(a: str, b: str) -> bool:
    sa, sb = _strip_suffix(a), _strip_suffix(b)
    if not sa or not sb:
        return False
    if sa == sb:
        return True
    pa, pb = sa.split(), sb.split()
    return len(pa) >= 2 and len(pb) >= 2 and pa[-1] == pb[-1] and pa[0][:1] == pb[0][:1]


def verify_prelock_roster_and_qb1_truth(
    stage0_allowlist: Mapping[str, Any],
    board_props: Sequence[Mapping[str, Any]],
    hours_to_kickoff: float = 24.0,
    official_inactives_confirmed: bool = False,
) -> dict[str, Any]:
    """
    Validate active roster availability & live sportsbook QB1 alignment.

    - Before T-90m (`hours_to_kickoff > 1.75` and not `official_inactives_confirmed`),
      early-week `"Out"` / `"Doubtful"` labels emit a `conditional_branch_watch` entry
      instead of hard-pruning active players prematurely.
    - At T-75m (`hours_to_kickoff <= 1.75` or `official_inactives_confirmed`),
      confirmed inactives are hard-excluded AND any mismatch between `confirmed_qb1[team]`
      and live sportsbook QB passing props raises `RuntimeError("STAGE0_QB1_MISMATCH_WITH_BOOK")`.
    """
    athletes = stage0_allowlist.get("verified_board_athletes") or {}
    confirmed_qb1 = {
        str(k).upper(): str(v)
        for k, v in (stage0_allowlist.get("confirmed_qb1") or {}).items()
        if str(k).upper() not in ("AWAY", "HOME") and v
    }

    active_eligible: list[str] = []
    hard_excluded: list[str] = []
    conditional_watch: list[dict[str, Any]] = []

    is_t75_lock = bool(official_inactives_confirmed or float(hours_to_kickoff) <= 1.75)

    for name, info in athletes.items():
        if not isinstance(info, Mapping):
            continue
        inj = info.get("injury_status") or {}
        raw_st = str(inj.get("report_status") or "").strip().upper()
        tm = str(info.get("team") or "").upper()
        pos = str(info.get("position") or "").upper()

        if any(h in raw_st for h in HARD_EXCLUSION_STATUSES):
            hard_excluded.append(name)
            continue

        if raw_st in SOFT_GAME_STATUSES or any(s == raw_st for s in SOFT_GAME_STATUSES):
            if is_t75_lock:
                hard_excluded.append(name)
            else:
                conditional_watch.append({
                    "athlete": name,
                    "team": tm,
                    "position": pos,
                    "report_status": raw_st,
                    "branch_a": "INACTIVE_IF_RULED_OUT_T90",
                    "branch_b": "ACTIVE_RETAIN_PBP_SHARE",
                })
                active_eligible.append(name)
            continue

        active_eligible.append(name)

    # Cross-check sportsbook QB passing props against confirmed_qb1
    book_qbs_by_team: dict[str, set[str]] = {}
    for prop in board_props:
        mkt = str(prop.get("market") or "").lower()
        pos = str(prop.get("position") or "").upper()
        ath = str(prop.get("athlete") or "").strip()
        tm = str(prop.get("team") or "").strip().upper()
        line = prop.get("line")
        if not ath or not tm:
            continue
        is_qb_pass_line = (
            ("passing yards" in mkt and line is not None and float(line) >= 120.0)
            or ("passing attempts" in mkt and line is not None and float(line) >= 18.0)
        )
        if is_qb_pass_line or (pos == "QB" and "pass" in mkt and line is not None and float(line) >= 15.0):
            book_qbs_by_team.setdefault(tm, set()).add(ath)

    mismatches: list[dict[str, Any]] = []
    for tm, book_qbs in book_qbs_by_team.items():
        cfg_qb = confirmed_qb1.get(tm)
        if not cfg_qb:
            continue
        if not any(_names_match(cfg_qb, b_qb) for b_qb in book_qbs):
            mismatches.append({
                "team": tm,
                "confirmed_qb1": cfg_qb,
                "book_qbs": sorted(book_qbs),
            })

    if mismatches and is_t75_lock:
        first = mismatches[0]
        raise RuntimeError(
            f"STAGE0_QB1_MISMATCH_WITH_BOOK: {first['team']} confirmed_qb1={first['confirmed_qb1']!r} "
            f"disagrees with live sportsbook passing board QBs={first['book_qbs']}"
        )

    return {
        "schema": "gse_t75_qb1_and_actives_audit_v1",
        "hours_to_kickoff": float(hours_to_kickoff),
        "official_inactives_confirmed": bool(official_inactives_confirmed),
        "active_eligible_athletes": active_eligible,
        "hard_excluded_athletes": hard_excluded,
        "conditional_branch_watch": conditional_watch,
        "book_qbs_by_team": {k: sorted(v) for k, v in book_qbs_by_team.items()},
        "qb1_mismatches": mismatches,
        "passed": len(mismatches) == 0,
    }
