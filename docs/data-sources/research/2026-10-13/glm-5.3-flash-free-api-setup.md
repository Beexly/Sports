# Free GLM-5.3-Flash (Abliterated) — API Setup File

Hand this file to Minis (or any agent) to set up free GLM access anywhere.
Last verified: 2026-10-06.

> **No local install. No GPU. No download.** This is a cloud API — it works
> from any environment with internet access, including the Minis app setup.
> All you configure is a URL, a model name, and a key.

## What this is

- **Model:** GLM-5.3-Flash Abliterated — Z.ai's 320B-parameter MIT-licensed model, uncensored ("abliterated" = refusal layer stripped)
- **Context window:** 1,048,576 tokens (1M)
- **Max output:** 131,072 tokens
- **Speed:** ~33 tokens/sec
- **Cost:** FREE (via Experiential Labs free tier)
- **API style:** OpenAI-compatible Chat Completions — works with any OpenAI client, just change the base URL and key

## Step 1 — Get the free API key (human tap, 2 minutes)

1. Go to https://platform.experientiallabs.ai
2. Sign up / log in
3. Settings → API Keys → create a key
4. Save it as `EXPLABS_API_KEY` — treat it like a password, never paste it in chat

## Step 2 — Connection details

```
Base URL:  https://api.experientiallabs.ai/v1
Model ID:  glm-5.3-flash-abliterated
Auth:      Authorization: Bearer $EXPLABS_API_KEY
```

## Step 3 — Test it (curl)

```bash
export EXPLABS_API_KEY="your-key-here"

curl https://api.experientiallabs.ai/v1/chat/completions \
  -H "Authorization: Bearer $EXPLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5.3-flash-abliterated",
    "messages": [{"role": "user", "content": "Say OK if you are running."}],
    "max_tokens": 50
  }'
```

Expected: a JSON response with `"content": "OK..."` and a `usage` block.

## Step 4 — Python (OpenAI SDK)

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://api.experientiallabs.ai/v1",
    api_key=os.environ["EXPLABS_API_KEY"],
)

resp = client.chat.completions.create(
    model="glm-5.3-flash-abliterated",
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=1024,
)
print(resp.choices[0].message.content)
print(resp.usage)  # confirm it runs on free credits
```

## Step 5 — Common agent tools

**opencode** (`~/.config/opencode/opencode.json`):
```json
{
  "provider": {
    "experiential": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Experiential Labs",
      "options": { "baseURL": "https://api.experientiallabs.ai/v1" },
      "models": {
        "glm-5.3-flash-abliterated": {
          "name": "GLM-5.3-Flash Abliterated",
          "limit": { "context": 1048576, "output": 131072 }
        }
      }
    }
  }
}
```

**Cline / Kilo Code / Continue:** add a custom OpenAI-compatible provider with the base URL above and the model ID. No other settings needed.

**Anything OpenAI-compatible:** base URL + key + model ID is the whole integration.

## Notes for Minis

- The key lives in the `EXPLABS_API_KEY` env var. Read it from the environment — never hardcode it, never log it, never commit it.
- Supported parameters: temperature 0–2, top-p, top-k, stop sequences, tools/parallel tool calls, structured output, streaming. Reasoning levels: none/minimal/low/medium/high/xhigh/max (default high).
- This is the model already wired into OpenDots via `scripts/swap-model.sh` — same endpoint, same key.
- **Caveat:** free quotas, rate limits, and model availability can change at any time. If calls start failing, check https://platform.experientiallabs.ai for status before debugging config. Keep the OpenRouter fallback configured.
