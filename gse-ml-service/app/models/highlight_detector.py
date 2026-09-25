"""Audio/commentary highlight detector.

The module is intentionally dependency-light at import time. FFmpeg is invoked
for audio extraction, while Whisper is loaded lazily so a deployment without the
model still exposes a clear error rather than silently returning fabricated
highlights. The pure ``detect_from_features`` kernel is what the unit tests and
callers can use without a film source.
"""

from __future__ import annotations

import math
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Protocol, Sequence

CUE_PATTERNS: dict[str, tuple[str, ...]] = {
    "TD": ("touchdown", "end zone", "endzone", "score!"),
    "INT": ("intercepted", "interception", "pick six", "picked off"),
}
CUE_WINDOW_SECONDS = 15.0
TRAILING_WINDOW_SECONDS = 5 * 60.0
SPIKE_SIGMA = 3.0
CLIP_PADDING_SECONDS = 5.0


@dataclass(frozen=True)
class EnergyFrame:
    time: float
    energy: float


@dataclass(frozen=True)
class TranscriptCue:
    start: float
    end: float
    text: str


@dataclass(frozen=True)
class Highlight:
    tStart: float
    tEnd: float
    type: str
    confidence: float


class Transcriber(Protocol):
    def transcribe(self, audio_path: str) -> Sequence[TranscriptCue]: ...


def cue_type(text: str) -> str | None:
    normalized = re.sub(r"[^a-z0-9 ]+", " ", text.lower())
    # Check interception language first: a defensive interception can be
    # followed by "end zone" in a pick-six phrase, which must not be relabeled
    # as an ordinary offensive touchdown.
    for kind, phrases in CUE_PATTERNS.items():
        if kind == "INT" and any(phrase in normalized for phrase in phrases):
            return kind
    for kind, phrases in CUE_PATTERNS.items():
        if kind == "TD" and any(phrase in normalized for phrase in phrases):
            return kind
    return None


def trailing_spike_flags(
    frames: Sequence[EnergyFrame],
    trailing_window_seconds: float = TRAILING_WINDOW_SECONDS,
    sigma: float = SPIKE_SIGMA,
) -> list[float]:
    """Flag energy values above mean + sigma*SD of the trailing window."""
    if not frames:
        return []
    flags: list[float] = []
    for index, frame in enumerate(frames):
        history = [item.energy for item in frames[:index] if frame.time - item.time <= trailing_window_seconds]
        if len(history) < 2:
            continue
        mean = sum(history) / len(history)
        variance = sum((value - mean) ** 2 for value in history) / len(history)
        deviation = math.sqrt(variance)
        # A perfectly flat trailing window has zero empirical variance. Treat
        # that as a near-zero floor rather than silently making every later
        # increase undetectable; the cue gate still requires a real transcript
        # co-occurrence before a highlight is emitted.
        floor = max(abs(mean) * 1e-9, 1e-9)
        if frame.energy > mean + sigma * max(deviation, floor):
            flags.append(frame.time)
    return flags


def detect_from_features(
    frames: Sequence[EnergyFrame],
    cues: Sequence[TranscriptCue],
) -> list[Highlight]:
    """Co-occur a cue with a nearby audio spike, then pad the clip window."""
    spikes = trailing_spike_flags(frames)
    results: list[Highlight] = []
    for cue in cues:
        kind = cue_type(cue.text)
        if kind is None:
            continue
        nearby = [spike for spike in spikes if abs(spike - cue.start) <= CUE_WINDOW_SECONDS]
        if not nearby:
            continue
        closest = min(nearby, key=lambda spike: abs(spike - cue.start))
        distance = abs(closest - cue.start)
        confidence = max(0.0, min(1.0, 1.0 - distance / CUE_WINDOW_SECONDS))
        results.append(
            Highlight(
                tStart=max(0.0, cue.start - CLIP_PADDING_SECONDS),
                tEnd=cue.end + CLIP_PADDING_SECONDS,
                type=kind,
                confidence=round(confidence, 6),
            )
        )
    return sorted(results, key=lambda item: (item.tStart, item.type))


def extract_audio(video_path: str, ffmpeg_path: str = "ffmpeg") -> tuple[str, int]:
    """Extract mono PCM16 audio and return ``(path, sample_rate)``."""
    if shutil.which(ffmpeg_path) is None:
        raise RuntimeError("ffmpeg is required for highlight detection")
    suffix = Path(video_path).suffix.lower()
    if suffix not in {".mp4", ".mov", ".mkv", ".webm"}:
        raise ValueError("video_path must be a supported video file")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as output:
        audio_path = output.name
    command = [
        ffmpeg_path, "-y", "-i", video_path, "-vn", "-ac", "1", "-ar", "16000",
        "-c:a", "pcm_s16le", audio_path,
    ]
    try:
        subprocess.run(command, check=True, capture_output=True)
    except Exception:
        Path(audio_path).unlink(missing_ok=True)
        raise
    return audio_path, 16_000


def energy_envelope_from_pcm16(path: str, sample_rate: int, frame_ms: int = 100) -> list[EnergyFrame]:
    import struct

    raw = Path(path).read_bytes()
    samples = struct.unpack(f"<{len(raw) // 2}h", raw[: len(raw) - len(raw) % 2])
    frame_size = max(1, int(sample_rate * frame_ms / 1000))
    frames: list[EnergyFrame] = []
    for start in range(0, len(samples), frame_size):
        chunk = samples[start : start + frame_size]
        if not chunk:
            continue
        energy = sum(float(value) * float(value) for value in chunk) / len(chunk)
        frames.append(EnergyFrame(time=(start + len(chunk) / 2) / sample_rate, energy=math.sqrt(energy)))
    return frames


def whisper_transcriber(model_name: str = "base") -> Transcriber:
    try:
        import whisper  # type: ignore
    except ImportError as exc:  # pragma: no cover - depends on deployment image
        raise RuntimeError("whisper is required for commentary transcription") from exc

    class WhisperTranscriber:
        def transcribe(self, audio_path: str) -> Sequence[TranscriptCue]:
            model = whisper.load_model(model_name)
            result = model.transcribe(audio_path)
            return [
                TranscriptCue(float(segment["start"]), float(segment["end"]), str(segment["text"]))
                for segment in result.get("segments", [])
            ]

    return WhisperTranscriber()


def detect_highlights(video_path: str, transcriber: Transcriber | None = None) -> list[dict[str, object]]:
    audio_path, sample_rate = extract_audio(video_path)
    try:
        frames = energy_envelope_from_pcm16(audio_path, sample_rate)
        cues = (transcriber or whisper_transcriber()).transcribe(audio_path)
        return [highlight.__dict__ for highlight in detect_from_features(frames, cues)]
    finally:
        Path(audio_path).unlink(missing_ok=True)


__all__ = [
    "CUE_WINDOW_SECONDS",
    "EnergyFrame",
    "Highlight",
    "TranscriptCue",
    "cue_type",
    "detect_from_features",
    "detect_highlights",
    "energy_envelope_from_pcm16",
    "extract_audio",
    "trailing_spike_flags",
    "whisper_transcriber",
]
