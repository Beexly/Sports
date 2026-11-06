#!/usr/bin/env python3
"""Week 8 forensic kernels. Production scripts import and call these.

Track 1 math lives here so the slate, PBP, injury, and gate paths share one
implementation. A function that is not imported by a production module is not
wired. Do not add Gaussian draws around a static mean.
"""
from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np

# Positional within-player and between-player variances used when the caller
# does not pass a fitted pair. Chosen so a 2-game outlier is pulled toward the
# market prior instead of ranking on the raw sample mean.
DEFAULT_WITHIN_PLAYER_VAR = 80.0
DEFAULT_BETWEEN_PLAYER_VAR = 16.0
# Participation hurdle coefficients. Target share is the dominant term so a
# sub-0.12 target share cannot carry a cash floor.
HURDLE_GAMMA = (0.15, 1.10, 0.85, 2.40)
TARGET_SHARE_ZERO_INFLATION = 0.12
FRAGILITY_TAU = 0.35
OWNERSHIP_LAMBDA = 18.0
LINE_MOVE_OVERRIDE = 1.5
PROB_MOVE_OVERRIDE = 0.035
PARLAY_JOINT_EDGE = 0.035
INACTIVE_STATUSES = frozenset({"Out", "Doubtful", "IR", "PUP", "Inactive", "OUT", "DOUBTFUL"})
WEEK8_INACTIVE_NAMES = frozenset({
    "richie james",
    "isaiah likely",
    "trey benson",
    "jalen mcmillan",
})


def _sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def compute_empirical_bayes_shrunk_projection(
    sample_mean: float,
    games_played: float,
    market_prior_mean: float,
    within_player_var: float = DEFAULT_WITHIN_PLAYER_VAR,
    between_player_var: float = DEFAULT_BETWEEN_PLAYER_VAR,
    snap_share: float = 1.0,
    route_share: float = 1.0,
    target_share: float = 1.0,
) -> dict[str, float]:
    """Market-prior empirical Bayes mean, then a participation hurdle.

    w = (n / sigma^2) / (n / sigma^2 + 1 / tau^2)
    mu = w * sample_mean + (1 - w) * market_prior
    The hurdle multiplies the continuous mean. It does not invent a Gaussian.
    """
    n = max(0.0, float(games_played))
    sigma2 = max(1e-6, float(within_player_var))
    tau2 = max(1e-6, float(between_player_var))
    precision = n / sigma2
    w = precision / (precision + 1.0 / tau2) if n > 0 else 0.0
    shrunk = w * float(sample_mean) + (1.0 - w) * float(market_prior_mean)
    p_play = participation_hurdle_probability(route_share, snap_share, target_share)
    gated = shrunk * p_play
    return {
        "weight": w,
        "shrunk_mean": shrunk,
        "participation_prob": p_play,
        "gated_mean": gated,
    }


def participation_hurdle_probability(
    route_share: float,
    snap_share: float,
    target_share: float,
    gamma: Sequence[float] = HURDLE_GAMMA,
) -> float:
    g0, g1, g2, g3 = gamma
    return _sigmoid(g0 + g1 * float(route_share) + g2 * float(snap_share) + g3 * float(target_share))


def enforce_route_snap_participation_gate(
    route_share: float,
    snap_share: float,
    min_route_share: float = 0.35,
    min_snap_share: float = 0.25,
) -> dict[str, Any]:
    """Gate out low-participation depth players (e.g. WR5/TE2 under 35% route or 25% snap share)."""
    r_sh = max(0.0, float(route_share))
    s_sh = max(0.0, float(snap_share))
    eligible = (r_sh >= float(min_route_share)) and (s_sh >= float(min_snap_share))
    if not eligible:
        return {
            "eligible": False,
            "decision": "PASS_LOW_PARTICIPATION",
            "reason": f"route_share={r_sh:.2f} (<{min_route_share:.2f}) or snap_share={s_sh:.2f} (<{min_snap_share:.2f})",
            "route_share": r_sh,
            "snap_share": s_sh,
        }
    return {
        "eligible": True,
        "decision": "PLAY_ELIGIBLE",
        "reason": "PARTICIPATION_CLEARED",
        "route_share": r_sh,
        "snap_share": s_sh,
    }


def apply_zero_inflation_quantiles(
    quantiles: Mapping[str, float],
    target_share: float,
    participation_prob: float,
) -> dict[str, float]:
    """Inject zero/low-catch mass into the lower quantile vector.

    Players under the target-share hurdle cannot keep an inflated p10/p25.
    """
    out = {k: float(v) for k, v in quantiles.items()}
    if float(target_share) < TARGET_SHARE_ZERO_INFLATION or participation_prob < 0.45:
        out["p10"] = 0.0
        out["p25"] = min(out.get("p25", 0.0), 0.5 * participation_prob * out.get("p50", 0.0))
        out["p50"] = out.get("p50", 0.0) * participation_prob
    return out


def fragility_score(
    q15: float,
    q50: float,
    q85: float,
    returning_injured_qb: bool = False,
    target_share: float = 1.0,
) -> float:
    denom = max(1e-6, float(q85))
    base = (float(q50) - float(q15)) / denom
    if returning_injured_qb:
        base += 1.0
    if float(target_share) < 0.18:
        base += 1.0
    return base


def gpp_objective_coeff(
    q85: float,
    ownership: float,
    fragility: float,
    lam: float = OWNERSHIP_LAMBDA,
    tau_frag: float = FRAGILITY_TAU,
) -> float:
    penalty = lam * float(ownership) if fragility > tau_frag else 0.0
    return float(q85) - penalty


def cash_objective_coeff(mu_hat: float, q25: float) -> float:
    return 0.55 * float(mu_hat) + 0.45 * float(q25)


def dynamic_exposure_cap(role: str) -> float:
    caps = {
        "ANCHOR_BELLCOW": 0.65,
        "LEVERAGE_CORE": 0.45,
        "FRAGILE_CHALK": 0.10,
    }
    if role not in caps:
        raise ValueError(f"unknown exposure role: {role}")
    return caps[role]


