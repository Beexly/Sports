"""Highlight detection from broadcast film: energy spikes + commentary cues.

What this module IS
-------------------
A deterministic highlight detector that fuses two signals from a video file:

1. **Short-time energy spikes** in the mono audio track. Audio is extracted with
   FFmpeg (16 kHz mono PCM); short-time energy is computed on fixed frames; a
   frame is a spike when its energy exceeds ``mean + 3σ`` of the trailing
   5-minute window of frame energies.
2. **Commentary cues** transcribed with Whisper. Cue phrases are
   ``touchdown``, ``end zone`` (TD) and ``intercepted``, ``interception``,
   ``pick six`` (INT).

A highlight requires **both** a spike **and** a cue within 15 seconds of each
other. When both an INT cue and a TD cue co-occur near the same spike, the INT
cue wins (pick-sixes are the rarer, higher-value event and "end zone" alone
would otherwise mislabel them as a generic touchdown).

Output rows are ``{"tStart", "tEnd", "type": "TD"|"INT", "confidence"}`` with
5 seconds of padding on each side of the matched spike/cue span.

What this module IS NOT
-----------------------
* It is **not** a play classifier, a win-probability model, or a calibrated
  probability. ``confidence`` is a heuristic blend of cue multiplicity and
  spike z-score — it is a ranking aid, not a success rate. Do not publish it
  as a probability.
* It does **not** invent highlights. Every path that cannot positively observe
  audio or transcript raises :class:`FilmDependencyError` (or returns ``[]``
  when the signal is genuinely flat). Missing FFmpeg/Whisper never yields a
  fabricated list of plays.

Dependency contract
-------------------
FFmpeg and Whisper are external, optional at import time and **required** at
detection time. :func:`require_ffmpeg` / :func:`require_whisper` raise
:class:`FilmDependencyError` with an actionable message when the tool is
absent. The pure kernels (:func:`short_time_energy`, :func:`detect_energy_spikes`,
:func:`match_cue`, :func:`assemble_highlights`) run on injected arrays and
transcripts and never touch either dependency — that is the unit-test surface.

Injection
---------
``detect_highlights`` accepts an ``audio_extractor`` and a ``transcriber`` so
tests (and future alternative backends) can supply observed data without
FFmpeg/Whisper. The default extractor/transcriber are the real FFmpeg/Whisper
implementations and fail closed when those tools are missing.
"""

from __future__ import annotations

import math
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal, Protocol, Sequence, TypedDict

import numpy as np

__all__ = [
    "AudioExtractor",
    "FilmDependencyError",
    "HighlightDict",
    "TranscriptSegment",
    "Transcriber",
    "assemble_highlights",
    "detect_energy_spikes",
    "detect_highlights",
    "match_cue",
    "require_ffmpeg",
    "require_whisper",
    "short_time_energy",
]

# ── Tunables (documented constants; not calibrated parameters) ─────────────────

#: A frame is a spike when energy > trailing_mean + SIGMA * trailing_std.
SPIKE_SIGMA = 3.0
#: Trailing window used for the spike baseline (5 minutes).
TRAILING_WINDOW_S = 300.0
#: Minimum trailing frames required before a spike can be declared.
MIN_TRAILING_FRAMES = 20
#: Frame length for short-time energy, in seconds.
FRAME_S = 0.02
#: A spike and a cue must be within this many seconds of each other.
CUE_WINDOW_S = 15.0
#: Padding applied on each side of the matched span in the output window.
PADDING_S = 5.0
#: Sample rate requested from FFmpeg.
TARGET_SAMPLE_RATE = 16_000

TD_CUE_PHRASES: tuple[str, ...] = ("touchdown", "end zone")
INT_CUE_PHRASES: tuple[str, ...] = ("intercepted", "interception", "pick six")


# ── Errors ─────────────────────────────────────────────────────────────────────


class FilmDependencyError(RuntimeError):
    """Raised when FFmpeg or Whisper is unavailable.

    Distinct from an empty result: an empty result means "the signal was
    observed and contained no highlight"; this error means "the signal could
    not be observed at all". Never substitute fabricated output for either.
    """

    def __init__(self, dependency: str, detail: str) -> None:
        super().__init__(f"{dependency} unavailable: {detail}")
        self.dependency = dependency
        self.detail = detail


