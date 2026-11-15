"""Multimodal Decisions Router & Confidence-Weighted Opinion Pooling (WP-1).

Drop-in Path:
    C:\\Users\\Garrett\\Sports\\intelligence\\decisions\\multimodal_decisions_router.py

Implements the critical blocking engineering fixes from ``master_overall_plan.md``
(WP-1) and ``unified_hivemind_projection_and_membership_plan``:
1. ``DecisionQuestionSpec`` enforcing:
   - Non-empty ``instructions`` on EVERY ``google/gemini-decision-1`` question.
   - ``2..255`` distinct non-empty options when ``kind == "choice"``.
   - ``2..255`` integer levels AND a non-empty semantic ``legend`` mapping when
     ``kind == "score"``.
   - Batch splitting into chunks of ``<= 100`` questions per forward pass.
2. ``pool_calibrated_pmfs`` implementing confidence-weighted log-linear pooling
   of ``google/gemini-decision-1`` + ``typesafeai-jev-1-14-0`` with automatic
   ``shrink_to_pass = True`` whenever ``L_inf disagreement > 0.12`` OR
   ``min(conf_gd1, conf_jev) < 0.55``.
3. Zero-fallback validation guaranteeing that empty ``{}`` (or null/unverified)
   input yields an exact ``0.0`` displacement — NEVER legacy hardcoded fallback
   constants such as ``0.58`` or ``-0.26``.
4. Privacy/media boundary enforcement preventing non-public media/PII payloads
   from being routed to ``parallel/decisions-fast:free``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import json
import math
import re
from typing import Any, Callable, Dict, Iterable, List, Literal, Mapping, Optional, Sequence, Tuple
import urllib.request

QuestionKind = Literal["boolean", "choice", "score"]
DecisionModelId = Literal[
    "google/gemini-decision-1",
    "parallel/decisions-fast:free",
    "typesafeai-jev-1-14-0",
]

OPENROUTER_DECISIONS_ENDPOINT = "https://openrouter.ai/api/alpha/decisions"
MAX_QUESTIONS_PER_PASS = 100
MIN_ENUM_CARDINALITY = 2
MAX_ENUM_CARDINALITY = 255
DISAGREEMENT_L_INF_THRESHOLD = 0.12
MIN_MODEL_CONFIDENCE_THRESHOLD = 0.55
MIN_POOL_WEIGHT_FLOOR = 0.05

# Legacy fabricated constants explicitly banned across all GSE signal pipelines.
FORBIDDEN_FALLBACK_CONSTANTS: frozenset[float] = frozenset({0.58, -0.26})

_MEDIA_OR_DATA_URI_PATTERN = re.compile(
    r"(^data:[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+;base64,)|"
    r"(\.(mp4|mov|mkv|avi|wav|mp3|m4a|flac|ogg|pdf|png|jpg|jpeg|webp)(\?|$))",
    re.IGNORECASE,
)
_SENSITIVE_FIELD_KEYS: frozenset[str] = frozenset(
    {
        "audio_bytes",
        "video_bytes",
        "media_base64",
        "raw_mp4",
        "private_medical_pdf",
        "ssn",
        "account_password",
        "api_secret",
    }
)


@dataclass(frozen=True)
class DecisionQuestionSpec:
    """Typed schema for a single structured decision question.

    Enforces all ``google/gemini-decision-1`` API schema invariants prior to
    network dispatch so malformed payloads fail deterministically at validation
    time rather than silently degrading downstream probabilities.
    """

    key: str
    kind: QuestionKind
    instructions: str  # REQUIRED by google/gemini-decision-1 on EVERY question
    options: Optional[List[str]] = None  # 2..255 options when kind == "choice"
    levels: Optional[int] = None  # 2..255 levels when kind == "score"
    legend: Optional[Dict[str, str]] = None  # Required semantic anchor for score levels

    def validate(self) -> Dict[str, Any]:
        """Validate invariants and return the normalized OpenRouter question dict."""
        if not isinstance(self.key, str) or not self.key.strip():
            raise ValueError("DecisionQuestionSpec requires a non-empty string 'key'.")

        if self.kind not in ("boolean", "choice", "score"):
            raise ValueError(
                f"Question '{self.key}': unsupported kind '{self.kind}'. "
                "Expected 'boolean', 'choice', or 'score'."
            )

        if not isinstance(self.instructions, str) or not self.instructions.strip():
            raise ValueError(
                f"Question '{self.key}': google/gemini-decision-1 requires non-empty instructions."
            )

        payload: Dict[str, Any] = {
            "type": self.kind,
            "instructions": self.instructions.strip(),
        }

        if self.kind == "boolean":
            if self.options is not None:
                raise ValueError(
                    f"Question '{self.key}': boolean question must not specify 'options'."
                )
            if self.levels is not None or self.legend is not None:
                raise ValueError(
                    f"Question '{self.key}': boolean question must not specify 'levels' or 'legend'."
                )
            return payload

        if self.kind == "choice":
            if self.options is None or not isinstance(self.options, (list, tuple)):
                raise ValueError(
                    f"Question '{self.key}': choice requires {MIN_ENUM_CARDINALITY}..{MAX_ENUM_CARDINALITY} options."
                )
            cleaned_options = [
                opt.strip() if isinstance(opt, str) else "" for opt in self.options
            ]
            if any(not opt for opt in cleaned_options):
                raise ValueError(
                    f"Question '{self.key}': all choice options must be non-empty strings."
                )
            if not (MIN_ENUM_CARDINALITY <= len(cleaned_options) <= MAX_ENUM_CARDINALITY):
                raise ValueError(
                    f"Question '{self.key}': choice requires {MIN_ENUM_CARDINALITY}..{MAX_ENUM_CARDINALITY} options "
                    f"(got {len(cleaned_options)})."
                )
            if len(set(cleaned_options)) != len(cleaned_options):
                raise ValueError(
                    f"Question '{self.key}': choice options must be unique."
                )
            payload["options"] = list(cleaned_options)
            return payload

        # self.kind == "score"
        if (
            self.levels is None
            or isinstance(self.levels, bool)
            or not isinstance(self.levels, int)
            or not (MIN_ENUM_CARDINALITY <= self.levels <= MAX_ENUM_CARDINALITY)
        ):
            raise ValueError(
                f"Question '{self.key}': score requires {MIN_ENUM_CARDINALITY}..{MAX_ENUM_CARDINALITY} integer levels."
            )
        if not isinstance(self.legend, Mapping) or len(self.legend) == 0:
            raise ValueError(
                f"Question '{self.key}': score requires a non-empty legend mapping."
            )
        cleaned_legend: Dict[str, str] = {}
        for level_key, description in self.legend.items():
            key_str = str(level_key).strip()
            desc_str = description.strip() if isinstance(description, str) else ""
            if not key_str or not desc_str:
                raise ValueError(
                    f"Question '{self.key}': score legend keys and descriptions must be non-empty strings."
                )
            cleaned_legend[key_str] = desc_str

        payload["levels"] = self.levels
        payload["legend"] = cleaned_legend
        return payload


@dataclass(frozen=True)
class DisplacementEvaluation:
    """Zero-fallback signal displacement output."""

    displacement: float
    probability_shift: float
    has_verified_signal: bool
    active_feature_count: int
    abstention_reason: Optional[str] = None


def assert_no_forbidden_fallback_constants(
    value: float,
    *,
    field_name: str = "displacement",
    tol: float = 1e-9,
) -> float:
    """Raise ValueError if a legacy hardcoded fallback constant (0.58 or -0.26) is emitted."""
    if not math.isfinite(value):
        raise ValueError(f"{field_name} must be finite, got {value!r}.")
    for forbidden in FORBIDDEN_FALLBACK_CONSTANTS:
        if abs(value - forbidden) <= tol:
            raise ValueError(
                f"Forbidden hardcoded fallback constant {forbidden} detected in '{field_name}'. "
                "Empty or missing inputs must return exact 0.0 displacement."
            )
    return float(value)


def split_question_batches(
    questions: Sequence[DecisionQuestionSpec],
    max_batch_size: int = MAX_QUESTIONS_PER_PASS,
) -> List[List[DecisionQuestionSpec]]:
    """Validate every question and split into passes of at most 100 questions.

    Args:
        questions: Sequence of ``DecisionQuestionSpec`` items.
        max_batch_size: Maximum questions per forward pass (must be in ``1..100``).

    Returns:
        List of validated ``DecisionQuestionSpec`` batches, each of length ``<= max_batch_size``.
    """
    if (
        isinstance(max_batch_size, bool)
        or not isinstance(max_batch_size, int)
        or not (1 <= max_batch_size <= MAX_QUESTIONS_PER_PASS)
    ):
        raise ValueError(
            f"max_batch_size must be an integer in 1..{MAX_QUESTIONS_PER_PASS}, got {max_batch_size!r}."
        )
    if not questions:
        return []

    seen_keys: set[str] = set()
    validated_questions: List[DecisionQuestionSpec] = []
    for question in questions:
        if not isinstance(question, DecisionQuestionSpec):
            raise TypeError(
                f"Expected DecisionQuestionSpec instance, got {type(question).__name__}."
            )
        question.validate()
        if question.key in seen_keys:
            raise ValueError(f"Duplicate question key '{question.key}' in question list.")
        seen_keys.add(question.key)
        validated_questions.append(question)

    return [
        validated_questions[idx : idx + max_batch_size]
        for idx in range(0, len(validated_questions), max_batch_size)
    ]


def _validate_public_only_context_for_free_tier(context_state: Mapping[str, Any]) -> None:
    """Reject raw media attachments, data URIs, or sensitive fields on free parallel tier."""

    def _walk(node: Any, path: str) -> None:
        if isinstance(node, Mapping):
            for k, v in node.items():
                key_norm = str(k).strip().lower()
                if key_norm in _SENSITIVE_FIELD_KEYS:
                    raise ValueError(
                        f"Privacy boundary violation at '{path}.{k}': sensitive/media field "
                        "cannot be routed to 'parallel/decisions-fast:free'."
                    )
                _walk(v, f"{path}.{k}")
        elif isinstance(node, (list, tuple)):
            for idx, item in enumerate(node):
                _walk(item, f"{path}[{idx}]")
        elif isinstance(node, (bytes, bytearray)):
            raise ValueError(
                f"Privacy boundary violation at '{path}': binary bytes cannot be routed "
                "to 'parallel/decisions-fast:free'."
            )
        elif isinstance(node, str) and _MEDIA_OR_DATA_URI_PATTERN.search(node):
            raise ValueError(
                f"Privacy boundary violation at '{path}': media attachment or base64 data URI "
                "must be routed exclusively to 'google/gemini-decision-1', never 'parallel/decisions-fast:free'."
            )

    _walk(context_state, "context")


def build_decisions_request_batches(
    context_state: Mapping[str, Any],
    questions: Sequence[DecisionQuestionSpec],
    *,
    model: DecisionModelId = "google/gemini-decision-1",
    max_batch_size: int = MAX_QUESTIONS_PER_PASS,
) -> List[Dict[str, Any]]:
    """Build validated OpenRouter ``/api/alpha/decisions`` request payloads (<=100 questions each)."""
    if not isinstance(context_state, Mapping):
        raise TypeError("context_state must be a mapping.")
    if model == "parallel/decisions-fast:free":
        _validate_public_only_context_for_free_tier(context_state)

    batches = split_question_batches(questions, max_batch_size=max_batch_size)
    payloads: List[Dict[str, Any]] = []
    for batch in batches:
        questions_map = {q.key: q.validate() for q in batch}
        payloads.append(
            {
                "model": model,
                "context": dict(context_state),
                "questions": questions_map,
            }
        )
    return payloads


def _normalize_pmf(pmf: Mapping[str, float], label: str) -> Dict[str, float]:
    """Validate and normalize a discrete probability mass function."""
    if not isinstance(pmf, Mapping) or len(pmf) == 0:
        raise ValueError(f"{label} PMF must be a non-empty mapping.")
    cleaned: Dict[str, float] = {}
    total = 0.0
    for key, raw_prob in pmf.items():
        if isinstance(raw_prob, bool) or not isinstance(raw_prob, (int, float)):
            raise ValueError(f"{label} PMF[{key!r}] must be numeric, got {raw_prob!r}.")
        val = float(raw_prob)
        if not math.isfinite(val) or val < 0.0:
            raise ValueError(
                f"{label} PMF[{key!r}] must be finite and non-negative, got {val!r}."
            )
        cleaned[str(key)] = val
        total += val
    if total <= 0.0:
        raise ValueError(f"{label} PMF must have strictly positive total mass.")
    return {k: v / total for k, v in cleaned.items()}


def pool_calibrated_pmfs(
    p_gd1: Mapping[str, float],
    conf_gd1: float,
    p_jev: Mapping[str, float],
    conf_jev: float,
    *,
    disagreement_threshold: float = DISAGREEMENT_L_INF_THRESHOLD,
    min_confidence_threshold: float = MIN_MODEL_CONFIDENCE_THRESHOLD,
) -> Dict[str, Any]:
    """Confidence-weighted log-linear opinion pool of ``google/gemini-decision-1`` + ``typesafeai-jev-1-14-0``.

    Automatically triggers ``shrink_to_pass = True`` whenever:
      - ``L_inf(p_gd1, p_jev) > 0.12`` (epistemic disagreement), OR
      - ``min(conf_gd1, conf_jev) < 0.55`` (insufficient single-model confidence).
    """
    for name, c_val in (("conf_gd1", conf_gd1), ("conf_jev", conf_jev)):
        if isinstance(c_val, bool) or not isinstance(c_val, (int, float)):
            raise ValueError(f"{name} must be a float in [0, 1], got {c_val!r}.")
        if not math.isfinite(float(c_val)) or not (0.0 <= float(c_val) <= 1.0):
            raise ValueError(f"{name} must lie in [0.0, 1.0], got {c_val!r}.")

    gd1_norm = _normalize_pmf(p_gd1, "google/gemini-decision-1")
    jev_norm = _normalize_pmf(p_jev, "typesafeai-jev-1-14-0")

    keys = sorted(set(gd1_norm.keys()) | set(jev_norm.keys()))
    c1 = float(conf_gd1)
    c2 = float(conf_jev)
    w1_raw = max(MIN_POOL_WEIGHT_FLOOR, c1)
    w2_raw = max(MIN_POOL_WEIGHT_FLOOR, c2)
    w_sum = w1_raw + w2_raw
    w1 = w1_raw / w_sum
    w2 = w2_raw / w_sum

    raw_log_pool = {
        k: math.exp(
            w1 * math.log(max(1e-9, gd1_norm.get(k, 1e-6)))
            + w2 * math.log(max(1e-9, jev_norm.get(k, 1e-6)))
        )
        for k in keys
    }
    partition_z = sum(raw_log_pool.values())
    if partition_z <= 0.0 or not math.isfinite(partition_z):
        raise ValueError("Log-linear pool normalization constant degenerated.")

    pooled = {k: raw_log_pool[k] / partition_z for k in keys}
    max_gap = max(abs(gd1_norm.get(k, 0.0) - jev_norm.get(k, 0.0)) for k in keys)
    min_conf = min(c1, c2)
    shrink_to_pass = (max_gap > disagreement_threshold) or (
        min_conf < min_confidence_threshold
    )

    return {
        "probabilities": pooled,
        "weights": {
            "google/gemini-decision-1": round(w1, 6),
            "typesafeai-jev-1-14-0": round(w2, 6),
        },
        "disagreement_l_inf": round(max_gap, 6),
        "min_confidence": round(min_conf, 6),
        "shrink_to_pass": bool(shrink_to_pass),
    }


def compute_zero_fallback_displacement(
    signal_payload: Optional[Mapping[str, Any]],
    *,
    feature_weights: Optional[Mapping[str, float]] = None,
    shrink_to_pass: bool = False,
) -> DisplacementEvaluation:
    """Compute verified signal displacement with strict zero-fallback semantics.

    Invariants:
      - ``{}`` (empty dict), ``None``, or payloads with zero verified numeric features
        MUST return exact ``0.0`` displacement and ``0.0`` probability shift.
      - ``shrink_to_pass=True`` shrinks displacement to exact ``0.0``.
      - Hardcoded fallback constants (``0.58``, ``-0.26``) are strictly forbidden.
    """
    if signal_payload is None:
        return DisplacementEvaluation(
            displacement=0.0,
            probability_shift=0.0,
            has_verified_signal=False,
            active_feature_count=0,
            abstention_reason="NULL_SIGNAL_INPUT",
        )
    if not isinstance(signal_payload, Mapping):
        raise TypeError(
            f"signal_payload must be a mapping or None, got {type(signal_payload).__name__}."
        )
    if len(signal_payload) == 0:
        return DisplacementEvaluation(
            displacement=0.0,
            probability_shift=0.0,
            has_verified_signal=False,
            active_feature_count=0,
            abstention_reason="EMPTY_INPUT_ZERO_DISPLACEMENT",
        )
    if shrink_to_pass:
        return DisplacementEvaluation(
            displacement=0.0,
            probability_shift=0.0,
            has_verified_signal=False,
            active_feature_count=0,
            abstention_reason="EPISTEMIC_DISAGREEMENT_SHRINK_TO_PASS",
        )

    weights = dict(feature_weights) if feature_weights is not None else None
    accum = 0.0
    active_count = 0

    for key, raw_val in signal_payload.items():
        if raw_val is None or isinstance(raw_val, bool):
            continue
        if not isinstance(raw_val, (int, float)):
            continue
        val = float(raw_val)
        if not math.isfinite(val):
            raise ValueError(f"Non-finite signal value for feature '{key}': {raw_val!r}")
        assert_no_forbidden_fallback_constants(val, field_name=f"signal_payload[{key!r}]")

        weight = 1.0 if weights is None else float(weights.get(key, 0.0))
        if weight == 0.0:
            continue
        accum += weight * val
        active_count += 1

    if active_count == 0 or accum == 0.0:
        return DisplacementEvaluation(
            displacement=0.0,
            probability_shift=0.0,
            has_verified_signal=False,
            active_feature_count=active_count,
            abstention_reason="NO_VERIFIED_NONZERO_SIGNAL" if active_count == 0 else None,
        )

    # Guard output against ever matching banned fallback constants via upstream misconfiguration.
    displacement = assert_no_forbidden_fallback_constants(
        accum, field_name="computed_displacement"
    )
    prob_shift = (1.0 / (1.0 + math.exp(-displacement))) - 0.5
    return DisplacementEvaluation(
        displacement=displacement,
        probability_shift=prob_shift,
        has_verified_signal=True,
        active_feature_count=active_count,
        abstention_reason=None,
    )


class MultimodalDecisionsRouter:
    """Client/orchestrator for batched OpenRouter Decisions passes + JEV log-linear pooling."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        endpoint: str = OPENROUTER_DECISIONS_ENDPOINT,
        transport: Optional[Callable[[Dict[str, Any], Dict[str, str]], Dict[str, Any]]] = None,
    ) -> None:
        self.api_key = api_key
        self.endpoint = endpoint
        self._transport = transport or self._default_urllib_transport

    def _default_urllib_transport(
        self, payload: Dict[str, Any], headers: Dict[str, str]
    ) -> Dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.endpoint, data=body, headers=headers, method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def dispatch_questions(
        self,
        context_state: Optional[Mapping[str, Any]],
        questions: Sequence[DecisionQuestionSpec],
        *,
        model: DecisionModelId = "google/gemini-decision-1",
    ) -> Dict[str, Any]:
        """Dispatch questions in <=100-question passes; empty context returns exact 0.0 displacement."""
        if not context_state:
            zero_eval = compute_zero_fallback_displacement(context_state)
            return {
                "decisions": {},
                "displacement": zero_eval.displacement,
                "probability_shift": zero_eval.probability_shift,
                "abstention_reason": zero_eval.abstention_reason,
                "batches_sent": 0,
            }

        batches = build_decisions_request_batches(
            context_state=context_state,
            questions=questions,
            model=model,
            max_batch_size=MAX_QUESTIONS_PER_PASS,
        )
        if not self.api_key and self._transport is self._default_urllib_transport:
            raise RuntimeError(
                "OPENROUTER_API_KEY is required for live network calls when no custom transport is supplied."
            )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key or ''}",
        }
        merged_decisions: Dict[str, Any] = {}
        for payload in batches:
            response = self._transport(payload, headers)
            batch_decisions = response.get("decisions", {})
            if isinstance(batch_decisions, Mapping):
                merged_decisions.update(batch_decisions)

        return {
            "decisions": merged_decisions,
            "displacement": 0.0,
            "probability_shift": 0.0,
            "abstention_reason": None,
            "batches_sent": len(batches),
        }