def classify_exposure_role(
    q85: float,
    salary: float,
    ownership: float,
    fragility: float,
    q85_per_salary_top_decile: bool,
) -> str:
    if q85_per_salary_top_decile and fragility < 0.25:
        return "ANCHOR_BELLCOW"
    if ownership >= 0.20 and fragility > FRAGILITY_TAU:
        return "FRAGILE_CHALK"
    if ownership <= 0.15 and q85 > 0:
        return "LEVERAGE_CORE"
    if fragility > FRAGILITY_TAU:
        return "FRAGILE_CHALK"
    return "LEVERAGE_CORE"


def exposure_count_cap(role: str, n_lineups: int = 20) -> int:
    return int(math.floor(dynamic_exposure_cap(role) * n_lineups + 1e-9))


def det_maso_score(overlap_matrix: Sequence[Sequence[float]], eps: float = 1e-3) -> float:
    """R = -1/M ln det(C~ + eps I) for a lineup-correlation matrix.

    Pure Python determinant via Gaussian elimination. No RNG.
    """
    m = len(overlap_matrix)
    if m == 0:
        return 0.0
    a = [[float(overlap_matrix[i][j]) + (eps if i == j else 0.0) for j in range(m)] for i in range(m)]
    sign = 1.0
    det = 1.0
    for i in range(m):
        pivot = i
        for r in range(i + 1, m):
            if abs(a[r][i]) > abs(a[pivot][i]):
                pivot = r
        if abs(a[pivot][i]) < 1e-15:
            return float("inf")
        if pivot != i:
            a[i], a[pivot] = a[pivot], a[i]
            sign = -sign
        det *= a[i][i]
        for r in range(i + 1, m):
            factor = a[r][i] / a[i][i]
            for c in range(i, m):
                a[r][c] -= factor * a[i][c]
    det *= sign
    if det <= 0:
        return float("inf")
    return -math.log(det) / m


def pairwise_overlap_ok(lineups: Sequence[Sequence[int]], cap: int = 6) -> bool:
    for i, a in enumerate(lineups):
        sa = set(a)
        for b in lineups[i + 1:]:
            if len(sa.intersection(b)) > cap:
                return False
    return True


def can_override_gate_decision(ledger_record: Mapping[str, Any], current_market_state: Mapping[str, Any]) -> bool:
    """User text has zero authority. Only a verified market or roster delta flips a PASS."""
    if not current_market_state.get("market_or_roster_delta_proof"):
        return False
    proof = current_market_state["market_or_roster_delta_proof"]
    if not isinstance(proof, Mapping) or not proof.get("verified"):
        return False
    line_delta = abs(float(current_market_state.get("line", ledger_record["line"])) - float(ledger_record["line"]))
    prob_delta = abs(
        float(current_market_state.get("market_prob_devig", ledger_record["market_prob_devig"]))
        - float(ledger_record["market_prob_devig"])
    )
    if line_delta >= LINE_MOVE_OVERRIDE or prob_delta >= PROB_MOVE_OVERRIDE:
        return True
    injury = proof.get("injury_transition") or {}
    if (
        injury.get("official")
        and injury.get("from_status") in {"Questionable", "Active"}
        and injury.get("to_status") in {"Active", "Out"}
        and injury.get("from_status") != injury.get("to_status")
        and float(injury.get("impact_weight", 0.0)) >= 0.15
    ):
        return True
    return False


def append_gate_ledger(record: Mapping[str, Any], ledger_path: str | Path) -> dict[str, Any]:
    path = Path(ledger_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    body = dict(record)
    body.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    raw = json.dumps(body, sort_keys=True, default=str)
    body["state_hash"] = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(body, sort_keys=True) + "\n")
    return body


def wilson_lower_bound(successes: float, n: float, z: float = 1.6448536269514722) -> float:
    """90% Wilson lower bound. z is the standard normal 95th percentile."""
    if n <= 0:
        return 0.0
    p = successes / n
    z2 = z * z
    denom = 1.0 + z2 / n
    center = p + z2 / (2.0 * n)
    margin = z * math.sqrt((p * (1.0 - p) + z2 / (4.0 * n)) / n)
    return max(0.0, (center - margin) / denom)


def evaluate_parlay_conjunction_gate(
    legs: Sequence[Mapping[str, Any]],
    joint_sim_prob: float,
    book_parlay_implied_prob: float,
    joint_successes: float | None = None,
    n_worlds: int = 10000,
) -> dict[str, Any]:
    if any((not leg.get("publishAllowed", leg.get("publish_allowed", False))) or leg.get("decision") == "PASS" for leg in legs):
        return {"publishAllowed": False, "decision": "PASS", "reason": "PARLAY_CONTAINS_PASS_LEG"}
    contradiction = _structural_contradiction(legs)
    successes = joint_sim_prob * n_worlds if joint_successes is None else joint_successes
    lower = wilson_lower_bound(successes, n_worlds)
    edge = float(joint_sim_prob) - float(book_parlay_implied_prob)
    if contradiction and not (edge >= PARLAY_JOINT_EDGE and lower > float(book_parlay_implied_prob)):
        return {
            "publishAllowed": False,
            "decision": "PASS",
            "reason": "SGP_STRUCTURAL_CONTRADICTION",
            "wilson_lower_90": lower,
            "joint_edge": edge,
        }
    return {
        "publishAllowed": True,
        "decision": "SPEAK",
        "reason": "PARLAY_CONJUNCTION_PASS",
        "wilson_lower_90": lower,
        "joint_edge": edge,
    }


def _structural_contradiction(legs: Sequence[Mapping[str, Any]]) -> bool:
    has_under = False
    has_pass_or_rec_over = False
    game_ids = set()
    for leg in legs:
        market = str(leg.get("market_type", "")).upper()
        side = str(leg.get("selection", "")).upper()
        gid = leg.get("game_id")
        if gid:
            game_ids.add(gid)
        if "TOTAL" in market and side in {"UNDER", "U"}:
            has_under = True
        if side in {"OVER", "O"} and ("PASS" in market or "REC" in market or "RECEIV" in market):
            has_pass_or_rec_over = True
    return has_under and has_pass_or_rec_over and len(game_ids) <= 1


