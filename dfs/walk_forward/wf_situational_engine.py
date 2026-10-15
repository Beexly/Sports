"""Autonomous PIT Situational Metric Engine and Walk-Forward CRPS Harness.

Enforces GALAXY_LOCKED_STATE:
- mu = market_close (spread_line locked; zero mean shift)
- vision_weight = 0.0
- zero_imputation = True (missing or future observed_at fails closed -> None)
- CVI locked at REFUSED (e51c4c91); zero retuning permitted
- Gate: CRPS <= 7.099 on n >= 150 across the 2,462 regular-season game filter
"""
from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

GAUSSIAN_SIGMA_BASE: float = 13.45
LAPLACE_B_BASE: float = 13.45 / math.sqrt(2.0)
BASELINE_GAUSSIAN_CRPS: float = 7.1540
BASELINE_LAPLACE_CRPS: float = 7.1597
GATE_CRPS_THRESHOLD: float = 7.099
GATE_MIN_N: int = 150
FILTER_EXPECTED_N: int = 2462

# Terminal lock on CVI per e51c4c91
CVI_TERMINAL_RECORD = {
    "status": "REFUSED",
    "locked": True,
    "commit": "e51c4c91",
    "n_filter": FILTER_EXPECTED_N,
    "delta_two_normal_mix": 0.0016,
    "delta_gaussian_13_45": -0.0004,
    "fitted_beta_sign": "negative",
    "clearance": "NOT CLEARED",
}

STATUS_WEIGHTS: Dict[str, float] = {
    "Out": 1.00,
    "Doubtful": 0.75,
    "Questionable": 0.25,
    "Probable": 0.00,
    "Clear": 0.00,
}

POS_WEIGHTS: Dict[str, float] = {
    "QB": 2.5,
    "T": 1.2, "G": 1.2, "C": 1.2, "OL": 1.2, "OT": 1.2, "OG": 1.2,
    "DE": 1.0, "DT": 1.0, "NT": 1.0, "EDGE": 1.0, "DL": 1.0,
    "CB": 0.8, "S": 0.8, "FS": 0.8, "SS": 0.8, "DB": 0.8,
    "WR": 0.7, "TE": 0.7,
    "LB": 0.6, "ILB": 0.6, "OLB": 0.6, "MLB": 0.6,
    "RB": 0.5, "FB": 0.5,
}


def parse_ts_utc(value: object) -> Optional[datetime]:
    """Parse an ISO-8601 timestamp strictly into UTC. Returns None on missing/invalid."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).strip()
    if s in ("NA", "None", "null", "NaT", "nan"):
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def latest_asof(rows: Sequence[Dict[str, object]], cutoff_utc: Optional[datetime]) -> Optional[Dict[str, object]]:
    """Return the record with the greatest observed_at <= cutoff_utc. Fail-closed on missing stamps."""
    if cutoff_utc is None or not rows:
        return None
    best_row: Optional[Dict[str, object]] = None
    best_ts: Optional[datetime] = None
    for r in rows:
        ts = parse_ts_utc(r.get("observed_at") or r.get("date_modified") or r.get("dt"))
        if ts is None or ts > cutoff_utc:
            continue
        if best_ts is None or ts > best_ts:
            best_ts = ts
            best_row = r
    return best_row


def haversine_miles(lat1: Optional[float], lon1: Optional[float],
                    lat2: Optional[float], lon2: Optional[float]) -> Optional[float]:
    """Deterministic great-circle distance in statute miles. Returns None if any coord is missing."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    if not (math.isfinite(lat1) and math.isfinite(lon1) and math.isfinite(lat2) and math.isfinite(lon2)):
        return None
    r_earth = 3958.7613
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r_earth * math.asin(min(1.0, math.sqrt(a)))


def std_normal_pdf(z: float) -> float:
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def std_normal_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def crps_gaussian(mu_close: float, sigma: float, y_margin: float) -> float:
    """Closed-form CRPS for N(mu_close, sigma^2) with mu locked at market close."""
    if sigma <= 0.0 or not math.isfinite(sigma):
        raise ValueError(f"Invalid Gaussian scale sigma={sigma}")
    z = (y_margin - mu_close) / sigma
    return sigma * (z * (2.0 * std_normal_cdf(z) - 1.0) + 2.0 * std_normal_pdf(z) - 1.0 / math.sqrt(math.pi))


