"""
PFR Learned Trench, Scheme, Contact & Positional Vulnerability Engine (Stream 15O).

Reads strictly GSE's derived 32-team composite z-score artifact:
    data/engine/gse_derived_trench_scheme_contact_priors_2026.json

Zero runtime dependency on Downloads or Google Drive; degrades gracefully to neutral
0.0 edges when priors are absent. Enforces exact swap symmetry across away/home
team pairs and strict antisymmetry on `stream_15o_net_trench_contact_diff`.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
PRIORS_PATH = (
    REPO_ROOT / "data" / "engine" / "gse_derived_trench_scheme_contact_priors_2026.json"
)

TEAM_ALIASES: Dict[str, str] = {
    "ARI": "ARI", "ARZ": "ARI",
    "ATL": "ATL",
    "BAL": "BAL", "BLT": "BAL",
    "BUF": "BUF",
    "CAR": "CAR",
    "CHI": "CHI",
    "CIN": "CIN",
    "CLE": "CLE", "CLV": "CLE",
    "DAL": "DAL",
    "DEN": "DEN",
    "DET": "DET",
    "GB": "GB", "GNB": "GB",
    "HOU": "HOU", "HST": "HOU",
    "IND": "IND",
    "JAX": "JAX", "JAC": "JAX",
    "KC": "KC", "KAN": "KC", "KCC": "KC",
    "LA": "LA", "LAR": "LA", "STL": "LA",
    "LAC": "LAC", "SD": "LAC", "SDC": "LAC",
    "LV": "LV", "LVR": "LV", "OAK": "LV",
    "MIA": "MIA",
    "MIN": "MIN",
    "NE": "NE", "NWE": "NE", "NEP": "NE",
    "NO": "NO", "NOR": "NO", "NOS": "NO",
    "NYG": "NYG",
    "NYJ": "NYJ",
    "PHI": "PHI",
    "PIT": "PIT",
    "SEA": "SEA",
    "SF": "SF", "SFO": "SF",
    "TB": "TB", "TAM": "TB", "TBB": "TB",
    "TEN": "TEN",
    "WAS": "WAS", "WSH": "WAS",
}

_PRIORS_CACHE: Dict[str, Any] = {}


def _clamp(val: float, low: float, high: float) -> float:
    f = float(val)
    if not math.isfinite(f):
        return 0.0
    return max(low, min(high, f))


def normalize_nfl_team(team: Any) -> str:
    raw = str(team or "").strip().upper()
    return TEAM_ALIASES.get(raw, raw)


def _neutral_team_profile() -> Dict[str, Any]:
    return {
        "off_pocket_protection_z": 0.0,
        "off_qb_accuracy_discipline_z": 0.0,
        "off_scheme_pa_rpo_rate_z": 0.0,
        "off_run_trench_contact_z": 0.0,
        "def_pressure_havoc_z": 0.0,
        "def_coverage_tackling_z": 0.0,
        "penalty_discipline_z": 0.0,
        "def_pos_vulnerability_z": {
            "vs_qb_z": 0.0,
            "vs_rb_z": 0.0,
            "vs_wr_z": 0.0,
            "vs_te_z": 0.0,
        },
        "standings_strength_z": {
            "srs_z": 0.0,
            "osrs_z": 0.0,
            "dsrs_z": 0.0,
            "sos_z": 0.0,
        },
    }


def load_learned_trench_scheme_contact_priors(
    path: Path = PRIORS_PATH,
) -> Dict[str, Any]:
    key = str(path.resolve()) if path.exists() else str(path)
    if key in _PRIORS_CACHE:
        return _PRIORS_CACHE[key]
    if not path.is_file():
        return {"available": False, "team_count": 0, "teams": {}}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        teams = payload.get("teams") or {}
        res = {
            "available": bool(teams),
            "schema": payload.get("schema", ""),
            "team_count": len(teams),
            "teams": teams,
        }
        _PRIORS_CACHE[key] = res
        return res
    except (OSError, ValueError, TypeError):
        return {"available": False, "team_count": 0, "teams": {}}


def _compute_side_edges(
    off_profile: Dict[str, Any],
    opp_def_profile: Dict[str, Any],
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, float]:
    ctx = context or {}
    is_indoor = bool(ctx.get("is_indoor", False))
    wind_mph = float(ctx.get("wind_mph", 0.0) or 0.0)
    wind_pass_damp = 1.0 if is_indoor else max(0.75, 1.0 - max(0.0, wind_mph - 12.0) * 0.015)

    trench_prot = _clamp(
        (
            float(off_profile.get("off_pocket_protection_z", 0.0))
            - float(opp_def_profile.get("def_pressure_havoc_z", 0.0))
        )
        * 0.0075,
        -0.030,
        0.030,
    )
    contact_yac = _clamp(
        (
            float(off_profile.get("off_run_trench_contact_z", 0.0))
            - float(opp_def_profile.get("def_coverage_tackling_z", 0.0))
        )
        * 0.0070,
        -0.030,
        0.030,
    )

    opp_dvp = opp_def_profile.get("def_pos_vulnerability_z") or {}
    pass_vuln = (
        0.40 * float(opp_dvp.get("vs_qb_z", 0.0))
        + 0.40 * float(opp_dvp.get("vs_wr_z", 0.0))
        + 0.20 * float(opp_dvp.get("vs_te_z", 0.0))
    )
    scheme_acc = _clamp(
        (
            0.55 * float(off_profile.get("off_qb_accuracy_discipline_z", 0.0))
            + 0.25 * float(off_profile.get("off_scheme_pa_rpo_rate_z", 0.0))
            + 0.20 * pass_vuln
        )
        * 0.0070
        * wind_pass_damp,
        -0.030,
        0.030,
    )
    pen_disc = _clamp(
        float(off_profile.get("penalty_discipline_z", 0.0)) * 0.0055,
        -0.020,
        0.020,
    )
    return {
        "trench_protection_edge": round(trench_prot, 6),
        "contact_yac_edge": round(contact_yac, 6),
        "scheme_accuracy_edge": round(scheme_acc, 6),
        "penalty_discipline_edge": round(pen_disc, 6),
    }


def evaluate_learned_trench_scheme_contact_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    away_u = normalize_nfl_team(away_team)
    home_u = normalize_nfl_team(home_team)
    priors = load_learned_trench_scheme_contact_priors()
    teams = priors.get("teams") or {}

    aw_prof = teams.get(away_u) or _neutral_team_profile()
    hm_prof = teams.get(home_u) or _neutral_team_profile()

    aw_edges = _compute_side_edges(aw_prof, hm_prof, context)
    hm_edges = _compute_side_edges(hm_prof, aw_prof, context)

    aw_sum = (
        aw_edges["trench_protection_edge"]
        + aw_edges["contact_yac_edge"]
        + aw_edges["scheme_accuracy_edge"]
        + aw_edges["penalty_discipline_edge"]
    )
    hm_sum = (
        hm_edges["trench_protection_edge"]
        + hm_edges["contact_yac_edge"]
        + hm_edges["scheme_accuracy_edge"]
        + hm_edges["penalty_discipline_edge"]
    )

    return {
        "schema": "stream_15o_pfr_learned_trench_scheme_contact_v1",
        "available": bool(priors.get("available")),
        "away_team": away_u,
        "home_team": home_u,
        "stream_15o_away_trench_protection_edge": aw_edges["trench_protection_edge"],
        "stream_15o_home_trench_protection_edge": hm_edges["trench_protection_edge"],
        "stream_15o_away_contact_yac_edge": aw_edges["contact_yac_edge"],
        "stream_15o_home_contact_yac_edge": hm_edges["contact_yac_edge"],
        "stream_15o_away_scheme_accuracy_edge": aw_edges["scheme_accuracy_edge"],
        "stream_15o_home_scheme_accuracy_edge": hm_edges["scheme_accuracy_edge"],
        "stream_15o_away_penalty_discipline_edge": aw_edges["penalty_discipline_edge"],
        "stream_15o_home_penalty_discipline_edge": hm_edges["penalty_discipline_edge"],
        "stream_15o_net_trench_contact_diff": round(aw_sum - hm_sum, 6),
        "away_pos_vulnerability": dict(aw_prof.get("def_pos_vulnerability_z") or {}),
        "home_pos_vulnerability": dict(hm_prof.get("def_pos_vulnerability_z") or {}),
    }
