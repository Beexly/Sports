import base64, openai, json, os, glob

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")

client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_KEY
)

frame_dir = "C:/Users/Garrett/Sports/data/film_room_2026/_bootstrap"
frames = sorted(glob.glob(os.path.join(frame_dir, "sample_*.jpg")))

results = []
for i, fp in enumerate(frames[:12]):
    with open(fp, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    try:
        response = client.chat.completions.create(
            model="nvidia/nemotron-3.5-super-vl:free",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Is this an NFL football game? If yes, identify: (1) what play is happening, (2) which team has possession (Panthers or Packers), (3) key players visible (names/numbers), (4) formation visible, (5) game situation. Be concise."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
                    ]
                }
            ],
            max_tokens=2000
        )
        msg = response.choices[0].message
        content = msg.content if msg.content else "[EMPTY - see reasoning]"
        results.append({"frame": os.path.basename(fp), "analysis": content})
        print(f"Frame {i+1}/12: {content[:250]}...")
    except Exception as e:
        results.append({"frame": os.path.basename(fp), "error": str(e)[:200]})
        print(f"Frame {i+1}/10: ERROR {e}")

with open(os.path.join(frame_dir, "vl_analysis_sample.json"), "w") as f:
    json.dump(results, f, indent=1)

print(f"\nSaved VL analysis for {len(results)} frames")
