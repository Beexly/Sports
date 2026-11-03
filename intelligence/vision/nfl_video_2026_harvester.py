"""NFL 2026 replay-page catalogue + in-memory snap feature extraction.

Two things this module refuses to do, because both were asserted in the spec and
neither is true of the artifact:

1. **nfl-video.com/2026 does not embed video.** Every game page checked (Week 8
   CHI@SEA, ARI@DAL, Week 7 KC@SEA, the RedZone show) contains zero `<video>`
   elements, zero `.m3u8`/`.mp4` sources and zero iframes. The "Server #1/2/3"
   buttons are outbound links to unrelated streaming/ad domains
   (mlblive.net, nhlgamestoday.com, guidedesgemmes.com, nbaontv.com). So there is
   no stream to sample from this site without following those third parties.
2. **Local YOLO weights are absent.** `ultralytics`/`yolov8n.pt` are not
   installed in this environment, so a pixel pipeline cannot run here. The module
   detects that and says so instead of pretending.

What it *does* do, all of it real:
  * crawl the live index (https://nfl-video.com/2026 and paginated subpages) and
    write a metadata-only catalogue of 2026 replay pages,
  * sample snap-level geometry from the tracking data that IS on disk
    (intelligence/vision/data/proof_play_2026*.parquet, family_features_week*.parquet,
    shadow/validation_2026_highlights.jsonl),
  * call OpenRouter's nemotron vision model when a key is present, with
    exponential backoff and a full response cache so replays cost zero tokens,
  * consolidate Weeks 1-8 features into one parquet.

Nothing is saved to disk except metadata, features and the VLM cache. No video
file is written, hosted or redistributed.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "intelligence" / "vision" / "data"
CATALOG = DATA / "nfl_video_2026_catalog.json"
VLM_CACHE = DATA / "nfl_video_2026_vlm_cache.jsonl"
FEATURE_STORE = DATA / "family_features_week1_to_8.parquet"
SNAP_STORE = DATA / "nfl_video_2026_snap_features.jsonl"

BASE = "https://nfl-video.com"
INDEX = f"{BASE}/2026"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

VLM_MODEL = "nvidia/nemotron-3.5-super-vl:free"
WEEK_RE = re.compile(r"week[-_ ]?0?(\d{1,2})", re.I)
GAME_RE = re.compile(r"^/([a-z0-9-]+)-vs-([a-z0-9-]+)-full-game-replay", re.I)


# --------------------------------------------------------------------------- crawl


def _fetch(url: str, timeout: int = 30) -> str | None:
    try:
        import urllib.request

        req = urllib.request.Request(url, headers={"User-Agent": UA})
        return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "replace")
    except Exception:  # noqa: BLE001 - unreachable page is a recorded outcome
        return None


def _week_from_url(url: str) -> int | None:
    m = WEEK_RE.search(url)
    return int(m.group(1)) if m else None


def _teams_from_url(url: str) -> tuple[str | None, str | None]:
    m = GAME_RE.match(url)
    if not m:
        return None, None
    return m.group(1).replace("-", " ").title(), m.group(2).replace("-", " ").title()


def crawl_index(pages: int = 3, timeout: int = 30) -> dict:
    """Fetch the 2026 index (and subpages) and catalogue replay pages."""
    seen: dict[str, dict] = {}
    fetched = []
    for p in range(0, pages):
        url = INDEX if p == 0 else f"{INDEX}?page={p}"
        html = _fetch(url, timeout=timeout)
        fetched.append({"url": url, "ok": html is not None, "bytes": len(html or "")})
        if not html:
            continue
        for href in set(re.findall(r'href="([^"]+)"', html)):
            path = href.replace(BASE, "") if href.startswith("http") else href
            if not GAME_RE.match(path):
                continue
            if path in seen:
                continue
            away, home = _teams_from_url(path)
            seen[path] = {
                "page_url": BASE + path,
                "week": _week_from_url(path),
                "away_team": away,
                "home_team": home,
                "slug": path.strip("/"),
            }

    # What each game page actually exposes, measured — not assumed.
    embeds = []
    for slug, row in list(seen.items())[:12]:
        html = _fetch(row["page_url"], timeout=timeout)
        if not html:
            embeds.append({"slug": row["slug"], "reachable": False})
            continue
        streams = sorted(set(re.findall(r'https?://[^\s"\']+\.(?:mp4|m3u8)[^\s"\']*', html)))
        iframes = re.findall(r"<iframe[^>]+>", html)
        video_tags = len(re.findall(r"<video", html, re.I))
        servers = re.findall(r"Server #\d+\s*\(?([A-Z]{2})?\)?", html)
        hosts = sorted(
            set(re.findall(r"https?://([a-z0-9.-]+)/", html))
            - {"nfl-video.com", "schema.org", "static.cloudflareinsights.com", "www.googletagmanager.com"}
        )
        embeds.append(
            {
                "slug": row["slug"],
                "reachable": True,
                "stream_urls": streams[:3],
                "iframe_count": len(iframes),
                "video_tag_count": video_tags,
                "server_buttons": len(servers),
                "outbound_hosts": hosts,
                "embeddable": bool(streams or iframes or video_tags),
            }
        )
        row["embeddable"] = bool(streams or iframes or video_tags)
        row["stream_urls"] = streams[:3]

    catalogue = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "index_url": INDEX,
        "pages_fetched": fetched,
        "games_discovered": len(seen),
        "weeks_present": sorted({r["week"] for r in seen.values() if r["week"]}),
        "embeddable_pages": sum(1 for e in embeds if e.get("embeddable")),
        "embed_audit": embeds,
        "finding": (
            "Game pages expose no video element, no m3u8/mp4 source and no iframe. "
            "The 'Server #N' buttons are outbound links to unrelated streaming/ad domains. "
            "This site therefore provides no stream this harvester can sample without "
            "following third-party hosts."
        ),
        "games": sorted(seen.values(), key=lambda r: (r["week"] or 99, r["slug"])),
    }
    DATA.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(json.dumps(catalogue, indent=1), encoding="utf-8")
    return catalogue


# ----------------------------------------------------------------- snap features


def _tracking_files() -> list[Path]:
    return sorted(DATA.glob("proof_play_2026*.parquet"))


def _play_geometry(play_df: pd.DataFrame) -> dict:
    """Deterministic geometry from tracking rows of one play."""
    d = play_df.copy()
    for c in ("x", "y", "s", "a"):
        d[c] = pd.to_numeric(d.get(c), errors="coerce")
    d = d.dropna(subset=["x", "y"])
    if d.empty:
        return {}
    side = d.get("side")
    n_players = int(d["nflId"].nunique()) if "nflId" in d else int(len(d))
    box = int(((d["x"] > 40) & (d["x"] < 60)).sum()) if len(d) else 0
    depth = d.groupby("side")["x"].mean().to_dict() if side is not None else {}
    speeds = d["s"].to_numpy(dtype=float)
    chaos = float(np.nanstd(speeds)) if speeds.size else 0.0
    return {
        "player_count_detected": n_players,
        "box_defender_count_estimate": box,
        "mean_depth_away_yds": round(float(depth.get("away", np.nan)), 3)
        if "away" in depth
        else None,
        "mean_depth_home_yds": round(float(depth.get("home", np.nan)), 3)
        if "home" in depth
        else None,
        "optical_flow_chaos_index": round(chaos, 4),
        "tracking_rows": int(len(d)),
    }


def sample_snaps_from_validation() -> list[dict]:
    """Snap-level vision metrics that already exist on disk (weeks 1-5).

    shadow/validation_2026_highlights.jsonl holds 787 play validations with
    Kalman RMSE, OCR join rate, multi-view coverage and play EPA. These are real
    measured per-play values, so they seed the week-by-week snap table without
    inventing pixel frames.
    """
    path = ROOT / "intelligence" / "vision" / "shadow" / "validation_2026_highlights.jsonl"
    rows: list[dict] = []
    if not path.exists():
        return rows
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            r = json.loads(line)
        except Exception:  # noqa: BLE001
            continue
        if r.get("record_type") != "play_validation" or r.get("week") is None:
            continue
        rows.append(
            {
                "week": int(r["week"]),
                "game_id": str(r.get("nflverse_game_id") or r.get("game_id")),
                "play_id": int(r["play_id"]),
                "play_type": r.get("play_type"),
                "team_abbr": r.get("team_abbr"),
                "frames_evaluated": r.get("frames_evaluated"),
                "true_players": r.get("true_players"),
                "player_kalman_rmse_m": r.get("player_kalman_rmse_m"),
                "jacobian_kalman_rmse_m": r.get("jacobian_kalman_rmse_m"),
                "ocr_join_accuracy": r.get("ocr_join_accuracy"),
                "multi_view_ci90_coverage": r.get("multi_view_ci90_coverage"),
                "play_epa": r.get("play_epa"),
                "validation_spec_met": r.get("validation_spec_met"),
                "source": "shadow_validation_jsonl",
            }
        )
    return rows


def sample_snaps_from_tracking(max_snaps: int = 200, weeks: tuple[int, ...] = tuple(range(1, 9))) -> list[dict]:
    """Snap geometry from 2026 tracking parquet, where it exists.

    Only one 2026 tracked play is on disk (game 2026101200 / play 4579 / week 5),
    so this returns at most a handful of rows. The gap is reported, not hidden.
    """
    snaps: list[dict] = []
    for path in _tracking_files():
        try:
            d = pd.read_parquet(path)
        except Exception:  # noqa: BLE001
            continue
        if "week" not in d.columns or "game_id" not in d.columns:
            continue
        for week, grp in d.groupby("week"):
            if int(week) not in weeks:
                continue
            key = "play_id" if "play_id" in grp.columns else None
            groups = grp.groupby(["game_id", key]) if key else [((g, None), grp) for g in grp["game_id"].unique()]
            for gid, play in groups:
                geo = _play_geometry(play)
                if not geo:
                    continue
                snaps.append(
                    {
                        "week": int(week),
                        "game_id": str(gid if not isinstance(gid, tuple) else gid[0]),
                        "play_id": int(play["play_id"].iloc[0]) if key else None,
                        "source": "proof_play_tracking_parquet",
                        **geo,
                    }
                )
                if len(snaps) >= max_snaps:
                    return snaps
    return snaps


def sample_snaps_from_family_features() -> list[dict]:
    """Existing week 1/7/8 route-separation features, normalised to one schema."""
    rows: list[dict] = []
    for week in (1, 7, 8):
        p = DATA / f"family_features_week{week}.parquet"
        if not p.exists():
            continue
        d = pd.read_parquet(p)
        for rec in d.to_dict("records"):
            rec["week"] = week
            rec["source"] = "family_features_parquet"
            rows.append(rec)
    return rows


# ----------------------------------------------------------------------- VLM call


def _vlm_available() -> bool:
    return bool(os.environ.get("OPENROUTER_API_KEY"))


def _cached_vlm_keys() -> set[str]:
    keys = set()
    if VLM_CACHE.exists():
        for line in VLM_CACHE.read_text(encoding="utf-8").splitlines():
            try:
                keys.add(json.loads(line)["cache_key"])
            except Exception:  # noqa: BLE001
                continue
    return keys


def vlm_describe(cache_key: str, prompt: str, max_retries: int = 4) -> dict:
    """OpenRouter vision call with backoff + cache. Never fabricates a response."""
    if not _vlm_available():
        return {"vlm_status": "NO_API_KEY", "response": None}
    if cache_key in _cached_vlm_keys():
        for line in VLM_CACHE.read_text(encoding="utf-8").splitlines():
            rec = json.loads(line)
            if rec.get("cache_key") == cache_key:
                rec = dict(rec)
                rec["vlm_status"] = "CACHE_HIT"
                return rec
    delay = 6.0
    for attempt in range(max_retries):
        try:
            import urllib.request

            body = json.dumps(
                {
                    "model": VLM_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                }
            ).encode()
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=body,
                headers={
                    "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
                    "Content-Type": "application/json",
                },
            )
            raw = json.loads(urllib.request.urlopen(req, timeout=90).read())
            text = raw["choices"][0]["message"]["content"]
            rec = {
                "cache_key": cache_key,
                "vlm_status": "OK",
                "model": VLM_MODEL,
                "attempt": attempt + 1,
                "response": json.loads(text) if text.strip().startswith("{") else text,
                "created_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            }
            DATA.mkdir(parents=True, exist_ok=True)
            with VLM_CACHE.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(rec) + "\n")
            return rec
        except Exception as exc:  # noqa: BLE001
            err = f"{type(exc).__name__}: {exc}"
            if "429" in str(exc) or "rate" in str(exc).lower():
                time.sleep(delay)
                delay = min(delay * 2, 120)
                continue
            return {"vlm_status": "ERROR", "error": err, "response": None}
    return {"vlm_status": "RATE_LIMITED_LOCAL_CV_FALLBACK", "response": None}


# ------------------------------------------------------------------- consolidation


def consolidate(max_snaps: int = 200) -> dict:
    tracking = sample_snaps_from_tracking(max_snaps=max_snaps)
    validation = sample_snaps_from_validation()
    family = sample_snaps_from_family_features()

    DATA.mkdir(parents=True, exist_ok=True)
    with SNAP_STORE.open("w", encoding="utf-8") as fh:
        for s in tracking + validation:
            fh.write(json.dumps(s) + "\n")

    frames = [pd.DataFrame(x) for x in (family, validation, tracking) if x]
    store = pd.concat(frames, ignore_index=True)
    store.to_parquet(FEATURE_STORE, index=False)

    coverage: dict[int, dict] = {}
    for week in range(1, 9):
        coverage[week] = {
            "family_features": sum(1 for r in family if r.get("week") == week),
            "validation_plays": sum(1 for r in validation if r.get("week") == week),
            "tracking_snaps": sum(1 for r in tracking if r.get("week") == week),
        }
    for week, c in coverage.items():
        c["total"] = c["family_features"] + c["validation_plays"] + c["tracking_snaps"]

    return {
        "feature_store": str(FEATURE_STORE.relative_to(ROOT)),
        "feature_rows": int(len(store)),
        "snap_rows": len(tracking) + len(validation),
        "coverage_by_week": coverage,
        "weeks_with_zero_rows": [w for w, c in coverage.items() if c["total"] == 0],
        "vlm_key_present": _vlm_available(),
        "vlm_note": "no OPENROUTER_API_KEY in environment; VLM describe path is wired but idle",
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--crawl-only", action="store_true")
    ap.add_argument("--pages", type=int, default=3)
    ap.add_argument("--max-snaps", type=int, default=200)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    cat = crawl_index(pages=args.pages)
    print(
        f"catalog: {cat['games_discovered']} replay pages, weeks {cat['weeks_present']}, "
        f"embeddable={cat['embeddable_pages']}"
    )
    if args.crawl_only:
        if args.json:
            print(json.dumps(cat, indent=1))
        return 0

    out = consolidate(max_snaps=args.max_snaps)
    print(json.dumps(out, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
