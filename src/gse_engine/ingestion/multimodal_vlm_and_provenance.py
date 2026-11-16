"""Multimodal VLM assertion gate (K18), shrinkage (K19), Hawkes-DS (K17) & WS 1.1-1.3.

Implements:
- WS 1.1: Cross-chapter DAG execution gate G_fire(e, X_t, tau_q) with DEFF=2.0
  and automated Buckingham Pi 6D dimensional rank-nullity verification.
- WS 1.2: Retraction quarantine (arXiv:2312.11067, W5-W8, DixonColes = 0.0),
  80%-power MDE Type-M filter, REML Hedges' g & conditional PET-PEESE pooling.
- WS 1.3: 1D Morlet Wavelet Scattering intermittency I_scat in [0.05, 0.85]
  routed strictly to explosive-tail weight pi_exp (never spread mu).
- K18: Zero-Drift VLM Chart Assertion Gate with W_1 & D_KS < 0.338, centering
  classifier, compositional simplex check, DB Spearman polarity >= +0.85, and
  strict separation of FTN light_box_6_or_fewer (0.0853) vs NGS <7 (0.515).
- K19: Romano-Wolf / Extreme-Value cherry-pick z-deflator, Beta-Binomial,
  Dirichlet-Multinomial (kappa=90), and Positive-Part Morris-James-Stein (MJS+).
- K17: Social-only Multivariate Hawkes p_imm(i), Syndicate Spoof Classifier,
  Market-Absorption Decay A_mkt, and Provenance-Weighted Dawid-Skene 4-state.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from fractions import Fraction
from typing import Literal

import numpy as np
from numpy.typing import NDArray
from scipy.stats import ks_2samp, spearmanr  # type: ignore[import-untyped]

DEFF_DRIVE_CLUSTER = 2.0
NFL_EPA_MIN_GAMES = 4
KS_ALPHA_001_CRIT_N32 = 0.338

QUARANTINED_METHODS_OR_DOIS: frozenset[str] = frozenset(
    {
        "arxiv:2312.11067",
        "2312.11067",
        "w5-w8",
        "dixoncoles",
        "dixon-coles",
    }
)

# Canonical 2026 32-team schema priors (explicitly separating FTN <=6 vs NGS <7 box defs)
CANONICAL_32TEAM_METRIC_PRIORS: dict[str, tuple[float, float]] = {
    "light_box_6_or_fewer_pct_ftn": (0.0853, 0.032),
    "non_stacked_box_under7_pct_ngs": (0.5150, 0.068),
    "first_read_pct_ftn": (0.6260, 0.065),
    "ass_score_ftn": (0.1280, 0.045),
}

DEFAULT_COVER_SHELL_PRIOR_6: tuple[float, ...] = (0.045, 0.225, 0.135, 0.325, 0.165, 0.105)
WAVELET_POS_PRIOR: dict[str, float] = {"WR": 0.28, "RB": 0.24, "TE": 0.19}
DAWID_SKENE_STATES: tuple[str, ...] = ("FullGo", "SnapCapped", "ActiveDecoy", "InactiveOut")


@dataclass(frozen=True, slots=True)
class DagExecutionVerdict:
    """Result of evaluating Cross-Chapter AST GuardNode G_fire(e, X_t, tau_q)."""

    fire: bool
    n_eff: float
    reasons: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class BuckinghamPiResult:
    """6D physical-statistical unit rank-nullity & equation balance verdict."""

    passed: bool
    rank: int
    n_variables: int
    nullity_pi_groups: int
    quarantine_weight: float
    reason: str


@dataclass(frozen=True, slots=True)
class MetaAnalysisStudy:
    """Single empirical paper/book study estimate for PET-PEESE pooling."""

    study_id: str
    theta_hat: float
    se: float
    pooled_sd: float
    n_raw: float
    n_params: int = 2
    df_cluster: float = DEFF_DRIVE_CLUSTER


@dataclass(frozen=True, slots=True)
class PetPeesePoolResult:
    """REML + conditional PET-PEESE pooled Hedges' g result."""

    g_pool: float
    estimator_used: Literal["reml_shrunk", "peese", "pet_shrunk", "quarantined_empty"]
    tau_sq: float
    i_squared: float
    retained_count: int
    quarantined_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class WaveletScatteringResult:
    """1D Morlet scattering intermittency score routed strictly to pi_exp."""

    i_scat: float
    raw_ratio: float
    position: str
    series_len: int
    allowed_targets: tuple[str, ...]
    forbidden_targets: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class VlmAssertionResult:
    """Zero-drift VLM chart extraction verification output (K18)."""

    accepted: bool
    scale_chosen: int | None
    centering_mode: Literal["raw_uncentered", "league_centered", "z_score", "quarantine"]
    d_ks: float
    wasserstein_1: float
    spearman_rho: float
    max_simplex_drift: float
    normalized_values: tuple[tuple[float, ...], ...]
    reason: str


