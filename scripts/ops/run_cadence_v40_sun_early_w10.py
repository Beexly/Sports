#!/usr/bin/env python3
"""Cadence v4.0 SUN_EARLY Week 10 adaptation (Sunday 2026-11-15 10:30 CT).

T-90 for the seven 18:00Z kickoffs (1:00 PM ET). Week-10 inputs are the 2026-11-13
full-slate connected dossiers packet, not W8 writeups/verdicts:

  * market_total      = entry.matchup_environment.posted_total
  * pOver (model)     = dossier stage5_360_conjunction_gate_and_call_sheet
                        -> game_line_evaluations[market=Total, selection=Over]
                        -> post_sim_prob
  * pOver (market)    = same evaluation's market_prob_devig (devigged two-way total
                        price from the packet's over/under odds)

Residual relation is the calibrated week-7 one and is NOT re-estimated here:
    model_total = market_total + sigma * Phi^-1(pOver_model), sigma = 12.798
    residual    = model_total - market_total = sigma * Phi^-1(pOver_model)

The Munich game (NE @ DET, 14:30Z) is in progress at this run's 16:30Z timestamp, so
its designations are no longer a pre-kickoff lock input; it is recorded separately and
excluded from the conformal band instead of being silently mixed in.

Availability refresh polls the ESPN public summary endpoint for the slot's games and
diffs against the sealed Friday (v3.0) designation snapshot. Fail-soft: fetch errors
are recorded, never raised.

Read-only on sealed state. This writes exactly one report file.
"""

from __future__ import annotations

import hashlib
import json
import sys
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

SLOT = "SUN_EARLY"
WEEK = 10
SEASON = 2026

FULL_SLATE_REL = "data/engine/week10_full_slate_connected_dossiers_2026_11_13.json"
SCOREBOARD_REL = "data/engine/espn_2026_week10_scoreboard.json"
FRIDAY_OVERLAY_REL = "docs/predictions/research/2026-11-13/cadence_v30_friday_overlay_w10.json"
OUT_DIR_REL = "docs/predictions/research/2026-11-15"

#: 18:00Z kickoffs are the 1:00 PM ET window this run's T-90 belongs to.
SUN_EARLY_KICKOFF = "2026-11-15T18:00Z"
MUNICH_KICKOFF = "2026-11-15T14:30Z"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def norm_kickoff(value: object) -> str:
    """Normalize both kickoff spellings to YYYY-MM-DDTHH:MMZ.

    The dossiers packet writes '2026-11-15 18:00:00'; the v3.0 overlay writes
    '2026-11-15T18:00Z'. Comparing the raw strings silently produced an empty
    stored snapshot, which then read as a clean diff.
    """
    s = str(value or "").strip()
    if not s:
        return ""
    s = s.replace("T", " ").replace("Z", "")
    s = s.split(".")[0]
    parts = s.split(" ")
    if len(parts) != 2:
        return ""
    hhmm = parts[1].split(":")
    return f"{parts[0]}T{hhmm[0]}:{hhmm[1] if len(hhmm) > 1 else '00'}Z"


def classify_slot(kickoff: str) -> str:
    """Kickoff (normalized UTC) -> cadence slot label."""
    if kickoff == SUN_EARLY_KICKOFF:
        return SLOT
    if kickoff == MUNICH_KICKOFF:
        return "MUNICH_IN_PROGRESS"
    if kickoff in ("2026-11-15T21:05Z", "2026-11-15T21:25Z"):
        return "SUN_LATE"
    if kickoff == "2026-11-16T01:20Z":
        return "SNF"
    if kickoff == "2026-11-17T01:15Z":
        return "MNF"
    return "OUT_OF_SLOT"


def espn_id_map(scoreboard_path: Path) -> dict[str, str]:
    events = json.loads(scoreboard_path.read_text(encoding="utf-8"))
    if isinstance(events, dict):
        events = events.get("events") or []
    out = {}
    for e in events:
        short = str(e.get("shortName") or "")
        for sep in (" VS ", " @ "):
            if sep in short:
                away, home = short.split(sep, 1)
                out[f"{away.strip()} @ {home.strip()}"] = str(e.get("id"))
        if e.get("id"):
            out.setdefault(str(e.get("name") or ""), str(e.get("id")))
    return out


def total_evaluations(dossier: dict) -> dict:
    s5 = dossier.get("stage5_360_conjunction_gate_and_call_sheet") or {}
    out = {}
    for ev in s5.get("game_line_evaluations") or []:
        if ev.get("market") != "Total":
            continue
        sel = str(ev.get("selection") or "")
        if sel.startswith("Over"):
            out["over"] = ev
        elif sel.startswith("Under"):
            out["under"] = ev
    return out


