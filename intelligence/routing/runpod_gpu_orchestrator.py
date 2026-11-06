"""RunPod GPU Serverless & NVIDIA NIM Orchestrator (`intelligence/routing/runpod_gpu_orchestrator.py`).

Provides live GraphQL account/endpoint introspection, FlashBoot Serverless burst dispatch
(`t85m_injury_resim` and `halftime_live_slate_burst`) with automatic zero-cost local CPU/NumPy
fallback when `clientBalance == 0` or no serverless endpoint is deployed, and downloadable
NVIDIA NIM container deployment specifications for RunPod Serverless and GPU Pods.

Security Invariant:
  - NEVER hardcode, print, or log the raw `RUNPOD_API_KEY`.
  - Always load from `os.environ` or `.env.local` at runtime and mask as `rpa_3A23...a1az`.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional


RUNPOD_GRAPHQL_URL = "https://api.runpod.io/graphql"
RUNPOD_SERVERLESS_BASE_URL = "https://api.runpod.ai/v2"
USER_AGENT = "GalaxySportsEdge-Orchestrator/1.0"

RUNPOD_MYSELF_QUERY = (
    "query { myself { id email clientBalance currentSpendPerHr serverlessDiscount "
    "pods { id name desiredStatus gpuCount } "
    "endpoints { id name gpuIds workersMin workersMax idleTimeout } } }"
)

RUNPOD_MYSELF_LIVE_COMPAT_QUERY = (
    "query { myself { id email clientBalance currentSpendPerHr "
    "pods { id name desiredStatus gpuCount } "
    "endpoints { id name gpuIds workersMin workersMax idleTimeout } } }"
)


def _find_env_local_paths() -> List[Path]:
    """Return candidate `.env.local` paths in priority order."""
    repo_root = Path(__file__).resolve().parents[2]
    candidates = [
        repo_root / ".env.local",
        Path(r"C:\c\wt-week8-forensic\.env.local"),
        Path(r"C:\Users\Garrett\Sports\.env.local"),
    ]
    seen = set()
    ordered: List[Path] = []
    for p in candidates:
        norm = str(p).lower()
        if norm not in seen:
            seen.add(norm)
            ordered.append(p)
    return ordered


def load_env_local_secrets() -> Dict[str, str]:
    """Load key-value pairs from `.env.local` into `os.environ` if not already set."""
    loaded: Dict[str, str] = {}
    for env_path in _find_env_local_paths():
        if not env_path.is_file():
            continue
        try:
            for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                key = k.strip()
                val = v.strip().strip('"').strip("'")
                if key and key not in loaded:
                    loaded[key] = val
                if key and not os.environ.get(key):
                    os.environ[key] = val
        except OSError:
            continue
    return loaded


def mask_api_key(key: Optional[str]) -> str:
    """Mask an API key so only prefix and suffix are visible (e.g. `rpa_3A23...a1az`)."""
    if not key:
        return "UNSET"
    clean = key.strip()
    if len(clean) <= 12:
        return f"{clean[:4]}..."
    return f"{clean[:8]}...{clean[-4:]}"


def get_runpod_api_key() -> Optional[str]:
    """Retrieve `RUNPOD_API_KEY` from environment or `.env.local` without logging it."""
    key = os.environ.get("RUNPOD_API_KEY", "").strip()
    if not key:
        load_env_local_secrets()
        key = os.environ.get("RUNPOD_API_KEY", "").strip()
    return key or None


def probe_runpod_account_and_endpoints(timeout_sec: float = 8.0) -> Dict[str, Any]:
    """Query `https://api.runpod.io/graphql` to verify account balance, pods, and FlashBoot endpoints."""
    load_env_local_secrets()
    api_key = get_runpod_api_key()
    masked_key = mask_api_key(api_key)
    nvidia_account_id = os.environ.get("NVIDIA_CLOUD_ACCOUNT_ID", "1086418431979798")

    if not api_key:
        return {
            "authenticated": False,
            "account_id": None,
            "email": None,
            "api_key_masked": masked_key,
            "nvidia_cloud_account_id": nvidia_account_id,
            "client_balance_usd": 0.0,
            "current_spend_per_hr": 0.0,
            "serverless_discount": None,
            "pods_count": 0,
            "pods": [],
            "endpoints_count": 0,
            "endpoints": [],
            "flashboot_ready": False,
            "fallback_mode": "LOCAL_NUMPY_ZERO_COST",
            "error": "RUNPOD_API_KEY_NOT_FOUND",
        }

    def _execute_gql(query_str: str) -> tuple[int, str]:
        payload_bytes = json.dumps({"query": query_str}).encode("utf-8")
        req = urllib.request.Request(
            RUNPOD_GRAPHQL_URL,
            data=payload_bytes,
            headers={
                "User-Agent": USER_AGENT,
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")

    t0 = time.perf_counter()
    try:
        try:
            status_code, raw_body = _execute_gql(RUNPOD_MYSELF_LIVE_COMPAT_QUERY)
        except urllib.error.HTTPError as first_exc:
            if first_exc.code == 400:
                status_code, raw_body = _execute_gql(RUNPOD_MYSELF_QUERY)
            else:
                raise
    except urllib.error.HTTPError as exc:
        err_body = ""
        try:
            err_body = exc.read().decode("utf-8", errors="replace")[:300]
        except Exception:
            pass
        return {
            "authenticated": False,
            "account_id": None,
            "email": None,
            "api_key_masked": masked_key,
            "nvidia_cloud_account_id": nvidia_account_id,
            "client_balance_usd": 0.0,
            "current_spend_per_hr": 0.0,
            "serverless_discount": None,
            "pods_count": 0,
            "pods": [],
            "endpoints_count": 0,
            "endpoints": [],
            "flashboot_ready": False,
            "http_status": exc.code,
            "fallback_mode": "LOCAL_NUMPY_ZERO_COST",
            "error": f"HTTP_{exc.code}: {err_body}",
        }
    except Exception as exc:
        return {
            "authenticated": False,
            "account_id": None,
            "email": None,
            "api_key_masked": masked_key,
            "nvidia_cloud_account_id": nvidia_account_id,
            "client_balance_usd": 0.0,
            "current_spend_per_hr": 0.0,
            "serverless_discount": None,
            "pods_count": 0,
            "pods": [],
            "endpoints_count": 0,
            "endpoints": [],
            "flashboot_ready": False,
            "fallback_mode": "LOCAL_NUMPY_ZERO_COST",
            "error": f"NETWORK_ERROR: {type(exc).__name__}: {exc}",
        }

    latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError:
        return {
            "authenticated": False,
            "account_id": None,
            "email": None,
            "api_key_masked": masked_key,
            "nvidia_cloud_account_id": nvidia_account_id,
            "client_balance_usd": 0.0,
            "current_spend_per_hr": 0.0,
            "serverless_discount": None,
            "pods_count": 0,
            "pods": [],
            "endpoints_count": 0,
            "endpoints": [],
            "flashboot_ready": False,
            "http_status": status_code,
            "latency_ms": latency_ms,
            "fallback_mode": "LOCAL_NUMPY_ZERO_COST",
            "error": "INVALID_JSON_RESPONSE",
        }

    myself = (parsed.get("data") or {}).get("myself")
    errors = parsed.get("errors")
    if not myself:
        return {
            "authenticated": False,
            "account_id": None,
            "email": None,
            "api_key_masked": masked_key,
            "nvidia_cloud_account_id": nvidia_account_id,
            "client_balance_usd": 0.0,
            "current_spend_per_hr": 0.0,
            "serverless_discount": None,
            "pods_count": 0,
            "pods": [],
            "endpoints_count": 0,
            "endpoints": [],
            "flashboot_ready": False,
            "http_status": status_code,
            "latency_ms": latency_ms,
            "fallback_mode": "LOCAL_NUMPY_ZERO_COST",
            "error": json.dumps(errors) if errors else "EMPTY_MYSELF_OBJECT",
        }

    pods = myself.get("pods") or []
    endpoints = myself.get("endpoints") or []
    balance = float(myself.get("clientBalance") or 0.0)
    spend_hr = float(myself.get("currentSpendPerHr") or 0.0)
    flashboot_ready = bool(len(endpoints) > 0 and balance > 0.0)

    return {
        "authenticated": True,
        "account_id": myself.get("id"),
        "email": myself.get("email"),
        "api_key_masked": masked_key,
        "nvidia_cloud_account_id": nvidia_account_id,
        "client_balance_usd": round(balance, 4),
        "current_spend_per_hr": round(spend_hr, 4),
        "serverless_discount": myself.get("serverlessDiscount"),
        "pods_count": len(pods),
        "pods": pods,
        "endpoints_count": len(endpoints),
        "endpoints": endpoints,
        "flashboot_ready": flashboot_ready,
        "http_status": status_code,
        "latency_ms": latency_ms,
        "fallback_mode": "RUNPOD_FLASHBOOT_GPU" if flashboot_ready else "LOCAL_NUMPY_ZERO_COST",
    }


def dispatch_runpod_serverless_burst(
    endpoint_id: str,
    payload: Dict[str, Any],
    sync: bool = True,
    timeout_sec: float = 20.0,
) -> Dict[str, Any]:
    """Dispatch a GPU simulation burst to `https://api.runpod.ai/v2/{endpoint_id}/runsync` (or `/run`).

    Automatically falls back to the local CPU/NumPy handler (`runpod_serverless_sim_handler.handler`)
    when no serverless endpoint is deployed yet, `endpoint_id` is empty/placeholder, or
    `clientBalance == 0`.
    """
    probe = probe_runpod_account_and_endpoints(timeout_sec=5.0)
    clean_endpoint = (endpoint_id or os.environ.get("RUNPOD_SERVERLESS_ENDPOINT_ID", "")).strip()

    # Check if live RunPod Serverless execution is possible
    can_dispatch_remote = (
        probe.get("authenticated", False)
        and float(probe.get("client_balance_usd", 0.0)) > 0.0
        and bool(clean_endpoint)
        and clean_endpoint.lower() not in {"local", "none", "unconfigured", "placeholder"}
    )

    if can_dispatch_remote:
        api_key = get_runpod_api_key()
        op = "runsync" if sync else "run"
        url = f"{RUNPOD_SERVERLESS_BASE_URL}/{clean_endpoint}/{op}"
        body = json.dumps({"input": payload}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "User-Agent": USER_AGENT,
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                remote_data = json.loads(resp.read().decode("utf-8", errors="replace"))
                return {
                    "status": "REMOTE_RUNPOD_DISPATCHED",
                    "execution_mode": f"RUNPOD_SERVERLESS_{op.upper()}",
                    "endpoint_id": clean_endpoint,
                    "account_id": probe.get("account_id"),
                    "response": remote_data,
                }
        except Exception as exc:
            fallback_reason = f"REMOTE_DISPATCH_ERROR:{type(exc).__name__}"
    else:
        if not probe.get("authenticated", False):
            fallback_reason = "RUNPOD_UNAUTHENTICATED"
        elif float(probe.get("client_balance_usd", 0.0)) <= 0.0:
            fallback_reason = "CLIENT_BALANCE_ZERO_USD"
        elif not clean_endpoint or clean_endpoint.lower() in {"local", "none", "unconfigured", "placeholder"}:
            fallback_reason = "NO_SERVERLESS_ENDPOINT_DEPLOYED"
        else:
            fallback_reason = "LOCAL_ZERO_WASTE_PREFERENCE"

    # Automatic local CPU/NumPy fallback via runpod_serverless_sim_handler
    from scripts.ops.runpod_serverless_sim_handler import handler as local_sim_handler

    local_out = local_sim_handler({"id": f"local-fallback-{int(time.time())}", "input": payload})
    return {
        "status": "COMPLETED_LOCAL_FALLBACK",
        "execution_mode": "LOCAL_CPU_NUMPY_FALLBACK",
        "fallback_reason": fallback_reason,
        "runpod_account_authenticated": probe.get("authenticated", False),
        "runpod_account_id": probe.get("account_id"),
        "client_balance_usd": probe.get("client_balance_usd", 0.0),
        "output": local_out,
    }


def build_nvidia_nim_on_runpod_deployment_spec() -> Dict[str, Any]:
    """Return the exact Docker/RunPod template spec for deploying downloadable NVIDIA NIM containers."""
    nvidia_account_id = os.environ.get("NVIDIA_CLOUD_ACCOUNT_ID", "1086418431979798")
    return {
        "schema_version": "2026-11-05.v1",
        "organization": "Galaxy Sports Edge LLC",
        "nvidia_inception_status": "APPROVED",
        "nvidia_cloud_account_id": nvidia_account_id,
        "registry_auth": {
            "registry": "nvcr.io",
            "username": "$oauthtoken",
            "password_env_var": "NGC_API_KEY",
        },
        "serverless_flashboot_templates": [
            {
                "template_name": "gse-nim-llama-3.1-70b-instruct-flashboot",
                "container_image": "nvcr.io/nim/meta/llama-3.1-70b-instruct:latest",
                "deployment_mode": "RUNPOD_SERVERLESS_FLASHBOOT",
                "flashboot": True,
                "workersMin": 0,
                "workersMax": 4,
                "idleTimeout": 5,
                "executionTimeoutMs": 120000,
                "gpuIds": ["AMPERE_80", "ADA_80_PRO", "HOPPER_80"],
                "recommended_gpus": ["A100-80GB", "H100-80GB"],
                "containerDiskInGb": 80,
                "volumeInGb": 100,
                "volumeMountPath": "/opt/nim/.cache",
                "ports": "8000/http",
                "env": {
                    "NGC_API_KEY": "${NGC_API_KEY}",
                    "NIM_CACHE_PATH": "/opt/nim/.cache",
                    "NIM_SERVER_PORT": "8000",
                    "NIM_MAX_BATCH_SIZE": "64",
                },
                "use_case": "Stage 2 Situational Priors & Stage 5 Constitutional Gatekeeper (INV-1..INV-5)",
            },
            {
                "template_name": "gse-nim-deepseek-r1-reasoning-flashboot",
                "container_image": "nvcr.io/nim/deepseek-ai/deepseek-r1:latest",
                "deployment_mode": "RUNPOD_SERVERLESS_FLASHBOOT",
                "flashboot": True,
                "workersMin": 0,
                "workersMax": 4,
                "idleTimeout": 5,
                "executionTimeoutMs": 180000,
                "gpuIds": ["HOPPER_80", "AMPERE_80"],
                "recommended_gpus": ["H100-80GB", "A100-80GB"],
                "containerDiskInGb": 120,
                "volumeInGb": 160,
                "volumeMountPath": "/opt/nim/.cache",
                "ports": "8000/http",
                "env": {
                    "NGC_API_KEY": "${NGC_API_KEY}",
                    "NIM_CACHE_PATH": "/opt/nim/.cache",
                    "NIM_SERVER_PORT": "8000",
                },
                "use_case": "Deep game-script structural contradiction & multi-agent forensic verification",
            },
            {
                "template_name": "gse-nvidia-cuopt-milp-dfs-flashboot",
                "container_image": "nvcr.io/nvidia/cuopt/cuopt:latest",
                "deployment_mode": "RUNPOD_SERVERLESS_FLASHBOOT",
                "flashboot": True,
                "workersMin": 0,
                "workersMax": 4,
                "idleTimeout": 5,
                "executionTimeoutMs": 60000,
                "gpuIds": ["ADA_48_PRO", "AMPERE_80", "HOPPER_80"],
                "recommended_gpus": ["L40S", "A100-80GB", "H100-80GB"],
                "containerDiskInGb": 40,
                "volumeInGb": 40,
                "volumeMountPath": "/workspace/cuopt_cache",
                "ports": "5000/http",
                "env": {
                    "NGC_API_KEY": "${NGC_API_KEY}",
                    "CUOPT_SERVER_PORT": "5000",
                },
                "use_case": "T-85m late-swap 150-lineup MILP DFS portfolio optimization & Sinkhorn optimal transport",
            },
        ],
        "gpu_pod_templates": [
            {
                "pod_name": "gse-nim-dedicated-pod-h100-a100-l40s",
                "supported_gpu_types": ["A100-80GB", "H100-80GB", "L40S"],
                "cloud_type": "SECURE_CLOUD",
                "containers": [
                    "nvcr.io/nim/meta/llama-3.1-70b-instruct:latest",
                    "nvcr.io/nim/deepseek-ai/deepseek-r1:latest",
                    "nvcr.io/nvidia/cuopt/cuopt:latest",
                ],
                "billing_guardrail": "Scale-to-zero Serverless FlashBoot preferred; spin up dedicated GPU Pods only during Sunday 11:30 AM - 4:30 PM ET peak slate windows.",
            }
        ],
    }


if __name__ == "__main__":
    result = probe_runpod_account_and_endpoints()
    print(json.dumps(result, indent=2))