@dataclass(frozen=True, slots=True)
class HawkesSocialPost:
    """Single timestamped social/beat post with author & embedding metadata."""

    post_id: str
    author_id: str
    t_hours: float
    mu_immigrant_rate: float
    state_label_idx: int  # 0..3 matching DAWID_SKENE_STATES
    embedding: tuple[float, ...]
    sharp_line_delta: float
    expected_claim_impact: float
    acct_age_days: float = 365.0
    is_credentialed_beat: bool = True
    is_critique_counter: bool = False
    has_social_parent_edge: bool = False
    critique_flaw_score: float = 0.0
    author_brier_rep: float = 1.0


@dataclass(frozen=True, slots=True)
class HawkesDawidSkeneResult:
    """Deduplicated, spoof-filtered, market-absorption-adjusted truth posterior."""

    n_posts_raw: int
    n_eff_hawkes: float
    p_imm: tuple[float, ...]
    a_mkt: tuple[float, ...]
    p_spoof: tuple[float, ...]
    state_posteriors: dict[str, float]
    map_state: str
    critique_damping_mult: float


def evaluate_cross_chapter_dag_gate(
    *,
    tau_scale_required: str,
    tau_query: str,
    n_obs_raw: float,
    n_min_required: float,
    x_values: Sequence[float],
    domain_bounds: Sequence[tuple[float, float]],
    ancestor_predicates: Sequence[bool],
    cluster_deff: float = DEFF_DRIVE_CLUSTER,
    games_played: int | None = None,
) -> DagExecutionVerdict:
    """Evaluate G_fire(e, X_t, tau_q) with DEFF-corrected effective sample size."""
    reasons: list[str] = []
    n_eff = float(n_obs_raw) / max(1.0, float(cluster_deff))

    if tau_scale_required != tau_query:
        reasons.append("SCALE_MISMATCH")
    if n_eff < float(n_min_required):
        reasons.append("INSUFFICIENT_N_EFF")
    if games_played is not None and games_played < NFL_EPA_MIN_GAMES:
        reasons.append("BELOW_NFL_EPA_MIN_GAMES")
    if len(x_values) != len(domain_bounds) or any(
        (not math.isfinite(float(x))) or float(x) < lo or float(x) > hi
        for x, (lo, hi) in zip(x_values, domain_bounds, strict=True)
    ):
        reasons.append("DOMAIN_OUT_OF_BOUNDS")
    if not all(bool(p) for p in ancestor_predicates):
        reasons.append("ANCESTOR_ASSUMPTION_FALSE")

    return DagExecutionVerdict(
        fire=len(reasons) == 0,
        n_eff=round(n_eff, 6),
        reasons=tuple(reasons),
    )


def verify_buckingham_pi_units(
    dim_columns: Sequence[Sequence[Fraction | int | float]],
    *,
    lhs_dim: Sequence[Fraction | int | float],
    rhs_dim: Sequence[Fraction | int | float],
    transcendental_arg_dims: Sequence[Sequence[Fraction | int | float]] = (),
) -> BuckinghamPiResult:
    """Verify exact 6D rational unit homogeneity & Buckingham Pi rank-nullity."""
    n_vars = len(dim_columns)
    if n_vars == 0:
        return BuckinghamPiResult(
            passed=False,
            rank=0,
            n_variables=0,
            nullity_pi_groups=0,
            quarantine_weight=0.0,
            reason="NO_VARIABLES",
        )
    mat = np.array([[float(Fraction(v)) for v in col] for col in dim_columns], dtype=np.float64).T
    if mat.shape[0] != 6:
        raise ValueError(f"Expected 6D unit basis [M,L,T,Theta,P,$], got {mat.shape[0]} rows.")

    rank = int(np.linalg.matrix_rank(mat, tol=1e-9))
    nullity = n_vars - rank

    lhs = [Fraction(v) for v in lhs_dim]
    rhs = [Fraction(v) for v in rhs_dim]
    if len(lhs) != 6 or len(rhs) != 6:
        raise ValueError("lhs_dim and rhs_dim must each have length 6.")
    if lhs != rhs:
        return BuckinghamPiResult(
            passed=False,
            rank=rank,
            n_variables=n_vars,
            nullity_pi_groups=nullity,
            quarantine_weight=0.0,
            reason="LHS_RHS_DIMENSION_MISMATCH",
        )

    for arg in transcendental_arg_dims:
        vec = [Fraction(v) for v in arg]
        if len(vec) != 6 or any(v != 0 for v in vec):
            return BuckinghamPiResult(
                passed=False,
                rank=rank,
                n_variables=n_vars,
                nullity_pi_groups=nullity,
                quarantine_weight=0.0,
                reason="TRANSCENDENTAL_ARG_NOT_DIMENSIONLESS",
            )

    return BuckinghamPiResult(
        passed=True,
        rank=rank,
        n_variables=n_vars,
        nullity_pi_groups=nullity,
        quarantine_weight=1.0,
        reason="DIMENSIONAL_HOMOGENEITY_VERIFIED",
    )