def build_observations(full_slate: dict) -> tuple[list[dict], dict]:
    """One observation per pre-kickoff SUN_EARLY game. Pure; flag-only."""
    ids = espn_id_map(REPO_ROOT / SCOREBOARD_REL)
    obs, skipped, in_progress, out_of_slot = [], {}, {}, {}
    for matchup, entry in full_slate["dossiers"].items():
        me = entry.get("matchup_environment") or {}
        line = me.get("posted_total")
        kickoff_raw = entry.get("kickoff_utc")
        kickoff = norm_kickoff(kickoff_raw)
        dossier = json.loads((REPO_ROOT / entry["dossier_rel_path"]).read_text(encoding="utf-8"))
        evals = total_evaluations(dossier)
        over = evals.get("over")
        if line is None or over is None:
            skipped[matchup] = "missing posted_total or Total/Over evaluation"
            continue
        p_over = over.get("post_sim_prob")
        if p_over is None or not (0 < float(p_over) < 1):
            skipped[matchup] = "post_sim_prob absent or outside (0,1)"
            continue
        p_over = float(p_over)
        p_mkt = over.get("market_prob_devig")
        p_mkt = float(p_mkt) if isinstance(p_mkt, (int, float)) and 0 < p_mkt < 1 else None
        rec = {
            "game": matchup,
            "gameId": ids.get(matchup),
            "slot": classify_slot(kickoff),
            "kickoff": kickoff,
            "kickoff_raw": kickoff_raw,
            "marketTotal": float(line),
            "pOver": round(p_over, 4),
            "modelTotal": round(float(line) + SIGMA_TOTAL * z(p_over), 4),
            "residual": round(SIGMA_TOTAL * z(p_over), 4),
            "marketPOverDevig": round(p_mkt, 4) if p_mkt is not None else None,
            "proxy": p_mkt is None,
            "devig": p_mkt is not None,
            "model_pOver_source": "dossier Stage-5 post_sim_prob (Over total)",
            "market_pOver_source": "dossier Stage-5 market_prob_devig (Over total)" if p_mkt else
                                   "unavailable: using posted line as external total only",
        }
        if rec["slot"] == SLOT:
            obs.append(rec)
        elif rec["slot"] == "MUNICH_IN_PROGRESS":
            in_progress[matchup] = rec
        else:
            out_of_slot[matchup] = rec
    obs.sort(key=lambda o: (o["game"]))
    return obs, {
        "skipped": skipped,
        "excluded_in_progress": in_progress,
        "owned_by_other_slot": out_of_slot,
        "exclusion_note": (
            "NE @ DET (14:30Z) is in progress at this run's T-90 timestamp, so its ESPN "
            "designations are no longer a pre-kickoff lock input. Games at 21:05Z/21:25Z/01:20Z "
            "belong to the 13:35 CT SUN_LATE run and the SNF/MNF slots; they are listed here for "
            "completeness and are NOT part of this slot's conformal band."
        ),
    }


def friday_snapshot(overlay_path: Path) -> dict:
    overlay = json.loads(overlay_path.read_text(encoding="utf-8"))
    stored = {}
    for g in overlay.get("games") or []:
        if norm_kickoff(g.get("kickoff_utc")) != SUN_EARLY_KICKOFF:
            continue
        names = []
        for team, block in (g.get("designations") or {}).items():
            for row in block.get("applied") or []:
                names.append({
                    "team": team,
                    "player": row.get("player"),
                    "position": row.get("position"),
                    "status": row.get("status"),
                })
        stored[g.get("matchup")] = names
    return {
        "source": FRIDAY_OVERLAY_REL,
        "source_generated_at_utc": overlay.get("generated_at_utc"),
        "source_sha256": sha256_file(overlay_path),
        "games": stored,
        "designation_count": sum(len(v) for v in stored.values()),
    }


def availability_refresh(obs: list[dict], stored: dict) -> dict:
    out = {
        "slot": SLOT,
        "stored_snapshot": {
            "source": stored["source"],
            "generated_at_utc": stored["source_generated_at_utc"],
            "sha256": stored["source_sha256"],
            "designation_count": stored["designation_count"],
        },
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "games": [],
        "offline": False,
    }
    all_applied = []
    for o in obs:
        gid = str(o.get("gameId") or "")
        rec = {"game": o["game"], "gameId": gid, "kickoff": o.get("kickoff")}
        if not gid:
            rec["fetch_error"] = "missing ESPN event id"
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

    live_rows = {g["game"]: (g.get("designations_applied") or []) for g in out["games"]}
    new_enriched, absent_enriched = [], []
    for matchup, rows in stored["games"].items():
        live = live_rows.get(matchup)
        if live is None:
            continue
        live_names = {r["player"] for r in live if r.get("player")}
        stored_names = {r["player"] for r in rows if r.get("player")}
        for r in live:
            if r.get("player") and r["player"] not in stored_names:
                new_enriched.append({"game": matchup, **r})
        for r in rows:
            if r.get("player") and r["player"] not in live_names:
                absent_enriched.append({"game": matchup, **r})
    new_enriched.sort(key=lambda r: (r["game"], r["player"] or ""))
    absent_enriched.sort(key=lambda r: (r["game"], r["player"] or ""))
    new_names = [r["player"] for r in new_enriched]
    absent = [r["player"] for r in absent_enriched]
    out["summary"] = {
        "games_polled": len(obs),
        "games_with_error": sum(1 for g in out["games"] if g.get("fetch_error")),
        "designations_applied": len(all_applied),
        "statuses_not_applied": sum(len(g.get("roster_statuses_not_applied") or []) for g in out["games"]),
        "stored_designations": stored["designation_count"],
        "newly_listed_not_in_stored_subset": sorted(set(new_names)),
        "newly_listed_detail": new_enriched,
        "stored_names_absent_from_refresh": sorted(set(absent)),
        "stored_names_absent_detail": absent_enriched,
        "absence_semantics_caveat": (
            "A Friday designation that no longer appears in the ESPN summary feed is NOT evidence "
            "the player is active: ESPN drops players from the injury list once a designation "
            "lapses, and official inactives are published 90 minutes before kickoff, not inside "
            "the injury feed. Read stored_names_absent_detail as 'designation resolved or "
            "withdrawn, needs owner confirmation', never as 'cleared to play'."
        ),
        "diff_caveat": (
            "Stored side is the Friday v3.0 overlay's applied designations for these games. "
            "The T-90 ESPN pull is the full league designation list, so newly_listed names include "
            "players the Friday materiality filter never carried — scope difference, not all status "
            "flips. The signal that matters is stored_names_absent_from_refresh: curated Friday names "
            "no longer Out/Doubtful/Questionable at T-90. A newly-listed name on a sealed ticket is a "
            "flag for the owner, never a silent reprice."
        ),
    }
    return out


