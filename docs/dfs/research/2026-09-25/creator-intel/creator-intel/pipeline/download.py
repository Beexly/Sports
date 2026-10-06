"""Download audio-only track per reel (all Whisper needs)."""
import subprocess
from pathlib import Path

YTDLP = "/home/hatch/workspace/creator-intel/.venv/bin/yt-dlp"


def download_audio(url, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    out_tmpl = str(dest.with_suffix("")) + ".%(ext)s"
    cmd = [
        YTDLP, "--no-playlist", "--no-check-certificate",
        "-f", "bestaudio[ext=m4a]/bestaudio/b",
        "-o", out_tmpl, "--no-warnings", url,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"yt-dlp failed for {url}: {r.stderr[-500:]}")
    # find the produced file
    for ext in (".m4a", ".mp3", ".webm", ".opus", ".mp4"):
        cand = dest.with_suffix(ext)
        if cand.exists():
            return cand
    raise RuntimeError(f"no audio file produced for {url}")