def apply_retraction_and_mde_meta_regression(
    studies: Sequence[MetaAnalysisStudy],
    *,
    lambda_prior: float = 4.0,
) -> PetPeesePoolResult:
    """Quarantine retracted works, apply 80% MDE Type-M filter & REML PET-PEESE pooling."""
    kept: list[tuple[float, float]] = []  # (g_m, v_m)
    quarantined: list[str] = []

    for st in studies:
        sid_low = st.study_id.strip().lower()
        if any(tag in sid_low for tag in QUARANTINED_METHODS_OR_DOIS):
            quarantined.append(st.study_id)
            continue
        if not (
            math.isfinite(st.theta_hat)
            and math.isfinite(st.se)
            and math.isfinite(st.pooled_sd)
            and st.se > 0.0
            and st.pooled_sd > 0.0
        ):
            quarantined.append(st.study_id)
            continue

        n_eff = float(st.n_raw) / max(1.0, float(st.df_cluster))
        nu = max(3.0, n_eff - float(st.n_params))
        j_corr = 1.0 - 3.0 / (4.0 * nu - 1.0)
        g_m = j_corr * (float(st.theta_hat) / float(st.pooled_sd))
        v_m = (j_corr * float(st.se) / float(st.pooled_sd)) ** 2

        # 80%-power MDE Type-M safeguard for low-N_eff studies
        se_g = math.sqrt(max(1e-9, v_m))
        mde_80 = 2.80 * se_g
        if n_eff < 50.0 and mde_80 > 0.25:
            # Cap precision at 10% (10x variance inflation) to suppress Type-M exaggeration
            v_m = v_m * 10.0

        kept.append((g_m, v_m))

    m_cnt = len(kept)
    if m_cnt == 0:
        return PetPeesePoolResult(
            g_pool=0.0,
            estimator_used="quarantined_empty",
            tau_sq=0.0,
            i_squared=0.0,
            retained_count=0,
            quarantined_ids=tuple(quarantined),
        )

    g_arr = np.array([k[0] for k in kept], dtype=np.float64)
    v_arr = np.array([k[1] for k in kept], dtype=np.float64)

    # DerSimonian-Laird / REML between-study variance tau^2 >= 0 (iterated 10 Paule-Mandel steps)
    tau_sq = 0.0
    if m_cnt >= 2:
        for _ in range(12):
            w = 1.0 / np.maximum(1e-9, v_arr + tau_sq)
            mu_re = float(np.sum(w * g_arr) / np.sum(w))
            q_stat = float(np.sum(w * ((g_arr - mu_re) ** 2)))
            c_denom = float(np.sum(w) - np.sum(w * w) / np.sum(w))
            tau_next = max(0.0, (q_stat - (m_cnt - 1)) / max(1e-9, c_denom))
            if abs(tau_next - tau_sq) < 1e-8:
                tau_sq = tau_next
                break
            tau_sq = 0.5 * (tau_sq + tau_next)

    v_bar = float(np.mean(v_arr))
    i_sq = tau_sq / max(1e-9, tau_sq + v_bar) if m_cnt >= 2 else 0.0
    w_star = 1.0 / np.maximum(1e-9, v_arr + tau_sq)

    if m_cnt < 5 or i_sq > 0.85:
        raw_g = float(np.sum(w_star * g_arr) / (np.sum(w_star) + float(lambda_prior)))
        used: Literal["reml_shrunk", "peese", "pet_shrunk"] = "reml_shrunk"
    else:
        w_diag = np.diag(w_star)
        x_pet = np.column_stack((np.ones(m_cnt), np.sqrt(v_arr)))
        xtwx_pet = x_pet.T @ w_diag @ x_pet + 1e-9 * np.eye(2)
        cov_pet = np.linalg.inv(xtwx_pet)
        beta_pet = cov_pet @ (x_pet.T @ w_diag @ g_arr)
        b0_pet = float(beta_pet[0])
        se_b0_pet = math.sqrt(max(1e-9, float(cov_pet[0, 0])))

        # Critical t_{0.90, df=m-2} approximation cleanly bounded for m >= 5
        t_crit = 1.35 + 1.2 / max(1.0, float(m_cnt - 2))
        if abs(b0_pet) / se_b0_pet > t_crit:
            x_peese = np.column_stack((np.ones(m_cnt), v_arr))
            xtwx_peese = x_peese.T @ w_diag @ x_peese + 1e-9 * np.eye(2)
            beta_peese = np.linalg.inv(xtwx_peese) @ (x_peese.T @ w_diag @ g_arr)
            raw_g = float(beta_peese[0])
            used = "peese"
        else:
            raw_g = math.copysign(max(0.0, abs(b0_pet) - se_b0_pet), b0_pet)
            used = "pet_shrunk"

    clamped_g = max(-1.20, min(1.20, raw_g))
    return PetPeesePoolResult(
        g_pool=round(clamped_g, 6),
        estimator_used=used,
        tau_sq=round(tau_sq, 6),
        i_squared=round(i_sq, 6),
        retained_count=m_cnt,
        quarantined_ids=tuple(quarantined),
    )


