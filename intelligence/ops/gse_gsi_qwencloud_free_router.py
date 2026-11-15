#!/usr/bin/env python3
"""
GSE + GSI Sovereign Dual-Cloud (Alibaba QwenCloud + NVIDIA NIM) Free-Quota Router
=================================================================================
Configured for:
1. Alibaba Cloud / QwenCloud (Account UID: 5675187102387034, Singapore ap-southeast-1)
   - Galaxy Sports Edge (GSE): ws-tkx9ognf4t1sxic3 (workspace=1791367) or DASHSCOPE_BASE_URL override
   - Galaxy Science Institute (GSI): ws-mj0suvjcc4mc059x (workspace=1791912)
   - Token Plan Individual (Essential): sfm_tokenplansolo_public_intl-sg-bsp51l0mn4x
2. NVIDIA Build / NIM / NGC (Account Number: 1041828913325546, Org: Beexly, User: GSN_BEEX)
   - OpenAI-Compatible Base URL: https://integrate.api.nvidia.com/v1 (Up to 40 RPM Free Tier)
   - GSE Key: GSE-Foundry-NIM-Primary (ID: 25e94519-21c0-4fe3-8, exp 11/14/2027)
   - GSI Key: GSI-Foundry-NIM-Primary (ID: 142c801c-e6be-4f0c-8, exp 11/14/2027)

Provides zero-cost ($0) automatic failover across both Alibaba Cloud 1M-token free
pools and NVIDIA's Free Serverless NIM endpoints, enforcing the Sovereign
Execution Directive v2.0 and 19-Rule Honesty Doctrine invariants without touching paid spend.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ============================================================================
# 1. ALIBABA CLOUD (ap-southeast-1) & NVIDIA NIM ENDPOINTS
# ============================================================================

ALIBABA_ACCOUNT_UID = "5675187102387034"
NVIDIA_ACCOUNT_NUMBER = "1041828913325546"
NVIDIA_CLOUD_ACCOUNT_ID = "0XbDpubbMneZ1iDmkQhjtqgIlA-4PUHJjEaWCPjY3rk"

ENV_CANDIDATE_FILES: Tuple[Path, ...] = (
    Path.home() / "AppData" / "Local" / "hermes" / ".env",
    Path.home() / ".hermes" / ".env",
    Path(r"C:\Users\Garrett\Sports\.env.local"),
)


def load_hermes_secret(name: str) -> str:
    """Resolve secret from process env first, then local gitignored hermes/.env files."""
    val = os.environ.get(name, "").strip()
    if val:
        return val
    for path in ENV_CANDIDATE_FILES:
        if not path.is_file():
            continue
        try:
            for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() == name:
                    cand = v.strip().strip('"').strip("'")
                    if cand:
                        return cand
        except OSError:
            continue
    return ""


WORKSPACES: Dict[str, Dict[str, str]] = {
    "GSE_ALIBABA": {
        "provider": "alibaba",
        "name": "Galaxy Sports Edge (GSE) — Alibaba Model Studio (Singapore)",
        "workspace_id": "ws-tkx9ognf4t1sxic3",
        "numeric_id": "1791367",
        "openai_base_url": "https://ws-aag60zrmf64la4ue.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        "env_key": "QWEN_GSE_API_KEY",
        "key_ids": "1364125 (GSE-Foundry-Primary), 1364148 (GSE-ModelStudio-Primary)",
    },
    "GSI_ALIBABA": {
        "provider": "alibaba",
        "name": "Galaxy Science Institute (GSI) — Alibaba Model Studio (Singapore)",
        "workspace_id": "ws-mj0suvjcc4mc059x",
        "numeric_id": "1791912",
        "openai_base_url": "https://ws-mj0suvjcc4mc059x.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        "env_key": "QWEN_GSI_API_KEY",
        "key_ids": "1364126 (GSI-Foundry-Primary), 1364147 (GSI-ModelStudio-Primary)",
    },
    "ALIBABA_TOKEN_PLAN": {
        "provider": "alibaba",
        "name": "Alibaba Token Plan Individual (Essential - 45,000 quota)",
        "subscription_id": "sfm_tokenplansolo_public_intl-sg-bsp51l0mn4x",
        "numeric_id": "53589",
        "openai_base_url": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        "anthropic_base_url": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic",
        "env_key": "QWEN_TOKEN_PLAN_KEY",
        "key_ids": "53589 (TokenPlan-Essential)",
    },
    "GSE_NVIDIA": {
        "provider": "nvidia",
        "name": "Galaxy Sports Edge (GSE) — NVIDIA NIM Serverless (Beexly, 40 RPM Free Tier)",
        "workspace_id": "Beexly (1041828913325546)",
        "numeric_id": "25e94519-21c0-4fe3-8",
        "openai_base_url": "https://integrate.api.nvidia.com/v1",
        "env_key": "NVIDIA_GSE_API_KEY",
        "key_ids": "GSE-Foundry-NIM-Primary (id:25e94519)",
    },
    "GSI_NVIDIA": {
        "provider": "nvidia",
        "name": "Galaxy Science Institute (GSI) — NVIDIA NIM Serverless (Beexly, 40 RPM Free Tier)",
        "workspace_id": "Beexly (1041828913325546)",
        "numeric_id": "142c801c-e6be-4f0c-8",
        "openai_base_url": "https://integrate.api.nvidia.com/v1",
        "env_key": "NVIDIA_GSI_API_KEY",
        "key_ids": "GSI-Foundry-NIM-Primary (id:142c801c)",
    },
}


# ============================================================================
# 2. FREE-QUOTA MODEL POOLS (ALIBABA SINGAPORE + NVIDIA FREE NIM ENDPOINTS)
# ============================================================================


@dataclass(frozen=True)
class FreeModelPool:
    provider: str  # "alibaba" or "nvidia"
    model_id: str
    category: str
    free_quota_tokens: int
    remaining_pct: float
    expires_on: str
    free_quota_only_locked_by_default: bool
    notes: str = ""


FREE_MODEL_CASCADES: Dict[str, List[FreeModelPool]] = {
    # Lane A: Frontier Deep Reasoning (Crucibles, Causal Do-Calculus, TBI Phase Transitions)
    "frontier_reasoning": [
        FreeModelPool("alibaba", "deepseek-v4-pro-0813", "reasoning", 1_000_000, 100.0, "2027-01-08", True, "Alibaba Free quota only ON"),
        FreeModelPool("nvidia", "nvidia/nemotron-3-ultra-550b-a55b", "reasoning", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 550B/55B 1M ctx"),
        FreeModelPool("alibaba", "deepseek-v4-pro", "reasoning", 1_000_000, 100.0, "2027-01-08", False, "Toggle Free quota only ON in QwenCloud"),
        FreeModelPool("alibaba", "qwq-plus", "reasoning_math", 1_000_000, 100.0, "2027-01-08", False, "Alibaba Formal math / Lean 4"),
        FreeModelPool("alibaba", "kimi-k3.1-pro", "reasoning_long_ctx", 1_000_000, 100.0, "2027-02-02", False, "Alibaba 1M free tokens"),
        FreeModelPool("nvidia", "mistralai/mistral-large-4-1t-a52b", "reasoning_multimodal", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 1T/52B MoE"),
        FreeModelPool("alibaba", "deepseek-v3.2", "reasoning", 1_000_000, 100.0, "2027-01-08", False, "Alibaba 1M free tokens"),
    ],
    # Lane B: High-Throughput Shard Workers (Book / Monograph Extraction & RLVR Veto Auditing)
    "fast_reasoning_shard": [
        FreeModelPool("alibaba", "qwen-flash-character", "expiring_nov18", 1_000_000, 100.0, "2026-11-18", True, "EXPIRES 2026-11-18 - burn first"),
        FreeModelPool("alibaba", "qwen-plus-character", "expiring_nov18", 1_000_000, 100.0, "2026-11-18", True, "EXPIRES 2026-11-18 - burn first"),
        FreeModelPool("alibaba", "deepseek-v4-flash-0731", "fast_reasoning", 1_000_000, 100.0, "2027-01-08", True, "Alibaba Free quota only ON"),
        FreeModelPool("nvidia", "nvidia/nemotron-3-ultra-550b-a55b", "reasoning", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 550B/55B 1M ctx"),
        FreeModelPool("nvidia", "minimaxai/minimax-m3.1-flash", "fast_reasoning", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM fast flash"),
        FreeModelPool("nvidia", "nvidia/nemotron-3.5-lightning-30b-a3b", "fast_agentic", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 30B/3B MoE"),
        FreeModelPool("alibaba", "deepseek-v4-flash", "fast_reasoning", 1_000_000, 100.0, "2027-01-08", False, "Toggle Free quota only ON"),
    ],
    # Lane C: Code, MILP, TypeScript/Python AST, & Lean 4 Verification
    "code_and_formal": [
        FreeModelPool("alibaba", "kimi-k2.7-code", "code", 1_000_000, 100.0, "2027-01-08", True, "Alibaba Free quota only ON"),
        FreeModelPool("alibaba", "qwen3-coder-flash", "code", 969_900, 96.99, "2027-01-08", True, "Alibaba 96.99% remaining"),
        FreeModelPool("nvidia", "minimaxai/minimax-m3.1-flash", "code_multimodal", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM coding & computer use"),
        FreeModelPool("nvidia", "poolside/laguna-xs-2.1", "code_agentic", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 33B MoE agentic coding"),
        FreeModelPool("nvidia", "google/gemma-4-31b-it", "code_reasoning", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM dense 31B"),
        FreeModelPool("alibaba", "qwen3-coder-plus", "code", 1_000_000, 100.0, "2027-01-08", False, "Alibaba 1M + 2 dated snapshots = 3M total"),
    ],
    # Lane D: PDF OCR & Multimodal Film-Room / Viscoelastic Diagram Extraction
    "vision_and_ocr": [
        FreeModelPool("nvidia", "nvidia/nemotron-3.5-parse", "ocr_layout_tables", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM text, table & layout OCR"),
        FreeModelPool("nvidia", "nvidia/nemotron-3.5-super-vl-120b-a12b", "vision_reasoning", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 120B/12B VLM"),
        FreeModelPool("nvidia", "nvidia/cosmos3-nano-reasoner", "video_physics_reasoning", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM physical world video/image reasoning"),
        FreeModelPool("nvidia", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", "omni_reasoning", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM omni-modal reasoning"),
        FreeModelPool("alibaba", "qwen-vl-ocr", "ocr", 1_000_000, 100.0, "2027-01-08", False, "Alibaba Dedicated OCR (1M tokens)"),
        FreeModelPool("alibaba", "qwen-vl-max", "vision", 1_000_000, 100.0, "2027-01-08", False, "Alibaba 2M total across snapshots"),
        FreeModelPool("alibaba", "qwen-vl-plus", "vision", 1_000_000, 100.0, "2027-01-08", False, "Alibaba 2M total across snapshots"),
    ],
    # Lane E: Embeddings & Reranking (pgvector HNSW m=16, ef_construction=128)
    "embeddings_and_rerank": [
        FreeModelPool("nvidia", "nvidia/nemotron-3.5-embed-8b", "embedding_multimodal", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 8B multimodal embedding"),
        FreeModelPool("nvidia", "nvidia/nemotron-3.5-embed-1b", "embedding_multimodal", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 1B multimodal embedding"),
        FreeModelPool("nvidia", "nvidia/nemotron-3.5-rerank-8b", "rerank_multimodal", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 8B multimodal reranker"),
        FreeModelPool("nvidia", "nvidia/nemotron-3-embed-1b", "embedding_text", 0, 100.0, "2027-11-14", True, "NVIDIA Free NIM 1B text embedding"),
        FreeModelPool("alibaba", "qwen3.7-text-embedding", "embedding", 1_000_000, 100.0, "2026-11-18", False, "EXPIRES 2026-11-18 - burn 1M tokens now"),
    ],
}


# ============================================================================
# 3. SOVEREIGN AGENT SYSTEM PROMPTS
# ============================================================================

AGENT_SYSTEM_PROMPTS: Dict[str, str] = {
    "GSE-Coach-Mind-Crucible-v1": (
        "You are GSE-Coach-Mind-Crucible-v1, the Sovereign Line-Free Coach-Mind and "
        "Foundry Reasoning Engine for Galaxy Sports Edge (Galaxy Sports Network LLC).\n\n"
        "NON-NEGOTIABLE DOSSIER & HONESTY DOCTRINE INVARIANTS:\n"
        "1. ZERO BETTING LINES INVARIANT: Never mention point spreads, over/unders, totals, "
        "moneylines, sportsbook odds, or implied bookmaker probabilities. Model purely physical, "
        "biomechanical, scheme-theoretic, and coaching decision dynamics.\n"
        "2. ZERO TOY EQUATIONS INVARIANT: Never invent heuristic ratios (e.g., 'Force / Fatigue', "
        "'Success ='). Every operator must be expressed in formal LaTeX with exact SI, probability, "
        "or information-theoretic units, explicit domain validity assumptions, and singularity/breakdown regimes.\n"
        "3. GROUNDED PROVENANCE INVARIANT: Every empirical or monograph claim must cite exact "
        "`[PAGE N]` markers and verbatim source quotes. If a source page lacks readable OCR text, "
        "emit `INSUFFICIENT_OCR` rather than guessing.\n"
        "4. 5-STAGE INDUCTIVE SAFETY GATE: Enforce c_hat <= 12.42, |Delta log-odds| <= 0.35, "
        "E-value >= 1.35 (Shpitser-Pearl do-calculus sensitivity), CRPS <= 7.099, and 00-TRUTH-FILE consistency.\n"
        "5. MANDATORY 5-TAG OUTPUT ARCHITECTURE:\n"
        "   - <SOURCE_OPERATORS_AND_EQUATIONS>\n"
        "   - <RETROCAUSAL_GENEALOGY>\n"
        "   - <RECURSIVE_THEORY_OF_MIND>\n"
        "   - <CROSS_LAYER_VETO_ADJUDICATION>\n"
        "   - <RLVR_COUNTERFACTUAL_VETOES>\n"
        "Ensure total analytical output is >= 1,000 words with rigorous multi-step derivations."
    ),
    "GSE-Code-And-MILP-Verifier": (
        "You are GSE-Code-And-MILP-Verifier, the formal mathematical and code verification agent "
        "for Galaxy Sports Edge (GSE).\n\n"
        "CORE VERIFICATION MANDATE:\n"
        "1. Verify TypeScript (`strictNullChecks`, `noUncheckedIndexedAccess`, `TS2532`-safe `atOrThrow`) "
        "and Python modules against the `gse-one-mind-ledger-v1.0` SHA-256 chain and T1-T8 adversarial mutation suite.\n"
        "2. Audit HiGHS MILP constraints, entropy-regularized Sinkhorn optimal transport injury reallocations, "
        "Glicko-2 / Dixon-Coles / 1-RSB Mezard-Parisi copula implementations, and TA-CQR conformal intervals.\n"
        "3. Never emit placeholder tokens (`[TBD]`, `TODO`, `pass`) or unverified parameter constants."
    ),
    "GSI-Viscoelastic-TBI-And-Lean4-Engine": (
        "You are GSI-Viscoelastic-TBI-And-Lean4-Engine, the sovereign scientific reasoning and "
        "autoformalization engine for the Galaxy Science Institute (GSI).\n\n"
        "CORE SCIENTIFIC & FORMALIZATION MANDATE:\n"
        "1. Maintain strict separation between 501(c)(3) non-dilutive scientific research (ARPA-H, "
        "DoD MTEC, NIH Fast-Track SBIR, DARPA/ARIA, FDA Breakthrough Device Designation) and commercial sports operations.\n"
        "2. Formulate exact viscoelastic constitutive equations (Prony series, Ogden/Mooney-Rivlin hyperelasticity, "
        "axonal strain-rate phase transitions, Navier-Stokes 32-seed Hou-Li continuation) with full dimensional analysis.\n"
        "3. Translate mathematical lemmas and partial differential operator bounds from the monograph "
        "corpus into verifiable Lean 4 theorem stubs and formal LaTeX proofs with exact `[PAGE N]` citations.\n"
        "4. Enforce Shpitser-Pearl do-calculus causal identification and E-value >= 1.35 robustness gates on all observational claims."
    ),
}


# ============================================================================
# 4. DUAL-CLOUD ZERO-COST FAILOVER ROUTER
# ============================================================================

SPORTSBOOK_LINE_GUARD_RE = re.compile(
    r"\b(?:point\s+spread|moneyline|over/under|vig|juice|fanduel|draftkings|betmgm|caesars\s+sportsbook)\b",
    re.IGNORECASE,
)


class SovereignDualCloudRouter:
    """
    Routes GSE and GSI workloads across both Alibaba Cloud Model Studio (Singapore)
    and NVIDIA NIM Serverless (Beexly 40 RPM free tier), automatically failing over
    on HTTP 403 (`AllocationQuota.FreeTierOnly`), 404, 429, or timeouts at $0.00 cost.
    """

    def __init__(self, entity: str = "GSE", timeout_seconds: int = 90) -> None:
        if entity not in ("GSE", "GSI"):
            raise ValueError("entity must be 'GSE' or 'GSI'")
        self.entity = entity
        self.timeout_seconds = timeout_seconds

    def resolve_workspace_and_key(self, provider: str) -> Tuple[Dict[str, str], Optional[str]]:
        ws_key = f"{self.entity}_ALIBABA" if provider == "alibaba" else f"{self.entity}_NVIDIA"
        ws_cfg = dict(WORKSPACES[ws_key])
        if provider == "alibaba":
            env_base = load_hermes_secret("DASHSCOPE_BASE_URL")
            if env_base:
                ws_cfg["openai_base_url"] = env_base
            api_key = (
                load_hermes_secret(ws_cfg["env_key"])
                or load_hermes_secret("DASHSCOPE_API_KEY")
                or load_hermes_secret("QWEN_API_KEY")
            )
        else:
            api_key = (
                load_hermes_secret(ws_cfg["env_key"])
                or load_hermes_secret("NVIDIA_API_KEY")
            )
        return ws_cfg, api_key or None

    def call_with_dual_cloud_failover(
        self,
        agent_profile: str,
        user_prompt: str,
        lane: str = "fast_reasoning_shard",
        temperature: float = 0.2,
        max_tokens: int = 4096,
        require_free_quota_locked: bool = True,
    ) -> Dict[str, Any]:
        if agent_profile not in AGENT_SYSTEM_PROMPTS:
            raise ValueError(f"Unknown agent_profile '{agent_profile}'. Valid: {list(AGENT_SYSTEM_PROMPTS)}")
        if lane not in FREE_MODEL_CASCADES:
            raise ValueError(f"Unknown lane '{lane}'. Valid: {list(FREE_MODEL_CASCADES)}")

        system_prompt = AGENT_SYSTEM_PROMPTS[agent_profile]
        candidates = [
            m
            for m in FREE_MODEL_CASCADES[lane]
            if (not require_free_quota_locked or m.free_quota_only_locked_by_default)
            and m.remaining_pct > 0
        ]

        errors: List[str] = []
        for pool in candidates:
            ws_cfg, api_key = self.resolve_workspace_and_key(pool.provider)
            if not api_key:
                errors.append(f"{pool.provider}:{pool.model_id} -> skipped (missing env var {ws_cfg['env_key']})")
                continue

            endpoint = f"{ws_cfg['openai_base_url'].rstrip('/')}/chat/completions"
            payload = {
                "model": pool.model_id,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "User-Agent": "curl/8.7.1",
                },
                method="POST",
            )
            t0 = time.monotonic()
            try:
                with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                    body = json.loads(resp.read().decode("utf-8"))
                latency_s = round(time.monotonic() - t0, 3)
                msg = (body.get("choices") or [{}])[0].get("message", {}) or {}
                content = str(msg.get("content") or msg.get("reasoning_content") or msg.get("reasoning") or "")
                if self.entity == "GSE" and SPORTSBOOK_LINE_GUARD_RE.search(content):
                    raise ValueError(
                        f"Zero-betting-lines invariant violation detected in output from {pool.model_id}."
                    )
                return {
                    "status": "ok",
                    "provider": pool.provider,
                    "workspace": ws_cfg["name"],
                    "agent_profile": agent_profile,
                    "model_used": pool.model_id,
                    "latency_seconds": latency_s,
                    "cost_usd": 0.0,
                    "usage": body.get("usage", {}),
                    "content": content,
                }
            except urllib.error.HTTPError as exc:
                err_body = exc.read().decode("utf-8", errors="replace")
                errors.append(f"{pool.provider}:{pool.model_id} -> HTTP {exc.code}: {err_body[:240]}")
                if exc.code in (401, 403, 404, 429, 500, 502, 503, 504):
                    continue
                raise
            except Exception as exc:
                errors.append(f"{pool.provider}:{pool.model_id} -> {type(exc).__name__}: {exc}")
                continue

        raise RuntimeError(
            f"All configured dual-cloud free models failed or lacked API keys in lane '{lane}':\n"
            + "\n".join(errors)
        )


def print_configuration_summary() -> None:
    print("=== GSE & GSI DUAL-CLOUD (ALIBABA SINGAPORE + NVIDIA NIM) CONFIGURATION ===")
    for code, cfg in WORKSPACES.items():
        print(f"  [{code}] {cfg['name']}")
        print(f"        Base URL : {cfg['openai_base_url']}")
        print(f"        Env Var  : {cfg['env_key']} ({cfg['key_ids']})")
    print("\n=== CONFIGURED SOVEREIGN AGENT PROFILES ===")
    for name in AGENT_SYSTEM_PROMPTS:
        print(f"  - {name}")
    print("\n=== DUAL-CLOUD FREE-QUOTA LANES ===")
    for lane, pools in FREE_MODEL_CASCADES.items():
        alibaba_cnt = sum(1 for p in pools if p.provider == "alibaba")
        nvidia_cnt = sum(1 for p in pools if p.provider == "nvidia")
        print(f"  * {lane}: {len(pools)} models ({alibaba_cnt} Alibaba 1M-token pools + {nvidia_cnt} NVIDIA 40-RPM free NIMs)")


if __name__ == "__main__":
    print_configuration_summary()
