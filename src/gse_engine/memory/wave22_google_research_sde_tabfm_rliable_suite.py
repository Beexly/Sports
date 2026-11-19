"""Wave 23 Google Research Pillars: SDE adjoints, TimesFM/TabFM, rliable, promotion laws.

Pure-Python (stdlib ``math`` / ``random`` only) reference kernels distilled
from the submitted ``google-research`` repositories plus the Google Research
catalog links submitted on 2026-11-16. Every kernel is deterministic given its
inputs (and seed where stochastic), is covered by an exact or finite-difference
verifier in ``tests/unit/test_wave23_google_research_and_boosting_suites.py``,
and is reached from Stage 2 through ``evaluate_wave23_google_research_bridge``.

Kernel families:
  * torchsde: Ito Euler-Maruyama and Stratonovich Heun solvers for
    Ornstein-Uhlenbeck score / pace / fatigue drift-diffusion, with an exact
    discrete adjoint that returns dL/d(kappa, m, sigma, x0).
  * timesfm: exact additive multi-resolution (dyadic moving-average)
    decomposition plus a patch-mean horizon forecast.
  * tabfm: small-sample tabular prior shrinkage (normal-normal empirical Bayes).
  * rliable / tuning_playbook / harness2: IQM, optimality gap, performance
    profiles, stratified bootstrap CIs, and a deterministic monotone
    validation-curve promotion law (the OOS ratchet).
  * disentanglement_lib: Gram-Schmidt factor orthogonalization with Gaussian
    mutual-information audit (talent, scheme, weather, officiating).
  * augmix: Jensen-Shannon consistency across augmented predictive views.
  * tapas: structured table cell selection and aggregation.
  * vmoe: top-k sparse expert routing with capacity and Switch load balance.
  * morph-net: L1 proximal (ISTA) feature pruning.
  * arxiv-latex-cleaner: LaTeX comment stripping and zero-arg macro expansion.
  * paper-orchestra: reliability-weighted log-odds critique pooling.
  * deduplicate-text-datasets: rolling-hash repeated-substring detection.
  * football: potential-based reward shaping over field position (Ng 1999).
  * bleurt: lexical reference-agreement proxy (documented as a proxy only).
  * meta-dataset: deterministic N-way K-shot episodes + prototype classifier.
  * noisystudent: confidence-thresholded, class-capped pseudo-labelling.
  * dreamer: TD(lambda) imagined returns.
  * lottery-ticket-hypothesis: iterative magnitude pruning masks.
  * federated: FedAvg with per-client L2 clipping.
  * ERA (google-research.github.io/era): flat UCB tree-search arm selection.
  * google/artemis: Wilson-interval action-trace reliability.
  * Google-Health: medical RUO quarantine guard (zero sports weight).

All Stage-2 outputs of this module are diagnostics with live weight 0.0 until
the Weeks 1..10 OOS ratchet (Wave 26) promotes them.
"""

from __future__ import annotations

import math
import random
import re
from collections.abc import Callable, Mapping, Sequence
from typing import Any

_SEAM_MOD = "src/gse_engine/memory/wave22_google_research_sde_tabfm_rliable_suite.py"
_PERMISSIVE = "ingest_and_learn_non_commercial_or_permissive"
_CATALOG = "ingest_and_learn_catalog_index_reference_only"
_MEDICAL = "MEDICAL_RUO_QUARANTINE_ZERO_SPORTS_WEIGHT"


def _entry(
    eid: int,
    name: str,
    url: str,
    license_name: str,
    category: str,
    domain: str,
    seam_fn: str,
    role: str,
    posture: str = _PERMISSIVE,
    **extra: Any,
) -> dict[str, Any]:
    out: dict[str, Any] = {
        "id": eid,
        "name": name,
        "url": url,
        "license": license_name,
        "category": category,
        "domain": domain,
        "gse_seam": f"{_SEAM_MOD}::{seam_fn}",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": posture,
        "role": role,
        "status": "WIRED_V3",
    }
    out.update(extra)
    return out


