#!/usr/bin/env python3
"""Cadence v4.0 — Sunday T-90 game-day lock refresh + conformal residual diagnostic.

Two Sunday slots, one script (default SUN_EARLY for the 10:30 CT run, SUN_LATE
for the 13:35 CT run). T-90 means 90 minutes before the slot's kickoff hour,
when the official inactive lists land.

Sequence:
  1. Verify the seal is untouched: sealed-center merkle, candidate lineage,
     coach-mind canonical digest, EPA dropoff table hash, tau 0.42. Read-only.
  2. Refresh availability for the slot's games from the ESPN public summary
     endpoint (game-status designations: Out / Doubtful / Questionable) and
     diff against the locked card's stored availability snapshot. Fail-soft:
     a network failure is recorded, never raised. Roster statuses (IR /
     Suspension / PUP) are recorded, never applied — roster availability is a
     Tuesday-baseline input, not a game-day designation.
  3. Conformal residual diagnostic, flag-only:
       residual = model_total - external_total
     model_total = market_line + sigma_total * Phi^-1(p_over), the calibrated
     engine relation (week-7 master slate, n=13, sigma 12.798, sd 0.134).
     external_total = the posted market line. Week-8 artifacts persist no odds
     pair or P10/P90, so the single-total path is used and every observation is
     tagged proxy=true / devig=false — the honest fallback, never a devigged
     number wearing a fair label.
  4. Write ONE JSON report. Nothing else. candidates/ and every sealed artifact
     are opened read-only; no seal() call exists in this file.

What this script does NOT do: no re-estimation of tau, cost matrix, ratings or
the EPA dropoff table; no mutation of any sealed artifact; no publication.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "ops"))

#: Pinned truth, read from run_cadence_v25_injury_overlay.py:38 — never re-typed by hand.
AUTHORITATIVE_MERKLE = "23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b"
CANDIDATE_TAU_RATING = 4.6607
SEALED_TAU = 0.42


def _load_v25():
    """v25's import chain needs numpy plus intelligence.* modules that are not always present.

    A missing dependency must not take down a flag-only diagnostic, so this degrades to a
    self-contained seal check instead of raising.
    """
    try:
        import run_cadence_v25_injury_overlay as v25  # noqa: F401
        return v25
    except Exception as exc:  # ImportError and its transitive friends
        return {"__import_error__": f"{type(exc).__name__}: {exc}"}


def verify_seal() -> dict:
    """Seal verification. Full via v25 when its chain imports; partial otherwise."""
    v25 = _load_v25()
    if not isinstance(v25, dict):
        return v25.verify_seal()

    center_path = REPO_ROOT / "candidates" / "sealed-center.json"
    candidate_path = REPO_ROOT / "candidates" / "2026-10-25-week7-candidate.json"
    center = json.loads(center_path.read_text(encoding="utf-8"))
    candidate = json.loads(candidate_path.read_text(encoding="utf-8")) if candidate_path.is_file() else {}
    merkle = str(center.get("merkle", ""))
    lineage = candidate.get("parent_seal_hash")
    checks = {
        "sealed_center_merkle_matches_recorded": merkle == AUTHORITATIVE_MERKLE,
        "candidate_parent_seal_hash_matches_center": lineage == merkle,
        "candidate_tau_rating_recorded": float((candidate.get("params") or {}).get("tau", -1)) == CANDIDATE_TAU_RATING,
        "coach_mind_tau_is_0_42": center.get("tau") == SEALED_TAU,
    }
    return {
        "verification_level": "partial",
        "verification_gap": (
            "v25 import unavailable in this interpreter ("
            + v25["__import_error__"]
            + "). EPA-dropoff table hash and coach-mind canonical digest were NOT re-checked; "
              "the four lineage checks below are the independent ones."
        ),
        "sealed_center_path": str(center_path.relative_to(REPO_ROOT)).replace("\\", "/"),
        "sealed_center_merkle": merkle,
        "authoritative_merkle": AUTHORITATIVE_MERKLE,
        "sealed_at": center.get("sealed_at"),
        "tau": center.get("tau"),
        "candidate_parent_seal_hash": lineage,
        "checks": checks,
        "unchanged": all(checks.values()),
        "provenance_caveat": (
            "candidates/ is quarantined per artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md D1: "
            "'unchanged' asserts byte-identity with the active seal center, not that the seal is "
            "independently reproducible."
        ),
    }

#: Total-point sigma calibrated on the week-7 master slate (13 games, sd 0.134):
#: finalProjectedTotal - totalLine = sigma * Phi^-1(modelOverProb) holds at
#: 12.798 +/- 0.134 across every game in that slate.
SIGMA_TOTAL = 12.798
SIGMA_TOTAL_N = 13
SIGMA_TOTAL_SD = 0.134

ALPHA = 0.1

#: qLevel saturates at 1.0 for n <= 18 at alpha = 0.1, which makes the band
#: exactly max|residual| and makes a flag mathematically impossible.
DEGENERATE_N_MAX = 18

ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={event}"

OUT_STATUSES = {"Out", "Doubtful"}
QUESTIONABLE_STATUSES = {"Questionable"}


def z(p: float) -> float:
    """Acklam rational approximation of the standard normal inverse CDF."""
    a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
         1.383577518672690e2, -3.066479806614716e1, 2.506628277459239]
    b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
         6.680131188771972e1, -1.328068155288572e1]
    c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
         -2.549732539343734, 4.374664141464968, 2.938163982698783]
    d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
         3.754408661907416]
    pl = 0.02425
    if p < pl:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    if p > 1 - pl:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / \
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)


def quantile_sorted(sorted_vals: list[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    pos = (len(sorted_vals) - 1) * q
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return sorted_vals[lo]
    frac = pos - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_conformal(observations: list[dict], alpha: float = ALPHA) -> dict:
    """Split-conformal band, per the gse-pre-seal spec. Pure; flag-only."""
    residuals = [o["residual"] for o in observations]
    abs_sorted = sorted(abs(r) for r in residuals)
    n = len(residuals)
    q_level = min(1.0, math.ceil((n + 1) * (1 - alpha)) / n) if n else 0.0
    q_hat = quantile_sorted(abs_sorted, q_level)
    flagged = []
    for i, r in enumerate(residuals):
        if abs(r) > q_hat:
            flagged.append({
                "index": i,
                "game": observations[i]["game"],
                "residual": r,
                "reason": f"|{r}| > band {round(q_hat, 4)}"
                          + (" (proxy trueOdds)" if observations[i].get("proxy") else ""),
            })
    coverage = round(1 - len(flagged) / n, 4) if n else 0.0
    degenerate = q_level >= 1.0
    return {
        "alpha": alpha,
        "band": {"lower": round(-q_hat, 4), "upper": round(q_hat, 4)},
        "residuals": residuals,
        "flagged": flagged,
        "n": n,
        "coverage": coverage,
        "qLevel": round(q_level, 4),
        "degenerate": degenerate,
        "degeneracy_note": (
            f"qLevel saturates at 1.0 for n<={DEGENERATE_N_MAX} at alpha={alpha}; the band equals "
            "max|residual| and no flag is possible by construction. This is a property of the "
            "estimator at this sample size, not evidence of calibration."
            if degenerate else "band is non-degenerate"
        ),
    }


def build_observations(writeups_path: Path, verdicts_path: Path) -> list[dict]:
    writeups = json.loads(writeups_path.read_text(encoding="utf-8"))
    verdicts = json.loads(verdicts_path.read_text(encoding="utf-8"))
    vmap = {str(g.get("espnEventId") or gid): g for gid, g in verdicts["games"].items()}
    obs = []
    for w in writeups["writeups"]:
        sel = (w.get("sideTotalCall") or {}).get("totalSelection") or ""
        try:
            line = float(sel.split()[-1])
        except (ValueError, IndexError):
            continue
        g = vmap.get(str(w.get("gameId")))
        if g is None:
            continue
        p_over = g.get("posterior_prob_over")
        if p_over is None or not (0 < float(p_over) < 1):
            continue
        p_over = float(p_over)
        model_total = line + SIGMA_TOTAL * z(p_over)
        obs.append({
            "game": w["matchup"],
            "gameId": w.get("gameId"),
            "slot": w.get("windowSlot"),
            "kickoff": w.get("kickoff"),
            "marketTotal": line,
            "pOver": p_over,
            "modelTotal": round(model_total, 4),
            "residual": round(model_total - line, 4),
            "proxy": True,
            "devig": False,
        })
    obs.sort(key=lambda o: (o.get("slot") or "", o.get("kickoff") or "", o["game"]))
    return obs


def _fetch(url: str, timeout: int = 12):
    req = urllib.request.Request(url, headers={"User-Agent": "gse-cadence-v4.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read())


def espn_designations(event_id: str) -> dict:
    """Game-status designations from one ESPN summary payload. Fail-soft upstream."""
    status, payload = _fetch(ESPN_SUMMARY.format(event=event_id))
    applied, not_applied = [], []
    # ESPN's summary nests injuries at the TOP level: injuries[] -> {team, injuries[]}.
    # It is NOT under home/away. Parsing the wrong path silently yields zero designations,
    # which reads as "no injuries" when it actually means "we looked in the wrong place".
    for team_block in (payload.get("injuries") or []):
        team = team_block.get("team") or {}
        abbr = str(team.get("abbreviation") or "?")
        for item in (team_block.get("injuries") or []):
            athlete = item.get("athlete") or {}
            name = athlete.get("displayName") or ""
            pos = (athlete.get("position") or {}).get("abbreviation", "")
            st = str(item.get("status") or "").strip()
            if not name:
                continue
            if st in OUT_STATUSES or st in QUESTIONABLE_STATUSES:
                applied.append({"team": abbr, "player": name, "position": pos, "status": st})
            else:
                not_applied.append({"team": abbr, "player": name, "position": pos, "status": st})
    return {
        "http_status": status,
        "team_blocks": len(payload.get("injuries") or []),
        "applied": applied,
        "not_applied": not_applied,
    }


def availability_refresh(slot: str, obs: list[dict], locked_card: dict, offline: bool) -> dict:
    """Pull current designations for the slot's games; diff vs the stored snapshot."""
    stored = locked_card.get("official_availability") or {}
    slot_games = [o for o in obs if (o.get("slot") or "") == slot]
    out = {
        "slot": slot,
        "stored_snapshot": {
            "observed_at": stored.get("observed_at"),
            "source": stored.get("source"),
            "injury_report": stored.get("injury_report"),
            "counts": {
                "ruled_out": len(stored.get("ruled_out") or []),
                "questionable": len(stored.get("questionable") or []),
                "no_game_designation": len(stored.get("no_game_designation") or []),
                "roster_confirmed": len(stored.get("roster_confirmed") or []),
            },
        },
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "games": [],
        "offline": offline,
    }
    if offline:
        out["fetch_error"] = "offline mode requested; no ESPN pull attempted"
        return out

    stored_names = set()
    for row in (stored.get("ruled_out") or []) + (stored.get("questionable") or []):
        nm = row.get("player") if isinstance(row, dict) else None
        if nm:
            stored_names.add(str(nm))

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
        except Exception as exc:  # fail-soft by design; a fetch error is recorded, never raised
            rec["fetch_error"] = f"{type(exc).__name__}: {exc}"
        out["games"].append(rec)

    new_names = {d["player"] for d in all_applied}
    absent = sorted(n for n in stored_names if n and n not in new_names)
    out["summary"] = {
        "games_polled": len(slot_games),
        "games_with_error": sum(1 for g in out["games"] if g.get("fetch_error")),
        "designations_applied": len(all_applied),
        "statuses_not_applied": sum(len(g.get("roster_statuses_not_applied") or []) for g in out["games"]),
        "stored_curated_subset_size": len(stored_names),
        "newly_listed_not_in_stored_subset": sorted(n for n in new_names if n and (n not in stored_names)),
        "stored_names_absent_from_refresh": absent,
        "diff_caveat": (
            "The stored snapshot is a MATERIALITY-FILTERED list (only names judged to move a "
            "number), not the full league injury report. A full refresh will therefore list many "
            "players the Friday snapshot never carried; that is a scope difference, not 76 status "
            "changes. The meaningful signal is stored_names_absent_from_refresh — curated names "
            "that no longer appear as Out/Questionable at T-90."
        ),
    }
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Cadence v4.0 T-90 lock refresh + conformal diagnostic")
    parser.add_argument("--slot", default="SUN_EARLY", choices=["SUN_EARLY", "SUN_LATE"])
    parser.add_argument("--week", type=int, default=8)
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--writeups", default="data/packages/live-slate-writeups.json")
    parser.add_argument("--verdicts", default="data/engine/nfl_2026_w8_five_stage_engine_verdicts.json")
    parser.add_argument("--locked-card", default="data/engine/week8_360_locked_card_2026_10_30.json")
    parser.add_argument("--output-dir", default="docs/predictions/research/2026-11-01")
    parser.add_argument("--offline", action="store_true", help="skip the ESPN pull")
    args = parser.parse_args()

    writeups_path = REPO_ROOT / args.writeups
    verdicts_path = REPO_ROOT / args.verdicts
    card_path = REPO_ROOT / args.locked_card

    seal = verify_seal()
    locked_card = json.loads(card_path.read_text(encoding="utf-8"))
    obs = build_observations(writeups_path, verdicts_path)
    conformal = run_conformal(obs)
    refresh = availability_refresh(args.slot, obs, locked_card, args.offline)

    report = {
        "report_type": "CADENCE_V4_0_T90_GAMEDAY_LOCK_AND_CONFORMAL_DIAGNOSTIC",
        "version": "v4.0",
        "phase": "T90_GAMEDAY_LOCK_REFRESH",
        "slot": args.slot,
        "week": args.week,
        "season": args.season,
        "cadence_window": {
            "day": "Sun",
            "ct_time": "10:30" if args.slot == "SUN_EARLY" else "13:35",
            "label": "T-90 inactives lock refresh + conformal residual diagnostic (flag-only)",
        },
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "writeups_path": args.writeups,
            "writeups_sha256": sha256_file(writeups_path),
            "verdicts_path": args.verdicts,
            "verdicts_sha256": sha256_file(verdicts_path),
            "locked_card_path": args.locked_card,
            "locked_card_sha256": sha256_file(card_path),
            "locked_card_generated_at": locked_card.get("generated_at"),
            "locked_card_seal_digest": locked_card.get("seal_digest"),
        },
        "seal": seal,
        "no_mutation": {
            "sealed_state_written": False,
            "candidate_written": False,
            "seal_function_called": False,
            "note": "This run wrote exactly one file: this report. candidates/ and all sealed "
                    "artifacts were opened read-only.",
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
            "path": "single-total (proxy); week-8 artifacts persist no odds pair or P10/P90",
            "observations": obs,
            **conformal,
        },
        "publication": {"published": False, "reason": "Flag-only diagnostic. Nothing here is a publication."},
    }

    out_dir = REPO_ROOT / args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"cadence_v40_gameday_lock_{args.slot.lower()}_w{args.week}.json"
    target.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"wrote {target}")
    print(f"seal unchanged: {seal['unchanged']} | merkle {seal['sealed_center_merkle'][:16]}… | tau {seal['tau']}")
    print(f"observations: {conformal['n']} | band ±{conformal['band']['upper']} | coverage {conformal['coverage']} "
          f"| flagged {len(conformal['flagged'])} | degenerate {conformal['degenerate']}")
    s = refresh.get("summary")
    if s:
        # Report the split diff keys the current summary emits. The old single
        # 'surprise_flips_vs_stored' list was replaced by two directional lists;
        # referencing the retired key crashed the run after the report was written.
        print(f"T-90 refresh: {s['designations_applied']} designations applied across "
              f"{s['games_polled']} games, {s['games_with_error']} fetch errors, "
              f"{len(s['stored_names_absent_from_refresh'])} stored names absent from refresh, "
              f"{len(s['newly_listed_not_in_stored_subset'])} newly listed")
    else:
        print(f"T-90 refresh: {refresh.get('fetch_error')}")


if __name__ == "__main__":
    main()
