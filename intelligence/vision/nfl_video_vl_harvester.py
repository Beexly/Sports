"""NFL replay video harvester — Nemotron VL frame audit.

Why this exists
---------------
nfl-video.com serves *no* embedded video. Every replay page renders three
"Server #n" buttons that point at unrelated third-party domains. Following
that chain terminates in an OK.ru videoembed, which hosts the actual
full-length game (verified: 2:35:14 runtime, DASH_SEP, 852x480).

So "watching the replay" means: resolve the OK.ru asset, pull a bounded
window of it, drop frames, discard everything that is not a football shot,
and run a vision model over what survives.

This module does that end to end and emits structured, provenance-stamped
features. It never stores or redistributes video; frames are transient
working files under a scratch dir.

Design notes / pitfalls learned the hard way
--------------------------------------------
* The free Nemotron VL endpoint is a *reasoning* model. With a small
  max_tokens budget it spends everything on hidden reasoning and returns
  content=None with finish_reason="length". Budget >= 3000 tokens per
  batch and tell it to answer immediately.
* Batching 6 frames per request is ~6x faster than one frame per request
  and parses more reliably, but every frame must be labelled in-band
  ("FRAME n") or the model loses the index mapping.
* Sampling frames blind wastes calls on commercials, graphics and
  sideline shots. A turf-green HSV ratio separates wide broadcast shots
  from everything else almost perfectly (observed: live shots 0.82-0.93,
  graphics/close-ups 0.00).
* yt-dlp handles the OK.ru auth/headers; a raw m3u8 URL pulled with -g
  returns 400 to ffmpeg because the signature is IP-locked.
"""

from __future__ import annotations

import base64
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_MODEL = "nvidia/nemotron-3.5-super-vl:free"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

FRAME_PROMPT = """You are auditing NFL broadcast frames ({k} of them). Each frame is preceded by a label FRAME n.

For EACH frame report ONLY what is visible. If a frame is not a live pre-snap or in-play football shot, set frame_type accordingly and null the football fields.

Return a STRICT JSON ARRAY of {k} objects in frame order, no prose, no markdown fences:
{{"frame":1,
 "frame_type":"live_presnap|live_inplay|replay|graphic|commercial|sideline|other",
 "teams":"e.g. CHI offense vs SEA defense",
 "offense_personnel":"e.g. 11 (1RB 1TE 3WR)",
 "formation":"visible alignment e.g. shotgun trips right",
 "offensive_backfield":"shotgun|under_center|pistol|empty|unknown",
 "defensive_front":"e.g. 4-3 under / nickel 2-4-5 / 3-4 even / unknown",
 "coverage_shell":"1-high|2-high|0|unknown",
 "defenders_in_box":null,
 "down_distance":"e.g. 3rd & 7",
 "scoreboard":"verbatim clock/score/quarter text",
 "scorebug_away_team":"3-letter abbr from the ON-FIELD scorebug only",
 "scorebug_home_team":"3-letter abbr from the ON-FIELD scorebug only",
 "is_halftime_or_other_game_cutin":false,
 "on_screen_text":"verbatim graphic text",
 "confidence":0.0}}

IMPORTANT: broadcasts cut to a halftime studio show and to out-of-town highlight
reels. Those show OTHER games. Read the on-field scorebug (the small box pinned to
the game action), not the bottom ticker, which lists other games' scores. Set
is_halftime_or_other_game_cutin true whenever the frame is a studio shot, a
highlight of another game, or has no on-field scorebug.

Output the JSON array immediately. Do not explain your reasoning."""


# --------------------------------------------------------------------------
# credentials
# --------------------------------------------------------------------------
def read_key_from(path: Path) -> str | None:
    """Pull OPENROUTER_API_KEY out of one .env file, or None."""
    if not path.exists():
        return None
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.strip().startswith("OPENROUTER_API_KEY="):
            return line.split("=", 1)[1].strip()
    return None


