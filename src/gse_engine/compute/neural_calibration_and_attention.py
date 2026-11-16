"""TensorFlow temperature scaling, xFormers block-sparse attention, and GGUF/XNNPACK specs."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

QuantFormat = Literal["Q4_K_M", "Q8_0", "FP16"]


@dataclass(frozen=True, slots=True)
class TemperatureScalingResult:
    """Calibrated probability output under fixed post-hoc logit temperature scaling."""

    calibrated_probs: tuple[float, ...]
    temperature: float
    brier_before: float
    brier_after: float


@dataclass(frozen=True, slots=True)
class QuantizedRuntimeSpec:
    """Workhorse quantized inference runtime profile (GGML + XNNPACK)."""

    model_name: str
    quant_format: QuantFormat
    xnnpack_threads: int
    context_length: int
    paid_cloud_gpu: bool = False


def _clamp_prob(p: float) -> float:
    return max(1e-5, min(1.0 - 1e-5, p))


def _logit(p: float) -> float:
    c = _clamp_prob(p)
    return math.log(c / (1.0 - c))


def _sigmoid(z: float) -> float:
    if z >= 0.0:
        return 1.0 / (1.0 + math.exp(-z))
    ez = math.exp(z)
    return ez / (1.0 + ez)


def apply_temperature_scaling(
    probs: Sequence[float],
    outcomes: Sequence[int],
    temperature: float = 1.15,
) -> TemperatureScalingResult:
    """Applies logit temperature scaling p' = sigmoid(logit(p) / T) for calibration R&D."""
    if temperature <= 0.0:
        raise ValueError("temperature must be strictly positive.")
    if len(probs) != len(outcomes):
        raise ValueError("probs and outcomes must have equal length.")
    if not probs:
        return TemperatureScalingResult(
            calibrated_probs=(),
            temperature=temperature,
            brier_before=0.0,
            brier_after=0.0,
        )

    calibrated: list[float] = []
    brier_raw = 0.0
    brier_cal = 0.0
    n = len(probs)

    for raw_p, y in zip(probs, outcomes, strict=True):
        p = _clamp_prob(raw_p)
        target = 1.0 if y == 1 else 0.0
        cal_p = round(_sigmoid(_logit(p) / temperature), 6)
        calibrated.append(cal_p)
        brier_raw += (p - target) ** 2
        brier_cal += (cal_p - target) ** 2

    return TemperatureScalingResult(
        calibrated_probs=tuple(calibrated),
        temperature=temperature,
        brier_before=round(brier_raw / n, 6),
        brier_after=round(brier_cal / n, 6),
    )


def compute_windowed_snap_attention(
    snap_scores: Sequence[float],
    drive_boundary_indices: Sequence[int],
    window_radius: int = 4,
) -> list[list[float]]:
    """Computes xFormers-style sliding-window + global drive-boundary attention weights."""
    n = len(snap_scores)
    if n == 0:
        return []
    if window_radius < 0:
        raise ValueError("window_radius must be non-negative.")

    globals_set = {idx for idx in drive_boundary_indices if 0 <= idx < n}
    matrix: list[list[float]] = []

    for i in range(n):
        active_indices = {
            j
            for j in range(n)
            if abs(j - i) <= window_radius or j in globals_set
        }
        logits = {j: snap_scores[j] - 0.05 * abs(j - i) for j in active_indices}
        max_logit = max(logits.values())
        exps = {j: math.exp(val - max_logit) for j, val in logits.items()}
        denom = sum(exps.values())
        row = [round(exps.get(j, 0.0) / denom, 6) for j in range(n)]
        matrix.append(row)

    return matrix


def validate_quantized_runtime(spec: QuantizedRuntimeSpec) -> tuple[bool, str]:
    """Validates local GGML/XNNPACK CPU workhorse runtime against Zero-Waste policy."""
    if spec.paid_cloud_gpu:
        return False, "paid_cloud_gpu_forbidden_for_workhorse"
    if not 1 <= spec.xnnpack_threads <= 16:
        return False, "xnnpack_threads_out_of_range"
    if spec.context_length < 512:
        return False, "context_length_too_small"
    return True, "ok"