# ── Public data shapes ─────────────────────────────────────────────────────────


class HighlightDict(TypedDict):
    """A single highlight window. Keys are the public camelCase contract."""

    tStart: float
    tEnd: float
    type: Literal["TD", "INT"]
    confidence: float


@dataclass(frozen=True)
class TranscriptSegment:
    """One Whisper segment with absolute time bounds in seconds."""

    t_start: float
    t_end: float
    text: str


class AudioExtractor(Protocol):
    """Injected audio source. Must return mono float samples + sample rate."""

    def extract_mono(self, video_path: Path) -> tuple[np.ndarray, int]:
        """Return ``(samples, sample_rate)``. ``samples`` is 1-D float mono."""
        ...


class Transcriber(Protocol):
    """Injected speech-to-text source. Must return timed transcript segments."""

    def transcribe(self, samples: np.ndarray, sample_rate: int) -> list[TranscriptSegment]:
        """Return timed segments covering the supplied mono audio."""
        ...


# ── Dependency probes ──────────────────────────────────────────────────────────


def require_ffmpeg() -> str:
    """Return the ffmpeg executable path, or raise :class:`FilmDependencyError`."""
    path = shutil.which("ffmpeg")
    if not path:
        raise FilmDependencyError(
            "FFmpeg",
            "ffmpeg executable not found on PATH. FFmpeg is required to extract "
            "mono audio from film; refusing to fabricate highlight output from "
            "an unobserved audio track.",
        )
    return path


def require_whisper() -> Callable[..., object]:
    """Return the ``whisper`` module, or raise :class:`FilmDependencyError`."""
    try:
        import whisper  # type: ignore[import-not-found]
    except ImportError as exc:
        raise FilmDependencyError(
            "Whisper",
            "the 'whisper' package is not importable. Whisper is required to "
            "transcribe commentary cues; refusing to fabricate highlight output "
            "from an unobserved transcript.",
        ) from exc
    return whisper


# ── Pure kernels (no FFmpeg / Whisper / filesystem) ────────────────────────────


