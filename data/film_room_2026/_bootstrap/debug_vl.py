import base64, openai, json

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")

client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_KEY
)

fp = "C:/Users/Garrett/Sports/data/film_room_2026/_bootstrap/sample_0001.jpg"
with open(fp, "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

try:
    response = client.chat.completions.create(
        model="nvidia/nemotron-3.5-super-vl:free",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Is this an NFL football game? Describe what you see."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
                ]
            }
        ],
        max_tokens=300
    )
    print("Response object:", response)
    msg = response.choices[0].message
    print("Message:", msg)
    print("Content:", repr(msg.content))
    print("Refusal:", msg.refusal)
except Exception as e:
    print("ERROR:", type(e).__name__, str(e)[:500])
