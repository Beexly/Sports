#!/usr/bin/env python3
"""Creator Intel pipeline: fetch reels -> download audio -> transcribe -> label -> dashboard.

Usage: run.py --creator USERNAME [--limit N] [--skip-download]
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fetch import fetch_reels
from download import download_audio
from transcribe import transcribe
from label import label_reel
from chart import build

ROOT = Path("/home/hatch/workspace/creator-intel/work")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--creator", required=True)
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--skip-steps", default="", help="comma list: download,transcribe,label")
    args = ap.parse_args()
    skip = set(args.skip_steps.split(",")) if args.skip_steps else set()

    outdir = ROOT / args.creator
    outdir.mkdir(parents=True, exist_ok=True)
    usage_log = []

    print(f"[fetch] {args.creator} ...")
    reels = fetch_reels(args.creator, args.limit)
    print(f"[fetch] {len(reels)} reels")

    for i, r in enumerate(reels):
        rid = r["post_id"]
        print(f"[{i+1}/{len(reels)}] {rid} ❤{r['likes']}")
        audio = outdir / f"{rid}.m4a"
        tpath = outdir / f"{rid}.transcript.json"

        if "download" not in skip and not audio.exists():
            try:
                got = download_audio(r["url"], audio)
                if got != audio:
                    got.rename(audio)
            except Exception as e:
                print(f"  download failed: {e}")
                r["error"] = f"download: {e}"
                continue
        if "transcribe" not in skip and not tpath.exists():
            try:
                t = transcribe(audio)
                tpath.write_text(json.dumps(t))
                print(f"  transcribed {t['duration']}s, {len(t['segments'])} segs")
            except Exception as e:
                print(f"  transcribe failed: {e}")
                r["error"] = f"transcribe: {e}"
                continue
        if tpath.exists():
            r["transcript"] = json.loads(tpath.read_text())
        if "label" not in skip and "transcript" in r and not r.get("labels"):
            try:
                r["labels"] = label_reel(
                    r["transcript"], r["caption"], r["likes"], r["comments"],
                    usage_log)
                print(f"  labeled: {r['labels'].get('hook_type')}")
                time.sleep(1)
            except Exception as e:
                print(f"  label failed: {e}")
                r["error"] = f"label: {e}"

    (outdir / "reels.json").write_text(json.dumps(reels, indent=1))
    build(reels, args.creator, outdir / "index.html")
    if usage_log:
        pt = sum(u.get("prompt_tokens", 0) for u in usage_log)
        ct = sum(u.get("completion_tokens", 0) for u in usage_log)
        print(f"[usage] {len(usage_log)} label calls, {pt} prompt + {ct} completion tokens")
    print(f"[done] {outdir / 'index.html'}")


if __name__ == "__main__":
    main()