_GH = "https://github.com/"
WAVE23_GOOGLE_RESEARCH_ENTRIES: list[dict[str, Any]] = [
    _entry(170, "google-research/torchsde", _GH + "google-research/torchsde", "Apache-2.0",
           "sde-solvers-and-adjoints", "ito_stratonovich_ou_drift_diffusion_adjoint",
           "solve_ou_sde_and_exact_adjoint",
           "OU score/pace/fatigue SDE with exact discrete adjoint gradients."),
    _entry(171, "google-research/timesfm", _GH + "google-research/timesfm", "Apache-2.0",
           "temporal-foundation-decomposition", "dyadic_multi_resolution_decomposition",
           "multi_resolution_decompose_and_forecast",
           "Exact additive multi-resolution trend decomposition and patch forecast."),
    _entry(172, "google-research/tabfm", _GH + "google-research/tabfm", "Apache-2.0",
           "tabular-prior-shrinkage", "normal_normal_small_sample_shrinkage",
           "tabular_small_sample_prior_shrinkage",
           "Small-sample tabular group means shrunk toward an in-context prior."),
    _entry(173, "google-research/rliable", _GH + "google-research/rliable", "Apache-2.0",
           "reliable-evaluation-statistics", "iqm_optimality_gap_profiles_bootstrap",
           "compute_rliable_aggregate_metrics",
           "IQM, optimality gap, performance profiles and stratified bootstrap CIs."),
    _entry(174, "google-research/tuning_playbook", _GH + "google-research/tuning_playbook",
           "CC-BY-4.0", "deterministic-tuning-protocol", "validation_curve_promotion_law",
           "monotone_validation_promotion_law",
           "Promote only on held-out improvement; incumbent otherwise retained."),
    _entry(175, "google-research/harness2", _GH + "google-research/harness2", "Apache-2.0",
           "recursive-agent-harness", "frozen_weight_harness_ratchet",
           "monotone_validation_promotion_law",
           "Frozen-weight harness edits accepted only under a monotone ratchet."),
    _entry(176, "google-research/disentanglement_lib",
           _GH + "google-research/disentanglement_lib", "Apache-2.0",
           "latent-disentanglement", "gram_schmidt_factor_mi_audit",
           "orthogonalize_latent_factors_mi",
           "Orthogonalizes talent/scheme/weather/officiating with Gaussian MI audit."),
    _entry(177, "google-research/augmix", _GH + "google-research/augmix", "Apache-2.0",
           "consistency-regularization", "jensen_shannon_augmented_view_consistency",
           "augmix_jensen_shannon_consistency",
           "JS divergence consistency across augmented predictive views."),
    _entry(178, "google-research/tapas", _GH + "google-research/tapas", "Apache-2.0",
           "table-question-answering", "cell_selection_and_aggregation",
           "tapas_select_and_aggregate",
           "Structured table cell selection with SUM/AVERAGE/COUNT/SELECT."),
    _entry(179, "google-research/vmoe", _GH + "google-research/vmoe", "Apache-2.0",
           "sparse-mixture-of-experts", "top_k_capacity_routing_and_load_balance",
           "vmoe_top_k_capacity_route",
           "Top-k expert routing with capacity drop and Switch auxiliary loss."),
    _entry(180, "google-research/morph-net", _GH + "google-research/morph-net",
           "Apache-2.0", "structured-sparsity", "l1_proximal_feature_pruning",
           "morphnet_ista_l1_prune",
           "ISTA lasso feature pruning for Stage-2 scalar sets."),
    _entry(181, "google-research/paper-orchestra", _GH + "google-research/paper-orchestra",
           "Apache-2.0", "multi-agent-critique", "reliability_weighted_critique_pooling",
           "pool_multi_agent_proof_critiques",
           "Pools critic verdicts in log-odds weighted by critic reliability."),
    _entry(182, "google-research/arxiv-latex-cleaner",
           _GH + "google-research/arxiv-latex-cleaner", "Apache-2.0",
           "latex-normalization", "comment_strip_and_macro_expansion",
           "normalize_latex_macros",
           "Strips comments/todos and expands zero-argument newcommand macros."),
    _entry(183, "google-research/deduplicate-text-datasets",
           _GH + "google-research/deduplicate-text-datasets", "Apache-2.0",
           "dataset-deduplication", "rolling_hash_repeated_substrings",
           "find_repeated_substrings",
           "Detects repeated substrings of length >= k across RLVR documents."),
    _entry(184, "google-research/football", _GH + "google-research/football", "Apache-2.0",
           "multi-agent-football-rl", "potential_based_field_position_shaping",
           "potential_based_field_shaping",
           "Policy-invariant potential shaping over field position."),
    _entry(185, "google-research/bleurt", _GH + "google-research/bleurt", "Apache-2.0",
           "reference-based-evaluation", "lexical_reference_agreement_proxy",
           "reference_agreement_proxy",
           "Lexical F1/bigram agreement proxy for rationale scoring (not BLEURT)."),
    _entry(186, "google-research/meta-dataset", _GH + "google-research/meta-dataset",
           "Apache-2.0", "few-shot-episodes", "n_way_k_shot_prototypes",
           "sample_episode_and_prototype_classify",
           "Deterministic N-way K-shot episodes with prototype classification."),
    _entry(187, "google-research/noisystudent", _GH + "google-research/noisystudent",
           "Apache-2.0", "self-training", "confidence_thresholded_pseudo_labels",
           "noisy_student_select_pseudo_labels",
           "Confidence-thresholded, class-balanced pseudo-label selection."),
    _entry(188, "google-research/dreamer", _GH + "google-research/dreamer", "Apache-2.0",
           "latent-imagination-rl", "td_lambda_imagined_returns",
           "dreamer_lambda_returns", "TD(lambda) returns over imagined drives."),
    _entry(189, "google-research/lottery-ticket-hypothesis",
           _GH + "google-research/lottery-ticket-hypothesis", "Apache-2.0",
           "sparse-subnetworks", "iterative_magnitude_pruning_masks",
           "lottery_ticket_magnitude_mask", "Iterative magnitude pruning masks."),
    _entry(190, "google-research/federated", _GH + "google-research/federated",
           "Apache-2.0", "federated-aggregation", "fedavg_with_l2_clipping",
           "fedavg_aggregate_clipped", "FedAvg aggregation with per-client clipping."),
    _entry(191, "google-research/era (Empirical Research Assistant)",
           "https://google-research.github.io/era/", "Apache-2.0",
           "empirical-software-tree-search", "flat_ucb_tree_search_selection",
           "era_flat_ucb_select", "Flat UCB tree search over candidate programs."),
    _entry(192, "google/artemis", _GH + "google/artemis", "Apache-2.0",
           "agent-reliability-reference", "wilson_interval_action_trace_reliability",
           "artemis_action_trace_reliability",
           "Wilson-interval reliability over agent action traces (reference only)."),
    _entry(193, "Google-Health (organization)", _GH + "Google-Health", "MIXED",
           "medical-research-quarantine", "medical_ruo_zero_sports_weight_guard",
           "assert_google_health_medical_quarantine",
           "Medical RUO quarantine; zero sports weight, no Stage 1-3 import.",
           posture=_MEDICAL, sports_weight=0.0),
    _entry(194, "google-research (organization repositories index)",
           _GH + "orgs/google-research/repositories", "MIXED", "catalog-index",
           "google_research_repository_catalog", "compute_rliable_aggregate_metrics",
           "Catalog index for future pillar triage.", posture=_CATALOG),
    _entry(195, "research.google/resources", "https://research.google/resources/",
           "MIXED", "catalog-index", "google_research_resources_catalog",
           "compute_rliable_aggregate_metrics",
           "Datasets/tools catalog index for future pillar triage.", posture=_CATALOG),
    _entry(196, "aistudio.google.com/docs/libraries",
           "https://aistudio.google.com/docs/libraries", "MIXED", "sdk-reference",
           "gemini_sdk_library_reference_zero_paid_spend",
           "monotone_validation_promotion_law",
           "SDK reference only; zero paid API calls from the engine.", posture=_CATALOG),
]


