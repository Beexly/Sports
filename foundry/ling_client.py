#!/usr/bin/env python3
"""Fail-fast OpenRouter auxiliary client: inclusionai/ling-3.2-flash:free.

Standing routing update (Garrett, 2026-11-13): additive zero-cost lane for
OCR rescue + overflow extraction. NEVER blocks the Qwen4 primary lane.
  - 15s time-to-first-token, max 1 attempt per request
  - abort on 429/502/503/timeout/throughput < 25 tok/s
  - 3 consecutive failures -> 30-minute cooldown flag (ling_circuit.json)
Every output still passes gatekeeper.py commit; one gate rejection re-routes
the file to Qwen4 (no Ling retry).
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

MODEL = "inclusionai/ling-3.2-flash:free"
API = "https://openrouter.ai/api/v1/chat/completions"
HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, "ling_circuit.json")
TTFT_TIMEOUT = 15.0
MIN_TOKS_PER_S = 25.0
MAX_FAILS = 3
COOLDOWN_S = 1800


class LingUnavailable(Exception):
    pass


def _key():
    env = os.path.join(os.environ["LOCALAPPDATA"], "hermes", ".env")
    for line in open(env, encoding="utf-8"):
        if line.startswith("OPENROUTER_API_KEY="):
            v = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
            if v:
                return v
    raise LingUnavailable("OPENROUTER_API_KEY missing in .env")


def _state():
    try:
        return json.load(open(STATE, encoding="utf-8"))
    except Exception:
        return {"consecutive_failures": 0, "cooldown_until": 0, "last_error": None}


def _save(s):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(s, f, indent=1)


def circuit_ok():
    return time.time() >= _state().get("cooldown_until", 0)


def circuit_status():
    s = _state()
    return {
        "ok": circuit_ok(),
        "consecutive_failures": s.get("consecutive_failures", 0),
        "cooldown_remaining_s": max(0, int(s.get("cooldown_until", 0) - time.time())),
        "last_error": s.get("last_error"),
    }


def _fail(reason):
    s = _state()
    s["consecutive_failures"] = s.get("consecutive_failures", 0) + 1
    s["last_error"] = str(reason)[:300]
    if s["consecutive_failures"] >= MAX_FAILS:
        s["cooldown_until"] = time.time() + COOLDOWN_S
        s["consecutive_failures"] = 0
        s["last_error"] = "COOLDOWN_TRIPPED: " + str(reason)[:200]
    _save(s)


def _success():
    s = _state()
    s["consecutive_failures"] = 0
    s["last_error"] = None
    _save(s)


def chat(messages, thinking=True, max_tokens=16000):
    """One fail-fast attempt. Returns assistant text; raises LingUnavailable."""
    if not circuit_ok():
        raise LingUnavailable("circuit cooldown active")
    body = {"model": MODEL, "messages": messages, "max_tokens": max_tokens, "stream": True}
    if not thinking:
        body["reasoning"] = {"effort": "none"}
    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": "Bearer " + _key(),
            "Content-Type": "application/json",
            "HTTP-Referer": "https://galaxysportsedge.local",
            "X-Title": "GSE Foundry auxiliary lane",
        },
    )
    t0 = time.time()
    first_tok = None
    ntok = 0
    parts = []
    try:
        resp = urllib.request.urlopen(req, timeout=TTFT_TIMEOUT)
        for raw in resp:
            line = raw.decode("utf-8", errors="replace").strip()
            if not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if payload == "[DONE]":
                break
            try:
                delta = json.loads(payload)["choices"][0].get("delta", {})
            except Exception:
                continue
            piece = delta.get("content") or ""
            if piece:
                if first_tok is None:
                    first_tok = time.time()
                    if first_tok - t0 > TTFT_TIMEOUT:
                        raise LingUnavailable("TTFT > 15s")
                parts.append(piece)
                ntok += max(1, len(piece) // 4)
                el = time.time() - first_tok
                if el > 5.0 and ntok / el < MIN_TOKS_PER_S:
                    raise LingUnavailable("throughput < 25 tok/s")
    except LingUnavailable:
        _fail("slow")
        raise
    except urllib.error.HTTPError as e:
        detail = e.read()[:200].decode(errors="replace")
        _fail(f"HTTP {e.code}: {detail}")
        raise LingUnavailable(f"HTTP {e.code}")
    except Exception as e:
        _fail(f"{type(e).__name__}: {e}")
        raise LingUnavailable(str(e))
    text = "".join(parts)
    if not text.strip():
        _fail("empty response")
        raise LingUnavailable("empty response")
    _success()
    return text


def image_message(text, img_paths):
    content = [{"type": "text", "text": text}]
    for p in img_paths:
        b64 = base64.b64encode(open(p, "rb").read()).decode()
        mime = "image/jpeg" if p.lower().endswith((".jpg", ".jpeg")) else "image/png"
        content.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}})
    return {"role": "user", "content": content}


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "probe"
    if cmd == "status":
        print(json.dumps(circuit_status()))
    elif cmd == "probe":
        try:
            t0 = time.time()
            out = chat([{"role": "user", "content": "Reply with exactly: LING_PROBE_OK"}], thinking=False, max_tokens=20)
            print(json.dumps({"ok": True, "reply": out.strip()[:60], "elapsed_s": round(time.time() - t0, 1)}))
        except LingUnavailable as e:
            print(json.dumps({"ok": False, "error": str(e), "circuit": circuit_status()}))
    else:
        print("usage: ling_client.py [probe|status]")
