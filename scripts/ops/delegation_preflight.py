"""Verify the subagent provider is usable BEFORE dispatching a batch.

Why this exists: three delegation batches in one session died on
`HTTP 401: Invalid API key` — 7 subagent tasks lost after each had already
started. The cause was configuration: the model was pinned to a provider that
did not host it, and a stale `delegation.base_url` overrode the provider URL.
Every one of those was detectable in seconds without starting a single child.

Checks, in order (each one short-circuits with a specific diagnosis):
  1. delegation.provider and delegation.model are set
  2. delegation.base_url is not silently overriding the provider
  3. an API key resolves from config or the provider's env var
  4. the model id appears in the provider's /models list
  5. a 1-token completion authenticates

Exit codes:
  0 healthy
  1 unhealthy (provider/model/auth broken)
  2 config incomplete
  3 network unreachable (retry later; not a config problem)

Never prints the key. Reports only presence and length.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

CONFIG = Path(os.environ.get(
    "HERMES_CONFIG", r"C:\Users\Garrett\AppData\Local\hermes\config.yaml"))

# provider -> (base_url, env var names in priority order)
PROVIDERS = {
    "openrouter": ("https://openrouter.ai/api/v1", ["OPENROUTER_API_KEY"]),
    "omniroute": ("http://127.0.0.1:8317/v1", ["OMNIROUTE_API_KEY", "OPENAI_API_KEY"]),
    "openai": ("https://api.openai.com/v1", ["OPENAI_API_KEY"]),
    "anthropic": ("https://api.anthropic.com/v1", ["ANTHROPIC_API_KEY"]),
}


def _read_config() -> dict:
    """Minimal top-level `delegation:` reader; avoids a yaml dependency."""
    text = CONFIG.read_text(encoding="utf-8", errors="replace")
    out: dict[str, str] = {}
    inside = False
    for line in text.splitlines():
        if line.startswith("delegation:"):
            inside = True
            continue
        if inside:
            if line and not line.startswith((" ", "\t")):
                break
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if ":" in stripped:
                k, v = stripped.split(":", 1)
                out[k.strip()] = v.strip().strip("'\"")
    return out


def _get(url: str, key: str, timeout: int = 20) -> tuple[int, dict | list | str]:
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {key}",
        "User-Agent": "GSE-preflight/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, (e.read()[:400].decode("utf-8", "replace"))
    except Exception as e:  # noqa: BLE001
        return 0, f"{type(e).__name__}: {e}"


def _post(url: str, key: str, body: dict, timeout: int = 30) -> tuple[int, dict | str]:
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": "GSE-preflight/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:400].decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, f"{type(e).__name__}: {e}"


def main(argv: list[str] | None = None) -> int:
    if not CONFIG.exists():
        print(f"[FAIL] config not found: {CONFIG}")
        return 2
    cfg = _read_config()
    provider = cfg.get("provider") or ""
    model = cfg.get("model") or ""
    base_url = cfg.get("base_url") or ""

    print(f"config: {CONFIG}")
    print(f"  provider: {provider or '(unset)'}")
    print(f"  model:    {model or '(unset)'}")
    print(f"  base_url: {base_url or '(unset)'}")

    if not provider or not model:
        print("[FAIL] delegation.provider and delegation.model must both be set")
        return 2
    if provider not in PROVIDERS:
        print(f"[FAIL] unknown provider {provider!r}; known: {sorted(PROVIDERS)}")
        return 2

    canonical, env_names = PROVIDERS[provider]

    # 2. base_url override — the silent killer. A leftover base_url points the
    #    client at a different host while the config still says openrouter.
    if base_url and base_url.rstrip("/") != canonical.rstrip("/"):
        print(f"[WARN] delegation.base_url overrides the provider URL: "
              f"{base_url} != {canonical}")
        print("       This is the exact shape of the 401 failures: the client "
              "talked to the wrong host with a key that host did not accept.")
        print("       Unset it: hermes config unset delegation.base_url")
    elif base_url:
        print("  base_url matches the provider (harmless)")

    # 3. API key
    key = cfg.get("api_key") or ""
    if not key:
        for name in env_names:
            key = os.environ.get(name, "")
            if key:
                print(f"  api key: from ${name} (len={len(key)})")
                break
    else:
        print(f"  api key: from config (len={len(key)})")
    if not key:
        print(f"[FAIL] no API key; set delegation.api_key or one of {env_names}")
        return 1

    # 4. model presence
    status, payload = _get(f"{canonical}/models", key)
    if status == 0:
        print(f"[FAIL] network unreachable: {payload}")
        return 3
    if status in (401, 403):
        print(f"[FAIL] /models rejected the key (HTTP {status}) — key invalid or "
              f"not valid for {provider}")
        print(f"       {str(payload)[:200]}")
        return 1
    if status != 200:
        print(f"[WARN] /models returned HTTP {status}; skipping model-list check")
    else:
        ids = {m.get("id") for m in payload.get("data", []) if isinstance(m, dict)}
        if model in ids:
            print(f"  model present in /models ({len(ids)} total)")
        else:
            near = sorted(i for i in ids if model.split("/")[-1] in i)[:5]
            print(f"[FAIL] model {model!r} NOT in {provider}/models ({len(ids)} available)")
            if near:
                print(f"       near matches: {near}")
            return 1

    # 5. auth + model acceptance in one real call
    status, payload = _post(f"{canonical}/chat/completions", key, {
        "model": model,
        "messages": [{"role": "user", "content": "ok"}],
        "max_tokens": 1,
    })
    if status == 0:
        print(f"[FAIL] completion unreachable: {payload}")
        return 3
    if status in (401, 403):
        print(f"[FAIL] completion rejected the key (HTTP {status})")
        print(f"       {str(payload)[:300]}")
        return 1
    if status != 200:
        print(f"[FAIL] completion failed HTTP {status}")
        print(f"       {str(payload)[:300]}")
        return 1

    print("[ OK ] delegation provider healthy — safe to dispatch")
    return 0


if __name__ == "__main__":
    sys.exit(main())
