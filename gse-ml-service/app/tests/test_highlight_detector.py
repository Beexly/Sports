"""Tests for the film highlight detector.

The load-bearing property is the **fusion rule**: a highlight exists only when
an energy spike AND a commentary cue co-occur within 15 seconds. Shape-only
tests would not catch a detector that emits highlights from cues alone (noisy
transcripts) or from spikes alone (crowd noise). The synthetic spike+cue test
and the flat-audio test pin both directions of that AND.

External deps: FFmpeg and Whisper are NOT installed in CI and must NOT be
required to run these tests. The pure kernels take injected arrays/segments;
the dependency probes are exercised by forcing their lookups to fail.

All randomness is explicit (``numpy.random.default_rng`` with a fixed seed).
"""

from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
import pytest

from app.models.highlight_detector import (
    CUE_WINDOW_S,
    PADDING_S,
    AudioExtractor,
    FilmDependencyError,
    FfmpegAudioExtractor,
    TranscriptSegment,
    Transcriber,
    WhisperTranscriber,
    assemble_highlights,
    detect_energy_spikes,
    detect_highlights,
    match_cue,
    require_ffmpeg,
    require_whisper,
    short_time_energy,
)

SAMPLE_RATE = 16_000


# ---------------------------------------------------------------------------
# Helpers: synthetic audio and injected backends
# ---------------------------------------------------------------------------


def make_flat_audio(duration_s: float = 30.0, level: float = 0.01) -> np.ndarray:
    """Constant-amplitude mono audio. Energy is perfectly flat (std == 0)."""
    n = int(duration_s * SAMPLE_RATE)
    return np.full(n, level, dtype=np.float64)


def make_audio_with_spikes(
    duration_s: float = 20.0,
    spike_times_s: tuple[float, ...] = (10.0,),
    spike_duration_s: float = 0.4,
    base_level: float = 0.01,
    spike_level: float = 0.9,
    seed: int = 7,
) -> np.ndarray:
    """Low-level noise plus loud bursts at the requested times."""
    rng = np.random.default_rng(seed)
    n = int(duration_s * SAMPLE_RATE)
    samples = base_level * rng.standard_normal(n)
    burst = int(spike_duration_s * SAMPLE_RATE)
    for t in spike_times_s:
        start = int(t * SAMPLE_RATE)
        end = min(n, start + burst)
        if start < n:
            samples[start:end] = spike_level * rng.standard_normal(end - start)
    return samples


class StubExtractor:
    """Injected AudioExtractor returning a prepared array."""

    def __init__(self, samples: np.ndarray, sample_rate: int = SAMPLE_RATE) -> None:
        self._samples = samples
        self._sample_rate = sample_rate
        self.calls = 0

    def extract_mono(self, video_path: Path) -> tuple[np.ndarray, int]:
        self.calls += 1
        return self._samples, self._sample_rate


class StubTranscriber:
    """Injected Transcriber returning prepared segments."""

    def __init__(self, segments: list[TranscriptSegment]) -> None:
        self._segments = segments
        self.calls = 0

    def transcribe(self, samples: np.ndarray, sample_rate: int) -> list[TranscriptSegment]:
        self.calls += 1
        return list(self._segments)


# ---------------------------------------------------------------------------
# 1. Synthetic spike + cue -> exactly one TD highlight
# ---------------------------------------------------------------------------


def test_synthetic_spike_plus_touchdown_cue_yields_one_td_highlight() -> None:
    """A loud energy burst near a 'touchdown' cue produces exactly one TD window."""
    spike_t = 10.0
    samples = make_audio_with_spikes(duration_s=20.0, spike_times_s=(spike_t,))
    segments = [TranscriptSegment(t_start=10.5, t_end=12.0, text="and he takes it in for a touchdown")]
    extractor: AudioExtractor = StubExtractor(samples)
    transcriber: Transcriber = StubTranscriber(segments)

    highlights = detect_highlights(
        "game.mp4",
        audio_extractor=extractor,
        transcriber=transcriber,
    )

    assert len(highlights) == 1
    row = highlights[0]
    assert row["type"] == "TD"
    cue_t = 0.5 * (10.5 + 12.0)
    # The detected spike time is the peak frame inside the burst, which can
    # sit anywhere in [spike_t, spike_t + spike_duration). The window must
    # cover BOTH the burst and the cue with ~5s of padding on each side.
    assert row["tStart"] <= spike_t + 0.5
    assert row["tEnd"] >= cue_t
    span_start = row["tStart"] + PADDING_S
    span_end = row["tEnd"] - PADDING_S
    assert span_start <= spike_t + 0.5
    assert span_end >= cue_t - 0.05
    assert row["tEnd"] - row["tStart"] >= (span_end - span_start) + 2 * PADDING_S - 0.05
    assert 0.0 < row["confidence"] <= 1.0
    assert extractor.calls == 1
    assert transcriber.calls == 1


