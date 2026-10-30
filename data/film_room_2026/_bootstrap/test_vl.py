import base64, os, openai

OPENROUTER_KEY = os.environ["OPENROUTER_API_KEY2"]

frame_path = "C:/Users/Garrett/Sports/data/film_room_2026/_bootstrap/sample_0005.jpg"
with open(frame_path, "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_KEY
)

try:
    response = client.chat.completions.create(
        model="nvidia/nemotron-3.5-super-vl:free",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Is this an NFL football game? Describe what you see in detail - players, field, formation, action."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
                ]
            }
        ],
        max_tokens=500
    )
    print("SUCCESS")
    print(response.choices[0].message.content)
except Exception as e:
    print("ERROR:", type(e).__name__, str(e)[:500])