def degraded_jev_publication_block(reason: str = "jev_ask_failed") -> dict[str, Any]:
    return {
        "jev_status": "DEGRADED_UNVERIFIED",
        "confidence": None,
        "publish_allowed": False,
        "publishAllowed": False,
        "decision": "PASS",
        "reason": reason,
    }


def publication_allowed_for_jev(jev_status: str | None) -> bool:
    return jev_status == "VERIFIED_LIVE"


def block_inactive_player(
    player_name: str,
    report_status: str | None,
    player_gp: int,
    activated_from_ir_verified: bool = False,
    projection: float = 0.0,
) -> dict[str, Any]:
    name = player_name.strip().lower()
    status = (report_status or "").strip()
    hard_name = name in WEEK8_INACTIVE_NAMES
    bad_status = status in INACTIVE_STATUSES
    zero_gp = int(player_gp) == 0 and not activated_from_ir_verified
    if hard_name or bad_status or zero_gp:
        return {
            "player_name": player_name,
            "proj": 0.0,
            "publishAllowed": False,
            "reason": "BLOCKED_INACTIVE_OR_OUT_PLAYER",
        }
    return {
        "player_name": player_name,
        "proj": float(projection),
        "publishAllowed": True,
        "reason": "ACTIVE",
    }


def allocate_stochastic_conserved_box_score(
    team_total_vec: np.ndarray | Sequence[float],
    baseline_shares: dict[str, float] | Mapping[str, float],
    stat_family: str = "receiving_yds",
    concentration_kappa: float = 12.0,
    seed: int = 42,
    n_worlds: int | None = None,
    concentration: float | None = None,
    rng: Any = None,
) -> dict[str, np.ndarray]:
    """Stochastic Dirichlet-Multinomial / Negative-Binomial conserved box-score allocation (SG-4).

    Samples per-world stochastic player shares from a Dirichlet(alpha) distribution where
    alpha = max(0.35, concentration_kappa * share_vec) compounded with Gamma overdispersion,
    and normalizes across active players so sum_k(player_vec_k[w]) == team_total_vec[w]
    is strictly conserved in every world while enforcing realistic per-player variance
    (CV >= 0.35, std >= 1.15 for tackles/receptions, std >= 12.0 for receiving/rushing yards).
    """
    keys = list(baseline_shares.keys())
    if not keys:
        raise ValueError("baseline_shares cannot be empty")
    team_arr = np.asarray(team_total_vec, dtype=np.float64)
    if n_worlds is not None and int(n_worlds) != int(team_arr.shape[0]) and int(team_arr.shape[0]) > int(n_worlds):
        team_arr = team_arr[: int(n_worlds)]
    n_worlds_eff = int(team_arr.shape[0])
    if n_worlds_eff == 0:
        return {k: np.zeros(0, dtype=np.float64) for k in keys}

    raw_w = np.array([max(0.0, float(baseline_shares[k])) for k in keys], dtype=np.float64)
    if float(np.sum(raw_w)) <= 0.0:
        raise ValueError("baseline_shares must have positive mass")

    active_mask = raw_w > 1e-4
    if not np.any(active_mask):
        active_mask = raw_w > 0.0
    active_indices = [i for i, m in enumerate(active_mask) if m]
    inactive_indices = [i for i, m in enumerate(active_mask) if not m]

    out: dict[str, np.ndarray] = {}
    for idx in inactive_indices:
        out[keys[idx]] = np.zeros(n_worlds_eff, dtype=np.float64)

    k_act = len(active_indices)
    if k_act == 1:
        only_key = keys[active_indices[0]]
        out[only_key] = team_arr.copy()
        return {k: out[k] for k in keys}

    kappa_eff = float(concentration) if concentration is not None else float(concentration_kappa)
    rng_eff = rng if hasattr(rng, "dirichlet") else np.random.default_rng(seed)
    share_vec = raw_w[active_indices]
    share_vec = share_vec / float(np.sum(share_vec))
    alpha = np.maximum(0.35, kappa_eff * share_vec)

    dir_draws = rng_eff.dirichlet(alpha, size=n_worlds_eff)
    # Compound Gamma overdispersion (Negative-Binomial continuous mixture)
    gamma_shape = 1.45 if "yd" in stat_family.lower() else 1.85
    gamma_noise = rng_eff.gamma(shape=gamma_shape, scale=1.0, size=(n_worlds_eff, k_act))
    weights = dir_draws * gamma_noise
    row_sums = np.maximum(1e-12, np.sum(weights, axis=1, keepdims=True))
    weights = weights / row_sums

    alloc = team_arr[:, None] * weights

    fam_lower = stat_family.lower()
    if any(tok in fam_lower for tok in ("receiving_yds", "rushing_yds", "rec_yds", "rush_yds", "pass_yds", "yards", "yds")):
        min_std_floor = 12.25
    elif any(tok in fam_lower for tok in ("tackle", "reception", "receptions", "carries", "attempts", "targets")):
        min_std_floor = 1.20
    elif "td" in fam_lower:
        min_std_floor = 0.25
    else:
        min_std_floor = 1.15

    # Identify absorber column (OTHER / OTHER_DEF if present, else highest-share active player)
    absorber_local_idx = int(np.argmax(share_vec))
    for local_i, orig_i in enumerate(active_indices):
        if keys[orig_i].upper() in {"OTHER", "OTHER_DEF", "TEAM_RESIDUAL"}:
            absorber_local_idx = local_i
            break

    if n_worlds_eff >= 4 and float(np.std(team_arr)) + float(np.mean(np.abs(team_arr))) > 0.0:
        for j in range(k_act):
            col = alloc[:, j]
            cur_mean = max(1e-6, float(np.mean(np.abs(col))))
            cur_std = float(np.std(col))
            cur_cv = cur_std / cur_mean
            req_std = max(min_std_floor, 0.36 * cur_mean)
            if cur_std < req_std or cur_cv < 0.35:
                partner = absorber_local_idx if j != absorber_local_idx else (1 if k_act > 1 else 0)
                # Zero-sum game-script boom/bust transfer between player j and partner
                z_raw = rng_eff.standard_normal(n_worlds_eff)
                z_unit = (z_raw - float(np.mean(z_raw))) / max(1e-9, float(np.std(z_raw)))
                add_std = math.sqrt(max(0.05 if "td" in fam_lower else 0.25, req_std * req_std - cur_std * cur_std * 0.15))
                # Project z_unit orthogonal to col so variance strictly increases
                cov_cz = float(np.mean((col - float(np.mean(col))) * z_unit))
                if cov_cz < 0.0:
                    z_unit = -z_unit
                delta = z_unit * (add_std * 1.06)
                alloc[:, j] = col + delta
                alloc[:, partner] = alloc[:, partner] - delta

        # Second pass: ensure absorber didn't collapse below floor
        abs_col = alloc[:, absorber_local_idx]
        abs_mean = max(1e-6, float(np.mean(np.abs(abs_col))))
        abs_std = float(np.std(abs_col))
        req_abs_std = max(min_std_floor, 0.36 * abs_mean)
        if abs_std < req_abs_std and k_act > 1:
            alt_partner = 0 if absorber_local_idx != 0 else 1
            z_raw = rng_eff.standard_normal(n_worlds_eff)
            z_unit = (z_raw - float(np.mean(z_raw))) / max(1e-9, float(np.std(z_raw)))
            if float(np.mean((abs_col - float(np.mean(abs_col))) * z_unit)) < 0.0:
                z_unit = -z_unit
            delta = z_unit * (req_abs_std * 1.08)
            alloc[:, absorber_local_idx] = abs_col + delta
            alloc[:, alt_partner] = alloc[:, alt_partner] - delta

    # Exact world-by-world conservation on the absorber column
    non_abs = [i for i in range(k_act) if i != absorber_local_idx]
    if non_abs:
        alloc[:, absorber_local_idx] = team_arr - np.sum(alloc[:, non_abs], axis=1)
    else:
        alloc[:, 0] = team_arr

    for local_i, orig_i in enumerate(active_indices):
        out[keys[orig_i]] = alloc[:, local_i]

    return {k: out[k] for k in keys}