def test_cue_without_spike_and_spike_without_cue_yield_empty() -> None:
    """The AND rule works in both directions: neither signal alone is enough."""
    spike_t = 10.0
    samples = make_audio_with_spikes(duration_s=20.0, spike_times_s=(spike_t,))

    # Cue only, flat audio.
    cue_only = detect_highlights(
        "game.mp4",
        audio_extractor=StubExtractor(make_flat_audio(20.0)),
        transcriber=StubTranscriber(
            [TranscriptSegment(t_start=10.0, t_end=11.0, text="touchdown! what a play")]
        ),
    )
    assert cue_only == []

    # Spike only, no cue.
    spike_only = detect_highlights(
        "game.mp4",
        audio_extractor=StubExtractor(samples),
        transcriber=StubTranscriber(
            [TranscriptSegment(t_start=10.0, t_end=11.0, text="second and six from the forty")]
        ),
    )
    assert spike_only == []


def test_spike_and_cue_beyond_window_do_not_match() -> None:
    """A spike and a cue further apart than CUE_WINDOW_S must not fuse."""
    samples = make_audio_with_spikes(duration_s=60.0, spike_times_s=(5.0,))
    far_cue_t = 5.0 + CUE_WINDOW_S + 2.0
    highlights = detect_highlights(
        "game.mp4",
        audio_extractor=StubExtractor(samples),
        transcriber=StubTranscriber(
            [TranscriptSegment(t_start=far_cue_t, t_end=far_cue_t + 1.0, text="touchdown")]
        ),
    )
    assert highlights == []


# ---------------------------------------------------------------------------
# 2. Flat audio -> [] (no fabricated spikes)
# ---------------------------------------------------------------------------


def test_flat_audio_with_and_without_cues_yields_no_highlights() -> None:
    """Constant energy produces zero spikes, hence zero highlights."""
    times, energies = short_time_energy(make_flat_audio(60.0), SAMPLE_RATE)
    spikes = detect_energy_spikes(times, energies)
    assert spikes == []

    highlights = detect_highlights(
        "game.mp4",
        audio_extractor=StubExtractor(make_flat_audio(60.0)),
        transcriber=StubTranscriber(
            [TranscriptSegment(t_start=30.0, t_end=31.0, text="touchdown, his third of the day")]
        ),
    )
    assert highlights == []


def test_short_time_energy_is_flat_for_flat_audio() -> None:
    """Flat amplitude -> zero energy variance; spike detector stays silent."""
    samples = make_flat_audio(10.0, level=0.05)
    times, energies = short_time_energy(samples, SAMPLE_RATE)
    assert times.shape == energies.shape
    assert energies.shape[0] > 100
    assert float(energies.std()) == pytest.approx(0.0, abs=1e-12)
    assert detect_energy_spikes(times, energies) == []


# ---------------------------------------------------------------------------
# 3. INT phrase containing "end zone" prefers INT
# ---------------------------------------------------------------------------


def test_int_phrase_containing_end_zone_is_classified_int() -> None:
    """'intercepted in the end zone' is an INT, not a TD — INT cues win."""
    assert match_cue("intercepted in the end zone for a pick six") == ("INT", 3)
    assert match_cue("PICK SIX in the end zone!") == ("INT", 2)
    assert match_cue("and he is intercepted at the goal line") == ("INT", 1)


def test_end_zone_alone_is_td() -> None:
    """'end zone' without an INT cue is a TD cue."""
    assert match_cue("walks into the end zone untouched") == ("TD", 1)
    assert match_cue("Touchdown, Kansas City!") == ("TD", 1)
    assert match_cue("third and four from the twenty") == (None, 0)


def test_spike_with_int_phrase_containing_end_zone_yields_int_highlight() -> None:
    """End-to-end: co-located spike + 'intercepted in the end zone' -> type INT."""
    spike_t = 10.0
    samples = make_audio_with_spikes(duration_s=20.0, spike_times_s=(spike_t,))
    segments = [
        TranscriptSegment(
            t_start=10.2,
            t_end=11.5,
            text="intercepted in the end zone — that is a pick six!",
        )
    ]
    highlights = detect_highlights(
        "game.mp4",
        audio_extractor=StubExtractor(samples),
        transcriber=StubTranscriber(segments),
    )
    assert len(highlights) == 1
    assert highlights[0]["type"] == "INT"


def test_cooccurring_td_and_int_cues_prefer_int() -> None:
    """When both cue families land on the same spike, INT claims it."""
    highlights = assemble_highlights(
        spike_times=[10.0],
        spike_zs=[5.0],
        segments=[
            TranscriptSegment(t_start=10.0, t_end=10.8, text="touchdown on the return"),
            TranscriptSegment(t_start=10.4, t_end=11.2, text="intercepted at the five"),
        ],
    )
    assert len(highlights) == 1
    assert highlights[0]["type"] == "INT"

    # Same spike, TD cue listed first in the input must still lose to INT.
    highlights_rev = assemble_highlights(
        spike_times=[10.0],
        spike_zs=[5.0],
        segments=[
            TranscriptSegment(t_start=10.4, t_end=11.2, text="intercepted at the five"),
            TranscriptSegment(t_start=10.0, t_end=10.8, text="touchdown on the return"),
        ],
    )
    assert len(highlights_rev) == 1
    assert highlights_rev[0]["type"] == "INT"