def load_api_key() -> str:
    """Read OPENROUTER_API_KEY without ever printing it."""
    key = os.environ.get("OPENROUTER_API_KEY")
    if key:
        return key
    candidates = [
        Path(__file__).resolve().parents[2] / ".env",
        Path.home() / "AppData/Local/hermes/.env",
    ]
    for p in candidates:
        found = read_key_from(p)
        if found:
            return found
    raise RuntimeError("OPENROUTER_API_KEY not found (env or .env)")


# --------------------------------------------------------------------------
# discovery: replay page -> ok.ru video id
# --------------------------------------------------------------------------
@dataclass
class GameCatalog:
    slug: str
    page_url: str
    title: str = ""
    server_links: list[str] = field(default_factory=list)
    video_embed_id: str | None = None
    resolved_from: str | None = None
    duration_s: float | None = None
    streams: list[dict[str, Any]] = field(default_factory=list)
    status: str = "unresolved"


def parse_replay_page(html: str, page_url: str) -> GameCatalog:
    """Extract the Server buttons and any embedded video id from a replay page."""
    slug = page_url.rstrip("/").rsplit("/", 1)[-1]
    title_m = re.search(r"<title>(.*?)</title>", html, re.S)
    title = re.sub(r"\s+", " ", title_m.group(1)).strip() if title_m else ""

    cat = GameCatalog(slug=slug, page_url=page_url, title=title)
    cat.server_links = sorted(
        set(re.findall(r'href="(https?://[^"]+)"[^>]*target="_blank"', html))
    )
    embed = re.findall(r"(?:ok\.ru|okcdn\.ru)/videoembed/(\d+)", html)
    if embed:
        cat.video_embed_id = embed[0]
        cat.resolved_from = "inline_embed"
    return cat


def resolve_stream(video_id: str, timeout: int = 180) -> list[dict[str, Any]]:
    """List OK.ru formats via yt-dlp. Returns [] when unavailable."""
    exe = shutil.which("yt-dlp") or "yt-dlp"
    url = f"https://ok.ru/video/{video_id}"
    proc = subprocess.run(
        [exe, "-F", "--no-warnings", url],
        capture_output=True, text=True, timeout=timeout,
    )
    if proc.returncode != 0:
        return []
    fmt_re = re.compile(
        r"^(?P<id>\S+)\s+mp4\s+(?P<res>\S+)\s+(?P<fps>\d+)?.*?(?P<tbr>\d+)k\s+\S+"
    )
    out = []
    for line in proc.stdout.splitlines():
        m = fmt_re.match(line.strip())
        if m:
            out.append({"format_id": m.group("id"), "resolution": m.group("res"),
                        "fps": m.group("fps"), "tbr_k": int(m.group("tbr"))})
    return out


def probe_duration(video_id: str) -> float | None:
    exe = shutil.which("yt-dlp") or "yt-dlp"
    proc = subprocess.run(
        [exe, "--no-warnings", "--print", "duration",
         f"https://ok.ru/video/{video_id}"],
        capture_output=True, text=True, timeout=120,
    )
    try:
        return float(proc.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return None


# --------------------------------------------------------------------------
# frame acquisition
# --------------------------------------------------------------------------
def download_window(video_id: str, start_s: int, end_s: int,
                    fmt: str = "hls-938", workdir: Path | None = None) -> Path:
    """Download one bounded window via yt-dlp (handles OK.ru signature/headers)."""
    exe = shutil.which("yt-dlp") or "yt-dlp"
    workdir = Path(workdir or ".")
    out = workdir / f"win_{start_s}_{end_s}.mp4"
    if out.exists():
        return out
    # -N 8 is not cosmetic: a single connection to this CDN throttles to
    # ~23 KB/s after the first minute, which turns a 10-minute window into a
    # two-hour download. Eight parallel fragments measured 224 KB/s.
    subprocess.run(
        [exe, "--no-warnings", "-q", "-N", "8", "-f", fmt,
         "--download-sections", f"*{start_s}-{end_s}",
         "--force-keyframes-at-cuts",
         "-o", str(out.with_suffix(".%(ext)s")),
         f"https://ok.ru/video/{video_id}"],
        check=True, timeout=1800,
    )
    if not out.exists():
        raise RuntimeError(f"yt-dlp produced no file for {start_s}-{end_s}")
    return out


def extract_frames(video: Path, outdir: Path, every_s: float = 2.0,
                   width: int = 960) -> list[Path]:
    """Extract frames. 960 wide keeps the scorebug above ~7px text at 360p sources;
    below that the vision model stops being able to read down/distance."""
    outdir.mkdir(parents=True, exist_ok=True)
    for old in outdir.glob("*.jpg"):
        old.unlink()
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(video),
         "-vf", f"fps=1/{every_s},scale={width}:-1", "-q:v", "3",
         str(outdir / "s_%04d.jpg"), "-y"],
        check=True, timeout=900,
    )
    return sorted(outdir.glob("s_*.jpg"))