def _morlet_wavelet(length: int, scale: float) -> NDArray[np.complex128]:
    t = np.arange(length, dtype=np.float64) - 0.5 * (length - 1)
    norm_t = t / max(0.5, scale)
    gauss = np.exp(-0.5 * norm_t * norm_t)
    osc = np.cos(5.0 * norm_t) + 1j * np.sin(5.0 * norm_t)
    w = gauss * osc
    w_real = w.real - np.mean(w.real)
    w_imag = w.imag - np.mean(w.imag)
    denom_w = max(1e-9, float(np.sum(gauss)))
    return np.asarray((w_real + 1j * w_imag) / denom_w, dtype=np.complex128)


def compute_morlet_wavelet_scattering_intermittency(
    series: Sequence[float],
    *,
    position: Literal["WR", "RB", "TE"] = "WR",
    prior_strength_k: float = 48.0,
) -> WaveletScatteringResult:
    """Compute 1D Mallat Wavelet Scattering I_scat strictly routed to pi_exp (WS 1.3)."""
    pos_u = position.strip().upper()
    mu_pos = WAVELET_POS_PRIOR.get(pos_u, 0.24)
    vals = np.asarray([float(v) for v in series if math.isfinite(float(v))], dtype=np.float64)
    t_real = len(vals)
    if t_real < 4:
        return WaveletScatteringResult(
            i_scat=round(mu_pos, 6),
            raw_ratio=mu_pos,
            position=pos_u,
            series_len=t_real,
            allowed_targets=("pi_exp",),
            forbidden_targets=("spread_mu", "total_mu"),
        )

    centered = vals - float(np.mean(vals))
    pad_len = 64
    padded = np.pad(centered, (0, max(0, pad_len - t_real)), mode="reflect")[:pad_len]

    # Analytic Morlet J=3 octaves, Q1=4 -> 12 first-order scales; Q2=1 -> coarser J2 > j1
    scales_1 = [2.0 ** (1.0 + i / 4.0) for i in range(12)]
    n_idx = min(31, pad_len)
    t_ax = np.arange(n_idx, dtype=np.float64) - 0.5 * (n_idx - 1)
    phi_j = np.exp(-0.5 * (t_ax / 8.0) ** 2)
    phi_j /= float(np.sum(phi_j))

    s1_energy = 0.0
    s2_energy = 0.0
    u1_list: list[tuple[int, NDArray[np.float64]]] = []
    for idx1, sc1 in enumerate(scales_1):
        w1 = _morlet_wavelet(min(31, pad_len), sc1)
        conv1 = np.abs(np.convolve(padded, w1, mode="same"))
        s1_coef = np.convolve(conv1, phi_j, mode="same")
        s1_energy += float(np.sum(s1_coef))
        u1_list.append((idx1 // 4, conv1))

    scales_2 = [2.0**2.0, 2.0**3.0, 2.0**3.5]
    for oct2_idx, sc2 in enumerate(scales_2):
        w2 = _morlet_wavelet(min(31, pad_len), sc2)
        for oct1_idx, u1 in u1_list:
            if (oct2_idx + 1) <= oct1_idx:
                continue
            conv2 = np.abs(np.convolve(u1, w2, mode="same"))
            s2_coef = np.convolve(conv2, phi_j, mode="same")
            s2_energy += float(np.sum(s2_coef))

    raw_ratio = s2_energy / (s1_energy + 1e-8)
    w_emp = float(t_real) / (float(t_real) + float(prior_strength_k))
    shrunk = w_emp * raw_ratio + (1.0 - w_emp) * mu_pos
    i_scat = max(0.05, min(0.85, shrunk))
    return WaveletScatteringResult(
        i_scat=round(i_scat, 6),
        raw_ratio=round(raw_ratio, 6),
        position=pos_u,
        series_len=t_real,
        allowed_targets=("pi_exp",),
        forbidden_targets=("spread_mu", "total_mu"),
    )


def assert_zero_drift_vlm_chart_batch(
    *,
    metric_name: str,
    pass1_deplot: Sequence[Sequence[float]],
    pass2_vlm_json: Sequence[Sequence[float]],
    canonical_db_anchor: Sequence[float],
    ref_mu_0: float | None = None,
    ref_sigma_0: float | None = None,
    is_compositional_simplex: bool = False,
    ocr_has_pct_token: bool = True,
) -> VlmAssertionResult:
    """Enforce K18 dual-VLM agreement, W1/KS scale disambiguation, centering, simplex & polarity."""
    x1 = np.asarray(pass1_deplot, dtype=np.float64)
    x2 = np.asarray(pass2_vlm_json, dtype=np.float64)
    anchor = np.asarray(canonical_db_anchor, dtype=np.float64)
    if x1.ndim != 2 or x1.shape != x2.shape or x1.shape[0] != 32 or len(anchor) != 32:
        return VlmAssertionResult(
            accepted=False,
            scale_chosen=None,
            centering_mode="quarantine",
            d_ks=1.0,
            wasserstein_1=1.0,
            spearman_rho=0.0,
            max_simplex_drift=1.0,
            normalized_values=(),
            reason="SHAPE_OR_TEAM_COUNT_NOT_32",
        )

    max_diff = float(np.max(np.abs(x1 - x2) / np.maximum(1.0, np.abs(x1))))
    if max_diff > 0.01:
        return VlmAssertionResult(
            accepted=False,
            scale_chosen=None,
            centering_mode="quarantine",
            d_ks=1.0,
            wasserstein_1=1.0,
            spearman_rho=0.0,
            max_simplex_drift=0.0,
            normalized_values=(),
            reason="DUAL_VLM_CELL_DISAGREEMENT",
        )

    mu0, sig0 = CANONICAL_32TEAM_METRIC_PRIORS.get(
        metric_name,
        (float(ref_mu_0 if ref_mu_0 is not None else np.mean(anchor)), float(ref_sigma_0 or 0.05)),
    )
    if ref_mu_0 is not None:
        mu0 = float(ref_mu_0)
    if ref_sigma_0 is not None:
        sig0 = max(1e-4, float(ref_sigma_0))

    avg_mat = 0.5 * (x1 + x2)
    primary = avg_mat[:, 0]

    # Reference 32-quantile synthetic grid matching (mu0, sig0) clipped to [0,1] if rate
    u_q = (np.arange(32, dtype=np.float64) + 0.5) / 32.0
    rng_ref = np.sort(np.clip(mu0 + sig0 * np.sqrt(2.0) * np.array(
        [math.erf(q - 0.5) * 1.45 for q in u_q]
    ), 0.0, 1.0))
    # Sort anchor itself as empirical canonical reference when valid
    ref_sample = np.sort(anchor) if np.max(anchor) <= 1.0 and np.min(anchor) >= 0.0 else rng_ref

    def _w1_1d(a: NDArray[np.float64], b: NDArray[np.float64]) -> float:
        return float(np.mean(np.abs(np.sort(a) - np.sort(b))))

    # Check if centered delta or z-score vs uncentered raw level
    scale_chosen: int = 1
    d_ks_best = 1.0
    w1_best = 1.0

    # Test T_1(x)=x vs T_100(x)=x/100 against reference
    cand_1 = primary
    cand_100 = primary / 100.0
    c_mode: Literal["raw_uncentered", "league_centered", "z_score", "quarantine"] = "raw_uncentered"

    def _classify_center(vec: NDArray[np.float64]) -> Literal[
        "raw_uncentered", "league_centered", "z_score", "quarantine"
    ]:
        m_v = float(np.mean(vec))
        s_v = max(1e-6, float(np.std(vec, ddof=1)))
        se_32 = sig0 / math.sqrt(32.0)
        ratio = s_v / max(1e-6, sig0)
        if abs(m_v - mu0) <= 3.5 * se_32 and 0.40 <= ratio <= 2.20:
            return "raw_uncentered"
        if (
            abs(m_v) <= 0.025 * max(1.0, abs(mu0))
            and abs(mu0) > 4.0 * se_32
            and 0.40 <= ratio <= 2.20
        ):
            return "league_centered"
        if abs(m_v) <= 0.08 and 0.85 <= s_v <= 1.15 and not (0.75 <= sig0 <= 1.25):
            return "z_score"
        return "quarantine"

    mode_1 = _classify_center(cand_1)
    mode_100 = _classify_center(cand_100)

    def _to_canon(mat: NDArray[np.float64], sc: int, md: str) -> NDArray[np.float64]:
        v = mat / float(sc)
        if md == "league_centered":
            return v + mu0
        if md == "z_score":
            return mu0 + sig0 * v
        return v

    best_canon_mat = avg_mat
    evals: list[tuple[int, str, float, float, NDArray[np.float64]]] = []
    for sc, md in ((1, mode_1), (100, mode_100)):
        if md == "quarantine":
            continue
        can = _to_canon(avg_mat, sc, md)
        v_col = can[:, 0]
        if mu0 >= 0.015 and (float(np.min(v_col)) < -0.02 or float(np.max(v_col)) > 1.02):
            continue
        w1_val = _w1_1d(v_col, ref_sample)
        ks_cols: list[float] = []
        for col_idx in range(can.shape[1]):
            col_vals = can[:, col_idx]
            ks_r = ks_2samp(col_vals, ref_sample)
            ks_cols.append(float(getattr(ks_r, "statistic", ks_r[0])))
        d_ks_val = max(ks_cols) if ks_cols else 1.0
        evals.append((sc, md, w1_val, d_ks_val, can))

    if not evals:
        return VlmAssertionResult(
            accepted=False,
            scale_chosen=None,
            centering_mode="quarantine",
            d_ks=1.0,
            wasserstein_1=1.0,
            spearman_rho=0.0,
            max_simplex_drift=0.0,
            normalized_values=(),
            reason="FAILED_SCALE_OR_CENTERING_CLASSIFIER",
        )

    evals.sort(key=lambda t: (t[2], t[3]))
    scale_chosen, c_mode_str, w1_best, d_ks_best, best_canon_mat = evals[0]
    c_mode = c_mode_str  # type: ignore[assignment]

    if d_ks_best >= KS_ALPHA_001_CRIT_N32:
        return VlmAssertionResult(
            accepted=False,
            scale_chosen=scale_chosen,
            centering_mode="quarantine",
            d_ks=round(d_ks_best, 6),
            wasserstein_1=round(w1_best, 6),
            spearman_rho=0.0,
            max_simplex_drift=0.0,
            normalized_values=(),
            reason="D_KS_EXCEEDS_0_338",
        )

    if len(evals) >= 2:
        other_w1 = evals[1][2]
        if (w1_best / (other_w1 + 1e-9)) >= 0.10:
            return VlmAssertionResult(
                accepted=False,
                scale_chosen=scale_chosen,
                centering_mode="quarantine",
                d_ks=round(d_ks_best, 6),
                wasserstein_1=round(w1_best, 6),
                spearman_rho=0.0,
                max_simplex_drift=0.0,
                normalized_values=(),
                reason="AMBIGUOUS_W1_SCALE_RATIO",
            )
    elif mu0 < 0.015 and not ocr_has_pct_token:
        return VlmAssertionResult(
            accepted=False,
            scale_chosen=scale_chosen,
            centering_mode="quarantine",
            d_ks=round(d_ks_best, 6),
            wasserstein_1=round(w1_best, 6),
            spearman_rho=0.0,
            max_simplex_drift=0.0,
            normalized_values=(),
            reason="ULTRA_RARE_RATE_MISSING_OCR_PCT_TOKEN",
        )

    max_simplex_drift = 0.0
    if is_compositional_simplex and best_canon_mat.shape[1] >= 2:
        row_sums = np.sum(best_canon_mat, axis=1)
        max_simplex_drift = float(np.max(np.abs(row_sums - 1.0)))
        if max_simplex_drift > 0.020:
            return VlmAssertionResult(
                accepted=False,
                scale_chosen=scale_chosen,
                centering_mode="quarantine",
                d_ks=round(d_ks_best, 6),
                wasserstein_1=round(w1_best, 6),
                spearman_rho=0.0,
                max_simplex_drift=round(max_simplex_drift, 6),
                normalized_values=(),
                reason="SIMPLEX_DRIFT_EXCEEDS_0_020",
            )
        pos_mat = np.maximum(0.0, best_canon_mat)
        best_canon_mat = pos_mat / np.maximum(1e-9, np.sum(pos_mat, axis=1, keepdims=True))

    rho_res = spearmanr(best_canon_mat[:, 0], anchor)
    rho = float(getattr(rho_res, "statistic", rho_res[0]))
    if not math.isfinite(rho) or rho < 0.85:
        return VlmAssertionResult(
            accepted=False,
            scale_chosen=scale_chosen,
            centering_mode="quarantine",
            d_ks=round(d_ks_best, 6),
            wasserstein_1=round(w1_best, 6),
            spearman_rho=round(rho if math.isfinite(rho) else 0.0, 6),
            max_simplex_drift=round(max_simplex_drift, 6),
            normalized_values=(),
            reason="RANK_POLARITY_OR_SPEARMAN_BELOW_0_85",
        )

    return VlmAssertionResult(
        accepted=True,
        scale_chosen=scale_chosen,
        centering_mode=c_mode,
        d_ks=round(d_ks_best, 6),
        wasserstein_1=round(w1_best, 6),
        spearman_rho=round(rho, 6),
        max_simplex_drift=round(max_simplex_drift, 6),
        normalized_values=tuple(tuple(round(float(v), 6) for v in row) for row in best_canon_mat),
        reason="VLM_ZERO_DRIFT_VERIFIED",
    )


def deflate_cherry_pick_z_and_exposure(
    z_obs: float,
    n_obs: float,
    active_filter_cardinalities: Sequence[int] = (),
    *,
    slice_overlap_corr: float = 0.45,
    lambda_psi: float = 0.85,
) -> tuple[float, float, float]:
    """Deflate cherry-picked z-scores via Romano-Wolf / Extreme-Value PSI guard (K19)."""
    m_search = 1
    for c_f in active_filter_cardinalities:
        m_search *= max(1, int(c_f))
    if m_search <= 1:
        return float(z_obs), float(n_obs), 1.0
    m_eff = 1.0 + float(m_search - 1) * (1.0 - float(slice_overlap_corr))
    penalty = float(lambda_psi) * math.sqrt(2.0 * math.log(max(1.0, m_eff)))
    z_defl = math.copysign(max(0.0, abs(float(z_obs)) - penalty), float(z_obs))
    n_eff = float(n_obs) / (1.0 + math.log(max(1.0, m_eff)))
    return z_defl, n_eff, m_eff


def beta_binomial_conjugate_rate(
    y_eff: float,
    n_eff: float,
    *,
    metric_key: str = "light_box_6_or_fewer_pct_ftn",
    kappa_override: float | None = None,
) -> tuple[float, float]:
    """Compute Beta-Binomial conjugate rate & posterior variance (strict box split)."""
    defaults = {
        "light_box_6_or_fewer_pct_ftn": (0.0853, 65.0),
        "non_stacked_box_under7_pct_ngs": (0.5150, 65.0),
        "first_read_pct_ftn": (0.6260, 85.0),
    }
    mu0, kap_default = defaults.get(metric_key, (0.128, 65.0))
    kappa = float(kappa_override if kappa_override is not None else kap_default)
    denom = max(1e-6, float(n_eff) + kappa)
    p_bb = max(0.001, min(0.999, (float(y_eff) + kappa * mu0) / denom))
    var_bb = p_bb * (1.0 - p_bb) / (denom + 1.0)
    return p_bb, var_bb


def dirichlet_multinomial_shell_posterior(
    shell_counts: Sequence[float],
    *,
    prior_simplex: Sequence[float] = DEFAULT_COVER_SHELL_PRIOR_6,
    kappa_shell: float = 90.0,
) -> tuple[float, ...]:
    """Shrink 6-shell coverage counts toward league base simplex (sum == 1.0)."""
    if len(shell_counts) != len(prior_simplex):
        raise ValueError("shell_counts and prior_simplex lengths must match.")
    n_tot = sum(max(0.0, float(y)) for y in shell_counts)
    p_sum = sum(max(0.0, float(p)) for p in prior_simplex) or 1.0
    denom = n_tot + float(kappa_shell)
    raw = [
        (max(0.0, float(y)) + float(kappa_shell) * (max(0.0, float(pi0)) / p_sum)) / denom
        for y, pi0 in zip(shell_counts, prior_simplex, strict=True)
    ]
    tot = sum(raw) or 1.0
    return tuple(v / tot for v in raw)


def morris_james_stein_plus_shrinkage(
    y_sos_adj: Sequence[float],
    exposures_n: Sequence[float],
    *,
    sigma_within: float = 0.85,
    tau_between: float = 0.35,
    clamp_bounds: tuple[float, float] = (0.35, 3.60),
) -> tuple[list[float], list[float]]:
    """Unequal-variance Positive-Part Morris-James-Stein shrinkage over K >= 4 players (K19)."""
    k_cnt = len(y_sos_adj)
    if k_cnt != len(exposures_n) or k_cnt == 0:
        raise ValueError("y_sos_adj and exposures_n must have matching non-zero length.")
    ys = [float(y) for y in y_sos_adj]
    ns = [max(1.0, float(n)) for n in exposures_n]
    tau2 = max(1e-6, float(tau_between) ** 2)
    vs = [(float(sigma_within) ** 2) / n for n in ns]
    inv_vars = [1.0 / (v + tau2) for v in vs]
    mu_group = sum(y * w for y, w in zip(ys, inv_vars, strict=True)) / sum(inv_vars)

    factor = max(0.0, float(k_cnt - 3)) / float(k_cnt) if k_cnt >= 4 else 0.0
    b_list: list[float] = []
    shrunk_list: list[float] = []
    lo_b, hi_b = clamp_bounds
    for y_i, v_i in zip(ys, vs, strict=True):
        b_i = max(0.0, 1.0 - factor * (v_i / (v_i + tau2))) if k_cnt >= 4 else (
            tau2 / (v_i + tau2)
        )
        b_i = min(0.95, b_i)
        est = mu_group + b_i * (y_i - mu_group)
        b_list.append(b_i)
        shrunk_list.append(max(lo_b, min(hi_b, est)))
    return shrunk_list, b_list


def evaluate_hawkes_dawid_skene_provenance(
    posts: Sequence[HawkesSocialPost],
    *,
    t_eval_hours: float,
    prior_state_probs: Sequence[float] = (0.70, 0.14, 0.08, 0.08),
    hawkes_alpha: float = 0.85,
    hawkes_half_life_min: float = 15.0,
    mkt_half_life_min: float = 25.0,
) -> HawkesDawidSkeneResult:
    """Apply K17 social-only Hawkes echo collapse, Spoof guard, A_mkt & Dawid-Skene."""
    n_posts = len(posts)
    pri = np.asarray(prior_state_probs, dtype=np.float64)
    pri = np.maximum(1e-6, pri)
    pri /= np.sum(pri)
    base_map = {s: round(float(pri[i]), 6) for i, s in enumerate(DAWID_SKENE_STATES)}
    if n_posts == 0:
        best_s = DAWID_SKENE_STATES[int(np.argmax(pri))]
        return HawkesDawidSkeneResult(
            n_posts_raw=0,
            n_eff_hawkes=0.0,
            p_imm=(),
            a_mkt=(),
            p_spoof=(),
            state_posteriors=base_map,
            map_state=best_s,
            critique_damping_mult=1.0,
        )

    ordered = sorted(posts, key=lambda p: p.t_hours)
    beta_s_hr = math.log(2.0) / max(1e-3, hawkes_half_life_min / 60.0)
    kappa_abs_hr = math.log(2.0) / max(1e-3, mkt_half_life_min / 60.0)

    def _cos_sim(e1: Sequence[float], e2: Sequence[float]) -> float:
        a = np.asarray(e1, dtype=np.float64)
        b = np.asarray(e2, dtype=np.float64)
        if len(a) == 0 or len(a) != len(b):
            return 1.0
        na = float(np.linalg.norm(a))
        nb = float(np.linalg.norm(b))
        if na < 1e-9 or nb < 1e-9:
            return 1.0
        return max(0.0, float(np.dot(a, b) / (na * nb)))

    # Cluster inter-arrival CV to detect coordinated spoof bursts
    dts = [
        max(1e-4, ordered[i].t_hours - ordered[i - 1].t_hours) for i in range(1, n_posts)
    ]
    cv_dt = (
        float(np.std(dts) / max(1e-4, float(np.mean(dts)))) if len(dts) >= 2 else 1.0
    )

    p_imm_list: list[float] = []
    a_mkt_list: list[float] = []
    p_spoof_list: list[float] = []
    critique_sum = 0.0

    # Dominant-diagonal Dirichlet confusion matrix Pi^(a) prior: ones + 3*I_4
    k_states = 4
    base_conf = np.ones((k_states, k_states), dtype=np.float64) + 3.0 * np.eye(
        k_states, dtype=np.float64
    )
    base_conf /= base_conf.sum(axis=1, keepdims=True)
    log_post = np.log(pri)

    unique_authors = len({p.author_id for p in ordered})
    for i, post_i in enumerate(ordered):
        mu_i = max(1e-5, float(post_i.mu_immigrant_rate))
        excite = 0.0
        for j in range(i):
            post_j = ordered[j]
            dt_ij = max(0.0, post_i.t_hours - post_j.t_hours)
            sim = _cos_sim(post_i.embedding, post_j.embedding)
            edge_w = 1.0 if post_i.has_social_parent_edge else 0.65
            excite += float(hawkes_alpha) * beta_s_hr * math.exp(-beta_s_hr * dt_ij) * sim * edge_w
        p_imm_i = max(1e-4, min(1.0, mu_i / (mu_i + excite)))
        p_imm_list.append(p_imm_i)

        # Syndicate spoof probability
        uncorr_steam = (
            1.0
            if (abs(post_i.expected_claim_impact) > 0.05 and abs(post_i.sharp_line_delta) < 0.005)
            else 0.0
        )
        logit_sp = (
            -2.4
            + 1.6 * (1.0 if post_i.acct_age_days < 90.0 else 0.0)
            + 0.4 * min(5.0, 1.0 / (cv_dt + 0.05))
            + 1.2 * uncorr_steam
            - (1.2 if post_i.is_credentialed_beat else 0.0)
        )
        p_sp_i = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, logit_sp))))
        p_spoof_list.append(p_sp_i)

        if post_i.is_critique_counter:
            crit_rep = max(0.05, post_i.author_brier_rep)
            critique_sum += crit_rep * max(0.0, post_i.critique_flaw_score)

        dt_eval = max(0.0, float(t_eval_hours) - post_i.t_hours)
        exp_imp = float(post_i.expected_claim_impact)
        priced_frac = max(
            0.0,
            min(
                1.0,
                (float(post_i.sharp_line_delta) * exp_imp) / (exp_imp * exp_imp + 1e-6),
            ),
        )
        a_mkt_i = math.exp(-kappa_abs_hr * dt_eval) * (1.0 - priced_frac)
        a_mkt_i = max(0.0, min(1.0, a_mkt_i))
        a_mkt_list.append(a_mkt_i)

        eff_w = p_imm_i * a_mkt_i * (1.0 - p_sp_i) * max(0.05, min(2.5, post_i.author_brier_rep))
        s_idx = max(0, min(k_states - 1, int(post_i.state_label_idx)))
        log_post += eff_w * np.log(base_conf[:, s_idx])

    crit_mult = math.exp(-1.50 * critique_sum)
    log_post -= float(np.max(log_post))
    post_probs = np.exp(log_post)
    post_probs /= np.sum(post_probs)
    best_idx = int(np.argmax(post_probs))
    state_map = {s: round(float(post_probs[i]), 6) for i, s in enumerate(DAWID_SKENE_STATES)}
    return HawkesDawidSkeneResult(
        n_posts_raw=n_posts,
        n_eff_hawkes=round(min(float(unique_authors), sum(p_imm_list)), 6),
        p_imm=tuple(round(v, 6) for v in p_imm_list),
        a_mkt=tuple(round(v, 6) for v in a_mkt_list),
        p_spoof=tuple(round(v, 6) for v in p_spoof_list),
        state_posteriors=state_map,
        map_state=DAWID_SKENE_STATES[best_idx],
        critique_damping_mult=round(crit_mult, 6),
    )
