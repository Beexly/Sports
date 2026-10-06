"""Transcribe with local faster-whisper (no network needed after model download)."""
import subprocess
import tempfile
from pathlib import Path

_MODEL = None
MODEL_DIR = "/home/hatch/workspace/creator-intel/models/faster-whisper-base"


def _get_model():
    global _MODEL
    if _MODEL is None:
        from faster_whisper import WhisperModel
        _MODEL = WhisperModel(MODEL_DIR, device="cpu", compute_type="int8")
    return _MODEL


def _to_wav(audio_path: Path) -> Path:
    """Normalize any container to 16kHz mono wav via ffmpeg."""
    tmp = Path(tempfile.mkdtemp()) / "audio.wav"
    r = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(audio_path),
         "-ac", "1", "-ar", "16000", str(tmp)],
        capture_output=True, timeout=300)
    if r.returncode != 0 or not tmp.exists():
        raise RuntimeError(f"ffmpeg normalize failed: {r.stderr[:300]}")
    return tmp


def transcribe(audio_path: Path):
    wav = _to_wav(Path(audio_path))
    try:
        model = _get_model()
        segments, info = model.transcribe(str(wav), beam_size=5)
        out = [
            {"t0": round(s.start, 1), "t1": round(s.end, 1), "text": s.text.strip()}
            for s in segments
        ]
        return {"language": info.language, "duration": round(info.duration, 1),
                "segments": out}
    finally:
        wav.unlink(missing_ok=True)