# ---------------------------------------------------------------------------
# torchsde: OU drift-diffusion with exact discrete adjoint
# ---------------------------------------------------------------------------


def brownian_increments(n_steps: int, dt: float, seed: int) -> list[float]:
    """Deterministic Brownian increments dW_k ~ N(0, dt)."""
    rng = random.Random(int(seed))
    sd = math.sqrt(max(0.0, float(dt)))
    return [rng.gauss(0.0, sd) for _ in range(max(0, int(n_steps)))]


def solve_ou_sde(
    *,
    x0: float,
    kappa: float,
    m: float,
    sigma: float,
    dt: float,
    dw: Sequence[float],
    scheme: str = "ito",
) -> list[float]:
    """Solve dX = kappa (m - X) dt + sigma dW (Ito Euler-Maruyama or Strat. Heun).

    With additive noise the Ito and Stratonovich solutions coincide in law;
    Heun is the strong order-1.0 Stratonovich predictor-corrector.
    """
    path = [float(x0)]
    x = float(x0)
    for inc in dw:
        drift = kappa * (m - x)
        if scheme == "ito":
            x = x + drift * dt + sigma * inc
        elif scheme == "stratonovich":
            pred = x + drift * dt + sigma * inc
            drift_pred = kappa * (m - pred)
            x = x + 0.5 * (drift + drift_pred) * dt + sigma * inc
        else:
            raise ValueError("scheme must be 'ito' or 'stratonovich'.")
        path.append(x)
    return path


def solve_ou_sde_and_exact_adjoint(
    *,
    x0: float,
    kappa: float,
    m: float,
    sigma: float,
    dt: float,
    dw: Sequence[float],
    target: float,
) -> dict[str, Any]:
    """Ito OU solve plus exact discrete adjoint of L = 0.5 (X_N - target)^2.

    Backward recursion: a_N = X_N - target, a_k = a_{k+1} (1 - kappa dt).
    Parameter gradients accumulate a_{k+1} times the local partial derivative
    of the step map, which is exact for the discretized dynamics.
    """
    path = solve_ou_sde(x0=x0, kappa=kappa, m=m, sigma=sigma, dt=dt, dw=dw, scheme="ito")
    n = len(dw)
    a = path[-1] - float(target)
    loss = 0.5 * a * a
    g_kappa = 0.0
    g_m = 0.0
    g_sigma = 0.0
    for k in range(n - 1, -1, -1):
        xk = path[k]
        g_kappa += a * (m - xk) * dt
        g_m += a * kappa * dt
        g_sigma += a * dw[k]
        a = a * (1.0 - kappa * dt)
    return {
        "terminal": path[-1],
        "loss": loss,
        "grad_kappa": g_kappa,
        "grad_m": g_m,
        "grad_sigma": g_sigma,
        "grad_x0": a,
        "path": path,
    }


# ---------------------------------------------------------------------------
# timesfm: multi-resolution decomposition; tabfm: small-sample shrinkage
# ---------------------------------------------------------------------------


def _trailing_mean(series: Sequence[float], window: int) -> list[float]:
    out: list[float] = []
    acc = 0.0
    for i, v in enumerate(series):
        acc += float(v)
        if i >= window:
            acc -= float(series[i - window])
        out.append(acc / float(min(i + 1, window)))
    return out


def multi_resolution_decompose_and_forecast(
    series: Sequence[float], *, levels: int = 3, horizon: int = 1, patch: int = 4
) -> dict[str, Any]:
    """Dyadic trailing-mean pyramid; components sum exactly to the series.

    Level j smooth S_j uses window 2^j; detail D_j = S_{j-1} - S_j with
    S_0 = series. series = S_L + sum_j D_j holds identically. The forecast is
    the coarsest-level patch mean plus the mean of the finest detail patch.
    """
    if not series:
        raise ValueError("series must be non-empty.")
    vals = [float(v) for v in series]
    smooths = [vals]
    for j in range(1, max(1, int(levels)) + 1):
        smooths.append(_trailing_mean(vals, 2**j))
    details = [
        [a - b for a, b in zip(smooths[j - 1], smooths[j], strict=True)]
        for j in range(1, len(smooths))
    ]
    recon = [
        smooths[-1][i] + sum(d[i] for d in details) for i in range(len(vals))
    ]
    max_err = max(abs(r - v) for r, v in zip(recon, vals, strict=True))
    p = max(1, min(int(patch), len(vals)))
    trend_patch = sum(smooths[-1][-p:]) / float(p)
    detail_patch = sum(details[0][-p:]) / float(p)
    forecast = [trend_patch + detail_patch for _ in range(max(1, int(horizon)))]
    return {
        "levels": len(details),
        "trend": smooths[-1],
        "details": details,
        "max_reconstruction_error": max_err,
        "forecast": forecast,
    }


