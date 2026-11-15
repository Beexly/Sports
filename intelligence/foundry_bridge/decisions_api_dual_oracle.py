"""OpenRouter Decisions API Dual-Oracle Bridge (`google/gemini-decision-1` + `~typesafe/jev-latest`).

Combines TypeSafe Jev (`~typesafe/jev-latest`) and Google Gemini Decision 1
(`google/gemini-decision-1`) through OpenRouter's structured Decisions API
(`https://openrouter.ai/api/alpha/decisions`):

- Supports `choice` (up to 255 options), `score` (up to 255 ordered levels with
  `confidence`, `legend`, and `probabilities`), and `noul` (Yes probability).
- Supports multimodal attachments for `google/gemini-decision-1` (PDF, CSV, Office,
  images, audio, video via inline data URL base64 or public HTTPS URL), while
  keeping `~typesafe/jev-latest` on compact JSON/text state.
- Computes symmetric base-2 Jensen-Shannon divergence between the two decision
  oracles, shrinks blended posteriors smoothly by `(1 - min(1, js_divergence))`,
  and raises fail-closed `epistemic_veto` flags when divergence exceeds threshold.
- Reuses `jevkit.keystore` and `jevkit.client` validators without ever reading
  credential files or `.env` files directly.
"""
from __future__ import annotations

import base64
import hashlib
import http.client
import json
import math
import mimetypes
import os
import re
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Tuple, Union

HERMES_JEV_PATH = Path(r"C:\Users\Garrett\hermes-jev-skills")
if HERMES_JEV_PATH.exists() and str(HERMES_JEV_PATH) not in sys.path:
    sys.path.insert(0, str(HERMES_JEV_PATH))


