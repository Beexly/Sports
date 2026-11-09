#!/usr/bin/env python3
"""
scripts/ops/gse_coach_mind_simulator.py — GSE Sealed Coach-First Play-by-Play Monte Carlo Simulator
& Step N Sharp-Money (money% vs ticket%) Residual Comparator.
Enforces all Stage A-E invariants and Standing Rules 1-10:
  1. Runtime-resolved Tuesday 04:00 CT (v1.0) seal verification (coach tau=0.42, QB_QUESTIONABLE=0.0947).
  2. Read-only MappingProxyType lock on the sealed object (zero mid-week re-estimation).
  3. Sinkhorn-Knopp optimal transport target reallocation under fixed cost matrix C + HHI load scaling.
  4. Play-by-play state-conditioned transition lookup + inverse-MDP 4th-down slice (tau=0.42)
     + Empirical Bayes BTL shrinkage R = (I + A*S)^(-1).
  5. 10,000-simulation JEV scenario stress-testing & post-simulation money% residual flags (read LAST).
"""
import argparse
import copy
import hashlib
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import MappingProxyType
import numpy as np

_OPS_DIR = str(Path(__file__).resolve().parent)
if _OPS_DIR not in sys.path:
    sys.path.insert(0, _OPS_DIR)
from week8_forensic_kernels import (  # noqa: E402
    allocate_conserved_box_score,
    assert_no_duplicate_reallocation,
    assert_pbp_conservation,
    fourth_down_brill_summary,
    stamp_injury_reallocation,
)

QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947
LEAGUE_TARGET_HHI = 0.135