def crps_gaussian_grad_sigma(mu_close: float, sigma: float, y_margin: float) -> Tuple[float, float]:
    """Return (dCRPS/dsigma, d2CRPS/dsigma2) under locked mu_close."""
    z = (y_margin - mu_close) / sigma
    pdf = std_normal_pdf(z)
    grad = 2.0 * pdf - 1.0 / math.sqrt(math.pi)
    hess = (2.0 * (y_margin - mu_close) ** 2 / (sigma ** 3)) * pdf
    return grad, hess


def crps_laplace(mu_close: float, b_scale: float, y_margin: float) -> float:
    """Closed-form CRPS for Laplace(mu_close, b_scale) with mu locked at market close."""
    if b_scale <= 0.0 or not math.isfinite(b_scale):
        raise ValueError(f"Invalid Laplace scale b={b_scale}")
    abs_err = abs(y_margin - mu_close)
    return abs_err + b_scale * math.exp(-abs_err / b_scale) - 0.75 * b_scale


def crps_hybrid_key_numbers(
    mu_close: float,
    b_scale: float,
    key_masses: Dict[int, float],
    y_margin: float,
) -> float:
    """Closed-form CRPS for Laplace + discrete key-number masses preserving E[M] == mu_close."""
    p_disc = sum(key_masses.values())
    if p_disc < 0.0 or p_disc >= 0.95:
        raise ValueError(f"Invalid total discrete mass p_disc={p_disc}")
    w_cont = 1.0 - p_disc
    disc_mean_shift = sum(k * pk for k, pk in key_masses.items())
    mu_cont = (mu_close - disc_mean_shift) / w_cont

    def e_abs_laplace(c: float) -> float:
        d = abs(c - mu_cont)
        return d + b_scale * math.exp(-d / b_scale)

    term1 = w_cont * e_abs_laplace(y_margin) + sum(pk * abs(k - y_margin) for k, pk in key_masses.items())
    e_cont_self = 1.5 * b_scale
    cross_cont_disc = sum(pk * e_abs_laplace(float(k)) for k, pk in key_masses.items())
    disc_self = sum(
        pk * pk_prime * abs(k - k_prime)
        for k, pk in key_masses.items()
        for k_prime, pk_prime in key_masses.items()
    )
    term2 = 0.5 * ((w_cont ** 2) * e_cont_self + 2.0 * w_cont * cross_cont_disc + disc_self)
    return term1 - term2


def compute_bqp(
    out_starters: Sequence[Dict[str, object]],
    kickoff_utc: datetime,
) -> Optional[float]:
    """Compute Backup Quality Premium (BQP) for a game under fail-closed PIT rules.

    Each element in out_starters must represent a verified starter (prior_3w_snap_share > 0.60
    or post-2025 timestamped depth_rank == 1) whose injury report_status in ('Out', 'Doubtful')
    carries observed_at <= kickoff_utc.
    """
    if out_starters is None:
        return None
    total_bqp = 0.0
    for rec in out_starters:
        ts = parse_ts_utc(rec.get("observed_at"))
        if ts is None or ts > kickoff_utc:
            return None  # Fail-closed on unstamped or future-stamped injury/depth row
        status = str(rec.get("report_status", ""))
        if status not in ("Out", "Doubtful"):
            continue
        epa_starter = rec.get("epa_starter_prior")
        epa_backup = rec.get("epa_backup_prior_snap_adj")
        snap_share = rec.get("starter_snap_share_prior_3w")
        pos = str(rec.get("position", ""))
        if epa_starter is None or epa_backup is None or snap_share is None:
            return None
        pos_mult = 2.5 if pos == "QB" else 1.0
        diff = float(epa_starter) - float(epa_backup)
        total_bqp += diff * float(snap_share) * pos_mult
    return max(0.0, total_bqp)


