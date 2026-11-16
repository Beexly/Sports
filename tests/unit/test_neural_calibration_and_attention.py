"""Unit tests for TensorFlow scaling, xFormers sparse snap attention, and GGML/XNNPACK."""

from __future__ import annotations

from gse_engine.compute.neural_calibration_and_attention import (
    QuantizedRuntimeSpec,
    apply_temperature_scaling,
    compute_windowed_snap_attention,
    validate_quantized_runtime,
)


def test_temperature_scaling_softens_overconfident_probabilities() -> None:
    """Verifies T > 1 pulls extreme confidence toward 0.5 and lowers Brier on noisy outcomes."""
    probs = [0.95, 0.92, 0.08, 0.90, 0.12]
    outcomes = [1, 0, 0, 1, 1]
    res = apply_temperature_scaling(probs, outcomes, temperature=1.8)
    assert res.calibrated_probs[0] < probs[0]
    assert res.calibrated_probs[2] > probs[2]
    assert res.brier_after < res.brier_before


def test_windowed_snap_attention_respects_radius_and_drive_globals() -> None:
    """Enforces normalized row sums and zeros outside radius + global tokens."""
    weights = compute_windowed_snap_attention(
        snap_scores=[0.2, 0.4, 0.1, 0.8, -0.2, 0.5],
        drive_boundary_indices=[0, 5],
        window_radius=1,
    )
    assert len(weights) == 6
    for row in weights:
        assert abs(sum(row) - 1.0) < 1e-4
    # Snap 2 attends to {0 (global), 1, 2, 3, 5 (global)}, never index 4.
    assert weights[2][4] == 0.0
    assert weights[2][0] > 0.0


def test_quantized_runtime_blocks_paid_cloud_gpu() -> None:
    """Rejects paid GPU allocations while approving bounded local GGML/XNNPACK specs."""
    ok, msg = validate_quantized_runtime(
        QuantizedRuntimeSpec(
            model_name="mimo-workhorse-q4",
            quant_format="Q4_K_M",
            xnnpack_threads=8,
            context_length=4096,
        )
    )
    assert ok is True
    assert msg == "ok"

    bad_ok, bad_msg = validate_quantized_runtime(
        QuantizedRuntimeSpec(
            model_name="cloud-a100",
            quant_format="FP16",
            xnnpack_threads=8,
            context_length=8192,
            paid_cloud_gpu=True,
        )
    )
    assert bad_ok is False
    assert bad_msg == "paid_cloud_gpu_forbidden_for_workhorse"