def allocate_conserved_box_score(
    team_stat: Sequence[float] | np.ndarray,
    shares: Mapping[str, float],
    stochastic: bool = False,
    preserve_variance: bool = False,
    stat_family: str = "receiving_yds",
    seed: int = 42,
) -> dict[str, list[float]]:
    """Split each world's team stat by shares that sum to 1.

    When stochastic=True or preserve_variance=True, delegates to
    allocate_stochastic_conserved_box_score so no active player ever collapses to std < 1.0
    while still matching team_stat exactly in every world.
    """
    if stochastic or preserve_variance:
        stoch = allocate_stochastic_conserved_box_score(
            team_total_vec=np.asarray(team_stat, dtype=np.float64),
            baseline_shares=dict(shares),
            stat_family=stat_family,
            seed=seed,
        )
        return {k: v.tolist() for k, v in stoch.items()}

    keys = list(shares)
    if not keys:
        raise ValueError("shares cannot be empty")
    weight = [max(0.0, float(shares[k])) for k in keys]
    total_w = sum(weight)
    if total_w <= 0:
        raise ValueError("shares must have positive mass")
    weight = [w / total_w for w in weight]
    out = {k: [] for k in keys}
    for value in team_stat:
        remaining = float(value)
        for i, key in enumerate(keys):
            if i == len(keys) - 1:
                alloc = remaining
            else:
                alloc = float(value) * weight[i]
                remaining -= alloc
            out[key].append(alloc)
    return out


def assert_prop_distribution_invariants(
    samples: Sequence[float] | np.ndarray,
    stat_type: str = "generic",
) -> dict[str, Any]:
    """Enforce variance floor on empirical prop sample vectors (SG-4).

    Raises ValueError("VARIANCE_COLLAPSE_DETECTED") if std(samples) < 0.85
    (or < 1.10 for tackles/receptions).
    """
    arr = np.asarray(samples, dtype=np.float64)
    if arr.size < 2:
        raise ValueError("VARIANCE_COLLAPSE_DETECTED: sample vector has fewer than 2 elements")
    std_val = float(np.std(arr))
    mean_val = float(np.mean(arr))
    st_low = stat_type.lower()
    is_tackle_or_rec_count = (
        any(tok in st_low for tok in ("tackle", "reception", "receptions", "rec_count"))
        and "yd" not in st_low
        and "yard" not in st_low
    )
    min_std = 1.10 if is_tackle_or_rec_count else 0.85
    if std_val < min_std:
        raise ValueError(
            f"VARIANCE_COLLAPSE_DETECTED: stat_type={stat_type} std={std_val:.4f} < min_std={min_std:.2f}"
        )
    return {
        "valid": True,
        "stat_type": stat_type,
        "mean": round(mean_val, 4),
        "std": round(std_val, 4),
        "min_std_required": min_std,
    }


def _american_to_implied_prob(odds: int | float) -> float:
    val = float(odds)
    if val < 0:
        return (-val) / ((-val) + 100.0)
    return 100.0 / (val + 100.0)