def tabular_small_sample_prior_shrinkage(
    group_values: Mapping[str, Sequence[float]],
    *,
    prior_mean: float,
    noise_var: float,
    prior_var: float,
) -> dict[str, Any]:
    """Normal-normal posterior means: w_g = n_g / (n_g + noise_var / prior_var)."""
    if prior_var <= 0.0 or noise_var <= 0.0:
        raise ValueError("noise_var and prior_var must be positive.")
    k = float(noise_var) / float(prior_var)
    post: dict[str, float] = {}
    weights: dict[str, float] = {}
    for g, vals in group_values.items():
        n = len(vals)
        mean = sum(float(v) for v in vals) / float(n) if n else float(prior_mean)
        w = float(n) / (float(n) + k)
        post[g] = w * mean + (1.0 - w) * float(prior_mean)
        weights[g] = w
    return {"posterior_means": post, "data_weights": weights, "shrinkage_k": k}


# ---------------------------------------------------------------------------
# rliable / tuning_playbook / harness2
# ---------------------------------------------------------------------------


def interquartile_mean(values: Sequence[float]) -> float:
    """IQM with fractional trimming of the lowest and highest 25 percent mass."""
    xs = sorted(float(v) for v in values)
    n = len(xs)
    if n == 0:
        raise ValueError("values must be non-empty.")
    lo, hi = 0.25 * n, 0.75 * n
    total = 0.0
    for i, x in enumerate(xs):
        w = max(0.0, min(float(i + 1), hi) - max(float(i), lo))
        total += w * x
    return total / (hi - lo)


def compute_rliable_aggregate_metrics(
    scores_by_task: Mapping[str, Sequence[float]],
    *,
    gamma: float,
    taus: Sequence[float],
    n_boot: int = 500,
    seed: int = 0,
    alpha: float = 0.05,
) -> dict[str, Any]:
    """IQM, optimality gap, performance profile and stratified bootstrap CI."""
    tasks = sorted(scores_by_task)
    if not tasks or any(len(scores_by_task[t]) == 0 for t in tasks):
        raise ValueError("every task needs at least one run score.")
    pooled = [float(v) for t in tasks for v in scores_by_task[t]]
    iqm = interquartile_mean(pooled)
    opt_gap = sum(max(0.0, float(gamma) - v) for v in pooled) / float(len(pooled))
    profile = {float(tau): sum(1 for v in pooled if v > tau) / len(pooled) for tau in taus}
    rng = random.Random(int(seed))
    boots: list[float] = []
    for _ in range(max(1, int(n_boot))):
        sample: list[float] = []
        for t in tasks:
            runs = [float(v) for v in scores_by_task[t]]
            sample.extend(runs[rng.randrange(len(runs))] for _ in runs)
        boots.append(interquartile_mean(sample))
    boots.sort()
    lo_i = int(math.floor((alpha / 2.0) * (len(boots) - 1)))
    hi_i = int(math.ceil((1.0 - alpha / 2.0) * (len(boots) - 1)))
    return {
        "iqm": iqm,
        "optimality_gap": opt_gap,
        "performance_profile": profile,
        "iqm_ci_low": boots[lo_i],
        "iqm_ci_high": boots[hi_i],
        "n_runs": len(pooled),
    }


def monotone_validation_promotion_law(
    *,
    incumbent_loss: float,
    candidate_loss: float,
    floor_loss: float,
    fwl_residual_skill: float,
    paired_ci_high: float | None = None,
) -> dict[str, Any]:
    """Deterministic ratchet: promote only if every promotion condition holds.

    Conditions: candidate <= incumbent, candidate <= floor, positive FWL
    orthogonal residual skill, and (when supplied) the upper bound of the
    paired loss-difference CI (candidate - incumbent) is <= 0.
    """
    reasons: list[str] = []
    if candidate_loss > incumbent_loss:
        reasons.append("regresses_incumbent")
    if candidate_loss > floor_loss:
        reasons.append("violates_floor")
    if fwl_residual_skill <= 0.0:
        reasons.append("no_fwl_residual_skill")
    if paired_ci_high is not None and paired_ci_high > 0.0:
        reasons.append("paired_ci_not_below_zero")
    promote = not reasons
    return {
        "promote": promote,
        "live_weight_multiplier": 1.0 if promote else 0.0,
        "accepted_loss": candidate_loss if promote else incumbent_loss,
        "rejection_reasons": reasons,
    }


# ---------------------------------------------------------------------------
# disentanglement_lib, augmix, tapas, vmoe, morph-net
# ---------------------------------------------------------------------------


def _pearson(a: Sequence[float], b: Sequence[float]) -> float:
    n = len(a)
    ma = sum(a) / n
    mb = sum(b) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(a, b, strict=True))
    va = sum((x - ma) ** 2 for x in a)
    vb = sum((y - mb) ** 2 for y in b)
    if va <= 1e-15 or vb <= 1e-15:
        return 0.0
    return cov / math.sqrt(va * vb)


