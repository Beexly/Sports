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


def allocate_conserved_box_score(
    team_stat: Sequence[float],
    shares: Mapping[str, float],
) -> dict[str, list[float]]:
    """Split each world's team stat by shares that sum to 1.

    The last key absorbs the residual so the sum matches the team stat exactly.
    No post-simulation multiplicative rescaling.
    """
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