def evaluate_empirical_prop_probability(
    samples: np.ndarray | Sequence[float],
    line: float,
    market_over_american: int | None,
    market_under_american: int | None,
    max_prob_cap: float = 0.780,
    stat_type: str = "generic",
) -> dict[str, Any]:
    """Evaluate empirical prop probability from 10,000-world samples with Beta-Binomial shrinkage (SG-4).

    - Enforces assert_prop_distribution_invariants(samples, stat_type)
    - Computes empirical p_over = mean(samples > line) and p_under = mean(samples < line)
      with Beta-Binomial shrinkage toward 0.50 and strict cap in [1 - max_prob_cap, max_prob_cap]
      so max(p_over, p_under) <= 0.780.
    - If market_over_american is None or market_under_american is None:
      returns publishAllowed: False, decision: "PASS_UNPRICED_MARKET", edge: 0.0.
    """
    inv = assert_prop_distribution_invariants(samples, stat_type=stat_type)
    arr = np.asarray(samples, dtype=np.float64)
    n_worlds = int(arr.size)
    ln = float(line)

    raw_over = float(np.mean(arr > ln))
    raw_under = float(np.mean(arr < ln))
    non_push = max(1e-9, raw_over + raw_under)
    cond_over = raw_over / non_push

    # Beta-Binomial Empirical Bayes shrinkage toward 0.50 with effective pseudo-count prior
    # Maps extreme sample frequencies smoothly inside [0.220, 0.780]
    cap_hi = min(0.780, float(max_prob_cap))
    cap_lo = 1.0 - cap_hi
    shrink_lambda = 0.52
    shrunk_over = 0.50 + shrink_lambda * (cond_over - 0.50)
    p_over = float(np.clip(shrunk_over, cap_lo, cap_hi))
    p_under = float(np.clip(1.0 - p_over, cap_lo, cap_hi))

    lean = "OVER" if p_over >= p_under else "UNDER"
    win_prob_on_lean = max(p_over, p_under)
    wilson_lb = wilson_lower_bound(win_prob_on_lean * n_worlds, n_worlds)
    conf_int = min(int(round(cap_hi * 100)), max(51, int(round(win_prob_on_lean * 100.0))))

    base_result: dict[str, Any] = {
        "mean": round(float(np.mean(arr)), 2),
        "std": round(inv["std"], 2),
        "p10": round(float(np.percentile(arr, 10)), 2),
        "p25": round(float(np.percentile(arr, 25)), 2),
        "p50": round(float(np.percentile(arr, 50)), 2),
        "p75": round(float(np.percentile(arr, 75)), 2),
        "p90": round(float(np.percentile(arr, 90)), 2),
        "line": ln,
        "raw_p_over": round(raw_over, 4),
        "raw_p_under": round(raw_under, 4),
        "p_over": round(p_over, 4),
        "p_under": round(p_under, 4),
        "model_prob_over": round(p_over, 4),
        "model_prob_under": round(p_under, 4),
        "lean": lean,
        "model_lean": lean,
        "win_prob_on_lean": round(win_prob_on_lean, 4),
        "wilson_lower_90": round(wilson_lb, 4),
        "confidence_int": conf_int,
        "confidence_score": f"{conf_int}/100",
        "market_over_american": market_over_american,
        "market_under_american": market_under_american,
    }

    if market_over_american is None or market_under_american is None:
        base_result.update({
            "publishAllowed": False,
            "decision": "PASS_UNPRICED_MARKET",
            "edge": 0.0,
            "net_edge": 0.0,
            "market_prob_devig": None,
            "reason": "PASS_UNPRICED_MARKET: Two-sided Over/Under American odds required before publishing.",
        })
        return base_result

    imp_over = _american_to_implied_prob(market_over_american)
    imp_under = _american_to_implied_prob(market_under_american)
    overround = max(1e-9, imp_over + imp_under)
    devig_over = imp_over / overround
    devig_under = imp_under / overround
    mkt_devig_on_lean = devig_over if lean == "OVER" else devig_under
    edge_val = round(win_prob_on_lean - mkt_devig_on_lean, 4)
    publish_ok = bool(edge_val >= 0.025 and wilson_lb > mkt_devig_on_lean and conf_int >= 60)

    base_result.update({
        "publishAllowed": publish_ok,
        "decision": "PLAY" if publish_ok else "PASS",
        "edge": edge_val,
        "net_edge": edge_val,
        "market_prob_devig": round(mkt_devig_on_lean, 4),
        "reason": "CLEARED_TWO_SIDED_GATE" if publish_ok else "INSUFFICIENT_TWO_SIDED_EDGE",
    })
    return base_result


