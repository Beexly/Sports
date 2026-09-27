"""Label each reel's transcript with the text model (Garrett's AI/ML API key).

Reads TEXT_MODEL_* from ~/workspace/jev-ultrafast/.env (his key, already
authorized for his text tasks). Uses curl to dodge the sandbox's httpx/proxy
URL-parsing bug. Tracks token usage for cost reporting.
"""
import json
import os
import subprocess
from pathlib import Path

ENV_FILE = Path("/home/hatch/workspace/jev-ultrafast/.env")

SYSTEM = """You are a short-form video analyst. Given a reel transcript (timestamped segments), \
caption, and engagement numbers, return ONE JSON object, no other text:
{
  "topic": "short topic label, 1-4 words",
  "hook_type": "one of: Curiosity, Recognition, Result, Direct, Controversy, Story, Question, Listicle, Other",
  "hook_text": "the opening hook, first ~20 words",
  "structure": "e.g. hook > setup > payoff > pitch",
  "cta": "the call to action, or null",
  "sentences": [{"t0": 0.0, "t1": 1.2, "text": "...", "tag": "hook|setup|payoff|pitch"}]
}
Tag EVERY sentence. The first 1-3 seconds are almost always the hook."""


def _env():
    cfg = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            cfg[k.strip()] = v.strip()
    return cfg


def label_reel(transcript, caption, likes, comments, usage_log=None):
    cfg = _env()
    segs = transcript["segments"]
    if segs:
        tx = "\n".join(f"[{s['t0']}-{s['t1']}] {s['text']}" for s in segs)
    else:
        tx = "(no speech detected in audio — classify from the caption instead)"
    user = (
        f"TRANSCRIPT:\n{tx}"
        + f"\n\nCAPTION: {caption[:600]}\nLIKES: {likes}  COMMENTS: {comments}"
    )
    reasoning = {"reasoning": {"enabled": False}} if cfg.get(
        "TEXT_MODEL_REASONING") == "none" else {}
    payload = {
        "model": cfg["TEXT_MODEL"],
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ],
        "max_tokens": 4000,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        **reasoning,
    }
    for attempt in range(3):
        r = subprocess.run(
            ["curl", "-s", "--max-time", "120",
             f"{cfg['TEXT_MODEL_BASE_URL']}/chat/completions",
             "-H", f"Authorization: Bearer {cfg['TEXT_MODEL_API_KEY']}",
             "-H", "Content-Type: application/json",
             "-d", json.dumps(payload)],
            capture_output=True, text=True, timeout=150,
        )
        try:
            data = json.loads(r.stdout)
            msg = data["choices"][0]["message"]
            content = msg.get("content") or ""
            use = data.get("usage", {})
            if usage_log is not None:
                usage_log.append(use)
            # strip accidental code fences
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0]
            parsed = json.loads(content)
            if isinstance(parsed, list):  # model sometimes wraps in a list
                parsed = next((x for x in parsed if isinstance(x, dict)), {})
            if not isinstance(parsed, dict) or "topic" not in parsed:
                raise ValueError(f"unexpected label shape: {str(parsed)[:120]}")
            return parsed
        except Exception as e:
            if attempt == 2:
                raise RuntimeError(f"label call failed: {e} :: {r.stdout[:300]}")
    raise RuntimeError("unreachable")
