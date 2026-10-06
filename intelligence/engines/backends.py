# Provenance: Garrett 2026-10-02 directive — "put our brain in another engine."
# The LLM performs L3/L4/L5 reasoning GROUNDED by our data providers; the
# deterministic contract (reasoning/) still disposes. Spec: reasoning-depth-spec.md §§4–8.
# Billing policy: HF ZeroGPU docs (docs/hub/spaces-zerogpu) — free daily quota,
# overage draws from pre-paid credit balance only; no card charge without
# explicit credit purchase or auto-recharge. See engines/README.md.

"""LLM backends for the GSE brain: Gradio (HF Spaces) and OpenAI-compatible HTTP.

Reliability contract (Garrett: never die quietly):
- Cold starts / Space sleep (503) → wait + retry with backoff, clear messages.
- ZeroGPU queue waits → bounded retries, then a loud error (never silent).
- Quota exhaustion (429 / "quota" / "exhausted" in the error) → QuotaExhausted,
  so the harness can degrade gracefully and say so in the trace.
- Any backend failure surfaces as BackendUnavailable/QuotaExhausted/BackendError;
  the harness catches these and falls back to the deterministic Python engine,
  annotating the trace. Nothing fails silently.
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, field


# --- proxy env sanitation -------------------------------------------------
# This runtime's no_proxy carries bracketed IPv6 literals ([::1]) that break
# httpx's proxy-pattern parser (httpx.InvalidURL: Invalid port: ':1]').
# Strip bracketed entries before any HTTP client is constructed. Harmless
# outside this runtime.

def _sanitize_proxy_env() -> None:
    for key in ("NO_PROXY", "no_proxy"):
        val = os.environ.get(key)
        if not val:
            continue
        parts = [p for p in val.split(",") if "[" not in p]
        if len(parts) != len(val.split(",")):
            os.environ[key] = ",".join(parts)


_sanitize_proxy_env()


# --- error taxonomy --------------------------------------------------------


class BackendError(Exception):
    """Base: the LLM backend failed."""


class BackendUnavailable(BackendError):
    """Connection failed, timed out, Space asleep/paused, queue gave up."""


class QuotaExhausted(BackendError):
    """ZeroGPU daily quota exhausted (or rate-limited). Degrade gracefully."""


def _is_quota_message(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in ("quota", "exhausted", "429", "too many requests",
                               "daily limit", "rate limit"))


def _is_sleep_message(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in ("paused", "sleeping", "building", "503",
                               "service unavailable", "waking"))


@dataclass
class BackendResult:
    text: str
    latency_s: float
    backend_name: str
    raw_meta: dict = field(default_factory=dict)


class LLMBackend:
    """Protocol: generate(prompt, system) -> BackendResult."""

    name = "base"

    def generate(self, prompt: str, system: str = "",
                 max_tokens: int = 1024, temperature: float = 0.2) -> BackendResult:
        raise NotImplementedError


# --- Gradio backend (HF Spaces) --------------------------------------------


class GradioBackend(LLMBackend):
    """Call a Gradio chat Space via gradio_client.

    Handles: cold start (wait for /config), Space paused (loud error telling
    the user to restart), queue waits (bounded), quota exhaustion (detected
    from error text).
    """

    name = "gradio"

    def __init__(self, space: str, api_name: str = "/chat",
                 max_retries: int = 4, base_backoff_s: float = 5.0,
                 request_timeout_s: float = 180.0,
                 extra_params: dict | None = None,
                 hf_token: str | None = None):
        self.space = space
        self.api_name = api_name
        self.max_retries = max_retries
        self.base_backoff_s = base_backoff_s
        self.request_timeout_s = request_timeout_s
        self.extra_params = extra_params or {}
        self.hf_token = hf_token
        self._client = None

    def _connect(self):
        if self._client is not None:
            return self._client
        from gradio_client import Client
        last = None
        for attempt in range(self.max_retries):
            try:
                self._client = (Client(self.space, token=self.hf_token)
                                if self.hf_token else Client(self.space))
                return self._client
            except Exception as exc:  # noqa: BLE001
                last = exc
                msg = str(exc)
                if _is_quota_message(msg):
                    raise QuotaExhausted(f"ZeroGPU quota exhausted for {self.space}: {msg}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.base_backoff_s * (2 ** attempt))
        raise BackendUnavailable(
            f"Could not reach Gradio Space {self.space} after {self.max_retries} "
            f"attempts (cold start / paused / network). Last error: {last}. "
            f"If the Space is paused, restart it: hf-api POST /api/spaces/{self.space}/restart")

    def generate(self, prompt: str, system: str = "",
                 max_tokens: int = 1024, temperature: float = 0.2) -> BackendResult:
        client = self._connect()
        message = f"{system}\n\n{prompt}" if system else prompt
        last = None
        for attempt in range(self.max_retries):
            t0 = time.time()
            try:
                # extra_params lets callers set Space-specific controls
                # (e.g. studio-chat's mode dropdown / max tokens / temperature).
                # Only pass what the caller configured — endpoints differ.
                result = client.predict(message, api_name=self.api_name,
                                        **dict(self.extra_params))
                text = result if isinstance(result, str) else str(result)
                return BackendResult(text=text, latency_s=time.time() - t0,
                                     backend_name=f"gradio:{self.space}")
            except Exception as exc:  # noqa: BLE001
                last = exc
                msg = str(exc)
                if _is_quota_message(msg):
                    raise QuotaExhausted(f"ZeroGPU quota exhausted for {self.space}: {msg}")
                if _is_sleep_message(msg) and attempt < self.max_retries - 1:
                    time.sleep(self.base_backoff_s * (2 ** attempt))
                    continue
                if attempt < self.max_retries - 1:
                    time.sleep(self.base_backoff_s * (2 ** attempt))
        raise BackendUnavailable(
            f"Gradio Space {self.space} failed after {self.max_retries} attempts. "
            f"Last error: {last}")


# --- OpenAI-compatible HTTP backend ----------------------------------------


class OpenAICompatBackend(LLMBackend):
    """POST {base_url}/v1/chat/completions. Stdlib only (urllib)."""

    name = "openai-compat"

    def __init__(self, base_url: str, model: str, api_key: str | None = None,
                 max_retries: int = 3, base_backoff_s: float = 3.0,
                 request_timeout_s: float = 180.0):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.max_retries = max_retries
        self.base_backoff_s = base_backoff_s
        self.request_timeout_s = request_timeout_s

    def generate(self, prompt: str, system: str = "",
                 max_tokens: int = 1024, temperature: float = 0.2) -> BackendResult:
        body = json.dumps({
            "model": self.model,
            "messages": ([{"role": "system", "content": system}] if system else [])
                        + [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }).encode()
        last = None
        for attempt in range(self.max_retries):
            t0 = time.time()
            req = urllib.request.Request(
                f"{self.base_url}/v1/chat/completions", data=body,
                headers={"Content-Type": "application/json"})
            if self.api_key:
                req.add_header("Authorization", f"Bearer {self.api_key}")
            try:
                with urllib.request.urlopen(req, timeout=self.request_timeout_s) as resp:
                    data = json.loads(resp.read().decode())
                text = data["choices"][0]["message"]["content"]
                return BackendResult(text=text, latency_s=time.time() - t0,
                                     backend_name=f"openai-compat:{self.model}")
            except urllib.error.HTTPError as exc:
                body_text = exc.read().decode(errors="replace")[:500]
                if exc.code == 429 or _is_quota_message(body_text):
                    raise QuotaExhausted(f"HTTP 429 / quota from {self.base_url}: {body_text}")
                last = f"HTTP {exc.code}: {body_text}"
            except Exception as exc:  # noqa: BLE001
                last = str(exc)
            if attempt < self.max_retries - 1:
                time.sleep(self.base_backoff_s * (2 ** attempt))
        raise BackendUnavailable(
            f"OpenAI-compatible endpoint {self.base_url} failed after "
            f"{self.max_retries} attempts. Last error: {last}")
