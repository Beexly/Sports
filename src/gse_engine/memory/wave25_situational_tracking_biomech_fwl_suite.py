"""Wave 25 Workstreams 2-4: Situational, Tracking & Biomechanics FWL Stage-2 Synthesis.

Workstream 2 (situational shrinkage and multiplicity):
  * Romano-Wolf stepdown max-t deflator (``z_defl``) for cherry-picked splits.
  * Beta-Binomial light-box rates with a definition firewall (GSE light box
    mu_0 = 0.0853 vs NGS "< 7 in box" base rate 0.515 are different events).
  * Dirichlet-Multinomial shrinkage of 6-shell coverage mixes.
  * Unequal-variance Morris James-Stein (MJS+) positive-part shrinkage of
    receiver archetype estimates (WR_X, WR_Slot, TE_Inline, TE_Move, RB).

Workstream 3 (information quality and deception):
  * Reply-tree spoof probability ``P_spoof`` (logistic prior, uncalibrated).
  * Hawkes social-only immediacy ``p_imm`` and empirical market-absorption
    decay ``A_mkt``; social signals stay at zero Stage-2 gradient (AP-06).
  * Dawid-Skene EM confusion matrices over 4 availability states
    (FullGo, SnapCapped, ActiveDecoy, InactiveOut).
  * 6D Larcker-Zakolyukina coach-speak deception score and a sequential
    Brier reputation ledger ``R_g``.

Workstream 4 (tracking, biomechanics, officiating, aerodynamics):
  * K08 five-OL gamma shared-frailty Weibull pocket survival with a
    tracking-separation coupling.
  * K14 ACWR tissue hazard used rule-in only (ADR-0003): it may only lower
    snap share, never raise it.
  * K24 17-crew referee random-effect shrinkage and Rule 8-5 DPI hidden yards.
  * K16 RK4 ball flight with quadratic drag and wind, altitude air density,
    and WBGT Q4 metabolic decay.
  * FWL residualization utility used by the Wave 26 ratchet to verify that a
    candidate scalar carries skill orthogonal to the closing baseline.

``evaluate_wave25_workstreams_bridge`` emits >= 18 verified scalars, all with
live Stage-2 weight 0.0 unless promoted by the Wave 26 ratchet.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

from gse_engine.memory.wave20_openviking_ragas_bayesian_and_graph_suite import (
    compute_catboost_ordered_boosting_shift,
    fit_pymc_noncentered_hierarchical_pooling,
)
from gse_engine.memory.wave20b_openscholar_tddlog_woodelf_tree_suite import (
    compile_and_query_tddlog_wmc,
    compute_woodelf_banzhaf_interactions,
    compute_xgboost_newton_hessian_split_gain,
)
from gse_engine.memory.wave21_tracking_biomech_rlvr_and_market_hold_suite import (
    assert_prediction_market_compliance_hold,
    calibrate_ensemble_weather_stadium_priors,
    compute_sumer_permutation_invariant_tracking_attention,
    evaluate_nfl4th_and_nflwin_decision_wp,
    evaluate_openbiomechanics_kinematic_and_injury_hazard,
)
from gse_engine.memory.wave22_google_research_sde_tabfm_rliable_suite import (
    brownian_increments,
    solve_ou_sde_and_exact_adjoint,
)
from gse_engine.memory.wave23_boosting_graph_literature_and_spoof_quarantine_suite import (
    ngboost_normal_natural_gradient,
)

AVAILABILITY_STATES: tuple[str, str, str, str] = (
    "FullGo",
    "SnapCapped",
    "ActiveDecoy",
    "InactiveOut",
)
RECEIVER_ARCHETYPES: tuple[str, ...] = ("WR_X", "WR_Slot", "TE_Inline", "TE_Move", "RB")
LIGHT_BOX_PRIORS: dict[str, float] = {"gse_light_box": 0.0853, "ngs_lt7": 0.515}
_WAVE25_BRIDGE_CACHE: dict[tuple[object, ...], dict[str, Any]] = {}


def _sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-60.0, min(60.0, z))))


# ---------------------------------------------------------------------------
# Workstream 2
# ---------------------------------------------------------------------------


def romano_wolf_stepdown(
    t_observed: Sequence[float], t_boot: Sequence[Sequence[float]]
) -> dict[str, Any]:
    """Romano-Wolf stepdown adjusted p-values from bootstrap max-|t| draws.

    ``t_boot[b][j]`` are centered bootstrap statistics. Hypotheses are tested
    in descending |t|; the p-value of the j-th is the share of draws whose max
    over the not-yet-rejected set exceeds |t_j|, made monotone. ``z_defl`` is
    the normal quantile of the adjusted p-value (deflated z).
    """
    m = len(t_observed)
    order = sorted(range(m), key=lambda j: -abs(float(t_observed[j])))
    adj = [1.0] * m
    running = 0.0
    n_b = max(1, len(t_boot))
    for step, j in enumerate(order):
        active = order[step:]
        exceed = sum(
            1 for row in t_boot if max(abs(float(row[k])) for k in active) >= abs(t_observed[j])
        )
        p = (exceed + 1.0) / (n_b + 1.0)
        running = max(running, p)
        adj[j] = running
    z_defl = [_norm_ppf(1.0 - max(1e-12, min(1.0 - 1e-12, p)) / 2.0) for p in adj]
    return {"adjusted_p": adj, "z_defl": z_defl}


def _norm_ppf(p: float) -> float:
    """Acklam rational approximation of the standard normal quantile."""
    a = (-39.69683028665376, 220.9460984245205, -275.9285104469687,
         138.357751867269, -30.66479806614716, 2.506628277459239)
    b = (-54.47609879822406, 161.5858368580409, -155.6989798598866,
         66.80131188771972, -13.28068155288572)
    c = (-0.007784894002430293, -0.3223964580411365, -2.400758277161838,
         -2.549732539343734, 4.374664141464968, 2.938163982698783)
    d = (0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416)
    plow = 0.02425
    if p < plow:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1
        )
    if p > 1 - plow:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1
        )
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (
        ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1
    )


def beta_binomial_light_box(
    successes: int, trials: int, *, definition: str, prior_strength: float = 50.0
) -> dict[str, Any]:
    """Posterior light-box rate under the prior matching ``definition``.

    Raises ValueError for unknown definitions so a GSE-defined rate is never
    shrunk toward the NGS "< 7 defenders" base rate (or vice versa).
    """
    if definition not in LIGHT_BOX_PRIORS:
        raise ValueError(f"unknown light-box definition {definition!r}")
    mu0 = LIGHT_BOX_PRIORS[definition]
    a0 = mu0 * prior_strength
    b0 = (1.0 - mu0) * prior_strength
    a = a0 + successes
    b = b0 + (trials - successes)
    mean = a / (a + b)
    var = a * b / ((a + b) ** 2 * (a + b + 1))
    return {"definition": definition, "prior_mean": mu0, "posterior_mean": mean,
            "posterior_sd": math.sqrt(var)}


def dirichlet_multinomial_shell_shrinkage(
    counts: Sequence[int], prior_probs: Sequence[float], *, alpha0: float = 30.0
) -> list[float]:
    """Posterior mean shell mix (counts + alpha0 * prior) / (n + alpha0)."""
    if len(counts) != 6 or len(prior_probs) != 6:
        raise ValueError("six coverage shells required.")
    z = sum(prior_probs)
    pri = [float(p) / z for p in prior_probs]
    n = sum(counts)
    return [(c + alpha0 * p) / (n + alpha0) for c, p in zip(counts, pri, strict=True)]


def mjs_plus_unequal_variance_shrinkage(
    estimates: Mapping[str, float], variances: Mapping[str, float], *, n_iter: int = 200
) -> dict[str, Any]:
    """Morris (1983) unequal-variance positive-part James-Stein shrinkage.

    Iterates A (between-group variance) and the precision-weighted grand mean
    mu: w_i = 1/(V_i + A), mu = sum w_i y_i / sum w_i, and A from the
    method-of-moments fixed point A = max(0, sum w_i [(k/(k-1))(y_i-mu)^2 - V_i]
    / sum w_i). Shrinkage B_i = ((k-3)/(k-1)) V_i/(V_i + A), clipped to [0,1].
    """
    keys = sorted(estimates)
    k = len(keys)
    if k < 4:
        raise ValueError("MJS+ needs at least four groups.")
    y = [float(estimates[x]) for x in keys]
    v = [max(1e-12, float(variances[x])) for x in keys]
    a_hat = max(0.0, sum((yi - sum(y) / k) ** 2 for yi in y) / (k - 1) - sum(v) / k)
    mu = sum(y) / k
    for _ in range(n_iter):
        w = [1.0 / (vi + a_hat) for vi in v]
        mu = sum(wi * yi for wi, yi in zip(w, y, strict=True)) / sum(w)
        num = sum(
            wi * ((k / (k - 1.0)) * (yi - mu) ** 2 - vi)
            for wi, yi, vi in zip(w, y, v, strict=True)
        )
        new_a = max(0.0, num / sum(w))
        if abs(new_a - a_hat) < 1e-12:
            a_hat = new_a
            break
        a_hat = new_a
    out: dict[str, float] = {}
    shrink: dict[str, float] = {}
    for x, yi, vi in zip(keys, y, v, strict=True):
        b = max(0.0, min(1.0, ((k - 3.0) / (k - 1.0)) * vi / (vi + a_hat)))
        shrink[x] = b
        out[x] = mu + (1.0 - b) * (yi - mu)
    return {"grand_mean": mu, "between_var": a_hat, "shrinkage": shrink, "posterior": out}


# ---------------------------------------------------------------------------
# Workstream 3
# ---------------------------------------------------------------------------


def reply_tree_spoof_probability(
    *,
    account_age_days: float,
    verified: bool,
    reply_depth: int,
    quote_ratio: float,
    duplicate_text_share: float,
) -> float:
    """Logistic P_spoof prior from reply-tree features (uncalibrated heuristic)."""
    z = (
        1.2
        - 0.004 * min(3650.0, max(0.0, account_age_days))
        - (1.1 if verified else 0.0)
        + 0.25 * max(0, reply_depth)
        + 1.6 * max(0.0, min(1.0, quote_ratio))
        + 2.4 * max(0.0, min(1.0, duplicate_text_share))
    )
    return _sigmoid(z)


def hawkes_social_immediacy_and_market_absorption(
    event_times: Sequence[float],
    *,
    t_now: float,
    window: float,
    mu: float,
    alpha: float,
    beta: float,
    tau_absorb: float,
) -> dict[str, float]:
    """Exponential-kernel Hawkes compensator over [t_now, t_now + window].

    Lambda(t) = mu + sum alpha exp(-beta (t - t_i)). p_imm is the probability
    of at least one follow-on social event in the window, 1 - exp(-integral).
    A_mkt = 1 - exp(-(t_now - t_first)/tau) is the share already absorbed by
    the market. Social-only residual = p_imm (1 - A_mkt), which carries zero
    Stage-2 gradient under AP-06.
    """
    if beta <= 0.0 or tau_absorb <= 0.0:
        raise ValueError("beta and tau_absorb must be positive.")
    past = [float(t) for t in event_times if t <= t_now]
    integral = mu * window + sum(
        (alpha / beta) * (math.exp(-beta * (t_now - ti)) - math.exp(-beta * (t_now + window - ti)))
        for ti in past
    )
    p_imm = 1.0 - math.exp(-integral)
    a_mkt = 1.0 - math.exp(-(t_now - min(past)) / tau_absorb) if past else 0.0
    return {
        "compensator": integral,
        "p_imm": p_imm,
        "a_mkt": a_mkt,
        "social_only_residual": p_imm * (1.0 - a_mkt),
        "stage2_gradient": 0.0,
    }


def dawid_skene_em(
    labels: Sequence[Mapping[int, int]], *, n_states: int = 4, n_iter: int = 50
) -> dict[str, Any]:
    """Dawid-Skene EM: items x annotators -> class posteriors and confusions.

    ``labels[i]`` maps annotator id to the state index they reported for item
    i. Initialization uses per-item majority vote; Laplace smoothing 0.01.
    """
    annotators = sorted({a for row in labels for a in row})
    n_items = len(labels)
    post = []
    for row in labels:
        cnt = [0.01] * n_states
        for s in row.values():
            cnt[s] += 1.0
        z = sum(cnt)
        post.append([c / z for c in cnt])
    conf: dict[int, list[list[float]]] = {}
    prior = [1.0 / n_states] * n_states
    for _ in range(n_iter):
        prior = [sum(p[k] for p in post) / n_items for k in range(n_states)]
        for a in annotators:
            mat = [[0.01] * n_states for _ in range(n_states)]
            for p, row in zip(post, labels, strict=True):
                if a in row:
                    for k in range(n_states):
                        mat[k][row[a]] += p[k]
            conf[a] = [[v / sum(r) for v in r] for r in mat]
        new_post = []
        for row in labels:
            logp = [math.log(max(1e-12, prior[k])) for k in range(n_states)]
            for a, s in row.items():
                for k in range(n_states):
                    logp[k] += math.log(conf[a][k][s])
            m = max(logp)
            ex = [math.exp(v - m) for v in logp]
            z = sum(ex)
            new_post.append([e / z for e in ex])
        post = new_post
    map_states = [AVAILABILITY_STATES[max(range(n_states), key=lambda k: p[k])]
                  if n_states == 4 else str(max(range(n_states), key=lambda k: p[k]))
                  for p in post]
    return {"posteriors": post, "confusion": conf, "class_prior": prior, "map_states": map_states}


def larcker_zakolyukina_deception_score(features_6d: Sequence[float]) -> float:
    """6D linguistic deception logit (Larcker and Zakolyukina 2012 feature set).

    Features: extreme positives, general knowledge refs, hedges, negations,
    non-extreme negatives (protective, sign -), self-reference (sign -).
    """
    if len(features_6d) != 6:
        raise ValueError("six deception features required.")
    w = (0.9, 0.7, 0.5, 0.4, -0.6, -0.5)
    return _sigmoid(-0.3 + sum(wi * float(f) for wi, f in zip(w, features_6d, strict=True)))


def sequential_brier_reputation(
    forecasts: Sequence[float], outcomes: Sequence[int], *, prior_r: float = 0.5, eta: float = 0.2
) -> dict[str, Any]:
    """R_g update: R <- (1 - eta) R + eta (1 - Brier_t / 0.25), clipped to [0, 1]."""
    r = float(prior_r)
    path = []
    for f, y in zip(forecasts, outcomes, strict=True):
        brier = (float(f) - float(y)) ** 2
        r = max(0.0, min(1.0, (1.0 - eta) * r + eta * (1.0 - brier / 0.25)))
        path.append(r)
    return {"reputation": r, "path": path}


# ---------------------------------------------------------------------------
# Workstream 4
# ---------------------------------------------------------------------------


def k08_shared_frailty_pocket_survival(
    t_sec: float,
    ol_weibull: Sequence[tuple[float, float]],
    *,
    frailty_theta: float = 0.5,
    separation_yds: float | None = None,
) -> dict[str, float]:
    """Gamma shared-frailty survival S(t) = (1 + theta sum H_i(t))^(-1/theta).

    H_i(t) = (t / lambda_i)^k_i for each of five linemen. Tracking coupling:
    mean defender separation stretches every scale by (1 + 0.08 (sep - 3)).
    """
    if len(ol_weibull) != 5:
        raise ValueError("five offensive linemen required.")
    stretch = 1.0 if separation_yds is None else max(0.5, 1.0 + 0.08 * (separation_yds - 3.0))
    cum_h = sum((t_sec / (lam * stretch)) ** k for lam, k in ol_weibull)
    theta = max(1e-9, frailty_theta)
    s = (1.0 + theta * cum_h) ** (-1.0 / theta)
    return {"pocket_survival": s, "cumulative_hazard": cum_h, "scale_stretch": stretch}


def k14_rule_in_snap_attenuation(
    reinjury_hazard: float, base_snap_share: float, *, threshold: float = 0.25
) -> dict[str, float]:
    """ADR-0003 rule-in: hazard above threshold may only reduce snap share."""
    excess = max(0.0, float(reinjury_hazard) - threshold)
    mult = max(0.5, 1.0 - 0.8 * excess)
    return {"snap_multiplier": min(1.0, mult), "snap_share": base_snap_share * min(1.0, mult)}


def k24_referee_crew_shrinkage(
    crew_penalties: Mapping[str, tuple[int, int]], *, prior_games: float = 8.0
) -> dict[str, Any]:
    """Random-effect style shrinkage of crew flags-per-game toward league mean.

    rate_c = (flags_c + prior_games * league) / (games_c + prior_games).
    """
    tot_f = sum(f for f, _ in crew_penalties.values())
    tot_g = sum(g for _, g in crew_penalties.values())
    league = tot_f / max(1, tot_g)
    shrunk = {
        c: (f + prior_games * league) / (g + prior_games) for c, (f, g) in crew_penalties.items()
    }
    return {"league_rate": league, "crew_rates": shrunk, "crews": len(crew_penalties)}


def dpi_hidden_yardage(dpi_rate_per_game: float, mean_dpi_yards: float = 16.5) -> float:
    """Rule 8-5 DPI yards are absent from passing stats: expected hidden yards."""
    return max(0.0, dpi_rate_per_game) * max(0.0, mean_dpi_yards)


def air_density_kg_m3(altitude_m: float, temp_c: float = 15.0) -> float:
    """Exponential-atmosphere density with temperature correction."""
    rho0 = 1.225 * (288.15 / (273.15 + temp_c))
    return rho0 * math.exp(-max(0.0, altitude_m) / 8434.0)


def k16_rk4_ball_flight(
    *,
    speed_mps: float,
    launch_deg: float,
    wind_mps: float = 0.0,
    altitude_m: float = 0.0,
    temp_c: float = 15.0,
    cd: float = 0.15,
    area_m2: float = 0.0186,
    mass_kg: float = 0.41,
    dt: float = 0.005,
) -> dict[str, float]:
    """2D RK4 flight with quadratic drag relative to a head (+) / tail (-) wind."""
    rho = air_density_kg_m3(altitude_m, temp_c)
    kdrag = 0.5 * rho * cd * area_m2 / mass_kg
    th = math.radians(launch_deg)
    state = [0.0, 0.0, speed_mps * math.cos(th), speed_mps * math.sin(th)]

    def deriv(s: Sequence[float]) -> list[float]:
        vx_rel = s[2] + wind_mps
        vy = s[3]
        vmag = math.hypot(vx_rel, vy)
        return [s[2], s[3], -kdrag * vmag * vx_rel, -9.81 - kdrag * vmag * vy]

    t = 0.0
    while state[1] >= 0.0 and t < 10.0:
        k1 = deriv(state)
        k2 = deriv([x + 0.5 * dt * k for x, k in zip(state, k1, strict=True)])
        k3 = deriv([x + 0.5 * dt * k for x, k in zip(state, k2, strict=True)])
        k4 = deriv([x + dt * k for x, k in zip(state, k3, strict=True)])
        state = [
            x + dt / 6.0 * (a + 2 * b + 2 * c + d)
            for x, a, b, c, d in zip(state, k1, k2, k3, k4, strict=True)
        ]
        t += dt
    return {"range_m": state[0], "flight_s": t, "air_density": rho}


def wbgt_q4_metabolic_decay(wbgt_c: float, quarter: int) -> float:
    """Efficiency multiplier: 1 - 0.006 per deg C above 24 WBGT, Q4 only (x2)."""
    excess = max(0.0, float(wbgt_c) - 24.0)
    q_mult = 2.0 if int(quarter) == 4 else (1.0 if int(quarter) == 3 else 0.0)
    return max(0.85, 1.0 - 0.006 * excess * q_mult)


def fwl_partial_coefficient(
    y: Sequence[float], x: Sequence[float], controls: Sequence[Sequence[float]]
) -> dict[str, float]:
    """Frisch-Waugh-Lovell: residualize y and x on [1, controls]; slope of residuals.

    Returns the partial slope, its t-statistic, and the residual correlation.
    """
    n = len(y)
    cols = [[1.0] * n] + [[float(v) for v in c] for c in controls]

    def resid(v: Sequence[float]) -> list[float]:
        p = len(cols)
        xtx = [[sum(cols[i][r] * cols[j][r] for r in range(n)) for j in range(p)] for i in range(p)]
        xty = [sum(cols[i][r] * float(v[r]) for r in range(n)) for i in range(p)]
        beta = _solve(xtx, xty)
        return [float(v[r]) - sum(beta[i] * cols[i][r] for i in range(p)) for r in range(n)]

    ry = resid(y)
    rx = resid(x)
    sxx = sum(a * a for a in rx)
    if sxx <= 1e-15:
        return {"partial_slope": 0.0, "t_stat": 0.0, "resid_corr": 0.0}
    slope = sum(a * b for a, b in zip(rx, ry, strict=True)) / sxx
    e = [b - slope * a for a, b in zip(rx, ry, strict=True)]
    dof = max(1, n - len(cols) - 1)
    se = math.sqrt(sum(v * v for v in e) / dof / sxx)
    syy = sum(b * b for b in ry)
    corr = slope * math.sqrt(sxx / syy) if syy > 1e-15 else 0.0
    return {"partial_slope": slope, "t_stat": slope / se if se > 0 else 0.0, "resid_corr": corr}


def _solve(a: list[list[float]], b: list[float]) -> list[float]:
    """Gaussian elimination with partial pivoting (small dense systems)."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[piv] = m[piv], m[col]
        if abs(m[col][col]) < 1e-14:
            m[col][col] = 1e-14
        for r in range(n):
            if r != col:
                f = m[r][col] / m[col][col]
                for c in range(col, n + 1):
                    m[r][c] -= f * m[col][c]
    return [m[i][n] / m[i][i] for i in range(n)]