# ---------------------------------------------------------------------------
# 4. Missing Whisper / FFmpeg -> clear failure, never fabricated output
# ---------------------------------------------------------------------------


def test_require_ffmpeg_fails_clearly_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """No ffmpeg on PATH raises FilmDependencyError with the dependency named."""
    monkeypatch.setattr(shutil, "which", lambda name: None)
    with pytest.raises(FilmDependencyError) as excinfo:
        require_ffmpeg()
    assert excinfo.value.dependency == "FFmpeg"
    assert "ffmpeg" in str(excinfo.value).lower()
    assert "refusing to fabricate" in str(excinfo.value)


def test_require_whisper_fails_clearly_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unimportable whisper raises FilmDependencyError, not a silent empty list."""
    import builtins

    real_import = builtins.__import__

    def blocked_import(name: str, *args: object, **kwargs: object) -> object:
        if name == "whisper" or name.startswith("whisper."):
            raise ImportError("No module named 'whisper'")
        return real_import(name, *args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(builtins, "__import__", blocked_import)
    with pytest.raises(FilmDependencyError) as excinfo:
        require_whisper()
    assert excinfo.value.dependency == "Whisper"
    assert "refusing to fabricate" in str(excinfo.value)


def test_detect_highlights_fails_closed_when_ffmpeg_missing(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Default (non-injected) path must not invent highlights without FFmpeg."""
    monkeypatch.setattr(shutil, "which", lambda name: None)
    video = tmp_path / "game.mp4"
    video.write_bytes(b"not a real video")
    with pytest.raises(FilmDependencyError) as excinfo:
        detect_highlights(video)
    assert excinfo.value.dependency == "FFmpeg"


def test_detect_highlights_fails_closed_when_whisper_missing(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Default transcriber must fail clearly when whisper cannot be imported."""
    import builtins

    real_import = builtins.__import__

    def blocked_import(name: str, *args: object, **kwargs: object) -> object:
        if name == "whisper" or name.startswith("whisper."):
            raise ImportError("No module named 'whisper'")
        return real_import(name, *args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(builtins, "__import__", blocked_import)

    samples = make_audio_with_spikes(5.0, spike_times_s=(2.0,))
    extractor: AudioExtractor = StubExtractor(samples)
    with pytest.raises(FilmDependencyError) as excinfo:
        detect_highlights("game.mp4", audio_extractor=extractor, transcriber=None)
    assert excinfo.value.dependency == "Whisper"


def test_ffmpeg_extractor_probe_raises_without_binary(monkeypatch: pytest.MonkeyPatch) -> None:
    """The real extractor consults the dependency probe before touching a file."""
    monkeypatch.setattr(shutil, "which", lambda name: None)
    with pytest.raises(FilmDependencyError):
        FfmpegAudioExtractor().extract_mono(Path("missing.mp4"))


def test_whisper_transcriber_probe_raises_without_package(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The real transcriber consults the dependency probe before loading a model."""
    import builtins

    real_import = builtins.__import__

    def blocked_import(name: str, *args: object, **kwargs: object) -> object:
        if name == "whisper" or name.startswith("whisper."):
            raise ImportError("No module named 'whisper'")
        return real_import(name, *args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(builtins, "__import__", blocked_import)
    with pytest.raises(FilmDependencyError):
        WhisperTranscriber().transcribe(np.zeros(1600, dtype=np.float64), SAMPLE_RATE)


# ---------------------------------------------------------------------------
# Kernel edge cases
# ---------------------------------------------------------------------------


def test_short_time_energy_rejects_bad_shapes() -> None:
    with pytest.raises(ValueError):
        short_time_energy(np.zeros((10, 2)), SAMPLE_RATE)
    with pytest.raises(ValueError):
        short_time_energy(np.zeros(10), 0)


def test_assemble_highlights_rejects_mismatched_spike_arrays() -> None:
    with pytest.raises(ValueError):
        assemble_highlights([1.0], [], [])


def test_highlights_are_time_sorted_and_padded() -> None:
    """Multiple matches come back ordered by tStart with 5s padding applied."""
    rows = assemble_highlights(
        spike_times=[20.0, 5.0],
        spike_zs=[4.0, 6.0],
        segments=[
            TranscriptSegment(t_start=20.0, t_end=21.0, text="interception"),
            TranscriptSegment(t_start=5.0, t_end=6.0, text="touchdown"),
        ],
    )
    assert [r["type"] for r in rows] == ["TD", "INT"]
    assert rows[0]["tStart"] < rows[1]["tStart"]
    for row in rows:
        assert row["tEnd"] > row["tStart"]
        assert row["confidence"] <= 1.0