def orthogonalize_latent_factors_mi(
    factors: Mapping[str, Sequence[float]], order: Sequence[str]
) -> dict[str, Any]:
    """Modified Gram-Schmidt on centered factor columns in priority ``order``.

    Gaussian MI between factor pairs is I = -0.5 ln(1 - rho^2). After
    orthogonalization all pairwise correlations are ~0, so total pairwise MI
    collapses to ~0 while each factor keeps its unique (residual) variation.
    """
    cols: list[list[float]] = []
    for name in order:
        raw = [float(v) for v in factors[name]]
        mu = sum(raw) / len(raw)
        cols.append([v - mu for v in raw])

    def _mi_total(cs: Sequence[Sequence[float]]) -> float:
        tot = 0.0
        for i in range(len(cs)):
            for j in range(i + 1, len(cs)):
                r = max(-0.999999, min(0.999999, _pearson(cs[i], cs[j])))
                tot += -0.5 * math.log(1.0 - r * r)
        return tot

    before = _mi_total(cols)
    ortho: list[list[float]] = []
    for c in cols:
        v = list(c)
        for q in ortho:
            qq = sum(x * x for x in q)
            if qq <= 1e-15:
                continue
            proj = sum(x * y for x, y in zip(v, q, strict=True)) / qq
            v = [x - proj * y for x, y in zip(v, q, strict=True)]
        ortho.append(v)
    after = _mi_total(ortho)
    return {
        "order": list(order),
        "orthogonal_factors": {n: col for n, col in zip(order, ortho, strict=True)},
        "pairwise_mi_before": before,
        "pairwise_mi_after": after,
    }


def _kl(p: Sequence[float], q: Sequence[float]) -> float:
    return sum(pi * math.log(max(1e-12, pi) / max(1e-12, qi)) for pi, qi in zip(p, q, strict=True))


def augmix_jensen_shannon_consistency(views: Sequence[Sequence[float]]) -> float:
    """Generalized JS divergence: mean KL of each view to the mixture."""
    if len(views) < 2:
        raise ValueError("need at least two predictive views.")
    k = len(views[0])
    mix = [sum(float(v[i]) for v in views) / len(views) for i in range(k)]
    return sum(_kl([float(x) for x in v], mix) for v in views) / len(views)


def tapas_select_and_aggregate(
    rows: Sequence[Mapping[str, Any]],
    *,
    column: str,
    op: str,
    where: Callable[[Mapping[str, Any]], bool] | None = None,
) -> dict[str, Any]:
    """Select cells of ``column`` from rows passing ``where`` then aggregate."""
    cells = [r[column] for r in rows if column in r and (where is None or where(r))]
    op_u = op.upper()
    if op_u == "SELECT":
        return {"op": op_u, "cells": cells, "value": cells}
    if op_u == "COUNT":
        return {"op": op_u, "cells": cells, "value": len(cells)}
    nums = [float(c) for c in cells]
    if op_u == "SUM":
        return {"op": op_u, "cells": cells, "value": sum(nums)}
    if op_u == "AVERAGE":
        if not nums:
            raise ValueError("AVERAGE over empty selection.")
        return {"op": op_u, "cells": cells, "value": sum(nums) / len(nums)}
    raise ValueError("op must be SELECT, COUNT, SUM, or AVERAGE.")


def vmoe_top_k_capacity_route(
    logits: Sequence[Sequence[float]], *, k: int = 1, capacity_factor: float = 1.0
) -> dict[str, Any]:
    """Top-k softmax routing with per-expert capacity and Switch aux loss.

    aux = E * sum_e f_e * P_e where f_e is the fraction of tokens whose top-1
    choice is e and P_e the mean router probability for e. aux == 1 at
    perfect balance.
    """
    n_tok = len(logits)
    n_exp = len(logits[0]) if n_tok else 0
    cap = max(1, int(math.ceil(capacity_factor * n_tok * k / max(1, n_exp))))
    load = [0] * n_exp
    assignments: list[list[int]] = []
    dropped = 0
    probs_all: list[list[float]] = []
    top1 = [0] * n_exp
    for row in logits:
        mx = max(row)
        ex = [math.exp(v - mx) for v in row]
        z = sum(ex)
        probs = [e / z for e in ex]
        probs_all.append(probs)
        ranked = sorted(range(n_exp), key=lambda e: (-probs[e], e))
        top1[ranked[0]] += 1
        chosen: list[int] = []
        for e in ranked[: max(1, int(k))]:
            if load[e] < cap:
                load[e] += 1
                chosen.append(e)
            else:
                dropped += 1
        assignments.append(chosen)
    f = [t / max(1, n_tok) for t in top1]
    p_mean = [sum(p[e] for p in probs_all) / max(1, n_tok) for e in range(n_exp)]
    aux = n_exp * sum(fi * pi for fi, pi in zip(f, p_mean, strict=True))
    return {
        "assignments": assignments,
        "expert_load": load,
        "capacity": cap,
        "dropped": dropped,
        "load_balance_aux_loss": aux,
    }