class _FallbackJevClient:
    """Stdlib validator/transport fallback when `jevkit` is absent (e.g. Linux CI)."""

    OPENROUTER_ENDPOINT = "https://openrouter.ai/api/alpha/decisions"
    MAX_STATE_CHARS = 60_000
    MAX_RESPONSE_BYTES = 1_000_000
    USER_AGENT = "hermes-jev-skills/0.1"
    _RETRYABLE = {"rate_limited", "overloaded", "network", "http_500", "http_502", "http_503", "http_504"}
    _PROB_TOL = 0.01 + 1e-12
    _SCORE_TOL = 0.02 + 1e-12
    _ARGMAX_TOL = 1e-9

    class JevError(RuntimeError):
        def __init__(self, code: str, detail: str = "") -> None:
            super().__init__(f"{code}: {detail}" if detail else code)
            self.code = code
            self.invariant: Optional[str] = None

    @staticmethod
    def choice(instructions: str, criteria: Mapping[str, str]) -> Dict[str, Any]:
        if len(criteria) < 2:
            raise ValueError("a choice needs at least two options")
        return {"type": "choice", "instructions": instructions, "criteria": dict(criteria)}

    @staticmethod
    def score(instructions: str, levels: Sequence[str]) -> Dict[str, Any]:
        if len(levels) < 2:
            raise ValueError("a score needs at least two levels")
        return {"type": "score", "instructions": instructions, "criteria": list(levels)}

    @staticmethod
    def noul(instructions: str) -> Dict[str, Any]:
        return {"type": "noul", "instructions": instructions}

    @classmethod
    def check_questions(cls, questions: Mapping[str, Any]) -> Dict[str, Dict[str, Any]]:
        if not isinstance(questions, Mapping) or not questions:
            raise ValueError("questions must be a non-empty mapping")
        out: Dict[str, Dict[str, Any]] = {}
        for raw_name, q in questions.items():
            name = str(raw_name)
            if not isinstance(q, Mapping):
                raise ValueError(f'question "{name}" must be an object')
            kind = q.get("type")
            if kind not in ("choice", "score", "noul"):
                raise ValueError(f'question "{name}" has invalid type {kind!r}')
            text = q.get("instructions")
            if not isinstance(text, str) or not text.strip():
                raise ValueError(f'question "{name}" has no instructions')
            if re.sub(r"[^a-z0-9]+", " ", text.lower()).strip() == re.sub(r"[^a-z0-9]+", " ", name.lower()).strip():
                raise ValueError(f'question "{name}" repeats its own name')
            criteria = q.get("criteria")
            if kind == "noul":
                if criteria is not None:
                    raise ValueError(f'question "{name}" is a noul and takes no criteria')
                out[name] = {"type": "noul", "instructions": text}
            elif kind == "choice":
                if not isinstance(criteria, Mapping) or len(criteria) < 2:
                    raise ValueError(f'question "{name}": choice needs >=2 options')
                out[name] = {"type": "choice", "instructions": text, "criteria": dict(criteria)}
            else:
                if not isinstance(criteria, (list, tuple)) or len(criteria) < 2:
                    raise ValueError(f'question "{name}": score needs >=2 levels')
                out[name] = {"type": "score", "instructions": text, "criteria": list(criteria)}
        return out

    @classmethod
    def _unit(cls, value: Any, name: str) -> float:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise cls.JevError("malformed", f"{name} is not numeric")
        num = float(value)
        if not math.isfinite(num) or not -1e-6 <= num <= 1 + 1e-6:
            raise cls.JevError("malformed", f"{name} is outside 0..1")
        return min(1.0, max(0.0, num))

    @classmethod
    def _check_answer(cls, name: str, question: Mapping[str, Any], answer: Any) -> Dict[str, Any]:
        if not isinstance(answer, dict) or answer.get("type") != question["type"]:
            raise cls.JevError("malformed", f"answer {name} has the wrong type")
        kind = question["type"]
        if kind == "noul":
            return {"type": "noul", "noul": cls._unit(answer.get("noul"), f"{name}.noul")}
        if kind == "choice":
            options = list(question["criteria"])
            picked = answer.get("choice")
            raw_probs = answer.get("probabilities")
            if not isinstance(picked, str) or picked not in set(options) or not isinstance(raw_probs, dict):
                raise cls.JevError("malformed", f"answer {name} invalid choice reply")
            if set(raw_probs) != set(options):
                err = cls.JevError("invalid_response", f"answer {name} option mismatch")
                err.invariant = "choice_probability_key_set"
                raise err
            probs = {k: cls._unit(raw_probs[k], f"{name}.p[{k}]") for k in options}
            if abs(sum(probs.values()) - 1.0) > cls._PROB_TOL:
                raise cls.JevError("invalid_response", f"answer {name} mass != 1")
            if probs[picked] < max(probs.values()) - cls._ARGMAX_TOL:
                raise cls.JevError("invalid_response", f"answer {name} choice not argmax")
            return {
                "type": "choice",
                "choice": picked,
                "probabilities": probs,
                "confidence": cls._unit(answer.get("confidence"), f"{name}.confidence"),
            }
        levels = len(question["criteria"])
        val = answer.get("score")
        if isinstance(val, bool) or not isinstance(val, (int, float)) or not -0.5 <= float(val) <= levels - 0.5:
            raise cls.JevError("malformed", f"answer {name} invalid score")
        raw_probs = answer.get("probabilities")
        spread: Dict[int, float] = {}
        if isinstance(raw_probs, dict) and raw_probs:
            spread = {int(k): cls._unit(v, f"{name}.p[{k}]") for k, v in raw_probs.items() if str(k).isdigit() and int(k) < levels}
            if len(spread) != len(raw_probs) or abs(sum(spread.values()) - 1.0) > cls._PROB_TOL:
                raise cls.JevError("invalid_response", f"answer {name} invalid score spread")
            mean = sum(k * p for k, p in spread.items())
            if abs(mean - float(val)) > cls._SCORE_TOL:
                raise cls.JevError("invalid_response", f"answer {name} score != expectation")
        legend = {int(k): str(v) for k, v in (answer.get("legend") or {}).items() if str(k).isdigit() and int(k) < levels and isinstance(v, str)} if isinstance(answer.get("legend"), dict) else {}
        out: Dict[str, Any] = {
            "type": "score",
            "score": float(val),
            "probabilities": spread,
            "spread_reported": bool(spread),
            "confidence": cls._unit(answer.get("confidence", 1.0), f"{name}.confidence"),
        }
        if legend:
            out["legend"] = legend
        return out

    @classmethod
    def post(cls, url: str, body: bytes, headers: Dict[str, str], timeout: float) -> bytes:
        parsed = urllib.parse.urlsplit(url)
        conn_cls = http.client.HTTPConnection if parsed.scheme == "http" else http.client.HTTPSConnection
        conn = conn_cls(parsed.hostname or "", parsed.port, timeout=timeout)
        path = (parsed.path or "/") + (f"?{parsed.query}" if parsed.query else "")
        try:
            conn.request("POST", path, body=body, headers=headers)
            resp = conn.getresponse()
            raw = resp.read(cls.MAX_RESPONSE_BYTES + 1)
            if resp.status != 200:
                raise cls.JevError(f"http_{resp.status}")
            return raw
        except cls.JevError:
            raise
        except (http.client.HTTPException, OSError) as exc:
            raise cls.JevError("network") from exc
        finally:
            conn.close()