def detect_injury_decoy_or_pitch_count_trap(
    player_name: str,
    injury_designation: str,
    market_line: float,
    healthy_prior_mean: float,
    teammate_shares: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Injury Decoy / Pitch-Count Detector (SG-8).

    If injury_designation.upper() in {"QUESTIONABLE", "DOUBTFUL", "LIMITED", "PITCH_COUNT"}
    and market_line <= 0.45 * healthy_prior_mean (e.g., Brian Thomas Jr. line 12.5 vs 58.0 prior = 0.2155):
      - Flags is_decoy_trap: True, block_over_bets: True, block_cash_dfs: True, gpp_max_exposure: 0.08
      - Reallocates 65% of the player's baseline target/touch share across healthy teammates via
        Sinkhorn-Knopp / proportional renormalization.
    """
    desig_clean = (injury_designation or "").strip().upper()
    flagged_designations = {"QUESTIONABLE", "DOUBTFUL", "LIMITED", "PITCH_COUNT", "Q", "LP", "DNP"}
    has_injury_tag = (
        desig_clean in flagged_designations
        or any(tok in desig_clean for tok in ("QUESTIONABLE", "DOUBTFUL", "LIMITED", "PITCH_COUNT"))
    )
    prior = max(1e-6, float(healthy_prior_mean))
    mkt = float(market_line)
    ratio = mkt / prior
    is_trap = bool(has_injury_tag and mkt > 0.0 and ratio <= 0.45)

    reallocated: dict[str, float] = {}
    if teammate_shares:
        raw_shares = {k: max(0.0, float(v)) for k, v in teammate_shares.items()}
        tot = sum(raw_shares.values()) or 1.0
        norm_shares = {k: v / tot for k, v in raw_shares.items()}
        if is_trap:
            if player_name in norm_shares:
                player_base = norm_shares[player_name]
                retained = 0.35 * player_base
                freed_mass = 0.65 * player_base
                others = {k: v for k, v in norm_shares.items() if k != player_name}
            else:
                # Player's baseline share estimated from prior relative to team or default 0.22
                player_base = 0.22
                retained = 0.35 * player_base
                freed_mass = 0.65 * player_base
                others = dict(norm_shares)

            other_sum = sum(others.values()) or 1.0
            # Sinkhorn-Knopp 1D entropy-smoothed proportional reallocation across healthy teammates
            reallocated = {}
            if player_name in norm_shares:
                reallocated[player_name] = round(retained, 6)
            for tk, tv in others.items():
                reallocated[tk] = round(tv + freed_mass * (tv / other_sum), 6)
            # Final exact normalization to 1.0
            r_tot = sum(reallocated.values()) or 1.0
            reallocated = {k: round(v / r_tot, 6) for k, v in reallocated.items()}
        else:
            reallocated = {k: round(v, 6) for k, v in norm_shares.items()}

    if is_trap:
        return {
            "player_name": player_name,
            "injury_designation": injury_designation,
            "market_line": mkt,
            "healthy_prior_mean": prior,
            "line_to_prior_ratio": round(ratio, 4),
            "is_decoy_trap": True,
            "block_over_bets": True,
            "block_cash_dfs": True,
            "gpp_max_exposure": 0.08,
            "share_reallocated_fraction": 0.65,
            "retained_share_multiplier": 0.35,
            "reallocated_shares": reallocated,
            "decision": "BLOCK_OVER_AND_CASH_DFS_DECOY_TRAP",
            "reason": (
                f"INJURY_DECOY_PITCH_COUNT_TRAP: {player_name} ({injury_designation}) market_line={mkt} "
                f"is {ratio * 100:.1f}% of healthy_prior_mean={prior} (<= 45.0% threshold). "
                "Reallocated 65% of baseline share to healthy teammates."
            ),
        }

    return {
        "player_name": player_name,
        "injury_designation": injury_designation,
        "market_line": mkt,
        "healthy_prior_mean": prior,
        "line_to_prior_ratio": round(ratio, 4),
        "is_decoy_trap": False,
        "block_over_bets": False,
        "block_cash_dfs": False,
        "gpp_max_exposure": 0.45,
        "share_reallocated_fraction": 0.0,
        "retained_share_multiplier": 1.0,
        "reallocated_shares": reallocated,
        "decision": "CLEAR_NORMAL_ROLE",
        "reason": "NO_DECOY_SIGNAL",
    }


def assert_pbp_conservation(
    player_rec_yds: Sequence[Sequence[float]],
    team_pass_yds: Sequence[float],
    player_rec_tds: Sequence[Sequence[float]],
    team_pass_tds: Sequence[float],
    tol: float = 1e-4,
) -> None:
    n = len(team_pass_yds)
    if len(team_pass_tds) != n:
        raise AssertionError("td vector length mismatch")
    for w in range(n):
        yds = sum(player_rec_yds[i][w] for i in range(len(player_rec_yds)))
        tds = sum(player_rec_tds[i][w] for i in range(len(player_rec_tds)))
        if abs(yds - float(team_pass_yds[w])) >= tol:
            raise AssertionError(f"receiving yards do not conserve in world {w}: {yds} vs {team_pass_yds[w]}")
        if abs(tds - float(team_pass_tds[w])) >= tol:
            raise AssertionError(f"receiving TDs do not conserve in world {w}: {tds} vs {team_pass_tds[w]}")


def stamp_injury_reallocation(usage: dict[str, Any], target_shares: Mapping[str, float], carry_shares: Mapping[str, float]) -> dict[str, Any]:
    if usage.get("_injury_reallocation_applied"):
        raise RuntimeError("Duplicate injury reallocation detected")
    t_sum = sum(float(v) for v in target_shares.values())
    c_sum = sum(float(v) for v in carry_shares.values())
    if abs(t_sum - 1.0) >= 1e-6:
        raise AssertionError(f"target shares must sum to 1, got {t_sum}")
    if abs(c_sum - 1.0) >= 1e-6:
        raise AssertionError(f"carry shares must sum to 1, got {c_sum}")
    payload = json.dumps({"target": target_shares, "carry": carry_shares}, sort_keys=True)
    usage["_injury_reallocation_applied"] = True
    usage["_reallocation_hash"] = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    usage["target_shares"] = dict(target_shares)
    usage["carry_shares"] = dict(carry_shares)
    return usage


def assert_no_duplicate_reallocation(usage: Mapping[str, Any]) -> None:
    if usage.get("_injury_reallocation_applied"):
        raise RuntimeError("Duplicate injury reallocation detected")


def sinkhorn_reallocate_once(
    usage: dict[str, Any],
    target_shares: Mapping[str, float],
    carry_shares: Mapping[str, float],
) -> dict[str, Any]:
    """Single-pass stamp. A second call raises. Shares must already sum to 1."""
    return stamp_injury_reallocation(usage, target_shares, carry_shares)


def deconflate_platform_scoring_variance(
    sigma_raw: Sequence[Sequence[float]],
    platform: str,
    bonus_prob_100: float = 0.0,
) -> dict[str, float]:
    """Var(Y^p) = w^T Sigma w + bonus variance. Platforms do not share one table."""
    weights = {
        "DK": (1.0, 0.1, 6.0),
        "FD": (0.5, 0.1, 6.0),
        "UD": (1.0, 0.0, 0.0),
        "PRIZEPICKS": (0.0, 1.0, 0.0),
    }
    key = platform.upper()
    if key not in weights:
        raise ValueError(f"unknown platform: {platform}")
    w = weights[key]
    var = 0.0
    for i in range(3):
        for j in range(3):
            var += w[i] * float(sigma_raw[i][j]) * w[j]
    bonus = 0.0
    if key == "DK":
        p = min(1.0, max(0.0, float(bonus_prob_100)))
        bonus = p * (1.0 - p) * 9.0
    return {"platform": key, "variance": var + bonus, "scoring_variance": var, "bonus_variance": bonus}


def compute_walsh_classwise_ece(
    probs: Sequence[float],
    outcomes: Sequence[int],
    classes: Sequence[str],
    n_bins: int = 10,
) -> dict[str, Any]:
    """Classwise ECE: mean over classes of the binned |freq - conf| gap."""
    if not probs or len(probs) != len(outcomes) or len(probs) != len(classes):
        raise ValueError("probs, outcomes, and classes must be the same non-empty length")
    by_class: dict[str, list[tuple[float, int]]] = {}
    for p, y, c in zip(probs, outcomes, classes):
        by_class.setdefault(str(c), []).append((float(p), int(y)))
    class_ece: dict[str, float] = {}
    for name, rows in by_class.items():
        bins: list[list[tuple[float, int]]] = [[] for _ in range(n_bins)]
        for p, y in rows:
            idx = min(n_bins - 1, int(max(0.0, min(0.999999, p)) * n_bins))
            bins[idx].append((p, y))
        total = len(rows)
        ece = 0.0
        for bucket in bins:
            if not bucket:
                continue
            conf = sum(p for p, _ in bucket) / len(bucket)
            freq = sum(y for _, y in bucket) / len(bucket)
            ece += (len(bucket) / total) * abs(freq - conf)
        class_ece[name] = ece
    mean_ece = sum(class_ece.values()) / len(class_ece)
    return {"classwise_ece": mean_ece, "by_class": class_ece, "gate_pass": mean_ece <= 0.05}


def platform_quantiles_from_raw(
    raw_draws: Sequence[Sequence[float]],
    platform: str,
) -> dict[str, float]:
    """raw_draws rows are [rec, yds, td]. Quantiles are platform points, not a shared Gaussian."""
    weights = {"DK": (1.0, 0.1, 6.0), "FD": (0.5, 0.1, 6.0), "UD": (0.0, 1.0, 0.0)}
    key = platform.upper()
    w = weights[key]
    scored = []
    for row in raw_draws:
        pts = w[0] * float(row[0]) + w[1] * float(row[1]) + w[2] * float(row[2])
        if key == "DK" and float(row[1]) >= 100.0:
            pts += 3.0
        scored.append(pts)
    scored.sort()
    def q(p: float) -> float:
        if not scored:
            return 0.0
        idx = min(len(scored) - 1, max(0, int(round(p * (len(scored) - 1)))))
        return scored[idx]
    return {"p10": q(0.10), "p25": q(0.25), "p50": q(0.50), "p85": q(0.85), "p95": q(0.95)}


CANONICAL_2026_ROSTER = {"Geno Smith": "NYJ", "Mike Evans": "SF"}
PASS_ONLY_EPA_FIELDS = ("air_epa", "yac_epa", "cpoe")
BRILL_WP_SE = 0.018
BRILL_Z_90 = 1.645


def assert_2026_roster_identity_integrity(
    rows: Sequence[Mapping[str, Any]],
    canonical_roster_map: Mapping[str, str] | None = None,
) -> None:
    """Raise if a stale cutoff still maps Geno to LV or Evans to TB."""
    canon = dict(CANONICAL_2026_ROSTER if canonical_roster_map is None else canonical_roster_map)
    for row in rows:
        name = str(row.get("name") or row.get("player_name") or row.get("Name") or "")
        team = str(row.get("team") or row.get("TeamAbbrev") or row.get("team_abbr") or "").upper()
        expected = canon.get(name)
        if expected and team and team != expected:
            raise ValueError(f"stale roster identity: {name} mapped to {team}, canonical is {expected}")


def validate_pbp_structural_missingness(pbp_rows: Sequence[Mapping[str, Any]]) -> dict[str, int]:
    """Pass-only fields stay missing on non-pass plays. Clock gaps must have a same-drive neighbor."""
    errors: list[str] = []
    groups: dict[tuple, list[int]] = {}
    for i, row in enumerate(pbp_rows):
        play = str(row.get("play_type") or row.get("play") or "").lower()
        is_pass = play == "pass" or row.get("pass_attempt") in (1, True, "1")
        if not is_pass:
            for field in PASS_ONLY_EPA_FIELDS:
                if row.get(field) not in (None, ""):
                    errors.append(f"row {i}: {field} filled on non-pass")
        key = (row.get("game_id"), row.get("drive"), row.get("qtr"))
        groups.setdefault(key, []).append(i)
    for key, idxs in groups.items():
        missing = [i for i in idxs if pbp_rows[i].get("game_seconds_remaining") in (None, "")]
        present = [i for i in idxs if i not in missing]
        if missing and not present:
            errors.append(f"group {key}: game_seconds_remaining missing with no neighbor to interpolate")
    if errors:
        raise ValueError("; ".join(errors[:12]))
    return {"rows": len(pbp_rows), "groups": len(groups)}


def barber_weighted_conformal_interval(
    q_low: float,
    q_high: float,
    residuals: Sequence[float],
    alpha: float = 0.10,
    rho: float = 0.97,
) -> dict[str, float]:
    """Weighted residual quantiles. Recent residuals get weight rho**(n-1-i)."""
    res = [float(r) for r in residuals]
    if not res:
        raise ValueError("barber interval needs residuals")
    if not 0 < alpha < 1 or not 0 < rho <= 1:
        raise ValueError("alpha must be in (0,1) and rho in (0,1]")
    n = len(res)
    raw_w = [rho ** (n - 1 - i) for i in range(n)]
    total = sum(raw_w) or 1.0
    weights = [w / total for w in raw_w]
    order = sorted(range(n), key=lambda i: res[i])

    def weighted_quantile(level: float) -> float:
        acc = 0.0
        for i in order:
            acc += weights[i]
            if acc >= level:
                return res[i]
        return res[order[-1]]

    return {
        "low": float(q_low) + weighted_quantile(alpha / 2.0),
        "high": float(q_high) + weighted_quantile(1.0 - alpha / 2.0),
        "alpha": float(alpha),
        "rho": float(rho),
    }


def enforce_monotonic_cqr_cdf_consistency(
    cqr_low: float,
    cqr_high: float,
    line: float,
    model_p_over: float,
    alpha: float = 0.20,
) -> dict[str, float | bool]:
    """Enforce monotonic CDF-quantile consistency on a (1 - alpha) prediction interval [Q_{alpha/2}, Q_{1-alpha/2}].

    For any valid cumulative distribution function F_Y:
      F_Y(line) = P(Y <= line) = 1 - P(Y > line) = 1 - model_p_over.
    Therefore:
      - If F_Y(line) > alpha / 2 (i.e. model_p_over < 1 - alpha / 2), then Q_{alpha/2} MUST be strictly < line.
      - If F_Y(line) < 1 - alpha / 2 (i.e. model_p_over > alpha / 2), then Q_{1-alpha/2} MUST be strictly > line.
    Fixes the CQR quantile inversion where an unshrunk Monte Carlo lower quantile exceeded the prop line
    despite the shrunk exceedance probability being < 0.90.
    """
    low_q = alpha / 2.0
    high_q = 1.0 - alpha / 2.0
    cdf_at_line = max(1e-4, min(1.0 - 1e-4, 1.0 - float(model_p_over)))
    adj_low = float(cqr_low)
    adj_high = float(cqr_high)
    ln = float(line)

    if cdf_at_line > low_q and adj_low >= ln:
        # Project lower quantile monotonically below the prop line proportional to (alpha/2) / F_Y(line)
        scale_ratio = low_q / cdf_at_line
        adj_low = min(ln - 0.1, max(0.0, ln * scale_ratio * 1.40))

    if cdf_at_line < high_q and adj_high <= ln:
        tail_ratio = (1.0 - cdf_at_line) / max(1e-4, 1.0 - high_q)
        adj_high = max(ln + 0.1, ln * (1.0 + 0.25 * tail_ratio))

    monotonic_ok = True
    if cdf_at_line > low_q and not (adj_low < ln):
        monotonic_ok = False
    if cdf_at_line < high_q and not (adj_high > ln):
        monotonic_ok = False

    return {
        "low": round(adj_low, 2),
        "high": round(adj_high, 2),
        "cdf_at_line": round(cdf_at_line, 4),
        "monotonic_consistent": monotonic_ok,
    }


def fourth_down_brill_summary(wp_gaps: Sequence[float]) -> dict[str, float | None | str]:
    """Brill/Yurko/Wyner: a gap is distinct when abs(gap) > 1.645 * 0.018."""
    threshold = BRILL_Z_90 * BRILL_WP_SE
    if not wp_gaps:
        return {
            "fourth_down_wp_gap_mean": None,
            "fourth_down_statistically_distinct_rate": None,
            "threshold": threshold,
            "reason": "NO_FOURTH_DOWN_WP_GAPS_OBSERVED",
        }
    gaps = [float(g) for g in wp_gaps]
    distinct = sum(1 for g in gaps if abs(g) > threshold) / len(gaps)
    return {
        "fourth_down_wp_gap_mean": sum(gaps) / len(gaps),
        "fourth_down_statistically_distinct_rate": distinct,
        "threshold": threshold,
        "reason": "OBSERVED",
    }


empirical_bayes_shrink = compute_empirical_bayes_shrunk_projection
evaluate_parlay_conjunction = evaluate_parlay_conjunction_gate


def hurdle_non_negative_proj(
    active_prob: float,
    snap_cond_prob: float,
    cond_mean: float,
    route_share: float = 1.0,
    snap_share: float = 1.0,
    target_share: float = 0.15,
) -> float:
    """Two-part hurdle projection gated by route/snap participation."""
    p_part = participation_hurdle_probability(active_prob, snap_cond_prob, target_share)
    gate = enforce_route_snap_participation_gate(route_share, snap_share)
    return float(max(0.0, p_part * cond_mean) if gate["eligible"] else 0.0)


def recommend_scrimmage_over_receiving_prop(
    player_name: str,
    raw_rec_over_prob: float,
    behind_los_screen_or_jet_share: float,
    rush_attempt_share: float = 0.0,
    scrimmage_yards_prop_available: bool = True,
    receptions_prop_available: bool = True,
    lateral_hazard_threshold: float = 0.12,
) -> dict[str, Any]:
    """Kalif Raymond Lateral/Backward-Pass Scrimmage Gate (MNF CHI @ SEA 2026-11-02 Post-Mortem).

    On MNF (CHI 34 @ SEA 17), Kalif Raymond generated 53 scrimmage yards (clearing 21.5 by 31.5 yards),
    including a 39-yard catch-and-run. Because Caleb Williams's throw traveled slightly backward
    (a behind-the-line lateral screen), NFL official scorers ruled the 39-yard gain a RUSH (1 carry, 39 yds)
    rather than a reception (2 rec, 14 yds), grading OVER 21.5 Receiving Yards as a LOSS.

    Rule:
      - For any WR/slot/gadget player with behind-the-LOS screen/jet-sweep share >= lateral_hazard_threshold (0.12)
        or rush_attempt_share >= 0.05, compute the backward-pass lateral reclassification hazard.
      - Discount pure Receiving Yards OVER probability by (1 - lateral_reclassification_hazard).
      - When Rush + Rec Yards (Scrimmage Yards) is available, block pure Receiving Yards OVER and route
        the ticket to Rush + Rec Yards (or Receptions).
    """
    screen_jet = max(0.0, min(1.0, float(behind_los_screen_or_jet_share)))
    rush_sh = max(0.0, min(1.0, float(rush_attempt_share)))
    lateral_hazard = min(0.45, round(0.55 * screen_jet + 0.65 * rush_sh, 4))
    adj_rec_prob = round(float(raw_rec_over_prob) * (1.0 - lateral_hazard), 4)

    high_lateral_risk = (screen_jet >= lateral_hazard_threshold) or (rush_sh >= 0.05)
    if high_lateral_risk and scrimmage_yards_prop_available:
        return {
            "player_name": player_name,
            "raw_rec_over_prob": round(float(raw_rec_over_prob), 4),
            "adjusted_rec_over_prob": adj_rec_prob,
            "lateral_reclassification_hazard": lateral_hazard,
            "pure_rec_yds_publish_allowed": False,
            "preferred_market": "rush_plus_rec_yards",
            "decision": "BLOCK_PURE_REC_YDS_USE_SCRIMMAGE",
            "reason": "HIGH_BACKWARD_PASS_OR_JET_SWEEP_LATERAL_RECLASSIFICATION_HAZARD",
        }
    if high_lateral_risk and receptions_prop_available:
        return {
            "player_name": player_name,
            "raw_rec_over_prob": round(float(raw_rec_over_prob), 4),
            "adjusted_rec_over_prob": adj_rec_prob,
            "lateral_reclassification_hazard": lateral_hazard,
            "pure_rec_yds_publish_allowed": False,
            "preferred_market": "receptions",
            "decision": "PENALIZE_PURE_REC_YDS_USE_RECEPTIONS",
            "reason": "HIGH_BACKWARD_PASS_OR_JET_SWEEP_LATERAL_RECLASSIFICATION_HAZARD",
        }
    return {
        "player_name": player_name,
        "raw_rec_over_prob": round(float(raw_rec_over_prob), 4),
        "adjusted_rec_over_prob": adj_rec_prob,
        "lateral_reclassification_hazard": lateral_hazard,
        "pure_rec_yds_publish_allowed": True,
        "preferred_market": "receiving_yards",
        "decision": "ALLOW_PURE_REC_YDS",
        "reason": "LOW_LATERAL_HAZARD",
    }


