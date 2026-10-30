#!/usr/bin/env python3
"""
Exhaustive VL frame analysis for NFL game film.
Processes ALL extracted frames through Nemotron 3.5 Super VL via OpenRouter.
Saves results incrementally for resume capability.
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

FRAME_DIR = sys.argv[1] if len(sys.argv) > 1 else "."
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else os.path.join(FRAME_DIR, "vl_analysis.json")
FRAME_PATTERN = sys.argv[3] if len(sys.argv) > 3 else "*.jpg"

FRAMES = sorted(glob.glob(os.path.join(FRAME_DIR, FRAME_PATTERN)))

print(f"Found {len(FRAMES)} frames to analyze in {FRAME_DIR}")

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
FRAME_DELAY = 1.2

PROMPT = (
    "Analyze this NFL football frame. Be concise — one sentence per field.\n"
    "(1) Play type: snap/pass/run/tackle/field_goal/punt/pregame/between_plays\n"
    "(2) Possession team: team name or unknown\n"
    "(3) Visible players: names/numbers if readable\n"
    "(4) Formation or alignment visible\n"
    "(5) Defensive coverage shell if visible\n"
    "(6) Down/distance or game situation if readable\n"
    "(7) Notable trench/QB detail"
)

start_time = time.time()
for i, fp in enumerate(FRAMES):
    frame_name = os.path.basename(fp)
    elapsed = time.time() - start_time
    avg_per_frame = elapsed / (i + 1) if i > 0 else 0
    eta = avg_per_frame * (len(FRAMES) - i - 1)
    print(f"[{i+1}/{len(FRAMES)}] {frame_name} (ETA {eta:.0f}s) ... ", end="", flush=True)
    
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
