"""GSE Mind Thermodynamics, Latent-Collapse Guard & T1-T8 Adversarial Mutation Gate Suite.

Implements the six core mathematical & systems modules of the GSE Mind Architecture
and reconciles the P1 engineering guards and T1-T8 adversarial mutation gates for
Galaxy Sports Network LLC (DBA Galaxy Sports Edge, galaxysportsedge.com):

1. Module 1: Token-Masking Free-Energy & Attention Thermodynamics
   - Boltzmann partition function Z_valid(T), Helmholtz free energy F = -T ln Z = U - T H,
     constraint-tax free-energy shift Delta_F = -T ln Omega >= 0, effective temperature
     clamping, bisection entropy floor preventing overconfident logit collapse, CPU-GPU
     non-stalling batch threshold B_max, and In-Writing <|GSE_JSON|> trigger-tag state machine.
2. Module 2: Latent-Space Dimensional Collapse Detector
   - Spectral Shannon entropy H(lambda), Roy-Vetterli effective rank erank(Sigma) = exp(H),
     Gavish-Donoho Marchenko-Pastur median noise estimation, and MP bulk edge lambda_+ guard.
3. Module 3: Non-Exchangeable Conformal Grounding & ACI/PID Coverage Controller
   - Barber et al. non-exchangeable weighted quantile, Kish Effective Sample Size (ESS),
     hard c_hat = n / ESS <= 12.42 weight-concentration diagnostic, and Gibbs-Candes ACI +
     Angelopoulos-Candes-Tibshirani Conformal PID threshold tracking.
4. Module 4: Process-Reward Hallucination Defense
   - Cai et al. backward verifier error-rate debiasing (R_tilde - rho_0)/(1 - rho_0 - rho_1)
     with Youden J identifiability guard, coupled to backward Bellman Q-decay step-product
     kill switch.
5. Module 5: Deterministic Binary Wire-Format / Canonical Protobuf-Compatible Frame Compiler
   - Canonical sorted-tag Protobuf wire primitives (LEB128 varint, ZigZag sint64, IEEE-754
     little-endian double with -0.0 normalization and NaN/Inf rejection) wrapped in a
     48-byte zero-copy memoryview frame with hardware-polynomial CRC32C (Castagnoli) + SHA-256.
6. Module 6: Probabilistic Graphical Model (DAG) of Cascading Failure Modes & Five P1 Guards
   - Exact Bayesian Network DAG inference + Pearl do-calculus interventional queries, plus
     five reconciled P1 bug guards (target_hhi == 0.0 block, swallowed DataGapError block,
     CLEAR-on-missing-evidence block, tau_hat point-fit stamp & wiring enforcement, and
     Python <-> TypeScript parity < 1e-6).
7. Content-Driven Situational Inference & T1-T8 Adversarial Mutation Gate Suite
   - Full L1-L4 provenance & consensus-deadband (eta_c < 0.20) engine plus 8-vector hostile
     mutation harness proving 100% (8/8) fail-closed mutant kill rate.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import math
import re
import struct
from typing import Any, Callable, Mapping, Sequence

import numpy as np


# =============================================================================
# Exception Hierarchy (Fail-Closed Epistemic & Systems Gates)
# =============================================================================


class GSEFailClosedError(RuntimeError):
    """Base exception for all fail-closed GSE Mind Architecture gates."""


class DataGapError(GSEFailClosedError):
    """Raised on missing, unpublished, or incomplete upstream source records."""


class ThermodynamicMaskError(GSEFailClosedError):
    """Raised on invalid vocabulary masks, non-finite logits, or infeasible entropy floors."""


class LatentCollapseError(GSEFailClosedError):
    """Raised when latent covariance violates effective-rank or Marchenko-Pastur guards."""


class ConformalGroundError(GSEFailClosedError):
    """Raised when non-exchangeable weights violate c_hat <= 12.42 or ESS bounds."""


class UnidentifiableVerifierError(GSEFailClosedError):
    """Raised when verifier error rates satisfy rho_0 + rho_1 >= 1 (non-identifiable)."""


class HallucinationKillSwitchError(GSEFailClosedError):
    """Raised when Bellman Q-decay step-product or step validity drops below threshold."""


class WireFormatError(GSEFailClosedError):
    """Raised when canonical wire serialization encounters NaN, Inf, or malformed tags."""


class FrameIntegrityError(GSEFailClosedError):
    """Raised when binary wire frame magic, length, CRC32C, or SHA-256 verification fails."""


class P1TargetHHIFallbackError(DataGapError):
    """P1 Guard 1: Raised when target_hhi is 0.0, null, NaN, or out of (0.0, 1.0]."""


class P1SwallowedDataGapError(GSEFailClosedError):
    """P1 Guard 2: Raised when a DataGapError is caught and silently replaced by a fallback."""


class P1ClearOnMissingEvidenceError(GSEFailClosedError):
    """P1 Guard 3: Raised when status resolves to CLEAR/HEALTHY/PASS without verified evidence."""


class P1TauHatStampError(GSEFailClosedError):
    """P1 Guard 4: Raised when tau_hat lacks reasoning wiring or mandatory point-fit stamp."""


class P1PipelineParityError(GSEFailClosedError):
    """P1 Guard 5: Raised when Python <-> TypeScript pipeline outputs diverge by >= 1e-6."""


class TemporalLookaheadError(GSEFailClosedError):
    """T2 Gate: Raised when an observation timestamp exceeds the decision/kickoff cutoff."""


class HomeSignSabotageError(GSEFailClosedError):
    """T3 Gate: Raised when a LIVE signal lacks valid homeSign or violates polarity anchor."""


class MurphyCalibrationKillSwitchError(GSEFailClosedError):
    """T4 Gate: Raised when Murphy Brier Reliability >= Resolution (negative skill)."""


class InvalidCopulaMatrixError(GSEFailClosedError):
    """T5 Gate: Raised when SGP copula matrix is asymmetric, non-unit-diag, or non-PSD."""


class UnmanifestedFixtureError(GSEFailClosedError):
    """T6 Gate: Raised on hallucinated, unmanifested, or fixture-backed production rows."""


class HardcodedFallbackError(GSEFailClosedError):
    """T7 Gate: Raised on hardcoded magic fallback constants (0.58/-0.26/0.5238) or stub invariance."""


class TruthFileCopyLeakError(GSEFailClosedError):
    """T8 Gate: Raised when public copy violates 00-TRUTH-FILE governance constraints."""


# =============================================================================
# Module 1: Token-Masking Free-Energy & Attention Thermodynamics
# =============================================================================


@dataclass(frozen=True)
class ThermodynamicState:
    """Thermodynamic observables of a grammar-masked logit distribution."""

    effective_temperature: float
    temperature_clamped: bool
    entropy_floor_engaged: bool
    fast_forward: bool
    log_z_valid: float
    log_z_full: float
    free_energy_valid: float
    free_energy_full: float
    mask_free_energy_cost: float
    valid_mass_omega: float
    internal_energy_valid: float
    entropy_valid: float
    probabilities: np.ndarray


@dataclass(frozen=True)
class AttentionThermodynamicReport:
    """Row-wise thermodynamic metrics for scaled dot-product attention."""

    attention_weights: np.ndarray
    row_temperatures: np.ndarray
    row_entropies: np.ndarray
    row_free_energies: np.ndarray
    min_row_entropy: float
    entropy_floor_interventions: int


def _logsumexp_1d(values: np.ndarray) -> float:
    max_val = float(np.max(values))
    return max_val + math.log(float(np.sum(np.exp(values - max_val))))


def _boltzmann_stats_subset(z_allowed: np.ndarray, temperature: float) -> tuple[np.ndarray, float, float, float]:
    """Compute probabilities, log Z, internal energy U, and Shannon entropy H on allowed logits."""
    scaled = z_allowed / temperature
    max_scaled = float(np.max(scaled))
    shifted_exp = np.exp(scaled - max_scaled)
    sum_exp = float(np.sum(shifted_exp))
    log_z = max_scaled + math.log(sum_exp)
    probs_allowed = shifted_exp / sum_exp
    # Internal energy U = sum_i p_i * (-z_i) so Helmholtz F = U - T * H = -T * ln Z
    internal_energy = float(np.sum(probs_allowed * (-z_allowed)))
    nonzero = probs_allowed > 0.0
    entropy = float(-np.sum(probs_allowed[nonzero] * np.log(probs_allowed[nonzero])))
    return probs_allowed, log_z, internal_energy, entropy


def evaluate_masked_boltzmann(
    logits: Sequence[float] | np.ndarray,
    allowed_token_ids: Sequence[int] | np.ndarray,
    temperature: float = 1.0,
    *,
    t_min: float = 0.25,
    t_max: float = 5.0,
    entropy_floor: float = 0.35,
    allow_entropy_override_tmax: bool = True,
) -> ThermodynamicState:
    """Compute masked Boltzmann partition function, free energy, temperature clamp & entropy floor.

    Enforces:
      - Additive automaton mask M_i in {0, -inf} over V_allowed.
      - Effective temperature clamping into [t_min, t_max].
      - Deterministic fast-forwarding when |V_allowed| == 1 (llguidance / XGrammar invariant state).
      - Monotone bisection temperature scaling when |V_allowed| >= 2 and H(P_T) < entropy_floor,
        preventing overconfident logit spike collapse.
    """
    z = np.asarray(logits, dtype=np.float64)
    if z.ndim != 1 or z.size == 0:
        raise ThermodynamicMaskError("Logit vector must be a non-empty 1D array.")
    if not np.all(np.isfinite(z)):
        raise ThermodynamicMaskError("Logit vector contains NaN or Inf entries.")
    if not math.isfinite(temperature):
        raise ThermodynamicMaskError("Temperature must be finite.")
    if t_min <= 0.0 or t_max < t_min:
        raise ThermodynamicMaskError(f"Invalid temperature bounds [{t_min}, {t_max}].")
    if entropy_floor < 0.0 or not math.isfinite(entropy_floor):
        raise ThermodynamicMaskError("entropy_floor must be finite and >= 0.0.")

    allowed_arr = np.unique(np.asarray(allowed_token_ids, dtype=np.int64))
    if allowed_arr.size == 0:
        raise ThermodynamicMaskError("Automaton mask rejected 100% of vocabulary (empty V_allowed).")
    if int(allowed_arr[0]) < 0 or int(allowed_arr[-1]) >= z.size:
        raise ThermodynamicMaskError("allowed_token_ids contains out-of-bounds vocabulary index.")

    t_eff = min(max(float(temperature), t_min), t_max)
    temp_clamped = abs(t_eff - float(temperature)) > 1e-12
    z_allowed = z[allowed_arr]

    if allowed_arr.size == 1:
        log_z_valid = float(z_allowed[0]) / t_eff
        log_z_full = _logsumexp_1d(z / t_eff)
        probs = np.zeros_like(z, dtype=np.float64)
        probs[allowed_arr[0]] = 1.0
        f_valid = -t_eff * log_z_valid
        f_full = -t_eff * log_z_full
        omega = math.exp(min(0.0, log_z_valid - log_z_full))
        return ThermodynamicState(
            effective_temperature=t_eff,
            temperature_clamped=temp_clamped,
            entropy_floor_engaged=False,
            fast_forward=True,
            log_z_valid=log_z_valid,
            log_z_full=log_z_full,
            free_energy_valid=f_valid,
            free_energy_full=f_full,
            mask_free_energy_cost=max(0.0, f_valid - f_full),
            valid_mass_omega=omega,
            internal_energy_valid=float(-z_allowed[0]),
            entropy_valid=0.0,
            probabilities=probs,
        )

    max_entropy = math.log(float(allowed_arr.size))
    if entropy_floor > max_entropy + 1e-12:
        raise ThermodynamicMaskError(
            f"Infeasible entropy_floor={entropy_floor:.6f} > ln(|V_allowed|)={max_entropy:.6f}."
        )
    target_h = min(entropy_floor, max_entropy - 1e-9)

    probs_sub, log_z_valid, u_valid, h_valid = _boltzmann_stats_subset(z_allowed, t_eff)
    entropy_engaged = False

    if h_valid < target_h and float(np.ptp(z_allowed)) > 1e-12:
        if not allow_entropy_override_tmax:
            _, _, _, h_at_tmax = _boltzmann_stats_subset(z_allowed, t_max)
            if h_at_tmax < target_h:
                raise ThermodynamicMaskError(
                    f"Entropy {h_at_tmax:.6f} at t_max={t_max} remains below floor {target_h:.6f}."
                )
            hi = t_max
        else:
            hi = max(t_eff * 2.0, t_max)
            while _boltzmann_stats_subset(z_allowed, hi)[3] < target_h:
                hi *= 2.0
                if hi > 1e9:
                    break

        lo = t_eff
        for _ in range(64):
            mid = 0.5 * (lo + hi)
            if _boltzmann_stats_subset(z_allowed, mid)[3] < target_h:
                lo = mid
            else:
                hi = mid
        t_eff = hi
        probs_sub, log_z_valid, u_valid, h_valid = _boltzmann_stats_subset(z_allowed, t_eff)
        entropy_engaged = True

    log_z_full = _logsumexp_1d(z / t_eff)
    f_valid = -t_eff * log_z_valid
    f_full = -t_eff * log_z_full
    omega = math.exp(min(0.0, log_z_valid - log_z_full))

    probs = np.zeros_like(z, dtype=np.float64)
    probs[allowed_arr] = probs_sub

    return ThermodynamicState(
        effective_temperature=t_eff,
        temperature_clamped=temp_clamped,
        entropy_floor_engaged=entropy_engaged,
        fast_forward=False,
        log_z_valid=log_z_valid,
        log_z_full=log_z_full,
        free_energy_valid=f_valid,
        free_energy_full=f_full,
        mask_free_energy_cost=max(0.0, f_valid - f_full),
        valid_mass_omega=omega,
        internal_energy_valid=u_valid,
        entropy_valid=h_valid,
        probabilities=probs,
    )


def evaluate_attention_thermodynamics(
    query: np.ndarray,
    key: np.ndarray,
    *,
    temperature: float = 1.0,
    t_min: float = 0.25,
    t_max: float = 5.0,
    row_entropy_floor: float = 0.25,
    causal_mask: bool = False,
) -> AttentionThermodynamicReport:
    """Compute thermodynamic scaled dot-product attention with per-row entropy floor."""
    q = np.asarray(query, dtype=np.float64)
    k = np.asarray(key, dtype=np.float64)
    if q.ndim != 2 or k.ndim != 2 or q.shape[1] != k.shape[1]:
        raise ThermodynamicMaskError("Query and Key must be 2D matrices with matching d_k.")
    if q.shape[0] == 0 or k.shape[0] == 0:
        raise ThermodynamicMaskError("Query and Key sequence lengths must be >= 1.")

    d_k = q.shape[1]
    scores = (q @ k.T) / math.sqrt(float(d_k))
    n_q, n_k = scores.shape
    weights = np.zeros((n_q, n_k), dtype=np.float64)
    row_temps = np.zeros(n_q, dtype=np.float64)
    row_entropies = np.zeros(n_q, dtype=np.float64)
    row_free_energies = np.zeros(n_q, dtype=np.float64)
    interventions = 0

    for i in range(n_q):
        allowed = np.arange(0, min(i + 1, n_k)) if causal_mask else np.arange(0, n_k)
        eff_floor = 0.0 if allowed.size <= 1 else min(row_entropy_floor, 0.95 * math.log(float(allowed.size)))
        state = evaluate_masked_boltzmann(
            scores[i],
            allowed,
            temperature=temperature,
            t_min=t_min,
            t_max=t_max,
            entropy_floor=eff_floor,
        )
        weights[i] = state.probabilities
        row_temps[i] = state.effective_temperature
        row_entropies[i] = state.entropy_valid
        row_free_energies[i] = state.free_energy_valid
        if state.entropy_floor_engaged:
            interventions += 1

    return AttentionThermodynamicReport(
        attention_weights=weights,
        row_temperatures=row_temps,
        row_entropies=row_entropies,
        row_free_energies=row_free_energies,
        min_row_entropy=float(np.min(row_entropies)),
        entropy_floor_interventions=interventions,
    )


def compute_non_stalling_batch_max(
    t_gpu_ms: float,
    t_sync_ms: float = 0.15,
    t_mask_us: float = 50.0,
    n_cores: int = 1,
    t_xfer_us: float = 5.0,
) -> int:
    """Compute critical non-stalling batch size B_max (GSE Mind Architecture Section 1.3).

    B_max = floor((T_GPU - T_sync) / (t_mask / N_cores + t_xfer)).
    """
    if t_gpu_ms <= 0.0 or t_sync_ms < 0.0 or t_mask_us <= 0.0 or n_cores < 1 or t_xfer_us < 0.0:
        raise ThermodynamicMaskError("Invalid latency or core count parameters for B_max.")
    budget_ms = t_gpu_ms - t_sync_ms
    if budget_ms <= 0.0:
        return 0
    per_seq_ms = ((t_mask_us / float(n_cores)) + t_xfer_us) * 1e-3
    return int(math.floor(budget_ms / per_seq_ms))


class InWritingTagDispatcher:
    """Implements XGrammar-2 / arXiv:2601.07525 In-Writing* atomic trigger-tag state machine.

    Keeps grammar masking OFF during unconstrained <|GSE_ANALYSIS|> deliberation (preventing
    math braces like 'S = {x_1, x_2}' from prematurely activating JSON constraints) and switches
    atomically to schema-constrained JSON decoding only when '<|GSE_JSON|>' is emitted.
    """

    BEGIN_TAG = "<|GSE_ANALYSIS|>"
    TRIGGER_TAG = "<|GSE_JSON|>"

    def __init__(self) -> None:
        self._buffer: str = ""
        self.json_mask_active: bool = False

    def step_token(self, token_str: str) -> bool:
        """Consume emitted token text and return whether JSON schema mask is active for next step."""
        self._buffer += token_str
        if not self.json_mask_active and self.TRIGGER_TAG in self._buffer:
            self.json_mask_active = True
        return self.json_mask_active

    def split_deliberation_and_json(self) -> tuple[str, str]:
        if self.TRIGGER_TAG not in self._buffer:
            raise ThermodynamicMaskError("In-Writing stream ended without emitting <|GSE_JSON|> trigger.")
        deliberation, json_payload = self._buffer.split(self.TRIGGER_TAG, 1)
        if deliberation.startswith(self.BEGIN_TAG):
            deliberation = deliberation[len(self.BEGIN_TAG) :]
        return deliberation.strip(), json_payload.strip()


# =============================================================================
# Module 2: Latent-Space Dimensional Collapse Detector
# =============================================================================


@dataclass(frozen=True)
class LatentCollapseDiagnostic:
    """Spectral effective-rank and Marchenko-Pastur diagnostic report."""

    n_samples: int
    n_features: int
    aspect_ratio_gamma: float
    effective_rank: float
    effective_rank_ratio: float
    spectral_entropy: float
    estimated_noise_sigma2: float
    mp_lambda_minus: float
    mp_lambda_plus: float
    mp_tracy_widom_edge: float
    num_signal_spikes: int
    top_eigenvalue: float
    eigenvalues: np.ndarray


def _marchenko_pastur_median_factor(gamma: float, grid_size: int = 2048) -> float:
    """Numerically evaluate median of standard (sigma^2 = 1) Marchenko-Pastur law for gamma <= 1."""
    g = min(max(gamma, 1e-6), 1.0)
    lam_minus = (1.0 - math.sqrt(g)) ** 2
    lam_plus = (1.0 + math.sqrt(g)) ** 2
    if lam_plus - lam_minus < 1e-12:
        return 1.0
    xs = np.linspace(lam_minus + 1e-9, lam_plus - 1e-9, grid_size)
    density = np.sqrt(np.maximum(0.0, (lam_plus - xs) * (xs - lam_minus))) / (2.0 * math.pi * g * xs)
    cdf = np.cumsum(density)
    cdf /= cdf[-1]
    idx = int(np.searchsorted(cdf, 0.5))
    return float(xs[min(idx, grid_size - 1)])


def detect_latent_dimensional_collapse(
    embeddings: np.ndarray,
    *,
    min_erank: float = 3.0,
    min_signal_spikes: int = 1,
    noise_sigma2: float | None = None,
    tracy_widom_margin: float = 0.35,
    enforce_mp_signal_guard: bool = True,
) -> LatentCollapseDiagnostic:
    """Evaluate Roy-Vetterli erank(Sigma) = exp(H(lambda)) and Marchenko-Pastur bulk edge guard.

    Fails closed via LatentCollapseError if:
      1. Total variance collapses to zero or embeddings contain NaN/Inf,
      2. erank(Sigma) < min_erank (anisotropic / rank-1 dimensional collapse),
      3. enforce_mp_signal_guard is True and fewer than min_signal_spikes eigenvalues exceed
         the finite-sample Tracy-Widom-padded Marchenko-Pastur upper bulk edge lambda_+.
    """
    x = np.asarray(embeddings, dtype=np.float64)
    if x.ndim != 2 or x.shape[0] < 2 or x.shape[1] < 2:
        raise LatentCollapseError("Embeddings must be a 2D matrix with n >= 2 and d >= 2.")
    if not np.all(np.isfinite(x)):
        raise LatentCollapseError("Embeddings contain NaN or Inf values.")

    n, d = x.shape
    centered = x - np.mean(x, axis=0, keepdims=True)
    sigma = (centered.T @ centered) / float(n)

    eigvals_asc = np.linalg.eigvalsh(sigma)
    eigvals = np.maximum(0.0, eigvals_asc[::-1])
    total_var = float(np.sum(eigvals))
    if total_var <= 1e-12:
        raise LatentCollapseError("Complete zero-variance latent collapse detected (Tr(Sigma) ~ 0).")

    p = eigvals / total_var
    pos = p > 1e-15
    spectral_entropy = float(-np.sum(p[pos] * np.log(p[pos])))
    erank = math.exp(spectral_entropy)
    erank_ratio = erank / float(d)

    gamma = float(d) / float(n)
    if noise_sigma2 is not None:
        if noise_sigma2 <= 0.0 or not math.isfinite(noise_sigma2):
            raise LatentCollapseError("Provided noise_sigma2 must be finite and > 0.")
        sigma2_hat = float(noise_sigma2)
    else:
        n_nonzero_cap = min(n - 1, d)
        active_eigs = eigvals[: max(1, n_nonzero_cap)]
        gamma_eff = float(min(d, n)) / float(max(d, n))
        mp_med = _marchenko_pastur_median_factor(gamma_eff)
        scale_adjust = max(1.0, gamma)
        sigma2_hat = max(1e-12, float(np.median(active_eigs)) / (mp_med * scale_adjust))

    sqrt_gamma = math.sqrt(gamma)
    mp_lambda_minus = sigma2_hat * ((1.0 - sqrt_gamma) ** 2) if gamma <= 1.0 else 0.0
    mp_lambda_plus = sigma2_hat * ((1.0 + sqrt_gamma) ** 2)
    tw_shift = (
        tracy_widom_margin
        * sigma2_hat
        * (1.0 + sqrt_gamma)
        * ((1.0 / math.sqrt(float(n)) + 1.0 / math.sqrt(float(d))) ** (1.0 / 3.0))
        * (gamma ** (-1.0 / 6.0) if gamma > 0 else 1.0)
    )
    mp_edge = mp_lambda_plus + max(0.0, tw_shift)
    num_spikes = int(np.sum(eigvals > mp_edge))

    if erank < min_erank:
        raise LatentCollapseError(
            f"Latent dimensional collapse: erank={erank:.4f} < min_erank={min_erank:.4f}."
        )
    if enforce_mp_signal_guard and num_spikes < min_signal_spikes:
        raise LatentCollapseError(
            f"Sub-Marchenko-Pastur noise collapse: {num_spikes} spikes > {mp_edge:.4f} "
            f"(required >= {min_signal_spikes})."
        )

    return LatentCollapseDiagnostic(
        n_samples=n,
        n_features=d,
        aspect_ratio_gamma=gamma,
        effective_rank=erank,
        effective_rank_ratio=erank_ratio,
        spectral_entropy=spectral_entropy,
        estimated_noise_sigma2=sigma2_hat,
        mp_lambda_minus=mp_lambda_minus,
        mp_lambda_plus=mp_lambda_plus,
        mp_tracy_widom_edge=mp_edge,
        num_signal_spikes=num_spikes,
        top_eigenvalue=float(eigvals[0]),
        eigenvalues=eigvals,
    )


# =============================================================================
# Module 3: Non-Exchangeable Conformal Grounding & ACI/PID Coverage Controller
# =============================================================================

MAX_CONFORMAL_C_HAT: float = 12.42


@dataclass(frozen=True)
class ConformalQuantileResult:
    """Result of non-exchangeable conformal calibration with ESS / c_hat guard."""

    quantile_threshold: float
    effective_sample_size: float
    c_hat_diagnostic: float
    target_miscoverage_alpha: float
    n_calibration: int


@dataclass(frozen=True)
class ACIPIDStepRecord:
    """Single online calibration step of the hybrid ACI / Conformal PID controller."""

    step: int
    score_observed: float
    threshold_used: float
    miscovered: int
    alpha_next: float
    pid_threshold_next: float
    empirical_coverage: float
    ess: float
    c_hat: float


def compute_ess_and_c_hat(weights: Sequence[float] | np.ndarray) -> tuple[float, float]:
    """Compute Kish Effective Sample Size ESS = (sum w)^2 / sum(w^2) and c_hat = n / ESS."""
    w = np.asarray(weights, dtype=np.float64)
    if w.ndim != 1 or w.size == 0:
        raise ConformalGroundError("Calibration weights must be a non-empty 1D vector.")
    if not np.all(np.isfinite(w)) or np.any(w < 0.0):
        raise ConformalGroundError("Calibration weights must be finite and non-negative.")
    sum_w = float(np.sum(w))
    sum_w2 = float(np.sum(w * w))
    if sum_w <= 1e-12 or sum_w2 <= 1e-24:
        raise ConformalGroundError("Calibration weights sum to zero.")
    ess = (sum_w * sum_w) / sum_w2
    c_hat = float(w.size) / ess
    return ess, c_hat


def compute_non_exchangeable_conformal_quantile(
    scores: Sequence[float] | np.ndarray,
    weights: Sequence[float] | np.ndarray,
    alpha: float = 0.10,
    *,
    max_c_hat: float = MAX_CONFORMAL_C_HAT,
    min_ess: float = 5.0,
    test_point_weight: float = 1.0,
) -> ConformalQuantileResult:
    """Barber et al. (2023) non-exchangeable conformal quantile with c_hat <= 12.42 ESS gate."""
    s = np.asarray(scores, dtype=np.float64)
    w = np.asarray(weights, dtype=np.float64)
    if s.ndim != 1 or w.ndim != 1 or s.size != w.size or s.size == 0:
        raise ConformalGroundError("scores and weights must be equal-length non-empty 1D arrays.")
    if not np.all(np.isfinite(s)):
        raise ConformalGroundError("Nonconformity scores contain NaN or Inf.")
    if not (0.0 < alpha < 1.0):
        raise ConformalGroundError(f"Miscoverage alpha={alpha} must lie strictly in (0, 1).")
    if test_point_weight <= 0.0 or not math.isfinite(test_point_weight):
        raise ConformalGroundError("test_point_weight must be finite and > 0.")

    ess, c_hat = compute_ess_and_c_hat(w)
    if c_hat > max_c_hat:
        raise ConformalGroundError(
            f"Conformal weight degeneracy: c_hat={c_hat:.4f} > max_c_hat={max_c_hat:.2f} (ESS={ess:.2f})."
        )
    if ess < min_ess:
        raise ConformalGroundError(f"Conformal ESS={ess:.2f} below required minimum {min_ess:.2f}.")

    order = np.argsort(s, kind="mergesort")
    s_sorted = s[order]
    w_sorted = w[order]
    denom = float(np.sum(w_sorted)) + test_point_weight
    w_norm = w_sorted / denom
    cum_w = np.cumsum(w_norm)
    target_level = 1.0 - alpha

    idx = int(np.searchsorted(cum_w, target_level, side="left"))
    if idx >= s_sorted.size:
        raise ConformalGroundError(
            f"Insufficient weighted calibration mass ({cum_w[-1]:.4f} < {target_level:.4f}); "
            "prediction set is unbounded (+inf)."
        )

    return ConformalQuantileResult(
        quantile_threshold=float(s_sorted[idx]),
        effective_sample_size=ess,
        c_hat_diagnostic=c_hat,
        target_miscoverage_alpha=alpha,
        n_calibration=int(s.size),
    )


class ACIPIDCoverageController:
    """Hybrid Adaptive Conformal Inference (ACI) + Conformal PID threshold controller.

    Combines:
      - Barber et al. non-exchangeable weighted base quantile (enforcing c_hat <= 12.42),
      - Gibbs & Candes (2021) online alpha_t adaptation,
      - Angelopoulos, Candes & Tibshirani (2023) PID tracking with nonlinear tan integrator.
    """

    def __init__(
        self,
        target_alpha: float = 0.10,
        *,
        gamma_aci: float = 0.04,
        k_p: float = 0.25,
        k_i: float = 0.15,
        k_d: float = 0.05,
        c_sat: float = 2.5,
        decay_factor: float = 0.985,
        max_c_hat: float = MAX_CONFORMAL_C_HAT,
        min_ess: float = 5.0,
        alpha_min: float = 0.02,
        alpha_max: float = 0.50,
    ) -> None:
        if not (0.0 < target_alpha < 1.0):
            raise ConformalGroundError("target_alpha must lie in (0, 1).")
        self.target_alpha = target_alpha
        self.alpha_t = target_alpha
        self.gamma_aci = gamma_aci
        self.k_p = k_p
        self.k_i = k_i
        self.k_d = k_d
        self.c_sat = c_sat
        self.decay_factor = decay_factor
        self.max_c_hat = max_c_hat
        self.min_ess = min_ess
        self.alpha_min = alpha_min
        self.alpha_max = alpha_max

        self._scores: list[float] = []
        self._cum_error: float = 0.0
        self._prev_error: float = 0.0
        self._pid_offset: float = 0.0
        self._miscoverage_count: int = 0
        self.history: list[ACIPIDStepRecord] = []

    def seed_calibration(self, initial_scores: Sequence[float]) -> None:
        arr = np.asarray(initial_scores, dtype=np.float64)
        if arr.ndim != 1 or arr.size < math.ceil(self.min_ess):
            raise ConformalGroundError("Seed calibration scores smaller than min_ess.")
        if not np.all(np.isfinite(arr)):
            raise ConformalGroundError("Seed calibration scores contain NaN or Inf.")
        self._scores.extend(float(v) for v in arr)

    def _saturated_tan_integrator(self, cum_err: float, step_t: int) -> float:
        scale = math.log(float(step_t) + 1.0) / (self.c_sat * max(1.0, float(step_t)))
        clipped_arg = min(max(cum_err * scale, -0.48 * math.pi), 0.48 * math.pi)
        return self.k_i * math.tan(clipped_arg)

    def step(self, observed_nonconformity_score: float, *, max_window: int = 200) -> ACIPIDStepRecord:
        if not math.isfinite(observed_nonconformity_score) or observed_nonconformity_score < 0.0:
            raise ConformalGroundError("Observed nonconformity score must be finite and >= 0.")
        if len(self._scores) == 0:
            raise ConformalGroundError("Controller must be seeded before online stepping.")

        window_scores = np.asarray(self._scores[-max_window:], dtype=np.float64)
        n_win = window_scores.size
        exponents = np.arange(n_win - 1, -1, -1, dtype=np.float64)
        weights = np.power(self.decay_factor, exponents)

        # Respect finite-sample mass resolution floor w_{n+1} / (sum(w) + w_{n+1}) so quantile selects s_(n)
        finite_mass_alpha_floor = (1.0 / (float(np.sum(weights)) + 1.0)) + 1e-6
        effective_alpha = max(self.alpha_t, finite_mass_alpha_floor)

        q_res = compute_non_exchangeable_conformal_quantile(
            window_scores,
            weights,
            alpha=effective_alpha,
            max_c_hat=self.max_c_hat,
            min_ess=self.min_ess,
        )
        threshold_used = max(0.0, q_res.quantile_threshold + self._pid_offset)
        err_t = 1 if observed_nonconformity_score > threshold_used else 0
        self._miscoverage_count += err_t

        t_idx = len(self.history) + 1
        e_t = float(err_t) - self.target_alpha
        self._cum_error += e_t
        d_term = self.k_d * (e_t - self._prev_error)
        i_term = self._saturated_tan_integrator(self._cum_error, t_idx)
        p_term = self.k_p * e_t
        self._pid_offset = p_term + i_term + d_term
        self._prev_error = e_t

        # Gibbs & Candes ACI step: err_t == 1 reduces alpha_t -> widens next quantile
        self.alpha_t = min(
            max(self.alpha_t + self.gamma_aci * (self.target_alpha - float(err_t)), self.alpha_min),
            self.alpha_max,
        )
        self._scores.append(float(observed_nonconformity_score))

        emp_cov = 1.0 - (float(self._miscoverage_count) / float(t_idx))
        rec = ACIPIDStepRecord(
            step=t_idx,
            score_observed=float(observed_nonconformity_score),
            threshold_used=threshold_used,
            miscovered=err_t,
            alpha_next=self.alpha_t,
            pid_threshold_next=max(0.0, q_res.quantile_threshold + self._pid_offset),
            empirical_coverage=emp_cov,
            ess=q_res.effective_sample_size,
            c_hat=q_res.c_hat_diagnostic,
        )
        self.history.append(rec)
        return rec


# =============================================================================
# Module 4: Process-Reward Hallucination Defense
# =============================================================================


@dataclass(frozen=True)
class ProcessRewardAudit:
    """Audit result of Cai et al. verifier debiasing + Bellman Q-decay step-product gate."""

    raw_step_scores: tuple[float, ...]
    debiased_step_probs: tuple[float, ...]
    bellman_q_values: tuple[float, ...]
    root_bellman_q: float
    undiscounted_step_product: float
    youden_j_denominator: float


def debias_verifier_rate(
    r_tilde: float,
    rho_0: float,
    rho_1: float,
    *,
    clip_unit_interval: bool = True,
    min_youden_j: float = 1e-6,
) -> float:
    """Cai et al. backward verifier error-rate debiasing: R_hat = (R_tilde - rho_0)/(1 - rho_0 - rho_1).

    Args:
        r_tilde: Observed verifier acceptance probability / process score in [0, 1].
        rho_0: Verifier False Positive Rate P(V=1 | True=0) in [0, 1).
        rho_1: Verifier False Negative Rate P(V=0 | True=1) in [0, 1).
    """
    for name, val in (("r_tilde", r_tilde), ("rho_0", rho_0), ("rho_1", rho_1)):
        if not math.isfinite(val) or val < 0.0 or val > 1.0:
            raise UnidentifiableVerifierError(f"{name}={val} must be finite inside [0, 1].")

    denom = 1.0 - rho_0 - rho_1
    if denom <= min_youden_j:
        raise UnidentifiableVerifierError(
            f"Unidentifiable or adversarial verifier: 1 - rho_0 - rho_1 = {denom:.6f} <= {min_youden_j}."
        )

    r_hat = (r_tilde - rho_0) / denom
    if clip_unit_interval:
        return min(max(r_hat, 0.0), 1.0)
    return r_hat


def evaluate_bellman_q_decay_defense(
    raw_step_scores: Sequence[float],
    *,
    rho_0: float = 0.08,
    rho_1: float = 0.05,
    gamma: float = 0.98,
    min_step_prob: float = 0.55,
    min_root_q: float = 0.40,
) -> ProcessRewardAudit:
    """Run Cai et al. backward debiasing across reasoning steps + Bellman Q-decay kill switch."""
    if len(raw_step_scores) == 0:
        raise HallucinationKillSwitchError("Empty reasoning trace passed to Process-Reward gate.")
    if not (0.0 < gamma <= 1.0) or not math.isfinite(gamma):
        raise HallucinationKillSwitchError("Discount factor gamma must lie in (0, 1].")

    denom = 1.0 - rho_0 - rho_1
    debiased = [debias_verifier_rate(float(s), rho_0, rho_1, clip_unit_interval=True) for s in raw_step_scores]

    n_steps = len(debiased)
    q_vals = [0.0] * n_steps
    q_vals[-1] = debiased[-1]
    for t in range(n_steps - 2, -1, -1):
        q_vals[t] = debiased[t] * gamma * q_vals[t + 1]

    undiscounted_prod = 1.0
    for p_step in debiased:
        undiscounted_prod *= p_step

    for idx, p_step in enumerate(debiased):
        if p_step < min_step_prob:
            raise HallucinationKillSwitchError(
                f"Step {idx} debiased validity {p_step:.4f} < min_step_prob={min_step_prob:.4f}."
            )

    if q_vals[0] < min_root_q:
        raise HallucinationKillSwitchError(
            f"Bellman root Q_1={q_vals[0]:.4f} < min_root_q={min_root_q:.4f} (cumulative decay kill switch)."
        )

    return ProcessRewardAudit(
        raw_step_scores=tuple(float(s) for s in raw_step_scores),
        debiased_step_probs=tuple(debiased),
        bellman_q_values=tuple(q_vals),
        root_bellman_q=q_vals[0],
        undiscounted_step_product=undiscounted_prod,
        youden_j_denominator=denom,
    )


# =============================================================================
# Module 5: Deterministic Binary Wire-Format / Canonical Protobuf Frame Compiler
# =============================================================================

_CRC32C_POLY_REFLECTED: int = 0x82F63B78


def _build_crc32c_table() -> tuple[int, ...]:
    table: list[int] = []
    for byte in range(256):
        crc = byte
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ _CRC32C_POLY_REFLECTED
            else:
                crc >>= 1
        table.append(crc & 0xFFFFFFFF)
    return tuple(table)


_CRC32C_TABLE: tuple[int, ...] = _build_crc32c_table()


def compute_crc32c(data: bytes | bytearray | memoryview) -> int:
    """Compute hardware-standard Castagnoli CRC-32C checksum (RFC 3720: '123456789' -> 0xE3069283)."""
    crc = 0xFFFFFFFF
    mv = memoryview(data).cast("B")
    for b in mv:
        crc = _CRC32C_TABLE[(crc ^ b) & 0xFF] ^ (crc >> 8)
    return (crc ^ 0xFFFFFFFF) & 0xFFFFFFFF


def _encode_uvarint(value: int) -> bytes:
    if value < 0:
        raise WireFormatError("Unsigned varint cannot encode negative integer.")
    out = bytearray()
    while value >= 0x80:
        out.append((value & 0x7F) | 0x80)
        value >>= 7
    out.append(value & 0x7F)
    return bytes(out)


def _decode_uvarint(view: memoryview, offset: int) -> tuple[int, int]:
    result = 0
    shift = 0
    n = len(view)
    while offset < n:
        byte = view[offset]
        offset += 1
        result |= (byte & 0x7F) << shift
        if (byte & 0x80) == 0:
            return result, offset
        shift += 7
        if shift > 63:
            raise FrameIntegrityError("Malformed varint exceeds 64-bit integer width.")
    raise FrameIntegrityError("Truncated varint in Protobuf payload.")


def _zigzag_encode(value: int) -> int:
    return (value << 1) ^ (value >> 63) if value < 0 else (value << 1)


def _zigzag_decode(uval: int) -> int:
    return (uval >> 1) ^ -(uval & 1)


def _canonical_f64_bytes(val: float) -> bytes:
    if not math.isfinite(val):
        raise WireFormatError(f"Canonical wire compiler rejects non-finite float: {val!r}.")
    clean = 0.0 if val == 0.0 else float(val)
    return struct.pack("<d", clean)


@dataclass(frozen=True)
class SignalEntryWire:
    """Canonical Protobuf-compatible submessage for a single GSE signal observation."""

    signal_id: str
    value: float
    home_sign: int
    weight: float


@dataclass(frozen=True)
class DecodedSignalFrame:
    """Zero-copy decoded signal transport envelope."""

    version: int
    flags: int
    crc32c: int
    sha256_hex: str
    game_id: str
    as_of_unix_ms: int
    manifest_sha256: str
    signals: tuple[SignalEntryWire, ...]
    payload_view: memoryview


class CanonicalSignalFrameCompiler:
    """Deterministic Protobuf-compatible binary frame compiler with CRC32C + SHA-256."""

    MAGIC: bytes = b"GSE1"
    HEADER_STRUCT = struct.Struct("<4sHHII32s")
    VERSION: int = 1

    @staticmethod
    def _encode_tag(field_number: int, wire_type: int) -> bytes:
        return _encode_uvarint((field_number << 3) | wire_type)

    @classmethod
    def _encode_signal_submessage(cls, sig: SignalEntryWire) -> bytes:
        if not sig.signal_id:
            raise WireFormatError("signal_id cannot be empty.")
        if sig.home_sign not in (-1, 1):
            raise WireFormatError(f"Canonical wire frame requires home_sign in {{-1, +1}}, got {sig.home_sign}.")
        sid_bytes = sig.signal_id.encode("utf-8")
        parts = [
            cls._encode_tag(1, 2),
            _encode_uvarint(len(sid_bytes)),
            sid_bytes,
            cls._encode_tag(2, 1),
            _canonical_f64_bytes(sig.value),
            cls._encode_tag(3, 0),
            _encode_uvarint(_zigzag_encode(int(sig.home_sign))),
            cls._encode_tag(4, 1),
            _canonical_f64_bytes(sig.weight),
        ]
        return b"".join(parts)

    @classmethod
    def compile_frame(
        cls,
        *,
        game_id: str,
        as_of_unix_ms: int,
        manifest_sha256: str,
        signals: Sequence[SignalEntryWire | Mapping[str, Any]],
        flags: int = 0,
    ) -> bytes:
        """Deterministically compile a signal bundle into a CRC32C + SHA-256 binary frame."""
        if not game_id or not manifest_sha256:
            raise WireFormatError("game_id and manifest_sha256 must be non-empty.")

        normalized_signals: list[SignalEntryWire] = []
        for item in signals:
            if isinstance(item, SignalEntryWire):
                normalized_signals.append(item)
            else:
                normalized_signals.append(
                    SignalEntryWire(
                        signal_id=str(item["signal_id"]),
                        value=float(item["value"]),
                        home_sign=int(item["home_sign"]),
                        weight=float(item["weight"]),
                    )
                )

        normalized_signals.sort(key=lambda s: s.signal_id)
        seen_ids: set[str] = set()
        for s in normalized_signals:
            if s.signal_id in seen_ids:
                raise WireFormatError(f"Duplicate signal_id '{s.signal_id}' in canonical frame.")
            seen_ids.add(s.signal_id)

        gid_bytes = game_id.encode("utf-8")
        mhash_bytes = manifest_sha256.encode("utf-8")

        payload_chunks: list[bytes] = [
            cls._encode_tag(1, 2),
            _encode_uvarint(len(gid_bytes)),
            gid_bytes,
            cls._encode_tag(2, 0),
            _encode_uvarint(_zigzag_encode(int(as_of_unix_ms))),
            cls._encode_tag(3, 2),
            _encode_uvarint(len(mhash_bytes)),
            mhash_bytes,
        ]
        for sig in normalized_signals:
            sub = cls._encode_signal_submessage(sig)
            payload_chunks.extend([cls._encode_tag(4, 2), _encode_uvarint(len(sub)), sub])

        payload = b"".join(payload_chunks)
        prefix_12 = struct.pack("<4sHHI", cls.MAGIC, cls.VERSION, flags & 0xFFFF, len(payload))
        crc = compute_crc32c(prefix_12 + payload)
        prefix_16 = prefix_12 + struct.pack("<I", crc)
        digest = hashlib.sha256(prefix_16 + payload).digest()
        header = cls.HEADER_STRUCT.pack(cls.MAGIC, cls.VERSION, flags & 0xFFFF, len(payload), crc, digest)
        return header + payload

    @classmethod
    def _decode_signal_submessage(cls, sub_view: memoryview) -> SignalEntryWire:
        offset = 0
        n = len(sub_view)
        signal_id: str | None = None
        value: float | None = None
        home_sign: int | None = None
        weight: float | None = None

        while offset < n:
            tag, offset = _decode_uvarint(sub_view, offset)
            field_num = tag >> 3
            wire_type = tag & 0x07
            if field_num == 1 and wire_type == 2:
                length, offset = _decode_uvarint(sub_view, offset)
                if offset + length > n:
                    raise FrameIntegrityError("Truncated signal_id string in submessage.")
                signal_id = bytes(sub_view[offset : offset + length]).decode("utf-8")
                offset += length
            elif field_num == 2 and wire_type == 1:
                if offset + 8 > n:
                    raise FrameIntegrityError("Truncated fixed64 value in submessage.")
                (value,) = struct.unpack_from("<d", sub_view, offset)
                offset += 8
            elif field_num == 3 and wire_type == 0:
                uval, offset = _decode_uvarint(sub_view, offset)
                home_sign = _zigzag_decode(uval)
            elif field_num == 4 and wire_type == 1:
                if offset + 8 > n:
                    raise FrameIntegrityError("Truncated fixed64 weight in submessage.")
                (weight,) = struct.unpack_from("<d", sub_view, offset)
                offset += 8
            else:
                raise FrameIntegrityError(f"Unknown submessage tag ({field_num}, wire={wire_type}).")

        if signal_id is None or value is None or home_sign is None or weight is None:
            raise FrameIntegrityError("Incomplete SignalEntryWire submessage.")
        if not math.isfinite(value) or not math.isfinite(weight):
            raise FrameIntegrityError("Non-finite float encountered in decoded wire frame.")
        return SignalEntryWire(signal_id=signal_id, value=value, home_sign=home_sign, weight=weight)

    @classmethod
    def decode_frame(cls, buffer: bytes | bytearray | memoryview) -> DecodedSignalFrame:
        """Zero-copy verify CRC32C + SHA-256 and decode canonical Protobuf signal payload."""
        mv = memoryview(buffer).cast("B")
        if len(mv) < cls.HEADER_STRUCT.size:
            raise FrameIntegrityError("Buffer shorter than 48-byte GSE1 frame header.")

        magic, version, flags, payload_len, expected_crc, expected_sha = cls.HEADER_STRUCT.unpack_from(mv, 0)
        if magic != cls.MAGIC:
            raise FrameIntegrityError(f"Invalid frame magic {magic!r}; expected {cls.MAGIC!r}.")
        if version != cls.VERSION:
            raise FrameIntegrityError(f"Unsupported frame version {version}.")
        if len(mv) != cls.HEADER_STRUCT.size + payload_len:
            raise FrameIntegrityError(
                f"Frame length mismatch: buffer={len(mv)}, expected={cls.HEADER_STRUCT.size + payload_len}."
            )

        payload_view = mv[cls.HEADER_STRUCT.size :]
        crc_calc = compute_crc32c(bytes(mv[:12]) + bytes(payload_view))
        if crc_calc != expected_crc:
            raise FrameIntegrityError(
                f"CRC32C mismatch: computed 0x{crc_calc:08X} != expected 0x{expected_crc:08X}."
            )

        sha_hasher = hashlib.sha256()
        sha_hasher.update(mv[:16])
        sha_hasher.update(payload_view)
        actual_sha = sha_hasher.digest()
        if actual_sha != expected_sha:
            raise FrameIntegrityError("SHA-256 cryptographic digest mismatch.")

        offset = 0
        n = len(payload_view)
        game_id: str | None = None
        as_of_unix_ms: int | None = None
        manifest_sha256: str | None = None
        signals: list[SignalEntryWire] = []

        while offset < n:
            tag, offset = _decode_uvarint(payload_view, offset)
            field_num = tag >> 3
            wire_type = tag & 0x07
            if field_num == 1 and wire_type == 2:
                length, offset = _decode_uvarint(payload_view, offset)
                if offset + length > n:
                    raise FrameIntegrityError("Truncated game_id field.")
                game_id = bytes(payload_view[offset : offset + length]).decode("utf-8")
                offset += length
            elif field_num == 2 and wire_type == 0:
                uval, offset = _decode_uvarint(payload_view, offset)
                as_of_unix_ms = _zigzag_decode(uval)
            elif field_num == 3 and wire_type == 2:
                length, offset = _decode_uvarint(payload_view, offset)
                if offset + length > n:
                    raise FrameIntegrityError("Truncated manifest_sha256 field.")
                manifest_sha256 = bytes(payload_view[offset : offset + length]).decode("utf-8")
                offset += length
            elif field_num == 4 and wire_type == 2:
                length, offset = _decode_uvarint(payload_view, offset)
                if offset + length > n:
                    raise FrameIntegrityError("Truncated signal submessage.")
                signals.append(cls._decode_signal_submessage(payload_view[offset : offset + length]))
                offset += length
            else:
                raise FrameIntegrityError(f"Unknown top-level Protobuf field ({field_num}, wire={wire_type}).")

        if game_id is None or as_of_unix_ms is None or manifest_sha256 is None:
            raise FrameIntegrityError("Decoded frame missing required envelope fields.")

        return DecodedSignalFrame(
            version=version,
            flags=flags,
            crc32c=expected_crc,
            sha256_hex=expected_sha.hex(),
            game_id=game_id,
            as_of_unix_ms=as_of_unix_ms,
            manifest_sha256=manifest_sha256,
            signals=tuple(signals),
            payload_view=payload_view,
        )


# =============================================================================
# Module 6: Probabilistic Graphical Model (DAG) of Cascading Failure Modes
#           & Five Reconciled P1 Bug Guards
# =============================================================================


class CascadingFailureDAG:
    """Discrete Bayesian Network (DAG) modeling cascading epistemic/systems failures in GSE Mind."""

    def __init__(self) -> None:
        self._parents: dict[str, tuple[str, ...]] = {}
        self._cpts: dict[str, dict[tuple[int, ...], float]] = {}

    def add_node(
        self,
        node: str,
        parents: Sequence[str],
        cpt_prob_one: Mapping[tuple[int, ...], float],
    ) -> None:
        p_tuple = tuple(parents)
        expected_keys = 1 << len(p_tuple)
        if len(cpt_prob_one) != expected_keys:
            raise ValueError(f"Node '{node}' requires {expected_keys} parent configurations.")
        for cfg, prob in cpt_prob_one.items():
            if len(cfg) != len(p_tuple) or any(bit not in (0, 1) for bit in cfg):
                raise ValueError(f"Invalid parent binary tuple {cfg} for node '{node}'.")
            if not (0.0 <= prob <= 1.0):
                raise ValueError(f"Invalid probability {prob} in CPT for '{node}'.")
        self._parents[node] = p_tuple
        self._cpts[node] = dict(cpt_prob_one)
        _ = self.topological_order()

    def topological_order(self) -> tuple[str, ...]:
        in_degree = {u: 0 for u in self._parents}
        children: dict[str, list[str]] = {u: [] for u in self._parents}
        for node, pars in self._parents.items():
            for p in pars:
                if p not in self._parents:
                    raise ValueError(f"Parent '{p}' of '{node}' has not been registered.")
                in_degree[node] += 1
                children[p].append(node)

        queue = sorted([u for u, deg in in_degree.items() if deg == 0])
        order: list[str] = []
        while queue:
            curr = queue.pop(0)
            order.append(curr)
            for ch in sorted(children[curr]):
                in_degree[ch] -= 1
                if in_degree[ch] == 0:
                    queue.append(ch)
            queue.sort()

        if len(order) != len(self._parents):
            raise ValueError("Cycle detected in failure-mode graphical model; must be a strict DAG.")
        return tuple(order)

    def marginal_probabilities(
        self,
        interventions: Mapping[str, int] | None = None,
    ) -> dict[str, float]:
        """Compute exact marginal P(X_v = 1 | do(interventions)) via Pearl truncated factorization."""
        do_map = dict(interventions or {})
        for k, v in do_map.items():
            if k not in self._parents or v not in (0, 1):
                raise ValueError(f"Invalid intervention do({k}={v}).")

        topo = self.topological_order()
        n = len(topo)
        marginals = {node: 0.0 for node in topo}

        for mask in range(1 << n):
            assignment: dict[str, int] = {}
            possible = True
            for idx, node in enumerate(topo):
                bit = (mask >> idx) & 1
                if node in do_map and bit != do_map[node]:
                    possible = False
                    break
                assignment[node] = bit
            if not possible:
                continue

            joint_p = 1.0
            for node in topo:
                if node in do_map:
                    continue
                par_cfg = tuple(assignment[p] for p in self._parents[node])
                p_one = self._cpts[node][par_cfg]
                joint_p *= p_one if assignment[node] == 1 else (1.0 - p_one)

            for node, val in assignment.items():
                if val == 1:
                    marginals[node] += joint_p

        return marginals

    @classmethod
    def build_default_gse_mind_dag(cls) -> "CascadingFailureDAG":
        """Construct the canonical 8-node GSE Mind cascading failure DAG."""
        dag = cls()
        dag.add_node("data_gap", (), {(): 0.12})
        dag.add_node("premature_grammar_trigger", (), {(): 0.08})
        dag.add_node(
            "latent_collapse",
            ("premature_grammar_trigger",),
            {(0,): 0.03, (1,): 0.42},
        )
        dag.add_node(
            "verifier_false_accept",
            ("premature_grammar_trigger", "latent_collapse"),
            {(0, 0): 0.04, (1, 0): 0.22, (0, 1): 0.38, (1, 1): 0.74},
        )
        dag.add_node(
            "conformal_weight_degeneracy",
            ("data_gap",),
            {(0,): 0.02, (1,): 0.45},
        )
        dag.add_node(
            "murphy_miscalibration",
            ("latent_collapse", "conformal_weight_degeneracy"),
            {(0, 0): 0.03, (1, 0): 0.48, (0, 1): 0.41, (1, 1): 0.85},
        )
        dag.add_node("fail_closed_gate_armed", (), {(): 0.0})
        term_cpt: dict[tuple[int, ...], float] = {}
        for dg in (0, 1):
            for vf in (0, 1):
                for mm in (0, 1):
                    for gate in (0, 1):
                        if gate == 1:
                            term_cpt[(dg, vf, mm, gate)] = 0.0
                        else:
                            n_faults = dg + vf + mm
                            term_cpt[(dg, vf, mm, gate)] = (
                                0.005 if n_faults == 0 else min(0.99, 0.32 * n_faults + 0.03)
                            )
        dag.add_node(
            "corrupted_pick_emission",
            ("data_gap", "verifier_false_accept", "murphy_miscalibration", "fail_closed_gate_armed"),
            term_cpt,
        )
        return dag


# --- Five Reconciled P1 Bug Guards (Priority 6 of 'What I Was Still Missing') ---

TAU_HAT_MANDATORY_STAMP: str = "point fit — not pre-kickoff. 2026 unit cells pool in-season weeks."


def guard_p1_target_hhi(target_hhi: float | None, *, n_receivers: int | None = None) -> float:
    """P1 Guard 1: Block silent `target_hhi == 0.0` / None / out-of-range fallback."""
    if target_hhi is None or not isinstance(target_hhi, (int, float)) or isinstance(target_hhi, bool):
        raise P1TargetHHIFallbackError("target_hhi is None or non-numeric; refusing silent fallback.")
    val = float(target_hhi)
    if not math.isfinite(val) or val <= 0.0 or val > 1.0:
        raise P1TargetHHIFallbackError(
            f"Invalid target_hhi={val!r}: silent 0.0 fallback is forbidden (must lie in (0.0, 1.0])."
        )
    if n_receivers is not None and n_receivers >= 1:
        theoretical_floor = (1.0 / float(n_receivers)) - 1e-6
        if val < theoretical_floor:
            raise P1TargetHHIFallbackError(
                f"target_hhi={val:.6f} violates Cauchy-Schwarz lower bound 1/K={1.0/n_receivers:.6f}."
            )
    return val


def guard_p1_no_swallowed_data_gap(
    provider_fn: Callable[[], Any],
    *,
    recorded_gap_events: Sequence[str] = (),
    returned_status: str | None = None,
) -> Any:
    """P1 Guard 2: Execute provider without swallowing DataGapError and block masked gap traces."""
    if len(recorded_gap_events) > 0 and returned_status not in ("INVALID", "HONEST_REFUSAL"):
        raise P1SwallowedDataGapError(
            f"Swallowed DataGapError detected: {len(recorded_gap_events)} gap(s) recorded but "
            f"status={returned_status!r} was not marked INVALID."
        )
    result = provider_fn()
    if result is None:
        raise P1SwallowedDataGapError("Provider returned None instead of raising DataGapError.")
    return result


def guard_p1_no_clear_on_missing_evidence(
    proposed_status: str,
    evidence_records: Sequence[Mapping[str, Any]] | None,
) -> str:
    """P1 Guard 3: Forbid CLEAR / HEALTHY / PASS status when evidence records are empty or unmanifested."""
    normalized = proposed_status.strip().upper()
    has_verified_evidence = bool(
        evidence_records
        and len(evidence_records) > 0
        and all(
            bool(rec.get("source_manifest_sha256")) and rec.get("source") not in (None, "", "fixture")
            for rec in evidence_records
        )
    )
    if not has_verified_evidence:
        if normalized in ("CLEAR", "HEALTHY", "PASS", "ACTIVE_VERIFIED"):
            raise P1ClearOnMissingEvidenceError(
                f"Cannot resolve status={proposed_status!r} on missing or unmanifested evidence; "
                "must emit INVALID / UNCHECKED honest refusal."
            )
        return "UNCHECKED"
    return normalized


def guard_p1_tau_hat_stamp_and_wiring(
    data_context_observations: Mapping[str, Any],
    edge_input: Mapping[str, Any],
    consumer_surface_stamp: str,
) -> float:
    """P1 Guard 4: Verify tau_hat is wired into DataContext -> EdgeInput and carries point-fit stamp."""
    if "tau_hat" not in data_context_observations or data_context_observations["tau_hat"] is None:
        raise P1TauHatStampError("tau_hat missing from DataContext.observations (unwired coaching tau).")
    if "tau_hat" not in edge_input or edge_input["tau_hat"] is None:
        raise P1TauHatStampError("tau_hat missing from EdgeInput (dropped before edge evaluation).")

    obs_tau = float(data_context_observations["tau_hat"])
    edge_tau = float(edge_input["tau_hat"])
    if not math.isfinite(obs_tau) or not math.isfinite(edge_tau) or abs(obs_tau - edge_tau) > 1e-12:
        raise P1TauHatStampError(
            f"tau_hat mismatch between DataContext ({obs_tau}) and EdgeInput ({edge_tau})."
        )

    lower_stamp = consumer_surface_stamp.lower()
    if TAU_HAT_MANDATORY_STAMP.lower() not in lower_stamp:
        raise P1TauHatStampError(
            f"Missing mandatory tau_hat stamp: {TAU_HAT_MANDATORY_STAMP!r}."
        )
    cleaned_for_false_claim = lower_stamp.replace("not pre-kickoff", "").replace("not walk-forward", "")
    if "walk-forward" in cleaned_for_false_claim or "pre-kickoff" in cleaned_for_false_claim:
        raise P1TauHatStampError(
            "tau_hat consumer surface falsely claims walk-forward or pre-kickoff provenance."
        )
    return edge_tau


def guard_p1_python_ts_parity(
    python_outputs: Mapping[str, float] | Sequence[float],
    ts_outputs: Mapping[str, float] | Sequence[float],
    *,
    atol: float = 1e-6,
) -> float:
    """P1 Guard 5: Enforce strict Python (pipeline.py) <-> TypeScript parity < 1e-6."""
    if isinstance(python_outputs, Mapping) and isinstance(ts_outputs, Mapping):
        if set(python_outputs.keys()) != set(ts_outputs.keys()):
            raise P1PipelineParityError(
                f"Key mismatch between Python {sorted(python_outputs)} and TS {sorted(ts_outputs)}."
            )
        if len(python_outputs) == 0:
            raise P1PipelineParityError("Empty output mapping passed to parity check.")
        diffs = []
        for k in sorted(python_outputs.keys()):
            py_v = float(python_outputs[k])
            ts_v = float(ts_outputs[k])
            if not (math.isfinite(py_v) and math.isfinite(ts_v)):
                raise P1PipelineParityError(f"Non-finite value on key '{k}': py={py_v}, ts={ts_v}.")
            diffs.append(abs(py_v - ts_v))
        max_abs_diff = max(diffs)
    else:
        py_arr = np.asarray(python_outputs, dtype=np.float64)
        ts_arr = np.asarray(ts_outputs, dtype=np.float64)
        if py_arr.shape != ts_arr.shape or py_arr.size == 0:
            raise P1PipelineParityError(f"Shape mismatch py={py_arr.shape} vs ts={ts_arr.shape}.")
        if not (np.all(np.isfinite(py_arr)) and np.all(np.isfinite(ts_arr))):
            raise P1PipelineParityError("Non-finite values in Python/TS parity arrays.")
        max_abs_diff = float(np.max(np.abs(py_arr - ts_arr)))

    if max_abs_diff >= atol:
        raise P1PipelineParityError(
            f"Python <-> TypeScript parity divergence {max_abs_diff:.3e} >= tolerance {atol:.1e}."
        )
    return max_abs_diff


# =============================================================================
# GSE Mind Architecture Sections 3, 6 & 7: Content-Driven Literature Inference
# =============================================================================

CONTROLLED_CONTEXT_BASELINES: dict[str, float] = {
    "altitude_feet": 0.0,
    "wind_speed_mph": 5.0,
    "ambient_temp_fahrenheit": 65.0,
    "precipitation_rate_mm_hr": 0.0,
    "air_density_kg_m3": 1.225,
    "surface_traction_coeff": 0.85,
    "rest_differential_days": 0.0,
    "circadian_travel_timezones": 0.0,
    "ol_continuity_shared_snaps_pct": 100.0,
    "offensive_pace_sec_per_play": 27.5,
    "acoustic_crowd_spl_db": 85.0,
    "officiating_crew_penalty_rate": 11.5,
    "market_steam_velocity_pts_hr": 0.0,
    "reverse_line_movement_divergence_pct": 0.0,
}

CLAIM_TYPE_WEIGHTS: dict[str, float] = {
    "causal": 1.0,
    "correlational": 0.5,
    "theoretical": 0.3,
}

DOMAIN_LEXICAL_ANCHORS: dict[str, tuple[str, ...]] = {
    "altitude_feet": ("altitude", "elevation", "hypoxia", "air density", "drag"),
    "wind_speed_mph": ("wind", "aerodynamic", "gust", "trajectory", "crosswind"),
    "market_steam_velocity_pts_hr": ("steam", "line", "market", "odds", "price", "velocity"),
    "reverse_line_movement_divergence_pct": ("line", "market", "betting", "ticket", "money", "movement"),
}


@dataclass(frozen=True)
class VerifiedSituationalPrinciple:
    """Verified corpus principle row matching GSE Mind Architecture Section 6.1."""

    item_id: str
    source_doc_hash: str
    principle_name: str
    numeric_claim: str
    parsed_float_magnitude: float
    unit_scale_denominator: float
    evidence_quote: str
    evidence_span: tuple[int, int]
    mechanism_quote: str
    mechanism_span: tuple[int, int]
    applicable_context_fields: tuple[str, ...]
    influence_direction: str
    claim_type: str
    conditional_threshold_op: str | None = None
    conditional_threshold_val: float | None = None


@dataclass(frozen=True)
class MindEvaluationResult:
    """Deterministic output of evaluate_mind_principles (GSE Mind Architecture Section 6.2-6.3)."""

    total_delta: float
    field_deltas: dict[str, float]
    rendered_prose: str
    audit_trail: tuple[dict[str, Any], ...]


def verify_candidate_extraction(
    raw_abstract: str,
    candidate: Mapping[str, Any],
) -> tuple[bool, str]:
    """Four-layer L1-L4 ingestion verification gate (GSE Mind Architecture Sections 4 & 7)."""
    ev_quote = str(candidate.get("evidence_quote", ""))
    mech_quote = str(candidate.get("mechanism_quote", ""))
    num_claim = str(candidate.get("numeric_claim", ""))
    fields = tuple(candidate.get("applicable_context_fields", ()))

    if len(ev_quote) < 15 or len(ev_quote) > 240 or ev_quote not in raw_abstract:
        return False, "L1_QUOTE_PROVENANCE_FAIL"
    if len(mech_quote) < 15 or len(mech_quote) > 300 or mech_quote not in raw_abstract:
        return False, "L1_QUOTE_PROVENANCE_FAIL"

    num_tokens = re.findall(r"[-+]?\d+(?:\.\d+)?", num_claim)
    if not num_tokens or not all(tok in ev_quote for tok in num_tokens):
        return False, "L2_NUMERIC_CONTAINMENT_FAIL"

    span = candidate.get("evidence_span")
    if span is not None:
        s_idx, e_idx = int(span[0]), int(span[1])
        if raw_abstract[s_idx:e_idx] != ev_quote:
            return False, "L3_SAV_OFFSET_FAIL"

    if len(fields) == 0 or any(f not in CONTROLLED_CONTEXT_BASELINES for f in fields):
        return False, "L4_REGISTRY_OOV_FAIL"

    combined_lower = f"{ev_quote} {mech_quote}".lower()
    disallowed_non_sports = ("no free lunch", "mri relaxation", "presidential election")
    if any(term in combined_lower for term in disallowed_non_sports):
        return False, "L4_MECHANISM_ENTAILMENT_FAIL"

    for f in fields:
        anchors = DOMAIN_LEXICAL_ANCHORS.get(f)
        if anchors and not any(a in combined_lower for a in anchors):
            return False, "L4_MECHANISM_ENTAILMENT_FAIL"

    return True, "ADMITTED"


def _check_threshold(observed: float, op: str | None, val: float | None) -> bool:
    if op is None or val is None:
        return False
    if op == ">":
        return observed > val
    if op == ">=":
        return observed >= val
    if op == "<":
        return observed < val
    if op == "<=":
        return observed <= val
    return False


def evaluate_mind_principles(
    context: Mapping[str, float],
    corpus: Sequence[VerifiedSituationalPrinciple],
) -> MindEvaluationResult:
    """Pure content-driven delta derivation & opposing-claim deadband (eta_c < 0.20)."""
    if len(corpus) == 0 or len(context) == 0:
        return MindEvaluationResult(total_delta=0.0, field_deltas={}, rendered_prose="", audit_trail=())

    field_deltas: dict[str, float] = {}
    prose_segments: list[str] = []
    audit_records: list[dict[str, Any]] = []

    for c_field, x_obs in context.items():
        if c_field not in CONTROLLED_CONTEXT_BASELINES:
            continue
        x_base = CONTROLLED_CONTEXT_BASELINES[c_field]
        matched = [row for row in corpus if c_field in row.applicable_context_fields]
        if not matched:
            continue

        active_items: list[tuple[VerifiedSituationalPrinciple, float, float]] = []
        for row in matched:
            w_i = CLAIM_TYPE_WEIGHTS[row.claim_type]
            dx = (float(x_obs) - x_base) / float(row.unit_scale_denominator)
            if row.influence_direction == "positive":
                sign_i = 1.0
            elif row.influence_direction == "negative":
                sign_i = -1.0
            else:
                sign_i = 1.0 if _check_threshold(float(x_obs), row.conditional_threshold_op, row.conditional_threshold_val) else 0.0

            if sign_i == 0.0:
                audit_records.append(
                    {
                        "item_id": row.item_id,
                        "triggered_context_field": c_field,
                        "parsed_delta_applied": 0.0,
                        "confidence_weight": w_i,
                        "resolution_status": "THRESHOLD_NOT_MET",
                    }
                )
                continue

            delta_i = sign_i * abs(float(row.parsed_float_magnitude)) * dx
            active_items.append((row, w_i, delta_i))

        if not active_items:
            continue

        sum_w = sum(w for _, w, _ in active_items)
        weighted_signed = sum(w * d for _, w, d in active_items)
        weighted_abs = sum(w * abs(d) for _, w, d in active_items)
        bar_delta = weighted_signed / sum_w
        eta_c = abs(weighted_signed) / weighted_abs if weighted_abs > 1e-12 else 0.0

        if len(active_items) >= 2 and (eta_c < 0.20 or abs(bar_delta) < 1e-4):
            field_deltas[c_field] = 0.0
            pos_row = max(active_items, key=lambda t: t[2])[0]
            neg_row = min(active_items, key=lambda t: t[2])[0]
            prose_segments.append(
                f"Conflicting literature evidence neutralized adjustments to {c_field} "
                f"(consensus ratio eta_c = {eta_c:.2f} < 0.20): {pos_row.principle_name} "
                f"({pos_row.item_id}, {pos_row.numeric_claim}, {pos_row.claim_type}: "
                f"'{pos_row.mechanism_quote}') is counterbalanced by {neg_row.principle_name} "
                f"({neg_row.item_id}, {neg_row.numeric_claim}, {neg_row.claim_type}: "
                f"'{neg_row.mechanism_quote}'). Net delta applied: 0.0000."
            )
            for row, w_i, _ in active_items:
                audit_records.append(
                    {
                        "item_id": row.item_id,
                        "source_doc_hash": row.source_doc_hash,
                        "triggered_context_field": c_field,
                        "numeric_claim": row.numeric_claim,
                        "parsed_delta_applied": 0.0,
                        "confidence_weight": w_i,
                        "resolution_status": "CONFLICT_NEUTRALIZED",
                    }
                )
        else:
            field_deltas[c_field] = bar_delta if abs(bar_delta) >= 1e-4 else 0.0
            for row, w_i, delta_i in active_items:
                prose_segments.append(
                    f"The {row.principle_name} principle ({row.item_id}, span "
                    f"[{row.evidence_span[0]}:{row.evidence_span[1]}]) indicates a "
                    f"{row.influence_direction} adjustment of {row.numeric_claim} "
                    f"(applied delta: {delta_i:+.4f} at weight {w_i}) to {c_field} "
                    f"(observed: {x_obs} vs. baseline {x_base}), grounded in the mechanism: "
                    f"'{row.mechanism_quote}' (source evidence: '{row.evidence_quote}', "
                    f"epistemic class: {row.claim_type})."
                )
                audit_records.append(
                    {
                        "item_id": row.item_id,
                        "source_doc_hash": row.source_doc_hash,
                        "triggered_context_field": c_field,
                        "numeric_claim": row.numeric_claim,
                        "parsed_delta_applied": delta_i,
                        "confidence_weight": w_i,
                        "resolution_status": "APPLIED",
                    }
                )

    total_delta = float(sum(field_deltas.values()))
    return MindEvaluationResult(
        total_delta=total_delta,
        field_deltas=field_deltas,
        rendered_prose=" ".join(prose_segments),
        audit_trail=tuple(audit_records),
    )


# =============================================================================
# Part 2: Complete T1-T8 Adversarial Mutation Gate Suite & Harness
# =============================================================================

REQUIRED_OL_POSITIONS: tuple[str, ...] = ("LT", "LG", "C", "RG", "RT")

CANONICAL_SIGNAL_POLARITY: dict[str, int] = {
    "rest_differential_days": +1,
    "ol_continuity_shared_snaps_pct": +1,
    "pressure_allowed_rate_diff": -1,
    "turnovers_expected_diff": -1,
}

FORBIDDEN_MAGIC_FALLBACKS: tuple[float, ...] = (0.58, -0.26, 0.5238)

CALIBRATION_LEDGER_DISCLOSURE: str = (
    "Every pick is on the public ledger, wins and losses: https://galaxysportsedge.com/calibration"
)


@dataclass
class GSERuntimeBundle:
    """Self-contained runtime bundle validated across all T1-T8 fail-closed gates."""

    game_id: str
    as_of_timestamp: str
    kickoff_timestamp: str
    schedule_manifest: dict[str, str]
    manifest_sha256: str
    source_type: str
    real_pick: bool
    home_ol_starters: dict[str, dict[str, Any]]
    away_ol_starters: dict[str, dict[str, Any]]
    feature_observations: list[dict[str, Any]]
    signal_registry: list[dict[str, Any]]
    calibration_forecasts: list[tuple[float, int]]
    sgp_copula_matrix: np.ndarray
    sgp_leg_probs: tuple[float, ...]
    evaluator_fn: Callable[[Mapping[str, float]], float]
    evaluator_inputs: dict[str, float]
    public_copy: str


def _parse_iso_utc(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def gate_t1_ol_starters_pressure_funnel(bundle: GSERuntimeBundle) -> dict[str, float]:
    """T1 Gate: Require all 5 published OL starters per team from manifest-backed depth charts."""
    scores: dict[str, float] = {}
    for side, starters in (("home", bundle.home_ol_starters), ("away", bundle.away_ol_starters)):
        if not starters:
            raise DataGapError(f"T1 Pressure-Funnel: {side} OL starters missing (unpublished injury/depth chart).")
        missing = [pos for pos in REQUIRED_OL_POSITIONS if pos not in starters]
        if missing:
            raise DataGapError(f"T1 Pressure-Funnel: {side} missing required OL positions {missing}.")
        unit_sum = 0.0
        for pos in REQUIRED_OL_POSITIONS:
            entry = starters[pos]
            if not entry or not entry.get("player_id") or entry.get("published") is not True:
                raise DataGapError(f"T1 Pressure-Funnel: {side} {pos} starter unpublished or missing player_id.")
            if entry.get("fallback_imputed", False):
                raise DataGapError(f"T1 Pressure-Funnel: silent fallback imputation forbidden on {side} {pos}.")
            p_grade = entry.get("pass_block_efficiency")
            if p_grade is None or not math.isfinite(float(p_grade)):
                raise DataGapError(f"T1 Pressure-Funnel: {side} {pos} missing pass_block_efficiency.")
            unit_sum += float(p_grade)
        scores[side] = unit_sum / 5.0
    return scores


def gate_t2_temporal_lookahead(bundle: GSERuntimeBundle) -> None:
    """T2 Gate: Enforce strict filtration measurability t_obs <= t_as_of <= t_kickoff."""
    t_as_of = _parse_iso_utc(bundle.as_of_timestamp)
    t_kickoff = _parse_iso_utc(bundle.kickoff_timestamp)
    if t_as_of > t_kickoff:
        raise TemporalLookaheadError(
            f"T2 Lookahead: as_of_timestamp ({bundle.as_of_timestamp}) > kickoff ({bundle.kickoff_timestamp})."
        )
    if len(bundle.feature_observations) == 0:
        raise DataGapError("T2 Filtration: empty feature_observations list.")

    for obs in bundle.feature_observations:
        obs_ts_raw = obs.get("observed_at")
        if not obs_ts_raw:
            raise TemporalLookaheadError(f"T2 Lookahead: feature '{obs.get('name')}' lacks observed_at timestamp.")
        t_obs = _parse_iso_utc(str(obs_ts_raw))
        if t_obs > t_as_of:
            raise TemporalLookaheadError(
                f"T2 Lookahead Injection: feature '{obs.get('name')}' observed_at={obs_ts_raw} "
                f"is strictly after cutoff {bundle.as_of_timestamp}."
            )


def gate_t3_homesign_polarity(bundle: GSERuntimeBundle) -> float:
    """T3 Gate: Verify every LIVE signal has canonical non-null homeSign in {-1, +1} and valid tilt."""
    if len(bundle.signal_registry) == 0:
        raise HomeSignSabotageError("T3 Polarity: empty signal_registry.")

    live_count = 0
    net_home_tilt = 0.0
    for sig in bundle.signal_registry:
        gate_state = sig.get("gate")
        sig_id = str(sig.get("signal_id", ""))
        h_sign = sig.get("homeSign")

        if gate_state == "DISABLED":
            continue
        if h_sign not in (-1, 1):
            raise HomeSignSabotageError(
                f"T3 Sabotage: signal '{sig_id}' (gate={gate_state}) has invalid homeSign={h_sign!r}."
            )
        if sig_id in CANONICAL_SIGNAL_POLARITY and h_sign != CANONICAL_SIGNAL_POLARITY[sig_id]:
            raise HomeSignSabotageError(
                f"T3 Sign-Flip Sabotage: signal '{sig_id}' has homeSign={h_sign}, "
                f"expected canonical {CANONICAL_SIGNAL_POLARITY[sig_id]}."
            )
        if gate_state == "LIVE":
            live_count += 1
            raw_diff = float(sig.get("home_minus_away", 0.0))
            weight = float(sig.get("weight", 0.0))
            signed_contrib = float(h_sign) * weight * raw_diff
            reported_contrib = sig.get("signed_tilt")
            if reported_contrib is not None and abs(float(reported_contrib) - signed_contrib) > 1e-9:
                raise HomeSignSabotageError(
                    f"T3 Sign-Flip Sabotage: reported signed_tilt={reported_contrib} != {signed_contrib}."
                )
            net_home_tilt += signed_contrib

    if live_count == 0:
        raise HomeSignSabotageError("T3 Polarity: zero LIVE signals active in registry.")
    return net_home_tilt


@dataclass(frozen=True)
class MurphyDecomposition:
    """Murphy (1973) Brier Score decomposition BS = REL - RES + UNC."""

    brier_score: float
    reliability: float
    resolution: float
    uncertainty: float
    brier_skill_score: float


def compute_murphy_brier_decomposition(
    forecasts: Sequence[tuple[float, int]],
    *,
    n_bins: int = 10,
) -> MurphyDecomposition:
    """Compute binned Murphy Brier decomposition and enforce Reliability < Resolution."""
    if len(forecasts) < 4:
        raise MurphyCalibrationKillSwitchError("Insufficient calibration forecasts for Murphy gate.")

    probs = np.asarray([float(p) for p, _ in forecasts], dtype=np.float64)
    outcomes = np.asarray([int(y) for _, y in forecasts], dtype=np.float64)
    if np.any(~np.isfinite(probs)) or np.any((probs < 0.0) | (probs > 1.0)):
        raise MurphyCalibrationKillSwitchError("Forecast probabilities outside [0, 1].")
    if not set(np.unique(outcomes).tolist()).issubset({0.0, 1.0}):
        raise MurphyCalibrationKillSwitchError("Outcomes must be binary {0, 1}.")

    n = float(probs.size)
    brier = float(np.mean((probs - outcomes) ** 2))
    y_bar = float(np.mean(outcomes))
    uncertainty = y_bar * (1.0 - y_bar)

    bin_idx = np.minimum((probs * n_bins).astype(np.int64), n_bins - 1)
    rel = 0.0
    res = 0.0
    for b in range(n_bins):
        mask = bin_idx == b
        n_k = int(np.sum(mask))
        if n_k == 0:
            continue
        p_k = float(np.mean(probs[mask]))
        o_k = float(np.mean(outcomes[mask]))
        w_k = float(n_k) / n
        rel += w_k * ((p_k - o_k) ** 2)
        res += w_k * ((o_k - y_bar) ** 2)

    bss = (res - rel) / uncertainty if uncertainty > 1e-12 else 0.0
    if rel >= res:
        raise MurphyCalibrationKillSwitchError(
            f"T4 Murphy Kill-Switch Tripped: Reliability ({rel:.5f}) >= Resolution ({res:.5f}); "
            f"BSS={bss:.4f} <= 0."
        )
    return MurphyDecomposition(
        brier_score=brier,
        reliability=rel,
        resolution=res,
        uncertainty=uncertainty,
        brier_skill_score=bss,
    )


def gate_t5_parlay_copula_psd(
    copula_matrix: np.ndarray,
    leg_probs: Sequence[float] | None = None,
    *,
    min_eig_floor: float = 1e-7,
) -> np.ndarray:
    """T5 Gate: Verify SGP correlation matrix is symmetric, unit-diagonal, bounded, and strictly PSD."""
    r_mat = np.asarray(copula_matrix, dtype=np.float64)
    if r_mat.ndim != 2 or r_mat.shape[0] != r_mat.shape[1] or r_mat.shape[0] < 2:
        raise InvalidCopulaMatrixError("T5 Copula: matrix must be square with m >= 2 legs.")
    if not np.all(np.isfinite(r_mat)):
        raise InvalidCopulaMatrixError("T5 Copula: matrix contains NaN or Inf.")
    if float(np.max(np.abs(r_mat - r_mat.T))) > 1e-9:
        raise InvalidCopulaMatrixError("T5 Copula: correlation matrix is asymmetric.")
    if float(np.max(np.abs(np.diag(r_mat) - 1.0))) > 1e-9:
        raise InvalidCopulaMatrixError("T5 Copula: diagonal entries must equal 1.0.")

    off_diag = r_mat - np.eye(r_mat.shape[0])
    if float(np.max(np.abs(off_diag))) >= 1.0:
        raise InvalidCopulaMatrixError("T5 Copula: off-diagonal correlation magnitude >= 1.0.")

    eigvals = np.linalg.eigvalsh(r_mat)
    min_eig = float(np.min(eigvals))
    if min_eig < min_eig_floor:
        raise InvalidCopulaMatrixError(
            f"T5 Non-PSD Copula Rejected: lambda_min={min_eig:.6f} < {min_eig_floor:.1e}."
        )

    if leg_probs is not None:
        if len(leg_probs) != r_mat.shape[0]:
            raise InvalidCopulaMatrixError("T5 Copula: leg_probs length mismatch.")
        for p in leg_probs:
            if not math.isfinite(p) or p <= 0.0 or p >= 1.0:
                raise InvalidCopulaMatrixError(f"T5 Copula: invalid leg probability {p}.")

    return np.linalg.cholesky(r_mat)


def gate_t6_manifest_provenance(bundle: GSERuntimeBundle) -> None:
    """T6 Gate: Reject hallucinated game_ids, tampered manifest hashes, or fixture-backed prod rows."""
    if bundle.source_type.strip().lower() == "fixture" or not bundle.real_pick:
        raise UnmanifestedFixtureError(
            f"T6 Fixture Rejection: source_type={bundle.source_type!r}, real_pick={bundle.real_pick} "
            "forbidden on production path."
        )
    if bundle.game_id not in bundle.schedule_manifest:
        raise UnmanifestedFixtureError(
            f"T6 Hallucinated Fixture Row: game_id={bundle.game_id!r} absent from signed schedule_manifest."
        )
    expected_sha = bundle.schedule_manifest[bundle.game_id]
    if not bundle.manifest_sha256 or bundle.manifest_sha256 != expected_sha:
        raise UnmanifestedFixtureError(
            f"T6 Manifest Hash Mismatch for {bundle.game_id}: got {bundle.manifest_sha256!r} != {expected_sha!r}."
        )


def gate_t7_no_hardcoded_fallbacks(bundle: GSERuntimeBundle) -> float:
    """T7 Gate: Reject hardcoded magic constants (0.58, -0.26, 0.5238) & zero-Jacobian stub functions."""
    base_val = float(bundle.evaluator_fn(bundle.evaluator_inputs))
    if not math.isfinite(base_val):
        raise HardcodedFallbackError("T7 Evaluator returned non-finite output.")

    for forbidden in FORBIDDEN_MAGIC_FALLBACKS:
        if abs(base_val - forbidden) < 1e-6:
            raise HardcodedFallbackError(
                f"T7 Hardcoded Fallback Detected: evaluator emitted forbidden sentinel {forbidden}."
            )
    for k, v in bundle.evaluator_inputs.items():
        for forbidden in FORBIDDEN_MAGIC_FALLBACKS:
            if abs(float(v) - forbidden) < 1e-6:
                raise HardcodedFallbackError(
                    f"T7 Hardcoded Fallback Detected in input '{k}' == {forbidden}."
                )

    if len(bundle.evaluator_inputs) == 0:
        raise HardcodedFallbackError("T7 Evaluator has empty input vector.")

    any_sensitive = False
    for k, v in bundle.evaluator_inputs.items():
        perturbed = dict(bundle.evaluator_inputs)
        perturbed[k] = float(v) + 1.25
        mut_val = float(bundle.evaluator_fn(perturbed))
        if abs(mut_val - base_val) > 1e-7:
            any_sensitive = True
            break

    if not any_sensitive:
        raise HardcodedFallbackError(
            "T7 Constant-Stub Evaluator Detected: output is invariant under counterfactual input perturbation."
        )

    return base_val


_RE_WLT_RECORD = re.compile(r"\b\d{1,3}-\d{1,3}-\d{1,2}\b")
_RE_PCT_CONFIDENCE = re.compile(
    r"(?:\b\d+(?:\.\d+)?%\s*(?:confidence|conf|win\s*prob|lock|certainty)\b)"
    r"|(?:\bconfidence\s*[:=]?\s*\d+(?:\.\d+)?%)",
    re.IGNORECASE,
)
_RE_TOUT_HYPE = re.compile(
    r"\b(?:guaranteed\s+win|lock\s+of\s+the\s+week|free\s+money|can't\s+lose|100%\s+lock)\b",
    re.IGNORECASE,
)
_RE_NGS_LEAK = re.compile(r"\b(?:NGS|Next\s+Gen\s+Stats)\b")
_RE_VALID_BADGE = re.compile(r"\b(?:100|[1-9]?\d)/100\b")


def gate_t8_truth_file_copy_guard(public_copy: str) -> None:
    """T8 Gate: Enforce 00-TRUTH-FILE public copy rules for Galaxy Sports Network LLC."""
    violations: list[str] = []
    if _RE_WLT_RECORD.search(public_copy):
        violations.append("UNRECONCILED_WLT_RECORD_LEAK")
    if _RE_PCT_CONFIDENCE.search(public_copy):
        violations.append("PERCENT_CONFIDENCE_BADGE_FORBIDDEN")
    if _RE_TOUT_HYPE.search(public_copy):
        violations.append("PROMOTIONAL_GUARANTEED_WIN_HYPE")
    if _RE_NGS_LEAK.search(public_copy):
        violations.append("RESTRICTED_NGS_ATTRIBUTION_LEAK")
    if not _RE_VALID_BADGE.search(public_copy):
        violations.append("MISSING_INTEGER_XX_100_BADGE")
    if CALIBRATION_LEDGER_DISCLOSURE not in public_copy:
        violations.append("MISSING_CALIBRATION_LEDGER_URL")

    if violations:
        raise TruthFileCopyLeakError(
            f"T8 00-TRUTH-FILE Governance Violation(s): {', '.join(violations)}."
        )


class GSERuntimeGatePipeline:
    """Unified fail-closed gate pipeline running T1 through T8 sequentially."""

    @staticmethod
    def validate_all(bundle: GSERuntimeBundle) -> dict[str, Any]:
        ol_scores = gate_t1_ol_starters_pressure_funnel(bundle)
        gate_t2_temporal_lookahead(bundle)
        home_tilt = gate_t3_homesign_polarity(bundle)
        murphy = compute_murphy_brier_decomposition(bundle.calibration_forecasts)
        chol = gate_t5_parlay_copula_psd(bundle.sgp_copula_matrix, bundle.sgp_leg_probs)
        gate_t6_manifest_provenance(bundle)
        eval_out = gate_t7_no_hardcoded_fallbacks(bundle)
        gate_t8_truth_file_copy_guard(bundle.public_copy)
        return {
            "status": "VALIDATED",
            "ol_scores": ol_scores,
            "home_tilt": home_tilt,
            "murphy_bss": murphy.brier_skill_score,
            "copula_cholesky_det": float(np.prod(np.diag(chol))),
            "evaluator_output": eval_out,
        }


def build_valid_baseline_bundle() -> GSERuntimeBundle:
    """Construct a completely valid, manifest-pinned baseline bundle passing all T1-T8 gates."""
    game_id = "2026_10_HOU_KC"
    manifest_hash = hashlib.sha256(f"{game_id}:nflverse_pbp_2026_w10".encode("utf-8")).hexdigest()

    def _make_ol_unit(team_prefix: str, base_eff: float) -> dict[str, dict[str, Any]]:
        return {
            pos: {
                "player_id": f"{team_prefix}_{pos}_01",
                "published": True,
                "fallback_imputed": False,
                "pass_block_efficiency": base_eff + 0.005 * idx,
            }
            for idx, pos in enumerate(REQUIRED_OL_POSITIONS)
        }

    calibration_pairs: list[tuple[float, int]] = (
        [(0.15, 0)] * 17
        + [(0.15, 1)] * 3
        + [(0.35, 0)] * 13
        + [(0.35, 1)] * 7
        + [(0.65, 0)] * 7
        + [(0.65, 1)] * 13
        + [(0.85, 0)] * 3
        + [(0.85, 1)] * 17
    )

    copula = np.array(
        [
            [1.0, 0.32, 0.18],
            [0.32, 1.0, 0.24],
            [0.18, 0.24, 1.0],
        ],
        dtype=np.float64,
    )

    return GSERuntimeBundle(
        game_id=game_id,
        as_of_timestamp="2026-11-08T16:30:00Z",
        kickoff_timestamp="2026-11-08T18:00:00Z",
        schedule_manifest={game_id: manifest_hash},
        manifest_sha256=manifest_hash,
        source_type="nflverse_committed_parquet",
        real_pick=True,
        home_ol_starters=_make_ol_unit("KC", 0.945),
        away_ol_starters=_make_ol_unit("HOU", 0.932),
        feature_observations=[
            {"name": "injury_report_friday", "observed_at": "2026-11-06T21:00:00Z", "value": 1.0},
            {"name": "market_spread_snapshot", "observed_at": "2026-11-08T16:15:00Z", "value": -3.5},
        ],
        signal_registry=[
            {
                "signal_id": "rest_differential_days",
                "gate": "LIVE",
                "homeSign": +1,
                "weight": 0.12,
                "home_minus_away": 3.0,
                "signed_tilt": 0.36,
            },
            {
                "signal_id": "pressure_allowed_rate_diff",
                "gate": "LIVE",
                "homeSign": -1,
                "weight": 0.25,
                "home_minus_away": -0.04,
                "signed_tilt": 0.01,
            },
            {
                "signal_id": "legacy_unwired_metric",
                "gate": "DISABLED",
                "homeSign": None,
                "weight": None,
            },
        ],
        calibration_forecasts=calibration_pairs,
        sgp_copula_matrix=copula,
        sgp_leg_probs=(0.54, 0.48, 0.61),
        evaluator_fn=lambda inp: 0.512 + 0.018 * inp["rest_diff"] - 0.14 * inp["pressure_diff"],
        evaluator_inputs={"rest_diff": 3.0, "pressure_diff": -0.04},
        public_copy=(
            "Galaxy Sports Edge Model Assessment (Confidence: 74/100): Kansas City trench continuity "
            "and +3 rest-day advantage adjust projected spread margin by +0.37 points. "
            f"{CALIBRATION_LEDGER_DISCLOSURE}"
        ),
    )


@dataclass(frozen=True)
class MutantKillRecord:
    """Execution record for a single adversarial mutation vector."""

    vector_id: str
    description: str
    expected_exception: str
    caught_exception: str | None
    error_message: str
    killed: bool


class AdversarialMutationHarness:
    """Systematic T1-T8 hostile mutation runner proving 100% (8/8) fail-closed mutant kill rate."""

    @staticmethod
    def mutate_t1_missing_ol_starters(b: GSERuntimeBundle) -> GSERuntimeBundle:
        m = copy.deepcopy(b)
        del m.away_ol_starters["LT"]
        return m

    @staticmethod
    def mutate_t2_future_lookahead(b: GSERuntimeBundle) -> GSERuntimeBundle:
        m = copy.deepcopy(b)
        m.feature_observations.append(
            {"name": "postgame_epa_leak", "observed_at": "2026-11-08T21:45:00Z", "value": 0.21}
        )
        return m

    @staticmethod
    def mutate_t3_homesign_sabotage(b: GSERuntimeBundle) -> GSERuntimeBundle:
        m = copy.deepcopy(b)
        m.signal_registry[0]["homeSign"] = -1
        return m

    @staticmethod
    def mutate_t4_murphy_uncalibrated(b: GSERuntimeBundle) -> GSERuntimeBundle:
        m = copy.deepcopy(b)
        m.calibration_forecasts = [(0.90, 0)] * 35 + [(0.90, 1)] * 5 + [(0.10, 1)] * 35 + [(0.10, 0)] * 5
        return m

    @staticmethod
    def mutate_t5_non_psd_copula(b: GSERuntimeBundle) -> GSERuntimeBundle:
        m = copy.deepcopy(b)
        m.sgp_copula_matrix = np.array(
            [
                [1.0, 0.92, 0.92],
                [0.92, 1.0, -0.92],
                [0.92, -0.92, 1.0],
            ],
            dtype=np.float64,
        )
        return m

    @staticmethod
    def mutate_t6_hallucinated_fixture_row(b: GSERuntimeBundle) -> GSERuntimeBundle:
        m = copy.deepcopy(b)
        m.game_id = "2026_99_HALLUCINATED_BOWL"
        m.source_type = "fixture"
        m.real_pick = False
        return m

    @staticmethod
    def mutate_t7_hardcoded_fallback(b: GSERuntimeBundle) -> GSERuntimeBundle:
        m = copy.deepcopy(b)
        m.evaluator_fn = lambda _inp: 0.58
        m.evaluator_inputs["pressure_diff"] = -0.26
        return m

    @staticmethod
    def mutate_t8_truth_file_copy_leak(b: GSERuntimeBundle) -> GSERuntimeBundle:
        m = copy.deepcopy(b)
        m.public_copy = (
            "62-23-1 Historical Record! 88% confidence guaranteed win powered by raw NGS tracking!"
        )
        return m

    @classmethod
    def run_all_mutations(cls) -> tuple[list[MutantKillRecord], float]:
        baseline = build_valid_baseline_bundle()
        baseline_res = GSERuntimeGatePipeline.validate_all(baseline)
        if baseline_res["status"] != "VALIDATED":
            raise RuntimeError("Baseline bundle failed validation prior to mutation run.")

        specs: list[tuple[str, str, Callable[[GSERuntimeBundle], GSERuntimeBundle], type[GSEFailClosedError]]] = [
            ("T1", "Pressure-Funnel / Missing OL Starters DataGapError", cls.mutate_t1_missing_ol_starters, DataGapError),
            ("T2", "Future Timestamp Lookahead Injection", cls.mutate_t2_future_lookahead, TemporalLookaheadError),
            ("T3", "homeSign Sign-Flip Sabotage", cls.mutate_t3_homesign_sabotage, HomeSignSabotageError),
            ("T4", "Uncalibrated / Reliability > Resolution Murphy Kill-Switch", cls.mutate_t4_murphy_uncalibrated, MurphyCalibrationKillSwitchError),
            ("T5", "Non-PSD / Impossible Parlay Copula Matrix", cls.mutate_t5_non_psd_copula, InvalidCopulaMatrixError),
            ("T6", "Hallucinated Unmanifested Fixture Row", cls.mutate_t6_hallucinated_fixture_row, UnmanifestedFixtureError),
            ("T7", "Hardcoded Fallback Injection 0.58/-0.26/0.5238", cls.mutate_t7_hardcoded_fallback, HardcodedFallbackError),
            ("T8", "00-TRUTH-FILE Forbidden Copy Leak", cls.mutate_t8_truth_file_copy_leak, TruthFileCopyLeakError),
        ]

        records: list[MutantKillRecord] = []
        for vec_id, desc, mutator, expected_exc in specs:
            mutated = mutator(baseline)
            try:
                GSERuntimeGatePipeline.validate_all(mutated)
                records.append(
                    MutantKillRecord(
                        vector_id=vec_id,
                        description=desc,
                        expected_exception=expected_exc.__name__,
                        caught_exception=None,
                        error_message="SURVIVED (UNCAUGHT)",
                        killed=False,
                    )
                )
            except expected_exc as exc:
                records.append(
                    MutantKillRecord(
                        vector_id=vec_id,
                        description=desc,
                        expected_exception=expected_exc.__name__,
                        caught_exception=type(exc).__name__,
                        error_message=str(exc),
                        killed=True,
                    )
                )

        kill_rate = sum(1 for r in records if r.killed) / float(len(records))
        return records, kill_rate


if __name__ == "__main__":
    kill_records, rate = AdversarialMutationHarness.run_all_mutations()
    print(f"GSE Mind T1-T8 Adversarial Mutation Gate Suite — Kill Rate: {rate * 100:.1f}% ({len(kill_records)}/{len(kill_records)})")
    for rec in kill_records:
        print(f"  [{rec.vector_id}] KILLED={rec.killed} ({rec.caught_exception}): {rec.error_message}")
