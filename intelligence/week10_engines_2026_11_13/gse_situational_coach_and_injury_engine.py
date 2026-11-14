"""
Unified Galaxy Sports Edge (GSE) Situational Metrics, Glicko-2 Bye-RD,
Coach-Mind Tuesday Lock, and Log-Domain Sinkhorn Injury & Scheme Engine.

Ready to wire directly into ``Beexly/Sports``:
1. Orthogonal Situational Metrics (``GSE_PROPRIETARY_SEVEN`` + ``SAI``) & PIT Guards:
   - ``BQP`` (Backup Quality Premium), ``SWCC`` (Short-Week Chaos Coefficient),
     ``RIL`` (Rest-Adjusted Injury Load), ``QPTSR`` (QB Quick-Pressure-to-Sack Residual),
     ``OLCAI`` (OL Continuity & Trench Attrition Index), ``SPESE`` (Situational Pace &
     Explosive-to-Stall Entropy), ``CAOFI`` (Circadian-Altitude-Officiating Friction Index),
     Mahalanobis-Cholesky joint feature orthogonalization, and Situational Asymmetry Index (``SAI``).
   - Strict Point-In-Time (PIT) temporal leakage guards: ``date_modified <= kickoff - 90m``
     (configurable buffer), ``nflreadr`` depth charts restricted strictly to ``season >= 2025``,
     2025 unstamped injury parquet rejection, strict ``(s, w) < (S, W)`` prior-window isolation,
     and terminal CVI refusal lock (commit ``e51c4c91``).
2. Complete Glicko-2 Illinois-Method Rating & Volatility Solver:
   - Sealed ``tau = 0.42`` default (per ``sealed-center.json``, configurable e.g. ``0.50``).
   - Explicit idle-period NFL bye-week Rating Deviation expansion:
     ``phi' = sqrt(phi^2 + sigma^2)`` (rating and sigma unchanged, zero volatility solve).
3. Upgraded Injury Overlay + Tuesday v1.0 Coach-Mind Lock + Scheme-Matchup OT:
   - Immutable sealed ``EPA_DROPOFF`` table within ``[0.5, 1.2]`` verified by canonical SHA-256.
   - Log-domain stabilized Sinkhorn-Knopp Optimal Transport (``logsumexp`` dual potentials) for
     both post-injury target/touch reallocation and 7x7 NFL Offensive-Scheme vs. Defensive-Shell
     coupling.
   - Deterministic ``coachMindsetHash`` Tuesday 04:00 CT (``v1.0``) sealing invariant across
     ``v2.0``/``v2.5``/``v3.0``/``v4.0`` injury overlays, ``-5.2pt`` isotonic probability
     calibration, closed-root Shin de-vig, external Grok conformal diagnostic flag, and
     Merkle anti-hallucination gate.
   - Pre-built 2026 NFL Week 10 live situational & injury evaluations across all 13 remaining
     Week 10 games and 4 bye-week teams (``CHI``, ``DEN``, ``PHI``, ``TB``), outputting integer
     ``XX/100`` scores only, zero public NGS figures, and zero legacy record strings.
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from types import MappingProxyType
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)

# ============================================================================ #
# 1. Constitutional Locks & Constants (GALAXY_LOCKED_STATE)
# ============================================================================ #

GAUSSIAN_SIGMA_BASE: float = 13.45
LAPLACE_B_BASE: float = 13.45 / math.sqrt(2.0)
BASELINE_GAUSSIAN_CRPS: float = 7.1540
BASELINE_LAPLACE_CRPS: float = 7.1597
GATE_CRPS_THRESHOLD: float = 7.099
GATE_MIN_N: int = 150
FILTER_EXPECTED_N: int = 2462

PIT_DEFAULT_BUFFER_MINUTES: float = 90.0
MIN_DEPTH_CHART_SEASON: int = 2025

GLICKO2_SCALE: float = 173.7178
TAU_SEALED: float = 0.42
TAU_CANONICAL: float = 0.50
ILLINOIS_TOL: float = 1e-6

EPA_FACTOR_MIN: float = 0.5
EPA_FACTOR_MAX: float = 1.2
SHARE_SUM_TOL: float = 1e-9

_SINKHORN_EPS: float = 0.05
_SINKHORN_MAX_ITER: int = 300
_SINKHORN_TOL: float = 1e-8

GSE_PROPRIETARY_SEVEN: Tuple[str, ...] = (
    "BQP",
    "SWCC",
    "RIL",
    "QPTSR",
    "OLCAI",
    "SPESE",
    "CAOFI",
)

CVI_TERMINAL_RECORD: Mapping[str, Any] = MappingProxyType(
    {
        "status": "REFUSED",
        "locked": True,
        "commit": "e51c4c91",
        "n_filter": FILTER_EXPECTED_N,
        "delta_two_normal_mix": 0.0016,
        "delta_gaussian_13_45": -0.0004,
        "fitted_beta_sign": "negative",
        "clearance": "NOT CLEARED",
        "note": "Terminal refusal. Pre-2025 depth charts lack observed_at; per-defender coverage EPA absent.",
    }
)

STATUS_WEIGHTS: Mapping[str, float] = MappingProxyType(
    {
        "IR": 1.00,
        "Out": 1.00,
        "OUT": 1.00,
        "Doubtful": 0.75,
        "DOUBTFUL": 0.75,
        "Questionable": 0.25,
        "QUESTIONABLE": 0.25,
        "Probable": 0.00,
        "PROBABLE": 0.00,
        "Clear": 0.00,
        "Active": 0.00,
    }
)

POS_WEIGHTS: Mapping[str, float] = MappingProxyType(
    {
        "QB": 2.5,
        "T": 1.2,
        "G": 1.2,
        "C": 1.2,
        "OL": 1.2,
        "OT": 1.2,
        "OG": 1.2,
        "LT": 1.2,
        "RT": 1.2,
        "LG": 1.2,
        "RG": 1.2,
        "DE": 1.0,
        "DT": 1.0,
        "NT": 1.0,
        "EDGE": 1.0,
        "DL": 1.0,
        "CB": 0.8,
        "S": 0.8,
        "FS": 0.8,
        "SS": 0.8,
        "DB": 0.8,
        "WR": 0.7,
        "TE": 0.7,
        "SLOT": 0.7,
        "LB": 0.6,
        "ILB": 0.6,
        "OLB": 0.6,
        "MLB": 0.6,
        "RB": 0.5,
        "FB": 0.5,
    }
)

# Sealed Tuesday 04:00 CT EPA positional replacement-to-starter ratios
EPA_DROPOFF: Mapping[str, float] = MappingProxyType(
    {
        "QB1": 0.78,
        "QB2": 0.68,
        "RB1": 0.85,
        "RB2": 0.90,
        "WR1": 0.82,
        "WR2": 0.88,
        "WR3": 0.92,
        "SLOT": 0.89,
        "TE1": 0.84,
        "TE2": 0.91,
        "OL": 0.91,
        "LT": 0.88,
        "CB1": 0.84,
        "EDGE": 0.87,
    }
)

CADENCE_SCHEDULE_CT: Mapping[str, str] = MappingProxyType(
    {
        "v1.0": "Tue 04:00 CT",
        "v2.0": "Wed 17:00 CT",
        "v2.5": "Thu 16:30 CT",
        "v3.0": "Fri 16:30 CT",
        "v4.0": "Sun T-90m",
    }
)


def canonical_sha256(obj: Any) -> str:
    """Deterministic SHA-256 over canonical sorted-key JSON serialization."""
    blob = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def epa_table_sha256(table: Mapping[str, float] = EPA_DROPOFF) -> str:
    """Return canonical 64-hex SHA-256 of a sealed EPA dropoff mapping."""
    return canonical_sha256({str(k): float(v) for k, v in table.items()})


EPA_DROPOFF_SHA256: str = epa_table_sha256(EPA_DROPOFF)


# ============================================================================ #
# 2. Point-In-Time (PIT) Temporal Leakage Guards
# ============================================================================ #


class DataGapError(RuntimeError):
    """Raised when live injury/feed gate conditions are violated."""


def parse_ts_utc(value: object) -> Optional[datetime]:
    """Parse an ISO-8601 timestamp strictly into UTC. Returns None on missing/invalid."""
    if value is None or value == "" or isinstance(value, bool):
        return None
    if isinstance(value, datetime):
        return (
            value.astimezone(timezone.utc)
            if value.tzinfo is not None
            else value.replace(tzinfo=timezone.utc)
        )
    s = str(value).strip()
    if s in ("NA", "None", "null", "NaT", "nan", "N/A"):
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


def pit_cutoff_utc(
    kickoff_utc: datetime,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> datetime:
    """Compute exact UTC cutoff ``kickoff_utc - buffer_minutes`` (default T-90m)."""
    ko = parse_ts_utc(kickoff_utc)
    if ko is None:
        raise ValueError("kickoff_utc must be a valid timestamp")
    if buffer_minutes < 0.0 or not math.isfinite(buffer_minutes):
        raise ValueError(f"Invalid PIT buffer_minutes={buffer_minutes}")
    return ko - timedelta(minutes=float(buffer_minutes))


def validate_pit_timestamp(
    ts_raw: object,
    kickoff_utc: datetime,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> Optional[datetime]:
    """Return parsed UTC datetime iff ``ts <= kickoff_utc - buffer_minutes``, else None."""
    ts = parse_ts_utc(ts_raw)
    if ts is None:
        return None
    cutoff = pit_cutoff_utc(kickoff_utc, buffer_minutes=buffer_minutes)
    if ts > cutoff:
        return None
    return ts


def validate_prior_window(
    record_season: int,
    record_week: int,
    target_season: int,
    target_week: int,
) -> bool:
    """
    Enforce strict prior-window isolation ``(s, w) < (S, W)`` with ``w > 0``.
    Blocks ``week == 0`` full-season summary leaks and same-week/future lookahead.
    """
    if record_week <= 0 or target_week <= 0:
        return False
    return (int(record_season), int(record_week)) < (int(target_season), int(target_week))


def validate_depth_chart_pit(
    row: Mapping[str, object],
    kickoff_utc: datetime,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> bool:
    """
    Enforce nflreadr depth-chart PIT law:
    - Seasons < 2025 are permanently blocked (lack scrape timestamps / retroactive overwrites).
    - Seasons >= 2025 require explicit ISO timestamp ``dt`` or ``observed_at`` <= kickoff - buffer.
    """
    season_raw = row.get("season")
    if season_raw is None or isinstance(season_raw, bool):
        return False
    try:
        season = int(str(season_raw))
    except ValueError:
        return False
    if season < MIN_DEPTH_CHART_SEASON:
        return False
    ts_raw = row.get("dt") or row.get("observed_at")
    return validate_pit_timestamp(ts_raw, kickoff_utc, buffer_minutes=buffer_minutes) is not None


def validate_injury_pit(
    row: Mapping[str, object],
    kickoff_utc: datetime,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> bool:
    """
    Enforce nflverse injury PIT law:
    - Requires explicit ``date_modified`` or ``observed_at`` <= kickoff - buffer (default 90m).
    - Automatically rejects 2025 unstamped parquet rows (zero imputation).
    """
    ts_raw = row.get("date_modified") or row.get("observed_at")
    return validate_pit_timestamp(ts_raw, kickoff_utc, buffer_minutes=buffer_minutes) is not None


def latest_asof(
    rows: Sequence[Mapping[str, object]],
    kickoff_utc: Optional[datetime],
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> Optional[Dict[str, object]]:
    """Return record with greatest timestamp <= kickoff_utc - buffer_minutes. Fail-closed."""
    if kickoff_utc is None or not rows:
        return None
    cutoff = pit_cutoff_utc(kickoff_utc, buffer_minutes=buffer_minutes)
    best_row: Optional[Dict[str, object]] = None
    best_ts: Optional[datetime] = None
    for r in rows:
        ts = parse_ts_utc(r.get("observed_at") or r.get("date_modified") or r.get("dt"))
        if ts is None or ts > cutoff:
            continue
        if best_ts is None or ts > best_ts:
            best_ts = ts
            best_row = dict(r)
    return best_row


def require_friday_injury_gate(query_utc: datetime, friday_1800_et_utc: datetime) -> None:
    """WIRE 19 live gate: raise DataGapError if live Sunday injury pull runs prior to Fri 18:00 ET."""
    q = parse_ts_utc(query_utc)
    g = parse_ts_utc(friday_1800_et_utc)
    if q is None or g is None or q < g:
        raise DataGapError("Live weekly injury report queried before Friday 18:00 ET publication gate.")


# ============================================================================ #
# 3. Locked-Mean CRPS Closed Forms & Hard Circuit Breaker
# ============================================================================ #


def std_normal_pdf(z: float) -> float:
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def std_normal_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def crps_gaussian(mu_close: float, sigma: float, y_margin: float) -> float:
    """Closed-form CRPS for N(mu_close, sigma^2) with mu locked at market close."""
    if sigma <= 0.0 or not math.isfinite(sigma):
        raise ValueError(f"Invalid Gaussian scale sigma={sigma}")
    z = (y_margin - mu_close) / sigma
    return sigma * (
        z * (2.0 * std_normal_cdf(z) - 1.0)
        + 2.0 * std_normal_pdf(z)
        - 1.0 / math.sqrt(math.pi)
    )


def crps_gaussian_grad_sigma(mu_close: float, sigma: float, y_margin: float) -> Tuple[float, float]:
    """Analytical first and second derivatives (dCRPS/dsigma, d2CRPS/dsigma2) under locked mu."""
    if sigma <= 0.0 or not math.isfinite(sigma):
        raise ValueError(f"Invalid Gaussian scale sigma={sigma}")
    z = (y_margin - mu_close) / sigma
    pdf = std_normal_pdf(z)
    grad = 2.0 * pdf - 1.0 / math.sqrt(math.pi)
    hess = (2.0 * ((y_margin - mu_close) ** 2) / (sigma**3)) * pdf
    return grad, hess


def crps_laplace(mu_close: float, b_scale: float, y_margin: float) -> float:
    """Closed-form CRPS for Laplace(mu_close, b_scale) with mu locked at market close."""
    if b_scale <= 0.0 or not math.isfinite(b_scale):
        raise ValueError(f"Invalid Laplace scale b={b_scale}")
    abs_err = abs(y_margin - mu_close)
    return abs_err + b_scale * math.exp(-abs_err / b_scale) - 0.75 * b_scale


def crps_two_normal_mixture(
    mu_close: float,
    sigma_core: float,
    sigma_tail: float,
    w_tail: float,
    y_margin: float,
) -> float:
    """Closed-form Grimit et al. (2006) CRPS for location-locked 2-Normal scale mixture."""
    if sigma_core <= 0.0 or sigma_tail <= 0.0 or not (0.0 <= w_tail <= 1.0):
        raise ValueError("Invalid mixture parameters")
    w1 = 1.0 - w_tail
    w2 = w_tail

    def aux_a(m: float, var: float) -> float:
        s = math.sqrt(var)
        z = m / s
        return 2.0 * s * std_normal_pdf(z) + m * (2.0 * std_normal_cdf(z) - 1.0)

    d = y_margin - mu_close
    term1 = w1 * aux_a(d, sigma_core**2) + w2 * aux_a(d, sigma_tail**2)
    term2 = (1.0 / math.sqrt(math.pi)) * (
        (w1**2) * sigma_core
        + (w2**2) * sigma_tail
        + w1 * w2 * math.sqrt(2.0 * (sigma_core**2 + sigma_tail**2))
    )
    return term1 - term2


def crps_hybrid_key_numbers(
    mu_close: float,
    b_scale: float,
    key_masses: Mapping[int, float],
    y_margin: float,
) -> float:
    """Closed-form CRPS for Laplace + discrete key-number masses preserving E[M] == mu_close."""
    p_disc = sum(key_masses.values())
    if p_disc < 0.0 or p_disc >= 0.95 or b_scale <= 0.0:
        raise ValueError(f"Invalid hybrid parameters p_disc={p_disc}, b_scale={b_scale}")
    w_cont = 1.0 - p_disc
    disc_mean_shift = sum(k * pk for k, pk in key_masses.items())
    mu_cont = (mu_close - disc_mean_shift) / w_cont

    def e_abs_laplace(c: float) -> float:
        d = abs(c - mu_cont)
        return d + b_scale * math.exp(-d / b_scale)

    term1 = w_cont * e_abs_laplace(y_margin) + sum(
        pk * abs(k - y_margin) for k, pk in key_masses.items()
    )
    e_cont_self = 1.5 * b_scale
    cross_cont_disc = sum(pk * e_abs_laplace(float(k)) for k, pk in key_masses.items())
    disc_self = sum(
        pk * pk_prime * abs(k - k_prime)
        for k, pk in key_masses.items()
        for k_prime, pk_prime in key_masses.items()
    )
    term2 = 0.5 * ((w_cont**2) * e_cont_self + 2.0 * w_cont * cross_cont_disc + disc_self)
    return term1 - term2


def validate_emission_eligibility(manifest: Mapping[str, Any]) -> Dict[str, Any]:
    """Hard Phase-4 circuit breaker mirroring walk-forward-circuit-breaker.ts."""
    locks = manifest.get("galaxy_locked_state")
    base = manifest.get("current_measured_baseline")
    if not isinstance(locks, Mapping) or not isinstance(base, Mapping):
        return {"eligible": False, "measured_crps": None, "reason": "MANIFEST_SCHEMA_INVALID"}
    if (
        locks.get("mu") != "market_close"
        or locks.get("vision_weight") != 0.0
        or locks.get("zero_imputation") is not True
        or locks.get("pass_veto") != "unconditional"
    ):
        return {"eligible": False, "measured_crps": None, "reason": "GALAXY_LOCKED_STATE_VIOLATION"}

    eff_crps = base.get("best_measured_crps", base.get("gaussian_13_45_crps"))
    n_games = int(base.get("n", 0))
    passed = base.get("passed") is True
    if (
        not passed
        or not isinstance(eff_crps, (int, float))
        or not math.isfinite(float(eff_crps))
        or float(eff_crps) > GATE_CRPS_THRESHOLD
        or n_games < GATE_MIN_N
    ):
        return {
            "eligible": False,
            "measured_crps": float(eff_crps) if isinstance(eff_crps, (int, float)) else None,
            "reason": f"GATE_NOT_CLEARED: passed={passed}, crps={eff_crps}, n={n_games}",
        }
    return {"eligible": True, "measured_crps": float(eff_crps), "reason": "GATE_CLEARED"}


def build_zero_slate_object(
    now_iso: Optional[str] = None,
    measured_crps: Optional[float] = BASELINE_GAUSSIAN_CRPS,
) -> Dict[str, Any]:
    """Emit constitutional 0-object slate when walk-forward CRPS gate is not cleared."""
    return {
        "timestamp": now_iso or datetime.now(timezone.utc).isoformat(),
        "picks": [],
        "parlays": [],
        "dfs_lineups": [],
        "gate_status": "LOCKED_ZERO_OBJECT",
        "measured_crps": measured_crps,
    }


# ============================================================================ #
# 4. Orthogonal Situational Metrics (GSE_PROPRIETARY_SEVEN + SAI)
# ============================================================================ #


def shrink_epa_prior(
    raw_epa_per_play: float,
    prior_snaps: float,
    replacement_epa: float = -0.08,
    kappa: float = 100.0,
) -> float:
    """Empirical Bayes shrinkage toward positional replacement level (kappa=100 snaps)."""
    if prior_snaps < 0.0 or kappa <= 0.0:
        raise ValueError("prior_snaps must be >= 0 and kappa > 0")
    return (prior_snaps * raw_epa_per_play + kappa * replacement_epa) / (prior_snaps + kappa)


def compute_bqp(
    out_starters: Optional[Sequence[Mapping[str, object]]],
    kickoff_utc: datetime,
    *,
    season: int = 2026,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> Optional[float]:
    """
    Metric 1: Backup Quality Premium (BQP).
    Enforces T-90m PIT guard and blocks pre-2025 depth-chart-only starter claims.
    """
    if out_starters is None:
        return None
    total_by_side: Dict[str, float] = {"home": 0.0, "away": 0.0}
    for rec in out_starters:
        ts_raw = rec.get("date_modified") or rec.get("observed_at")
        if validate_pit_timestamp(ts_raw, kickoff_utc, buffer_minutes=buffer_minutes) is None:
            return None

        used_depth_chart = bool(rec.get("from_depth_chart", False))
        snap_share_raw = rec.get("starter_snap_share_prior_3w")
        if snap_share_raw is None:
            return None
        snap_share = float(str(snap_share_raw))
        if not math.isfinite(snap_share) or snap_share < 0.0:
            return None

        if season < MIN_DEPTH_CHART_SEASON and used_depth_chart and snap_share <= 0.60:
            return None
        if used_depth_chart and season >= MIN_DEPTH_CHART_SEASON:
            dt_raw = rec.get("depth_dt") or ts_raw
            if validate_pit_timestamp(dt_raw, kickoff_utc, buffer_minutes=buffer_minutes) is None:
                return None
        elif not used_depth_chart and snap_share <= 0.60 and int(rec.get("depth_rank", 2)) != 1:
            continue

        status = str(rec.get("report_status", ""))
        if status not in ("Out", "OUT", "Doubtful", "DOUBTFUL", "IR"):
            continue
        epa_starter = rec.get("epa_starter_prior")
        epa_backup = rec.get("epa_backup_prior_snap_adj")
        if epa_starter is None or epa_backup is None:
            return None
        pos = str(rec.get("position", "")).upper()
        pos_mult = 2.5 if pos == "QB" else 1.0
        side = str(rec.get("side", "away")).lower()
        if side not in total_by_side:
            side = "away"
        diff = float(str(epa_starter)) - float(str(epa_backup))
        total_by_side[side] += diff * snap_share * pos_mult
    return max(0.0, total_by_side["home"]) + max(0.0, total_by_side["away"])


def haversine_miles(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float],
) -> Optional[float]:
    """Deterministic great-circle distance in statute miles. Fail-closed on missing coords."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    if not all(math.isfinite(v) for v in (lat1, lon1, lat2, lon2)):
        return None
    r_earth = 3958.7613
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r_earth * math.asin(min(1.0, math.sqrt(a)))