def short_time_energy(
    samples: np.ndarray,
    sample_rate: int,
    frame_s: float = FRAME_S,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute per-frame short-time energy.

    Returns ``(frame_times, frame_energies)`` where ``frame_times[i]`` is the
    midpoint of frame ``i`` in seconds and ``frame_energies[i]`` is the mean
    squared amplitude of that frame. Short input (shorter than one frame)
    yields empty arrays — never a synthetic curve.
    """
    if sample_rate <= 0:
        raise ValueError(f"sample_rate must be positive, got {sample_rate}")
    if frame_s <= 0:
        raise ValueError(f"frame_s must be positive, got {frame_s}")
    if samples.ndim != 1:
        raise ValueError(f"samples must be 1-D mono, got shape {samples.shape}")

    frame_len = max(1, int(round(frame_s * sample_rate)))
    n_frames = len(samples) // frame_len
    if n_frames == 0:
        empty = np.zeros(0, dtype=np.float64)
        return empty, empty.copy()

    framed = samples[: n_frames * frame_len].reshape(n_frames, frame_len).astype(np.float64)
    energies = np.mean(framed * framed, axis=1)
    times = (np.arange(n_frames, dtype=np.float64) + 0.5) * (frame_len / float(sample_rate))
    return times, energies


def detect_energy_spikes(
    frame_times: np.ndarray,
    frame_energies: np.ndarray,
    *,
    sigma: float = SPIKE_SIGMA,
    trailing_window_s: float = TRAILING_WINDOW_S,
    min_trailing_frames: int = MIN_TRAILING_FRAMES,
) -> list[tuple[float, float]]:
    """Flag energy spikes above the trailing-window mean by ``sigma`` σ.

    For frame ``i`` at time ``t`` the baseline is the mean/std of
    ``frame_energies`` over ``[t - trailing_window_s, t)`` (the current frame
    is excluded). A spike is returned as ``(t, z)`` where ``z`` is the
    number of trailing standard deviations above the mean (``0.0`` when the
    trailing std is zero but the frame is strictly above the mean).

    Flat trailing audio (std == 0 and energy == mean) produces **no** spikes.
    Frames without enough trailing history are skipped, not guessed.
    """
    if frame_times.shape != frame_energies.shape:
        raise ValueError("frame_times and frame_energies must have the same shape")
    if frame_times.ndim != 1:
        raise ValueError("frame_times/frame_energies must be 1-D")

    spikes: list[tuple[float, float]] = []
    n = int(frame_times.shape[0])
    for i in range(n):
        t = float(frame_times[i])
        lo = int(np.searchsorted(frame_times, t - trailing_window_s, side="left"))
        if i - lo < min_trailing_frames:
            continue
        window = frame_energies[lo:i]
        mean = float(window.mean())
        std = float(window.std())
        energy = float(frame_energies[i])
        if std > 0.0:
            z = (energy - mean) / std
            if z > sigma:
                spikes.append((t, float(z)))
        else:
            # Degenerate flat baseline: strictly above the mean counts as
            # exceeding mean + sigma*0, and is reported with z=0.0 rather than
            # an infinite z-score (no division by zero, no fake precision).
            if energy > mean:
                spikes.append((t, 0.0))
    return spikes


def match_cue(text: str) -> tuple[Literal["TD", "INT"] | None, int]:
    """Classify a transcript fragment as a TD cue, an INT cue, or neither.

    INT wins whenever both families are present in the same fragment: a
    "pick six in the end zone" is an interception, not a generic touchdown.
    Returns ``(type, n_phrase_hits)``; ``n_phrase_hits`` counts every matched
    phrase across both families (used only as a confidence signal).
    """
    lower = text.lower()
    int_hits = sum(1 for phrase in INT_CUE_PHRASES if phrase in lower)
    td_hits = sum(1 for phrase in TD_CUE_PHRASES if phrase in lower)
    if int_hits > 0:
        return "INT", int_hits + td_hits
    if td_hits > 0:
        return "TD", td_hits
    return None, 0


def _confidence(n_phrase_hits: int, spike_z: float) -> float:
    """Heuristic confidence in [0.05, 0.99]. Not a win probability."""
    base = 0.55 + 0.10 * (max(1, n_phrase_hits) - 1)
    if spike_z > 0.0:
        base += min(0.25, 0.04 * max(0.0, spike_z - SPIKE_SIGMA))
    return float(min(0.99, max(0.05, base)))


def assemble_highlights(
    spike_times: Sequence[float],
    spike_zs: Sequence[float],
    segments: Sequence[TranscriptSegment],
    *,
    cue_window_s: float = CUE_WINDOW_S,
    padding_s: float = PADDING_S,
) -> list[HighlightDict]:
    """Fuse spikes and cues into padded highlight windows.

    Rules (load-bearing):
    * A highlight requires a spike **and** a cue within ``cue_window_s``.
    * INT cues are matched first and claim their spike; a co-occurring TD cue
      then cannot relabel the same event.
    * Each spike is consumed at most once.
    * Windows are padded by ``padding_s`` on each side, clamped at ``t=0``.
    """
    if len(spike_times) != len(spike_zs):
        raise ValueError("spike_times and spike_zs must have the same length")

    scored: list[tuple[TranscriptSegment, Literal["TD", "INT"], int]] = []
    for seg in segments:
        cue_type, hits = match_cue(seg.text)
        if cue_type is not None:
            scored.append((seg, cue_type, hits))

    # INT first (stable within family by time) so INT claims co-located spikes.
    scored.sort(key=lambda item: (0 if item[1] == "INT" else 1, item[0].t_start))

    used: set[int] = set()
    highlights: list[HighlightDict] = []
    for seg, cue_type, hits in scored:
        cue_t = 0.5 * (seg.t_start + seg.t_end)
        best_idx: int | None = None
        best_gap = math.inf
        for idx, spike_t in enumerate(spike_times):
            if idx in used:
                continue
            gap = abs(float(spike_t) - cue_t)
            if gap <= cue_window_s and gap < best_gap:
                best_gap = gap
                best_idx = idx
        if best_idx is None:
            continue
        used.add(best_idx)
        spike_t = float(spike_times[best_idx])
        z = float(spike_zs[best_idx])
        t_start = max(0.0, min(spike_t, cue_t) - padding_s)
        t_end = max(spike_t, cue_t) + padding_s
        highlights.append(
            HighlightDict(
                tStart=round(t_start, 3),
                tEnd=round(t_end, 3),
                type=cue_type,
                confidence=round(_confidence(hits, z), 4),
            )
        )

    highlights.sort(key=lambda h: h["tStart"])
    return highlights


# ── Real FFmpeg / Whisper backends ─────────────────────────────────────────────


class FfmpegAudioExtractor:
    """Extract mono float32 PCM via FFmpeg. Raises when FFmpeg is missing."""

    def __init__(self, sample_rate: int = TARGET_SAMPLE_RATE) -> None:
        self._sample_rate = sample_rate

    def extract_mono(self, video_path: Path) -> tuple[np.ndarray, int]:
        ffmpeg = require_ffmpeg()
        if not video_path.is_file():
            raise FileNotFoundError(f"video not found: {video_path}")
        cmd = [
            ffmpeg,
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(video_path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(self._sample_rate),
            "-f",
            "f32le",
            "-acodec",
            "pcm_f32le",
            "pipe:1",
        ]
        try:
            completed = subprocess.run(
                cmd,
                check=False,
                capture_output=True,
                timeout=600,
            )
        except OSError as exc:
            raise FilmDependencyError("FFmpeg", f"failed to execute ffmpeg: {exc}") from exc
        if completed.returncode != 0:
            stderr = completed.stderr.decode("utf-8", errors="replace").strip()
            raise FilmDependencyError(
                "FFmpeg",
                f"ffmpeg exited {completed.returncode} extracting audio from "
                f"{video_path}: {stderr[:400]}",
            )
        raw = completed.stdout
        if len(raw) < 4:
            raise FilmDependencyError(
                "FFmpeg",
                f"ffmpeg produced no audio samples for {video_path}; refusing to "
                "fabricate highlights from an empty audio track.",
            )
        samples = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
        return samples, self._sample_rate


class WhisperTranscriber:
    """Transcribe with the ``whisper`` package. Raises when Whisper is missing."""

    def __init__(self, model_name: str = "base") -> None:
        self._model_name = model_name

    def transcribe(self, samples: np.ndarray, sample_rate: int) -> list[TranscriptSegment]:
        whisper = require_whisper()
        model = whisper.load_model(self._model_name)
        # whisper expects float32 in [-1, 1] at 16 kHz.
        audio = np.clip(samples.astype(np.float32), -1.0, 1.0)
        result = model.transcribe(audio, fp16=False)
        segments: list[TranscriptSegment] = []
        for raw_seg in result.get("segments", []):
            text = str(raw_seg.get("text", ""))
            t_start = float(raw_seg.get("start", 0.0))
            t_end = float(raw_seg.get("end", t_start))
            segments.append(TranscriptSegment(t_start=t_start, t_end=t_end, text=text))
        return segments


# ── End-to-end entry point ─────────────────────────────────────────────────────


def detect_highlights(
    video_path: str | Path,
    *,
    audio_extractor: AudioExtractor | None = None,
    transcriber: Transcriber | None = None,
) -> list[HighlightDict]:
    """Detect highlights in ``video_path``.

    Fail-closed contract: if FFmpeg or Whisper is required and missing, this
    raises :class:`FilmDependencyError`. It never returns invented highlights.
    Flat audio or a cue-free transcript correctly yields ``[]``.
    """
    path = Path(video_path)
    extractor: AudioExtractor = audio_extractor if audio_extractor is not None else FfmpegAudioExtractor()
    transcriber_impl: Transcriber = transcriber if transcriber is not None else WhisperTranscriber()

    samples, sample_rate = extractor.extract_mono(path)
    if samples.size == 0:
        return []
    times, energies = short_time_energy(samples, sample_rate)
    spikes = detect_energy_spikes(times, energies)
    spike_times = [t for t, _ in spikes]
    spike_zs = [z for _, z in spikes]
    segments = transcriber_impl.transcribe(samples, sample_rate)
    return assemble_highlights(spike_times, spike_zs, segments)