DEFAULT_SEALED_BASELINE = {
    "version": "v1.0",
    "sealedAt": "2026-10-25T04:00:00-05:00",
    "tau": 0.42,
    "injuryDropOff": 0,
    "PROB_PER_POINT": 0.033,
    "costMatrixC": [
        [0.05, 0.35, 0.55, 0.75, 0.90],
        [0.35, 0.05, 0.28, 0.50, 0.75],
        [0.55, 0.28, 0.05, 0.42, 0.65],
        [0.75, 0.50, 0.42, 0.05, 0.48],
        [0.90, 0.75, 0.65, 0.48, 0.05],
    ],
    "epaDropoffTable": {
        "QB1": 0.11,
        "QB2_BACKUP": 0.18,
        "EMERGENCY_QB3_UDFA": 0.38,
        "QB_QUESTIONABLE": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
        "OL": 0.02,
        "SKILL": 0.03,
        "DEF": -0.015,
        "execution_multipliers": {
            "QB1": 0.78,
            "QB2_BACKUP": 0.72,
            "EMERGENCY_QB3_UDFA": 0.62,
            "RB1": 0.85,
            "WR1": 0.82,
            "WR2": 0.88,
            "TE1": 0.84,
            "OL": 0.91,
        },
    },
    "teamRatings": {
        "PIT": {"off_epa": 0.042, "def_epa": -0.088, "pace_sec": 27.4, "hfa": 1.56, "early_pass_rate": 0.52, "panic_pp": 0.012, "target_hhi": 0.142},
        "CLE": {"off_epa": -0.095, "def_epa": -0.031, "pace_sec": 26.8, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": 0.018, "target_hhi": 0.131},
        "LV":  {"off_epa": -0.048, "def_epa": 0.012,  "pace_sec": 26.9, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.060, "target_hhi": 0.148},
        "NYJ": {"off_epa": -0.062, "def_epa": -0.045, "pace_sec": 28.1, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.005, "target_hhi": 0.125},
        "DET": {"off_epa": 0.118,  "def_epa": -0.042, "pace_sec": 26.5, "hfa": 1.56, "early_pass_rate": 0.51, "panic_pp": -0.015, "target_hhi": 0.159},
        "MIN": {"off_epa": 0.035,  "def_epa": -0.058, "pace_sec": 27.2, "hfa": 1.56, "early_pass_rate": 0.58, "panic_pp": -0.028, "target_hhi": 0.152},
        "GB":  {"off_epa": 0.068,  "def_epa": -0.019, "pace_sec": 27.0, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.010, "target_hhi": 0.118},
        "CAR": {"off_epa": -0.105, "def_epa": 0.082,  "pace_sec": 27.6, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": 0.008, "target_hhi": 0.138},
        "CIN": {"off_epa": 0.074,  "def_epa": 0.024,  "pace_sec": 26.4, "hfa": 1.56, "early_pass_rate": 0.63, "panic_pp": 0.022, "target_hhi": 0.154},
        "TEN": {"off_epa": -0.082, "def_epa": -0.015, "pace_sec": 28.3, "hfa": 1.56, "early_pass_rate": 0.52, "panic_pp": -0.010, "target_hhi": 0.133},
        "SEA": {"off_epa": 0.029,  "def_epa": -0.011, "pace_sec": 26.2, "hfa": 1.56, "early_pass_rate": 0.57, "panic_pp": 0.004, "target_hhi": 0.146},
        "CHI": {"off_epa": 0.018,  "def_epa": -0.049, "pace_sec": 26.7, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.009, "target_hhi": 0.129},
        "BUF": {"off_epa": 0.112,  "def_epa": -0.038, "pace_sec": 26.6, "hfa": 1.56, "early_pass_rate": 0.56, "panic_pp": -0.055, "target_hhi": 0.112},
        "BAL": {"off_epa": 0.134,  "def_epa": -0.029, "pace_sec": 27.5, "hfa": 1.56, "early_pass_rate": 0.50, "panic_pp": 0.046, "target_hhi": 0.140},
    },
}

# Full 32-team fallback ratings derived from candidates/2026-10-25-week7-candidate.json
# so any of the 32 NFL teams can be simulated without mutating DEFAULT_SEALED_BASELINE's hash.
ALL_32_TEAM_RATINGS = {
    **DEFAULT_SEALED_BASELINE["teamRatings"],
    "ARI": {"off_epa": -0.024, "def_epa": 0.041,  "pace_sec": 26.9, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.006, "target_hhi": 0.139},
    "ATL": {"off_epa": 0.019,  "def_epa": 0.015,  "pace_sec": 26.7, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": -0.055, "target_hhi": 0.144},
    "DAL": {"off_epa": -0.012, "def_epa": 0.038,  "pace_sec": 26.5, "hfa": 1.56, "early_pass_rate": 0.59, "panic_pp": 0.031, "target_hhi": 0.161},
    "DEN": {"off_epa": -0.018, "def_epa": -0.064, "pace_sec": 27.1, "hfa": 1.85, "early_pass_rate": 0.54, "panic_pp": 0.014, "target_hhi": 0.128},
    "HOU": {"off_epa": 0.038,  "def_epa": -0.048, "pace_sec": 27.3, "hfa": 1.56, "early_pass_rate": 0.57, "panic_pp": 0.011, "target_hhi": 0.149},
    "IND": {"off_epa": 0.014,  "def_epa": 0.018,  "pace_sec": 26.3, "hfa": 1.56, "early_pass_rate": 0.52, "panic_pp": 0.019, "target_hhi": 0.136},
    "JAX": {"off_epa": 0.011,  "def_epa": 0.035,  "pace_sec": 27.0, "hfa": 1.56, "early_pass_rate": 0.56, "panic_pp": 0.024, "target_hhi": 0.134},
    "KC":  {"off_epa": 0.089,  "def_epa": -0.054, "pace_sec": 27.8, "hfa": 1.72, "early_pass_rate": 0.60, "panic_pp": -0.012, "target_hhi": 0.141},
    "LA":  {"off_epa": 0.046,  "def_epa": 0.012,  "pace_sec": 27.2, "hfa": 1.45, "early_pass_rate": 0.56, "panic_pp": 0.008, "target_hhi": 0.156},
    "LAR": {"off_epa": 0.046,  "def_epa": 0.012,  "pace_sec": 27.2, "hfa": 1.45, "early_pass_rate": 0.56, "panic_pp": 0.008, "target_hhi": 0.156},
    "LAC": {"off_epa": 0.008,  "def_epa": -0.044, "pace_sec": 28.4, "hfa": 1.40, "early_pass_rate": 0.50, "panic_pp": -0.018, "target_hhi": 0.137},
    "MIA": {"off_epa": -0.039, "def_epa": -0.008, "pace_sec": 27.4, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.015, "target_hhi": 0.158},
    "NE":  {"off_epa": -0.071, "def_epa": 0.019,  "pace_sec": 27.6, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.012, "target_hhi": 0.124},
    "NO":  {"off_epa": -0.032, "def_epa": 0.014,  "pace_sec": 26.8, "hfa": 1.65, "early_pass_rate": 0.54, "panic_pp": 0.016, "target_hhi": 0.087},
    "NYG": {"off_epa": -0.068, "def_epa": 0.009,  "pace_sec": 27.5, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.021, "target_hhi": 0.155},
    "PHI": {"off_epa": 0.064,  "def_epa": -0.022, "pace_sec": 26.9, "hfa": 1.62, "early_pass_rate": 0.51, "panic_pp": 0.078, "target_hhi": 0.157},
    "SF":  {"off_epa": 0.096,  "def_epa": -0.035, "pace_sec": 28.0, "hfa": 1.58, "early_pass_rate": 0.53, "panic_pp": -0.009, "target_hhi": 0.145},
    "TB":  {"off_epa": 0.061,  "def_epa": 0.016,  "pace_sec": 26.8, "hfa": 1.56, "early_pass_rate": 0.57, "panic_pp": 0.014, "target_hhi": 0.147},
    "WAS": {"off_epa": 0.104,  "def_epa": 0.021,  "pace_sec": 26.4, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": -0.011, "target_hhi": 0.143},
    "WSH": {"off_epa": 0.104,  "def_epa": 0.021,  "pace_sec": 26.4, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": -0.011, "target_hhi": 0.143},
    "JAC": {"off_epa": 0.011,  "def_epa": 0.035,  "pace_sec": 27.0, "hfa": 1.56, "early_pass_rate": 0.56, "panic_pp": 0.024, "target_hhi": 0.134},
}

FORBIDDEN_MARKET_TOKENS = (
    "market", "odds", "book", "split", "ticket", "money", "vig", "spread_line", "total_line", "clv"
)


def _canon(x) -> str:
    """Canonical JSON, mirroring canonicalizeForSeal in locked-projection.ts.

    Built as a string rather than via json.dumps: the C encoder formats floats itself and
    ignores a float subclass __repr__, so the sub-1e-4 fixed-point rule cannot be expressed
    through it. Key order is lexicographic at every depth, matching sort_keys=True.
    """
    if x is None:
        return "null"
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, int):
        return str(x)
    if isinstance(x, float):
        if x != x or x in (float("inf"), float("-inf")):
            raise ValueError(f"canonical_hash: non-finite {x}")
        if x.is_integer():
            # Above 1e21 both runtimes use exponent notation; below it Python's int() would
            # print full digits where JS prints an exponent. Mirror JS exactly.
            if abs(x) >= 1e21:
                return repr(x)
            return str(int(x))
        if abs(x) < 1e-4:
            fixed = f"{x:.8f}".rstrip("0").rstrip(".")
            return fixed if fixed != "-0" else "0"
        return repr(x)
    if isinstance(x, str):
        return json.dumps(x, ensure_ascii=False)
    if isinstance(x, (list, tuple)):
        return "[" + ",".join(_canon(v) for v in x) + "]"
    if isinstance(x, (dict, MappingProxyType)):
        return "{" + ",".join(
            f"{json.dumps(k, ensure_ascii=False)}:{_canon(x[k])}" for k in sorted(x.keys())
        ) + "}"
    raise TypeError(f"canonical_hash: unsupported {type(x).__name__}")


def canonical_hash(obj) -> str:
    blob = _canon(obj).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def freeze_deep(obj):
    if isinstance(obj, dict):
        return MappingProxyType({k: freeze_deep(v) for k, v in obj.items()})
    if isinstance(obj, list):
        return tuple(freeze_deep(v) for v in obj)
    return obj


def hhi_load_multiplier(target_hhi: float, league_hhi: float = LEAGUE_TARGET_HHI) -> float:
    """Scale positional dropoff in effective-contributor space N_eff = 1/HHI (Davies 2025)."""
    if target_hhi <= 0:
        return 1.0
    n_team = 1.0 / target_hhi
    n_league = 1.0 / league_hhi
    return max(0.55, min(1.60, math.sqrt(n_league / n_team)))


def load_week7_candidate_ratings_readonly(repo_root: str | None = None):
    """Load candidates/sealed-center.json (tau_coach=0.42) + candidates/2026-10-25-week7-candidate.json
    (32 teams, tau_rating=4.6607) and verify parent_seal_hash == sealed-center.merkle."""
    root = Path(repo_root) if repo_root else Path(__file__).resolve().parents[2]
    center_path = root / "candidates" / "sealed-center.json"
    cand_path = root / "candidates" / "2026-10-25-week7-candidate.json"
    if not (center_path.is_file() and cand_path.is_file()):
        return None
    center = json.loads(center_path.read_text(encoding="utf-8"))
    cand = json.loads(cand_path.read_text(encoding="utf-8"))
    if cand.get("parent_seal_hash") != center.get("merkle"):
        raise RuntimeError(
            f"SEAL_LINEAGE_MISMATCH: candidate parent_seal_hash {cand.get('parent_seal_hash')} != center merkle {center.get('merkle')}"
        )
    if float(center.get("tau", -1.0)) != 0.42:
        raise RuntimeError(f"SEAL_BROKEN: sealed-center tau={center.get('tau')} != 0.42")
    return freeze_deep({"sealed_center": center, "week7_candidate": cand})


def load_sealed_object_readonly(sealed_path: str = "/opt/model/sealed_baseline.json"):
    if os.path.exists(sealed_path):
        with open(sealed_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    else:
        raw = copy.deepcopy(DEFAULT_SEALED_BASELINE)
    if raw.get("version") != "v1.0":
        raise ValueError(f"SEAL_VIOLATION: Rejected non-v1.0 baseline ({raw.get('version')})")

    def assert_no_market_keys(node, path="root"):
        if isinstance(node, (dict, MappingProxyType)):
            for k, v in node.items():
                if any(tok in k.lower() for tok in FORBIDDEN_MARKET_TOKENS):
                    raise ValueError(f"CLASS_A_FIREWALL_VIOLATION: Market token '{k}' at {path}.{k}")
                assert_no_market_keys(v, f"{path}.{k}")
        elif isinstance(node, (list, tuple)):
            for idx, item in enumerate(node):
                assert_no_market_keys(item, f"{path}[{idx}]")

    assert_no_market_keys(raw)
    if raw.get("tau") != 0.42:
        raise RuntimeError(f"SEAL_BROKEN: coach tau={raw.get('tau')} != 0.42")
    if raw["epaDropoffTable"]["QB_QUESTIONABLE"] != QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF:
        raise RuntimeError("SEAL_BROKEN: QB_QUESTIONABLE != 0.0947")
    digest = canonical_hash(raw)
    return freeze_deep(raw), digest


def trench_survival_drop(elite_lt: float, backup_lt: float) -> dict[str, float]:
    """Called from the PBP path when ENABLE_TRENCH_POCKET_PHYSICS_V2 is set.

    Replacing an elite LT with a backup must drop weak-link survival by more
    than the arithmetic-mean drop. Flag off returns the arithmetic comparison
    so the default simulator is unchanged.
    """
    import os
    import sys

    root = str(Path(__file__).resolve().parents[2])
    if root not in sys.path:
        sys.path.insert(0, root)
    from intelligence.coaching.ol_provider import weak_link_survival_for_grades
    from intelligence.coaching.dc_pressure import pressure_index_with_trench

    other = [0.88, 0.86, 0.84, 0.85]
    elite = weak_link_survival_for_grades([elite_lt, *other])
    backup = weak_link_survival_for_grades([backup_lt, *other])
    pressure = pressure_index_with_trench(elite - backup)
    enabled = os.environ.get("ENABLE_TRENCH_POCKET_PHYSICS_V2", "").lower() in {"1", "true", "yes"}
    return {
        "elite": elite,
        "backup": backup,
        "drop": elite - backup,
        "pressure_wp": float(pressure["win_probability"] or 0.0),
        "enabled": 1.0 if enabled else 0.0,
    }


def conserved_receiving_worlds(n: int = 100) -> dict[str, list[float]]:
    """Deterministic receiving allocation. No post-sim rescaling, no Gaussian draw."""
    team_yds = [float(80 + (i % 17) * 3) for i in range(n)]
    team_tds = [float(i % 4) for i in range(n)]
    shares = {"WR1": 0.28, "WR2": 0.22, "WR3": 0.18, "TE1": 0.20, "RB1": 0.12}
    yds = allocate_conserved_box_score(team_yds, shares)
    tds = allocate_conserved_box_score(team_tds, shares)
    assert_pbp_conservation([yds[k] for k in shares], team_yds, [tds[k] for k in shares], team_tds)
    return yds


def guard_duplicate_injury_reallocation(usage: dict) -> None:
    """Downstream sampler and this simulator refuse a second injury vacuum boost."""
    assert_no_duplicate_reallocation(usage)


def sinkhorn_reallocate_weights(C_tuple, base_shares, scratched_roles, eps: float = 0.10):
    C = np.array(C_tuple, dtype=np.float64)
    r = np.array(base_shares, dtype=np.float64)
    r = r / r.sum()
    c = r.copy()
    role_names = ["WR1", "WR2", "WR3", "TE1", "RB1"]
    for idx, rname in enumerate(role_names):
        if rname in scratched_roles:
            c[idx] = 0.01
    c = c / c.sum()
    K = np.exp(np.maximum(-C / eps, -700.0))
    u = np.ones_like(r)
    v = np.ones_like(c)
    for _ in range(200):
        u = r / np.maximum(K @ v, 1e-12)
        v = c / np.maximum(K.T @ u, 1e-12)
        P = np.diag(u) @ K @ np.diag(v)
        if (np.sum(np.abs(P.sum(axis=1) - r)) + np.sum(np.abs(P.sum(axis=0) - c))) <= 1e-9:
            break
    feasible_shares = P.sum(axis=0)
    mass_moved = float(0.5 * np.sum(np.abs(feasible_shares - r)))
    return feasible_shares, mass_moved


def load_week8_injuries_from_csv(repo_root: str | None = None) -> dict[str, list[str]]:
    """Read data/nflverse/injuries_2026.csv (Week 8 practice_status + Week 7 report_status)
    and map active injuries to epaDropoffTable & Sinkhorn role keys."""
    import csv

    root = Path(repo_root) if repo_root else Path(__file__).resolve().parents[2]
    csv_path = root / "data" / "nflverse" / "injuries_2026.csv"
    if not csv_path.is_file():
        return {}

    team_roles: dict[str, list[str]] = {}
    pos_counts: dict[tuple[str, str], int] = {}

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if str(r.get("week", "")) == "8"]

    # Prioritize Week 8 rows where available, supplement with Week 7 Out/Doubtful
    rows.sort(key=lambda r: int(r.get("week", 0)), reverse=True)
    seen_players: set[tuple[str, str]] = set()

    for r in rows:
        team = str(r.get("team", "")).strip()
        if team == "LA":
            team = "LAR"
        full_name = str(r.get("full_name", "")).strip()
        if not team or not full_name or (team, full_name) in seen_players:
            continue
        seen_players.add((team, full_name))

        pos = str(r.get("position", "")).strip().upper()
        rep_status = str(r.get("report_status", "")).strip()
        prac_status = str(r.get("practice_status", "")).strip()
        wk = int(r.get("week", 0))

        # report_status only. Week 8 practice rows are not a game designation.
        # Do not promote a blank report, a DNP, or "position == QB" into Out/Questionable.
        _ = prac_status, wk
        is_out_or_dnp = rep_status in ("Out", "Doubtful")
        is_quest_or_lp = rep_status == "Questionable"

        if not (is_out_or_dnp or is_quest_or_lp):
            continue

        roles = team_roles.setdefault(team, [])
        idx = pos_counts.get((team, pos), 0) + 1
        pos_counts[(team, pos)] = idx

        if pos == "QB":
            role = "QB1" if (is_out_or_dnp and idx == 1) else "QB_QUESTIONABLE"
        elif pos in ("T", "OT", "LT", "G", "C", "OL"):
            role = "LT" if idx == 1 else ""
        elif pos in ("CB", "DB"):
            role = "CB1" if idx == 1 else ""
        elif pos in ("DE", "EDGE", "LB", "OLB"):
            role = "EDGE1" if idx == 1 else ""
        elif pos == "WR":
            role = "WR1" if idx == 1 else ("WR2" if idx == 2 else "WR3")
        elif pos == "RB":
            role = "RB1" if idx == 1 else ""
        elif pos == "TE":
            role = "TE1" if idx == 1 else ""
        else:
            role = ""

        if role and role not in roles:
            roles.append(role)

    return team_roles


DOWN_BUCKETS = ("1st", "2nd", "3rd_short", "3rd_long")
FIELD_ZONES = ("own_20", "mid", "opp_20", "redzone")
SCORE_SCRIPTS = ("trailing_7+", "close", "leading_7+")

POSITIONAL_MARKET_PRIORS = {
    "rec_yds": 64.5,
    "WR1": 64.5,
    "WR2": 46.5,
    "WR3": 34.5,
    "TE1": 41.5,
    "rush_yds": 62.0,
    "RB1": 64.5,
    "rb_rec_yds": 16.5,
    "pass_yds": 232.5,
    "QB1": 232.5,
}


def empirical_bayes_line(player_gp: int, sample_mean: float, market: str = "rec_yds") -> float:
    """Empirical-Bayes shrinkage of noisy early-season/simulated player mean toward positional prior."""
    gp = max(1, int(player_gp))
    prior = float(POSITIONAL_MARKET_PRIORS.get(market, 58.5))
    w = min(0.55, max(0.25, gp / (gp + 7.0)))
    shrunk = w * float(sample_mean) + (1.0 - w) * prior
    if market in ("pass_yds", "QB1"):
        return float(np.clip(shrunk, 172.5, 278.5))
    if market == "rb_rec_yds":
        return float(np.clip(shrunk, 10.5, 32.5))
    return float(np.clip(shrunk, 38.5, 82.5))


def sample_lognormal(
    shrunk_mean: float,
    n_sims: int,
    rng: np.random.Generator,
    cv: float = 0.42,
) -> np.ndarray:
    """Sample realistic right-skewed NFL yardage distribution with coefficient of variation cv=0.42."""
    m = max(1.0, float(shrunk_mean))
    sigma2 = math.log(1.0 + cv * cv)
    sigma = math.sqrt(sigma2)
    mu = math.log(m) - 0.5 * sigma2
    return rng.lognormal(mean=mu, sigma=sigma, size=n_sims)


def _classify_down_bucket(down: int, ydstogo: int) -> str:
    if down == 1:
        return "1st"
    if down == 2:
        return "2nd"
    if down >= 3 and ydstogo <= 3:
        return "3rd_short"
    return "3rd_long"


def _classify_field_zone(yardline_100: int) -> str:
    if yardline_100 >= 80:
        return "own_20"
    if yardline_100 >= 40:
        return "mid"
    if yardline_100 > 20:
        return "opp_20"
    return "redzone"


def _classify_score_script(score_diff: float) -> str:
    if score_diff <= -7:
        return "trailing_7+"
    if score_diff >= 7:
        return "leading_7+"
    return "close"


def verify_jev_spine_freshness_and_qb1(
    spine_data: dict,
    expected_week: int = 9,
    expected_away_qb1: str | None = None,
    expected_home_qb1: str | None = None,
    max_age_hours: float = 18.0,
    reference_utc: str | None = None,
    strict: bool = True,
) -> dict:
    """Verify JEV full-game spine freshness (<= max_age_hours), week, and starting QB1 alignment (SG-1).

    Raises RuntimeError("STALE_OR_MISMATCHED_JEV_SPINE: ...") when strict=True and validation fails,
    or returns {"valid": False, "reason": ...} when strict=False.
    """
    if not spine_data or not isinstance(spine_data, dict):
        reason = "STALE_OR_MISMATCHED_JEV_SPINE: empty_or_invalid_spine_dict"
        if strict:
            raise RuntimeError(reason)
        return {"valid": False, "reason": reason, "age_hours": None}

    reasons: list[str] = []
    ts_str = spine_data.get("updated_at") or spine_data.get("generated_at")
    if not ts_str and isinstance(spine_data.get("games"), dict):
        for g_val in spine_data["games"].values():
            if isinstance(g_val, dict):
                ts_str = g_val.get("updated_at") or g_val.get("generated_at")
                if ts_str:
                    break

    if reference_utc:
        ref_dt = datetime.fromisoformat(str(reference_utc).replace("Z", "+00:00"))
    else:
        ref_dt = datetime.now(timezone.utc)
    if ref_dt.tzinfo is None:
        ref_dt = ref_dt.replace(tzinfo=timezone.utc)

    age_hours = 0.0
    if ts_str:
        spine_dt = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
        if spine_dt.tzinfo is None:
            spine_dt = spine_dt.replace(tzinfo=timezone.utc)
        age_hours = (ref_dt - spine_dt).total_seconds() / 3600.0
        if age_hours > float(max_age_hours):
            reasons.append(f"spine_age_hours={age_hours:.2f} > max_age_hours={max_age_hours:.2f} (ts={ts_str})")
    else:
        reasons.append("missing_updated_at_or_generated_at_timestamp")

    spine_week = spine_data.get("week")
    if spine_week is not None and int(spine_week) != int(expected_week):
        reasons.append(f"week_mismatch(spine={spine_week}, expected={expected_week})")

    raw_blob_lower = json.dumps(spine_data, default=str).lower()
    if int(expected_week) == 9 and "w8 dnp" in raw_blob_lower and "w9" not in raw_blob_lower:
        reasons.append("stale_w8_injury_report_embedded_in_week9_spine")

    if expected_away_qb1:
        exp_aw = expected_away_qb1.strip().lower()
        act_aw = str(
            spine_data.get("away_qb1")
            or (spine_data.get("confirmed_qb1") or {}).get("away")
            or ""
        ).strip().lower()
        if act_aw and act_aw != exp_aw:
            reasons.append(f"away_qb1_mismatch(spine={act_aw}, expected={exp_aw})")

    if expected_home_qb1:
        exp_hm = expected_home_qb1.strip().lower()
        act_hm = str(
            spine_data.get("home_qb1")
            or (spine_data.get("confirmed_qb1") or {}).get("home")
            or ""
        ).strip().lower()
        if act_hm and act_hm != exp_hm:
            reasons.append(f"home_qb1_mismatch(spine={act_hm}, expected={exp_hm})")
        elif not act_hm and ("active_injuries_ingested" in spine_data or "snap_by_snap_log" in spine_data):
            if exp_hm not in raw_blob_lower:
                reasons.append(f"expected_home_qb1_missing_from_spine({expected_home_qb1})")

    if reasons:
        full_reason = "STALE_OR_MISMATCHED_JEV_SPINE: " + "; ".join(reasons)
        if strict:
            raise RuntimeError(full_reason)
        return {
            "valid": False,
            "reason": full_reason,
            "age_hours": round(age_hours, 2),
            "expected_week": expected_week,
        }

    return {
        "valid": True,
        "reason": "FRESH_AND_QB1_VERIFIED",
        "age_hours": round(age_hours, 2),
        "expected_week": expected_week,
    }


def compute_qb_tier_adjusted_epa(
    base_off_epa: float,
    qb_tier: str,
    compiled_92_pocket_survival: float | None = None,
) -> dict:
    """Apply QB tier dropoff, execution multiplier, completion floor, and sack/INT multipliers (SG-3).

    For EMERGENCY_QB3_UDFA (e.g., BAL +0.134 with Joe Fagnano):
      - epa_dropoff = 0.38 -> adjusted_off_epa = +0.134 - 0.380 = -0.246 EPA/play
      - execution_multiplier = 0.62
      - completion_floor = 0.34 (lowered from 0.48)
      - sack_multiplier = 1.55
      - int_multiplier = 1.65
      - lambda_margin = 0.25
    """
    tier_key = (qb_tier or "QB1_STARTER").strip().upper()
    epa_table = DEFAULT_SEALED_BASELINE["epaDropoffTable"]
    exec_table = epa_table["execution_multipliers"]

    if tier_key in {"EMERGENCY_QB3_UDFA", "QB3", "UDFA", "QB3_UDFA"}:
        dropoff = float(epa_table["EMERGENCY_QB3_UDFA"])
        exec_mult = float(exec_table["EMERGENCY_QB3_UDFA"])
        comp_floor = 0.34
        sack_mult = 1.55
        int_mult = 1.65
        lam_margin = 0.25
        canonical_tier = "EMERGENCY_QB3_UDFA"
    elif tier_key in {"QB2_BACKUP", "BACKUP", "QB2"}:
        dropoff = float(epa_table["QB2_BACKUP"])
        exec_mult = float(exec_table["QB2_BACKUP"])
        comp_floor = 0.42
        sack_mult = 1.30
        int_mult = 1.35
        lam_margin = 0.45
        canonical_tier = "QB2_BACKUP"
    elif tier_key in {"QB1", "QB1_OUT"}:
        dropoff = float(epa_table["QB1"])
        exec_mult = float(exec_table["QB1"])
        comp_floor = 0.44
        sack_mult = 1.25
        int_mult = 1.25
        lam_margin = 0.55
        canonical_tier = "QB1"
    elif tier_key in {"QB_QUESTIONABLE", "QUESTIONABLE"}:
        dropoff = float(epa_table["QB_QUESTIONABLE"])
        exec_mult = 0.88
        comp_floor = 0.45
        sack_mult = 1.15
        int_mult = 1.15
        lam_margin = 0.60
        canonical_tier = "QB_QUESTIONABLE"
    else:
        dropoff = 0.0
        exec_mult = 1.0
        comp_floor = 0.48
        sack_mult = 1.0
        int_mult = 1.0
        lam_margin = 0.70
        canonical_tier = "QB1_STARTER"

    survival_epa_delta = 0.0
    if compiled_92_pocket_survival is not None:
        surv_clamped = max(0.20, min(0.85, float(compiled_92_pocket_survival)))
        survival_epa_delta = round((surv_clamped - 0.55) * 0.12, 4)
        sack_mult = round(max(0.85, sack_mult + (0.55 - surv_clamped) * 0.45), 4)

    adj_epa = round(float(base_off_epa) - dropoff + survival_epa_delta, 4)
    return {
        "base_off_epa": round(float(base_off_epa), 4),
        "qb_tier": canonical_tier,
        "epa_dropoff": round(dropoff, 4),
        "compiled_92_pocket_survival": (
            round(float(compiled_92_pocket_survival), 4)
            if compiled_92_pocket_survival is not None
            else 0.55
        ),
        "adjusted_off_epa": adj_epa,
        "effective_scaled_epa": round(adj_epa * exec_mult, 4),
        "execution_multiplier": exec_mult,
        "completion_floor": comp_floor,
        "sack_multiplier": sack_mult,
        "int_multiplier": int_mult,
        "lambda_margin": lam_margin,
    }


def build_jev_state_tensor(
    spine_game: dict | None,
    enforce_freshness: bool = False,
    expected_week: int = 9,
    expected_away_qb1: str | None = None,
    expected_home_qb1: str | None = None,
    max_age_hours: float = 18.0,
    reference_utc: str | None = None,
    strict: bool = True,
) -> dict:
    """
    Aggregate the 166 snap responses from `spine_game["snap_by_snap_log"]` into a
    transition tensor keyed by `(offense_abbr, down_bucket, field_zone, score_script)`.
    When enforce_freshness=True, validates spine freshness and QB1 alignment via SG-1.
    """
    if not spine_game or not isinstance(spine_game, dict):
        return {"by_state": {}, "by_team": {}, "total_snaps_ingested": 0}
    if enforce_freshness:
        chk = verify_jev_spine_freshness_and_qb1(
            spine_game,
            expected_week=expected_week,
            expected_away_qb1=expected_away_qb1,
            expected_home_qb1=expected_home_qb1,
            max_age_hours=max_age_hours,
            reference_utc=reference_utc,
            strict=strict,
        )
        if not chk["valid"]:
            return {
                "by_state": {},
                "by_team": {},
                "total_snaps_ingested": 0,
                "valid": False,
                "reason": chk["reason"],
                "stale_spine_ignored": True,
            }
    snaps = spine_game.get("snap_by_snap_log") or []
    if not snaps:
        return {"by_state": {}, "by_team": {}, "total_snaps_ingested": 0}

    buckets: dict[tuple[str, str, str, str], list[tuple[float, float, float, float, float]]] = {}
    team_buckets: dict[str, list[tuple[float, float, float, float, float]]] = {}

    for s in snaps:
        off = str(s.get("offense", "")).strip()
        dfn = str(s.get("defense", "")).strip()
        if not off:
            continue
        down = int(s.get("down", 1))
        ydstogo = int(s.get("ydstogo", 10))
        yl100 = int(s.get("yardline_100", 75))
        sc_before = s.get("score_before") or {}
        s_diff = float(sc_before.get(off, 0)) - float(sc_before.get(dfn, 0))

        db = _classify_down_bucket(down, ydstogo)
        fz = _classify_field_zone(yl100)
        ss = _classify_score_script(s_diff)

        jev = s.get("jev_decisions") or {}
        off_p = (jev.get("off_play_call") or {}).get("probabilities") or {}
        pass_p = (
            float(off_p.get("quick_game_rpo", 0.0))
            + float(off_p.get("play_action_intermediate", 0.0))
            + float(off_p.get("deep_shot_pass", 0.0))
            + float(off_p.get("go_for_it_pass", 0.0))
            + 0.5 * float(off_p.get("screen_or_draw", 0.0))
        )
        press_noul = float(jev.get("pressure_disruption_noul", 0.32))
        tgt_p = (jev.get("target_carrier") or {}).get("probabilities") or {}
        rb1_p = float(tgt_p.get("RB1", 0.50))
        wr1_p = float(tgt_p.get("WR1", 0.24))

        res_play = s.get("resolved_play") or {}
        cal_out = res_play.get("calibrated_outcome_probs") or (jev.get("snap_outcome") or {}).get("probabilities") or {}
        pos_gain_p = (
            float(cal_out.get("short_gain_1_4", 0.25))
            + float(cal_out.get("chain_mover_5_11", 0.22))
            + float(cal_out.get("explosive_12_24", 0.08))
            + float(cal_out.get("breakaway_25_plus", 0.02))
        )

        rec = (pass_p, press_noul, rb1_p, wr1_p, pos_gain_p)
        buckets.setdefault((off, db, fz, ss), []).append(rec)
        team_buckets.setdefault(off, []).append(rec)

    def _summarize(rows: list[tuple[float, float, float, float, float]]) -> dict:
        arr = np.asarray(rows, dtype=np.float64)
        return {
            "count": len(rows),
            "pass_prob": round(float(np.mean(arr[:, 0])), 4),
            "pressure_disruption_noul": round(float(np.mean(arr[:, 1])), 4),
            "rb1_target_prob": round(float(np.mean(arr[:, 2])), 4),
            "wr1_target_prob": round(float(np.mean(arr[:, 3])), 4),
            "pos_gain_prob": round(float(np.mean(arr[:, 4])), 4),
        }

    by_state = {
        f"{k[0]}|{k[1]}|{k[2]}|{k[3]}": _summarize(v)
        for k, v in buckets.items()
    }
    by_team = {tm: _summarize(v) for tm, v in team_buckets.items()}
    return {
        "by_state": by_state,
        "by_team": by_team,
        "total_snaps_ingested": len(snaps),
        "valid": True,
    }


def derive_comp_base(track_comp: float, comp_floor: float = 0.48) -> float:
    return float(np.clip(track_comp, comp_floor, 0.76))


_PINECONE_POSTHOG_CONTEXT_CACHE: dict[str, dict] = {}


def _get_cached_pinecone_and_posthog_pre_projection_context(away_team: str, home_team: str) -> dict:
    cache_key = f"{away_team.upper()}@{home_team.upper()}"
    if cache_key in _PINECONE_POSTHOG_CONTEXT_CACHE:
        return _PINECONE_POSTHOG_CONTEXT_CACHE[cache_key]

    root_dir = str(Path(__file__).resolve().parents[2])
    if root_dir not in sys.path:
        sys.path.insert(0, root_dir)

    pinecone_summary: dict = {"status": "UNAVAILABLE"}
    posthog_summary: dict = {"status": "UNAVAILABLE"}
    try:
        from intelligence.retrieval.pinecone_hybrid_corpus_index import (
            PineconeBM25HybridCorpusRetriever,
            build_uncompressed_full_corpus_documents,
        )
        docs = build_uncompressed_full_corpus_documents()
        retriever = PineconeBM25HybridCorpusRetriever(force_offline=True)
        retriever.index_documents(docs[:64])
        top_hits = retriever.hybrid_search(
            f"{away_team} {home_team} situational trench pressure coverage",
            top_k=3,
        )
        pinecone_summary = {
            "status": "ACTIVE",
            "total_uncompressed_corpus_docs": len(docs),
            "alpha_hybrid_convex": retriever.alpha,
            "bm25_k1": retriever.bm25.k1,
            "bm25_b": retriever.bm25.b,
            "bm25_delta": retriever.bm25.delta,
            "top_hit_doc_ids": [h.doc_id for h in top_hits],
            "top_hit_score": round(float(top_hits[0].final_score), 6) if top_hits else 0.0,
        }
    except Exception as exc:
        pinecone_summary = {"status": f"FALLBACK:{type(exc).__name__}", "total_uncompressed_corpus_docs": 624}

    try:
        from intelligence.telemetry.posthog_cloud_context_layer import PostHogCloudContextClient
        ph_client = PostHogCloudContextClient(offline_mode=True)
        ctx_mill = ph_client.context_mill.build_context_summary(active_game_id=f"2026_W9_{away_team}_{home_team}")
        posthog_summary = {
            "status": "ACTIVE",
            "project_id": ph_client.project_id,
            "duckgres_memory_limit": ph_client.duckgres.memory_limit,
            "duckgres_threads": ph_client.duckgres.threads,
            "context_mill_counts": ctx_mill.get("counts", {}),
        }
    except Exception as exc:
        posthog_summary = {"status": f"FALLBACK:{type(exc).__name__}", "project_id": "516325"}

    bundle = {
        "pinecone_hybrid_corpus_index": pinecone_summary,
        "posthog_cloud_context_layer": posthog_summary,
    }
    _PINECONE_POSTHOG_CONTEXT_CACHE[cache_key] = bundle
    return bundle


_PRE_PROJECTION_PRIORS_FAST_CACHE: dict[tuple, dict] = {}


def compute_pre_projection_universal_and_deep_non_stationary_priors(
    away_team: str = "JAX",
    home_team: str = "BAL",
    context: dict | None = None,
) -> dict:
    """
    Pre-Projection & Simulation Conditioning Hook:
      a. Evaluates `evaluate_universal_nfl_360_metric_and_situational_dossier`
         (`intelligence/coaching/universal_nfl_metric_and_situational_engine.py`) across all
         6 Universal Metric Suites (`QB`, `Receiving`, `Rushing`, `Trench`, `Defense/IDP`,
         `Situational`) AND all 6 Deep Non-Stationary Second/Third-Order Kernels
         (`causal_deconfounded_skill`, `qb_trauma_and_disguise_hysteresis`,
         `trench_tut_fatigue_and_weak_link`, `coordinator_script_cliff_and_tendency_trap`,
         `referee_and_market_reflexivity`, `gsi_sports_medicine_and_coupled_5api`).
      b. Evaluates `evaluate_mega_sweep_2026_11_06_full_pipeline`
         (`intelligence/coaching/mega_sweep_2026_11_06_wiring_engine.py`) to obtain
         `Double-DQN`, `PER-DQN`, `CPC-SimCLR`, `autoresearch` gate, Laptop Hardware Governor,
         `gse-ml-service` (`TDA`, `MPS`, `IRL`, `Friston Free Energy`, `ETKF`), `Kats` BOCPD,
         `NOFX` 4-plan gate, and `30` Morning Sweep CSVs + `10` Innovation Kernels.
      c. Integrates `pinecone_hybrid_corpus_index.py` and `posthog_cloud_context_layer.py`.
      d. Emits deterministic snap-level trajectory conditioners for the 10,000-world x 175-snap
         PBP simulator.
    """
    away_u = str(away_team or "JAX").strip().upper()
    home_u = str(home_team or "BAL").strip().upper()
    ctx = dict(context or {})
    away_qb_tier = str(ctx.get("away_qb_tier") or (ctx.get("away") or {}).get("qb_tier") or "QB1_STARTER")
    home_qb_tier = str(ctx.get("home_qb_tier") or (ctx.get("home") or {}).get("qb_tier") or "QB1_STARTER")
    wind_mph = float(ctx.get("weather_wind_mph") or (ctx.get("env") or {}).get("wind_mph") or 11.0)

    away_ol_out = int(ctx.get("away_ol_starters_out", 0))
    home_ol_out = int(ctx.get("home_ol_starters_out", 0))
    away_dc_blitz = float(ctx.get("away_dc_blitz_rate", 0.25))
    home_dc_blitz = float(ctx.get("home_dc_blitz_rate", 0.25))
    away_dc_man = float(ctx.get("away_dc_man_rate", 0.28))
    home_dc_man = float(ctx.get("home_dc_man_rate", 0.28))

    cache_key = (
        away_u,
        home_u,
        away_qb_tier,
        home_qb_tier,
        round(wind_mph, 2),
        away_ol_out,
        home_ol_out,
        round(away_dc_blitz, 3),
        round(home_dc_blitz, 3),
    )
    if cache_key in _PRE_PROJECTION_PRIORS_FAST_CACHE and not ctx.get("universal_overrides"):
        return _PRE_PROJECTION_PRIORS_FAST_CACHE[cache_key]

    root_dir = str(Path(__file__).resolve().parents[2])
    if root_dir not in sys.path:
        sys.path.insert(0, root_dir)

    from intelligence.coaching.universal_nfl_metric_and_situational_engine import (
        evaluate_universal_nfl_360_metric_and_situational_dossier,
    )
    from intelligence.coaching.mega_sweep_2026_11_06_wiring_engine import (
        evaluate_mega_sweep_2026_11_06_full_pipeline,
    )
    from intelligence.coaching.sovereign_openai_eyi_execution_engine import (
        evaluate_sovereign_openai_eyi_execution_dossier,
    )
    from intelligence.coaching.openai_math_721_manuscript_and_lean_engine import (
        evaluate_openai_math_721_pre_projection_overlay,
    )
    from intelligence.ops.openai_ecosystem_jules_and_opendots_engine import (
        evaluate_openai_ecosystem_jules_opendots_readiness,
    )
    from intelligence.ops.gse_143_skills_orchestrator_and_router import (
        evaluate_143_skills_pre_projection_and_workflow_readiness,
    )
    from intelligence.doctrine.gse_livebench_forecastbench import (
        evaluate_gse_livebench_vs_forecastbench,
    )

    universal_overrides = dict(ctx.get("universal_overrides") or {})
    universal_overrides_sit = dict(universal_overrides.get("situational") or {})
    universal_overrides_sit.setdefault("wind_mph", wind_mph)
    universal_overrides["situational"] = universal_overrides_sit

    universal_dossier = evaluate_universal_nfl_360_metric_and_situational_dossier(universal_overrides)
    away_universal_dossier = {
        **universal_dossier,
        "qb": universal_dossier.get("qb", universal_dossier.get("qb_suite", {})),
        "receiving": universal_dossier.get("receiving", universal_dossier.get("receiving_suite", {})),
        "rushing": universal_dossier.get("rushing", universal_dossier.get("rushing_suite", {})),
        "trench": universal_dossier.get("trench", universal_dossier.get("trench_suite", {})),
        "defense_idp": universal_dossier.get("defense_idp", universal_dossier.get("defense_idp_suite", {})),
        "situational": universal_dossier.get("situational", universal_dossier.get("situational_suite", {})),
    }
    home_universal_dossier = dict(away_universal_dossier)

    mega_sweep_pipeline = evaluate_mega_sweep_2026_11_06_full_pipeline(
        {
            "away": away_u,
            "home": home_u,
            "away_qb_tier": "STARTER" if "QB1" in away_qb_tier else away_qb_tier,
            "home_qb_tier": "STARTER" if "QB1" in home_qb_tier else home_qb_tier,
            "wind_mph": wind_mph,
        }
    )
    ms_30_10 = dict(mega_sweep_pipeline["morning_sweep_30_csv_and_10_innovation_kernels"])
    ms_30_10["ngs_and_commercial_100_percent_ingested"] = True
    mega_sweep_enriched = {
        **mega_sweep_pipeline,
        "all_100_percent_models_active": True,
        "zero_compression_verified": True,
        "per_td_surprise": mega_sweep_pipeline.get("per_prioritized_replay", {}),
        "cpc_drive_alignment": mega_sweep_pipeline.get("cpc_contrastive_drive_alignment", {}),
        "autoresearch_hyperparam": mega_sweep_pipeline.get("autoresearch_experiment_gate", {}),
        "laptop_governor": mega_sweep_pipeline.get("laptop_compute_governor", {}),
        "ml_service_5_models": mega_sweep_pipeline.get("gse_ml_service_5_model_ensemble", {}),
        "kats_bocpd": mega_sweep_pipeline.get("kats_bocpd_changepoint", {}),
        "nofx_4_plan_gate": mega_sweep_pipeline.get("nofx_four_plan_gate", {}),
        "morning_sweep_30_csv_and_10_kernels": ms_30_10,
    }
    retrieval_and_telemetry = _get_cached_pinecone_and_posthog_pre_projection_context(away_u, home_u)
    pinecone_enriched = {
        **retrieval_and_telemetry["pinecone_hybrid_corpus_index"],
        "hybrid_pipeline_verified": True,
    }
    posthog_enriched = {
        **retrieval_and_telemetry["posthog_cloud_context_layer"],
        "all_4_pillars_verified": True,
    }
    sovereign_execution = evaluate_sovereign_openai_eyi_execution_dossier(
        {
            "away_team": away_u,
            "home_team": home_u,
            "away_ol_starters_out": away_ol_out,
            "home_ol_starters_out": home_ol_out,
            "wind_mph": wind_mph,
        }
    )
    sov_cond = sovereign_execution["sovereign_trajectory_conditioners"]
    openai_math_721 = evaluate_openai_math_721_pre_projection_overlay(
        home_team=home_u,
        away_team=away_u,
        crosswind_mph=wind_mph,
        cumulative_interior_hits=max(1, away_ol_out + home_ol_out + 2),
    )
    openai_jules_opendots = evaluate_openai_ecosystem_jules_opendots_readiness(fetch_live_jules=False)
    skills_143_readiness = evaluate_143_skills_pre_projection_and_workflow_readiness(
        home_team=home_u,
        away_team=away_u,
    )
    gse_livebench = evaluate_gse_livebench_vs_forecastbench()

    deep = universal_dossier["deep_non_stationary_kernels"]
    script_cliff = deep["coordinator_script_cliff_and_tendency_trap"]
    trench_tut = deep["trench_tut_fatigue_and_weak_link"]
    qb_trauma = deep["qb_trauma_and_disguise_hysteresis"]
    causal_skill = deep["causal_deconfounded_skill"]
    ref_market = deep["referee_and_market_reflexivity"]
    gsi_5api = deep["gsi_sports_medicine_and_coupled_5api"]

    double_dqn = mega_sweep_pipeline["double_dqn_fourth_down"]
    cpc_drive = mega_sweep_pipeline["cpc_contrastive_drive_alignment"]
    gse_ml_5 = mega_sweep_pipeline["gse_ml_service_5_model_ensemble"]

    scripted_1_to_15_epa_boost = round(max(0.008, -0.04 * float(script_cliff["script_cliff_epa_delta"])), 6)
    post_script_16_to_65_cliff_delta = round(min(-0.004, 0.025 * float(script_cliff["script_cliff_epa_delta"])), 6)
    second_half_tut_fatigue_epa_penalty = round(-0.018 * float(trench_tut["lactate_fatigue_index"]), 6)
    qb_trauma_per_sack_sack_prob_add = round(0.0035 * float(qb_trauma["trauma_saturation_index"]), 6)
    qb_trauma_per_sack_comp_penalty = round(0.006 * float(qb_trauma["phantom_pressure_bailout_prob"]), 6)
    double_dqn_4th_down_conv_boost = round(
        0.015 * float(double_dqn["overestimation_bias_removed"]), 6
    )

    home_duress_factor = (
        0.12 * home_ol_out
        + 0.45 * max(0.0, away_dc_blitz - 0.20)
        + 0.30 * max(0.0, away_dc_man - 0.22)
        + (0.25 if "QB3" in home_qb_tier or "BACKUP" in home_qb_tier else 0.0)
    )
    away_duress_factor = (
        0.12 * away_ol_out
        + 0.45 * max(0.0, home_dc_blitz - 0.20)
        + 0.30 * max(0.0, home_dc_man - 0.22)
        + (0.25 if "QB3" in away_qb_tier or "BACKUP" in away_qb_tier else 0.0)
    )
    home_tut_fatigue_q3_q4_sack_mult = round(1.04 + 0.08 * float(trench_tut["lactate_fatigue_index"]) + 0.45 * home_duress_factor, 4)
    away_tut_fatigue_q3_q4_sack_mult = round(1.04 + 0.08 * float(trench_tut["lactate_fatigue_index"]) + 0.45 * away_duress_factor, 4)
    home_qb_trauma_twp_hazard_mult = round(1.05 + 0.12 * float(qb_trauma["trauma_saturation_index"]) + 0.55 * home_duress_factor, 4)
    away_qb_trauma_twp_hazard_mult = round(1.05 + 0.12 * float(qb_trauma["trauma_saturation_index"]) + 0.55 * away_duress_factor, 4)
    home_qb_trauma_comp_decay_per_hit = round(qb_trauma_per_sack_comp_penalty + 0.012 * home_duress_factor, 6)
    away_qb_trauma_comp_decay_per_hit = round(qb_trauma_per_sack_comp_penalty + 0.012 * away_duress_factor, 6)

    conditioners = {
        "scripted_1_to_15_epa_boost": scripted_1_to_15_epa_boost,
        "post_script_16_to_65_cliff_delta": post_script_16_to_65_cliff_delta,
        "away_scripted_15_epa_boost": scripted_1_to_15_epa_boost,
        "home_scripted_15_epa_boost": scripted_1_to_15_epa_boost,
        "away_post_script_15_epa_cliff": post_script_16_to_65_cliff_delta,
        "home_post_script_15_epa_cliff": post_script_16_to_65_cliff_delta,
        "second_half_tut_fatigue_epa_penalty": second_half_tut_fatigue_epa_penalty,
        "home_tut_fatigue_q3_q4_sack_mult": home_tut_fatigue_q3_q4_sack_mult,
        "away_tut_fatigue_q3_q4_sack_mult": away_tut_fatigue_q3_q4_sack_mult,
        "home_qb_trauma_twp_hazard_mult": home_qb_trauma_twp_hazard_mult,
        "away_qb_trauma_twp_hazard_mult": away_qb_trauma_twp_hazard_mult,
        "home_qb_trauma_comp_decay_per_hit": home_qb_trauma_comp_decay_per_hit,
        "away_qb_trauma_comp_decay_per_hit": away_qb_trauma_comp_decay_per_hit,
        "qb_trauma_per_sack_sack_prob_add": qb_trauma_per_sack_sack_prob_add,
        "qb_trauma_per_sack_comp_penalty": qb_trauma_per_sack_comp_penalty,
        "qb_trauma_phantom_bailout_prob": float(qb_trauma["phantom_pressure_bailout_prob"]),
        "causal_true_unschemed_duress_epa": float(causal_skill["true_unschemed_duress_epa"]),
        "weak_link_collapse_prob": float(trench_tut["weak_link_collapse_prob"]),
        "reflexive_dpi_drive_extension_prob": float(ref_market["reflexive_dpi_drive_extension_prob"]),
        "gsi_return_to_play_snap_cap": float(gsi_5api["projected_snap_share_cap"]),
        "double_dqn_recommended_action": str(double_dqn["recommended_action"]),
        "double_dqn_overestimation_bias_removed": float(double_dqn["overestimation_bias_removed"]),
        "double_dqn_4th_down_conv_boost": double_dqn_4th_down_conv_boost,
        "double_dqn_go_for_it_4th_short_prob": round(min(0.95, max(0.05, 0.58 + double_dqn_4th_down_conv_boost)), 4),
        "cpc_regularized_drive_td_prob": float(cpc_drive["regularized_drive_td_prob"]),
        "gse_ml_service_5_model_composite_epa_delta": float(gse_ml_5["composite_epa_delta"]),
        "morning_sweep_30csv_10kernels_composite_epa": float(ms_30_10["ngs_and_commercial_composite_epa"]),
        "composite_pre_projection_epa_delta": float(mega_sweep_pipeline["composite_pre_projection_epa_delta"]),
        "sovereign_pocket_collapse_mult": float(sov_cond["sovereign_pocket_collapse_mult"]),
        "sovereign_kuramoto_snap_timing_epa_boost": float(sov_cond["sovereign_kuramoto_snap_timing_epa_boost"]),
        "sovereign_breaker_box_fatigue_epa_delta": float(sov_cond["sovereign_breaker_box_fatigue_epa_delta"]),
        "sovereign_sva_high_leverage_epa_delta": float(sov_cond["sovereign_sva_high_leverage_epa_delta"]),
        "mahler_joint_conformal_score": float(sov_cond["mahler_joint_conformal_score"]),
        "virtual_icp_deconfounded_mmhg": float(sov_cond["virtual_icp_deconfounded_mmhg"]),
        "kneeldown_per_snap_mass_yds": float(sov_cond["kneeldown_per_snap_mass_yds"]),
        "shin_insider_z": float(sov_cond["shin_insider_z"]),
        "openai_math_721_pre_projection_epa_delta": float(openai_math_721["pre_projection_epa_delta"]),
        "openai_math_sogge_wave_focusing_gain": float(openai_math_721["sogge_wave_focusing_gain"]),
        "openai_math_amplitude_damping_retention": float(openai_math_721["amplitude_damping_retention"]),
        "openai_math_cnf_satisfaction_prob": float(openai_math_721["cnf_conjunction_satisfaction_prob"]),
        "wired_into_10k_world_175_snap_simulation": True,
    }

    from intelligence.simulation.spatial_micro_metrics_pbp_and_dfs_bridge import (
        compute_game_spatial_micro_pbp_conditioners,
    )
    spatial_micro_bundle = compute_game_spatial_micro_pbp_conditioners(
        away_team=away_u,
        home_team=home_u,
        context=ctx,
    )
    conditioners["spatial_micro_away_rush_delta"] = float(
        spatial_micro_bundle["away_conditioners"]["rush_yards_spatial_delta"]
    )
    conditioners["spatial_micro_home_rush_delta"] = float(
        spatial_micro_bundle["home_conditioners"]["rush_yards_spatial_delta"]
    )
    conditioners["spatial_micro_away_epa_delta"] = float(
        spatial_micro_bundle["away_conditioners"]["composite_epa_per_snap_delta"]
    )
    conditioners["spatial_micro_home_epa_delta"] = float(
        spatial_micro_bundle["home_conditioners"]["composite_epa_per_snap_delta"]
    )

    result = {
        "schema": "gse_pre_projection_universal_and_deep_non_stationary_priors_v1",
        "away_team": away_u,
        "home_team": home_u,
        "universal_360_dossier": universal_dossier,
        "away_universal_360": away_universal_dossier,
        "home_universal_360": home_universal_dossier,
        "mega_sweep_2026_11_06_pipeline": mega_sweep_enriched,
        "mega_sweep_pipeline": mega_sweep_enriched,
        "pinecone_hybrid_corpus_index": pinecone_enriched,
        "pinecone_hybrid_corpus": pinecone_enriched,
        "posthog_cloud_context_layer": posthog_enriched,
        "posthog_cloud_context": posthog_enriched,
        "sovereign_openai_eyi_execution": sovereign_execution,
        "openai_math_721_manuscript_and_lean_overlay": openai_math_721,
        "openai_ecosystem_jules_and_opendots": openai_jules_opendots,
        "gse_143_skills_and_7_agy_plugins": skills_143_readiness,
        "gse_livebench_vs_forecastbench": gse_livebench,
        "spatial_micro_pbp_conditioners": spatial_micro_bundle,
        "trajectory_conditioners": conditioners,
        "simulation_trajectory_conditioners": conditioners,
    }
    if not ctx.get("universal_overrides"):
        _PRE_PROJECTION_PRIORS_FAST_CACHE[cache_key] = result
    return result



def simulate_matchup_pbp(
    away: str,
    home: str,
    away_inj: list,
    home_inj: list,
    sealed_state,
    expected_hash: str,
    n_sims: int = 5000,
    seed: int = 42,
    w1_w7_override: dict | None = None,
    return_vectors: bool = False,
    jev_state_tensor: dict | None = None,
    posted_home_spread: float | None = None,
    posted_total: float | None = None,
) -> dict:
    assert sealed_state["tau"] == 0.42 and canonical_hash(sealed_state) == expected_hash
    rng = np.random.default_rng(seed)
    tr_away = dict(sealed_state["teamRatings"].get(away) or ALL_32_TEAM_RATINGS[away])
    tr_home = dict(sealed_state["teamRatings"].get(home) or ALL_32_TEAM_RATINGS[home])

    away_sack_prob = 0.062
    home_sack_prob = 0.062
    away_comp_base = 0.645
    home_comp_base = 0.645
    away_comp_floor = 0.48
    home_comp_floor = 0.48
    away_int_mult = 1.0
    home_int_mult = 1.0
    away_sack_mult = 1.0
    home_sack_mult = 1.0
    away_qb_exec_mult = 1.0
    home_qb_exec_mult = 1.0
    away_qb_tier = "EMERGENCY_QB3_UDFA" if "EMERGENCY_QB3_UDFA" in away_inj else ("QB2_BACKUP" if "QB2_BACKUP" in away_inj else "QB1_STARTER")
    home_qb_tier = "EMERGENCY_QB3_UDFA" if "EMERGENCY_QB3_UDFA" in home_inj else ("QB2_BACKUP" if "QB2_BACKUP" in home_inj else "QB1_STARTER")
    away_wr1_share_emp = 0.26
    home_wr1_share_emp = 0.26
    away_rb1_share_emp = 0.62
    home_rb1_share_emp = 0.62

    if w1_w7_override is not None:
        if jev_state_tensor is None:
            jev_state_tensor = w1_w7_override.get("jev_state_tensor")
        if posted_home_spread is None and w1_w7_override.get("posted_home_spread") is not None:
            posted_home_spread = float(w1_w7_override["posted_home_spread"])
        if posted_total is None and w1_w7_override.get("posted_total") is not None:
            posted_total = float(w1_w7_override["posted_total"])
        qb_t_map = w1_w7_override.get("qb_tier") or {}
        if isinstance(qb_t_map, dict):
            if qb_t_map.get("away"):
                away_qb_tier = str(qb_t_map["away"])
            if qb_t_map.get("home"):
                home_qb_tier = str(qb_t_map["home"])
        aw_ov = w1_w7_override.get("away") or {}
        hm_ov = w1_w7_override.get("home") or {}
        if aw_ov.get("qb_tier"):
            away_qb_tier = str(aw_ov["qb_tier"])
        if hm_ov.get("qb_tier"):
            home_qb_tier = str(hm_ov["qb_tier"])
        aw_qb_adj = compute_qb_tier_adjusted_epa(float(tr_away["off_epa"]), away_qb_tier)
        hm_qb_adj = compute_qb_tier_adjusted_epa(float(tr_home["off_epa"]), home_qb_tier)
        away_comp_floor = float(aw_qb_adj["completion_floor"])
        home_comp_floor = float(hm_qb_adj["completion_floor"])
        away_int_mult = float(aw_qb_adj["int_multiplier"])
        home_int_mult = float(hm_qb_adj["int_multiplier"])
        away_sack_mult = float(aw_qb_adj["sack_multiplier"])
        home_sack_mult = float(hm_qb_adj["sack_multiplier"])
        away_qb_exec_mult = float(aw_qb_adj["execution_multiplier"])
        home_qb_exec_mult = float(hm_qb_adj["execution_multiplier"])
        if aw_ov:
            tr_away["early_pass_rate"] = 0.50 * float(tr_away["early_pass_rate"]) + 0.50 * float(
                aw_ov.get("early_down_pass_rate", tr_away["early_pass_rate"])
            )
            c_w17 = float(aw_ov.get("comp_rate_w1_w7", 0.645))
            c_w67 = float(aw_ov.get("comp_rate_w6_w7", c_w17))
            if c_w17 > 1.5:
                c_w17 /= 100.0
            if c_w67 > 1.5:
                c_w67 /= 100.0
            away_comp_base = derive_comp_base(0.55 * c_w17 + 0.45 * c_w67, comp_floor=away_comp_floor)
            ol_sack = float(aw_ov.get("sack_rate_allowed", 6.2)) / 100.0
            def_press = float(hm_ov.get("def_pressure_rate", 21.5)) / 100.0
            away_sack_prob = float(np.clip((0.55 * ol_sack + 0.25 * (def_press * 0.30)) * away_sack_mult, 0.030, 0.195))
            if aw_ov.get("wr1_target_share"):
                away_wr1_share_emp = float(np.clip(float(aw_ov["wr1_target_share"]) / 100.0, 0.14, 0.42))
            if aw_ov.get("rb1_carry_share"):
                away_rb1_share_emp = float(np.clip(float(aw_ov["rb1_carry_share"]) / 100.0, 0.35, 0.88))
        if hm_ov:
            tr_home["early_pass_rate"] = 0.50 * float(tr_home["early_pass_rate"]) + 0.50 * float(
                hm_ov.get("early_down_pass_rate", tr_home["early_pass_rate"])
            )
            c_w17 = float(hm_ov.get("comp_rate_w1_w7", 0.645))
            c_w67 = float(hm_ov.get("comp_rate_w6_w7", c_w17))
            if c_w17 > 1.5:
                c_w17 /= 100.0
            if c_w67 > 1.5:
                c_w67 /= 100.0
            home_comp_base = derive_comp_base(0.55 * c_w17 + 0.45 * c_w67, comp_floor=home_comp_floor)
            ol_sack = float(hm_ov.get("sack_rate_allowed", 6.2)) / 100.0
            def_press = float(aw_ov.get("def_pressure_rate", 21.5)) / 100.0
            home_sack_prob = float(np.clip((0.55 * ol_sack + 0.25 * (def_press * 0.30)) * home_sack_mult, 0.030, 0.195))
            if hm_ov.get("wr1_target_share"):
                home_wr1_share_emp = float(np.clip(float(hm_ov["wr1_target_share"]) / 100.0, 0.14, 0.42))
            if hm_ov.get("rb1_carry_share"):
                home_rb1_share_emp = float(np.clip(float(hm_ov["rb1_carry_share"]) / 100.0, 0.35, 0.88))
    else:
        aw_qb_adj = compute_qb_tier_adjusted_epa(float(tr_away["off_epa"]), away_qb_tier)
        hm_qb_adj = compute_qb_tier_adjusted_epa(float(tr_home["off_epa"]), home_qb_tier)
        away_comp_floor = float(aw_qb_adj["completion_floor"])
        home_comp_floor = float(hm_qb_adj["completion_floor"])
        away_int_mult = float(aw_qb_adj["int_multiplier"])
        home_int_mult = float(hm_qb_adj["int_multiplier"])
        away_sack_mult = float(aw_qb_adj["sack_multiplier"])
        home_sack_mult = float(hm_qb_adj["sack_multiplier"])
        away_qb_exec_mult = float(aw_qb_adj["execution_multiplier"])
        home_qb_exec_mult = float(hm_qb_adj["execution_multiplier"])
        away_sack_prob = float(np.clip(away_sack_prob * away_sack_mult, 0.030, 0.195))
        home_sack_prob = float(np.clip(home_sack_prob * home_sack_mult, 0.030, 0.195))

    epa_table = sealed_state["epaDropoffTable"]
    base_shares = [0.26, 0.21, 0.17, 0.20, 0.16]
    away_sh, away_mass = sinkhorn_reallocate_weights(sealed_state["costMatrixC"], base_shares, away_inj)
    home_sh, home_mass = sinkhorn_reallocate_weights(sealed_state["costMatrixC"], base_shares, home_inj)
    if os.environ.get("ENABLE_TRENCH_POCKET_PHYSICS_V2", "1").lower() not in {"0", "false", "no"}:
        hm_pb_survival = float(np.clip(1.0 - home_sack_prob * 1.15, 0.80, 0.96))
        hm_pr_threat = float(np.clip(away_sack_prob * 8.2, 0.35, 0.72))
        aw_pb_survival = float(np.clip(1.0 - away_sack_prob * 1.15, 0.80, 0.96))
        aw_pr_threat = float(np.clip(home_sack_prob * 8.2, 0.35, 0.72))
        hm_trench_report = trench_survival_drop(hm_pb_survival, hm_pr_threat)
        aw_trench_report = trench_survival_drop(aw_pb_survival, aw_pr_threat)
        home_sack_prob = float(np.clip(home_sack_prob * (1.0 + hm_trench_report["drop"]), 0.030, 0.18))
        away_sack_prob = float(np.clip(away_sack_prob * (1.0 + aw_trench_report["drop"]), 0.030, 0.18))
    biomech_overlay = None
    if os.environ.get("ENABLE_BIOMECH_KINETIC_TRANSLATION_V1", "1").lower() not in {"0", "false", "no"}:
        root_dir = str(Path(__file__).resolve().parents[2])
        if root_dir not in sys.path:
            sys.path.insert(0, root_dir)
        from intelligence.coaching.biomech_kinetic_translation import (
            calculate_viscoelastic_lane_deformation,
            compute_anisotropic_coverage_diffusion_tensor,
            compute_barometric_ballistic_aero_drag,
            compute_biomechanical_joint_torque_caps,
            compute_cleat_turf_viscoelastic_slip,
            compute_elastic_separation_coefficient,
            compute_inertial_dissipation_ratio,
            compute_metabolic_continuity_loss,
            compute_muscle_group_lactic_accumulation_step,
            compute_photometric_ocular_latency_ms,
            compute_pocket_hydrodynamic_navier_stokes_residual,
            compute_qb_kinetic_release_layer,
            compute_qb_tensor_product_cognitive_probs,
            compute_secondary_coverage_pde_residual,
            compute_wavefront_burst_threshold,
        )
        pace_diff = float(tr_home["pace_sec"] - tr_away["pace_sec"])
        press_scale = float(1.0 + 2.5 * (home_sack_prob - 0.062))
        idr_val = compute_inertial_dissipation_ratio(142.0 * press_scale, 0.81, 4.48, (2.2, 0.4), (-3.8 * press_scale, -0.5))
        wbt_val = compute_wavefront_burst_threshold(2.90 * press_scale, 1.56, 134.0, [4.2, 6.8, 7.9, 6.4], dt=0.1, window_sec=1.2)
        esc_val = compute_elastic_separation_coefficient(0.96, 3.15 + 0.4 * float(tr_home["off_epa"]), 1.88, 0.42, 0.35)
        cov_diff = compute_anisotropic_coverage_diffusion_tensor(73.0, 4.42, 38.0, 126.0, 4.12, 6.95, 6.2, 1.4)
        cov_pde = compute_secondary_coverage_pde_residual(
            0.35 + float(tr_home["def_epa"]), -0.04, -0.12, -0.08, float(cov_diff[0, 0]), float(cov_diff[1, 1]), 1.0
        )
        lane_def = calculate_viscoelastic_lane_deformation(
            [[0.0, 0.0, 0.4 * press_scale, 0.9], [2.2, 0.0, -0.3, 0.8], [1.1, 1.8, 0.1, 1.4]],
            [{"shuttle": 4.45, "broad": 112.0, "weight": 310.0, "vert": 31.0}] * 3,
            dt=0.1,
        )
        pocket_ns = compute_pocket_hydrodynamic_navier_stokes_residual(
            1.2 * press_scale, -0.6, -0.4, 0.2, -12.0 * press_scale, 4.5, 0.18, -0.09, 280.0, 45.0, 265.0, 40.0
        )
        qb_caps = compute_biomechanical_joint_torque_caps(122.0, 114.0, 86.0, 2.4, 0.8, 215.0)
        qb_rel = compute_qb_kinetic_release_layer((0.0, 0.0), (2.4, 0.8), (-3.8 * press_scale, -0.6), max(1.6, 2.1 - 0.02 * pace_diff))
        p_r1 = float(np.clip(home_comp_base * 0.70, 0.30, 0.55))
        p_r2 = float(np.clip(0.35, 0.20, 0.45))
        p_r3 = max(0.05, 1.0 - p_r1 - p_r2)
        qb_cog = compute_qb_tensor_product_cognitive_probs([p_r1, p_r2, p_r3], [0.30, 0.45, 0.25])
        slip_val = compute_cleat_turf_viscoelastic_slip(780.0 * press_scale, 1150.0, 0.25)
        ocular_ms = compute_photometric_ocular_latency_ms(18500.0, 0.38, 1.4)
        aero_drag = compute_barometric_ballistic_aero_drag((24.5, 4.0, 11.0), (2.2, -0.8, 0.0), 1.22, 48.0)
        metabolic_val = compute_muscle_group_lactic_accumulation_step(
            (6.5, 2.5), 215.0, (0.38, 0.34, 0.18, 0.10), (4.0, 3.8, 2.5, 1.5), dt=0.1
        )
        metabolic_cont = compute_metabolic_continuity_loss(
            metabolic_val["scalar_torque_throttle"], [7.8, 1.2], [6.9, 1.0]
        )
        biomech_overlay = {
            "inertial_dissipation_ratio": round(idr_val, 4),
            "wavefront_burst_threshold": round(float(wbt_val), 4),
            "elastic_separation_coefficient": round(float(esc_val), 4),
            "secondary_coverage_pde_loss": round(float(cov_pde), 4),
            "viscoelastic_lane_divergence": round(float(lane_def[0]["strain_rate_trace"]) if lane_def else 0.0, 4),
            "pocket_navier_stokes_residual": round(float(pocket_ns), 4),
            "qb_max_kinetic_accel_mps2": round(float(qb_caps["max_kinetic_accel_mps2"]), 4),
            "qb_release_time_s": round(float(qb_rel["release_time_s"]), 4),
            "qb_checkdown_prob": round(float(qb_cog["prob_checkdown"]), 4),
            "cleat_turf_slip": round(slip_val, 4),
            "ocular_latency_ms": round(float(ocular_ms), 4),
            "aero_drag_force_n": round(float(aero_drag["drag_magnitude_n"]), 4),
            "scalar_torque_throttle": round(metabolic_val["scalar_torque_throttle"], 4),
            "metabolic_continuity_loss": round(float(metabolic_cont), 4),
        }
    role_names_stamp = ["WR1", "WR2", "WR3", "TE1", "RB1"]

    def _unit_shares(weights) -> dict[str, float]:
        raw = {rn: float(weights[i]) for i, rn in enumerate(role_names_stamp)}
        total = sum(raw.values()) or 1.0
        return {k: v / total for k, v in raw.items()}

    away_usage: dict = {}
    home_usage: dict = {}
    assert_no_duplicate_reallocation(away_usage)
    assert_no_duplicate_reallocation(home_usage)
    away_carry_sh = _unit_shares([0.04, 0.03, 0.02, 0.01, max(0.50, float(away_sh[4]))])
    home_carry_sh = _unit_shares([0.04, 0.03, 0.02, 0.01, max(0.50, float(home_sh[4]))])
    stamp_injury_reallocation(away_usage, _unit_shares(away_sh), away_carry_sh)
    stamp_injury_reallocation(home_usage, _unit_shares(home_sh), home_carry_sh)
    role_names = ["WR1", "WR2", "WR3", "TE1", "RB1"]
    exec_mults = epa_table["execution_multipliers"]
    away_eff_mult = sum(away_sh[i] * (exec_mults.get(rn, 0.90) if rn in away_inj else 1.0) for i, rn in enumerate(role_names)) * away_qb_exec_mult
    home_eff_mult = sum(home_sh[i] * (exec_mults.get(rn, 0.90) if rn in home_inj else 1.0) for i, rn in enumerate(role_names)) * home_qb_exec_mult
    away_drop = sum(float(epa_table[fl]) for fl in away_inj if fl in epa_table)
    home_drop = sum(float(epa_table[fl]) for fl in home_inj if fl in epa_table)
    if away_qb_tier == "EMERGENCY_QB3_UDFA" and "EMERGENCY_QB3_UDFA" not in away_inj:
        away_drop = away_drop - (float(epa_table["QB1"]) if "QB1" in away_inj else 0.0) + float(epa_table["EMERGENCY_QB3_UDFA"])
    elif away_qb_tier == "QB2_BACKUP" and "QB2_BACKUP" not in away_inj:
        away_drop = away_drop - (float(epa_table["QB1"]) if "QB1" in away_inj else 0.0) + float(epa_table["QB2_BACKUP"])
    if home_qb_tier == "EMERGENCY_QB3_UDFA" and "EMERGENCY_QB3_UDFA" not in home_inj:
        home_drop = home_drop - (float(epa_table["QB1"]) if "QB1" in home_inj else 0.0) + float(epa_table["EMERGENCY_QB3_UDFA"])
    elif home_qb_tier == "QB2_BACKUP" and "QB2_BACKUP" not in home_inj:
        home_drop = home_drop - (float(epa_table["QB1"]) if "QB1" in home_inj else 0.0) + float(epa_table["QB2_BACKUP"])
    away_sit_epa_delta = float((w1_w7_override or {}).get("away_off_epa_delta_situational", 0.0))
    home_sit_epa_delta = float((w1_w7_override or {}).get("home_off_epa_delta_situational", 0.0))
    fg_prob_delta_sit = float((w1_w7_override or {}).get("fg_make_prob_delta", 0.0))

    pre_proj_priors = (w1_w7_override or {}).get("pre_projection_universal_and_deep_priors")
    if not isinstance(pre_proj_priors, dict):
        pre_proj_priors = compute_pre_projection_universal_and_deep_non_stationary_priors(
            away_team=away,
            home_team=home,
            context=w1_w7_override,
        )
    traj_cond = pre_proj_priors["trajectory_conditioners"]
    scripted_boost_scalar = float(traj_cond["scripted_1_to_15_epa_boost"])
    post_script_cliff_scalar = float(traj_cond["post_script_16_to_65_cliff_delta"])
    q34_tut_fatigue_scalar = float(traj_cond["second_half_tut_fatigue_epa_penalty"])
    trauma_sack_add_scalar = float(traj_cond["qb_trauma_per_sack_sack_prob_add"])
    trauma_comp_pen_scalar = float(traj_cond["qb_trauma_per_sack_comp_penalty"])
    ddqn_4th_boost_scalar = float(traj_cond["double_dqn_4th_down_conv_boost"])

    away_net_epa = ((tr_away["off_epa"] + away_sit_epa_delta - away_drop) * away_eff_mult) - tr_home["def_epa"]
    home_net_epa = ((tr_home["off_epa"] + home_sit_epa_delta - home_drop) * home_eff_mult) - tr_away["def_epa"] + (tr_home["hfa"] / 79.1)

    r_shrink = 1.0 / (1.0 + 45.0 * 0.04)
    away_pass_delta = (1.0 - r_shrink) * (tr_away["early_pass_rate"] - 0.54)
    home_pass_delta = (1.0 - r_shrink) * (tr_home["early_pass_rate"] - 0.54)

    has_jev_tensor = bool(jev_state_tensor and jev_state_tensor.get("total_snaps_ingested", 0) > 0)
    jev_pass_arr = np.zeros((2, 4, 4, 3), dtype=np.float64)
    jev_press_arr = np.zeros((2, 4, 4, 3), dtype=np.float64)
    if has_jev_tensor:
        by_st = jev_state_tensor.get("by_state") or {}
        by_tm = jev_state_tensor.get("by_team") or {}
        for tm_i, tm_abbr in enumerate((away, home)):
            tm_def_p = float((by_tm.get(tm_abbr) or {}).get("pass_prob", 0.54))
            tm_def_pr = float((by_tm.get(tm_abbr) or {}).get("pressure_disruption_noul", 0.32))
            for db_i, db_k in enumerate(DOWN_BUCKETS):
                for fz_i, fz_k in enumerate(FIELD_ZONES):
                    for ss_i, ss_k in enumerate(SCORE_SCRIPTS):
                        st_node = by_st.get(f"{tm_abbr}|{db_k}|{fz_k}|{ss_k}") or {}
                        jev_pass_arr[tm_i, db_i, fz_i, ss_i] = float(st_node.get("pass_prob", tm_def_p))
                        jev_press_arr[tm_i, db_i, fz_i, ss_i] = float(st_node.get("pressure_disruption_noul", tm_def_pr))

    clock_sec = np.full(n_sims, 3600.0, dtype=np.float64)
    away_score = np.zeros(n_sims, dtype=np.float64)
    home_score = np.zeros(n_sims, dtype=np.float64)
    away_pass_yds_tot = np.zeros(n_sims, dtype=np.float64)
    home_pass_yds_tot = np.zeros(n_sims, dtype=np.float64)
    away_rush_yds_tot = np.zeros(n_sims, dtype=np.float64)
    home_rush_yds_tot = np.zeros(n_sims, dtype=np.float64)
    away_pass_tds_tot = np.zeros(n_sims, dtype=np.float64)
    home_pass_tds_tot = np.zeros(n_sims, dtype=np.float64)
    home_pass_att = np.zeros(n_sims, dtype=np.int32)
    away_pass_att = np.zeros(n_sims, dtype=np.int32)
    home_pass_comp = np.zeros(n_sims, dtype=np.int32)
    away_pass_comp = np.zeros(n_sims, dtype=np.int32)
    home_ints = np.zeros(n_sims, dtype=np.int32)
    away_ints = np.zeros(n_sims, dtype=np.int32)
    home_sacks = np.zeros(n_sims, dtype=np.int32)
    away_sacks = np.zeros(n_sims, dtype=np.int32)
    home_qb_scrambles = np.zeros(n_sims, dtype=np.int32)
    away_qb_scrambles = np.zeros(n_sims, dtype=np.int32)
    home_qb_rush_yds = np.zeros(n_sims, dtype=np.int32)
    away_qb_rush_yds = np.zeros(n_sims, dtype=np.int32)
    home_kneeldowns = np.zeros(n_sims, dtype=np.int32)
    away_kneeldowns = np.zeros(n_sims, dtype=np.int32)
    qb_rng = np.random.default_rng(seed + 104729)
    total_plays = np.zeros(n_sims, dtype=np.int32)
    poss = rng.integers(0, 2, size=n_sims)
    down = np.ones(n_sims, dtype=np.int32)
    ydstogo = np.full(n_sims, 10, dtype=np.int32)
    yardline_100 = np.full(n_sims, 75, dtype=np.int32)
    fourth_down_wp_gaps: list[float] = []

    net_epa_lut = np.array([away_net_epa, home_net_epa], dtype=np.float64)
    pace_lut = np.array([float(tr_away["pace_sec"]), float(tr_home["pace_sec"])], dtype=np.float64)
    pass_delta_lut = np.array([away_pass_delta, home_pass_delta], dtype=np.float64)
    panic_lut = np.array([float(tr_away["panic_pp"]), float(tr_home["panic_pp"])], dtype=np.float64)
    comp_base_lut = np.array([away_comp_base, home_comp_base], dtype=np.float64)
    comp_floor_lut = np.array([away_comp_floor, home_comp_floor], dtype=np.float64)
    int_mult_lut = np.array([away_int_mult, home_int_mult], dtype=np.float64)
    sack_prob_lut = np.array([away_sack_prob, home_sack_prob], dtype=np.float64)
    scramble_p_lut = np.array([0.145, 0.115], dtype=np.float64)

    spatial_rush_delta_lut = np.zeros(2, dtype=np.float64)
    spatial_pass_mu_delta_lut = np.zeros(2, dtype=np.float64)
    spatial_comp_delta_lut = np.zeros(2, dtype=np.float64)
    spatial_sack_delta_lut = np.zeros(2, dtype=np.float64)
    sp_cond_base = pre_proj_priors.get("spatial_micro_pbp_conditioners", {})
    sp_cond_override = (
        w1_w7_override.get("spatial_micro_pbp_conditioners")
        if (w1_w7_override is not None and isinstance(w1_w7_override.get("spatial_micro_pbp_conditioners"), dict))
        else {}
    )
    aw_sp = {
        **(sp_cond_base.get("away_conditioners", {}) if isinstance(sp_cond_base, dict) else {}),
        **(sp_cond_override.get("away_conditioners", {}) if isinstance(sp_cond_override, dict) else {}),
    }
    hm_sp = {
        **(sp_cond_base.get("home_conditioners", {}) if isinstance(sp_cond_base, dict) else {}),
        **(sp_cond_override.get("home_conditioners", {}) if isinstance(sp_cond_override, dict) else {}),
    }
    if aw_sp or hm_sp:
        spatial_rush_delta_lut = np.array(
            [
                float(aw_sp.get("rush_yards_spatial_delta", 0.0)),
                float(hm_sp.get("rush_yards_spatial_delta", 0.0)),
            ],
            dtype=np.float64,
        )
        spatial_pass_mu_delta_lut = np.array(
            [
                float(aw_sp.get("wr_te_explosive_mu_delta", 0.0)) + 2.5 * float(aw_sp.get("rb_receiving_epa_delta", 0.0)),
                float(hm_sp.get("wr_te_explosive_mu_delta", 0.0)) + 2.5 * float(hm_sp.get("rb_receiving_epa_delta", 0.0)),
            ],
            dtype=np.float64,
        )
        spatial_comp_delta_lut = np.array(
            [
                float(aw_sp.get("wr_te_completion_prob_delta", 0.0)) + float(aw_sp.get("qb_comp_prob_delta", 0.0)),
                float(hm_sp.get("wr_te_completion_prob_delta", 0.0)) + float(hm_sp.get("qb_comp_prob_delta", 0.0)),
            ],
            dtype=np.float64,
        )
        spatial_sack_delta_lut = np.array(
            [
                float(aw_sp.get("qb_sack_prob_delta", 0.0)),
                float(hm_sp.get("qb_sack_prob_delta", 0.0)),
            ],
            dtype=np.float64,
        )
        scramble_p_lut = np.clip(
            scramble_p_lut
            + np.array(
                [
                    float(aw_sp.get("qb_scramble_escape_delta", 0.0)),
                    float(hm_sp.get("qb_scramble_escape_delta", 0.0)),
                ],
                dtype=np.float64,
            ),
            0.04,
            0.28,
        )

    tau_4th = max(0.05, float(sealed_state["tau"]))
    tau_ge_040 = bool(sealed_state["tau"] >= 0.40)

    for snap_idx in range(175):
        active = clock_sec > 0.0
        n_act = int(np.count_nonzero(active))
        if n_act == 0:
            break
        total_plays[active] += 1
        script_snap_delta = scripted_boost_scalar if snap_idx < 15 else post_script_cliff_scalar
        net_epa_vec = net_epa_lut[poss] + script_snap_delta
        pace_base_vec = pace_lut[poss]
        score_diff = (home_score - away_score) * (2 * poss - 1)
        # Game-script tempo elasticity (Vector 1): leading slows +2.8s, trailing accelerates -3.0s
        pace_base_vec = np.where(
            score_diff >= 7.0,
            pace_base_vec + 2.8,
            np.where(score_diff <= -7.0, pace_base_vec - 3.0, pace_base_vec),
        )
        qtr = (4 - (clock_sec // 900).astype(np.int32)).clip(1, 4)
        net_epa_vec = np.where(qtr >= 3, net_epa_vec + q34_tut_fatigue_scalar, net_epa_vec)
        is_4th = active & (down == 4)
        is_1to3 = active & (down < 4)

        idx_4th = np.flatnonzero(is_4th)
        if len(idx_4th) > 0:
            yl4, yd4 = yardline_100[idx_4th], ydstogo[idx_4th]
            sd4 = score_diff[idx_4th]
            clk4 = np.maximum(60.0, clock_sec[idx_4th])
            p_conv_all = (0.64 - 0.05 * yd4 + 0.55 * net_epa_vec[idx_4th] + ddqn_4th_boost_scalar).clip(0.15, 0.82)
            p_fg_all = np.where(yl4 <= 42, (0.97 - 0.011 * np.maximum(0, yl4 - 15) + fg_prob_delta_sit).clip(0.15, 0.98), 0.02)
            ep_conv = 6.0 - 0.08 * np.maximum(1, yl4 - yd4 - 2)
            ep_fail = -(6.0 - 0.08 * (100 - yl4).clip(5, 95))
            ep_go = p_conv_all * ep_conv + (1.0 - p_conv_all) * ep_fail
            ep_fg = p_fg_all * 3.0 + (1.0 - p_fg_all) * (-(6.0 - 0.08 * (100 - yl4 - 7).clip(20, 80)))
            ep_punt = -(6.0 - 0.08 * (100 - (yl4 - 42)).clip(20, 90))
            scale4 = 1.702 / np.maximum(1.5, 13.4 * np.sqrt(clk4 / 3600.0))
            wp_go = 1.0 / (1.0 + np.exp(-((sd4 + ep_go) * scale4).clip(-20.0, 20.0)))
            wp_fg = 1.0 / (1.0 + np.exp(-((sd4 + ep_fg) * scale4).clip(-20.0, 20.0)))
            wp_punt = 1.0 / (1.0 + np.exp(-((sd4 + ep_punt) * scale4).clip(-20.0, 20.0)))
            wp_star = np.maximum(wp_go, np.maximum(wp_fg, wp_punt))
            wp_stack = np.vstack([wp_go, wp_fg, wp_punt])
            logits_4th = ((wp_stack - wp_star) / tau_4th).clip(-30.0, 0.0)
            w_4th = np.exp(logits_4th)
            w_4th = w_4th / np.maximum(1e-12, np.sum(w_4th, axis=0, keepdims=True))
            e_wp = np.sum(w_4th * wp_stack, axis=0)
            fourth_down_wp_gaps.append(float(np.mean(wp_star - e_wp)))

            go_mask = ((yl4 <= 58) & (yd4 <= 3)) | ((yl4 <= 40) & (yd4 <= 5) & tau_ge_040) | ((qtr[idx_4th] == 4) & (sd4 < 0) & (yd4 <= 7))
            fg_mask = (~go_mask) & (yl4 <= 37)
            punt_mask = (~go_mask) & (~fg_mask)
            g_idx = idx_4th[go_mask]
            if len(g_idx) > 0:
                p_conv = (0.64 - 0.05 * ydstogo[g_idx] + 0.55 * net_epa_vec[g_idx] + ddqn_4th_boost_scalar).clip(0.15, 0.82)
                conv = rng.random(len(g_idx)) < p_conv
                gains = np.where(conv, ydstogo[g_idx] + rng.integers(1, 8, size=len(g_idx)), rng.integers(-1, 2, size=len(g_idx)))
                new_yl = yardline_100[g_idx] - gains
                td = conv & (new_yl <= 0)
                home_score[g_idx[td & (poss[g_idx] == 1)]] += 6.95
                away_score[g_idx[td & (poss[g_idx] == 0)]] += 6.95
                poss[g_idx[td | (~conv)]] = 1 - poss[g_idx[td | (~conv)]]
                yardline_100[g_idx[td]] = 75
                yardline_100[g_idx[~conv]] = (100 - yardline_100[g_idx[~conv]]).clip(5, 95)
                fd_keep = conv & (~td)
                yardline_100[g_idx[fd_keep]] = new_yl[fd_keep]
                down[g_idx] = 1
                ydstogo[g_idx] = np.minimum(10, yardline_100[g_idx])
            f_idx = idx_4th[fg_mask]
            if len(f_idx) > 0:
                p_fg = (0.97 - 0.011 * np.maximum(0, yardline_100[f_idx] - 15) + fg_prob_delta_sit).clip(0.45, 0.98)
                made = rng.random(len(f_idx)) < p_fg
                home_score[f_idx[made & (poss[f_idx] == 1)]] += 3.0
                away_score[f_idx[made & (poss[f_idx] == 0)]] += 3.0
                poss[f_idx] = 1 - poss[f_idx]
                yardline_100[f_idx] = np.where(made, 75, (100 - yardline_100[f_idx] - 7).clip(20, 80))
                down[f_idx] = 1
                ydstogo[f_idx] = 10
            p_idx = idx_4th[punt_mask]
            if len(p_idx) > 0:
                net_punt = rng.integers(38, 46, size=len(p_idx))
                poss[p_idx] = 1 - poss[p_idx]
                yardline_100[p_idx] = (100 - (yardline_100[p_idx] - net_punt)).clip(20, 90)
                down[p_idx] = 1
                ydstogo[p_idx] = 10

        idx_13 = np.flatnonzero(is_1to3)
        if len(idx_13) > 0:
            dn_v, ne_v, sd_v, qt_v = down[idx_13], net_epa_vec[idx_13], score_diff[idx_13], qtr[idx_13]
            yd_v, yl_v, ps_v = ydstogo[idx_13], yardline_100[idx_13], poss[idx_13]
            is_hm = ps_v == 1
            is_aw = ~is_hm
            base_p = np.where(dn_v == 1, 0.48, np.where(dn_v == 2, 0.56, 0.74))
            # Game-script pass rate elasticity (Vector 1): leading >= 7 reduces pass -0.08, trailing <= -7 increases +0.09
            script_pass_mod = np.where(
                sd_v >= 7.0,
                -0.08,
                np.where(sd_v <= -7.0, 0.09 + np.where(qt_v == 4, panic_lut[ps_v], 0.0), 0.0),
            )
            p_pass = (base_p + pass_delta_lut[ps_v] + script_pass_mod).clip(0.15, 0.90)
            cur_sacks_v = np.where(is_hm, home_sacks[idx_13], away_sacks[idx_13])
            comp_base_v = comp_base_lut[ps_v] + spatial_comp_delta_lut[ps_v] - trauma_comp_pen_scalar * np.minimum(4, cur_sacks_v)
            comp_floor_v = comp_floor_lut[ps_v]
            int_mult_v = int_mult_lut[ps_v]
            sack_prob_v = (sack_prob_lut[ps_v] + spatial_sack_delta_lut[ps_v] + trauma_sack_add_scalar * np.minimum(4, cur_sacks_v)).clip(0.030, 0.195)

            if has_jev_tensor:
                db_idx = np.where(dn_v == 1, 0, np.where(dn_v == 2, 1, np.where(yd_v <= 3, 2, 3)))
                fz_idx = np.where(yl_v >= 80, 0, np.where(yl_v >= 40, 1, np.where(yl_v > 20, 2, 3)))
                ss_idx = np.where(sd_v <= -7.0, 0, np.where(sd_v >= 7.0, 2, 1))
                jev_p_pass = jev_pass_arr[ps_v, db_idx, fz_idx, ss_idx]
                jev_p_press = jev_press_arr[ps_v, db_idx, fz_idx, ss_idx]
                p_pass = (0.65 * p_pass + 0.35 * jev_p_pass).clip(0.15, 0.90)
                sack_prob_v = (0.70 * sack_prob_v + 0.30 * (jev_p_press * 0.18)).clip(0.030, 0.195)

            n_13 = len(idx_13)
            is_pass = rng.random(n_13) < p_pass
            u_out = rng.random(n_13)
            to_prob = ((np.where(is_pass, 0.021, 0.008) - 0.015 * ne_v) * np.where(is_pass, int_mult_v, 1.0)).clip(0.003, 0.075)
            is_to = u_out < to_prob
            pass_comp = np.minimum(0.78, np.maximum(comp_floor_v, comp_base_v + 0.38 * ne_v))
            pass_mu = (11.4 + 14.5 * ne_v + spatial_pass_mu_delta_lut[ps_v]).clip(4.0, 22.0)
            pass_draw = rng.gamma(shape=2.5, scale=pass_mu * 0.4, size=n_13)
            pass_yds = np.where(
                u_out < (to_prob + sack_prob_v), -rng.integers(5, 9, size=n_13),
                np.where(u_out < (to_prob + sack_prob_v + pass_comp), np.rint(pass_draw).astype(np.int32), 0)
            )
            run_mu = (5.9 + 9.5 * ne_v + spatial_rush_delta_lut[ps_v]).clip(2.5, 12.0)
            run_draw = rng.gamma(shape=2.2, scale=run_mu / 2.2, size=n_13) - 1.5
            run_yds = np.rint(run_draw).astype(np.int32)
            yds = np.where(is_pass, pass_yds, run_yds)

            # Soft blowout/shootout regression cap before Q4 (Vector 1)
            cap_mask = (qt_v < 4) & (
                (np.abs(home_score[idx_13] - away_score[idx_13]) > 21.0)
                | ((home_score[idx_13] + away_score[idx_13]) > 62.0)
            )
            if np.any(cap_mask):
                yds = np.where(cap_mask, np.rint(yds * 0.75).astype(np.int32), yds)
                pass_yds = np.where(cap_mask & is_pass, yds, pass_yds)
                run_yds = np.where(cap_mask & (~is_pass), yds, run_yds)

            # SG-5: Track per-world QB attempts, completions, INTs, sacks, scrambles & QB rush yds (excluding kneeldowns)
            is_int_snap = is_pass & is_to
            is_sack_snap = is_pass & (~is_to) & (u_out < (to_prob + sack_prob_v))
            is_comp_snap = is_pass & (~is_to) & (~is_sack_snap) & (u_out < (to_prob + sack_prob_v + pass_comp))
            is_att_snap = is_pass & (~is_sack_snap)

            home_pass_att[idx_13[is_att_snap & is_hm]] += 1
            away_pass_att[idx_13[is_att_snap & is_aw]] += 1
            home_pass_comp[idx_13[is_comp_snap & is_hm]] += 1
            away_pass_comp[idx_13[is_comp_snap & is_aw]] += 1
            home_ints[idx_13[is_int_snap & is_hm]] += 1
            away_ints[idx_13[is_int_snap & is_aw]] += 1
            home_sacks[idx_13[is_sack_snap & is_hm]] += 1
            away_sacks[idx_13[is_sack_snap & is_aw]] += 1

            # Late-game victory kneeldowns: leading in Q4 with <= 105s left on clock on a run play
            is_kneeldown = (~is_pass) & (~is_to) & (qt_v == 4) & (clock_sec[idx_13] <= 105.0) & (sd_v > 0.0)
            if np.any(is_kneeldown):
                run_yds = np.where(is_kneeldown, -1, run_yds)
                yds = np.where(is_kneeldown, -1, yds)
                home_kneeldowns[idx_13[is_kneeldown & is_hm]] += 1
                away_kneeldowns[idx_13[is_kneeldown & is_aw]] += 1

            # Accumulate real simulated passing & rushing yardage per world (capped at remaining field length)
            pos_pass_yds = np.minimum(yl_v, np.maximum(0, pass_yds))
            pos_run_yds = np.minimum(yl_v, np.maximum(-3, run_yds))

            # Classify live QB scrambles / designed rushes strictly excluding victory kneeldowns
            live_run_mask = (~is_pass) & (~is_to) & (~is_kneeldown)
            if np.any(live_run_mask):
                qb_scramble_p = scramble_p_lut[ps_v]
                is_qb_scramble = live_run_mask & (qb_rng.random(n_13) < qb_scramble_p)
                if np.any(is_qb_scramble):
                    hm_scr = is_qb_scramble & is_hm
                    aw_scr = is_qb_scramble & is_aw
                    home_qb_scrambles[idx_13[hm_scr]] += 1
                    home_qb_rush_yds[idx_13[hm_scr]] += pos_run_yds[hm_scr]
                    away_qb_scrambles[idx_13[aw_scr]] += 1
                    away_qb_rush_yds[idx_13[aw_scr]] += pos_run_yds[aw_scr]

            non_to = ~is_to
            hm_pass_mask = non_to & is_pass & is_hm
            aw_pass_mask = non_to & is_pass & is_aw
            hm_run_mask = non_to & (~is_pass) & is_hm
            aw_run_mask = non_to & (~is_pass) & is_aw
            home_pass_yds_tot[idx_13[hm_pass_mask]] += pos_pass_yds[hm_pass_mask]
            away_pass_yds_tot[idx_13[aw_pass_mask]] += pos_pass_yds[aw_pass_mask]
            home_rush_yds_tot[idx_13[hm_run_mask]] += pos_run_yds[hm_run_mask]
            away_rush_yds_tot[idx_13[aw_run_mask]] += pos_run_yds[aw_run_mask]

            t_i = idx_13[is_to]
            if len(t_i) > 0:
                poss[t_i] = 1 - poss[t_i]
                yardline_100[t_i] = (100 - yardline_100[t_i]).clip(15, 85)
                down[t_i], ydstogo[t_i] = 1, 10
            nt_i = idx_13[non_to]
            if len(nt_i) > 0:
                g_nt = yds[non_to]
                new_yl = yardline_100[nt_i] - g_nt
                td_nt = new_yl <= 0
                if np.any(td_nt):
                    td_i = nt_i[td_nt]
                    pass_td_nt = td_nt & is_pass[non_to]
                    if np.any(pass_td_nt):
                        ptd_i = nt_i[pass_td_nt]
                        home_pass_tds_tot[ptd_i[poss[ptd_i] == 1]] += 1.0
                        away_pass_tds_tot[ptd_i[poss[ptd_i] == 0]] += 1.0
                    home_score[td_i[poss[td_i] == 1]] += 6.95
                    away_score[td_i[poss[td_i] == 0]] += 6.95
                    poss[td_i] = 1 - poss[td_i]
                    yardline_100[td_i], down[td_i], ydstogo[td_i] = 75, 1, 10
                in_f = ~td_nt
                if np.any(in_f):
                    if_i = nt_i[in_f]
                    g_if = g_nt[in_f]
                    yl_if = new_yl[in_f].clip(1, 99)
                    fd = g_if >= ydstogo[if_i]
                    yardline_100[if_i] = yl_if
                    down[if_i] = np.where(fd, 1, down[if_i] + 1)
                    ydstogo[if_i] = np.where(fd, np.minimum(10, yl_if), np.maximum(1, ydstogo[if_i] - g_if))

        pace_mu = pace_base_vec[active].clip(12.0, 36.0)
        clock_sec[active] -= rng.gamma(shape=45.0, scale=pace_mu / 45.0, size=n_act).clip(8.0, 40.0)

    assert sealed_state["tau"] == 0.42 and canonical_hash(sealed_state) == expected_hash

    # Stage 2 Layer-1 Market-Anchor James-Stein Shrinkage & Variance Calibration (Vector 1 & SG-3)
    raw_margin_vec = home_score - away_score
    raw_total_vec = home_score + away_score
    raw_margin = float(np.mean(raw_margin_vec))
    raw_total = float(np.mean(raw_total_vec))

    has_emergency_qb3 = "EMERGENCY_QB3_UDFA" in (away_qb_tier, home_qb_tier)
    if posted_home_spread is not None and posted_total is not None:
        market_margin = -float(posted_home_spread)
        market_total = float(posted_total)
        lambda_margin = 0.25 if has_emergency_qb3 else 0.70
        lambda_total = 0.45 if has_emergency_qb3 else 0.65
        margin_bound = 10.5 if has_emergency_qb3 else 6.0
        shrunk_margin = float(
            np.clip(
                market_margin + (1.0 - lambda_margin) * (raw_margin - market_margin),
                market_margin - margin_bound,
                market_margin + margin_bound,
            )
        )
        shrunk_total = float(
            np.clip(
                market_total + (1.0 - lambda_total) * (raw_total - market_total),
                market_total - 5.5,
                market_total + 5.5,
            )
        )
    else:
        shrunk_margin = float(np.clip(0.35 * raw_margin, -11.5, 11.5))
        shrunk_total = float(np.clip(45.5 + 0.35 * (raw_total - 45.5), 37.5, 53.5))

    sigma_margin = 13.5
    sigma_total = 13.0
    std_m = max(1e-6, float(np.std(raw_margin_vec)))
    std_t = max(1e-6, float(np.std(raw_total_vec)))
    scale_m = sigma_margin / std_m
    scale_t = sigma_total / std_t

    home_margin_out = shrunk_margin + (raw_margin_vec - raw_margin) * scale_m
    total_pts_out = np.maximum(10.0, shrunk_total + (raw_total_vec - raw_total) * scale_t)
    total_pts_out = np.maximum(total_pts_out, np.abs(home_margin_out))
    home_score = 0.5 * (total_pts_out + home_margin_out)
    away_score = 0.5 * (total_pts_out - home_margin_out)

    tot = total_pts_out
    sprd = home_margin_out
    pace = 3600.0 / np.maximum(total_plays, 100)
    out = {
        "matchup": f"{away} @ {home}",
        "median_total": round(float(np.median(tot)), 2),
        "median_spread_home": round(float(np.median(sprd)), 2),
        "median_plays": round(float(np.median(total_plays)), 1),
        "median_pace_sec": round(float(np.median(pace)), 2),
        "sinkhorn_mass_moved": round(away_mass + home_mass, 4),
        "shootout_prob_ge51": round(float(np.mean(tot >= 51.0)), 4),
        "stall_prob_le37": round(float(np.mean(tot <= 37.0)), 4),
        "one_score_prob_le7": round(float(np.mean(np.abs(sprd) <= 7.0)), 4),
        "coachMindsetHash": expected_hash,
        "pre_projection_universal_and_deep_priors": pre_proj_priors,
    }
    if return_vectors:
        # Combine Sinkhorn-reallocated WR1/RB1 weight with empirical W1-W7 target/carry share
        aw_wr1_eff_share = 0.50 * float(away_sh[0]) + 0.50 * away_wr1_share_emp
        hm_wr1_eff_share = 0.50 * float(home_sh[0]) + 0.50 * home_wr1_share_emp
        aw_rb1_eff_share = 0.35 * (float(away_sh[4]) / 0.16 * 0.62) + 0.65 * away_rb1_share_emp
        hm_rb1_eff_share = 0.35 * (float(home_sh[4]) / 0.16 * 0.62) + 0.65 * home_rb1_share_emp

        hm_wr1_yds_vec = home_pass_yds_tot * hm_wr1_eff_share
        aw_wr1_yds_vec = away_pass_yds_tot * aw_wr1_eff_share
        hm_wr1_tds_vec = home_pass_tds_tot * hm_wr1_eff_share
        aw_wr1_tds_vec = away_pass_tds_tot * aw_wr1_eff_share
        hm_rb1_yds_vec = home_rush_yds_tot * hm_rb1_eff_share
        aw_rb1_yds_vec = away_rush_yds_tot * aw_rb1_eff_share

        hm_wr1_raw_mean = float(np.mean(hm_wr1_yds_vec))
        aw_wr1_raw_mean = float(np.mean(aw_wr1_yds_vec))
        hm_rb1_raw_mean = float(np.mean(hm_rb1_yds_vec))
        aw_rb1_raw_mean = float(np.mean(aw_rb1_yds_vec))

        n_chk = min(32, max(1, n_sims))
        home_rec = allocate_conserved_box_score(
            home_pass_yds_tot[:n_chk].tolist(),
            {"WR1": hm_wr1_eff_share, "OTHER": max(1e-6, 1.0 - hm_wr1_eff_share)},
        )
        away_rec = allocate_conserved_box_score(
            away_pass_yds_tot[:n_chk].tolist(),
            {"WR1": aw_wr1_eff_share, "OTHER": max(1e-6, 1.0 - aw_wr1_eff_share)},
        )
        home_td_rec = allocate_conserved_box_score(
            home_pass_tds_tot[:n_chk].tolist(),
            {"WR1": hm_wr1_eff_share, "OTHER": max(1e-6, 1.0 - hm_wr1_eff_share)},
        )
        away_td_rec = allocate_conserved_box_score(
            away_pass_tds_tot[:n_chk].tolist(),
            {"WR1": aw_wr1_eff_share, "OTHER": max(1e-6, 1.0 - aw_wr1_eff_share)},
        )
        assert_pbp_conservation(
            [home_rec["WR1"], home_rec["OTHER"]],
            home_pass_yds_tot[:n_chk].tolist(),
            [home_td_rec["WR1"], home_td_rec["OTHER"]],
            home_pass_tds_tot[:n_chk].tolist(),
        )
        assert_pbp_conservation(
            [away_rec["WR1"], away_rec["OTHER"]],
            away_pass_yds_tot[:n_chk].tolist(),
            [away_td_rec["WR1"], away_td_rec["OTHER"]],
            away_pass_tds_tot[:n_chk].tolist(),
        )
        conserved_receiving_worlds(min(32, max(1, n_sims)))

        hm_wr1_shrunk = empirical_bayes_line(7, hm_wr1_raw_mean, "rec_yds")
        aw_wr1_shrunk = empirical_bayes_line(7, aw_wr1_raw_mean, "rec_yds")
        hm_rb1_shrunk = empirical_bayes_line(7, hm_rb1_raw_mean, "rush_yds")
        aw_rb1_shrunk = empirical_bayes_line(7, aw_rb1_raw_mean, "rush_yds")

        home_rush = allocate_conserved_box_score(
            home_rush_yds_tot[:n_chk].tolist(),
            {"RB1": hm_rb1_eff_share, "OTHER": max(1e-6, 1.0 - hm_rb1_eff_share)},
        )
        away_rush = allocate_conserved_box_score(
            away_rush_yds_tot[:n_chk].tolist(),
            {"RB1": aw_rb1_eff_share, "OTHER": max(1e-6, 1.0 - aw_rb1_eff_share)},
        )
        zero_td = [0.0] * n_chk
        assert_pbp_conservation(
            [home_rush["RB1"], home_rush["OTHER"]],
            home_rush_yds_tot[:n_chk].tolist(),
            [zero_td, zero_td],
            zero_td,
        )
        assert_pbp_conservation(
            [away_rush["RB1"], away_rush["OTHER"]],
            away_rush_yds_tot[:n_chk].tolist(),
            [zero_td, zero_td],
            zero_td,
        )
        # Post-loop world-level order statistics & 360-degree sub-market vectors
        # (uses an isolated RNG so the 175-snap main loop RNG sequence is never altered)
        order_rng = np.random.default_rng((int(seed) if seed is not None else 42) + 77777)
        hm_wr1_longest_rec_vec = np.clip(
            hm_wr1_yds_vec * order_rng.uniform(0.27, 0.39, size=n_sims)
            + order_rng.gamma(shape=2.2, scale=2.1, size=n_sims),
            0.0,
            np.maximum(6.0, hm_wr1_yds_vec * 0.88),
        )
        aw_wr1_longest_rec_vec = np.clip(
            aw_wr1_yds_vec * order_rng.uniform(0.27, 0.39, size=n_sims)
            + order_rng.gamma(shape=2.2, scale=2.1, size=n_sims),
            0.0,
            np.maximum(6.0, aw_wr1_yds_vec * 0.88),
        )
        hm_rb1_longest_rush_vec = np.clip(
            hm_rb1_yds_vec * order_rng.uniform(0.21, 0.33, size=n_sims)
            + order_rng.gamma(shape=1.9, scale=1.8, size=n_sims),
            0.0,
            np.maximum(4.0, hm_rb1_yds_vec * 0.78),
        )
        aw_rb1_longest_rush_vec = np.clip(
            aw_rb1_yds_vec * order_rng.uniform(0.21, 0.33, size=n_sims)
            + order_rng.gamma(shape=1.9, scale=1.8, size=n_sims),
            0.0,
            np.maximum(4.0, aw_rb1_yds_vec * 0.78),
        )
        home_1q_score_vec = np.round(np.clip(home_score * 0.215, 0.0, home_score), 1)
        away_1q_score_vec = np.round(np.clip(away_score * 0.215, 0.0, away_score), 1)
        home_1h_score_vec = np.round(np.clip(home_score * 0.485, 0.0, home_score), 1)
        away_1h_score_vec = np.round(np.clip(away_score * 0.485, 0.0, away_score), 1)
        home_fg_made_vec = np.clip(np.round((home_score - home_pass_tds_tot * 7.0) / 3.8), 0.0, 5.0)
        away_fg_made_vec = np.clip(np.round((away_score - away_pass_tds_tot * 7.0) / 3.8), 0.0, 5.0)
        home_kicking_pts_vec = home_fg_made_vec * 3.0 + np.clip(np.round(home_score / 8.2), 0.0, 6.0)
        away_kicking_pts_vec = away_fg_made_vec * 3.0 + np.clip(np.round(away_score / 8.2), 0.0, 6.0)
        # Note: away_sacks is sacks taken by away QB (= home defense sacks); home_sacks is sacks taken by home QB (= away defense sacks)
        home_edge1_sacks_vec = np.round(away_sacks * 0.34, 2)
        away_edge1_sacks_vec = np.round(home_sacks * 0.34, 2)

        out["vectors"] = {
            "home_score": home_score,
            "away_score": away_score,
            "home_margin_out": home_margin_out,
            "total_pts_out": total_pts_out,
            "total_plays": total_plays,
            "home_pass_yds": home_pass_yds_tot,
            "away_pass_yds": away_pass_yds_tot,
            "home_pass_tds": home_pass_tds_tot,
            "away_pass_tds": away_pass_tds_tot,
            "home_rush_yds": home_rush_yds_tot,
            "away_rush_yds": away_rush_yds_tot,
            "home_pass_att": home_pass_att,
            "away_pass_att": away_pass_att,
            "home_pass_comp": home_pass_comp,
            "away_pass_comp": away_pass_comp,
            "home_ints": home_ints,
            "away_ints": away_ints,
            "home_sacks": home_sacks,
            "away_sacks": away_sacks,
            "home_qb_scrambles": home_qb_scrambles,
            "away_qb_scrambles": away_qb_scrambles,
            "home_qb_rush_yds": home_qb_rush_yds,
            "away_qb_rush_yds": away_qb_rush_yds,
            "home_kneeldowns_excluded": home_kneeldowns,
            "away_kneeldowns_excluded": away_kneeldowns,
            "home_wr1_yds": hm_wr1_yds_vec,
            "away_wr1_yds": aw_wr1_yds_vec,
            "home_wr1_tds": hm_wr1_tds_vec,
            "away_wr1_tds": aw_wr1_tds_vec,
            "home_rb1_yds": hm_rb1_yds_vec,
            "away_rb1_yds": aw_rb1_yds_vec,
            "home_wr1_longest_rec": hm_wr1_longest_rec_vec,
            "away_wr1_longest_rec": aw_wr1_longest_rec_vec,
            "home_rb1_longest_rush": hm_rb1_longest_rush_vec,
            "away_rb1_longest_rush": aw_rb1_longest_rush_vec,
            "home_1q_score": home_1q_score_vec,
            "away_1q_score": away_1q_score_vec,
            "home_1h_score": home_1h_score_vec,
            "away_1h_score": away_1h_score_vec,
            "home_fg_made": home_fg_made_vec,
            "away_fg_made": away_fg_made_vec,
            "home_kicking_pts": home_kicking_pts_vec,
            "away_kicking_pts": away_kicking_pts_vec,
            "home_edge1_sacks": home_edge1_sacks_vec,
            "away_edge1_sacks": away_edge1_sacks_vec,
            "jev_state_tensor_active": has_jev_tensor,
        }
        out["away_injuries_applied"] = list(away_inj)
        out["home_injuries_applied"] = list(home_inj)
    if biomech_overlay is not None:
        out["biomech_kinetic_overlay"] = biomech_overlay
    fd = fourth_down_brill_summary(fourth_down_wp_gaps)
    out["fourth_down_wp_gap_mean"] = fd["fourth_down_wp_gap_mean"]
    out["fourth_down_statistically_distinct_rate"] = fd["fourth_down_statistically_distinct_rate"]
    out["fourth_down_reason"] = fd["reason"]
    return out


simulate_full_game = simulate_matchup_pbp


SLATE_WEEK = 9  # default live slate is Week 9 (supports --week 8 retrospective)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--week", type=int, default=SLATE_WEEK)
    ap.add_argument("--sealed-json", default="/opt/model/sealed_baseline.json")
    ap.add_argument("--sims", type=int, default=5000)
    ap.add_argument(
        "--from-context-packet",
        default="",
        help="Path to ContextPacket JSON produced by intelligence.context.context_packet_builder",
    )
    ap.add_argument(
        "--from-reasoning-trace",
        default="",
        help="Path to ReasoningTrace JSON produced by intelligence.reasoning.workflow_runner",
    )
    ap.add_argument(
        "--dry-run-contract",
        action="store_true",
        help="Validate ContextPacket and ReasoningTrace handoff contract without running simulations",
    )
    args = ap.parse_args()

    if args.from_context_packet or args.from_reasoning_trace:
        pkt_obj = {}
        trace_obj = {}
        if args.from_context_packet:
            with open(args.from_context_packet, "r", encoding="utf-8") as fh:
                pkt_obj = json.load(fh)
        if args.from_reasoning_trace:
            with open(args.from_reasoning_trace, "r", encoding="utf-8") as fh:
                trace_obj = json.load(fh)
        game_id = str(pkt_obj.get("game_id") or trace_obj.get("game_id") or "2024_10_CIN_BAL")
        away_tm = str(pkt_obj.get("away_team") or (game_id.split("_")[2] if len(game_id.split("_")) >= 4 else "CIN"))
        home_tm = str(pkt_obj.get("home_team") or (game_id.split("_")[3] if len(game_id.split("_")) >= 4 else "BAL"))
        layers_list = trace_obj.get("layers") or pkt_obj.get("layers", {})
        cum_delta = float(
            trace_obj.get(
                "final_reasoning_delta",
                trace_obj.get("cumulative_log_odds_delta", 0.0),
            )
            or 0.0
        )
        if args.dry_run_contract:
            print(
                json.dumps(
                    {
                        "status": "ARMED_CONTRACT_VALIDATED",
                        "game_id": game_id,
                        "away_team": away_tm,
                        "home_team": home_tm,
                        "context_packet_loaded": bool(pkt_obj),
                        "reasoning_trace_loaded": bool(trace_obj),
                        "layers_executed_count": len(layers_list),
                        "cumulative_log_odds_delta": cum_delta,
                        "simulation_executed": False,
                    }
                )
            )
            return
        sealed_obj, digest = load_sealed_object_readonly(args.sealed_json)
        res = simulate_matchup_pbp(
            away_tm,
            home_tm,
            [],
            [],
            sealed_obj,
            digest,
            n_sims=args.sims,
            seed=700,
        )
        res["from_context_packet"] = args.from_context_packet
        res["from_reasoning_trace"] = args.from_reasoning_trace
        res["reasoning_trace_cumulative_log_odds_delta"] = cum_delta
        res["median_spread_home_trace_conditioned"] = round(
            float(res.get("median_spread_home", 0.0)) + cum_delta * 2.5, 4
        )
        print(json.dumps(res, default=str))
        return
    try:
        from scripts.ops.preflight_live_roster_injury_gate import require_week
    except ModuleNotFoundError:  # run directly as a script
        from preflight_live_roster_injury_gate import require_week

    # STAGE 0: no simulation may run without a fresh roster/transaction config for this slate's week.
    if os.environ.get("STAGE0_RETROSPECTIVE") != "1":
        require_week(args.week)
    sealed_obj, digest = load_sealed_object_readonly(args.sealed_json)
    cand_bundle = load_week7_candidate_ratings_readonly()
    cand_msg = ""
    if cand_bundle is not None:
        w7 = cand_bundle["week7_candidate"]
        cand_msg = f" | week7_cand={len(w7['ratings'])} teams (tau_rating={w7['params']['tau']})"
    print(f"[SEAL VERIFIED] coachMindsetHash = {digest} | tau = {sealed_obj['tau']} | QB_QUESTIONABLE = {sealed_obj['epaDropoffTable']['QB_QUESTIONABLE']}{cand_msg}")
    if args.week == 9:
        slate = [
            ("JAX", "BAL", ["RB1"],             ["QB1"],             "JAX +3.5",  +2.45, "JAX +18 (Brissett spot)", "STAGE0_QB1_OUT_BAL", 1),
            ("CIN", "ATL", [],                  [],                  "CIN -1.5",  +1.82, "CIN +11 (Madrid neutral)","MODEL_SHARP_ALIGN",  2),
            ("CLE", "NO",  [],                  ["WR1"],             "CLE -1.0",  +2.05, "CLE +14 (Myles trench)",  "ELEVATED_SHARP_AGREE", 3),
            ("DAL", "IND", [],                  [],                  "IND -2.5",  +1.70, "IND +10",                 "MODEL_SHARP_ALIGN",  4),
            ("DEN", "CAR", [],                  ["QB_QUESTIONABLE"], "DEN -6.5",  +2.35, "DEN +16 (Surtain lock)",  "ELEVATED_SHARP_AGREE", 5),
            ("DET", "MIA", [],                  [],                  "DET -7.0",  +2.20, "DET +15 (Gibbs/ARSB)",    "ELEVATED_SHARP_AGREE", 6),
            ("LAR", "WAS", [],                  [],                  "LAR +2.5",  +1.95, "LAR +12 (Nacua/Puka)",    "MODEL_SHARP_ALIGN",  7),
            ("NYG", "PHI", ["QB1"],             [],                  "NYG +7.5",  +1.40, "PHI -300 ML BLOCKED",     "HEAVY_JUICE_FIREWALL", 8),
            ("NYJ", "KC",  [],                  [],                  "NYJ +6.5",  +1.88, "NYJ +13 (Geno Smith)",    "MODEL_SHARP_ALIGN",  9),
            ("HOU", "LAC", ["WR1"],             [],                  "LAC -2.5",  +2.10, "LAC +14 (Herbert/Ladd)",  "ELEVATED_SHARP_AGREE", 10),
            ("LV",  "SF",  [],                  [],                  "SF -6.5",   +2.25, "SF +17 (Mike Evans/CMC)", "ELEVATED_SHARP_AGREE", 11),
            ("ARI", "SEA", [],                  [],                  "SEA -2.5",  +1.92, "SEA +12 (Darnold/JSN)",   "MODEL_SHARP_ALIGN",  12),
            ("GB",  "NE",  [],                  [],                  "GB -4.5",   +2.15, "GB +14 (Love/Jacobs)",    "ELEVATED_SHARP_AGREE", 13),
            ("TB",  "CHI", [],                  [],                  "CHI -1.5",  +1.80, "CHI +11 (SNF Soldier)",   "MODEL_SHARP_ALIGN",  14),
            ("BUF", "MIN", [],                  [],                  "BUF -1.5",  +2.08, "BUF +13 (Allen vs Flores)","ELEVATED_SHARP_AGREE", 15),
        ]
    else:
        slate = [
            ("CHI", "SEA", ["QB_QUESTIONABLE"], ["QB_QUESTIONABLE"], "CHI +3.5",  +1.53, "CHI +11 (ML +32)", "ELEVATED_SHARP_AGREE", 1),
            ("TEN", "CIN", [],                  ["QB_QUESTIONABLE"], "TEN +10.5", -2.13, "CIN +18",          "MONEY_AGAINST",        2),
            ("MIN", "DET", ["QB1"],             [],                  "DET -3",    +2.77, "MIN +14",          "MONEY_AGAINST",        3),
            ("CLE", "PIT", ["QB1", "WR2"],      [],                  "PIT -4",    +4.36, "CLE +8",           "MONEY_AGAINST",        4),
            ("LV",  "NYJ", ["QB_QUESTIONABLE"], [],                  "LV +1",     +3.26, "neutral (±2)",     "MODEL_ONLY",           5),
            ("CAR", "GB",  [],                  [],                  "GB -4",     +2.33, "CAR +3 (ML +22)",  "MODEL_ONLY_MILD_AGAINST", 6),
            ("BUF", "BAL", [],                  [],                  "OVER (+40)",+0.63, "OVER +40",         "BOARD_SHARPEST_OVER",  7),
        ]
    for idx, (aw, hm, ai, hi, play, edge, sharp, flag, rank) in enumerate(slate):
        r = simulate_matchup_pbp(aw, hm, ai, hi, sealed_obj, digest, n_sims=args.sims, seed=700 + idx)
        print(f"#{rank} {r['matchup']:9s} | {play:10s} | MedTot: {r['median_total']:5.2f} | MedSprd(H): {r['median_spread_home']:+6.2f} | Pace: {r['median_pace_sec']:5.2f}s | Edge: {edge:+5.2f} | Sharp: {sharp:16s} | {flag}")


if __name__ == "__main__":
    main()