class _FallbackJevKeystore:
    @staticmethod
    def _from_keychain(_name: str) -> Optional[str]:
        return None

    @staticmethod
    def _from_file(_name: str) -> Optional[str]:
        return None

    @staticmethod
    def _from_hermes_env(_name: str) -> Optional[str]:
        return None

    @staticmethod
    def resolve(name: str) -> Optional[str]:
        return os.environ.get("OPENROUTER_API_KEY") if name == "openrouter" else None


try:
    from jevkit import client as jev_client  # type: ignore[import-not-found]
    from jevkit import keystore as jev_keystore  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - exercised on Linux CI where hermes-jev-skills is absent
    jev_client = _FallbackJevClient()  # type: ignore[assignment]
    jev_keystore = _FallbackJevKeystore()  # type: ignore[assignment]

OPENROUTER_DECISIONS_URL = jev_client.OPENROUTER_ENDPOINT
JEV_LATEST_MODEL = "~typesafe/jev-latest"
GEMINI_DECISION_1_MODEL = "google/gemini-decision-1"
MAX_GEMINI_CHOICE_OPTIONS = 255
MAX_GEMINI_SCORE_LEVELS = 255
MAX_MULTIMODAL_PAYLOAD_BYTES = 20_000_000

_EXT_MIME_OVERRIDES: Dict[str, str] = {
    ".csv": "text/csv",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".doc": "application/msword",
    ".xls": "application/vnd.ms-excel",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".txt": "text/plain",
    ".json": "application/json",
}

Transport = Callable[[bytes, Dict[str, str], float], bytes]


def _resolve_openrouter_key(*, prefer_keystore: bool = True, api_key: Optional[str] = None) -> str:
    """Resolve OpenRouter API key via `jevkit.keystore` without reading secret files directly."""
    if api_key and api_key.strip():
        return api_key.strip()
    if prefer_keystore:
        key = (
            jev_keystore._from_keychain("openrouter")
            or jev_keystore._from_file("openrouter")
            or jev_keystore._from_hermes_env("openrouter")
            or jev_keystore.resolve("openrouter")
        )
    else:
        key = jev_keystore.resolve("openrouter")
    if not key:
        raise jev_client.JevError("no_key", "run `jev setup-key`")
    return key


def validate_decisions_questions(
    questions: Mapping[str, Any],
    *,
    max_options: int = MAX_GEMINI_CHOICE_OPTIONS,
    max_levels: int = MAX_GEMINI_SCORE_LEVELS,
) -> Dict[str, Dict[str, Any]]:
    """Validate structured Decisions API questions via `jevkit.client.check_questions` plus cardinality bounds."""
    checked = jev_client.check_questions(questions)
    for name, q in checked.items():
        kind = q["type"]
        if kind == "choice":
            count = len(q["criteria"])
            if count > max_options:
                raise ValueError(
                    f'question "{name}": choice has {count} options, max allowed is {max_options}'
                )
        elif kind == "score":
            count = len(q["criteria"])
            if count > max_levels:
                raise ValueError(
                    f'question "{name}": score has {count} levels, max allowed is {max_levels}'
                )
    return checked


def _infer_mime_type(name: Optional[str], raw_bytes: Optional[bytes] = None) -> str:
    if name:
        ext = Path(name).suffix.lower()
        if ext in _EXT_MIME_OVERRIDES:
            return _EXT_MIME_OVERRIDES[ext]
        guessed, _ = mimetypes.guess_type(name)
        if guessed:
            return guessed
    if raw_bytes is not None and raw_bytes.startswith(b"%PDF"):
        return "application/pdf"
    return "application/octet-stream"


