import os
import json
import urllib.request

env_dict = {}
with open(r"C:\Users\Garrett\AppData\Local\hermes\.env", "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env_dict[k.strip()] = v.strip().strip('"').strip("'")

openrouter_key = env_dict.get("OPENROUTER_API_KEY")
free_models = [
    "deepseek/deepseek-chat",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-72b-instruct",
]

for model in free_models:
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Respond with 5 words: Status of GSE sovereign brain."}],
            "max_tokens": 50,
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {openrouter_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://galaxyedge.io",
                "X-Title": "Galaxy Sports Edge",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            res = json.loads(r.read().decode())
            reply = res["choices"][0]["message"]["content"]
            print(f"[{model}]: SUCCESS -> {reply.strip()}")
            break
    except Exception as e:
        print(f"[{model}] failed: {e}")
