from __future__ import annotations

import pytest

from app.models.highlight_detector import EnergyFrame, TranscriptCue, detect_from_features, trailing_spike_flags


def test_synthetic_spike_and_cue_returns_one_padded_highlight() -> None:
    frames = [EnergyFrame(i * 0.5, 1.0) for i in range(20)]
    frames[10] = EnergyFrame(5.0, 20.0)
    result = detect_from_features(frames, [TranscriptCue(6.0, 7.0, "Touchdown in the end zone")])
    assert len(result) == 1
    assert result[0].type == "TD"
    assert result[0].tStart == 1.0
    assert result[0].tEnd == 12.0
    assert 0 < result[0].confidence <= 1


def test_flat_audio_and_non_cue_transcript_return_empty() -> None:
    frames = [EnergyFrame(i, 2.0) for i in range(30)]
    assert detect_from_features(frames, [TranscriptCue(2, 3, "quarterback drops back")]) == []


def test_int_cue_is_typed_separately() -> None:
    frames = [EnergyFrame(i * 0.5, 1.0) for i in range(20)]
    frames[10] = EnergyFrame(5.0, 20.0)
    result = detect_from_features(frames, [TranscriptCue(6, 7, "intercepted in the end zone")])
    assert result[0].type == "INT"


def test_spike_requires_a_cue() -> None:
    frames = [EnergyFrame(i * 0.5, 1.0) for i in range(20)]
    frames[10] = EnergyFrame(5.0, 20.0)
    assert trailing_spike_flags(frames) == [5.0]
    assert detect_from_features(frames, []) == []
