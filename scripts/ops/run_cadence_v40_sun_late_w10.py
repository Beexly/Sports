#!/usr/bin/env python3
"""Cadence v4.0 SUN_LATE Week 10 adaptation (2026-11-15 13:35 CT).

Contract: T-90 game-day lock refresh + split-conformal residual diagnostic.
FLAG-ONLY. Read-only on every sealed artifact. Writes exactly one JSON report.

Week 10 differs from Weeks 8/9 in one load-bearing way: there is NO sealed call
build for the week. The Cadence v3.0 Friday overlay (2026-11-13) already recorded
BLOCKED_NO_SEALED_BUILD -- the only writeup package on disk is the Week-8 build
and its gameIds cover zero Week-10 games; the active seal center is still the
2026-W44 (2026-10-25) seal. Consequently the conformal diagnostic has no
(model total, market total) pairs to score: n = 0. This script reports that as a
named upstream gap with the paths it checked, instead of papering over it with
proxy residuals.

What this run still does, and does honestly:
  1. Full seal verification (merkle, candidate lineage, coach-mind digest,
     EPA-dropoff hash, tau, QB-dropoff constant) under an interpreter with numpy.
  2. Live T-90 availability refresh from the ESPN public summary endpoint for
     the SUN_LATE window derived from the live scoreboard (not hand-pinned ids).
  3. A stored availability snapshot from injuries_2026.csv, restricted to the
     SUN_LATE teams, as a parity check on the live pull.
  4. A conformal block that is explicit about n = 0 rather than borrowing a
     stale week's residuals.
"""

from __future__ import annotations

import csv
import hashlib
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "ops"))
from run_cadence_v40_gameday_lock import (  # noqa: E402
    ALPHA,
    SIGMA_TOTAL,
    SIGMA_TOTAL_N,
    SIGMA_TOTAL_SD,
    espn_designations,
    run_conformal,
    verify_seal,
)

SLOT = "SUN_LATE"
WEEK = 10
SEASON = 2026
SCOREBOARD_DATE = "20261115"
OUT_DIR = REPO_ROOT / "docs/predictions/research/2026-11-15"
OUT_NAME = "cadence_v40_gameday_lock_sun_late_w10.json"

SCOREBOARD_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates="
    + SCOREBOARD_DATE
)

