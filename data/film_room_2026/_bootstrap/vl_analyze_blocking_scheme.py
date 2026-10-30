#!/usr/bin/env python3
"""
VL analysis for NFL Pro blocking scheme frames.
Processes all blocking_frame_*.jpg frames through Nemotron 3.5 Super VL.
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
OUT_PATH = os.path.join(FRAME_DIR, "vl_analysis_blocking_scheme.json")
FRAMES = sorted(glob.glob(os.path.join(FRAME_DIR, "blocking_frame_*.jpg")))

print(f"Found {len(FRAMES)} blocking scheme frames to analyze")

# Load existing results if resuming
results = []
if os.path.exists(OUT_PATH):
    with open(OUT_PATH, "r") as f:
        results = json.load(f)
    completed = {r["frame"] for r in results}
    FRAMES = [f for f in FRAMES if os.path.basename(f) not in completed]
    print(f"Resuming: {len(results)} already done, {len(FRAMES)} remaining")

VLM_MODEL = "nvidia/nemotron-3.5-super-vl:free"
MAX_TOKENS = 2000
FRAME_DELAY = 1.5

PROMPT = (
    "Analyze this NFL blocking scheme video frame. Be concise — one sentence per field.\n"
    "(1) Content type: blocking scheme explanation/coach diagram/film example/graphics\n"
    "(2) Blocking scheme type: zone/gap/power/counter/inside zone/outside zone/pass protection\n"
    "(3) Visible players: offensive linemen, defenders, names/numbers if readable\n"
    "(4) Formation or alignment visible\n"
    "(5) Trench detail: which OL engaged, double teams, stunts, blitz pickups\n"
    "(6) Coaching point or scheme concept being taught\n"
    "(7) Any play diagram or overlay graphics"
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
            "frame_index": i,
            "content_type": "blocking_scheme_education"
        })
        print(f"done ({len(content)} chars)")
        
    except Exception as e:
        results.append({
            "frame": frame_name,
            "path": fp,
            "error": str(e),
            "frame_index": i,
            "content_type": "blocking_scheme_education"
        })
        print(f"ERROR: {e}")
    
    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=1)
    
    time.sleep(FRAME_DELAY)

print(f"\nComplete: {len(results)} total blocking scheme frame analyses saved to {OUT_PATH}")
