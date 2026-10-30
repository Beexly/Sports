#!/usr/bin/env python3
"""
Exhaustive VL frame analysis for CAR@GB Week 8 highlights.
Processes ALL extracted frames (sample_0001.jpg through sample_0211.jpg)
through Nemotron 3.5 Super VL via OpenRouter.
Saves results incrementally to vl_analysis_all_frames.json.
"""

import base64
import glob
import json
import os
import sys
import time

import openai

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
if not OPENROUTER_KEY:
    print("ERROR: Set OPENROUTER_API_KEY environment variable")
    sys.exit(1)

client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_KEY
)

FRAME_DIR = "C:/Users/Garrett/Sports/data/film_room_2026/_bootstrap"
OUT_PATH = os.path.join(FRAME_DIR, "vl_analysis_all_frames.json")
FRAMES = sorted(glob.glob(os.path.join(FRAME_DIR, "sample_*.jpg")))

print(f"Found {len(FRAMES)} frames to analyze")

# Load existing results if resuming
results = []
start_idx = 0
if os.path.exists(OUT_PATH):
    with open(OUT_PATH, "r") as f:
        results = json.load(f)
    completed = {r["frame"] for r in results}
    FRAMES = [f for f in FRAMES if os.path.basename(f) not in completed]
    print(f"Resuming: {len(results)} already done, {len(FRAMES)} remaining")

VLM_MODEL = "nvidia/nemotron-3.5-super-vl:free"
MAX_TOKENS = 2000
FRAME_DELAY = 1.5  # seconds between free-tier calls

PROMPT = (
    "Analyze this NFL football frame. Be concise — one sentence per field.\n"
    "(1) Play type: snap/pass/run/tackle/field_goal/punt/pregame/between_plays\n"
    "(2) Possession team: Panthers/Packers/unknown\n"
    "(3) Visible players: names/numbers if readable\n"
    "(4) Formation or alignment visible\n"
    "(5) Defensive coverage shell if visible\n"
    "(6) Down/distance or game situation if readable\n"
    "(7) Notable trench/QB detail"
)

for i, fp in enumerate(FRAMES):
    frame_name = os.path.basename(fp)
    print(f"[{i+1}/{len(FRAMES)}] {frame_name} ... ", end="", flush=True)
    
    try:
        with open(fp, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        
        response = client.chat.completions.create(
            model=VLM_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": PROMPT},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
                    ]
                }
            ],
            max_tokens=MAX_TOKENS
        )
        
        msg = response.choices[0].message
        content = msg.content if msg.content else "[EMPTY - rate limited]"
        
        results.append({
            "frame": frame_name,
            "path": fp,
            "analysis": content,
            "refusal": msg.refusal,
            "frame_index": i
        })
        print(f"done ({len(content)} chars)")
        
    except Exception as e:
        results.append({
            "frame": frame_name,
            "path": fp,
            "error": str(e),
            "frame_index": i
        })
        print(f"ERROR: {e}")
    
    # Save incrementally after every frame
    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=1)
    
    time.sleep(FRAME_DELAY)

print(f"\nComplete: {len(results)} total frame analyses saved to {OUT_PATH}")
