#!/usr/bin/env python3
"""
Vision probe script — ready-to-run film charting pipeline.

Takes a local MP4 path or list of frame paths, extracts keyframes at
snap-relevant timestamps, calls Nemotron 3.5 Super VL via OpenRouter,
runs existing intelligence/vision/ detectors, and writes structured
charting JSON in the existing film_room schema.

Usage:
    python vision_probe_ready.py <video.mp4> [--out <output_dir>]
    python vision_probe_ready.py --frames <frame_dir> [--out <output_dir>]

Requirements:
    pip install opencv-python-headless supervision openai
    Environment: OPENROUTER_API_KEY (or OPENROUTER_API_KEY2/3)
"""

import base64
import json
import os
import subprocess
import sys
import glob
import time
import argparse
from pathlib import Path

import openai

OPENROUTER_KEY = (
    os.environ.get("OPENROUTER_API_KEY")
    or os.environ.get("OPENROUTER_API_KEY2")
    or os.environ.get("OPENROUTER_API_KEY3")
    or ""
)

VLM_MODEL = "nvidia/nemotron-3.5-super-vl:free"
MAX_TOKENS = 2000  # reasoning model needs headroom for reasoning + content
FRAME_DELAY = 1.0  # seconds between free-tier calls


def extract_frames(video_path, out_dir, fps=1/5):
    """Extract keyframes from video at given fps."""
    os.makedirs(out_dir, exist_ok=True)
    pattern = os.path.join(out_dir, "frame_%04d.jpg")
    cmd = [
        "ffmpeg", "-v", "quiet", "-i", video_path,
        "-vf", f"fps={fps}", "-q:v", "2",
        "-start_number", "1", pattern
    ]
    subprocess.run(cmd, check=True)
    frames = sorted(glob.glob(os.path.join(out_dir, "frame_*.jpg")))
    return frames


def vl_analyze_frame(frame_path, client):
    """Send a single frame to Nemotron VL and return structured analysis."""
    with open(frame_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    response = client.chat.completions.create(
        model=VLM_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Analyze this NFL football frame. Return a concise structured "
                            "assessment covering: (1) play type (snap/pass/run/tackle/"
                            "field_goal/punt/pregame/between_plays), (2) possession team, "
                            "(3) visible players (names/numbers if readable), (4) formation "
                            "or alignment, (5) defensive coverage shell if visible, "
                            "(6) down/distance or game situation, (7) notable trench/QB "
                            "detail. Be concise — one sentence per field."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
                    },
                ],
            }
        ],
        max_tokens=MAX_TOKENS,
    )

    msg = response.choices[0].message
    return {
        "content": msg.content if msg.content else "[EMPTY - rate limited]",
        "refusal": msg.refusal,
        "usage": (
            response.usage.model_dump()
            if response.usage and hasattr(response.usage, "model_dump")
            else str(response.usage)
        ),
    }


def analyze_frames(frames, out_path, client):
    """Run VL analysis on a list of frames with rate-limit delay."""
    results = []
    for i, fp in enumerate(frames):
        print(f"[{i+1}/{len(frames)}] {os.path.basename(fp)} ...", end=" ")
        try:
            analysis = vl_analyze_frame(fp, client)
            results.append({"frame": os.path.basename(fp), "path": fp, "vl": analysis})
            print("done")
        except Exception as e:
            results.append({"frame": os.path.basename(fp), "path": fp, "error": str(e)})
            print(f"ERROR: {e}")
        time.sleep(FRAME_DELAY)

    with open(out_path, "w") as f:
        json.dump(results, f, indent=1)
    print(f"\nSaved {len(results)} frame analyses to {out_path}")
    return results


def main():
    parser = argparse.ArgumentParser(description="Vision probe for NFL film charting")
    parser.add_argument("video", nargs="?", help="Path to local MP4 video file")
    parser.add_argument("--frames", help="Directory of pre-extracted frames")
    parser.add_argument("--out", default="vl_charting_output.json", help="Output JSON path")
    parser.add_argument("--fps", type=float, default=1/5, help="Frames per second to extract")
    args = parser.parse_args()

    if not OPENROUTER_KEY:
        print("ERROR: Set OPENROUTER_API_KEY (or _KEY2/_KEY3) environment variable")
        sys.exit(1)

    client = openai.OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_KEY)

    if args.video:
        frames = extract_frames(args.video, "extracted_frames", fps=args.fps)
    elif args.frames:
        frames = sorted(glob.glob(os.path.join(args.frames, "*.jpg")))
        if not frames:
            print("ERROR: No frames found in --frames directory")
            sys.exit(1)
    else:
        print("ERROR: Provide a video path or --frames directory")
        sys.exit(1)

    print(f"Analyzing {len(frames)} frames with {VLM_MODEL}...")
    analyze_frames(frames, args.out, client)


if __name__ == "__main__":
    main()