def morphnet_ista_l1_prune(
    x_rows: Sequence[Sequence[float]],
    y: Sequence[float],
    *,
    lam: float,
    n_iter: int = 500,
) -> dict[str, Any]:
    """ISTA for min 0.5/n ||y - Xb||^2 + lam ||b||_1 (soft-threshold prox)."""
    n = len(x_rows)
    p = len(x_rows[0])
    col_sq = sum(sum(r[j] * r[j] for r in x_rows) for j in range(p)) / n
    step = 1.0 / max(1e-12, col_sq)
    b = [0.0] * p
    for _ in range(int(n_iter)):
        resid = [sum(r[j] * b[j] for j in range(p)) - yi for r, yi in zip(x_rows, y, strict=True)]
        grad = [sum(r[j] * e for r, e in zip(x_rows, resid, strict=True)) / n for j in range(p)]
        z = [bj - step * gj for bj, gj in zip(b, grad, strict=True)]
        thr = step * lam
        b = [math.copysign(max(0.0, abs(zj) - thr), zj) for zj in z]
    kept = [j for j, bj in enumerate(b) if abs(bj) > 1e-9]
    return {"coefficients": b, "kept_features": kept, "sparsity": 1.0 - len(kept) / p}


# ---------------------------------------------------------------------------
# arxiv-latex-cleaner, paper-orchestra, deduplicate-text-datasets
# ---------------------------------------------------------------------------

_NEWCMD_RE = re.compile(r"\\newcommand\{\\([A-Za-z]+)\}\{((?:[^{}]|\{[^{}]*\})*)\}")
_TODO_RE = re.compile(r"\\todo\{[^{}]*\}")


def normalize_latex_macros(src: str) -> dict[str, Any]:
    r"""Strip % comments (not \%), remove \todo{...}, expand zero-arg macros."""
    lines: list[str] = []
    for line in src.splitlines():
        out_chars: list[str] = []
        prev = ""
        for ch in line:
            if ch == "%" and prev != "\\":
                break
            out_chars.append(ch)
            prev = ch
        lines.append("".join(out_chars).rstrip())
    body = "\n".join(lines)
    macros = dict(_NEWCMD_RE.findall(body))
    body = _NEWCMD_RE.sub("", body)
    body = _TODO_RE.sub("", body)
    for name in sorted(macros, key=len, reverse=True):
        replacement = macros[name].replace("\\", "\\\\")
        body = re.sub(r"\\" + name + r"(?![A-Za-z])", replacement, body)
    return {"normalized": body.strip(), "macros_expanded": sorted(macros)}


def pool_multi_agent_proof_critiques(
    verdicts: Sequence[tuple[float, float]], *, prior: float = 0.5
) -> dict[str, Any]:
    """Pool (p_accept, reliability) critiques: logit sum weighted by reliability."""
    pr = max(1e-6, min(1.0 - 1e-6, float(prior)))
    z = math.log(pr / (1.0 - pr))
    for p, rel in verdicts:
        pc = max(1e-6, min(1.0 - 1e-6, float(p)))
        z += max(0.0, min(1.0, float(rel))) * math.log(pc / (1.0 - pc))
    post = 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, z))))
    return {"posterior_accept": post, "accept": post >= 0.5, "pooled_logit": z}


def find_repeated_substrings(docs: Sequence[str], *, min_len: int = 32) -> dict[str, Any]:
    """Find substrings of length ``min_len`` occurring in two or more places.

    Uses exact k-gram hashing with collision verification by string equality.
    """
    k = max(1, int(min_len))
    seen: dict[str, tuple[int, int]] = {}
    dup_spans: list[dict[str, int]] = []
    dup_docs: set[int] = set()
    for d_idx, doc in enumerate(docs):
        for i in range(0, max(0, len(doc) - k + 1)):
            gram = doc[i : i + k]
            if gram in seen:
                first = seen[gram]
                if first[0] != d_idx or i - first[1] >= k:
                    dup_spans.append({"doc": d_idx, "start": i, "first_doc": first[0]})
                    dup_docs.add(d_idx)
            else:
                seen[gram] = (d_idx, i)
    return {
        "duplicate_kgram_hits": len(dup_spans),
        "docs_with_duplicates": sorted(dup_docs),
        "spans": dup_spans[:100],
    }


# ---------------------------------------------------------------------------
# football, bleurt proxy, meta-dataset, noisystudent, dreamer, LTH, federated
# ---------------------------------------------------------------------------


def potential_based_field_shaping(
    yardlines_100: Sequence[float], *, gamma: float = 0.99, scale: float = 6.0
) -> dict[str, Any]:
    """F(s, s') = gamma phi(s') - phi(s), phi(s) = scale * (1 - yardline_100 / 100).

    The discounted sum of F telescopes to gamma^T phi(s_T) - phi(s_0), so the
    optimal policy is unchanged (Ng, Harada, Russell 1999).
    """
    phi = [float(scale) * (1.0 - float(y) / 100.0) for y in yardlines_100]
    shaping = [gamma * phi[t + 1] - phi[t] for t in range(len(phi) - 1)]
    disc = sum((gamma**t) * f for t, f in enumerate(shaping))
    telescoped = (gamma ** (len(phi) - 1)) * phi[-1] - phi[0] if phi else 0.0
    return {"shaping": shaping, "discounted_sum": disc, "telescoped": telescoped}


