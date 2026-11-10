#!/usr/bin/env python3
"""Cadence v4.0 SUN_LATE Week 9 adaptation (2026-11-08 13:35 CT).

Week 9 sealed inputs are the dossiers, not W8 writeups/verdicts. Observations are
built from each dossier's Stage-5 total evaluation (post_sim_prob for Over == pOver,
market_prob_devig == 0.5 since market total == dossier posted_total) with the same
calibrated relation used in W8: model_total = market_line + sigma * Phi^-1(pOver),
sigma = 12.798 (week-7 master slate, n=13, sd 0.134).

Availability refresh polls the ESPN public summary endpoint for the four SUN_LATE
games at T-90 (kickoffs 21:05/21:25 UTC; run at ~19:35 UTC). Stored snapshot for
the Sunday slate = injuries_2026.csv Week 9 designations: zero Sunday names (all 7
belong to TNF BAL/JAX). Fail-soft: fetch errors recorded, never raised.

Read-only on sealed state. This writes exactly one report file.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
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
    z,
)

SLOT = "SUN_LATE"
WEEK = 9
SEASON = 2026
ESPN_IDS = {
    "HOU @ LAC": "401873046",
    "GB @ NE": "401873049",
    "LV @ SF": "401873047",
    "ARI @ SEA": "401873048",
}
SUN_LATE = set(ESPN_IDS)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_observations(full_slate: dict, dossier_dir: Path) -> list[dict]:
    """One observation per Sunday Week 9 game: residual = sigma * Phi^-1(pOver)."""
    obs = []
    for matchup, entry in full_slate["dossiers"].items():
        me = entry.get("matchup_environment") or {}
        line = me.get("posted_total")
        if line is None:
            continue
        dossier = json.loads((REPO_ROOT / entry["dossier_rel_path"]).read_text(encoding="utf-8"))
        s5 = dossier.get("stage5_360_conjunction_gate_and_call_sheet") or {}
        over = next(
            (l for l in s5.get("game_line_evaluations", [])
             if l.get("market") == "Total" and str(l.get("selection", "")).startswith("Over")),
            None,
        )
        if over is None:
            continue
        p_over = over.get("post_sim_prob")
        if p_over is None or not (0 < float(p_over) < 1):
            continue
        p_over = float(p_over)
        model_total = line + SIGMA_TOTAL * z(p_over)
        obs.append({
            "game": matchup,
            "gameId": ESPN_IDS.get(matchup),
            "slot": "SUN_LATE" if matchup in SUN_LATE else entry.get("window"),
            "kickoff": me.get("kickoff_utc"),
            "marketTotal": line,
            "pOver": p_over,
            "modelTotal": round(model_total, 4),
            "residual": round(model_total - line, 4),
            "proxy": False,
            "devig": True,
            "model_pOver_source": "dossier Stage-5 post_sim_prob (Over)",
            "market_pOver_source": "dossier Stage-5 market_prob_devig = 0.5 = posted_total line",
        })
    obs.sort(key=lambda o: (o["slot"], o.get("kickoff") or "", o["game"]))
    return obs


def stored_sunday_snapshot() -> dict:
    """Stored availability snapshot for the Sunday slate from injuries_2026.csv."""
    path = REPO_ROOT / "data/nflverse/injuries_2026.csv"
    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = [r for r in csv.DictReader(fh) if any(r.values())]
    w9 = [r for r in rows if r.get("week") == str(WEEK)]
    designated = [
        {"team": r.get("team"), "player": r.get("full_name"),
         "position": r.get("position"), "status": r.get("report_status")}
        for r in w9
        if (r.get("report_status") or "").strip() in ("Out", "Doubtful", "Questionable")
    ]
    sunday_teams = {
        "CIN", "ATL", "DAL", "IND", "NYJ", "KC", "DET", "MIA", "CLE", "NO",
        "NYG", "PHI", "LAR", "WAS", "DEN", "CAR", "HOU", "LAC", "GB", "NE",
        "LV", "SF", "ARI", "SEA", "TB", "CHI",
    }
    sunday = [d for d in designated if d["team"] in sunday_teams]
    return {
        "source_csv": "data/nflverse/injuries_2026.csv",
        "csv_sha256": sha256_file(path),
        "week9_rows": len(w9),
        "week9_designations_all": designated,
        "week9_designations_sunday_teams": sunday,
        "counts": {
            "ruled_out": sum(1 for d in designated if d["status"] == "Out"),
            "questionable": sum(1 for d in designated if d["status"] == "Questionable"),
            "doubtful": sum(1 for d in designated if d["status"] == "Doubtful"),
            "sunday_ruled_out": sum(1 for d in sunday if d["status"] == "Out"),
            "sunday_questionable": sum(1 for d in sunday if d["status"] == "Questionable"),
            "sunday_doubtful": sum(1 for d in sunday if d["status"] == "Doubtful"),
        },
    }


def availability_refresh(obs: list[dict], stored: dict) -> dict:
    slot_games = [o for o in obs if o["slot"] == SLOT]
    stored_names = {d["player"] for d in stored["week9_designations_sunday_teams"] if d["player"]}
    out = {
        "slot": SLOT,
        "stored_snapshot": {
            "source": stored["source_csv"],
            "week9_rows": stored["week9_rows"],
            "week9_designations_sunday_teams": stored["week9_designations_sunday_teams"],
            "counts": stored["counts"],
        },
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "games": [],
        "offline": False,
    }
    all_applied = []
    for o in slot_games:
        gid = str(o.get("gameId") or "")
        rec = {"game": o["game"], "gameId": gid, "kickoff": o.get("kickoff")}
        if not gid:
            rec["fetch_error"] = "missing gameId"
            out["games"].append(rec)
            continue
        try:
            d = espn_designations(gid)
            rec.update({
                "http_status": d["http_status"],
                "team_blocks": d["team_blocks"],
                "designations_applied": d["applied"],
                "roster_statuses_not_applied": d["not_applied"],
            })
            all_applied.extend(d["applied"])
        except Exception as exc:  # fail-soft by design
            rec["fetch_error"] = f"{type(exc).__name__}: {exc}"
        out["games"].append(rec)
    new_names = {d["player"] for d in all_applied}
    out["summary"] = {
        "games_polled": len(slot_games),
        "games_with_error": sum(1 for g in out["games"] if g.get("fetch_error")),
        "designations_applied": len(all_applied),
        "statuses_not_applied": sum(len(g.get("roster_statuses_not_applied") or []) for g in out["games"]),
        "stored_curated_subset_size": len(stored_names),
        "newly_listed_not_in_stored_subset": sorted(n for n in new_names if n and n not in stored_names),
        "stored_names_absent_from_refresh": sorted(n for n in stored_names if n and n not in new_names),
        "diff_caveat": (
            "The stored snapshot is the injuries_2026.csv Week 9 designation set. "
            "Every stored designation belongs to TNF teams (BAL/JAX) and the stored "
            "Sunday count is zero, so newly_listed names are net-new at T-90 rather "
            "than a scope difference. A newly-listed player on a sealed PLAY ticket "
            "is a flag for the owner, never a silent reprice."
        ),
    }
    return out


def main() -> None:
    full_slate_path = REPO_ROOT / "data/engine/week9_full_slate_connected_dossiers_2026_11_06.json"
    v30_path = REPO_ROOT / "docs/predictions/research/2026-11-06/cadence_v30_overlay_sunday_w9.json"
    baseline_path = REPO_ROOT / "data/engine/week9_tuesday_0400ct_sealed_baseline_2026.json"
    full_slate = json.loads(full_slate_path.read_text(encoding="utf-8"))

    seal = verify_seal()
    obs = build_observations(full_slate, REPO_ROOT)
    conformal = run_conformal(obs)
    stored = stored_sunday_snapshot()
    refresh = availability_refresh(obs, stored)

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
            "full_slate_path": "data/engine/week9_full_slate_connected_dossiers_2026_11_06.json",
            "full_slate_sha256": sha256_file(full_slate_path),
            "full_slate_generated_at": full_slate.get("generated_at_utc"),
            "full_slate_official_record": full_slate.get("official_new_engine_verified_record"),
            "v30_overlay_path": "docs/predictions/research/2026-11-06/cadence_v30_overlay_sunday_w9.json",
            "v30_overlay_sha256": sha256_file(v30_path),
            "sealed_baseline_path": "data/engine/week9_tuesday_0400ct_sealed_baseline_2026.json",
            "sealed_baseline_sha256": sha256_file(baseline_path),
            "stored_snapshot": stored,
        },
        "seal": seal,
        "no_mutation": {
            "sealed_state_written": False,
            "candidate_written": False,
            "seal_function_called": False,
            "note": "This run wrote exactly one file: this report. candidates/, dossiers, parquet and every sealed artifact were opened read-only.",
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
            "path": "single-total; Week 9 dossiers persist market_prob_devig = 0.5 (posted_total) and Stage-5 post_sim_prob (pOver) per game — proxy=false / devig=true on every observation",
            "observations": obs,
            **conformal,
        },
        "publication": {"published": False, "reason": "Flag-only diagnostic. Nothing here is a publication."},
    }

    out_dir = REPO_ROOT / "docs/predictions/research/2026-11-08"
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / "cadence_v40_gameday_lock_sun_late_w9.json"
    target.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"wrote {target}")
    print(f"seal unchanged: {seal['unchanged']} | merkle {seal['sealed_center_merkle'][:16]}… | tau {seal['tau']}")
    print(f"observations: {conformal['n']} | band ±{conformal['band']['upper']} | coverage {conformal['coverage']} "
          f"| flagged {len(conformal['flagged'])} | degenerate {conformal['degenerate']}")
    s = refresh.get("summary") or {}
    print(f"T-90 refresh: {s.get('designations_applied')} designations applied across "
          f"{s.get('games_polled')} games, {s.get('games_with_error')} fetch errors, "
          f"{len(s.get('stored_names_absent_from_refresh') or [])} stored names absent, "
          f"{len(s.get('newly_listed_not_in_stored_subset') or [])} newly listed")


if __name__ == "__main__":
    main()
