# Provenance: Garrett 2026-10-02 directive — "put our brain in another engine."
"""engines/: model-agnostic LLM specialist layer for the GSE brain.

The LLM reasons (L3 chains, L4 adversary, L5 synthesis) GROUNDED by our data
providers. The deterministic contract (reasoning/) still disposes: the LLM
proposes, the contract disposes. Trace format is unchanged, so T1–T7 pass.

Backends: GradioBackend (HF Spaces), OpenAICompatBackend (any chat API).
See README.md for the ZeroGPU billing policy and quota limits.
"""

from .backends import (
    BackendError,
    BackendResult,
    BackendUnavailable,
    GradioBackend,
    LLMBackend,
    OpenAICompatBackend,
    QuotaExhausted,
)
from .harness import LLMEngine, T1Result, build_t1_context, build_t1_request
from .llm_specialists import (
    LLMAdversarySpecialist,
    LLMChainSpecialist,
    LLMSpecialist,
    LLMSynthesisSpecialist,
    audit_grounding,
)

__all__ = [
    "BackendError", "BackendResult", "BackendUnavailable", "GradioBackend",
    "LLMBackend", "OpenAICompatBackend", "QuotaExhausted",
    "LLMEngine", "T1Result", "build_t1_context", "build_t1_request",
    "LLMAdversarySpecialist", "LLMChainSpecialist", "LLMSpecialist",
    "LLMSynthesisSpecialist", "audit_grounding",
]