def reference_agreement_proxy(candidate: str, reference: str) -> dict[str, float]:
    """Token F1 and bigram precision blend; a lexical proxy, not learned BLEURT."""
    c = candidate.lower().split()
    r = reference.lower().split()
    if not c or not r:
        return {"token_f1": 0.0, "bigram_precision": 0.0, "agreement": 0.0}
    rc: dict[str, int] = {}
    for t in r:
        rc[t] = rc.get(t, 0) + 1
    overlap = 0
    for t in c:
        if rc.get(t, 0) > 0:
            overlap += 1
            rc[t] -= 1
    prec = overlap / len(c)
    rec = overlap / len(r)
    f1 = 0.0 if overlap == 0 else 2 * prec * rec / (prec + rec)
    cb = list(zip(c, c[1:], strict=False))
    rb = set(zip(r, r[1:], strict=False))
    bp = (sum(1 for b in cb if b in rb) / len(cb)) if cb else 0.0
    return {"token_f1": f1, "bigram_precision": bp, "agreement": 0.7 * f1 + 0.3 * bp}


def sample_episode_and_prototype_classify(
    data: Mapping[str, Sequence[Sequence[float]]],
    *,
    n_way: int,
    k_shot: int,
    n_query: int,
    seed: int,
) -> dict[str, Any]:
    """Deterministic N-way K-shot episode; classify queries by nearest prototype."""
    rng = random.Random(int(seed))
    classes = sorted(c for c, rows in data.items() if len(rows) >= k_shot + n_query)
    if len(classes) < n_way:
        raise ValueError("not enough classes with k_shot + n_query examples.")
    chosen = sorted(rng.sample(classes, n_way))
    protos: dict[str, list[float]] = {}
    queries: list[tuple[str, Sequence[float]]] = []
    for c in chosen:
        idx = rng.sample(range(len(data[c])), k_shot + n_query)
        sup = [data[c][i] for i in idx[:k_shot]]
        dim = len(sup[0])
        protos[c] = [sum(float(s[d]) for s in sup) / k_shot for d in range(dim)]
        queries.extend((c, data[c][i]) for i in idx[k_shot:])
    correct = 0
    for label, q in queries:
        pred = min(
            chosen,
            key=lambda c: (sum((float(a) - b) ** 2 for a, b in zip(q, protos[c], strict=True)), c),
        )
        correct += int(pred == label)
    return {
        "classes": chosen,
        "accuracy": correct / max(1, len(queries)),
        "n_queries": len(queries),
    }


def noisy_student_select_pseudo_labels(
    probs: Sequence[Sequence[float]], *, tau: float = 0.8, per_class_cap: int | None = None
) -> dict[str, Any]:
    """Keep argmax labels with confidence >= tau, capped per class by confidence."""
    by_class: dict[int, list[tuple[float, int]]] = {}
    for i, p in enumerate(probs):
        c = max(range(len(p)), key=lambda j: (p[j], -j))
        if p[c] >= tau:
            by_class.setdefault(c, []).append((float(p[c]), i))
    selected: list[tuple[int, int]] = []
    for c, items in sorted(by_class.items()):
        items.sort(key=lambda t: (-t[0], t[1]))
        lim = len(items) if per_class_cap is None else max(0, int(per_class_cap))
        selected.extend((i, c) for _, i in items[:lim])
    selected.sort()
    return {"selected": selected, "n_selected": len(selected)}


def dreamer_lambda_returns(
    rewards: Sequence[float], values: Sequence[float], *, gamma: float = 0.99, lam: float = 0.95
) -> list[float]:
    """V^lambda_t = r_t + gamma ((1 - lam) v_{t+1} + lam V^lambda_{t+1}); bootstrap v_T."""
    if len(values) != len(rewards) + 1:
        raise ValueError("values must have len(rewards) + 1 entries (bootstrap last).")
    out = [0.0] * len(rewards)
    nxt = float(values[-1])
    for t in range(len(rewards) - 1, -1, -1):
        nxt = float(rewards[t]) + gamma * ((1.0 - lam) * float(values[t + 1]) + lam * nxt)
        out[t] = nxt
    return out


def lottery_ticket_magnitude_mask(
    weights: Sequence[float], *, prune_frac_per_round: float = 0.2, rounds: int = 3
) -> dict[str, Any]:
    """Iterative magnitude pruning: each round prunes a fraction of survivors."""
    alive = [True] * len(weights)
    for _ in range(max(0, int(rounds))):
        surv = sorted((abs(float(weights[i])), i) for i in range(len(weights)) if alive[i])
        n_prune = int(math.floor(prune_frac_per_round * len(surv)))
        for _, i in surv[:n_prune]:
            alive[i] = False
    density = sum(alive) / max(1, len(alive))
    return {"mask": alive, "density": density}


def fedavg_aggregate_clipped(
    client_updates: Sequence[Sequence[float]],
    client_sizes: Sequence[int],
    *,
    clip_norm: float | None = None,
) -> list[float]:
    """Sample-size weighted average of (optionally L2-clipped) client updates."""
    if not client_updates or len(client_updates) != len(client_sizes):
        raise ValueError("client_updates and client_sizes must match and be non-empty.")
    dim = len(client_updates[0])
    total = float(sum(client_sizes))
    agg = [0.0] * dim
    for upd, n in zip(client_updates, client_sizes, strict=True):
        u = [float(v) for v in upd]
        if clip_norm is not None:
            norm = math.sqrt(sum(v * v for v in u))
            if norm > clip_norm > 0.0:
                u = [v * clip_norm / norm for v in u]
        for d in range(dim):
            agg[d] += (float(n) / total) * u[d]
    return agg


# ---------------------------------------------------------------------------
# ERA flat UCB, artemis reliability, Google-Health quarantine
# ---------------------------------------------------------------------------


