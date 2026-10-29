#!/usr/bin/env python3
"""Cadence v2.5 — advance the injury overlay and reallocate Sinkhorn execution weights.

Sequence (Thursday 16:30 CT, T-90 TNF):
  1. Read report_status designations from data/nflverse/injuries_2026.csv for the
     target week and map them to the sealed role keys (same mapping the coach-mind
     simulator uses, so the writeup engine and this report cannot diverge).
  2. Reallocate pre-injury target shares with Sinkhorn-Knopp under the SEALED cost
     matrix C (no re-estimation, no reseal). Column sums become feasible shares.
  3. Apply the sealed execution multipliers to obtain effective share mass.
  4. Cross-check the feasible shares with the independent pure-Python Sinkhorn in
     gse_injury_overlay_v2.py and apply its retention table.
  5. Verify the seal hash is unchanged: candidates/sealed-center.json merkle,
     candidate parent_seal_hash lineage, coach-mind canonical digest, EPA table hash.

Read-only with respect to every sealed artifact. Writes one JSON report.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "ops"))

import gse_coach_mind_simulator as sim  # noqa: E402
import gse_injury_overlay_v2 as overlay  # noqa: E402

ROLE_NAMES = ["WR1", "WR2", "WR3", "TE1", "RB1"]
BASE_SHARES = [0.26, 0.21, 0.17, 0.20, 0.16]
#: Merkle recorded in artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md for week 2026-W44.
AUTHORITATIVE_MERKLE = "23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b"

POSITION_ROLES = {
    "T": "LT", "OT": "LT", "LT": "LT", "G": "LT", "C": "LT", "OL": "LT",
    "CB": "CB1", "DB": "CB1",
    "DE": "EDGE1", "EDGE": "EDGE1", "LB": "EDGE1", "OLB": "EDGE1",
}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def week_designations(csv_path: Path, week: int) -> dict:
    """Map report_status (Out/Doubtful/Questionable) to sealed role keys per team.

    Mirrors gse_coach_mind_simulator.load_week8_injuries_from_csv. Practice status
    alone is never promoted to a game designation.
    """
    if not csv_path.is_file():
        return {}
    team_roles: dict[str, list[str]] = {}
    pos_counts: dict[tuple[str, str], int] = {}
    with open(csv_path, encoding="utf-8") as handle:
        rows = [r for r in csv.DictReader(handle) if str(r.get("week", "")) == str(week)]
    for r in rows:
        team = str(r.get("team", "")).strip()
        if team == "LA":
            team = "LAR"
        full_name = str(r.get("full_name", "")).strip()
        if not team or not full_name:
            continue
        role = ""
        pos = str(r.get("position", "")).strip().upper()
        report = str(r.get("report_status", "")).strip()
        out_or_dnp = report in ("Out", "Doubtful")
        question = report == "Questionable"
        if not (out_or_dnp or question):
            continue
        index = pos_counts.get((team, pos), 0) + 1
        pos_counts[(team, pos)] = index
        if pos == "QB":
            role = "QB1" if (out_or_dnp and index == 1) else "QB_QUESTIONABLE"
        elif pos in POSITION_ROLES:
            role = POSITION_ROLES[pos] if index == 1 else ""
        elif pos == "WR":
            role = "WR1" if index == 1 else ("WR2" if index == 2 else "WR3")
        elif pos == "RB":
            role = "RB1" if index == 1 else ""
        elif pos == "TE":
            role = "TE1" if index == 1 else ""
        roles = team_roles.setdefault(team, [])
        if role and role not in roles:
            roles.append(role)
    return team_roles


def team_reallocation(sealed_state, team_roles):
    injuries = list(team_roles)
    feasible, mass_moved = sim.sinkhorn_reallocate_weights(
        sealed_state["costMatrixC"], BASE_SHARES, injuries
    )
    multipliers = sealed_state["epaDropoffTable"]["execution_multipliers"]
    effective = [
        float(feasible[i]) * (multipliers.get(role, 0.90) if role in injuries else 1.0)
        for i, role in enumerate(ROLE_NAMES)
    ]
    return {
        "injured_roles": injuries,
        "feasible_shares": {r: round(float(feasible[i]), 10) for i, r in enumerate(ROLE_NAMES)},
        "execution_multipliers": {
            r: (multipliers.get(r, 0.90) if r in injuries else 1.0) for r in ROLE_NAMES
        },
        "effective_shares": {r: round(v, 10) for r, v in zip(ROLE_NAMES, effective)},
        "total_mass_before": round(sum(float(x) for x in feasible), 10),
        "total_mass_after": round(sum(effective), 10),
        "mass_moved": round(float(mass_moved), 10),
        "epa_drop_sum": round(
            sum(float(sealed_state["epaDropoffTable"][f])
                for f in injuries if f in sealed_state["epaDropoffTable"]), 10
        ),
    }


def cross_check(sealed_state, team_roles):
    """Independent pure-Python Sinkhorn from gse_injury_overlay_v2, same marginals."""
    post = [0.01 if r in team_roles else s for r, s in zip(ROLE_NAMES, BASE_SHARES)]
    total = sum(post)
    post = [p / total for p in post]
    pre = [s / sum(BASE_SHARES) for s in BASE_SHARES]
    cost = sealed_state["costMatrixC"]
    plan, info = overlay.sinkhorn_with_info(pre, post, cost)
    feasible = {
        ROLE_NAMES[j]: sum(plan[i][j] for i in range(len(ROLE_NAMES)))
        for j in range(len(ROLE_NAMES))
    }
    effective = overlay.apply_epa_dropoff(feasible, {r: r for r in ROLE_NAMES})
    return {
        "feasible_shares": {k: round(v, 10) for k, v in feasible.items()},
        "retention_factors": {r: overlay.EPA_DROPOFF.get(r, 1.0) for r in ROLE_NAMES},
        "effective_shares": {k: round(v, 10) for k, v in effective.items()},
        "mass_loss": round(sum(feasible.values()) - sum(effective.values()), 10),
        "sinkhorn": {
            "iterations": int(info["iterations"]),
            "row_residual": info["row_residual"],
            "col_residual": info["col_residual"],
            "converged": bool(info["converged"]),
            "objective": round(float(info["objective"]), 12),
        },
    }


def verify_seal() -> dict:
    center_path = REPO_ROOT / "candidates" / "sealed-center.json"
    candidate_path = REPO_ROOT / "candidates" / "2026-10-25-week7-candidate.json"
    center = json.loads(center_path.read_text(encoding="utf-8"))
    candidate = json.loads(candidate_path.read_text(encoding="utf-8")) if candidate_path.is_file() else {}
    sealed_obj, digest = sim.load_sealed_object_readonly()
    epa_hash = overlay.validate_epa_table(overlay.EPA_DROPOFF)
    merkle = str(center.get("merkle", ""))
    lineage = candidate.get("parent_seal_hash")
    checks = {
        "sealed_center_merkle_matches_recorded": merkle == AUTHORITATIVE_MERKLE,
        "candidate_parent_seal_hash_matches_center": lineage == merkle,
        "candidate_tau_rating_recorded": float((candidate.get("params") or {}).get("tau", -1)) == 4.6607,
        "coach_mind_tau_is_0_42": sealed_obj["tau"] == 0.42,
        "epa_dropoff_table_unmodified": epa_hash == overlay.EPA_DROPOFF_SHA256,
        "qb_questionable_ev_dropoff_is_0_0947": (
            sealed_obj["epaDropoffTable"]["QB_QUESTIONABLE"] == sim.QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF
        ),
    }
    return {
        "sealed_center_path": str(center_path.relative_to(REPO_ROOT)).replace("\\", "/"),
        "sealed_center_merkle": merkle,
        "authoritative_merkle": AUTHORITATIVE_MERKLE,
        "sealed_at": center.get("sealed_at"),
        "tau": center.get("tau"),
        "candidate_parent_seal_hash": lineage,
        "coach_mind_canonical_digest": digest,
        "epa_dropoff_table_sha256": epa_hash,
        "checks": checks,
        "unchanged": all(checks.values()),
        "provenance_caveat": (
            "candidates/ is quarantined per artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md D1: the parent "
            "seal hash is documented as sequential hex. 'unchanged' asserts byte-identity with the active "
            "seal center, not that the seal is independently reproducible."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Cadence v2.5 injury overlay + Sinkhorn reallocation")
    parser.add_argument("--slot", default="TNF")
    parser.add_argument("--week", type=int, default=8)
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--away", required=True)
    parser.add_argument("--home", required=True)
    parser.add_argument("--injuries", default="data/nflverse/injuries_2026.csv")
    parser.add_argument("--prior-injuries", default="data/nflverse/injuries_2026.csv.bak-pre-v25-20261029")
    parser.add_argument("--output-dir", default="docs/predictions/research/2026-10-29")
    args = parser.parse_args()

    injuries_path = REPO_ROOT / args.injuries
    current = week_designations(injuries_path, args.week)
    ingested = sim.load_week8_injuries_from_csv(str(REPO_ROOT)) if args.week == 8 else None
    prior_path = REPO_ROOT / args.prior_injuries
    prior = week_designations(prior_path, args.week) if prior_path.is_file() else {}

    sealed_obj, digest = sim.load_sealed_object_readonly()
    seal = verify_seal()

    teams = {}
    for abbr in (args.away, args.home):
        teams[abbr] = {
            "current": team_reallocation(sealed_obj, current.get(abbr, [])),
            "prior": team_reallocation(sealed_obj, prior.get(abbr, [])),
            "cross_check": cross_check(sealed_obj, current.get(abbr, [])),
            "current_designations": list(current.get(abbr, [])),
            "prior_designations": list(prior.get(abbr, [])),
        }

    report = {
        "report_type": "CADENCE_V2_5_INJURY_OVERLAY",
        "slot": args.slot,
        "week": args.week,
        "season": args.season,
        "matchup": f"{args.away} @ {args.home}",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "injuries_file": {
            "path": args.injuries,
            "sha256": sha256_file(injuries_path),
            "rows": sum(1 for _ in open(injuries_path, encoding="utf-8")) - 1,
            "week_rows": sum(
                1 for r in csv.DictReader(open(injuries_path, encoding="utf-8"))
                if str(r.get("week")) == str(args.week)
            ),
            "prior_sha256": sha256_file(prior_path) if prior_path.is_file() else None,
        },
        "loader_parity": {
            "simulator_loader_week8": {k: list(v) for k, v in (ingested or {}).items()},
            "matches_simulator_loader": (
                None if ingested is None else
                {k: list(v) for k, v in sorted(current.items())} == {k: list(v) for k, v in sorted(ingested.items())}
            ),
        },
        "seal": seal,
        "teams": teams,
        "mass_moved_total": round(
            sum(teams[t]["current"]["mass_moved"] for t in teams), 10
        ),
        "base_shares": dict(zip(ROLE_NAMES, BASE_SHARES)),
        "sealed_cost_matrix": sealed_obj["costMatrixC"],
        "note": (
            "Report-status designations only (Out/Doubtful/Questionable). Practice status is not a game "
            "designation. Sinkhorn cost matrix and execution multipliers are the sealed v1.0 values; "
            "nothing was resealed."
        ),
    }

    out_dir = REPO_ROOT / args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"cadence_v25_injury_overlay_{args.slot.lower()}_w{args.week}.json"
    target.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"wrote {target}")
    print(f"seal unchanged: {seal['unchanged']} | merkle {seal['sealed_center_merkle'][:16]}… | tau {seal['tau']}")
    for abbr in (args.away, args.home):
        cur = teams[abbr]["current"]
        print(
            f"{abbr}: roles={cur['injured_roles']} mass_moved={cur['mass_moved']:.4f} "
            f"exec_mult_total={cur['total_mass_after']:.4f} (was {teams[abbr]['prior']['total_mass_after']:.4f})"
        )
    print(f"total mass moved: {report['mass_moved_total']:.4f}")


if __name__ == "__main__":
    main()