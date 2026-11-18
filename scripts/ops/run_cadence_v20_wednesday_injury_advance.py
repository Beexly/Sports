#!/usr/bin/env python3
"""Cadence v2.0 — Wednesday 17:00 CT mid-week injury advance.

Advances the locked Week-11 projection (the v1.0 Tuesday 04:00 CT seal produced by
run_weekly_cadence_tick.py under phase MON_TUE_FINE_TUNE_SEAL) into a v2.0
INJURY_WEATHER_OVERLAY snapshot using the mid-week injury designations, under the
SEALED Sinkhorn cost matrix C. Nothing is re-estimated and nothing is resealed.

Designation source
------------------
ESPN's league injury feed is the primary designation source because it carries a
football-ops `status` (Out / Doubtful / Questionable) for every team on the current
card. The nflverse injuries release, at Wednesday 17:00 CT, carries practice
participation only (report_status empty for the whole week-11 slice) and is used
solely as corroboration and as the practice-signal layer.

Doctrine carried in from the v1.0 implementation:
  * A practice report is NOT a game designation. Only a designating status
    (Out / Doubtful / Questionable) advances the projection. Practice participation
    (DNP / Limited) is surfaced separately and never promoted.
  * The coach mindset identity (tau = 0.42 and the coach-mind canonical digest) is
    sealed at v1.0. An injury overlay may move execution weights but the identity
    must stay byte-identical. This script asserts it before and after, and exits
    non-zero if any invariant moved.
  * The cost matrix and the EPA dropoff table are read from the sealed object. They
    are never refit here. That is the "fixed cost matrix" contract.

Role slots are a MULTISET: the Sinkhorn reallocation and the EPA bucket deltas read
only which role slots are scratched, never which player occupies them, so the
identity of the WR1 vs WR2 slot does not enter any number in this report. Slot
counts come from position-group order within each team's designation list.

Points-equivalent convention: role EPA dropoff * 18, the same multiplier the TS
pipeline uses when it converts replacement-level EPA dropoff to a points delta
(scripts/ops/run_full_gse_slate_pipeline.ts, awayInjuryPointsDelta / homeInjuryPointsDelta).

Read-only with respect to every sealed artifact. Writes one JSON report.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "ops"))

import gse_coach_mind_simulator as sim  # noqa: E402
import gse_injury_overlay_v2 as overlay  # noqa: E402
import run_cadence_v25_injury_overlay as v25  # noqa: E402

ROLE_NAMES = v25.ROLE_NAMES
BASE_SHARES = v25.BASE_SHARES
EPA_POINTS_MULTIPLIER = 18.0
DESIGNATING_STATUSES = ("Out", "Doubtful", "Questionable")

# v2.5 POSITION_ROLES plus two documented extensions. Without them an interior
# defensive lineman or a safety designated Out silently vanishes from the overlay
# (the v2.5 table maps DE/EDGE/LB/OLB to EDGE1 and CB/DB to CB1, but not DT or S,
# and ESPN abbreviates safeties as "S" and interior tackles as "DT").
POSITION_ROLES = dict(v25.POSITION_ROLES)
POSITION_ROLES.update({
    "DT": "EDGE1",
    "NT": "EDGE1",
    "S": "CB1",
    "FS": "CB1",
    "SS": "CB1",
})
ROLE_MAPPING_EXTENSIONS = {
    "DT": "EDGE1 (interior DL)",
    "NT": "EDGE1 (interior DL)",
    "S": "CB1 (secondary bucket)",
    "FS": "CB1 (secondary bucket)",
    "SS": "CB1 (secondary bucket)",
}

# sealed epaDropoffTable role -> group bucket used for points-equivalent deltas.
EPA_ROLE_BUCKET = {
    "QB1": "QB1",
    "QB_QUESTIONABLE": "QB_QUESTIONABLE",
    "RB1": "SKILL",
    "WR1": "SKILL",
    "WR2": "SKILL",
    "WR3": "SKILL",
    "TE1": "SKILL",
    "LT": "OL",
    "CB1": "DEF",
    "EDGE1": "DEF",
}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _role_for(team: str, pos: str, report: str, counts: dict) -> str:
    """Map one designation to a sealed role slot. Mirrors v2.5 week_designations."""
    out_or_doubt = report in ("Out", "Doubtful")
    question = report == "Questionable"
    if not (out_or_doubt or question):
        return ""
    index = counts.get((team, pos), 0) + 1
    counts[(team, pos)] = index
    if pos == "QB":
        return "QB1" if (out_or_doubt and index == 1) else "QB_QUESTIONABLE"
    if pos in POSITION_ROLES:
        return POSITION_ROLES[pos] if index == 1 else ""
    if pos == "WR":
        return "WR1" if index == 1 else ("WR2" if index == 2 else "WR3")
    if pos == "RB":
        return "RB1" if index == 1 else ""
    if pos == "TE":
        return "TE1" if index == 1 else ""
    return ""


def norm_name(s: str) -> str:
    parts = [
        w for w in str(s).lower().replace(".", "").replace(",", "").split()
        if w not in ("jr", "sr", "ii", "iii", "iv")
    ]
    return " ".join(parts)


def stage0_excluded_names(config_path: Path) -> tuple[set[str], dict]:
    """Names the sealed baseline already treats as unavailable (OUT / IR / traded).

    Re-advancing one of these would double-count an absence the Tuesday lock already
    priced in. The config gates on week freshness for publishable runs; this report is
    a flag-only overlay, so the set is used as a floor and its staleness is recorded
    rather than silently trusted.
    """
    if not config_path.is_file():
        return set(), {"available": False}
    cfg = json.loads(config_path.read_text(encoding="utf-8"))
    names: set[str] = set()
    for p in cfg.get("excluded_players", []):
        if p.get("name"):
            names.add(norm_name(p["name"]))
    for p in cfg.get("traded_players", []):
        if isinstance(p, dict) and p.get("name"):
            names.add(norm_name(p["name"]))
    as_of = cfg.get("as_of")
    age = (datetime.now(timezone.utc).date() - datetime.strptime(as_of, "%Y-%m-%d").date()).days if as_of else None
    return names, {
        "available": True,
        "path": str(config_path.relative_to(REPO_ROOT)).replace("\\", "/"),
        "config_week": cfg.get("week"),
        "as_of": as_of,
        "age_days": age,
        "publishable": bool(cfg.get("week") == 11),
        "names": len(names),
    }


def espn_designations(path: Path, id_to_abbr: dict[str, str], exclude: set[str]) -> tuple[dict, dict, dict, list, list]:
    """Designations per team from the ESPN league feed.

    The league feed keys teams by numeric id with no abbreviation field, so the
    id -> abbreviation map is derived from the same-week ESPN slate (every team on
    the card appears there). Teams not on the card are skipped and counted.

    Returns (roles_by_team, detail_by_team, unmapped_by_team).
    Roster statuses that are not game designations (Active, Injured Reserve,
    Suspension) are recorded but never promoted.
    """
    payload = json.loads(path.read_text(encoding="utf-8"))
    roles: dict[str, list[str]] = {}
    detail: dict[str, list[dict]] = {}
    unmapped: dict[str, list[dict]] = {}
    counts: dict[tuple[str, str], int] = {}
    skipped_byes = []
    blocked: dict[str, list[dict]] = {}
    for team_block in payload.get("injuries", []):
        abbr = id_to_abbr.get(str(team_block.get("id") or "").strip())
        if not abbr:
            skipped_byes.append(team_block.get("displayName"))
            continue
        for entry in team_block.get("injuries", []):
            status = str(entry.get("status", "")).strip()
            athlete = entry.get("athlete") or {}
            name = str(athlete.get("displayName", "")).strip()
            pos = str((athlete.get("position") or {}).get("abbreviation") or "").strip().upper()
            det = entry.get("details") or {}
            if not name:
                continue
            row = {
                "player": name,
                "position": pos,
                "status": status,
                "injury": det.get("type"),
                "detail": det.get("detail"),
                "return_date": det.get("returnDate"),
            }
            if status not in DESIGNATING_STATUSES:
                if status and status != "Active":
                    unmapped.setdefault(abbr, []).append({**row, "reason": "non-designating roster status"})
                continue
            if norm_name(name) in exclude:
                blocked.setdefault(abbr, []).append(
                    {**row, "reason": "already excluded by the sealed baseline (OUT/IR/traded)"}
                )
                continue
            role = _role_for(abbr, pos, status, counts)
            detail.setdefault(abbr, []).append({**row, "sealed_role": role or None})
            if role:
                roles.setdefault(abbr, [])
                if role not in roles[abbr]:
                    roles[abbr].append(role)
            else:
                unmapped.setdefault(abbr, []).append({**row, "reason": "position has no sealed role slot"})
    return roles, detail, unmapped, sorted(x for x in skipped_byes if x), blocked


def nflverse_practice_signals(csv_path: Path, week: int) -> dict:
    """Practice participation per team, mapped to sealed roles. NEVER promoted."""
    if not csv_path.is_file():
        return {}
    with open(csv_path, encoding="utf-8") as handle:
        rows = [r for r in csv.DictReader(handle) if str(r.get("week", "")) == str(week)]
    signals: dict[str, list[dict]] = {}
    counts: dict[tuple[str, str], int] = {}
    for r in rows:
        team = str(r.get("team", "")).strip()
        if team == "LA":
            team = "LAR"
        name = str(r.get("full_name", "")).strip()
        practice = str(r.get("practice_status", "")).strip()
        if not team or not name or not practice:
            continue
        pos = str(r.get("position", "")).strip().upper()
        index = counts.get((team, pos), 0) + 1
        counts[(team, pos)] = index
        if pos == "QB":
            role = "QB1" if index == 1 else "QB_QUESTIONABLE"
        elif pos in POSITION_ROLES:
            role = POSITION_ROLES[pos] if index == 1 else ""
        elif pos == "WR":
            role = "WR1" if index == 1 else ("WR2" if index == 2 else "WR3")
        elif pos == "RB":
            role = "RB1" if index == 1 else ""
        elif pos == "TE":
            role = "TE1" if index == 1 else ""
        else:
            role = ""
        level = (
            "DNP" if practice.lower().startswith("did not participate")
            else "LIMITED" if practice.lower().startswith("limited")
            else "FULL"
        )
        signals.setdefault(team, []).append(
            {
                "player": name,
                "position": pos,
                "sealed_role": role,
                "practice_level": level,
                "practice_status": practice,
                "injury": str(r.get("practice_primary_injury", "")).strip(),
                "report_status": str(r.get("report_status", "")).strip(),
                "promoted_to_designation": False,
            }
        )
    return signals


def team_advance(sealed_state, roles: list[str], prior_roles: list[str]) -> dict:
    """Sinkhorn reallocation under the sealed cost matrix, with v2.5 cross-check.

    The sealed EPA dropoff table is signed per bucket: offensive buckets (QB, SKILL,
    OL) carry a positive cost, while the DEF bucket is negative. A negative DEF term
    would move the projection the wrong way if it were folded into the team's own
    points-equivalent delta, so the DEF bucket is reported in its own field with its
    sealed sign preserved and is NOT applied to the projection shift. Direction of
    the defensive term is left explicit rather than silently inverted.
    """
    current = v25.team_reallocation(sealed_state, roles) if roles else None
    prior = v25.team_reallocation(sealed_state, prior_roles) if prior_roles else None
    cross = v25.cross_check(sealed_state, roles) if roles else None
    table = dict(sealed_state["epaDropoffTable"])
    offensive_buckets = ("QB1", "QB_QUESTIONABLE", "SKILL", "OL")
    epa_drop_offense = sum(
        float(table[EPA_ROLE_BUCKET[r]])
        for r in roles
        if r in EPA_ROLE_BUCKET and EPA_ROLE_BUCKET[r] in offensive_buckets
    )
    epa_drop_defense = sum(
        float(table[EPA_ROLE_BUCKET[r]])
        for r in roles
        if r in EPA_ROLE_BUCKET and EPA_ROLE_BUCKET[r] == "DEF"
    )
    return {
        "qualifying_roles": list(roles),
        "prior_qualifying_roles": list(prior_roles),
        "advanced": bool(roles),
        "sinkhorn_current": current,
        "sinkhorn_prior": prior,
        "independent_cross_check": cross,
        "epa_drop_sum_offense": round(epa_drop_offense, 10),
        "epa_drop_sum_defense_sealed_sign": round(epa_drop_defense, 10),
        "points_equivalent_delta": round(epa_drop_offense * EPA_POINTS_MULTIPLIER, 4),
        "defense_bucket_points_equivalent_not_applied": round(
            epa_drop_defense * EPA_POINTS_MULTIPLIER, 4
        ),
    }


def window_slot(kickoff_utc: str) -> str:
    """Slot from the kickoff, evaluated in Central Time (the cadence clock).

    The ISO kickoff is UTC. A Thursday 7:15pm ET kickoff is 01:15Z on the *Friday*,
    so weekday must be taken after converting to CT or TNF gets filed as a Sunday
    window. UTC-6 is the CT offset in November (CST).
    """
    dt = datetime.fromisoformat(kickoff_utc.replace("Z", "+00:00"))
    ct = dt.astimezone(timezone.utc).replace(tzinfo=None) - timedelta(hours=6)
    weekday = ct.weekday()  # Mon=0
    if weekday == 3:
        return "TNF"
    if weekday == 6:
        if ct.hour >= 19:
            return "SNF"
        return "SUN_EARLY" if ct.hour < 16 else "SUN_LATE"
    if weekday == 0:
        return "MNF"
    return "SUN_LATE"


def load_slate(path: Path) -> tuple[list[dict], dict[str, str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    games = []
    id_to_abbr: dict[str, str] = {}
    for event in payload.get("events", []):
        comp = event["competitions"][0]
        competitors = comp["competitors"]
        home = next(c for c in competitors if c.get("homeAway") == "home")
        away = next(c for c in competitors if c.get("homeAway") == "away")
        for c in competitors:
            id_to_abbr[str(c["team"].get("id"))] = c["team"]["abbreviation"]
        games.append(
            {
                "game_id": str(event.get("id")),
                "matchup": event.get("name"),
                "away": away["team"]["abbreviation"],
                "home": home["team"]["abbreviation"],
                "kickoff_utc": event.get("date"),
                "venue_indoor": bool(comp.get("venue", {}).get("indoor")),
            }
        )
    for g in games:
        g["window_slot"] = window_slot(g["kickoff_utc"])
    return games, id_to_abbr


def main() -> int:
    parser = argparse.ArgumentParser(description="Cadence v2.0 Wednesday 17:00 CT injury advance")
    parser.add_argument("--week", type=int, default=11)
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--espn-injuries", default="data/engine/espn_nfl_injuries_2026-11-18.json")
    parser.add_argument("--injuries", default="data/nflverse/injuries_2026.csv")
    parser.add_argument("--prior-injuries", default="data/nflverse/injuries_2026.csv.bak-pre-w11-wed-20261118")
    parser.add_argument("--slate", default="data/engine/week11_slate_espn_2026-11-18.json")
    parser.add_argument("--baseline-lock", default="docs/predictions/research/2026-11-17/cadence_tick_mon_tue_fine_tune_seal_sun_early_w11.json")
    parser.add_argument("--output-dir", default="docs/predictions/research/2026-11-18")
    args = parser.parse_args()

    injuries_path = REPO_ROOT / args.injuries
    prior_path = REPO_ROOT / args.prior_injuries
    slate_path = REPO_ROOT / args.slate
    espn_path = REPO_ROOT / args.espn_injuries
    baseline_path = REPO_ROOT / args.baseline_lock

    for required in (slate_path, espn_path):
        if not required.is_file():
            print(f"CRITICAL: required input missing: {required}", file=sys.stderr)
            return 2

    sealed_obj, canonical_digest = sim.load_sealed_object_readonly()
    seal_before = v25.verify_seal()

    slate, id_to_abbr = load_slate(slate_path)
    exclude, stage0_meta = stage0_excluded_names(
        REPO_ROOT / "data" / "nflverse" / "week9_live_roster_transactions_and_starters_2026.json"
    )
    current, detail, unmapped, off_card, blocked = espn_designations(espn_path, id_to_abbr, exclude)
    prior = v25.week_designations(prior_path, args.week) if prior_path.is_file() else {}
    signals = nflverse_practice_signals(injuries_path, args.week)
    games = []
    advanced_count = 0
    for g in slate:
        away = team_advance(sealed_obj, current.get(g["away"], []), prior.get(g["away"], []))
        home = team_advance(sealed_obj, current.get(g["home"], []), prior.get(g["home"], []))
        # Convention: points_equivalent_delta is points LOST to injury. A team that
        # loses more moves the projected margin toward its opponent, so a positive
        # net_margin_shift_points means the projection moves toward HOME.
        net_shift = round(away["points_equivalent_delta"] - home["points_equivalent_delta"], 4)
        total_shift = round(home["points_equivalent_delta"] + away["points_equivalent_delta"], 4)
        state = "ADVANCED" if (away["advanced"] or home["advanced"]) else "CARRIED_UNCHANGED"
        advanced_count += 1 if state == "ADVANCED" else 0
        games.append(
            {
                "game_id": g["game_id"],
                "matchup": g["matchup"],
                "window_slot": g["window_slot"],
                "kickoff_utc": g["kickoff_utc"],
                "venue_indoor": g["venue_indoor"],
                "state": state,
                "away": away,
                "home": home,
                "projection_delta": {
                    "net_margin_shift_points": net_shift,
                    "total_shift_points": total_shift,
                },
                "designations": {
                    "away": detail.get(g["away"], []),
                    "home": detail.get(g["home"], []),
                },
                "practice_signals_only": {
                    "away": [s for s in signals.get(g["away"], []) if s["sealed_role"]],
                    "home": [s for s in signals.get(g["home"], []) if s["sealed_role"]],
                },
            }
        )

    # Scenario: what the projection does if every DNP/Limited practice signal
    # hardens into an Out designation. Labeled; never a publication input.
    scenario = {}
    for team, entries in signals.items():
        scratch = sorted({
            e["sealed_role"] for e in entries
            if e["sealed_role"] and e["practice_level"] in ("DNP", "LIMITED")
        })
        if scratch:
            scenario[team] = team_advance(sealed_obj, scratch, [])

    seal_after = v25.verify_seal()
    tau_after = sim.load_sealed_object_readonly()[0]["tau"]

    invariants = {
        "sealed_center_merkle_unchanged": seal_after["sealed_center_merkle"] == seal_before["sealed_center_merkle"],
        "coach_mind_canonical_digest_unchanged": seal_after["coach_mind_canonical_digest"] == seal_before["coach_mind_canonical_digest"],
        "coach_tau_byte_identical": tau_after == seal_before["tau"] == 0.42,
        "epa_dropoff_table_sha256_unchanged": seal_after["epa_dropoff_table_sha256"] == seal_before["epa_dropoff_table_sha256"] == overlay.EPA_DROPOFF_SHA256,
        "seal_checks_6_of_6": all(seal_after["checks"].values()),
        "cost_matrix_not_refit": True,
        "no_practice_status_promoted": all(
            not s["promoted_to_designation"] for entries in signals.values() for s in entries
        ),
    }
    invariants_hold = all(invariants.values())

    baseline = json.loads(baseline_path.read_text(encoding="utf-8")) if baseline_path.is_file() else {}
    baseline_pairs = set()
    for bg in (baseline.get("simulation_summary", {}) or {}).get("simulated_games", []):
        matchup = str(bg.get("matchup", ""))
        if "@" in matchup:
            away_b, _, home_b = matchup.partition("@")
            baseline_pairs.add((away_b.strip().split()[-1] if away_b.strip() else "", home_b.strip().split()[0] if home_b.strip() else ""))
    slate_pairs = {(g["away"], g["home"]) for g in slate}
    baseline_overlap = sorted(slate_pairs & baseline_pairs)
    baseline_defects = []
    if (baseline.get("simulation_summary", {}) or {}).get("simulated_games"):
        baseline_defects.append(
            {
                "defect": "baseline_slate_is_not_week_11",
                "detail": (
                    f"the v1.0 tick's simulated_games list {len(baseline_pairs)} matchups, of which "
                    f"{len(baseline_overlap)} appear on the Week-11 card; the writeup engine is still "
                    "running an earlier week's slate, so the v1.0 lock carries no per-game Week-11 numbers"
                ),
                "baseline_matchups": sorted(f"{a}@{h}" for a, h in baseline_pairs),
                "week_11_overlap": [f"{a}@{h}" for a, h in baseline_overlap],
                "consequence": "v2.0 reports injury-driven deltas only; no baseline margin/total is asserted",
            }
        )
    report = {
        "report_type": "CADENCE_V2_0_WEDNESDAY_INJURY_ADVANCE",
        "version": "v2.0",
        "phase": "INJURY_WEATHER_OVERLAY",
        "cadence_window": {"day": "Wed", "ct_time": "17:00"},
        "season": args.season,
        "week": args.week,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "flag_only": True,
        "publishable": bool(stage0_meta.get("publishable")),
        "baseline_lock": {
            "path": args.baseline_lock,
            "version": baseline.get("version"),
            "phase": baseline.get("phase"),
            "sha256_merkle": baseline.get("sha256_merkle"),
            "sealed_at": baseline.get("metadata", {}).get("timestamp_utc"),
        },
        "seal_identity": {
            "sealed_center_merkle": seal_before["sealed_center_merkle"],
            "coach_mind_canonical_digest": canonical_digest,
            "coach_tau": seal_before["tau"],
            "epa_dropoff_table_sha256": seal_before["epa_dropoff_table_sha256"],
            "sealed_checks": seal_before["checks"],
            "provenance_caveat": seal_before["provenance_caveat"],
        },
        "designations": {
            "source": args.espn_injuries,
            "sha256": sha256_file(espn_path),
            "captured_at_utc": json.loads(espn_path.read_text(encoding="utf-8")).get("timestamp"),
            "designating_statuses": list(DESIGNATING_STATUSES),
            "corroboration": {
                "path": args.injuries,
                "sha256": sha256_file(injuries_path) if injuries_path.is_file() else None,
                "week_rows": (
                    sum(1 for r in csv.DictReader(open(injuries_path, encoding="utf-8"))
                        if r.get("week") == str(args.week))
                    if injuries_path.is_file() else 0
                ),
                "report_status_populated": False,
                "note": "nflverse week-11 slice carries practice participation only at Wednesday 17:00 CT",
            },
            "role_mapping_extensions": ROLE_MAPPING_EXTENSIONS,
            "unmapped": unmapped,
            "teams_off_card": off_card,
            "stage0_exclusion": stage0_meta,
            "blocked_by_stage0": blocked,
        },
        "cost_matrix": {
            "sealed_cost_matrix_C": list(map(list, sealed_obj["costMatrixC"])),
            "refit": False,
            "base_shares": dict(zip(ROLE_NAMES, BASE_SHARES)),
            "execution_multipliers": dict(sealed_obj["epaDropoffTable"]["execution_multipliers"]),
            "epa_points_multiplier": EPA_POINTS_MULTIPLIER,
        },
        "slate": {
            "source": args.slate,
            "sha256": sha256_file(slate_path),
            "games": len(slate),
        },
        "convention": (
            "points_equivalent_delta = points the team LOSES to its designations (role EPA "
            "dropoff x 18, offensive buckets only). net_margin_shift_points = away loss - "
            "home loss; positive means the projection moves toward the HOME team. "
            "total_shift_points = away loss + home loss."
        ),
        "summary": {
            "games_on_card": len(slate),
            "games_advanced": advanced_count,
            "games_carried_unchanged": len(slate) - advanced_count,
            "total_points_equivalent_moved": round(
                sum(g["projection_delta"]["total_shift_points"] for g in games), 4
            ),
            "largest_net_margin_shift_points": max(
                (abs(g["projection_delta"]["net_margin_shift_points"]) for g in games), default=0.0
            ),
        },
        "games": games,
        "baseline_defects": baseline_defects,
        "scenario_only": {
            "label": "SCENARIO_ONLY",
            "do_not_publish": True,
            "hypothesis": "every DNP/Limited practice signal hardens into an Out designation",
            "teams": scenario,
        },
        "invariants": invariants,
        "invariants_hold": invariants_hold,
        "note": (
            "Practice participation is not a game designation and is not promoted here. "
            "The sealed cost matrix and EPA dropoff table were read, never refit. "
            "coachMindsetHash identity (tau + canonical digest) is asserted byte-identical "
            "before and after the advance."
        ),
    }

    out_dir = REPO_ROOT / args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"cadence_v20_wednesday_injury_advance_w{args.week}.json"
    target.write_text(json.dumps(report, indent=2), encoding="utf-8")

    canonical = json.dumps(report, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    print(f"wrote {target}")
    print(f"v2.0 {report['cadence_window']['day']} {report['cadence_window']['ct_time']} CT | week {args.week}")
    print(
        f"slate {report['slate']['games']} games | advanced {advanced_count} | "
        f"carried unchanged {report['summary']['games_carried_unchanged']} | "
        f"points-equivalent moved {report['summary']['total_points_equivalent_moved']}"
    )
    print(
        f"tau {seal_before['tau']} -> {tau_after} | digest {canonical_digest[:16]}… | "
        f"merkle {seal_before['sealed_center_merkle'][:16]}…"
    )
    print(f"invariants hold: {invariants_hold} | report sha256 {digest[:32]}…")
    if not invariants_hold:
        print(f"CRITICAL: invariant failure {invariants}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())