def compute_swcc(
    rest_days_away: Optional[float],
    rest_days_home: Optional[float],
    travel_miles_away: Optional[float],
    prior_snaps_away: Optional[float],
    prior_snaps_home: Optional[float],
    observed_at_meta: Optional[datetime],
    kickoff_utc: datetime,
) -> Optional[float]:
    """Compute Short-Week Chaos Coefficient (SWCC). Fail-closed if travel or prior snaps missing."""
    if observed_at_meta is None or observed_at_meta > kickoff_utc:
        return None
    if (
        rest_days_away is None
        or rest_days_home is None
        or travel_miles_away is None
        or prior_snaps_away is None
        or prior_snaps_home is None
    ):
        return None
    if travel_miles_away < 0.0 or prior_snaps_away <= 0.0 or prior_snaps_home <= 0.0:
        return None
    away_deficit = max(0.0, 7.0 - float(rest_days_away))
    home_deficit = max(0.0, 7.0 - float(rest_days_home))
    away_term = away_deficit * math.log(1.0 + float(travel_miles_away)) * (float(prior_snaps_away) / 1000.0)
    home_term = home_deficit * (float(prior_snaps_home) / 1000.0)
    return away_term + home_term


def compute_ril_team(
    injured_players: Optional[Sequence[Dict[str, object]]],
    rest_days: Optional[float],
    kickoff_utc: datetime,
) -> Optional[float]:
    """Compute Rest-Adjusted Injury Load (RIL) for a single team. Fail-closed on unstamped rows."""
    if injured_players is None or rest_days is None or rest_days <= 0.0:
        return None
    rest_clamped = max(4.0, min(14.0, float(rest_days)))
    rest_mult = math.sqrt(7.0 / rest_clamped)
    load = 0.0
    for p in injured_players:
        ts = parse_ts_utc(p.get("date_modified") or p.get("observed_at"))
        if ts is None or ts > kickoff_utc:
            return None  # Unstamped injury report triggers fail-closed omission
        w_stat = STATUS_WEIGHTS.get(str(p.get("report_status", "")), 0.0)
        if w_stat == 0.0:
            continue
        pos = str(p.get("position", "")).upper()
        w_pos = POS_WEIGHTS.get(pos, 0.5)
        snap_share = p.get("snap_share_prior_3w")
        if snap_share is None or not math.isfinite(float(snap_share)):
            return None
        load += w_stat * w_pos * float(snap_share)
    return rest_mult * load


def compute_ril_game(
    home_injuries: Optional[Sequence[Dict[str, object]]],
    away_injuries: Optional[Sequence[Dict[str, object]]],
    rest_days_home: Optional[float],
    rest_days_away: Optional[float],
    kickoff_utc: datetime,
) -> Optional[float]:
    """Return total Rest-Adjusted Injury Load (RIL_home + RIL_away) or None if either join fails."""
    ril_h = compute_ril_team(home_injuries, rest_days_home, kickoff_utc)
    ril_a = compute_ril_team(away_injuries, rest_days_away, kickoff_utc)
    if ril_h is None or ril_a is None:
        return None
    return ril_h + ril_a


def modulated_sigma(
    sigma_base: float,
    feature_val: Optional[float],
    beta: float,
    mode: str = "linear",
) -> float:
    """Modulate residual dispersion sigma without shifting mu_close.

    If feature_val is None (failed join), returns sigma_base (Fail-Closed).
    """
    if feature_val is None or not math.isfinite(feature_val):
        return sigma_base
    if mode == "exp":
        exponent = max(-0.50, min(0.60, beta * feature_val))
        return sigma_base * math.exp(exponent)
    scaled = sigma_base * (1.0 + beta * max(0.0, feature_val))
    return max(6.0, min(24.0, scaled))


def fit_beta_expanding_window(
    prior_games: Sequence[Tuple[float, float, Optional[float]]],
    sigma_base: float = GAUSSIAN_SIGMA_BASE,
    mode: str = "linear",
    grid_min: float = -0.25,
    grid_max: float = 0.50,
    grid_steps: int = 151,
) -> float:
    """Fit scale coefficient beta strictly on prior games with non-null feature values."""
    valid = [(mu, y, f) for (mu, y, f) in prior_games if f is not None and math.isfinite(f) and f > 0.0]
    if len(valid) < 25:
        return 0.0
    best_beta = 0.0
    best_loss = float("inf")
    step = (grid_max - grid_min) / float(grid_steps - 1)
    for i in range(grid_steps):
        cand_beta = grid_min + i * step
        loss = 0.0
        for mu, y, f in valid:
            sig = modulated_sigma(sigma_base, f, cand_beta, mode=mode)
            loss += crps_gaussian(mu, sig, y)
        if loss < best_loss:
            best_loss = loss
            best_beta = cand_beta
    return round(best_beta, 6)