def turf_green_scores(frames: list[Path]) -> list[dict[str, Any]]:
    """Rank frames by turf-green fraction. Wide live shots score high."""
    import cv2

    rows = []
    for f in frames:
        img = cv2.imread(str(f))
        if img is None:
            continue
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
        rows.append({"frame": str(f), "green": round(mask.mean() / 255.0, 4)})
    return rows


def select_candidates(scored: list[dict[str, Any]], threshold: float = 0.18,
                      limit: int = 12) -> list[dict[str, Any]]:
    """Keep play-like frames, spread evenly across the window."""
    cand = sorted((r for r in scored if r["green"] > threshold),
                  key=lambda r: r["frame"])
    if len(cand) <= limit:
        return cand
    idx = [round(i * (len(cand) - 1) / (limit - 1)) for i in range(limit)]
    out, seen = [], set()
    for i in idx:
        if i not in seen:
            seen.add(i)
            out.append(cand[i])
    return out


# --------------------------------------------------------------------------
# vision
# --------------------------------------------------------------------------
def _post(body: dict[str, Any], key: str, timeout: int = 300) -> dict[str, Any]:
    req = urllib.request.Request(
        OPENROUTER_URL, data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://galaxysportsedge.com",
            "X-Title": "GSE NFL replay frame audit",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def audit_batch(frames: list[Path], key: str, model: str = DEFAULT_MODEL,
                max_tokens: int = 12000, retries: int = 3) -> list[dict[str, Any]]:
    """Send up to N frames in one request. Returns parsed objects."""
    content: list[dict[str, Any]] = [
        {"type": "text", "text": FRAME_PROMPT.format(k=len(frames))}
    ]
    for i, f in enumerate(frames, 1):
        b64 = base64.b64encode(Path(f).read_bytes()).decode()
        content.append({"type": "text", "text": f"FRAME {i}"})
        content.append({"type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})

    body = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "temperature": 0.0,
        "max_tokens": max_tokens,
    }
    last: Exception | None = None
    for attempt in range(retries):
        try:
            d = _post(body, key)
            choice = d["choices"][0]
            txt = choice["message"].get("content")
            if txt is None:
                # reasoning model burned the budget; retry with more headroom
                if choice.get("finish_reason") == "length" and max_tokens < 24000:
                    max_tokens *= 2
                    body["max_tokens"] = max_tokens
                    continue
                return []
            clean = re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip()
            try:
                arr = json.loads(clean)
            except json.JSONDecodeError:
                m = re.search(r"\[.*\]", clean, re.S)
                arr = json.loads(m.group(0)) if m else None
            if isinstance(arr, list):
                return arr
            return []
        except Exception as exc:  # network / 429 / 5xx
            last = exc
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(f"vision batch failed: {last}")


# --------------------------------------------------------------------------
# orchestration
# --------------------------------------------------------------------------
def harvest_window(video_id: str, start_s: int, end_s: int,
                   workdir: Path, every_s: float = 2.0,
                   batch: int = 6, limit: int = 12,
                   model: str = DEFAULT_MODEL) -> dict[str, Any]:
    key = load_api_key()
    workdir.mkdir(parents=True, exist_ok=True)

    video = download_window(video_id, start_s, end_s, workdir=workdir)
    frames = extract_frames(video, workdir / "frames", every_s=every_s)
    scored = turf_green_scores(frames)
    picked = select_candidates(scored, limit=limit)

    results: list[dict[str, Any]] = []
    for i in range(0, len(picked), batch):
        chunk = picked[i:i + batch]
        arr = audit_batch([Path(c["frame"]) for c in chunk], key, model=model)
        for j, obj in enumerate(arr):
            if j >= len(chunk):
                break
            idx = int(Path(chunk[j]["frame"]).stem.split("_")[1])
            obj["_frame"] = Path(chunk[j]["frame"]).name
            obj["_green"] = chunk[j]["green"]
            obj["_t_s"] = round(start_s + (idx - 1) * every_s, 1)
            results.append(obj)

    live = [r for r in results if str(r.get("frame_type", "")).startswith("live")]
    shells: dict[str, int] = {}
    forms: dict[str, int] = {}
    for r in live:
        shells[str(r.get("coverage_shell"))] = shells.get(str(r.get("coverage_shell")), 0) + 1
        forms[str(r.get("formation"))] = forms.get(str(r.get("formation")), 0) + 1

    return {
        "video_id": video_id,
        "window_s": [start_s, end_s],
        "sampling": {"every_s": every_s, "frames_extracted": len(frames),
                     "green_threshold": 0.18, "frames_audited": len(results)},
        "frame_type_counts": {t: sum(1 for r in results if r.get("frame_type") == t)
                              for t in {r.get("frame_type") for r in results}},
        "live_frame_count": len(live),
        "coverage_shell_counts": shells,
        "formation_counts": forms,
        "down_distance_samples": [r.get("down_distance") for r in live if r.get("down_distance")],
        "frames": results,
        "provenance": {
            "source": f"https://ok.ru/video/{video_id}",
            "resolved_via": "nfl-video.com replay page -> Server button chain -> OK.ru videoembed",
            "model": model,
            "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "note": "Frames are transient; no video is stored or redistributed.",
        },
    }


def filter_live_frames_for_matchup(results: list[dict[str, Any]],
                                   expected_teams: tuple[str, ...] | None = None) -> tuple[list[dict], list[dict]]:
    """Split live frames into (matchup, quarantined).

    A full broadcast contains halftime studio cut-ins and out-of-town highlight
    reels. Those are wide turf shots, so they pass the green filter and get
    classified as live football -- but they belong to *other* games. Left in,
    they silently contaminate the target game's tendencies.
    """
    keep, quarantine = [], []
    want = {t.upper() for t in (expected_teams or ())}

    # Team codes that appear in prose but are not teams.
    NOISE = {"NFL", "MNF", "SNF", "TNF", "ESPN", "CBS", "FOX", "NBC", "ABC",
             "QTR", "YDS", "TDS", "INC", "PEN", "UNK", "VS", "AT", "AND"}

    for r in results:
        if not str(r.get("frame_type", "")).startswith("live"):
            continue
        teams = str(r.get("teams") or "").upper()
        abbrs = {a for a in re.findall(r"\b[A-Z]{2,3}\b", teams)} - NOISE

        if not abbrs or abbrs == {"UNKNOWN"}:
            quarantine.append({**r, "_quarantine": "teams_unreadable"})
            continue

        # An intersection test is not enough: "DET offense vs CHI defense"
        # contains CHI and would pass, silently importing another game. The
        # frame must show exactly the expected pair and nothing else.
        if want and not abbrs <= want:
            quarantine.append({**r, "_quarantine": "halftime_cutin_other_game"})
            continue

        keep.append(r)
    return keep, quarantine


def harvest_local(frames_dir: Path, every_n: int = 20, limit: int = 24,
                  batch: int = 6, model: str = DEFAULT_MODEL,
                  expected_teams: tuple[str, ...] | None = None) -> dict[str, Any]:
    """Audit frames already on disk. No network download, no CDN throttle."""
    key = load_api_key()
    frames = sorted(Path(frames_dir).glob("*.jpg"))
    if not frames:
        raise RuntimeError(f"no jpg frames in {frames_dir}")
    sampled = frames[::max(1, every_n)]
    scored = turf_green_scores(sampled)
    picked = select_candidates(scored, limit=limit)

    results: list[dict[str, Any]] = []
    for i in range(0, len(picked), batch):
        chunk = picked[i:i + batch]
        arr = audit_batch([Path(c["frame"]) for c in chunk], key, model=model)
        for j, obj in enumerate(arr):
            if j >= len(chunk):
                break
            obj["_frame"] = Path(chunk[j]["frame"]).name
            obj["_green"] = chunk[j]["green"]
            results.append(obj)

    keep, quarantine = ([], [])
    if expected_teams:
        keep, quarantine = filter_live_frames_for_matchup(results, expected_teams)
    else:
        keep = [r for r in results if str(r.get("frame_type", "")).startswith("live")]

    shells: dict[str, int] = {}
    forms: dict[str, int] = {}
    for r in keep:
        shells[str(r.get("coverage_shell"))] = shells.get(str(r.get("coverage_shell")), 0) + 1
        forms[str(r.get("formation"))] = forms.get(str(r.get("formation")), 0) + 1

    return {
        "source_dir": str(frames_dir),
        "sampling": {"every_n": every_n, "frames_on_disk": len(frames),
                     "frames_sampled": len(sampled), "frames_audited": len(results)},
        "frame_type_counts": {t: sum(1 for r in results if r.get("frame_type") == t)
                              for t in {r.get("frame_type") for r in results}},
        "live_frame_count": len(keep),
        "quarantined_count": len(quarantine),
        "quarantine_reasons": {q.get("_quarantine"): sum(1 for x in quarantine
                                                        if x.get("_quarantine") == q.get("_quarantine"))
                               for q in quarantine},
        "coverage_shell_counts": shells,
        "formation_counts": forms,
        "down_distance_samples": [r.get("down_distance") for r in keep if r.get("down_distance")],
        "frames": results,
        "provenance": {
            "source": str(frames_dir),
            "model": model,
            "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "note": "Local on-disk broadcast frames; no video stored or redistributed.",
        },
    }


def main(argv: list[str] | None = None) -> int:
    import argparse

    ap = argparse.ArgumentParser(description="Harvest NFL replay frames with Nemotron VL")
    ap.add_argument("--video-id", help="OK.ru video id (network mode)")
    ap.add_argument("--frames-dir", help="local frame dir (offline mode)")
    ap.add_argument("--every-n", type=int, default=20, help="offline: sample every Nth frame")
    ap.add_argument("--teams", default="", help="offline: expected teams, e.g. CHI,SEA")
    ap.add_argument("--start", type=int, default=3300)
    ap.add_argument("--end", type=int, default=3540)
    ap.add_argument("--every", type=float, default=2.0)
    ap.add_argument("--limit", type=int, default=12)
    ap.add_argument("--batch", type=int, default=6)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--workdir", default="vl_work")
    ap.add_argument("--out", default="nfl_vl_harvest.json")
    args = ap.parse_args(argv)

    if args.frames_dir:
        teams = tuple(t.strip() for t in args.teams.split(",") if t.strip()) or None
        res = harvest_local(Path(args.frames_dir), every_n=args.every_n,
                            limit=args.limit, batch=args.batch,
                            model=args.model, expected_teams=teams)
        Path(args.out).write_text(json.dumps(res, indent=1), encoding="utf-8")
        print(json.dumps({k: res[k] for k in
                          ("sampling", "frame_type_counts", "live_frame_count",
                           "quarantined_count", "coverage_shell_counts")}, indent=1))
        print(f"wrote {args.out}")
        return 0

    if not args.video_id:
        ap.error("one of --video-id or --frames-dir is required")

    res = harvest_window(
        args.video_id, args.start, args.end, Path(args.workdir),
        every_s=args.every, batch=args.batch, limit=args.limit, model=args.model,
    )
    Path(args.out).write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps({k: res[k] for k in
                      ("window_s", "sampling", "frame_type_counts",
                       "live_frame_count", "coverage_shell_counts")}, indent=1))
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