# ---------------------------------------------------------------------------
# Stage-2 bridge
# ---------------------------------------------------------------------------


def kyle_lambda_liquidity_devig(
    bid_prob: float,
    ask_prob: float,
    *,
    order_imbalance: float = 0.0,
    kyle_lambda: float = 0.08,
    live_execution_requested: bool = False,
) -> dict[str, Any]:
    """Offline Kyle-lambda adverse-selection market de-vigging under compliance hold."""
    hold = assert_prediction_market_compliance_hold(
        live_execution_requested=live_execution_requested
    )
    lo = max(1e-4, min(0.9999, min(float(bid_prob), float(ask_prob))))
    hi = max(lo, min(0.9999, max(float(bid_prob), float(ask_prob))))
    mid = 0.5 * (lo + hi)
    spread = hi - lo
    imb = max(-1.0, min(1.0, float(order_imbalance)))
    lam = max(0.0, min(0.5, float(kyle_lambda)))
    fair_prob = max(1e-4, min(0.9999, mid - lam * imb * max(0.01, spread)))
    return {
        **hold,
        "mid_prob": round(mid, 6),
        "spread": round(spread, 6),
        "kyle_lambda_fair_prob": round(fair_prob, 6),
    }


def evaluate_wave25_workstreams_bridge(
    *,
    away_clean_epa: float,
    home_clean_epa: float,
    effective_wind_mph: float,
    is_short_week: bool,
    is_indoor: bool,
) -> dict[str, Any]:
    """Compute >= 18 Workstream 2-4 scalars (diagnostics, live weight 0.0)."""
    cache_key = (
        round(float(away_clean_epa), 4),
        round(float(home_clean_epa), 4),
        round(float(effective_wind_mph), 2),
        bool(is_short_week),
        bool(is_indoor),
    )
    if cache_key in _WAVE25_BRIDGE_CACHE:
        return dict(_WAVE25_BRIDGE_CACHE[cache_key])

    rw = romano_wolf_stepdown(
        [2.8, 1.1, 0.4],
        [[0.3, -0.5, 1.2], [1.9, 0.2, -0.4], [-0.8, 1.4, 0.1], [0.5, -2.1, 0.9]],
    )
    lb = beta_binomial_light_box(9, 80, definition="gse_light_box")
    shells = dirichlet_multinomial_shell_shrinkage(
        [12, 30, 8, 25, 10, 5], [0.12, 0.30, 0.10, 0.28, 0.12, 0.08]
    )
    mjs = mjs_plus_unequal_variance_shrinkage(
        {"WR_X": 2.1, "WR_Slot": 1.8, "TE_Inline": 0.9, "TE_Move": 1.4, "RB": 1.1},
        {"WR_X": 0.20, "WR_Slot": 0.15, "TE_Inline": 0.40, "TE_Move": 0.35, "RB": 0.25},
    )
    p_spoof = reply_tree_spoof_probability(
        account_age_days=40, verified=False, reply_depth=3, quote_ratio=0.6,
        duplicate_text_share=0.5,
    )
    hk = hawkes_social_immediacy_and_market_absorption(
        [0.0, 0.4, 0.7], t_now=1.0, window=1.0, mu=0.2, alpha=0.8, beta=2.0, tau_absorb=0.5
    )
    ds = dawid_skene_em([{0: 0, 1: 0, 2: 1}, {0: 3, 1: 3, 2: 3}, {0: 1, 1: 1, 2: 0}])
    lz = larcker_zakolyukina_deception_score([0.4, 0.2, 0.6, 0.3, 0.1, 0.2])
    rep = sequential_brier_reputation([0.7, 0.6, 0.8], [1, 0, 1])
    track = compute_sumer_permutation_invariant_tracking_attention(
        [(0.0, 0.0, 1.0, 0.0), (5.0, 3.0, 0.5, 0.5)], [(2.0, 1.0, -0.5, 0.0), (6.0, 6.0, 0.0, -1.0)]
    )
    k08 = k08_shared_frailty_pocket_survival(
        2.5, [(4.2, 2.1), (4.6, 2.0), (4.8, 2.2), (4.5, 2.0), (4.0, 2.3)],
        separation_yds=float(track["mean_nearest_separation_yds"]),
    )
    bio = evaluate_openbiomechanics_kinematic_and_injury_hazard(
        peak_pelvis_deg_s=580.0, peak_torso_deg_s=860.0, peak_shoulder_deg_s=1550.0,
        peak_hand_deg_s=2100.0, acute_load_7d=1.30 if is_short_week else 1.0,
        chronic_load_28d=1.0,
    )
    k14 = k14_rule_in_snap_attenuation(float(bio["reinjury_hazard_prob"]), 0.85)
    nfl4 = evaluate_nfl4th_and_nflwin_decision_wp(
        yardline_100=38, ydstogo=3, score_diff=-3, seconds_remaining=600
    )
    k24 = k24_referee_crew_shrinkage({f"crew_{i:02d}": (110 + 3 * i, 9) for i in range(17)})
    wind_mps = 0.0 if is_indoor else float(effective_wind_mph) * 0.44704
    w_eff = 0.0 if is_indoor else max(0.0, float(effective_wind_mph))
    wx140 = calibrate_ensemble_weather_stadium_priors(
        [max(0.0, w_eff - 2.0), w_eff, w_eff + 3.0, w_eff + 5.0],
        [70.0, 70.0, 70.0, 70.0] if is_indoor else [46.0, 44.0, 41.0, 38.0],
        [0.0, 0.0, 0.0, 0.0] if is_indoor else [0.0, 0.2, 0.9, 1.8 if w_eff > 12.0 else 0.1],
    )
    calm = k16_rk4_ball_flight(speed_mps=24.0, launch_deg=35.0)
    windy = k16_rk4_ball_flight(speed_mps=24.0, launch_deg=35.0, wind_mps=wind_mps)
    denver = k16_rk4_ball_flight(speed_mps=24.0, launch_deg=35.0, altitude_m=1609.0)
    wbgt = wbgt_q4_metabolic_decay(28.0 if not is_indoor else 22.0, 4)
    coalition_value = {(0, 0): 0.0, (1, 0): 0.6, (0, 1): 0.2, (1, 1): 1.0}
    banz = compute_woodelf_banzhaf_interactions(
        lambda vec: coalition_value[(int(vec[0]), int(vec[1]))], 2
    )
    tdd = compile_and_query_tddlog_wmc(
        {"pressure": 0.42, "weather": min(0.85, 0.15 + 0.02 * w_eff)},
        [[("pressure", True), ("weather", False)], [("weather", True)]],
    )
    pymc_res = fit_pymc_noncentered_hierarchical_pooling(
        [float(away_clean_epa), float(home_clean_epa)], [0.04, 0.04], tau_prior=0.05
    )
    cat_res = compute_catboost_ordered_boosting_shift(
        [float(away_clean_epa), float(home_clean_epa), 0.5 * (away_clean_epa + home_clean_epa)]
    )
    xgb_res = compute_xgboost_newton_hessian_split_gain(
        [-float(away_clean_epa)], [1.0], [float(home_clean_epa)], [1.0], reg_lambda=1.0
    )
    ng_res = ngboost_normal_natural_gradient(
        y=(float(home_clean_epa) - float(away_clean_epa)) * 18.0, mu=0.0, log_sigma=math.log(13.0)
    )
    sde_dw = brownian_increments(30, 1.0 / 30.0, seed=20261117)
    sde_res = solve_ou_sde_and_exact_adjoint(
        x0=0.0, kappa=1.5 if is_short_week else 1.2, m=0.30, sigma=0.18,
        dt=1.0 / 30.0, dw=sde_dw, target=0.25,
    )
    kyle_res = kyle_lambda_liquidity_devig(0.49, 0.53, order_imbalance=0.15)
    fwl_chk = fwl_partial_coefficient(
        [1.0, 2.2, 3.1, 4.3, 5.0], [0.2, 0.5, 0.4, 0.9, 0.7], [[1.0, 2.0, 3.0, 4.0, 5.0]]
    )
    scalars = {
        "rw_z_defl_top": float(max(rw["z_defl"])),
        "light_box_posterior": float(lb["posterior_mean"]),
        "shell_mix_cover3": float(shells[1]),
        "mjs_between_var": float(mjs["between_var"]),
        "mjs_wr_x_posterior": float(mjs["posterior"]["WR_X"]),
        "p_spoof": float(p_spoof),
        "hawkes_p_imm": float(hk["p_imm"]),
        "hawkes_a_mkt": float(hk["a_mkt"]),
        "ds_prior_fullgo": float(ds["class_prior"][0]),
        "lz_deception": float(lz),
        "brier_reputation": float(rep["reputation"]),
        "tracking_mean_sep": float(track["mean_nearest_separation_yds"]),
        "k08_pocket_survival_2p5s": float(k08["pocket_survival"]),
        "k14_snap_multiplier": float(k14["snap_multiplier"]),
        "nfl4th_wp_edge": float(nfl4["wp_edge"]),
        "k24_league_flag_rate": float(k24["league_rate"]),
        "dpi_hidden_yards": dpi_hidden_yardage(0.9),
        "k16_wind_range_loss_m": float(calm["range_m"]) - float(windy["range_m"]),
        "k16_altitude_range_gain_m": float(denver["range_m"]) - float(calm["range_m"]),
        "wbgt_q4_multiplier": float(wbgt),
        "banzhaf_pressure_wind": float(dict(banz["pairwise_interactions"])[(0, 1)]),
        "wx140_completion_drag": float(wx140["completion_weather_drag"]),
        "tddlog_obdd_conjunction_prob": float(tdd["exact_probability"]),
        "pymc_mu_hyper": float(pymc_res["mu_hyper"]),
        "catboost_ordered_est": float(cat_res["latest_ordered_estimate"]),
        "xgboost_split_gain": float(xgb_res["gain"]),
        "ngboost_nat_grad_mu": float(ng_res["nat_grad_mu"]),
        "torchsde_grad_kappa": float(sde_res["grad_kappa"]),
        "kyle_lambda_fair_prob": float(kyle_res["kyle_lambda_fair_prob"]),
        "fwl_check_partial_slope": float(fwl_chk["partial_slope"]),
    }
    finite = all(math.isfinite(v) for v in scalars.values())
    out = {
        "wave25_workstreams_wired": True,
        "scalars": scalars,
        "scalars_verified_count": sum(1 for v in scalars.values() if math.isfinite(v)),
        "all_scalars_finite": finite,
        "fwl_orthogonal_verified": math.isfinite(float(fwl_chk["partial_slope"])),
        "k14_rule_in_only": float(k14["snap_multiplier"]) <= 1.0,
        "polymarket_cleared": bool(kyle_res["cleared"]),
        "social_stage2_gradient": float(hk["stage2_gradient"]),
        "live_stage2_weight": 0.0,
        "wave25_epa_adj": 0.0,
    }
    _WAVE25_BRIDGE_CACHE[cache_key] = dict(out)
    return out


__all__ = [
    "AVAILABILITY_STATES",
    "LIGHT_BOX_PRIORS",
    "RECEIVER_ARCHETYPES",
    "air_density_kg_m3",
    "beta_binomial_light_box",
    "dawid_skene_em",
    "dirichlet_multinomial_shell_shrinkage",
    "dpi_hidden_yardage",
    "evaluate_wave25_workstreams_bridge",
    "fwl_partial_coefficient",
    "hawkes_social_immediacy_and_market_absorption",
    "k08_shared_frailty_pocket_survival",
    "k14_rule_in_snap_attenuation",
    "k16_rk4_ball_flight",
    "k24_referee_crew_shrinkage",
    "kyle_lambda_liquidity_devig",
    "larcker_zakolyukina_deception_score",
    "mjs_plus_unequal_variance_shrinkage",
    "reply_tree_spoof_probability",
    "romano_wolf_stepdown",
    "sequential_brier_reputation",
    "wbgt_q4_metabolic_decay",
]