@dataclass
class WalkForwardDiagnostic:
    feature_name: str
    status: str
    n_filter: int
    n_joined: int
    n_failed_closed: int
    crps_without: float
    crps_with: float
    delta_crps: float
    fitted_beta_last: float
    cleared_gate: bool


def evaluate_feature_walk_forward(
    feature_name: str,
    games: Sequence[Dict[str, object]],
    mode: str = "linear",
) -> WalkForwardDiagnostic:
    """Run strict expanding-window PIT evaluation across the 2,462-game filter.

    Each item in games must contain:
      'season' (int), 'week' (int), 'mu_close' (float), 'y_margin' (float), 'feature_val' (Optional[float])
    """
    if feature_name.upper() == "CVI":
        raise RuntimeError("REFUSED: CVI is locked behind a terminal refusal flag (commit e51c4c91).")

    ordered = sorted(games, key=lambda g: (int(g["season"]), int(g["week"]), str(g.get("game_id", ""))))
    n_total = len(ordered)
    crps_base_sum = 0.0
    crps_mod_sum = 0.0
    n_joined = 0
    n_failed = 0
    last_beta = 0.0

    # Group by (season, week) so fitting uses strictly earlier weeks (< W)
    weeks_seen: List[Tuple[int, int]] = sorted({(int(g["season"]), int(g["week"])) for g in ordered})
    by_week: Dict[Tuple[int, int], List[Dict[str, object]]] = {wk: [] for wk in weeks_seen}
    for g in ordered:
        by_week[(int(g["season"]), int(g["week"]))].append(g)

    prior_pool: List[Tuple[float, float, Optional[float]]] = []
    for wk in weeks_seen:
        beta_wk = fit_beta_expanding_window(prior_pool, sigma_base=GAUSSIAN_SIGMA_BASE, mode=mode)
        last_beta = beta_wk
        for g in by_week[wk]:
            mu = float(g["mu_close"])
            y = float(g["y_margin"])
            f_val = g.get("feature_val")
            f_clean = float(f_val) if (f_val is not None and math.isfinite(float(f_val))) else None
            if f_clean is None:
                n_failed += 1
            else:
                n_joined += 1
            c_base = crps_gaussian(mu, GAUSSIAN_SIGMA_BASE, y)
            sig_adj = modulated_sigma(GAUSSIAN_SIGMA_BASE, f_clean, beta_wk, mode=mode)
            c_mod = crps_gaussian(mu, sig_adj, y)
            crps_base_sum += c_base
            crps_mod_sum += c_mod
        # Append current week to prior_pool only AFTER all games in wk are scored
        for g in by_week[wk]:
            f_val = g.get("feature_val")
            f_clean = float(f_val) if (f_val is not None and math.isfinite(float(f_val))) else None
            prior_pool.append((float(g["mu_close"]), float(g["y_margin"]), f_clean))

    mean_base = crps_base_sum / max(1, n_total)
    mean_mod = crps_mod_sum / max(1, n_total)
    delta = mean_mod - mean_base
    status = "ACCEPTED_CANDIDATE" if delta < 0.0 else "REFUSED"
    cleared = (n_total >= GATE_MIN_N) and (mean_mod <= GATE_CRPS_THRESHOLD) and (delta < 0.0)
    return WalkForwardDiagnostic(
        feature_name=feature_name,
        status=status,
        n_filter=n_total,
        n_joined=n_joined,
        n_failed_closed=n_failed,
        crps_without=round(mean_base, 4),
        crps_with=round(mean_mod, 4),
        delta_crps=round(delta, 4),
        fitted_beta_last=last_beta,
        cleared_gate=cleared,
    )