def era_flat_ucb_select(
    reward_table: Mapping[str, Sequence[float]], *, budget: int, c: float = 1.4
) -> dict[str, Any]:
    """Run a deterministic flat UCB1 search over candidate programs.

    Each pull of arm a consumes its next scripted reward; arms are tried once
    first, then chosen by mean + c sqrt(ln t / n_a). Ties break by name.
    """
    arms = sorted(reward_table)
    counts = dict.fromkeys(arms, 0)
    sums = dict.fromkeys(arms, 0.0)
    for t in range(1, max(1, int(budget)) + 1):
        avail = [a for a in arms if counts[a] < len(reward_table[a])]
        if not avail:
            break
        untried = [a for a in avail if counts[a] == 0]
        if untried:
            arm = untried[0]
        else:
            arm = max(
                avail,
                key=lambda a: (sums[a] / counts[a] + c * math.sqrt(math.log(t) / counts[a]), a),
            )
        sums[arm] += float(reward_table[arm][counts[arm]])
        counts[arm] += 1
    means = {a: (sums[a] / counts[a] if counts[a] else float("-inf")) for a in arms}
    best = max(arms, key=lambda a: (means[a], a))
    return {"best_arm": best, "counts": counts, "means": means}


def artemis_action_trace_reliability(
    successes: int, trials: int, *, z: float = 1.96
) -> dict[str, float]:
    """Wilson score interval for an agent action-trace success rate."""
    if trials <= 0:
        raise ValueError("trials must be positive.")
    p = successes / trials
    den = 1.0 + z * z / trials
    center = (p + z * z / (2 * trials)) / den
    half = z * math.sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / den
    return {"rate": p, "wilson_low": center - half, "wilson_high": center + half}


def assert_google_health_medical_quarantine(
    *, requested_sports_weight: float = 0.0
) -> dict[str, Any]:
    """Fail closed if any non-zero sports weight is requested for medical assets."""
    if requested_sports_weight != 0.0:
        raise PermissionError(
            "MEDICAL_RUO_QUARANTINE: Google-Health assets carry zero sports weight."
        )
    return {"quarantined": True, "sports_weight": 0.0, "stage1_to_3_import_permitted": False}


# ---------------------------------------------------------------------------
# Stage-2 bridge
# ---------------------------------------------------------------------------


def evaluate_wave23_google_research_bridge(
    *,
    away_clean_epa: float,
    home_clean_epa: float,
    effective_wind_mph: float,
    is_short_week: bool,
) -> dict[str, Any]:
    """Stage-2 diagnostics: fatigue SDE adjoint, disentangled factors, ratchet law."""
    dt = 1.0 / 60.0
    dw = brownian_increments(60, dt, seed=20261117)
    fatigue_kappa = 1.6 if is_short_week else 1.2
    sde = solve_ou_sde_and_exact_adjoint(
        x0=0.0, kappa=fatigue_kappa, m=0.35, sigma=0.20, dt=dt, dw=dw, target=0.30
    )
    talent = [float(away_clean_epa), float(home_clean_epa), 0.05, -0.02]
    weather = [float(effective_wind_mph) / 20.0, float(effective_wind_mph) / 22.0, 0.1, 0.3]
    scheme = [0.4 * t + 0.6 * w for t, w in zip(talent, weather, strict=True)]
    officiating = [0.01, -0.01, 0.02, -0.02]
    dis = orthogonalize_latent_factors_mi(
        {"talent": talent, "scheme": scheme, "weather": weather, "officiating": officiating},
        order=("talent", "weather", "scheme", "officiating"),
    )
    law = monotone_validation_promotion_law(
        incumbent_loss=7.0944, candidate_loss=7.0944, floor_loss=7.0944, fwl_residual_skill=0.0
    )
    return {
        "wave23_google_research_wired": True,
        "google_research_entries": len(WAVE23_GOOGLE_RESEARCH_ENTRIES),
        "fatigue_sde_terminal": round(float(sde["terminal"]), 6),
        "fatigue_sde_grad_kappa": round(float(sde["grad_kappa"]), 8),
        "disentangle_mi_before": round(float(dis["pairwise_mi_before"]), 6),
        "disentangle_mi_after": round(float(dis["pairwise_mi_after"]), 10),
        "promotion_law_promote": bool(law["promote"]),
        "live_stage2_weight": float(law["live_weight_multiplier"]),
        "wave23_epa_adj": 0.0,
    }


__all__ = [
    "WAVE23_GOOGLE_RESEARCH_ENTRIES",
    "artemis_action_trace_reliability",
    "assert_google_health_medical_quarantine",
    "augmix_jensen_shannon_consistency",
    "brownian_increments",
    "compute_rliable_aggregate_metrics",
    "dreamer_lambda_returns",
    "era_flat_ucb_select",
    "evaluate_wave23_google_research_bridge",
    "fedavg_aggregate_clipped",
    "find_repeated_substrings",
    "interquartile_mean",
    "lottery_ticket_magnitude_mask",
    "monotone_validation_promotion_law",
    "morphnet_ista_l1_prune",
    "multi_resolution_decompose_and_forecast",
    "noisy_student_select_pseudo_labels",
    "normalize_latex_macros",
    "orthogonalize_latent_factors_mi",
    "pool_multi_agent_proof_critiques",
    "potential_based_field_shaping",
    "reference_agreement_proxy",
    "sample_episode_and_prototype_classify",
    "solve_ou_sde",
    "solve_ou_sde_and_exact_adjoint",
    "tabular_small_sample_prior_shrinkage",
    "tapas_select_and_aggregate",
    "vmoe_top_k_capacity_route",
]