def main() -> None:
    full_slate_path = REPO_ROOT / FULL_SLATE_REL
    overlay_path = REPO_ROOT / FRIDAY_OVERLAY_REL
    full_slate = json.loads(full_slate_path.read_text(encoding="utf-8"))

    seal = verify_seal()
    obs, exclusions = build_observations(full_slate)
    conformal = run_conformal(obs)
    stored = friday_snapshot(overlay_path)
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
            "ct_time": "10:30",
            "label": "T-90 inactives lock refresh + conformal residual diagnostic (flag-only)",
        },
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "full_slate_path": FULL_SLATE_REL,
            "full_slate_sha256": sha256_file(full_slate_path),
            "full_slate_generated_at_utc": full_slate.get("generated_at_utc"),
            "full_slate_packet_sha256": full_slate.get("slate_packet_sha256"),
            "full_slate_dossiers_completed": full_slate.get("dossiers_completed_count"),
            "full_slate_sims_per_game": full_slate.get("n_sims_per_game"),
            "espn_scoreboard_path": SCOREBOARD_REL,
            "espn_scoreboard_sha256": sha256_file(REPO_ROOT / SCOREBOARD_REL),
            "friday_overlay_path": FRIDAY_OVERLAY_REL,
            "friday_overlay_sha256": sha256_file(overlay_path),
        },
        "seal": seal,
        "no_mutation": {
            "sealed_state_written": False,
            "candidate_written": False,
            "seal_function_called": False,
            "note": "This run wrote exactly one file: this report. candidates/, dossiers and every "
                    "sealed artifact were opened read-only.",
        },
        "observation_exclusions": exclusions,
        "availability_refresh": refresh,
        "conformal": {
            "sigma_total": SIGMA_TOTAL,
            "sigma_total_calibration": {
                "source": "artifacts/slate/2026-10-25-week7-master-slate.json",
                "n": SIGMA_TOTAL_N,
                "sd": SIGMA_TOTAL_SD,
                "relation": "modelTotal = marketTotal + sigma * Phi^-1(pOver_model)",
                "reestimated_this_run": False,
            },
            "alpha": ALPHA,
            "path": "single-total; Week-10 packet dossiers persist posted_total plus devigged "
                    "Over/Under pair, so pOver_model is Stage-5 post_sim_prob and the external "
                    "total is the posted line",
            "observations": obs,
            **conformal,
        },
        "publication": {"published": False, "reason": "Flag-only diagnostic. Nothing here is a publication."},
    }

    out_dir = REPO_ROOT / OUT_DIR_REL
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"cadence_v40_gameday_lock_{SLOT.lower()}_w{WEEK}.json"
    target.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"wrote {target}")
    # verify_seal() has two shapes: the self-contained partial check (verification_level)
    # and v25's full six-check path (no verification_level key). A print must not be the
    # thing that crashes a flag-only diagnostic.
    level = seal.get("verification_level", "full")
    n_checks = len(seal.get("checks") or {})
    print(f"seal unchanged: {seal.get('unchanged')} | level {level} ({n_checks} checks) | "
          f"merkle {str(seal.get('sealed_center_merkle'))[:16]}... | tau {seal.get('tau')}")
    print(f"observations: {conformal['n']} | band +/-{conformal['band']['upper']} | "
          f"coverage {conformal['coverage']} | flagged {len(conformal['flagged'])} | "
          f"degenerate {conformal['degenerate']}")
    s = refresh["summary"]
    print(f"T-90 refresh: {s['designations_applied']} designations across {s['games_polled']} games, "
          f"{s['games_with_error']} fetch errors, {len(s['stored_names_absent_from_refresh'])} "
          f"stored names absent, {len(s['newly_listed_not_in_stored_subset'])} newly listed")


if __name__ == "__main__":
    main()