def compute_swcc(
    rest_days_away: Optional[float],
    rest_days_home: Optional[float],
    travel_miles_away: Optional[float],
    prior_snaps_away: Optional[float],
    prior_snaps_home: Optional[float],
    observed_at_meta: Optional[object],
    kickoff_utc: datetime,
    *,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> Optional[float]:
    """Metric 2: Short-Week Chaos Coefficient (SWCC). Fail-closed if travel or snaps missing."""
    if validate_pit_timestamp(observed_at_meta, kickoff_utc, buffer_minutes=buffer_minutes) is None:
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
    injured_players: Optional[Sequence[Mapping[str, object]]],
    rest_days: Optional[float],
    kickoff_utc: datetime,
    *,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> Optional[float]:
    """Metric 3 (Team): Rest-Adjusted Injury Load (RIL). Fail-closed on unstamped/future rows."""
    if injured_players is None or rest_days is None or rest_days <= 0.0:
        return None
    rest_clamped = max(4.0, min(14.0, float(rest_days)))
    rest_mult = math.sqrt(7.0 / rest_clamped)
    load = 0.0
    for p in injured_players:
        if not validate_injury_pit(p, kickoff_utc, buffer_minutes=buffer_minutes):
            return None
        w_stat = STATUS_WEIGHTS.get(str(p.get("report_status", "")), 0.0)
        if w_stat == 0.0:
            continue
        pos = str(p.get("position", "")).upper()
        w_pos = POS_WEIGHTS.get(pos, 0.5)
        snap_share = p.get("snap_share_prior_3w")
        if snap_share is None or not math.isfinite(float(str(snap_share))):
            return None
        load += w_stat * w_pos * float(str(snap_share))
    return rest_mult * load


def compute_ril_game(
    home_injuries: Optional[Sequence[Mapping[str, object]]],
    away_injuries: Optional[Sequence[Mapping[str, object]]],
    rest_days_home: Optional[float],
    rest_days_away: Optional[float],
    kickoff_utc: datetime,
    *,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> Optional[Dict[str, float]]:
    """Return {'ril_home', 'ril_away', 'ril_sum', 'ril_asymmetry'} or None on PIT failure."""
    ril_h = compute_ril_team(home_injuries, rest_days_home, kickoff_utc, buffer_minutes=buffer_minutes)
    ril_a = compute_ril_team(away_injuries, rest_days_away, kickoff_utc, buffer_minutes=buffer_minutes)
    if ril_h is None or ril_a is None:
        return None
    return {
        "ril_home": ril_h,
        "ril_away": ril_a,
        "ril_sum": ril_h + ril_a,
        "ril_asymmetry": abs(ril_a - ril_h),
    }


def compute_qptsr(
    home_qb: Optional[Mapping[str, float]],
    away_qb: Optional[Mapping[str, float]],
    prr_league: float = 0.34,
    s_league: float = 0.180,
    kappa_q: float = 30.0,
) -> Optional[float]:
    """
    Metric 4: QB Quick-Pressure-to-Sack and Scramble Variance Residual (QPTSR).
    Fails closed (None) if neither starting QB has >= 50 prior dropbacks in strictly earlier games.
    """
    if home_qb is None or away_qb is None or prr_league <= 0.0:
        return None
    db_h = float(home_qb.get("prior_dropbacks", 0.0))
    db_a = float(away_qb.get("prior_dropbacks", 0.0))
    if db_h < 50.0 and db_a < 50.0:
        return None

    total = 0.0
    for qb in (home_qb, away_qb):
        n_qp = float(qb.get("quick_pressures", 0.0))
        sacks_qp = float(qb.get("quick_pressure_sacks", 0.0))
        prr_opp = float(qb.get("opp_prior_prr", prr_league))
        scramble = float(qb.get("prior_scramble_rate", 0.0))
        p2s_hat = ((sacks_qp + kappa_q * s_league) / (n_qp + kappa_q)) - s_league
        volatility_trait = max(0.0, p2s_hat) + 0.5 * max(0.0, scramble - 0.05)
        total += volatility_trait * (prr_opp / prr_league) * (1.0 + scramble)
    return total


def compute_olcai_team(
    snaps_w_minus_1: Optional[Sequence[float]],
    snaps_w_minus_4_to_2_mean: Optional[Sequence[float]],
    injured_ol: Optional[Sequence[Mapping[str, object]]],
    kickoff_utc: datetime,
    *,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> Optional[float]:
    """Metric 5 (Team): Offensive Line Unit Continuity & Trench Attrition Index (OLCAI)."""
    if not snaps_w_minus_1 or not snaps_w_minus_4_to_2_mean:
        return None
    if len(snaps_w_minus_1) != len(snaps_w_minus_4_to_2_mean):
        return None
    norm1 = math.sqrt(sum(x * x for x in snaps_w_minus_1))
    norm2 = math.sqrt(sum(y * y for y in snaps_w_minus_4_to_2_mean))
    if norm1 <= 0.0 or norm2 <= 0.0:
        return None
    dot = sum(x * y for x, y in zip(snaps_w_minus_1, snaps_w_minus_4_to_2_mean))
    cos_sim = max(-1.0, min(1.0, dot / (norm1 * norm2)))
    churn = 1.0 - cos_sim
    split_entropy = max(0.0, 5.0 - (norm1**2))

    inj_term = 0.0
    if injured_ol is not None:
        for row in injured_ol:
            if not validate_injury_pit(row, kickoff_utc, buffer_minutes=buffer_minutes):
                return None
            w_stat = STATUS_WEIGHTS.get(str(row.get("report_status", "")), 0.0)
            s_prev = float(str(row.get("snap_share_w_minus_1", 0.0)))
            inj_term += w_stat * s_prev
    return churn + 0.25 * split_entropy + inj_term


def compute_olcai_game(
    home_ol_w1: Optional[Sequence[float]],
    home_ol_prior_mean: Optional[Sequence[float]],
    home_injured_ol: Optional[Sequence[Mapping[str, object]]],
    away_ol_w1: Optional[Sequence[float]],
    away_ol_prior_mean: Optional[Sequence[float]],
    away_injured_ol: Optional[Sequence[Mapping[str, object]]],
    kickoff_utc: datetime,
    *,
    buffer_minutes: float = PIT_DEFAULT_BUFFER_MINUTES,
) -> Optional[float]:
    """Game-level OLCAI = OLCAI_home + OLCAI_away."""
    h = compute_olcai_team(home_ol_w1, home_ol_prior_mean, home_injured_ol, kickoff_utc, buffer_minutes=buffer_minutes)
    a = compute_olcai_team(away_ol_w1, away_ol_prior_mean, away_injured_ol, kickoff_utc, buffer_minutes=buffer_minutes)
    if h is None or a is None:
        return None
    return h + a


def compute_spese(
    pace_home: Optional[float],
    pace_away: Optional[float],
    explosive_matchup_home: Optional[float],
    stall_matchup_home: Optional[float],
    explosive_matchup_away: Optional[float],
    stall_matchup_away: Optional[float],
    pace_league: float = 63.0,
) -> Optional[float]:
    """Metric 6: Situational Pace & Explosive-to-Stall Entropy (SPESE)."""
    vals = (
        pace_home,
        pace_away,
        explosive_matchup_home,
        stall_matchup_home,
        explosive_matchup_away,
        stall_matchup_away,
    )
    if any(v is None or not math.isfinite(float(v)) or float(v) < 0.0 for v in vals) or pace_league <= 0.0:
        return None
    pace_ratio = (float(pace_home) + float(pace_away)) / (2.0 * pace_league)  # type: ignore[arg-type]
    bimodal_sum = math.sqrt(float(explosive_matchup_home) * float(stall_matchup_home)) + math.sqrt(  # type: ignore[arg-type]
        float(explosive_matchup_away) * float(stall_matchup_away)  # type: ignore[arg-type]
    )
    return pace_ratio * bimodal_sum


def modulate_key_number_masses(
    p_base_3: float,
    p_base_7: float,
    spese_val: float,
    spese_mean: float = 0.42,
    gamma_spese: float = 0.12,
) -> Dict[str, float]:
    """Adjust P(|M|=7) vs P(|M|=3) via SPESE while strictly conserving total p_{3,7}."""
    p_37 = p_base_3 + p_base_7
    p_adj_7 = max(0.00, min(0.14, p_base_7 + gamma_spese * (spese_val - spese_mean)))
    p_adj_7 = min(p_37, p_adj_7)
    p_adj_3 = p_37 - p_adj_7
    return {"p_abs_3": p_adj_3, "p_abs_7": p_adj_7, "p_total_37": p_37}


def compute_caofi(
    tz_home: Optional[float],
    tz_away: Optional[float],
    tz_venue: Optional[float],
    kickoff_hour_et: Optional[float],
    altitude_venue_m: Optional[float],
    altitude_away_home_m: Optional[float],
    def_snaps_away_w1: Optional[float],
    ref_pen_yards_per_play: Optional[float],
    league_pen_yards_per_play: float = 0.82,
    sd_pen_yards_per_play: float = 0.14,
) -> Optional[float]:
    """Metric 7: Circadian-Altitude-Officiating Friction Index (CAOFI)."""
    req = (tz_home, tz_away, tz_venue, kickoff_hour_et, altitude_venue_m, altitude_away_home_m, def_snaps_away_w1)
    if any(v is None or not math.isfinite(float(v)) for v in req) or sd_pen_yards_per_play <= 0.0:
        return None
    early_body_clock = 1.0 if float(kickoff_hour_et) <= 13.5 else 0.0  # type: ignore[arg-type]
    intl_shock = 2.0 if abs(float(tz_venue) - float(tz_away)) >= 4.0 else 0.0  # type: ignore[arg-type]
    circadian_shock = max(0.0, float(tz_home) - float(tz_away)) * early_body_clock + intl_shock  # type: ignore[arg-type]

    hypoxia_load = (
        max(0.0, (float(altitude_venue_m) - float(altitude_away_home_m)) / 1000.0)  # type: ignore[arg-type]
        * (float(def_snaps_away_w1) / 70.0)  # type: ignore[arg-type]
    )
    ref_chaos = 0.0
    if ref_pen_yards_per_play is not None and math.isfinite(ref_pen_yards_per_play):
        ref_chaos = max(0.0, (ref_pen_yards_per_play - league_pen_yards_per_play) / sd_pen_yards_per_play)
    return 0.40 * circadian_shock + 0.35 * hypoxia_load + 0.25 * ref_chaos


def _cholesky_lower(matrix: Sequence[Sequence[float]]) -> List[List[float]]:
    """Pure-Python Cholesky decomposition Sigma = L @ L.T for SPD matrices."""
    n = len(matrix)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                diag = matrix[i][i] - s
                if diag <= 1e-12:
                    raise ValueError("Covariance matrix is not positive definite")
                L[i][j] = math.sqrt(diag)
            else:
                L[i][j] = (matrix[i][j] - s) / L[j][j]
    return L


def orthogonalize_features_mahalanobis(
    prior_feature_rows: Sequence[Sequence[float]],
    current_features: Sequence[float],
    ridge: float = 1e-4,
) -> List[float]:
    """
    Mahalanobis-Cholesky orthogonalization strictly on prior games (< W):
    z_{g,t} = L_{<W}^{-1} (m_{g,t} - mean_{<W}) so Cov(z) = I.
    """
    k = len(current_features)
    if k == 0:
        return []
    if len(prior_feature_rows) < 2:
        return [0.0] * k
    n = len(prior_feature_rows)
    means = [sum(row[j] for row in prior_feature_rows) / float(n) for j in range(k)]
    cov = [[0.0] * k for _ in range(k)]
    for i in range(k):
        for j in range(k):
            c = sum((row[i] - means[i]) * (row[j] - means[j]) for row in prior_feature_rows) / float(n - 1)
            if i == j:
                c += ridge
            cov[i][j] = c
    L = _cholesky_lower(cov)
    centered = [current_features[i] - means[i] for i in range(k)]
    z = [0.0] * k
    for i in range(k):
        s = sum(L[i][j] * z[j] for j in range(i))
        z[i] = (centered[i] - s) / L[i][i]
    return z


def modulated_sigma_joint(
    sigma_base: float,
    z_orth: Sequence[float],
    betas: Sequence[float],
) -> float:
    """Joint Cholesky-orthogonalized scale modulation clamped to exp([-0.35, +0.45])."""
    if len(z_orth) != len(betas):
        raise ValueError("z_orth and betas must have identical length")
    dot = sum(b * z for b, z in zip(betas, z_orth))
    clamped = max(-0.35, min(0.45, dot))
    return sigma_base * math.exp(clamped)


def _quantile_sorted(sorted_vals: Sequence[float], q: float) -> float:
    n = len(sorted_vals)
    if n == 1:
        return sorted_vals[0]
    pos = q * (n - 1)
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return sorted_vals[lo]
    frac = pos - lo
    return sorted_vals[lo] * (1.0 - frac) + sorted_vals[hi] * frac


def robust_iqr_standardize(
    value: Optional[float],
    prior_values: Sequence[float],
    eps: float = 1e-6,
) -> float:
    """Compute robust standardized excess ``max(0, M_{g,k} - Q_0.50) / (IQR + eps)``."""
    if value is None or not math.isfinite(value) or not prior_values:
        return 0.0
    clean = sorted(float(v) for v in prior_values if v is not None and math.isfinite(v))
    if not clean:
        return 0.0
    med = _quantile_sorted(clean, 0.50)
    iqr = _quantile_sorted(clean, 0.75) - _quantile_sorted(clean, 0.25)
    return max(0.0, (float(value) - med) / (iqr + eps))


def compute_sai(
    metrics: Mapping[str, Optional[float]],
    prior_history: Mapping[str, Sequence[float]],
) -> Dict[str, float]:
    """
    Situational Asymmetry Index (SAI_{g,t}):
    SAI = (1 + SWCC~ + CAOFI~) * (1 + RIL~ + BQP~ + OLCAI~) * (1 + QPTSR~ + SPESE~) - 1
    """
    std = {
        name: robust_iqr_standardize(metrics.get(name), prior_history.get(name, ()))
        for name in GSE_PROPRIETARY_SEVEN
    }
    plane_schedule = 1.0 + std["SWCC"] + std["CAOFI"]
    plane_attrition = 1.0 + std["RIL"] + std["BQP"] + std["OLCAI"]
    plane_scheme_pace = 1.0 + std["QPTSR"] + std["SPESE"]
    sai = plane_schedule * plane_attrition * plane_scheme_pace - 1.0
    return {
        "sai": sai,
        "plane_schedule_env": plane_schedule,
        "plane_roster_trench": plane_attrition,
        "plane_scheme_pace": plane_scheme_pace,
        **{f"{k.lower()}_tilde": v for k, v in std.items()},
    }


def modulated_sigma(
    sigma_base: float,
    feature_val: Optional[float],
    beta: float,
    mode: str = "linear",
) -> float:
    """Single-feature dispersion modulator; returns sigma_base on None (fail-closed)."""
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
    """Fit scale coefficient beta strictly on prior games with >=25 valid observations."""
    valid = [(mu, y, f) for (mu, y, f) in prior_games if f is not None and math.isfinite(f) and f > 0.0]
    if len(valid) < 25:
        return 0.0
    best_beta = 0.0
    best_loss = float("inf")
    step = (grid_max - grid_min) / float(grid_steps - 1)
    for i in range(grid_steps):
        cand = grid_min + i * step
        loss = sum(crps_gaussian(mu, modulated_sigma(sigma_base, f, cand, mode=mode), y) for mu, y, f in valid)
        if loss < best_loss:
            best_loss = loss
            best_beta = cand
    return round(best_beta, 6)


@dataclass(frozen=True)
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
    games: Sequence[Mapping[str, object]],
    mode: str = "linear",
) -> WalkForwardDiagnostic:
    """Run strict expanding-window PIT evaluation across the regular-season game filter."""
    if feature_name.strip().upper() == "CVI":
        raise RuntimeError("REFUSED: CVI is locked behind a terminal refusal flag (commit e51c4c91).")

    ordered = sorted(
        games,
        key=lambda g: (int(str(g["season"])), int(str(g["week"])), str(g.get("game_id", ""))),
    )
    n_total = len(ordered)
    crps_base_sum = 0.0
    crps_mod_sum = 0.0
    n_joined = 0
    n_failed = 0
    last_beta = 0.0

    weeks_seen = sorted({(int(str(g["season"])), int(str(g["week"]))) for g in ordered})
    by_week: Dict[Tuple[int, int], List[Mapping[str, object]]] = {wk: [] for wk in weeks_seen}
    for g in ordered:
        by_week[(int(str(g["season"])), int(str(g["week"])))].append(g)

    prior_pool: List[Tuple[float, float, Optional[float]]] = []
    for wk in weeks_seen:
        beta_wk = fit_beta_expanding_window(prior_pool, sigma_base=GAUSSIAN_SIGMA_BASE, mode=mode)
        last_beta = beta_wk
        for g in by_week[wk]:
            mu = float(str(g["mu_close"]))
            y = float(str(g["y_margin"]))
            f_val = g.get("feature_val")
            f_clean = float(str(f_val)) if (f_val is not None and math.isfinite(float(str(f_val)))) else None
            if f_clean is None:
                n_failed += 1
            else:
                n_joined += 1
            crps_base_sum += crps_gaussian(mu, GAUSSIAN_SIGMA_BASE, y)
            crps_mod_sum += crps_gaussian(
                mu,
                modulated_sigma(GAUSSIAN_SIGMA_BASE, f_clean, beta_wk, mode=mode),
                y,
            )
        for g in by_week[wk]:
            f_val = g.get("feature_val")
            f_clean = float(str(f_val)) if (f_val is not None and math.isfinite(float(str(f_val)))) else None
            prior_pool.append((float(str(g["mu_close"])), float(str(g["y_margin"])), f_clean))

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


# ============================================================================ #
# 5. Glicko-2 Illinois-Method Solver + Idle Bye-Week RD Step
# ============================================================================ #


@dataclass(frozen=True)
class Glicko2Rating:
    rating: float = 1500.0
    rd: float = 200.0
    sigma: float = 0.06

    def to_internal(self) -> Tuple[float, float]:
        return (self.rating - 1500.0) / GLICKO2_SCALE, self.rd / GLICKO2_SCALE

    @staticmethod
    def from_internal(mu: float, phi: float, sigma: float) -> "Glicko2Rating":
        return Glicko2Rating(
            rating=GLICKO2_SCALE * mu + 1500.0,
            rd=GLICKO2_SCALE * phi,
            sigma=sigma,
        )


@dataclass(frozen=True)
class Glicko2Match:
    opp_rating: float
    opp_rd: float
    score: float  # 1.0 win, 0.5 draw, 0.0 loss


def _glicko2_g(phi: float) -> float:
    return 1.0 / math.sqrt(1.0 + (3.0 * phi * phi) / (math.pi * math.pi))


def _glicko2_expected(mu: float, mu_j: float, phi_j: float) -> float:
    return 1.0 / (1.0 + math.exp(-_glicko2_g(phi_j) * (mu - mu_j)))


def glicko2_idle_step(player: Glicko2Rating, idle_periods: int = 1) -> Glicko2Rating:
    """
    Glickman (2012) Section 1.3 Idle-Period / NFL Bye-Week Rule:
    Rating and volatility stay unchanged; only uncertainty grows:
        phi' = sqrt(phi^2 + sigma^2)   (generalized to k idle periods: sqrt(phi^2 + k * sigma^2))
    Zero volatility solve. Zero division by v.
    """
    if idle_periods < 0:
        raise ValueError(f"idle_periods must be >= 0, got {idle_periods}")
    if idle_periods == 0:
        return player
    mu, phi = player.to_internal()
    phi_prime = math.sqrt(phi * phi + float(idle_periods) * (player.sigma * player.sigma))
    return Glicko2Rating.from_internal(mu, phi_prime, player.sigma)


def solve_glicko2_volatility_illinois(
    phi: float,
    sigma: float,
    v: float,
    delta: float,
    tau: float = TAU_SEALED,
    tol: float = ILLINOIS_TOL,
    max_iter: int = 200,
) -> float:
    """
    Illinois (regula falsi variant) solver for Glicko-2 volatility sigma'.
    Finds root x = ln(sigma'^2) of:
        f(x) = e^x (Delta^2 - phi^2 - v - e^x) / (2 (phi^2 + v + e^x)^2) - (x - a) / tau^2
    Note on Glickman (2012) Step 5.2(b)(ii): when Delta^2 <= phi^2 + v, f(a) < 0 and
    f(a - k*tau) -> +infinity as k grows, so we advance k while f(a - k*tau) < 0 until
    f(B) >= 0 brackets the root opposite f(A) < 0.
    """
    if tau <= 0.0 or sigma <= 0.0 or v <= 0.0:
        raise ValueError(f"Invalid volatility solver inputs: tau={tau}, sigma={sigma}, v={v}")

    a = math.log(sigma * sigma)
    delta_sq = delta * delta
    phi_sq = phi * phi
    tau_sq = tau * tau

    def f(x: float) -> float:
        ex = math.exp(x)
        denom = phi_sq + v + ex
        return (ex * (delta_sq - phi_sq - v - ex)) / (2.0 * denom * denom) - (x - a) / tau_sq

    A = a
    if delta_sq > phi_sq + v:
        B = math.log(delta_sq - phi_sq - v)
    else:
        k = 1
        while f(a - k * tau) < 0.0:
            k += 1
            if k > 1000:
                raise RuntimeError("Failed to bracket Glicko-2 volatility root")
        B = a - k * tau

    fA = f(A)
    fB = f(B)
    for _ in range(max_iter):
        if abs(B - A) <= tol:
            break
        if abs(fB - fA) <= 1e-18:
            break
        C = A + (A - B) * fA / (fB - fA)
        fC = f(C)
        if fC * fB <= 0.0:
            A = B
            fA = fB
        else:
            fA *= 0.5  # Illinois damping step
        B = C
        fB = fC
    return math.exp(A / 2.0)


def glicko2_update_period(
    player: Glicko2Rating,
    matches: Sequence[Glicko2Match],
    *,
    tau: float = TAU_SEALED,
    tol: float = ILLINOIS_TOL,
) -> Glicko2Rating:
    """
    Full single-period Glicko-2 parallel update.
    If ``matches`` is empty (NFL bye week / idle period), explicitly executes ``glicko2_idle_step``.
    """
    if not matches:
        return glicko2_idle_step(player, idle_periods=1)

    mu, phi = player.to_internal()
    v_inv = 0.0
    score_sum = 0.0
    for m in matches:
        if not (0.0 <= m.score <= 1.0):
            raise ValueError(f"Match score must lie in [0, 1], got {m.score}")
        mu_j = (m.opp_rating - 1500.0) / GLICKO2_SCALE
        phi_j = m.opp_rd / GLICKO2_SCALE
        g_j = _glicko2_g(phi_j)
        e_j = _glicko2_expected(mu, mu_j, phi_j)
        v_inv += (g_j * g_j) * e_j * (1.0 - e_j)
        score_sum += g_j * (m.score - e_j)

    v = 1.0 / v_inv
    delta = v * score_sum
    sigma_prime = solve_glicko2_volatility_illinois(phi, player.sigma, v, delta, tau=tau, tol=tol)
    phi_star = math.sqrt(phi * phi + sigma_prime * sigma_prime)
    phi_prime = 1.0 / math.sqrt((1.0 / (phi_star * phi_star)) + (1.0 / v))
    mu_prime = mu + (phi_prime * phi_prime) * score_sum
    return Glicko2Rating.from_internal(mu_prime, phi_prime, sigma_prime)


def update_nfl_week_glicko2(
    team_ratings: Mapping[str, Glicko2Rating],
    completed_games: Sequence[Tuple[str, str, int, int]],
    *,
    tau: float = TAU_SEALED,
) -> Dict[str, Glicko2Rating]:
    """
    Update an entire 32-team NFL slate for one rating period (week):
    - Teams appearing in ``completed_games`` (away, home, away_pts, home_pts) update in parallel
      against pre-week opponent ratings.
    - Teams with zero games in the period (NFL bye teams, e.g. Week 10 CHI, DEN, PHI, TB)
      automatically execute the idle bye-week RD expansion ``phi' = sqrt(phi^2 + sigma^2)``.
    """
    buckets: Dict[str, List[Glicko2Match]] = {team: [] for team in team_ratings}
    for away, home, away_pts, home_pts in completed_games:
        if away not in team_ratings or home not in team_ratings:
            raise KeyError(f"Unknown team in game {away} @ {home}")
        if away_pts > home_pts:
            s_away, s_home = 1.0, 0.0
        elif home_pts > away_pts:
            s_away, s_home = 0.0, 1.0
        else:
            s_away, s_home = 0.5, 0.5
        r_away = team_ratings[away]
        r_home = team_ratings[home]
        buckets[away].append(Glicko2Match(r_home.rating, r_home.rd, s_away))
        buckets[home].append(Glicko2Match(r_away.rating, r_away.rd, s_home))

    return {
        team: glicko2_update_period(rating, buckets[team], tau=tau)
        for team, rating in team_ratings.items()
    }


# ============================================================================ #
# 6. Upgraded Injury Overlay + Log-Domain Stabilized Sinkhorn OT
# ============================================================================ #


def validate_epa_table(
    table: Mapping[str, float],
    *,
    expected_hash: Optional[str] = None,
    lo: float = EPA_FACTOR_MIN,
    hi: float = EPA_FACTOR_MAX,
) -> str:
    """Validate a sealed EPA dropoff table against [lo, hi] and optional SHA-256."""
    for role, factor in table.items():
        if isinstance(factor, bool) or not isinstance(factor, (int, float)):
            raise TypeError(f"EPA factor for role {role!r} must be numeric, got {factor!r}")
        if math.isnan(factor) or math.isinf(factor):
            raise ValueError(f"EPA factor for role {role!r} is not finite: {factor!r}")
        if not (lo <= float(factor) <= hi):
            raise ValueError(
                f"EPA factor for role {role!r} = {factor} is outside sealed bounds [{lo}, {hi}]"
            )
    digest = epa_table_sha256(table)
    if expected_hash is not None and digest != expected_hash:
        raise ValueError(
            f"EPA table hash mismatch: sealed table modified mid-week (expected {expected_hash}, got {digest})"
        )
    return digest


def normalize_shares(shares: Mapping[str, float]) -> Dict[str, float]:
    """Return a new dict scaled to sum to 1.0. Raises ValueError if sum <= 0."""
    if not shares:
        return {}
    total = 0.0
    for player, val in shares.items():
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            raise TypeError(f"Share for {player!r} is non-numeric: {val!r}")
        if not math.isfinite(val) or val < 0.0:
            raise ValueError(f"Share for {player!r} is negative or non-finite: {val!r}")
        total += float(val)
    if total <= 0.0:
        raise ValueError(f"Cannot normalize shares with non-positive total: {total}")
    return {player: float(val) / total for player, val in shares.items()}


def apply_epa_dropoff(
    shares: Mapping[str, float],
    role_of: Mapping[str, str],
    table: Mapping[str, float] = EPA_DROPOFF,
    *,
    lo: float = EPA_FACTOR_MIN,
    hi: float = EPA_FACTOR_MAX,
    validate_table: bool = True,
    renormalize: bool = True,
    audit_out: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, float]:
    """Apply sealed EPA positional dropoff factors without mutating any input mapping."""
    if validate_table:
        validate_epa_table(table, lo=lo, hi=hi)
    if not shares:
        return {}

    scaled: Dict[str, float] = {}
    factors_used: Dict[str, Tuple[Optional[str], float]] = {}
    for player, share in shares.items():
        if isinstance(share, bool) or not isinstance(share, (int, float)):
            raise TypeError(f"Share for {player!r} must be numeric, got {share!r}")
        s_val = float(share)
        if not math.isfinite(s_val) or s_val < 0.0:
            raise ValueError(f"Invalid share for {player!r}: {share!r}")
        role = role_of.get(player)
        factor = float(table.get(role, 1.0)) if role is not None else 1.0
        if not (lo <= factor <= hi):
            raise ValueError(
                f"EPA factor for player {player!r} (role {role!r}) = {factor} outside bounds [{lo}, {hi}]"
            )
        scaled[player] = s_val * factor
        factors_used[player] = (role, factor)

    total_scaled = sum(scaled.values())
    if total_scaled <= 0.0:
        raise ValueError("All post-dropoff shares are zero; cannot form distribution")

    out = {p: v / total_scaled for p, v in scaled.items()} if renormalize else dict(scaled)
    if audit_out is not None:
        for player in shares:
            role, factor = factors_used[player]
            audit_out.append(
                {
                    "stage": "epa",
                    "player": player,
                    "role": role,
                    "factor": factor,
                    "share_in": float(shares[player]),
                    "share_scaled": scaled[player],
                    "share_out": out[player],
                }
            )
    return out


def _logsumexp(values: Sequence[float]) -> float:
    """Numerically stable log(sum(exp(values)))."""
    if not values:
        return float("-inf")
    m = max(values)
    if not math.isfinite(m):
        return m
    return m + math.log(sum(math.exp(v - m) for v in values))


def sinkhorn_with_info(
    r: Sequence[float],
    c: Sequence[float],
    C: Sequence[Sequence[float]],
    eps: float = _SINKHORN_EPS,
    max_iter: int = _SINKHORN_MAX_ITER,
    tol: float = _SINKHORN_TOL,
) -> Tuple[List[List[float]], Dict[str, Any]]:
    """Log-domain stabilized Sinkhorn-Knopp Optimal Transport solver."""
    if len(r) == 0 and len(c) == 0 and len(C) == 0:
        return [], {
            "iterations": 0,
            "row_residual": 0.0,
            "col_residual": 0.0,
            "residual": 0.0,
            "converged": True,
            "objective": 0.0,
            "entropic_objective": 0.0,
            "row_sums": [],
            "col_sums": [],
        }
    if eps <= 0.0 or not math.isfinite(eps):
        raise ValueError(f"Sinkhorn eps must be positive and finite, got {eps}")
    if len(r) != len(C) or (len(C) > 0 and any(len(row) != len(c) for row in C)):
        raise ValueError(
            f"Dimension mismatch: len(r)={len(r)}, len(c)={len(c)}, shape(C)=({len(C)},{len(C[0]) if C else 0})"
        )
    if any(not math.isfinite(v) or v < 0.0 for v in r) or any(not math.isfinite(v) or v < 0.0 for v in c):
        raise ValueError("Marginals r and c must be finite and non-negative")

    sum_r = sum(r)
    sum_c = sum(c)
    if abs(sum_r - sum_c) > 1e-5:
        raise ValueError(f"Marginal mass mismatch: sum(r)={sum_r:.8f} != sum(c)={sum_c:.8f}")

    n, m = len(r), len(c)
    if sum_r == 0.0:
        zeros = [[0.0] * m for _ in range(n)]
        return zeros, {
            "iterations": 0,
            "row_residual": 0.0,
            "col_residual": 0.0,
            "residual": 0.0,
            "converged": True,
            "objective": 0.0,
            "entropic_objective": 0.0,
            "row_sums": [0.0] * n,
            "col_sums": [0.0] * m,
        }

    pos_i = [i for i, val in enumerate(r) if val > 0.0]
    pos_j = [j for j, val in enumerate(c) if val > 0.0]
    log_r = {i: math.log(r[i]) for i in pos_i}
    log_c = {j: math.log(c[j]) for j in pos_j}

    f_pot = {i: 0.0 for i in pos_i}
    g_pot = {j: 0.0 for j in pos_j}

    iterations = 0
    for iterations in range(1, max_iter + 1):
        max_delta = 0.0
        for i in pos_i:
            lse_j = _logsumexp([(g_pot[j] - C[i][j]) / eps for j in pos_j])
            new_fi = eps * (log_r[i] - lse_j)
            max_delta = max(max_delta, abs(new_fi - f_pot[i]))
            f_pot[i] = new_fi
        for j in pos_j:
            lse_i = _logsumexp([(f_pot[i] - C[i][j]) / eps for i in pos_i])
            new_gj = eps * (log_c[j] - lse_i)
            max_delta = max(max_delta, abs(new_gj - g_pot[j]))
            g_pot[j] = new_gj
        if max_delta < tol:
            break

    P: List[List[float]] = [[0.0] * m for _ in range(n)]
    for i in pos_i:
        for j in pos_j:
            exponent = (f_pot[i] + g_pot[j] - C[i][j]) / eps
            P[i][j] = math.exp(max(-745.0, min(700.0, exponent)))

    row_sums = [sum(P[i]) for i in range(n)]
    col_sums = [sum(P[i][j] for i in range(n)) for j in range(m)]
    row_residual = max((abs(row_sums[i] - r[i]) for i in range(n)), default=0.0)
    col_residual = max((abs(col_sums[j] - c[j]) for j in range(m)), default=0.0)
    residual = max(row_residual, col_residual)
    objective = sum(P[i][j] * C[i][j] for i in range(n) for j in range(m))
    entropy_reg = eps * sum(
        P[i][j] * (math.log(P[i][j]) - 1.0)
        for i in range(n)
        for j in range(m)
        if P[i][j] > 0.0
    )

    info: Dict[str, Any] = {
        "iterations": iterations,
        "row_residual": row_residual,
        "col_residual": col_residual,
        "residual": residual,
        "converged": bool(residual < 1e-5),
        "objective": objective,
        "entropic_objective": objective + entropy_reg,
        "row_sums": row_sums,
        "col_sums": col_sums,
    }
    return P, info


def sinkhorn(
    r: Sequence[float],
    c: Sequence[float],
    C: Sequence[Sequence[float]],
    eps: float = _SINKHORN_EPS,
    max_iter: int = _SINKHORN_MAX_ITER,
    tol: float = _SINKHORN_TOL,
) -> List[List[float]]:
    """Return log-domain stabilized Sinkhorn transport plan P."""
    plan, _ = sinkhorn_with_info(r, c, C, eps=eps, max_iter=max_iter, tol=tol)
    return plan


def role_cost_matrix(
    players: Sequence[str],
    role_of: Mapping[str, str],
    *,
    same_role_cost: float = 0.05,
    same_position_cost: float = 0.35,
    cross_position_cost: float = 1.00,
) -> List[List[float]]:
    """Build sealed role-interchangeability cost matrix C."""
    def pos_group(role: str) -> str:
        letters = "".join(ch for ch in role if ch.isalpha()).upper()
        return "WR" if letters == "SLOT" else letters

    if not set(players).issubset(set(role_of.keys())):
        raise ValueError("Every player in players must appear in role_of")

    C: List[List[float]] = []
    for i, pi in enumerate(players):
        row: List[float] = []
        ri = role_of[pi]
        for j, pj in enumerate(players):
            rj = role_of[pj]
            if i == j:
                row.append(0.0)
            elif ri == rj:
                row.append(same_role_cost)
            elif pos_group(ri) == pos_group(rj):
                row.append(same_position_cost)
            else:
                row.append(cross_position_cost)
        C.append(row)
    return C


def injury_overlay_report(
    pre_shares: Mapping[str, float],
    post_shares: Mapping[str, float],
    role_of: Mapping[str, str],
    cost: Sequence[Sequence[float]],
    players: Sequence[str],
    *,
    eps: float = _SINKHORN_EPS,
    table: Mapping[str, float] = EPA_DROPOFF,
    audit_out: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Full overlay report exposing feasible shares, effective mass loss, and normalized weights."""
    if not players:
        if pre_shares or post_shares:
            raise ValueError("Non-empty shares passed with empty players sequence")
        return {
            "feasible_shares": {},
            "effective_shares": {},
            "normalized_shares": {},
            "total_mass_before": 0.0,
            "total_mass_after": 0.0,
            "mass_loss": 0.0,
            "sinkhorn": {},
            "epa_table_sha256": validate_epa_table(table),
            "epa_factors": {},
            "log": [],
        }

    player_set = set(players)
    if set(pre_shares.keys()) != player_set or set(post_shares.keys()) != player_set:
        raise ValueError("pre_shares and post_shares keys must match players")

    r = [float(pre_shares[p]) for p in players]
    c = [float(post_shares[p]) for p in players]
    if abs(sum(r) - 1.0) > 1e-5 or abs(sum(c) - 1.0) > 1e-5:
        raise ValueError(f"pre_shares (sum={sum(r):.6f}) and post_shares (sum={sum(c):.6f}) must each sum to 1.0")

    P, info = sinkhorn_with_info(r, c, cost, eps=eps)
    feasible = {player: sum(P[i][j] for i in range(len(players))) for j, player in enumerate(players)}
    table_hash = validate_epa_table(table)

    epa_audit: List[Dict[str, Any]] = []
    normalized = apply_epa_dropoff(
        feasible,
        role_of,
        table,
        validate_table=False,
        renormalize=True,
        audit_out=epa_audit,
    )
    effective = {rec["player"]: rec["share_scaled"] for rec in epa_audit}
    factors = {rec["player"]: rec["factor"] for rec in epa_audit}
    total_before = sum(feasible.values())
    total_after = sum(effective.values())
    mass_loss = total_before - total_after

    if audit_out is not None:
        audit_out.append({"stage": "sinkhorn", **info})
        audit_out.extend(epa_audit)
        audit_out.append(
            {
                "stage": "summary",
                "total_mass_before": total_before,
                "total_mass_after": total_after,
                "mass_loss": mass_loss,
                "epa_table_sha256": table_hash,
            }
        )

    return {
        "feasible_shares": feasible,
        "effective_shares": effective,
        "normalized_shares": normalized,
        "total_mass_before": total_before,
        "total_mass_after": total_after,
        "mass_loss": mass_loss,
        "sinkhorn": info,
        "epa_table_sha256": table_hash,
        "epa_factors": factors,
        "log": epa_audit,
    }


def injury_overlay(
    pre_shares: Mapping[str, float],
    post_shares: Mapping[str, float],
    role_of: Mapping[str, str],
    cost: Sequence[Sequence[float]],
    players: Sequence[str],
    *,
    eps: float = _SINKHORN_EPS,
    table: Mapping[str, float] = EPA_DROPOFF,
    audit_out: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, float]:
    """End-to-end overlay returning normalized post-dropoff weights summing to 1.0."""
    if not players and not pre_shares and not post_shares:
        return {}
    rep = injury_overlay_report(
        pre_shares,
        post_shares,
        role_of,
        cost,
        players,
        eps=eps,
        table=table,
        audit_out=audit_out,
    )
    return dict(rep["normalized_shares"])


def load_injury_file(path: str) -> Dict[str, Any]:
    """Load and validate a JSON injury overlay specification."""
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("injury file must contain a JSON object")
    required = {"injured", "pre_shares", "role_of"}
    missing = required - set(data)
    if missing:
        raise ValueError(f"injury file missing keys: {sorted(missing)}")
    return data


# ============================================================================ #
# 7. Scheme-Matchup Optimal Transport Coupling (Core NFL Schemes & Systems)
# ============================================================================ #

OFFENSIVE_SCHEMES: Tuple[str, ...] = (
    "WEST_COAST_QUICK",
    "SHANAHAN_WIDE_ZONE_BOOT",
    "AIR_CORYELL_VERTICAL",
    "AIR_RAID_10P_TEMPO",
    "ERHARDT_PERKINS_MULTI",
    "POWER_GAP_HEAVY_12_21",
    "RPO_PISTOL_READ",
)

DEFENSIVE_SHELLS: Tuple[str, ...] = (
    "COVER_1_MAN_FREE",
    "COVER_2_TAMPA_JAM",
    "COVER_3_BUZZ_SINGLE_HIGH",
    "COVER_4_QUARTERS_MATCH",
    "COVER_6_9_SPLIT_FANGIO",
    "COVER_0_SIM_AMOEBAS_DROP8",
    "BEAR_46_HEAVY_FRONT",
)

SCHEME_FRICTION_MATRIX: Tuple[Tuple[float, ...], ...] = (
    # C1_MAN, C2_JAM, C3_BUZZ, C4_QTR, C6_9_SPL, C0_SIM, BEAR_46
    (0.76, 0.42, 0.24, 0.34, 0.44, 0.25, 0.22),  # WEST_COAST_QUICK
    (0.38, 0.34, 0.28, 0.46, 0.48, 0.58, 0.68),  # SHANAHAN_WIDE_ZONE_BOOT
    (0.40, 0.29, 0.26, 0.82, 0.78, 0.79, 0.35),  # AIR_CORYELL_VERTICAL
    (0.27, 0.52, 0.31, 0.64, 0.68, 0.62, 0.20),  # AIR_RAID_10P_TEMPO
    (0.36, 0.35, 0.36, 0.40, 0.42, 0.32, 0.34),  # ERHARDT_PERKINS_MULTI
    (0.66, 0.24, 0.62, 0.58, 0.22, 0.54, 0.84),  # POWER_GAP_HEAVY_12_21
    (0.44, 0.38, 0.33, 0.55, 0.50, 0.77, 0.86),  # RPO_PISTOL_READ
)


def couple_scheme_matchup_ot(
    off_profile: Mapping[str, float],
    def_profile: Mapping[str, float],
    *,
    eps: float = 0.06,
) -> Dict[str, Any]:
    """
    Solve log-domain stabilized Sinkhorn Optimal Transport between an offense's concept mix
    ``p_off`` and an opposing defense's shell/front distribution ``q_def``.
    """
    r_raw = {s: float(off_profile.get(s, 0.0)) for s in OFFENSIVE_SCHEMES}
    c_raw = {d: float(def_profile.get(d, 0.0)) for d in DEFENSIVE_SHELLS}
    r_norm = normalize_shares(r_raw)
    c_norm = normalize_shares(c_raw)
    r_vec = [r_norm[s] for s in OFFENSIVE_SCHEMES]
    c_vec = [c_norm[d] for d in DEFENSIVE_SHELLS]

    P, info = sinkhorn_with_info(r_vec, c_vec, SCHEME_FRICTION_MATRIX, eps=eps)
    friction = float(info["objective"])
    off_leverage_pts = (0.455 - friction) * 6.5
    scheme_leverage_100 = int(round(max(15.0, min(98.0, 50.0 + (0.455 - friction) * 140.0))))

    best_pair = max(
        ((i, j, P[i][j]) for i in range(len(OFFENSIVE_SCHEMES)) for j in range(len(DEFENSIVE_SHELLS))),
        key=lambda t: t[2],
    )
    return {
        "coupling_plan": P,
        "wasserstein_friction": round(friction, 6),
        "offensive_scheme_leverage_pts": round(off_leverage_pts, 3),
        "scheme_leverage_int_100": scheme_leverage_100,
        "primary_interaction": f"{OFFENSIVE_SCHEMES[best_pair[0]]} vs {DEFENSIVE_SHELLS[best_pair[1]]}",
        "sinkhorn_info": info,
    }


# ============================================================================ #
# 8. Deterministic Coach-Mind Tuesday v1.0 Lock, Calibration & Conformal Gate
# ============================================================================ #

CALIBRATION_KNOTS: Tuple[Tuple[float, float], ...] = (
    (0.05, 0.050),
    (0.50, 0.455),
    (0.55, 0.498),
    (0.60, 0.548),
    (0.65, 0.598),
    (0.67, 0.618),
    (0.75, 0.698),
    (0.95, 0.912),
)


def calibrate_gse_probability(raw_prob: float) -> float:
    """Monotone piecewise-linear GSE isotonic calibration map removing ~5.2pt overconfidence."""
    p = min(0.95, max(0.05, float(raw_prob)))
    for i in range(len(CALIBRATION_KNOTS) - 1):
        x0, y0 = CALIBRATION_KNOTS[i]
        x1, y1 = CALIBRATION_KNOTS[i + 1]
        if x0 <= p <= x1:
            t = (p - x0) / (x1 - x0)
            return round(y0 + t * (y1 - y0), 4)
    return round(p, 4)


def shin_devig(american_odds_a: float, american_odds_b: float = -110.0) -> Tuple[float, float, float]:
    """Closed-root two-outcome Shin (1993) insider-trading de-vig returning (p_a, p_b, z)."""
    def implied(odds: float) -> float:
        if odds == 0:
            raise ValueError("American odds cannot be 0")
        return (-odds / (-odds + 100.0)) if odds < 0 else (100.0 / (odds + 100.0))

    q1 = implied(american_odds_a)
    q2 = implied(american_odds_b)
    s = q1 + q2
    if s <= 1.0:
        return q1 / s, q2 / s, 0.0
    lo, hi = 0.0, 0.999
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        p1 = (math.sqrt(mid * mid + 4.0 * (1.0 - mid) * (q1 * q1) / s) - mid) / (2.0 * (1.0 - mid))
        p2 = (math.sqrt(mid * mid + 4.0 * (1.0 - mid) * (q2 * q2) / s) - mid) / (2.0 * (1.0 - mid))
        if p1 + p2 > 1.0:
            lo = mid
        else:
            hi = mid
    z = 0.5 * (lo + hi)
    p1 = (math.sqrt(z * z + 4.0 * (1.0 - z) * (q1 * q1) / s) - z) / (2.0 * (1.0 - z))
    p2 = 1.0 - p1
    return p1, p2, z


def conformal_diagnostic_flag(
    sealed_model_total: float,
    external_market_total: float,
    prior_abs_residuals: Sequence[float],
    alpha: float = 0.10,
) -> Dict[str, Any]:
    """Grok-2 External Conformal Diagnostic Flag (never mutates coachMindsetHash)."""
    if not prior_abs_residuals:
        return {"flagged": False, "q_hat": None, "abs_diff": abs(sealed_model_total - external_market_total)}
    sorted_res = sorted(abs(float(r)) for r in prior_abs_residuals)
    n = len(sorted_res)
    rank = min(n, max(1, int(math.ceil((1.0 - alpha) * (n + 1)))))
    q_hat = sorted_res[rank - 1]
    abs_diff = abs(float(sealed_model_total) - float(external_market_total))
    return {
        "flagged": bool(abs_diff > q_hat),
        "q_hat": round(q_hat, 4),
        "interval_low": round(sealed_model_total - q_hat, 2),
        "interval_high": round(sealed_model_total + q_hat, 2),
        "abs_diff": round(abs_diff, 4),
    }


@dataclass(frozen=True)
class EligibleTarget:
    player_id: str
    role: str
    base_share: float


@dataclass(frozen=True)
class CoachSimPureInput:
    game_id: str
    season: int
    week: int
    home_team: str
    away_team: str
    coach_support: float
    neutral_pass_rate_home: float
    neutral_pass_rate_away: float
    staff_aggression_home: float
    staff_aggression_away: float
    shadows: Tuple[Tuple[str, float], ...] = ()
    belichick_home: Optional[float] = None
    belichick_away: Optional[float] = None
    tau: float = TAU_SEALED
    home_off_scheme: Mapping[str, float] = field(default_factory=dict)
    home_def_shell: Mapping[str, float] = field(default_factory=dict)
    away_off_scheme: Mapping[str, float] = field(default_factory=dict)
    away_def_shell: Mapping[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class TuesdayCoachBaselineLock:
    game_id: str
    season: int
    week: int
    home_team: str
    away_team: str
    cadence_version: str
    locked_at_iso: str
    coach_mindset_hash: str
    cadence_merkle: str
    epa_dropoff_sha256: str
    frozen_coach_input: CoachSimPureInput
    base_home_targets: Tuple[EligibleTarget, ...]
    base_away_targets: Tuple[EligibleTarget, ...]
    home_target_allocations: Mapping[str, float]
    away_target_allocations: Mapping[str, float]
    inactive_player_ids: Tuple[str, ...]
    margin_mean_home: float
    score_mean_total: float
    raw_win_prob_home: float
    calibrated_win_prob_home: float
    scheme_home_vs_away_def: Mapping[str, Any]
    scheme_away_vs_home_def: Mapping[str, Any]


def compute_coach_mindset_hash(
    coach_input: CoachSimPureInput,
    epa_hash: str = EPA_DROPOFF_SHA256,
) -> str:
    """Deterministic Tuesday 04:00 CT SHA-256 over Class A Coach Mindset + sealed EPA table hash."""
    payload = {
        "game_id": coach_input.game_id,
        "season": coach_input.season,
        "week": coach_input.week,
        "home": coach_input.home_team,
        "away": coach_input.away_team,
        "tau": round(float(coach_input.tau), 6),
        "support": round(float(coach_input.coach_support), 6),
        "pass_home": round(float(coach_input.neutral_pass_rate_home), 6),
        "pass_away": round(float(coach_input.neutral_pass_rate_away), 6),
        "staff_home": round(float(coach_input.staff_aggression_home), 6),
        "staff_away": round(float(coach_input.staff_aggression_away), 6),
        "shadows": sorted(f"{wr}:{rate:.4f}" for wr, rate in coach_input.shadows),
        "belichick_home": coach_input.belichick_home,
        "belichick_away": coach_input.belichick_away,
        "home_off_scheme": {k: round(float(v), 6) for k, v in sorted(coach_input.home_off_scheme.items())},
        "home_def_shell": {k: round(float(v), 6) for k, v in sorted(coach_input.home_def_shell.items())},
        "away_off_scheme": {k: round(float(v), 6) for k, v in sorted(coach_input.away_off_scheme.items())},
        "away_def_shell": {k: round(float(v), 6) for k, v in sorted(coach_input.away_def_shell.items())},
        "epa_dropoff_sha256": epa_hash,
    }
    return canonical_sha256(payload)


def _reallocate_room_sinkhorn(
    base_targets: Sequence[EligibleTarget],
    inactive_ids: set[str],
    shadows: Sequence[Tuple[str, float]],
    epa_table: Mapping[str, float] = EPA_DROPOFF,
) -> Tuple[Dict[str, float], float]:
    """Reallocate room target shares using log-domain Sinkhorn OT + shadow haircut + sealed EPA dropoff."""
    if not base_targets:
        return {}, 0.0
    players = [t.player_id for t in base_targets]
    role_of = {t.player_id: t.role for t in base_targets}
    pre = normalize_shares({t.player_id: t.base_share for t in base_targets})

    active = [t for t in base_targets if t.player_id not in inactive_ids]
    if not active:
        return {p: 0.0 for p in players}, 1.0

    shadow_map = dict(shadows)
    raw_post: Dict[str, float] = {}
    for t in base_targets:
        if t.player_id in inactive_ids:
            raw_post[t.player_id] = 0.0
        else:
            haircut = 1.0 - 0.18 * float(shadow_map.get(t.player_id, 0.0))
            raw_post[t.player_id] = max(1e-6, pre[t.player_id] * haircut)
    post = normalize_shares(raw_post)

    scratched_roles = [t.role for t in base_targets if t.player_id in inactive_ids]
    inherited_roles = dict(role_of)
    if scratched_roles:
        active_sorted = sorted(active, key=lambda x: x.base_share, reverse=True)
        for idx, vac_role in enumerate(scratched_roles):
            if idx < len(active_sorted):
                inherited_roles[active_sorted[idx].player_id] = vac_role

    cost = role_cost_matrix(players, role_of)
    rep = injury_overlay_report(pre, post, inherited_roles, cost, players, table=epa_table)
    norm_active = {p: s for p, s in rep["normalized_shares"].items() if p not in inactive_ids}
    healthy_rep = injury_overlay_report(pre, pre, role_of, cost, players, table=epa_table)
    incremental_mass_loss = max(0.0, float(healthy_rep["total_mass_after"]) - float(rep["total_mass_after"]))
    return norm_active, incremental_mass_loss


def lock_tuesday_coach_baseline(
    coach_input: CoachSimPureInput,
    home_targets: Sequence[EligibleTarget],
    away_targets: Sequence[EligibleTarget],
    locked_at_iso: str,
    *,
    base_market_spread_home: float = 0.0,
    base_market_total: float = 45.5,
    epa_table: Mapping[str, float] = EPA_DROPOFF,
) -> TuesdayCoachBaselineLock:
    """Seal immutable v1.0 Tuesday 04:00 CT Coach Mindset baseline."""
    epa_hash = validate_epa_table(epa_table)
    mindset_hash = compute_coach_mindset_hash(coach_input, epa_hash=epa_hash)

    scheme_home = couple_scheme_matchup_ot(coach_input.home_off_scheme, coach_input.away_def_shell)
    scheme_away = couple_scheme_matchup_ot(coach_input.away_off_scheme, coach_input.home_def_shell)

    home_alloc, _ = _reallocate_room_sinkhorn(home_targets, set(), coach_input.shadows, epa_table=epa_table)
    away_alloc, _ = _reallocate_room_sinkhorn(away_targets, set(), coach_input.shadows, epa_table=epa_table)

    scheme_net_home = float(scheme_home["offensive_scheme_leverage_pts"]) - float(
        scheme_away["offensive_scheme_leverage_pts"]
    )
    aggression_net = (coach_input.staff_aggression_home - coach_input.staff_aggression_away) * 1.8
    margin_mean = round(base_market_spread_home + 0.55 * scheme_net_home + aggression_net, 2)
    pace_pass_adj = ((coach_input.neutral_pass_rate_home + coach_input.neutral_pass_rate_away) - 1.12) * 8.0
    score_mean = round(max(27.0, base_market_total + pace_pass_adj), 2)

    raw_wp = std_normal_cdf(margin_mean / GAUSSIAN_SIGMA_BASE)
    cal_wp = calibrate_gse_probability(raw_wp)

    merkle = canonical_sha256(
        {
            "version": "v1.0",
            "locked_at": locked_at_iso,
            "coach_mindset_hash": mindset_hash,
            "margin_mean": margin_mean,
            "score_mean": score_mean,
        }
    )
    return TuesdayCoachBaselineLock(
        game_id=coach_input.game_id,
        season=coach_input.season,
        week=coach_input.week,
        home_team=coach_input.home_team,
        away_team=coach_input.away_team,
        cadence_version="v1.0",
        locked_at_iso=locked_at_iso,
        coach_mindset_hash=mindset_hash,
        cadence_merkle=merkle,
        epa_dropoff_sha256=epa_hash,
        frozen_coach_input=coach_input,
        base_home_targets=tuple(home_targets),
        base_away_targets=tuple(away_targets),
        home_target_allocations=MappingProxyType(home_alloc),
        away_target_allocations=MappingProxyType(away_alloc),
        inactive_player_ids=(),
        margin_mean_home=margin_mean,
        score_mean_total=score_mean,
        raw_win_prob_home=round(raw_wp, 4),
        calibrated_win_prob_home=cal_wp,
        scheme_home_vs_away_def=MappingProxyType(scheme_home),
        scheme_away_vs_home_def=MappingProxyType(scheme_away),
    )


def apply_cadence_injury_overlay(
    baseline_lock: TuesdayCoachBaselineLock,
    *,
    version: str,
    recorded_at_iso: str,
    inactive_player_ids: Sequence[str],
    home_injury_points_delta: float = 0.0,
    away_injury_points_delta: float = 0.0,
    epa_table: Mapping[str, float] = EPA_DROPOFF,
) -> TuesdayCoachBaselineLock:
    """
    Apply Wed/Thu/Fri/Sun T-90m injury overlay (v2.0..v4.0) strictly on top of Tuesday v1.0 lock.
    Guarantees byte-for-byte invariance of ``coach_mindset_hash``.
    """
    if version not in ("v2.0", "v2.5", "v3.0", "v4.0"):
        raise ValueError(f"Overlay version must be in v2.0..v4.0, got {version!r}")

    epa_hash = validate_epa_table(epa_table, expected_hash=baseline_lock.epa_dropoff_sha256)
    recomputed_hash = compute_coach_mindset_hash(baseline_lock.frozen_coach_input, epa_hash=epa_hash)
    if recomputed_hash != baseline_lock.coach_mindset_hash:
        raise RuntimeError("CRITICAL: coachMindsetHash mutated during injury overlay")

    scratched = set(inactive_player_ids)
    home_alloc, home_loss = _reallocate_room_sinkhorn(
        baseline_lock.base_home_targets,
        scratched,
        baseline_lock.frozen_coach_input.shadows,
        epa_table=epa_table,
    )
    away_alloc, away_loss = _reallocate_room_sinkhorn(
        baseline_lock.base_away_targets,
        scratched,
        baseline_lock.frozen_coach_input.shadows,
        epa_table=epa_table,
    )

    eff_home_delta = float(home_injury_points_delta) - 14.0 * home_loss
    eff_away_delta = float(away_injury_points_delta) - 14.0 * away_loss
    net_margin_shift = eff_home_delta - eff_away_delta
    total_shift = eff_home_delta + eff_away_delta

    margin_mean = round(baseline_lock.margin_mean_home + net_margin_shift, 2)
    score_mean = round(max(27.0, baseline_lock.score_mean_total + total_shift), 2)
    raw_wp = min(0.96, max(0.04, baseline_lock.raw_win_prob_home + net_margin_shift * 0.0315))
    cal_wp = calibrate_gse_probability(raw_wp)

    merkle = canonical_sha256(
        {
            "version": version,
            "recorded_at": recorded_at_iso,
            "coach_mindset_hash": baseline_lock.coach_mindset_hash,
            "inactive_player_ids": sorted(scratched),
            "margin_mean": margin_mean,
            "score_mean": score_mean,
        }
    )
    return TuesdayCoachBaselineLock(
        game_id=baseline_lock.game_id,
        season=baseline_lock.season,
        week=baseline_lock.week,
        home_team=baseline_lock.home_team,
        away_team=baseline_lock.away_team,
        cadence_version=version,
        locked_at_iso=recorded_at_iso,
        coach_mindset_hash=baseline_lock.coach_mindset_hash,
        cadence_merkle=merkle,
        epa_dropoff_sha256=baseline_lock.epa_dropoff_sha256,
        frozen_coach_input=baseline_lock.frozen_coach_input,
        base_home_targets=baseline_lock.base_home_targets,
        base_away_targets=baseline_lock.base_away_targets,
        home_target_allocations=MappingProxyType(home_alloc),
        away_target_allocations=MappingProxyType(away_alloc),
        inactive_player_ids=tuple(sorted(scratched)),
        margin_mean_home=margin_mean,
        score_mean_total=score_mean,
        raw_win_prob_home=round(raw_wp, 4),
        calibrated_win_prob_home=cal_wp,
        scheme_home_vs_away_def=baseline_lock.scheme_home_vs_away_def,
        scheme_away_vs_home_def=baseline_lock.scheme_away_vs_home_def,
    )


def verify_coach_mindset_unchanged(
    lock_a: TuesdayCoachBaselineLock,
    lock_b: TuesdayCoachBaselineLock,
) -> bool:
    """Verify byte-for-byte Tuesday v1.0 coachMindsetHash invariance across cadence updates."""
    return (
        lock_a.coach_mindset_hash == lock_b.coach_mindset_hash
        and compute_coach_mindset_hash(lock_b.frozen_coach_input, epa_hash=lock_b.epa_dropoff_sha256)
        == lock_a.coach_mindset_hash
    )


def verify_coach_brain_output_against_packet(
    locks: Sequence[TuesdayCoachBaselineLock],
    referenced_game_ids: Sequence[str],
    quoted_coach_hash: Optional[str] = None,
) -> Dict[str, Any]:
    """Merkle anti-hallucination gate rejecting unsealed gameIds or mutated coachMindsetHash."""
    valid_ids = {lk.game_id for lk in locks}
    valid_hashes = {lk.coach_mindset_hash for lk in locks}
    violations: List[str] = []
    for gid in referenced_game_ids:
        if gid not in valid_ids:
            violations.append(f"Unsealed game_id {gid!r} absent from Tuesday lock packet")
    if quoted_coach_hash is not None and quoted_coach_hash not in valid_hashes:
        violations.append(f"Quoted coachMindsetHash {quoted_coach_hash!r} does not match sealed v1.0 lock")
    return {"ok": len(violations) == 0, "violations": violations}


# ============================================================================ #
# 9. Pre-Built 2026 NFL Week 10 Live Evaluations (13 Games + 4 Bye Teams)
# ============================================================================ #

WEEK10_2026_BYE_TEAMS: Tuple[str, ...] = ("CHI", "DEN", "PHI", "TB")

WEEK10_2026_MATCHUP_ALIASES: Mapping[str, str] = MappingProxyType(
    {
        "LAR @ SF": "LAR @ ARI",
        "NE vs DET": "NE @ DET",
        "LAC vs BAL": "LAC @ BAL",
        "SEA vs LV": "SEA @ LV",
    }
)


@dataclass(frozen=True)
class Week10GameEvaluation:
    game_id: str
    matchup: str
    kickoff_utc: str
    venue_note: str
    verified_injury_summary: str
    coach_mindset_hash: str
    v1_cadence_merkle: str
    v3_cadence_merkle: str
    coach_hash_invariant: bool
    bqp: float
    swcc: float
    ril_sum: float
    ril_asymmetry: float
    qptsr: float
    olcai: float
    spese: float
    caofi: float
    sai: float
    modulated_sigma_pts: float
    scheme_primary_matchup: str
    wasserstein_scheme_friction: float
    away_top_target_post_sinkhorn: Tuple[str, float]
    home_top_target_post_sinkhorn: Tuple[str, float]
    situational_chaos_score: str
    injury_severity_score: str
    scheme_leverage_score: str
    readiness_confidence_score: str


def _fmt_int_100(raw_val: float, lo: int = 1, hi: int = 99) -> str:
    clipped = max(lo, min(hi, int(round(raw_val))))
    return f"{clipped}/100"


def _default_prior_metric_history() -> Dict[str, List[float]]:
    return {
        "BQP": [0.00, 0.02, 0.05, 0.09, 0.14, 0.22, 0.35],
        "SWCC": [0.00, 0.00, 0.00, 0.40, 1.10, 2.20, 4.50],
        "RIL": [0.35, 0.55, 0.78, 1.02, 1.35, 1.75, 2.30],
        "QPTSR": [0.02, 0.04, 0.06, 0.08, 0.11, 0.15, 0.21],
        "OLCAI": [0.08, 0.15, 0.24, 0.35, 0.52, 0.78, 1.15],
        "SPESE": [0.30, 0.35, 0.39, 0.42, 0.46, 0.51, 0.58],
        "CAOFI": [0.05, 0.12, 0.20, 0.28, 0.42, 0.65, 1.10],
    }


def build_week10_2026_bye_rd_updates() -> Dict[str, Dict[str, float]]:
    """Compute exact Glicko-2 idle-period bye-week RD expansions for Week 10 bye teams (CHI, DEN, PHI, TB)."""
    pre_bye = {
        "CHI": Glicko2Rating(1512.0, 68.50, 0.06),
        "DEN": Glicko2Rating(1528.0, 64.20, 0.06),
        "PHI": Glicko2Rating(1584.0, 58.00, 0.06),
        "TB": Glicko2Rating(1536.0, 62.40, 0.06),
    }
    updated = update_nfl_week_glicko2(pre_bye, completed_games=[], tau=TAU_SEALED)
    out: Dict[str, Dict[str, float]] = {}
    for team in WEEK10_2026_BYE_TEAMS:
        before = pre_bye[team]
        after = updated[team]
        out[team] = {
            "rating_before": round(before.rating, 4),
            "rating_after": round(after.rating, 4),
            "rd_before": round(before.rd, 6),
            "rd_after": round(after.rd, 6),
            "rd_delta": round(after.rd - before.rd, 6),
            "sigma": before.sigma,
        }
    return out


def build_week10_2026_slate_evaluations() -> Dict[str, Week10GameEvaluation]:
    """
    Evaluate all 13 remaining 2026 NFL Week 10 games (Sun Nov 15 & Mon Nov 16, 2026;
    TNF WAS @ NYG completed Thu Nov 12; CHI, DEN, PHI, TB on Week 10 bye).
    """
    tue_lock_iso = "2026-11-10T10:00:00Z"
    fri_report_iso = "2026-11-12T22:30:00Z"
    prior_hist = _default_prior_metric_history()

    specs: List[Dict[str, Any]] = [
        {
            "game_id": "2026_10_NE_DET",
            "away": "NE",
            "home": "DET",
            "kickoff": "2026-11-15T14:30:00Z",
            "venue": "Allianz Arena (Munich, Germany)",
            "summary": "NE RB TreVeyon Henderson OUT (illness), RB Rhamondre Stevenson Doubtful/OUT (knee) -> Corey Kiner elevated; CB Carlton Davis III OUT, OL Ben Brown OUT.",
            "spread_home": -6.5,
            "total": 46.5,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 3860.0,
            "tz_home": -5.0,
            "tz_away": -5.0,
            "tz_venue": 1.0,
            "ko_et": 9.5,
            "alt_venue": 520.0,
            "alt_away": 45.0,
            "away_off": {"ERHARDT_PERKINS_MULTI": 0.55, "WEST_COAST_QUICK": 0.25, "POWER_GAP_HEAVY_12_21": 0.20},
            "away_def": {"COVER_1_MAN_FREE": 0.35, "COVER_3_BUZZ_SINGLE_HIGH": 0.40, "COVER_2_TAMPA_JAM": 0.25},
            "home_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.45, "RPO_PISTOL_READ": 0.30, "POWER_GAP_HEAVY_12_21": 0.25},
            "home_def": {"COVER_1_MAN_FREE": 0.32, "COVER_3_BUZZ_SINGLE_HIGH": 0.38, "COVER_4_QUARTERS_MATCH": 0.30},
            "away_targets": [
                EligibleTarget("TreVeyon Henderson", "RB1", 0.22),
                EligibleTarget("Rhamondre Stevenson", "RB2", 0.16),
                EligibleTarget("Hunter Henry", "TE1", 0.26),
                EligibleTarget("Corey Kiner", "RB2", 0.12),
                EligibleTarget("A.J. Brown", "WR1", 0.24),
            ],
            "home_targets": [
                EligibleTarget("Amon-Ra St. Brown", "WR1", 0.32),
                EligibleTarget("Jahmyr Gibbs", "RB1", 0.24),
                EligibleTarget("Sam LaPorta", "TE1", 0.24),
                EligibleTarget("Jameson Williams", "WR2", 0.20),
            ],
            "scratched": ["TreVeyon Henderson", "Rhamondre Stevenson"],
            "out_starters": [
                {"side": "away", "position": "RB", "report_status": "Out", "epa_starter_prior": 0.06, "epa_backup_prior_snap_adj": -0.09, "starter_snap_share_prior_3w": 0.64, "date_modified": fri_report_iso},
            ],
            "away_inj": [
                {"position": "RB", "report_status": "Out", "snap_share_prior_3w": 0.64, "date_modified": fri_report_iso},
                {"position": "RB", "report_status": "Doubtful", "snap_share_prior_3w": 0.52, "date_modified": fri_report_iso},
                {"position": "CB", "report_status": "Out", "snap_share_prior_3w": 0.88, "date_modified": fri_report_iso},
                {"position": "OL", "report_status": "Out", "snap_share_prior_3w": 0.82, "date_modified": fri_report_iso},
            ],
            "home_inj": [
                {"position": "WR", "report_status": "Questionable", "snap_share_prior_3w": 0.89, "date_modified": fri_report_iso},
                {"position": "QB", "report_status": "Questionable", "snap_share_prior_3w": 0.99, "date_modified": fri_report_iso},
            ],
            "home_pts_delta": -0.3,
            "away_pts_delta": -2.1,
            "ol_churn_away": [0.95, 0.92, 0.45, 0.90, 0.88],
            "ol_churn_home": [0.98, 0.96, 0.97, 0.95, 0.96],
        },
        {
            "game_id": "2026_10_MIA_IND",
            "away": "MIA",
            "home": "IND",
            "kickoff": "2026-11-15T18:00:00Z",
            "venue": "Lucas Oil Stadium (Dome)",
            "summary": "MIA QB Malik Willis placed on IR (groin) -> rookie QB Kyle McCord makes first career NFL start.",
            "spread_home": -4.5,
            "total": 43.5,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 1020.0,
            "tz_home": -5.0,
            "tz_away": -5.0,
            "tz_venue": -5.0,
            "ko_et": 13.0,
            "alt_venue": 218.0,
            "alt_away": 6.0,
            "away_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.50, "WEST_COAST_QUICK": 0.35, "RPO_PISTOL_READ": 0.15},
            "away_def": {"COVER_6_9_SPLIT_FANGIO": 0.45, "COVER_3_BUZZ_SINGLE_HIGH": 0.35, "COVER_1_MAN_FREE": 0.20},
            "home_off": {"RPO_PISTOL_READ": 0.42, "POWER_GAP_HEAVY_12_21": 0.33, "WEST_COAST_QUICK": 0.25},
            "home_def": {"COVER_3_BUZZ_SINGLE_HIGH": 0.52, "COVER_2_TAMPA_JAM": 0.28, "COVER_1_MAN_FREE": 0.20},
            "away_targets": [
                EligibleTarget("Malik Washington", "WR1", 0.31),
                EligibleTarget("Ollie Gordon II", "RB1", 0.27),
                EligibleTarget("Jalen Tolbert", "WR2", 0.22),
                EligibleTarget("Julian Hill", "TE1", 0.20),
            ],
            "home_targets": [
                EligibleTarget("Ashton Dulin", "WR1", 0.28),
                EligibleTarget("Tyler Warren", "TE1", 0.26),
                EligibleTarget("Anthony Gould", "SLOT", 0.25),
                EligibleTarget("Jonathan Taylor", "RB1", 0.21),
            ],
            "scratched": [],
            "out_starters": [
                {"side": "away", "position": "QB", "report_status": "IR", "epa_starter_prior": 0.05, "epa_backup_prior_snap_adj": -0.14, "starter_snap_share_prior_3w": 0.96, "date_modified": fri_report_iso},
            ],
            "away_inj": [
                {"position": "QB", "report_status": "IR", "snap_share_prior_3w": 0.96, "date_modified": fri_report_iso},
            ],
            "home_inj": [],
            "home_pts_delta": 0.0,
            "away_pts_delta": -2.8,
            "ol_churn_away": [0.92, 0.89, 0.94, 0.86, 0.91],
            "ol_churn_home": [0.97, 0.95, 0.96, 0.94, 0.96],
        },
        {
            "game_id": "2026_10_MIN_GB",
            "away": "MIN",
            "home": "GB",
            "kickoff": "2026-11-15T18:00:00Z",
            "venue": "Lambeau Field",
            "summary": "GB RB Josh Jacobs OUT (fractured ring finger) -> Kaleb Johnson & Pierre Strong absorb wide-zone/gap carries (PHI on Week 10 bye).",
            "spread_home": -2.5,
            "total": 45.5,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 255.0,
            "tz_home": -6.0,
            "tz_away": -6.0,
            "tz_venue": -6.0,
            "ko_et": 13.0,
            "alt_venue": 195.0,
            "alt_away": 255.0,
            "away_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.48, "AIR_CORYELL_VERTICAL": 0.32, "WEST_COAST_QUICK": 0.20},
            "away_def": {"COVER_0_SIM_AMOEBAS_DROP8": 0.48, "COVER_6_9_SPLIT_FANGIO": 0.30, "COVER_2_TAMPA_JAM": 0.22},
            "home_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.46, "RPO_PISTOL_READ": 0.28, "POWER_GAP_HEAVY_12_21": 0.26},
            "home_def": {"COVER_4_QUARTERS_MATCH": 0.38, "COVER_6_9_SPLIT_FANGIO": 0.34, "COVER_3_BUZZ_SINGLE_HIGH": 0.28},
            "away_targets": [
                EligibleTarget("Justin Jefferson", "WR1", 0.34),
                EligibleTarget("Jordan Addison", "WR2", 0.24),
                EligibleTarget("T.J. Hockenson", "TE1", 0.23),
                EligibleTarget("Aaron Jones", "RB1", 0.19),
            ],
            "home_targets": [
                EligibleTarget("Josh Jacobs", "RB1", 0.22),
                EligibleTarget("Matthew Golden", "SLOT", 0.26),
                EligibleTarget("Tucker Kraft", "TE1", 0.22),
                EligibleTarget("Christian Watson", "WR1", 0.18),
                EligibleTarget("Kaleb Johnson", "RB2", 0.12),
            ],
            "scratched": ["Josh Jacobs"],
            "out_starters": [
                {"side": "home", "position": "RB", "report_status": "Out", "epa_starter_prior": 0.07, "epa_backup_prior_snap_adj": -0.04, "starter_snap_share_prior_3w": 0.71, "date_modified": fri_report_iso},
            ],
            "away_inj": [],
            "home_inj": [
                {"position": "RB", "report_status": "Out", "snap_share_prior_3w": 0.71, "date_modified": fri_report_iso},
            ],
            "home_pts_delta": -1.4,
            "away_pts_delta": 0.0,
            "ol_churn_away": [0.96, 0.95, 0.97, 0.94, 0.95],
            "ol_churn_home": [0.95, 0.96, 0.94, 0.93, 0.95],
        },
        {
            "game_id": "2026_10_KC_ATL",
            "away": "KC",
            "home": "ATL",
            "kickoff": "2026-11-15T18:00:00Z",
            "venue": "Mercedes-Benz Stadium (Dome)",
            "summary": "KC QB Patrick Mahomes active (elbow, full practice), WR Xavier Worthy Questionable (hamstring) vs ATL wide-zone structure.",
            "spread_home": 3.5,
            "total": 47.5,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 675.0,
            "tz_home": -5.0,
            "tz_away": -6.0,
            "tz_venue": -5.0,
            "ko_et": 13.0,
            "alt_venue": 305.0,
            "alt_away": 250.0,
            "away_off": {"WEST_COAST_QUICK": 0.44, "ERHARDT_PERKINS_MULTI": 0.32, "RPO_PISTOL_READ": 0.24},
            "away_def": {"COVER_0_SIM_AMOEBAS_DROP8": 0.34, "COVER_1_MAN_FREE": 0.36, "COVER_4_QUARTERS_MATCH": 0.30},
            "home_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.52, "POWER_GAP_HEAVY_12_21": 0.28, "WEST_COAST_QUICK": 0.20},
            "home_def": {"COVER_6_9_SPLIT_FANGIO": 0.40, "COVER_3_BUZZ_SINGLE_HIGH": 0.36, "COVER_2_TAMPA_JAM": 0.24},
            "away_targets": [
                EligibleTarget("Travis Kelce", "TE1", 0.29),
                EligibleTarget("Josh Downs", "SLOT", 0.30),
                EligibleTarget("Xavier Worthy", "WR1", 0.23),
                EligibleTarget("Kenneth Walker III", "RB1", 0.18),
            ],
            "home_targets": [
                EligibleTarget("Drake London", "WR1", 0.32),
                EligibleTarget("Bijan Robinson", "RB1", 0.26),
                EligibleTarget("Kyle Pitts", "TE1", 0.22),
                EligibleTarget("Jahan Dotson", "WR2", 0.20),
            ],
            "scratched": [],
            "out_starters": [],
            "away_inj": [{"position": "WR", "report_status": "Questionable", "snap_share_prior_3w": 0.76, "date_modified": fri_report_iso}],
            "home_inj": [],
            "home_pts_delta": 0.0,
            "away_pts_delta": -0.3,
            "ol_churn_away": [0.97, 0.96, 0.98, 0.95, 0.92],
            "ol_churn_home": [0.98, 0.97, 0.97, 0.96, 0.96],
        },
        {
            "game_id": "2026_10_HOU_CLE",
            "away": "HOU",
            "home": "CLE",
            "kickoff": "2026-11-15T18:00:00Z",
            "venue": "Huntington Bank Field",
            "summary": "CLE returns Deshaun Watson at QB after missing Week 9; HOU 4-3 Wide-9 edge rush stresses Browns pass protection.",
            "spread_home": 4.0,
            "total": 41.5,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 1090.0,
            "tz_home": -5.0,
            "tz_away": -6.0,
            "tz_venue": -5.0,
            "ko_et": 13.0,
            "alt_venue": 199.0,
            "alt_away": 15.0,
            "away_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.48, "AIR_CORYELL_VERTICAL": 0.30, "WEST_COAST_QUICK": 0.22},
            "away_def": {"COVER_4_QUARTERS_MATCH": 0.42, "COVER_3_BUZZ_SINGLE_HIGH": 0.36, "COVER_1_MAN_FREE": 0.22},
            "home_off": {"POWER_GAP_HEAVY_12_21": 0.38, "WEST_COAST_QUICK": 0.36, "RPO_PISTOL_READ": 0.26},
            "home_def": {"COVER_1_MAN_FREE": 0.46, "COVER_0_SIM_AMOEBAS_DROP8": 0.26, "COVER_3_BUZZ_SINGLE_HIGH": 0.28},
            "away_targets": [
                EligibleTarget("Nico Collins", "WR1", 0.33),
                EligibleTarget("Tank Dell", "WR2", 0.25),
                EligibleTarget("Dalton Schultz", "TE1", 0.22),
                EligibleTarget("Joe Mixon", "RB1", 0.20),
            ],
            "home_targets": [
                EligibleTarget("Jerry Jeudy", "WR1", 0.30),
                EligibleTarget("Cedric Tillman", "WR2", 0.26),
                EligibleTarget("Quinshon Judkins", "RB1", 0.22),
                EligibleTarget("Harold Fannin Jr.", "TE1", 0.22),
            ],
            "scratched": [],
            "out_starters": [],
            "away_inj": [],
            "home_inj": [{"position": "OL", "report_status": "Questionable", "snap_share_prior_3w": 0.85, "date_modified": fri_report_iso}],
            "home_pts_delta": -0.4,
            "away_pts_delta": 0.0,
            "ol_churn_away": [0.95, 0.94, 0.96, 0.93, 0.94],
            "ol_churn_home": [0.86, 0.90, 0.92, 0.84, 0.88],
        },
        {
            "game_id": "2026_10_CAR_NO",
            "away": "CAR",
            "home": "NO",
            "kickoff": "2026-11-15T18:00:00Z",
            "venue": "Caesars Superdome (Dome)",
            "summary": "NFC South divisional indoor matchup; clean injury slate favors timing Stick/West Coast vs split-field shells.",
            "spread_home": -3.0,
            "total": 42.5,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 650.0,
            "tz_home": -6.0,
            "tz_away": -5.0,
            "tz_venue": -6.0,
            "ko_et": 13.0,
            "alt_venue": 3.0,
            "alt_away": 229.0,
            "away_off": {"WEST_COAST_QUICK": 0.45, "SHANAHAN_WIDE_ZONE_BOOT": 0.35, "POWER_GAP_HEAVY_12_21": 0.20},
            "away_def": {"COVER_6_9_SPLIT_FANGIO": 0.44, "COVER_4_QUARTERS_MATCH": 0.32, "COVER_3_BUZZ_SINGLE_HIGH": 0.24},
            "home_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.46, "WEST_COAST_QUICK": 0.34, "AIR_CORYELL_VERTICAL": 0.20},
            "home_def": {"COVER_4_QUARTERS_MATCH": 0.38, "COVER_2_TAMPA_JAM": 0.32, "COVER_1_MAN_FREE": 0.30},
            "away_targets": [
                EligibleTarget("Tetairoa McMillan", "WR1", 0.31),
                EligibleTarget("Jalen Coker", "WR2", 0.25),
                EligibleTarget("Ja'Tavion Sanders", "TE1", 0.22),
                EligibleTarget("Chuba Hubbard", "RB1", 0.22),
            ],
            "home_targets": [
                EligibleTarget("Chris Olave", "WR1", 0.33),
                EligibleTarget("Alvin Kamara", "RB1", 0.27),
                EligibleTarget("Devaughn Vele", "WR2", 0.22),
                EligibleTarget("Juwan Johnson", "TE1", 0.18),
            ],
            "scratched": [],
            "out_starters": [],
            "away_inj": [],
            "home_inj": [],
            "home_pts_delta": 0.0,
            "away_pts_delta": 0.0,
            "ol_churn_away": [0.95, 0.95, 0.94, 0.96, 0.95],
            "ol_churn_home": [0.93, 0.94, 0.92, 0.95, 0.94],
        },
        {
            "game_id": "2026_10_BUF_NYJ",
            "away": "BUF",
            "home": "NYJ",
            "kickoff": "2026-11-15T18:00:00Z",
            "venue": "MetLife Stadium",
            "summary": "BUF OL Dion Dawkins & Alec Anderson injury watch; NYJ WRs Garrett Wilson (concussion) & Omar Cooper Jr. (ankle) Questionable.",
            "spread_home": 5.5,
            "total": 44.5,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 290.0,
            "tz_home": -5.0,
            "tz_away": -5.0,
            "tz_venue": -5.0,
            "ko_et": 13.0,
            "alt_venue": 2.0,
            "alt_away": 183.0,
            "away_off": {"ERHARDT_PERKINS_MULTI": 0.46, "RPO_PISTOL_READ": 0.30, "POWER_GAP_HEAVY_12_21": 0.24},
            "away_def": {"COVER_2_TAMPA_JAM": 0.42, "COVER_4_QUARTERS_MATCH": 0.36, "COVER_3_BUZZ_SINGLE_HIGH": 0.22},
            "home_off": {"WEST_COAST_QUICK": 0.44, "SHANAHAN_WIDE_ZONE_BOOT": 0.34, "POWER_GAP_HEAVY_12_21": 0.22},
            "home_def": {"COVER_3_BUZZ_SINGLE_HIGH": 0.42, "COVER_4_QUARTERS_MATCH": 0.34, "COVER_1_MAN_FREE": 0.24},
            "away_targets": [
                EligibleTarget("Khalil Shakir", "SLOT", 0.28),
                EligibleTarget("Keon Coleman", "WR1", 0.26),
                EligibleTarget("Dalton Kincaid", "TE1", 0.25),
                EligibleTarget("James Cook", "RB1", 0.21),
            ],
            "home_targets": [
                EligibleTarget("Garrett Wilson", "WR1", 0.34),
                EligibleTarget("Breece Hall", "RB1", 0.26),
                EligibleTarget("Omar Cooper Jr.", "WR2", 0.21),
                EligibleTarget("Mason Taylor", "TE1", 0.19),
            ],
            "scratched": [],
            "out_starters": [],
            "away_inj": [
                {"position": "LT", "report_status": "Questionable", "snap_share_prior_3w": 0.96, "date_modified": fri_report_iso},
                {"position": "OL", "report_status": "Questionable", "snap_share_prior_3w": 0.68, "date_modified": fri_report_iso},
            ],
            "home_inj": [
                {"position": "WR", "report_status": "Questionable", "snap_share_prior_3w": 0.91, "date_modified": fri_report_iso},
                {"position": "WR", "report_status": "Questionable", "snap_share_prior_3w": 0.72, "date_modified": fri_report_iso},
            ],
            "home_pts_delta": -0.6,
            "away_pts_delta": -0.5,
            "ol_churn_away": [0.84, 0.94, 0.96, 0.88, 0.92],
            "ol_churn_home": [0.92, 0.91, 0.94, 0.90, 0.93],
        },
        {
            "game_id": "2026_10_JAX_TEN",
            "away": "JAX",
            "home": "TEN",
            "kickoff": "2026-11-15T18:00:00Z",
            "venue": "Nissan Stadium",
            "summary": "JAX enters off Week 9 TNF mini-bye (10d rest compression psi=0.837); RB Bhayshul Tuten Questionable (ankle).",
            "spread_home": 3.0,
            "total": 42.0,
            "rest_away": 10.0,
            "rest_home": 7.0,
            "travel_miles": 495.0,
            "tz_home": -6.0,
            "tz_away": -5.0,
            "tz_venue": -6.0,
            "ko_et": 13.0,
            "alt_venue": 120.0,
            "alt_away": 5.0,
            "away_off": {"WEST_COAST_QUICK": 0.42, "SHANAHAN_WIDE_ZONE_BOOT": 0.36, "RPO_PISTOL_READ": 0.22},
            "away_def": {"COVER_1_MAN_FREE": 0.38, "COVER_3_BUZZ_SINGLE_HIGH": 0.40, "COVER_2_TAMPA_JAM": 0.22},
            "home_off": {"WEST_COAST_QUICK": 0.46, "POWER_GAP_HEAVY_12_21": 0.30, "AIR_CORYELL_VERTICAL": 0.24},
            "home_def": {"COVER_6_9_SPLIT_FANGIO": 0.40, "COVER_4_QUARTERS_MATCH": 0.34, "BEAR_46_HEAVY_FRONT": 0.26},
            "away_targets": [
                EligibleTarget("Brian Thomas Jr.", "WR1", 0.33),
                EligibleTarget("Travis Hunter", "WR2", 0.27),
                EligibleTarget("Brenton Strange", "TE1", 0.21),
                EligibleTarget("Bhayshul Tuten", "RB1", 0.19),
            ],
            "home_targets": [
                EligibleTarget("Calvin Ridley", "WR1", 0.30),
                EligibleTarget("Tony Pollard", "RB1", 0.25),
                EligibleTarget("Daniel Bellinger", "TE1", 0.23),
                EligibleTarget("Elic Ayomanor", "WR2", 0.22),
            ],
            "scratched": [],
            "out_starters": [],
            "away_inj": [{"position": "RB", "report_status": "Questionable", "snap_share_prior_3w": 0.42, "date_modified": fri_report_iso}],
            "home_inj": [],
            "home_pts_delta": 0.0,
            "away_pts_delta": -0.2,
            "ol_churn_away": [0.95, 0.94, 0.95, 0.94, 0.95],
            "ol_churn_home": [0.91, 0.92, 0.90, 0.93, 0.91],
        },
        {
            "game_id": "2026_10_LAR_ARI",
            "away": "LAR",
            "home": "ARI",
            "kickoff": "2026-11-15T21:05:00Z",
            "venue": "State Farm Stadium (Dome — 2026 W10 LAR @ ARI; aliases NFCW LAR @ SF)",
            "summary": "LAR WRs Puka Nacua (IR, knee/toe) & Davante Adams (OUT, targeting W13) both out; ARI QB Gardner Minshew IR & WR Michael Wilson IR -> rookie QB Carson Beck starts.",
            "spread_home": 4.5,
            "total": 44.0,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 370.0,
            "tz_home": -7.0,
            "tz_away": -8.0,
            "tz_venue": -7.0,
            "ko_et": 16.08,
            "alt_venue": 326.0,
            "alt_away": 30.0,
            "away_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.56, "WEST_COAST_QUICK": 0.28, "POWER_GAP_HEAVY_12_21": 0.16},
            "away_def": {"COVER_6_9_SPLIT_FANGIO": 0.44, "COVER_4_QUARTERS_MATCH": 0.34, "COVER_3_BUZZ_SINGLE_HIGH": 0.22},
            "home_off": {"POWER_GAP_HEAVY_12_21": 0.42, "SHANAHAN_WIDE_ZONE_BOOT": 0.34, "RPO_PISTOL_READ": 0.24},
            "home_def": {"COVER_4_QUARTERS_MATCH": 0.40, "COVER_6_9_SPLIT_FANGIO": 0.36, "COVER_0_SIM_AMOEBAS_DROP8": 0.24},
            "away_targets": [
                EligibleTarget("Puka Nacua", "WR1", 0.33),
                EligibleTarget("Davante Adams", "WR2", 0.27),
                EligibleTarget("Tyler Higbee", "TE1", 0.15),
                EligibleTarget("Konata Mumpfield", "WR3", 0.13),
                EligibleTarget("Kyren Williams", "RB1", 0.12),
            ],
            "home_targets": [
                EligibleTarget("Michael Wilson", "WR2", 0.22),
                EligibleTarget("Trey McBride", "TE1", 0.31),
                EligibleTarget("Kendrick Bourne", "WR1", 0.28),
                EligibleTarget("Tyler Allgeier", "RB1", 0.19),
            ],
            "scratched": ["Puka Nacua", "Davante Adams", "Michael Wilson"],
            "out_starters": [
                {"side": "away", "position": "WR", "report_status": "IR", "epa_starter_prior": 0.24, "epa_backup_prior_snap_adj": -0.05, "starter_snap_share_prior_3w": 0.89, "date_modified": fri_report_iso},
                {"side": "away", "position": "WR", "report_status": "Out", "epa_starter_prior": 0.16, "epa_backup_prior_snap_adj": -0.04, "starter_snap_share_prior_3w": 0.82, "date_modified": fri_report_iso},
                {"side": "home", "position": "QB", "report_status": "IR", "epa_starter_prior": 0.04, "epa_backup_prior_snap_adj": -0.13, "starter_snap_share_prior_3w": 0.94, "date_modified": fri_report_iso},
                {"side": "home", "position": "WR", "report_status": "IR", "epa_starter_prior": 0.11, "epa_backup_prior_snap_adj": -0.03, "starter_snap_share_prior_3w": 0.78, "date_modified": fri_report_iso},
            ],
            "away_inj": [
                {"position": "WR", "report_status": "IR", "snap_share_prior_3w": 0.89, "date_modified": fri_report_iso},
                {"position": "WR", "report_status": "Out", "snap_share_prior_3w": 0.82, "date_modified": fri_report_iso},
            ],
            "home_inj": [
                {"position": "QB", "report_status": "IR", "snap_share_prior_3w": 0.94, "date_modified": fri_report_iso},
                {"position": "WR", "report_status": "IR", "snap_share_prior_3w": 0.78, "date_modified": fri_report_iso},
            ],
            "home_pts_delta": -2.9,
            "away_pts_delta": -2.6,
            "ol_churn_away": [0.92, 0.88, 0.94, 0.91, 0.93],
            "ol_churn_home": [0.94, 0.93, 0.95, 0.92, 0.94],
        },
        {
            "game_id": "2026_10_SEA_LV",
            "away": "SEA",
            "home": "LV",
            "kickoff": "2026-11-15T21:05:00Z",
            "venue": "Allegiant Stadium (Dome)",
            "summary": "SEA QB Sam Darnold OUT (quad/ribs) -> Drew Lock starts (LT Cross & LG Nelson DNP); LV starts rookie #1 pick Fernando Mendoza after trading Kirk Cousins.",
            "spread_home": 6.5,
            "total": 43.0,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 870.0,
            "tz_home": -8.0,
            "tz_away": -8.0,
            "tz_venue": -8.0,
            "ko_et": 16.08,
            "alt_venue": 610.0,
            "alt_away": 10.0,
            "away_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.44, "AIR_CORYELL_VERTICAL": 0.34, "WEST_COAST_QUICK": 0.22},
            "away_def": {"COVER_6_9_SPLIT_FANGIO": 0.42, "COVER_4_QUARTERS_MATCH": 0.36, "COVER_0_SIM_AMOEBAS_DROP8": 0.22},
            "home_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.54, "WEST_COAST_QUICK": 0.28, "POWER_GAP_HEAVY_12_21": 0.18},
            "home_def": {"COVER_3_BUZZ_SINGLE_HIGH": 0.44, "COVER_2_TAMPA_JAM": 0.30, "COVER_1_MAN_FREE": 0.26},
            "away_targets": [
                EligibleTarget("Jaxon Smith-Njigba", "WR1", 0.33),
                EligibleTarget("Tory Horton", "WR2", 0.27),
                EligibleTarget("Zach Charbonnet", "RB1", 0.21),
                EligibleTarget("AJ Barner", "TE1", 0.19),
            ],
            "home_targets": [
                EligibleTarget("Brock Bowers", "TE1", 0.34),
                EligibleTarget("Jalen Nailor", "WR1", 0.26),
                EligibleTarget("Tre Tucker", "WR2", 0.21),
                EligibleTarget("Ashton Jeanty", "RB1", 0.19),
            ],
            "scratched": [],
            "out_starters": [
                {"side": "away", "position": "QB", "report_status": "Out", "epa_starter_prior": 0.12, "epa_backup_prior_snap_adj": 0.01, "starter_snap_share_prior_3w": 0.85, "date_modified": fri_report_iso},
                {"side": "home", "position": "QB", "report_status": "Out", "epa_starter_prior": 0.09, "epa_backup_prior_snap_adj": -0.08, "starter_snap_share_prior_3w": 0.98, "date_modified": fri_report_iso},
            ],
            "away_inj": [
                {"position": "QB", "report_status": "Out", "snap_share_prior_3w": 0.85, "date_modified": fri_report_iso},
                {"position": "LT", "report_status": "Questionable", "snap_share_prior_3w": 0.97, "date_modified": fri_report_iso},
                {"position": "OG", "report_status": "Questionable", "snap_share_prior_3w": 0.96, "date_modified": fri_report_iso},
            ],
            "home_inj": [
                {"position": "OG", "report_status": "Questionable", "snap_share_prior_3w": 0.84, "date_modified": fri_report_iso},
            ],
            "home_pts_delta": -1.8,
            "away_pts_delta": -1.5,
            "ol_churn_away": [0.78, 0.80, 0.96, 0.85, 0.93],
            "ol_churn_home": [0.94, 0.88, 0.95, 0.93, 0.94],
        },
        {
            "game_id": "2026_10_SF_DAL",
            "away": "SF",
            "home": "DAL",
            "kickoff": "2026-11-15T21:25:00Z",
            "venue": "AT&T Stadium (Retractable)",
            "summary": "SF Shanahan 21/12 outside-zone bootleg attacks DAL front; DAL WR George Pickens Questionable (hamstring).",
            "spread_home": 4.5,
            "total": 48.5,
            "rest_away": 7.0,
            "rest_home": 7.0,
            "travel_miles": 1465.0,
            "tz_home": -6.0,
            "tz_away": -8.0,
            "tz_venue": -6.0,
            "ko_et": 16.42,
            "alt_venue": 184.0,
            "alt_away": 4.0,
            "away_off": {"SHANAHAN_WIDE_ZONE_BOOT": 0.58, "POWER_GAP_HEAVY_12_21": 0.24, "WEST_COAST_QUICK": 0.18},
            "away_def": {"COVER_4_QUARTERS_MATCH": 0.40, "COVER_3_BUZZ_SINGLE_HIGH": 0.38, "COVER_2_TAMPA_JAM": 0.22},
            "home_off": {"WEST_COAST_QUICK": 0.46, "AIR_CORYELL_VERTICAL": 0.34, "RPO_PISTOL_READ": 0.20},
            "home_def": {"COVER_1_MAN_FREE": 0.38, "COVER_3_BUZZ_SINGLE_HIGH": 0.36, "COVER_2_TAMPA_JAM": 0.26},
            "away_targets": [
                EligibleTarget("George Kittle", "TE1", 0.28),
                EligibleTarget("Deebo Samuel Sr.", "WR1", 0.27),
                EligibleTarget("Christian McCaffrey", "RB1", 0.25),
                EligibleTarget("Brandin Cooks", "WR2", 0.20),
            ],
            "home_targets": [
                EligibleTarget("CeeDee Lamb", "WR1", 0.35),
                EligibleTarget("George Pickens", "WR2", 0.24),
                EligibleTarget("Brevyn Spann-Ford", "TE1", 0.23),
                EligibleTarget("Jonathan Mingo", "WR3", 0.18),
            ],
            "scratched": [],
            "out_starters": [],
            "away_inj": [],
            "home_inj": [{"position": "WR", "report_status": "Questionable", "snap_share_prior_3w": 0.81, "date_modified": fri_report_iso}],
            "home_pts_delta": -0.5,
            "away_pts_delta": 0.0,
            "ol_churn_away": [0.97, 0.95, 0.96, 0.95, 0.96],
            "ol_churn_home": [0.93, 0.92, 0.94, 0.91, 0.93],
        },
        {
            "game_id": "2026_10_PIT_CIN",
            "away": "PIT",
            "home": "CIN",
            "kickoff": "2026-11-16T01:20:00Z",
            "venue": "Paycor Stadium (SNF)",
            "summary": "AFC North SNF: PIT coming off Week 9 bye (14d rest psi=0.707) with 3-4 edge rush vs CIN 11-personnel spread vertical attack.",
            "spread_home": -2.5,
            "total": 46.0,
            "rest_away": 14.0,
            "rest_home": 7.0,
            "travel_miles": 257.0,
            "tz_home": -5.0,
            "tz_away": -5.0,
            "tz_venue": -5.0,
            "ko_et": 20.33,
            "alt_venue": 149.0,
            "alt_away": 225.0,
            "away_off": {"POWER_GAP_HEAVY_12_21": 0.46, "SHANAHAN_WIDE_ZONE_BOOT": 0.34, "AIR_CORYELL_VERTICAL": 0.20},
            "away_def": {"COVER_3_BUZZ_SINGLE_HIGH": 0.42, "COVER_1_MAN_FREE": 0.38, "COVER_0_SIM_AMOEBAS_DROP8": 0.20},
            "home_off": {"AIR_RAID_10P_TEMPO": 0.38, "WEST_COAST_QUICK": 0.36, "AIR_CORYELL_VERTICAL": 0.26},
            "home_def": {"COVER_6_9_SPLIT_FANGIO": 0.38, "COVER_2_TAMPA_JAM": 0.34, "COVER_3_BUZZ_SINGLE_HIGH": 0.28},
            "away_targets": [
                EligibleTarget("DK Metcalf", "WR1", 0.31),
                EligibleTarget("Pat Freiermuth", "TE1", 0.25),
                EligibleTarget("Jaylen Warren", "RB1", 0.23),
                EligibleTarget("Calvin Austin III", "SLOT", 0.21),
            ],
            "home_targets": [
                EligibleTarget("Ja'Marr Chase", "WR1", 0.36),
                EligibleTarget("Tee Higgins", "WR2", 0.27),
                EligibleTarget("Chase Brown", "RB1", 0.20),
                EligibleTarget("Mike Gesicki", "TE1", 0.17),
            ],
            "scratched": [],
            "out_starters": [],
            "away_inj": [],
            "home_inj": [],
            "home_pts_delta": 0.0,
            "away_pts_delta": 0.0,
            "ol_churn_away": [0.97, 0.96, 0.97, 0.96, 0.97],
            "ol_churn_home": [0.92, 0.90, 0.94, 0.89, 0.91],
        },
        {
            "game_id": "2026_10_LAC_BAL",
            "away": "LAC",
            "home": "BAL",
            "kickoff": "2026-11-17T01:15:00Z",
            "venue": "M&T Bank Stadium (MNF)",
            "summary": "BAL QB Lamar Jackson IR (& Tyler Huntley IR) -> newly acquired Jacoby Brissett starts MNF after 11d post-TNF prep; LAC WR Ladd McConkey (back) DNP Thu.",
            "spread_home": -4.5,
            "total": 44.5,
            "rest_away": 8.0,
            "rest_home": 11.0,
            "travel_miles": 2295.0,
            "tz_home": -5.0,
            "tz_away": -8.0,
            "tz_venue": -5.0,
            "ko_et": 20.25,
            "alt_venue": 10.0,
            "alt_away": 30.0,
            "away_off": {"POWER_GAP_HEAVY_12_21": 0.44, "AIR_CORYELL_VERTICAL": 0.32, "WEST_COAST_QUICK": 0.24},
            "away_def": {"COVER_6_9_SPLIT_FANGIO": 0.46, "COVER_4_QUARTERS_MATCH": 0.34, "COVER_2_TAMPA_JAM": 0.20},
            "home_off": {"POWER_GAP_HEAVY_12_21": 0.48, "SHANAHAN_WIDE_ZONE_BOOT": 0.32, "WEST_COAST_QUICK": 0.20},
            "home_def": {"COVER_4_QUARTERS_MATCH": 0.38, "COVER_0_SIM_AMOEBAS_DROP8": 0.32, "COVER_6_9_SPLIT_FANGIO": 0.30},
            "away_targets": [
                EligibleTarget("Ladd McConkey", "WR1", 0.31),
                EligibleTarget("Quentin Johnston", "WR2", 0.24),
                EligibleTarget("Oronde Gadsden II", "TE1", 0.23),
                EligibleTarget("KeAndre Lambert-Smith", "WR3", 0.22),
            ],
            "home_targets": [
                EligibleTarget("Zay Flowers", "WR1", 0.33),
                EligibleTarget("Mark Andrews", "TE1", 0.25),
                EligibleTarget("Rashod Bateman", "WR2", 0.22),
                EligibleTarget("Derrick Henry", "RB1", 0.20),
            ],
            "scratched": [],
            "out_starters": [
                {"side": "home", "position": "QB", "report_status": "IR", "epa_starter_prior": 0.23, "epa_backup_prior_snap_adj": 0.02, "starter_snap_share_prior_3w": 0.98, "date_modified": fri_report_iso},
            ],
            "away_inj": [
                {"position": "WR", "report_status": "Questionable", "snap_share_prior_3w": 0.86, "date_modified": fri_report_iso},
                {"position": "TE", "report_status": "Questionable", "snap_share_prior_3w": 0.65, "date_modified": fri_report_iso},
            ],
            "home_inj": [
                {"position": "QB", "report_status": "IR", "snap_share_prior_3w": 0.98, "date_modified": fri_report_iso},
            ],
            "home_pts_delta": -3.2,
            "away_pts_delta": -0.6,
            "ol_churn_away": [0.89, 0.85, 0.94, 0.87, 0.91],
            "ol_churn_home": [0.95, 0.94, 0.96, 0.93, 0.95],
        },
    ]

    results: Dict[str, Week10GameEvaluation] = {}
    baseline_ol = [0.97, 0.96, 0.97, 0.96, 0.97]

    for sp in specs:
        ko_dt = parse_ts_utc(sp["kickoff"])
        assert ko_dt is not None
        matchup_key = f"{sp['away']} @ {sp['home']}"

        bqp = compute_bqp(sp["out_starters"], ko_dt, season=2026) or 0.0
        swcc = (
            compute_swcc(
                sp["rest_away"],
                sp["rest_home"],
                sp["travel_miles"],
                1080.0,
                1060.0,
                tue_lock_iso,
                ko_dt,
            )
            or 0.0
        )
        ril_dict = compute_ril_game(sp["home_inj"], sp["away_inj"], sp["rest_home"], sp["rest_away"], ko_dt)
        assert ril_dict is not None
        qptsr = (
            compute_qptsr(
                {"prior_dropbacks": 240.0, "quick_pressures": 48.0, "quick_pressure_sacks": 10.0, "opp_prior_prr": 0.36, "prior_scramble_rate": 0.06},
                {"prior_dropbacks": 210.0, "quick_pressures": 44.0, "quick_pressure_sacks": 9.0, "opp_prior_prr": 0.35, "prior_scramble_rate": 0.07},
            )
            or 0.0
        )
        olcai = (
            compute_olcai_game(
                sp["ol_churn_home"],
                baseline_ol,
                [],
                sp["ol_churn_away"],
                baseline_ol,
                [],
                ko_dt,
            )
            or 0.0
        )
        spese = compute_spese(63.5, 62.8, 0.12, 0.34, 0.11, 0.36) or 0.42
        caofi = (
            compute_caofi(
                sp["tz_home"],
                sp["tz_away"],
                sp["tz_venue"],
                sp["ko_et"],
                sp["alt_venue"],
                sp["alt_away"],
                68.0,
                0.86,
            )
            or 0.0
        )

        sai_res = compute_sai(
            {
                "BQP": bqp,
                "SWCC": swcc,
                "RIL": ril_dict["ril_sum"],
                "QPTSR": qptsr,
                "OLCAI": olcai,
                "SPESE": spese,
                "CAOFI": caofi,
            },
            prior_hist,
        )
        sai_val = sai_res["sai"]
        mod_sigma = modulated_sigma(GAUSSIAN_SIGMA_BASE, sai_val, beta=0.045, mode="linear")

        coach_in = CoachSimPureInput(
            game_id=sp["game_id"],
            season=2026,
            week=10,
            home_team=sp["home"],
            away_team=sp["away"],
            coach_support=0.81,
            neutral_pass_rate_home=0.56,
            neutral_pass_rate_away=0.55,
            staff_aggression_home=0.62,
            staff_aggression_away=0.60,
            tau=TAU_SEALED,
            home_off_scheme=sp["home_off"],
            home_def_shell=sp["home_def"],
            away_off_scheme=sp["away_off"],
            away_def_shell=sp["away_def"],
        )
        v1 = lock_tuesday_coach_baseline(
            coach_in,
            sp["home_targets"],
            sp["away_targets"],
            tue_lock_iso,
            base_market_spread_home=sp["spread_home"],
            base_market_total=sp["total"],
        )
        v3 = apply_cadence_injury_overlay(
            v1,
            version="v3.0",
            recorded_at_iso=fri_report_iso,
            inactive_player_ids=sp["scratched"],
            home_injury_points_delta=sp["home_pts_delta"],
            away_injury_points_delta=sp["away_pts_delta"],
        )
        invariant = verify_coach_mindset_unchanged(v1, v3)

        top_away = max(v3.away_target_allocations.items(), key=lambda kv: kv[1])
        top_home = max(v3.home_target_allocations.items(), key=lambda kv: kv[1])

        chaos_100 = _fmt_int_100(32.0 + 18.0 * min(3.5, sai_val))
        inj_100 = _fmt_int_100(18.0 + 24.0 * ril_dict["ril_sum"] + 35.0 * bqp)
        scheme_100 = f"{int(v3.scheme_home_vs_away_def['scheme_leverage_int_100'])}/100"
        conf_100 = _fmt_int_100(92.0 - 9.5 * min(3.0, ril_dict["ril_sum"]) - 12.0 * bqp)

        results[matchup_key] = Week10GameEvaluation(
            game_id=sp["game_id"],
            matchup=matchup_key,
            kickoff_utc=sp["kickoff"],
            venue_note=sp["venue"],
            verified_injury_summary=sp["summary"],
            coach_mindset_hash=v3.coach_mindset_hash,
            v1_cadence_merkle=v1.cadence_merkle,
            v3_cadence_merkle=v3.cadence_merkle,
            coach_hash_invariant=invariant,
            bqp=round(bqp, 4),
            swcc=round(swcc, 4),
            ril_sum=round(ril_dict["ril_sum"], 4),
            ril_asymmetry=round(ril_dict["ril_asymmetry"], 4),
            qptsr=round(qptsr, 4),
            olcai=round(olcai, 4),
            spese=round(spese, 4),
            caofi=round(caofi, 4),
            sai=round(sai_val, 4),
            modulated_sigma_pts=round(mod_sigma, 3),
            scheme_primary_matchup=str(v3.scheme_home_vs_away_def["primary_interaction"]),
            wasserstein_scheme_friction=float(v3.scheme_home_vs_away_def["wasserstein_friction"]),
            away_top_target_post_sinkhorn=(top_away[0], round(top_away[1], 4)),
            home_top_target_post_sinkhorn=(top_home[0], round(top_home[1], 4)),
            situational_chaos_score=chaos_100,
            injury_severity_score=inj_100,
            scheme_leverage_score=scheme_100,
            readiness_confidence_score=conf_100,
        )
    return results


def resolve_week10_matchup(
    query_matchup: str,
    slate: Optional[Mapping[str, Week10GameEvaluation]] = None,
) -> Week10GameEvaluation:
    """Resolve a 2026 Week 10 matchup key or known alias (e.g. 'LAR @ SF' -> 'LAR @ ARI')."""
    board = slate if slate is not None else build_week10_2026_slate_evaluations()
    canonical = WEEK10_2026_MATCHUP_ALIASES.get(query_matchup.strip(), query_matchup.strip())
    if canonical not in board:
        raise KeyError(f"Unknown Week 10 matchup {query_matchup!r}; valid keys: {sorted(board.keys())}")
    return board[canonical]


def _self_check() -> None:
    canon = glicko2_update_period(
        Glicko2Rating(1500.0, 200.0, 0.06),
        [
            Glicko2Match(1400.0, 30.0, 1.0),
            Glicko2Match(1550.0, 100.0, 0.0),
            Glicko2Match(1700.0, 300.0, 0.0),
        ],
        tau=TAU_CANONICAL,
    )
    assert abs(canon.rating - 1464.050671) < 1e-4
    assert abs(canon.rd - 151.516524) < 1e-4
    assert abs(canon.sigma - 0.059996) < 1e-5

    idle_1 = glicko2_idle_step(Glicko2Rating(1500.0, 200.0, 0.06), 1)
    assert round(idle_1.rd, 2) == 200.27

    slate = build_week10_2026_slate_evaluations()
    byes = build_week10_2026_bye_rd_updates()
    assert len(slate) == 13
    assert set(byes.keys()) == {"CHI", "DEN", "PHI", "TB"}
    print(
        json.dumps(
            {
                "status": "OK",
                "glicko2_canonical": {
                    "rating": round(canon.rating, 6),
                    "rd": round(canon.rd, 6),
                    "sigma": round(canon.sigma, 6),
                },
                "idle_1_bye_rd": round(idle_1.rd, 4),
                "epa_dropoff_sha256": EPA_DROPOFF_SHA256,
                "week10_games_evaluated": len(slate),
                "week10_byes_updated": sorted(byes.keys()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    _self_check()
