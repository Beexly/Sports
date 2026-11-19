"""Wave 51 Multi-Horizon Autonomous Regime Reasoning Supervisor.

Unites four fail-closed reasoning gates cleanly with ADR-0003 RUO isolation:
1. Strict bitemporal anti-leakage (effective <= observed <= as_of) + freshness weighting.
2. Inter-source Jensen-Shannon contradiction auditing across independent signals.
3. Dual-use Rough-Path Levy Area + Barber ESS (c_hat <= 12.42) + Koopman regime classifier.
4. Positive-part James-Stein shrinkage (|delta_log_odds| <= 0.35) + 5 counterfactual shocks.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from types import ModuleType
from typing import Literal

import numpy as np

CLINICAL_TO_SPORTS_WEIGHT: float = 0.0
MAX_ABS_DELTA_LOG_ODDS: float = 0.35
BARBER_C_HAT_ABSTAIN_THRESHOLD: float = 12.42
DEFAULT_CONTRADICTION_JSD_THRESHOLD: float = 0.14
DEFAULT_MIN_DEVIG_EDGE: float = 0.025
REAL_MONEY_STAKE_CLEARED: bool = False
LIVE_STAKE_FRACTION: float = 0.0

RegimeLabel = Literal[
    "ESS_ABSTAIN",
    "TAU3_REGIME_BREAK",
    "TAU2_DECOUPLING_WATCH",
    "TAU1_COMPENSATED",
]
DecisionVerdict = Literal["PASS", "WATCH", "PLAY"]


class BitemporalLeakageError(ValueError):
    """Raised when an observation violates effective_at <= observed_at <= as_of ordering."""


@dataclass(frozen=True)
class SignalObservation:
    """Single bitemporally timestamped probability signal from an independent family."""

    source_id: str
    family: str
    prob: float
    effective_at_utc: str
    observed_at_utc: str
    half_life_hours: float = 12.0
    reliability: float = 1.0


@dataclass(frozen=True)
class BitemporalAuditResult:
    """Freshness-weighted aggregation and pairwise contradiction audit."""

    signal_count: int
    weighted_prob: float
    min_freshness_weight: float
    max_pairwise_jsd: float
    contradiction_flag: bool


@dataclass(frozen=True)
class PhaseTransitionRegimeResult:
    """Dual-use regime state derived from ESS support, Koopman damping, and Rough-Path area."""

    regime: RegimeLabel
    c_hat: float
    koopman_damping_ratio: float
    rough_path_circulation: float
    abstain_triggered: bool


@dataclass(frozen=True)
class CounterfactualStressResult:
    """5-shock counterfactual perturbation summary for fail-closed pass discipline."""

    shock_edges: dict[str, float]
    worst_case_edge: float
    fragility_ratio: float


@dataclass(frozen=True)
class AutonomousReasoningDecision:
    """Deterministic, auditable verdict with zero automated money/clinical leakage."""

    matchup_id: str
    verdict: DecisionVerdict
    reason_code: str
    market_devig_prob: float
    model_prob: float
    shrunk_delta_log_odds: float
    net_devig_edge: float
    regime: RegimeLabel
    max_pairwise_jsd: float
    worst_case_edge: float
    fragility_ratio: float
    clinical_to_sports_weight: float
    real_money_stake_cleared: bool
    live_stake_fraction: float
    decision_hash: str


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_dual_use_kernel_module() -> ModuleType:
    module_name = "gse_gsi_dual_use_phase_transition_kernel_wave51"
    existing = sys.modules.get(module_name)
    if existing is not None:
        return existing
    kernel_path = (
        _repo_root()
        / "intelligence"
        / "week10_engines_2026_11_13"
        / "GSE-GSI-Dual-Use-TBI-and-Phase-Transition-Engine-2026-11-13"
        / "gsi_gse_dual_use_phase_transition_and_tbi_kernel.py"
    )
    if not kernel_path.is_file():
        raise FileNotFoundError(f"Dual-use kernel missing at {kernel_path}")
    spec = importlib.util.spec_from_file_location(module_name, kernel_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load dual-use kernel spec from {kernel_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _parse_utc(timestamp: str) -> datetime:
    normalized = timestamp.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _clamp_prob(prob: float) -> float:
    return min(max(float(prob), 1e-6), 1.0 - 1e-6)


def _logit(prob: float) -> float:
    p = _clamp_prob(prob)
    return math.log(p / (1.0 - p))


def _sigmoid(x: float) -> float:
    if x >= 0.0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def _binary_entropy_bits(prob: float) -> float:
    p = _clamp_prob(prob)
    q = 1.0 - p
    return -(p * math.log2(p) + q * math.log2(q))


def _binary_jsd_bits(p1: float, p2: float) -> float:
    a = _clamp_prob(p1)
    b = _clamp_prob(p2)
    m = 0.5 * (a + b)
    h_mix = _binary_entropy_bits(m)
    h_avg = 0.5 * (_binary_entropy_bits(a) + _binary_entropy_bits(b))
    return max(0.0, h_mix - h_avg)


def audit_bitemporal_signal_bundle(
    observations: Sequence[SignalObservation],
    as_of_utc: str,
    contradiction_jsd_threshold: float = DEFAULT_CONTRADICTION_JSD_THRESHOLD,
) -> BitemporalAuditResult:
    """Enforce bitemporal precedence and score freshness + inter-source disagreement."""
    if not observations:
        raise ValueError("observations must not be empty")
    as_of_dt = _parse_utc(as_of_utc)

    weights: list[float] = []
    probs: list[float] = []
    freshness_scores: list[float] = []

    for obs in observations:
        effective_dt = _parse_utc(obs.effective_at_utc)
        observed_dt = _parse_utc(obs.observed_at_utc)
        if effective_dt > observed_dt:
            raise BitemporalLeakageError(
                f"Signal '{obs.source_id}' effective_at ({obs.effective_at_utc}) "
                f"> observed_at ({obs.observed_at_utc})"
            )
        if observed_dt > as_of_dt:
            raise BitemporalLeakageError(
                f"Signal '{obs.source_id}' observed_at ({obs.observed_at_utc}) "
                f"> as_of_utc ({as_of_utc})"
            )
        if obs.prob < 0.0 or obs.prob > 1.0:
            raise ValueError(f"Signal '{obs.source_id}' probability out of bounds: {obs.prob}")

        age_hours = max(0.0, (as_of_dt - observed_dt).total_seconds() / 3600.0)
        half_life = max(float(obs.half_life_hours), 1e-6)
        freshness = 2.0 ** (-age_hours / half_life)
        rel = min(max(float(obs.reliability), 0.0), 1.0)
        freshness_scores.append(freshness)
        weights.append(max(freshness * rel, 1e-9))
        probs.append(float(obs.prob))

    total_w = sum(weights)
    weighted_prob = sum(w * p for w, p in zip(weights, probs, strict=True)) / max(total_w, 1e-12)

    max_jsd = 0.0
    for i in range(len(probs)):
        for j in range(i + 1, len(probs)):
            jsd = _binary_jsd_bits(probs[i], probs[j])
            if jsd > max_jsd:
                max_jsd = jsd

    return BitemporalAuditResult(
        signal_count=len(observations),
        weighted_prob=weighted_prob,
        min_freshness_weight=min(freshness_scores),
        max_pairwise_jsd=max_jsd,
        contradiction_flag=max_jsd > contradiction_jsd_threshold,
    )


def classify_phase_transition_regime(
    trajectory: Sequence[Sequence[float]],
    n_ref: int,
    ess: float,
    koopman_damping_ratio: float,
) -> PhaseTransitionRegimeResult:
    """Classify local regime via Barber ESS circuit breaker, Koopman damping, and Levy area."""
    if n_ref <= 0:
        raise ValueError("n_ref must be positive")
    if ess < 0.0:
        raise ValueError("ess must be non-negative")

    kernel_mod = _load_dual_use_kernel_module()
    barber_limit = float(
        getattr(kernel_mod, "BARBER_ESS_C_HAT_MAX", BARBER_C_HAT_ABSTAIN_THRESHOLD)
    )
    extractor_cls = kernel_mod.RoughPathSignatureExtractor

    arr = np.asarray(trajectory, dtype=np.float64)
    if arr.ndim != 2 or arr.shape[0] < 2 or arr.shape[1] < 2:
        raise ValueError("trajectory must be a 2D sequence with shape (T >= 2, D >= 2)")

    sig_res = extractor_cls.compute_signature(arr)
    circulation = float(np.linalg.norm(sig_res.levy_area_matrix))
    c_hat = float(n_ref) / max(float(ess), 1e-9)
    damping = float(koopman_damping_ratio)

    if ess <= 1.0 or c_hat > barber_limit:
        regime: RegimeLabel = "ESS_ABSTAIN"
    elif damping <= 0.12 or (c_hat > 8.5 and circulation >= 1.5):
        regime = "TAU3_REGIME_BREAK"
    elif damping <= 0.35 or c_hat > 5.0:
        regime = "TAU2_DECOUPLING_WATCH"
    else:
        regime = "TAU1_COMPENSATED"

    return PhaseTransitionRegimeResult(
        regime=regime,
        c_hat=c_hat,
        koopman_damping_ratio=damping,
        rough_path_circulation=circulation,
        abstain_triggered=(regime == "ESS_ABSTAIN"),
    )


def evaluate_autonomous_reasoning_decision(
    matchup_id: str,
    as_of_utc: str,
    market_devig_prob: float,
    observations: Sequence[SignalObservation],
    trajectory: Sequence[Sequence[float]],
    n_ref: int,
    ess: float,
    koopman_damping_ratio: float,
    min_devig_edge: float = DEFAULT_MIN_DEVIG_EDGE,
    contradiction_jsd_threshold: float = DEFAULT_CONTRADICTION_JSD_THRESHOLD,
) -> AutonomousReasoningDecision:
    """Execute full fail-closed multi-horizon reasoning arbitration over de-vigged baseline."""
    base_prob = _clamp_prob(market_devig_prob)
    audit = audit_bitemporal_signal_bundle(
        observations=observations,
        as_of_utc=as_of_utc,
        contradiction_jsd_threshold=contradiction_jsd_threshold,
    )
    regime_res = classify_phase_transition_regime(
        trajectory=trajectory,
        n_ref=n_ref,
        ess=ess,
        koopman_damping_ratio=koopman_damping_ratio,
    )

    base_logit = _logit(base_prob)
    raw_delta = _logit(audit.weighted_prob) - base_logit

    ess_ratio = (regime_res.c_hat - 1.0) / (2.0 * BARBER_C_HAT_ABSTAIN_THRESHOLD)
    ess_penalty = min(0.45, max(0.0, ess_ratio))
    jsd_penalty = min(0.50, audit.max_pairwise_jsd / max(contradiction_jsd_threshold, 1e-6) * 0.35)
    js_shrink = max(0.0, 1.0 - ess_penalty - jsd_penalty)
    shrunk_delta = raw_delta * js_shrink
    shrunk_delta = max(-MAX_ABS_DELTA_LOG_ODDS, min(MAX_ABS_DELTA_LOG_ODDS, shrunk_delta))

    model_prob = _sigmoid(base_logit + shrunk_delta)
    net_edge = model_prob - base_prob

    sign = 1.0 if net_edge >= 0.0 else -1.0
    shock_probs = {
        "injury_downgrade": _sigmoid(base_logit + shrunk_delta - 0.12 * sign) - base_prob,
        "weather_gust_shift": _sigmoid(base_logit + shrunk_delta - 0.08 * sign) - base_prob,
        "tempo_compression": _sigmoid(base_logit + shrunk_delta * 0.85) - base_prob,
        "vig_widening": model_prob - _clamp_prob(base_prob + 0.02 * sign),
        "covariate_ess_drop": _sigmoid(base_logit + shrunk_delta * 0.78) - base_prob,
    }
    aligned_edges = [edge * sign for edge in shock_probs.values()]
    worst_case_edge = min(aligned_edges) if aligned_edges else 0.0
    flipped_count = sum(1 for edge in aligned_edges if edge <= 0.0)
    fragility_ratio = float(flipped_count) / float(len(aligned_edges))

    if regime_res.abstain_triggered:
        verdict: DecisionVerdict = "PASS"
        reason_code = "ESS_ABSTAIN"
    elif audit.contradiction_flag:
        verdict = "PASS"
        reason_code = "CONTRADICTION_HOLD"
    elif regime_res.regime == "TAU3_REGIME_BREAK":
        verdict = "PASS"
        reason_code = "TAU3_REGIME_BREAK_HOLD"
    elif abs(net_edge) < min_devig_edge:
        verdict = "PASS"
        reason_code = "NO_DEVIG_EDGE"
    elif worst_case_edge <= 0.0 or fragility_ratio > 0.2:
        verdict = "PASS"
        reason_code = "COUNTERFACTUAL_FRAGILE"
    elif regime_res.regime == "TAU2_DECOUPLING_WATCH":
        verdict = "WATCH"
        reason_code = "TAU2_DECOUPLING_WATCH_HOLD"
    else:
        verdict = "PLAY"
        reason_code = "CONJUNCTION_CLEARED"

    hash_payload = {
        "matchup_id": matchup_id,
        "as_of_utc": as_of_utc,
        "verdict": verdict,
        "reason_code": reason_code,
        "market_devig_prob": round(base_prob, 8),
        "model_prob": round(model_prob, 8),
        "shrunk_delta_log_odds": round(shrunk_delta, 8),
        "net_devig_edge": round(net_edge, 8),
        "regime": regime_res.regime,
        "c_hat": round(regime_res.c_hat, 6),
        "max_pairwise_jsd": round(audit.max_pairwise_jsd, 8),
        "worst_case_edge": round(worst_case_edge, 8),
        "fragility_ratio": round(fragility_ratio, 6),
    }
    decision_hash = hashlib.sha256(
        json.dumps(hash_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    return AutonomousReasoningDecision(
        matchup_id=matchup_id,
        verdict=verdict,
        reason_code=reason_code,
        market_devig_prob=base_prob,
        model_prob=model_prob,
        shrunk_delta_log_odds=shrunk_delta,
        net_devig_edge=net_edge,
        regime=regime_res.regime,
        max_pairwise_jsd=audit.max_pairwise_jsd,
        worst_case_edge=worst_case_edge,
        fragility_ratio=fragility_ratio,
        clinical_to_sports_weight=CLINICAL_TO_SPORTS_WEIGHT,
        real_money_stake_cleared=REAL_MONEY_STAKE_CLEARED,
        live_stake_fraction=LIVE_STAKE_FRACTION,
        decision_hash=decision_hash,
    )