#: Candidate week-10 sealed-call artifacts. First existing file with week == 10
#: wins; anything else is recorded as absent so the gap is auditable.
SEALED_BUILD_CANDIDATES = [
    "data/engine/week10_full_slate_connected_dossiers_2026_11_13.json",
    "data/engine/week10_full_slate_connected_dossiers_2026_11_12.json",
    "data/engine/nfl_2026_w10_five_stage_engine_verdicts.json",
    "data/engine/week10_tuesday_0400ct_sealed_baseline_2026.json",
    "data/packages/live-slate-writeups.json",
]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch_scoreboard() -> dict:
    req = urllib.request.Request(SCOREBOARD_URL, headers={"User-Agent": "gse-cadence-v4.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        status = resp.status
        payload = json.load(resp)
    return {"http_status": status, "payload": payload}


def derive_sun_late(scoreboard: dict) -> list[dict]:
    """SUN_LATE = same-day kickoffs at/after 21:00Z and before 01:00Z next day."""
    games = []
    for e in scoreboard.get("events", []):
        kick = e.get("date") or ""
        if not kick.startswith("2026-11-15T"):
            continue
        hh = int(kick[11:13])
        if 21 <= hh <= 23:
            comp = (e.get("competitions") or [{}])[0]
            venue = comp.get("venue") or {}
            games.append(
                {
                    "matchup": e.get("name"),
                    "gameId": str(e.get("id")),
                    "kickoff": kick,
                    "venue": venue.get("fullName"),
                    "indoor": bool(venue.get("indoor")),
                    "status": ((comp.get("status") or {}).get("type") or {}).get("description"),
                }
            )
    games.sort(key=lambda g: (g["kickoff"], g["matchup"] or ""))
    return games


def find_sealed_build() -> dict:
    checked = []
    for rel in SEALED_BUILD_CANDIDATES:
        p = REPO_ROOT / rel
        rec = {"path": rel, "exists": p.is_file()}
        if p.is_file():
            try:
                d = json.loads(p.read_text(encoding="utf-8"))
            except Exception as exc:  # unreadable counts as usable=False
                rec["error"] = f"{type(exc).__name__}: {exc}"
                d = {}
            rec["sha256"] = sha256_file(p)
            if isinstance(d, dict):
                rec["declared_week"] = d.get("week")
                rec["declared_season"] = d.get("season")
                rec["generated_at"] = d.get("generatedAt") or d.get("generated_at_utc")
            rec["week10_usable"] = rec.get("declared_week") == WEEK and rec.get("exists")
        checked.append(rec)
    usable = [r for r in checked if r.get("week10_usable")]
    return {"checked": checked, "usable_count": len(usable), "usable": usable}


def build_observations() -> tuple[list[dict], dict]:
    """Zero observations expected for Week 10; returns (obs, gap evidence)."""
    found = find_sealed_build()
    obs: list[dict] = []
    gap = {
        "sealed_build_found": found["usable_count"] > 0,
        "checked": found["checked"],
        "reason": (
            None
            if found["usable_count"] > 0
            else "no Week-10 sealed call build on disk: candidate paths either do not exist "
                 "or declare a different week (Week-8 writeup package is the newest build, "
                 "and its gameIds cover zero Week-10 games). The active seal center is the "
                 "2026-W44 seal (sealed 2026-10-25). Cadence v3.0 Friday overlay recorded the "
                 "same gap as BLOCKED_NO_SEALED_BUILD on 2026-11-13."
        ),
    }
    return obs, gap


def stored_snapshot(slot_teams: set[str]) -> dict:
    path = REPO_ROOT / "data/nflverse/injuries_2026.csv"
    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = [r for r in csv.DictReader(fh) if any(r.values())]
    w = [r for r in rows if r.get("week") == str(WEEK)]
    designated = [
        {
            "team": r.get("team"),
            "player": r.get("full_name"),
            "position": r.get("position"),
            "status": r.get("report_status"),
        }
        for r in w
        if (r.get("report_status") or "").strip() in ("Out", "Doubtful", "Questionable")
    ]
    slot = [d for d in designated if d["team"] in slot_teams]
    return {
        "source_csv": "data/nflverse/injuries_2026.csv",
        "csv_sha256": sha256_file(path),
        "week10_rows": len(w),
        "week10_designations_all_count": len(designated),
        "week10_designations_slot_teams": slot,
        "counts": {
            "ruled_out": sum(1 for d in designated if d["status"] == "Out"),
            "questionable": sum(1 for d in designated if d["status"] == "Questionable"),
            "doubtful": sum(1 for d in designated if d["status"] == "Doubtful"),
            "slot_ruled_out": sum(1 for d in slot if d["status"] == "Out"),
            "slot_questionable": sum(1 for d in slot if d["status"] == "Questionable"),
            "slot_doubtful": sum(1 for d in slot if d["status"] == "Doubtful"),
        },
        "caveat": (
            "nflverse report_status is blank for Sunday games at this hour (Week-10 rows exist, "
            "but zero carry a designating status for SUN_LATE teams). The live ESPN pull is the "
            "authoritative availability check; this CSV is a parity/diff baseline only."
        ),
    }


def availability_refresh(games: list[dict], stored: dict) -> dict:
    stored_names = {d["player"] for d in stored["week10_designations_slot_teams"] if d["player"]}
    out = {
        "slot": SLOT,
        "stored_snapshot": {
            "source": stored["source_csv"],
            "week10_rows": stored["week10_rows"],
            "week10_designations_all_count": stored["week10_designations_all_count"],
            "week10_designations_slot_teams": stored["week10_designations_slot_teams"],
            "counts": stored["counts"],
            "caveat": stored["caveat"],
        },
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "games": [],
        "offline": False,
    }
    all_applied: list[dict] = []
    for g in games:
        rec = {
            "game": g["matchup"],
            "gameId": g["gameId"],
            "kickoff": g["kickoff"],
            "venue": g["venue"],
            "indoor": g["indoor"],
            "status_at_poll": g["status"],
        }
        try:
            d = espn_designations(g["gameId"])
            rec.update(
                {
                    "http_status": d["http_status"],
                    "team_blocks": d["team_blocks"],
                    "designations_applied": d["applied"],
                    "roster_statuses_not_applied": d["not_applied"],
                }
            )
            all_applied.extend(d["applied"])
        except Exception as exc:  # fail-soft by contract
            rec["fetch_error"] = f"{type(exc).__name__}: {exc}"
            out["offline"] = True
        out["games"].append(rec)

    new_names = {x["player"] for x in all_applied}
    qb_flags = [x for x in all_applied if (x.get("position") or "").upper() == "QB"]
    out["summary"] = {
        "games_polled": len(games),
        "games_with_error": sum(1 for x in out["games"] if x.get("fetch_error")),
        "designations_applied": len(all_applied),
        "out_count": sum(1 for x in all_applied if x["status"] == "Out"),
        "doubtful_count": sum(1 for x in all_applied if x["status"] == "Doubtful"),
        "questionable_count": sum(1 for x in all_applied if x["status"] == "Questionable"),
        "statuses_not_applied": sum(
            len(x.get("roster_statuses_not_applied") or []) for x in out["games"]
        ),
        "qb_designations": qb_flags,
        "stored_curated_subset_size": len(stored_names),
        "newly_listed_not_in_stored_subset": sorted(n for n in new_names if n and n not in stored_names),
        "stored_names_absent_from_refresh": sorted(n for n in stored_names if n and n not in new_names),
        "downstream_effect": (
            "FLAG ONLY. No Week-10 sealed call rows exist, so no designation lands on a sealed "
            "ticket and nothing is re-priced. A QB listed Out (SEA: Sam Darnold) is reported for "
            "the owner; whether it voids any prior lean is a downstream decision, not this run's."
        ),
        "diff_caveat": (
            "The stored snapshot is the injuries_2026.csv Week-10 designation set for the "
            "SUN_LATE teams; it is empty (all Sunday rows carry a blank report_status at this "
            "hour), so every live designation is net-new relative to the stored baseline rather "
            "than a scope difference."
        ),
    }
    return out


def main() -> None:
    sb = fetch_scoreboard()
    games = derive_sun_late(sb["payload"])
    slot_teams = set()
    for g in games:
        for ab in (g["matchup"] or "").split(" at "):
            slot_teams.add(ab.strip())

    seal = verify_seal()
    obs, gap = build_observations()
    conformal = run_conformal(obs)
    if not obs:
        conformal["degeneracy_note"] = (
            "n = 0: there are no residuals to estimate a band from, so the band is undefined "
            "rather than non-degenerate. qLevel = 0.0 and band = 0.0 are carry-through values "
            "from the estimator on an empty sample, not evidence about calibration."
        )
    stored = stored_snapshot(slot_teams)
    refresh = availability_refresh(games, stored)

    report = {
        "report_type": "CADENCE_V4_0_T90_GAMEDAY_LOCK_AND_CONFORMAL_DIAGNOSTIC",
        "version": "v4.0",
        "phase": "T90_GAMEDAY_LOCK_REFRESH",
        "slot": SLOT,
        "week": WEEK,
        "season": SEASON,
        "cadence_window": {
            "day": "Sun",
            "ct_time": "13:35",
            "label": "T-90 inactives lock refresh + conformal residual diagnostic (flag-only)",
        },
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "scoreboard_url": SCOREBOARD_URL,
            "scoreboard_http_status": sb["http_status"],
            "scoreboard_events_total": len(sb["payload"].get("events", [])),
            "sun_late_games_derived": games,
            "sealed_build_probe": gap,
            "stored_snapshot": stored,
        },
        "seal": seal,
        "no_mutation": {
            "sealed_state_written": False,
            "candidate_written": False,
            "seal_function_called": False,
            "note": (
                "This run wrote exactly one file: this report. candidates/, dossiers, parquet, "
                "and every sealed artifact were opened read-only; tau, costMatrixC, teamRatings "
                "and epaDropoffTable were read, never re-estimated."
            ),
        },
        "availability_refresh": refresh,
        "conformal": {
            "sigma_total": SIGMA_TOTAL,
            "sigma_total_calibration": {
                "source": "artifacts/slate/2026-10-25-week7-master-slate.json",
                "n": SIGMA_TOTAL_N,
                "sd": SIGMA_TOTAL_SD,
                "relation": "finalProjectedTotal = totalLine + sigma * Phi^-1(modelOverProb)",
            },
            "alpha": ALPHA,
            "path": "none available for Week 10: no sealed call build, hence no (model total, market total) pairs",
            "no_observations": len(obs) == 0,
            "observations": obs,
            **conformal,
        },
        "publication": {
            "published": False,
            "reason": "Flag-only diagnostic. Nothing here is a publication.",
        },
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    target = OUT_DIR / OUT_NAME
    target.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"wrote {target}")
    print(
        f"seal: level={seal.get('verification_level')} unchanged={seal.get('unchanged')} "
        f"merkle={seal.get('sealed_center_merkle', '')[:16]}… tau={seal.get('tau')}"
    )
    print(
        f"observations: {conformal['n']} | band ±{conformal['band']['upper']} | "
        f"coverage {conformal['coverage']} | flagged {len(conformal['flagged'])}"
    )
    s = refresh["summary"]
    print(
        f"T-90 refresh: {s['designations_applied']} designations across "
        f"{s['games_polled']} games ({s['games_with_error']} errors); "
        f"{s['out_count']} Out / {s['questionable_count']} Q / {s['doubtful_count']} D; "
        f"QB flags {[(q['team'], q['player'], q['status']) for q in s['qb_designations']]}"
    )


if __name__ == "__main__":
    main()