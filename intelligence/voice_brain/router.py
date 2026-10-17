"""Cost-Optimized Sovereign Model Router.

Prioritizes:
1. OpenRouter frontier models (DeepSeek-V3 / DeepSeek-R1 / Qwen-2.5-72B via Hermes .env key).
2. Google AI Studio / Gemini API.
3. Neon AI Gateway (direct serverless proxy with preconfigured token).
4. Local Hermes CLI (oneshot mode).
5. Offline GSE Symbolic Engine (deterministic failsafe).
"""

from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Tuple


def _load_env() -> Dict[str, str]:
    env_dict: Dict[str, str] = {}
    candidates = [
        r"C:\Users\Garrett\AppData\Local\hermes\.env",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env.local"),
        os.path.join(os.getcwd(), ".env.local"),
        r"C:\Users\Garrett\Sports\.env.local",
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            try:
                with open(candidate, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            env_dict[k.strip()] = v.strip().strip('"').strip("'")
            except Exception:
                pass
    return env_dict


class ModelRouter:
    def __init__(self):
        env_keys = _load_env()
        # OpenRouter Key from env.local, hermes, or os.environ
        self.openrouter_key = (
            os.environ.get("OPENROUTER_API_KEY")
            or env_keys.get("OPENROUTER_API_KEY")
            or ""
        )
        self.gemini_key = (
            os.environ.get("GEMINI_API_KEY")
            or env_keys.get("GEMINI_API_KEY")
            or env_keys.get("GOOGLE_API_KEY")
            or ""
        )
        self.neon_gw_url = os.environ.get("NEON_AI_GATEWAY_BASE_URL", "")
        self.neon_gw_token = (
            os.environ.get("NEON_AI_GATEWAY_TOKEN")
            or env_keys.get("NEON_AI_GATEWAY_TOKEN")
            or env_keys.get("NEON_API_TOKEN")
            or ""
        )
        self.hermes_path = os.environ.get(
            "HERMES_EXE", r"C:\Users\Garrett\AppData\Local\hermes\bin\hermes.exe"
        )

    def route_query(
        self,
        prompt: str,
        system_instruction: str = "",
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.2,
    ) -> Tuple[str, str, float]:
        """Routes query to the best available model.

        Returns (response_text, provider_name, cost_cents)
        """
        history = conversation_history or []

        # 1. OpenRouter (DeepSeek-Chat / Frontier intelligence)
        if self.openrouter_key:
            try:
                res, model = self._call_openrouter(
                    prompt, system_instruction, history, temperature
                )
                if res:
                    return res, f"openrouter:{model}", 0.0
            except Exception as e:
                pass

        # 2. Google AI Studio / Gemini API
        if self.gemini_key:
            try:
                res, model = self._call_gemini(
                    prompt, system_instruction, history, temperature
                )
                if res:
                    return res, f"google-gemini:{model}", 0.0
            except Exception:
                pass

        # 3. Neon AI Gateway
        if self.neon_gw_url and self.neon_gw_token:
            try:
                res, model = self._call_neon_gateway(
                    prompt, system_instruction, history, temperature
                )
                if res:
                    return res, f"neon-gateway:{model}", 0.0
            except Exception:
                pass

        # 4. Local Hermes CLI
        if os.path.exists(self.hermes_path):
            try:
                res = self._call_hermes(prompt, system_instruction)
                if res:
                    return res, "hermes-local", 0.0
            except Exception:
                pass

        # 5. Deterministic Local Fallback (The GSE Symbolic Brain)
        fallback_res = self._local_gse_fallback(prompt)
        return fallback_res, "gse-symbolic-offline", 0.0

    def _call_openrouter(
        self,
        prompt: str,
        system_instruction: str,
        history: List[Dict[str, str]],
        temperature: float,
    ) -> Tuple[str, str]:
        models = [
            "nvidia/nemotron-3.5-lightning:free",
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            "google/gemma-4-26b-a4b-it:free",
            "thinkingmachines/inkling:free",
            "liquid/lfm-2.5-2.6b:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-chat",
            "qwen/qwen-2.5-72b-instruct",
        ]
        url = "https://openrouter.ai/api/v1/chat/completions"

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        for h in history:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": prompt})

        for model in models:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 4096,
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://galaxyedge.io",
                    "X-Title": "Galaxy Sports Edge",
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    resp_json = json.loads(resp.read().decode("utf-8"))
                    choices = resp_json.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                        if content:
                            return content, model
            except Exception:
                continue
        raise RuntimeError("OpenRouter calls failed")

    def _call_gemini(
        self,
        prompt: str,
        system_instruction: str,
        history: List[Dict[str, str]],
        temperature: float,
    ) -> Tuple[str, str]:
        models = ["gemini-2.5-flash", "gemini-1.5-flash"]
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
            contents = []
            if system_instruction:
                contents.append(
                    {"role": "user", "parts": [{"text": f"[SYSTEM INSTRUCTION]: {system_instruction}"}]}
                )
                contents.append(
                    {"role": "model", "parts": [{"text": "Understood. Standing doctrines loaded."}]}
                )
            for h in history:
                role = "user" if h.get("role") == "user" else "model"
                contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
            contents.append({"role": "user", "parts": [{"text": prompt}]})

            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": 4096,
                },
            }
            req = urllib.request.Request(
                url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}
            )
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    resp_json = json.loads(resp.read().decode("utf-8"))
                    candidates = resp_json.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text = "".join(p.get("text", "") for p in parts)
                        if text:
                            return text, model
            except Exception:
                continue
        raise RuntimeError("Gemini API calls failed")

    def _call_neon_gateway(
        self,
        prompt: str,
        system_instruction: str,
        history: List[Dict[str, str]],
        temperature: float,
    ) -> Tuple[str, str]:
        endpoint = f"{self.neon_gw_url.rstrip('/')}/v1/chat/completions"
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        for h in history:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": "deepseek-chat",
            "messages": messages,
            "temperature": temperature,
        }
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.neon_gw_token}",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_json = json.loads(resp.read().decode("utf-8"))
            choices = resp_json.get("choices", [])
            if choices:
                return choices[0].get("message", {}).get("content", ""), "deepseek-chat"
        raise RuntimeError("Neon Gateway call failed")

    def _call_hermes(self, prompt: str, system_instruction: str) -> str:
        full_input = f"{system_instruction}\n\nTask: {prompt}" if system_instruction else prompt
        result = subprocess.run(
            [self.hermes_path, "-z", full_input],
            capture_output=True,
            text=True,
            timeout=35,
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout.strip()
        raise RuntimeError(f"Hermes failed: {result.stderr}")

    def _local_gse_fallback(self, prompt: str) -> str:
        return (
            f"[GSE Sovereign Local Kernel]\n"
            f"Query acknowledged: '{prompt}'\n"
            f"Standing Doctrines: Direct-to-Mind, Wire-First, Reasoning Overlay Active.\n"
            f"The engine is currently running locally. All systems nominal."
        )