def encode_multimodal_attachment(
    source: Union[str, Path, bytes],
    *,
    mime_type: Optional[str] = None,
    public_url: Optional[str] = None,
    label: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a multimodal attachment descriptor (inline data URL base64 or public URL) for Gemini Decision 1."""
    if public_url is not None:
        url = str(public_url).strip()
        if not (url.startswith("https://") or url.startswith("http://")):
            raise ValueError("public_url must start with http:// or https://")
        inferred_name = label or Path(url.split("?")[0]).name or "attachment"
        resolved_mime = mime_type or _infer_mime_type(inferred_name)
        part_kind = "image_url" if resolved_mime.startswith("image/") else "file"
        return {
            "type": part_kind,
            "mime_type": resolved_mime,
            "url": url,
            "label": inferred_name,
            "byte_length": 0,
            "sha256_16": hashlib.sha256(url.encode("utf-8")).hexdigest()[:16],
        }

    if isinstance(source, Path):
        raw = source.read_bytes()
        inferred_name = label or source.name
    elif isinstance(source, bytes):
        raw = source
        inferred_name = label or "attachment.bin"
    elif isinstance(source, str):
        candidate_path = Path(source)
        if "\n" not in source and len(source) <= 512 and candidate_path.is_file():
            raw = candidate_path.read_bytes()
            inferred_name = label or candidate_path.name
        else:
            raw = source.encode("utf-8")
            inferred_name = label or "inline.txt"
    else:
        raise TypeError("source must be Path, bytes, or str")

    if len(raw) > MAX_MULTIMODAL_PAYLOAD_BYTES:
        raise ValueError(
            f"attachment {inferred_name} exceeds MAX_MULTIMODAL_PAYLOAD_BYTES ({len(raw)} > {MAX_MULTIMODAL_PAYLOAD_BYTES})"
        )

    resolved_mime = mime_type or _infer_mime_type(inferred_name, raw)
    b64 = base64.b64encode(raw).decode("ascii")
    data_url = f"data:{resolved_mime};base64,{b64}"
    part_kind = "image_url" if resolved_mime.startswith("image/") else "file"
    return {
        "type": part_kind,
        "mime_type": resolved_mime,
        "data_url": data_url,
        "label": inferred_name,
        "byte_length": len(raw),
        "sha256_16": hashlib.sha256(raw).hexdigest()[:16],
    }


def _to_openrouter_content_parts(
    state: Any,
    attachments: Sequence[Mapping[str, Any]],
) -> List[Dict[str, Any]]:
    state_text = state if isinstance(state, str) else json.dumps(state, separators=(",", ":"), default=str)
    parts: List[Dict[str, Any]] = [{"type": "text", "text": state_text}]
    for idx, att in enumerate(attachments):
        mime = str(att.get("mime_type") or "application/octet-stream")
        ref = att.get("url") or att.get("data_url")
        if not ref or not isinstance(ref, str):
            raise ValueError(f"attachment[{idx}] missing url or data_url")
        if att.get("type") == "image_url" or mime.startswith("image/"):
            parts.append({"type": "image_url", "image_url": {"url": ref}})
        else:
            filename = str(att.get("label") or f"attachment_{idx}")
            parts.append({"type": "file", "file": {"filename": filename, "file_data": ref}})
    return parts


def ask_decisions_api(
    state: Any,
    questions: Mapping[str, Any],
    *,
    model: str = GEMINI_DECISION_1_MODEL,
    attachments: Optional[Sequence[Mapping[str, Any]]] = None,
    timeout: float = 15.0,
    retries: int = 1,
    prefer_keystore: bool = True,
    api_key: Optional[str] = None,
    transport: Optional[Transport] = None,
) -> Dict[str, Any]:
    """Query OpenRouter Decisions API (`google/gemini-decision-1` or `~typesafe/jev-latest`) and validate replies."""
    checked_questions = validate_decisions_questions(questions)
    if transport is not None and api_key is None:
        resolved_key = "test-transport-key"
    else:
        resolved_key = _resolve_openrouter_key(prefer_keystore=prefer_keystore, api_key=api_key)

    has_attachments = bool(attachments)
    if has_attachments:
        if "typesafe" in model.lower():
            raise ValueError("TypeSafe Jev does not accept binary multimodal attachments; pass them to gemini-decision-1")
        payload_state: Any = _to_openrouter_content_parts(state, attachments or ())
    else:
        payload_state = state

    encoded_state = (
        payload_state
        if isinstance(payload_state, str)
        else json.dumps(payload_state, separators=(",", ":"), default=str)
    )
    size_limit = MAX_MULTIMODAL_PAYLOAD_BYTES if has_attachments else jev_client.MAX_STATE_CHARS
    if len(encoded_state.encode("utf-8")) > size_limit:
        raise jev_client.JevError("state_too_large")

    body = json.dumps(
        {
            "model": model,
            "state": payload_state,
            "questions": {name: dict(q) for name, q in checked_questions.items()},
        },
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")

    headers = {
        "Authorization": f"Bearer {resolved_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": jev_client.USER_AGENT,
        "HTTP-Referer": "https://www.galaxysportsedge.com",
        "X-Title": "Galaxy Sports Edge Decisions Dual-Oracle",
    }

    send: Transport = transport or (lambda b, h, t: jev_client.post(OPENROUTER_DECISIONS_URL, b, h, t))
    started = time.monotonic()
    attempt = 0
    while True:
        remaining = timeout - (time.monotonic() - started)
        if remaining <= 0.05:
            raise jev_client.JevError("timeout")
        try:
            raw = send(body, headers, remaining)
            break
        except jev_client.JevError as err:
            attempt += 1
            if err.code not in jev_client._RETRYABLE or attempt > retries:
                raise
            time.sleep(min(0.25 * attempt, max(0.0, timeout - (time.monotonic() - started) - 0.1)))

    try:
        payload = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise jev_client.JevError("malformed", "reply is not JSON") from None

    answers_raw = payload.get("answers") if isinstance(payload, dict) else None
    if not isinstance(answers_raw, dict):
        raise jev_client.JevError("malformed", "reply has no answers")

    checked_answers = {
        name: jev_client._check_answer(name, question, answers_raw.get(name))
        for name, question in checked_questions.items()
    }
    usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    return {
        "model": payload.get("model") or model,
        "answers": checked_answers,
        "usage": usage,
        "latency_ms": int((time.monotonic() - started) * 1000),
    }


def jensen_shannon_divergence(dist_a: Mapping[Any, float], dist_b: Mapping[Any, float]) -> float:
    """Compute base-2 Jensen-Shannon divergence clamped cleanly to [0.0, 1.0]."""
    keys = list(dict.fromkeys(list(dist_a.keys()) + list(dist_b.keys())))
    if not keys:
        return 0.0
    pa = [max(0.0, float(dist_a.get(k, 0.0))) for k in keys]
    pb = [max(0.0, float(dist_b.get(k, 0.0))) for k in keys]
    sa = sum(pa)
    sb = sum(pb)
    if sa <= 0.0 or sb <= 0.0:
        return 0.0
    pa = [x / sa for x in pa]
    pb = [x / sb for x in pb]
    div = 0.0
    for p, q in zip(pa, pb):
        m = 0.5 * (p + q)
        if m <= 0.0:
            continue
        if p > 0.0:
            div += 0.5 * p * math.log2(p / m)
        if q > 0.0:
            div += 0.5 * q * math.log2(q / m)
    return float(min(1.0, max(0.0, div)))


def _answer_distribution(q_spec: Mapping[str, Any], ans: Mapping[str, Any]) -> Dict[Any, float]:
    kind = q_spec["type"]
    if kind == "noul":
        p = min(1.0, max(0.0, float(ans["noul"])))
        return {"yes": p, "no": 1.0 - p}
    if kind == "choice":
        keys = list(q_spec["criteria"].keys())
        probs = ans["probabilities"]
        return {k: float(probs.get(k, 0.0)) for k in keys}
    levels = len(q_spec["criteria"])
    probs = ans.get("probabilities") or {}
    if probs:
        return {int(k): float(probs.get(k, probs.get(str(k), 0.0))) for k in range(levels)}
    val = float(ans["score"])
    out = {k: 0.0 for k in range(levels)}
    lo = int(math.floor(min(levels - 1, max(0.0, val))))
    hi = min(levels - 1, lo + 1)
    w_hi = val - lo if hi > lo else 0.0
    out[lo] = 1.0 - w_hi
    if hi != lo:
        out[hi] = w_hi
    return out


def _shrink_consensus_answer(
    q_spec: Mapping[str, Any],
    jev_ans: Mapping[str, Any],
    gem_ans: Mapping[str, Any],
    js_div: float,
) -> Dict[str, Any]:
    shrink = max(0.0, 1.0 - min(1.0, js_div))
    kind = q_spec["type"]
    if kind == "noul":
        p_blend = 0.5 * (float(jev_ans["noul"]) + float(gem_ans["noul"]))
        p_shrunk = 0.5 + shrink * (p_blend - 0.5)
        return {"type": "noul", "noul": round(p_shrunk, 6), "shrink_factor": round(shrink, 6)}

    if kind == "choice":
        keys = list(q_spec["criteria"].keys())
        u = 1.0 / max(1, len(keys))
        shrunk_probs: Dict[str, float] = {}
        for k in keys:
            blend = 0.5 * (
                float(jev_ans["probabilities"].get(k, 0.0))
                + float(gem_ans["probabilities"].get(k, 0.0))
            )
            shrunk_probs[k] = round(u + shrink * (blend - u), 6)
        norm = sum(shrunk_probs.values()) or 1.0
        shrunk_probs = {k: round(v / norm, 6) for k, v in shrunk_probs.items()}
        picked = max(keys, key=lambda k: (shrunk_probs[k], k == jev_ans.get("choice")))
        return {
            "type": "choice",
            "choice": picked,
            "probabilities": shrunk_probs,
            "confidence": shrunk_probs[picked],
            "agree_top_choice": bool(jev_ans.get("choice") == gem_ans.get("choice")),
            "shrink_factor": round(shrink, 6),
        }

    levels = len(q_spec["criteria"])
    dist_j = _answer_distribution(q_spec, jev_ans)
    dist_g = _answer_distribution(q_spec, gem_ans)
    u = 1.0 / max(1, levels)
    shrunk_dist: Dict[int, float] = {}
    for k in range(levels):
        blend = 0.5 * (dist_j.get(k, 0.0) + dist_g.get(k, 0.0))
        shrunk_dist[k] = u + shrink * (blend - u)
    norm = sum(shrunk_dist.values()) or 1.0
    shrunk_dist = {k: round(v / norm, 6) for k, v in shrunk_dist.items()}
    exp_score = sum(k * p for k, p in shrunk_dist.items())
    return {
        "type": "score",
        "score": round(exp_score, 6),
        "probabilities": shrunk_dist,
        "confidence": max(shrunk_dist.values()),
        "shrink_factor": round(shrink, 6),
    }


def ask_dual_oracle(
    state: Any,
    questions: Mapping[str, Any],
    *,
    gemini_attachments: Optional[Sequence[Mapping[str, Any]]] = None,
    timeout: float = 15.0,
    divergence_veto_threshold: float = 0.18,
    prefer_keystore: bool = True,
    api_key: Optional[str] = None,
    transport: Optional[Transport] = None,
) -> Dict[str, Any]:
    """Query `~typesafe/jev-latest` and `google/gemini-decision-1` in parallel and reconcile distributions."""
    checked = validate_decisions_questions(questions)
    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_jev = pool.submit(
            ask_decisions_api,
            state,
            checked,
            model=JEV_LATEST_MODEL,
            attachments=None,
            timeout=timeout,
            prefer_keystore=prefer_keystore,
            api_key=api_key,
            transport=transport,
        )
        fut_gem = pool.submit(
            ask_decisions_api,
            state,
            checked,
            model=GEMINI_DECISION_1_MODEL,
            attachments=gemini_attachments,
            timeout=timeout,
            prefer_keystore=prefer_keystore,
            api_key=api_key,
            transport=transport,
        )
        jev_res = fut_jev.result()
        gem_res = fut_gem.result()

    comparisons: Dict[str, Dict[str, Any]] = {}
    consensus: Dict[str, Dict[str, Any]] = {}
    max_js = 0.0
    any_veto = False

    for name, q_spec in checked.items():
        ans_j = jev_res["answers"][name]
        ans_g = gem_res["answers"][name]
        dist_j = _answer_distribution(q_spec, ans_j)
        dist_g = _answer_distribution(q_spec, ans_g)
        js_div = jensen_shannon_divergence(dist_j, dist_g)
        all_keys = list(dict.fromkeys(list(dist_j.keys()) + list(dist_g.keys())))
        l1 = sum(abs(dist_j.get(k, 0.0) - dist_g.get(k, 0.0)) for k in all_keys)
        veto = js_div > divergence_veto_threshold
        max_js = max(max_js, js_div)
        any_veto = any_veto or veto
        comparisons[name] = {
            "js_divergence": round(js_div, 6),
            "l1_distance": round(l1, 6),
            "epistemic_veto": veto,
            "jev_top": ans_j.get("choice", ans_j.get("score", ans_j.get("noul"))),
            "gemini_top": ans_g.get("choice", ans_g.get("score", ans_g.get("noul"))),
        }
        consensus[name] = _shrink_consensus_answer(q_spec, ans_j, ans_g, js_div)

    total_cost = float((jev_res.get("usage") or {}).get("cost", 0.0) or 0.0) + float(
        (gem_res.get("usage") or {}).get("cost", 0.0) or 0.0
    )
    return {
        "jev": jev_res,
        "gemini": gem_res,
        "comparisons": comparisons,
        "consensus": consensus,
        "max_js_divergence": round(max_js, 6),
        "any_epistemic_veto": any_veto,
        "divergence_veto_threshold": divergence_veto_threshold,
        "total_cost_usd": round(total_cost, 8),
    }
