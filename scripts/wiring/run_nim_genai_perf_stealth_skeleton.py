#!/usr/bin/env python3
"""
NVIDIA NIM GenAI-Perf LLM Benchmarking Harness for GSE Stealth-Skeleton
Specification: https://docs.nvidia.com/nim/large-language-models/1.0.0/benchmarking.html

Executes live empirical HTTP & SSE streaming benchmarks against:
  https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1/chat/completions
across all 8 Stealth-Skeleton models:
  - gse/skeleton-stealth
  - gse/skeleton-math-pro
  - gse/skeleton-forecast
  - gse/skeleton-council
  - gse/skeleton-flash
  - gse/stealth-skeleton-alpha
  - gse/skeleton-v1
  - gse/skeleton-v1-fast

Measures real, unedited empirical NIM GenAI-Perf metrics:
  - time_to_first_token_ms (TTFT: avg, min, max, p50, p90, p95, p99, std)
  - inter_token_latency_ms (ITL: avg, min, max, p50, p90, p95, p99, std)
  - request_latency_ms (avg, min, max, p50, p90, p95, p99, std)
  - output_token_throughput_tps (tokens/sec) & request_throughput_rps (req/sec)
  - input_sequence_length_tokens (ISL) & output_sequence_length_tokens (OSL)

Writes:
  - Summary JSON: data/audits/stealth_skeleton_nim_genai_perf_benchmark_2026_11_07.json
  - Raw HTTP/SSE traces JSONL: data/audits/stealth_skeleton_nim_genai_perf_raw_traces_2026_11_07.jsonl
"""
from __future__ import annotations

import json
import math
import statistics
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
ENDPOINT_URL = "https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1/chat/completions"
SUMMARY_OUT = REPO_ROOT / "data" / "audits" / "stealth_skeleton_nim_genai_perf_benchmark_2026_11_07.json"
RAW_TRACES_OUT = REPO_ROOT / "data" / "audits" / "stealth_skeleton_nim_genai_perf_raw_traces_2026_11_07.jsonl"

MODELS_TO_BENCHMARK = [
    ("gse/skeleton-stealth", "Evaluate Week 9 JAX @ BAL 26-layer trench pressure, Sinkhorn-Knopp optimal transport, and Romano CQR 90% interval width."),
    ("gse/skeleton-math-pro", "Derive the closed-form standard Normal CRPS at z=0 and verify the Hou-Li 36th-order spectral filter Nyquist factor exp(-36)."),
    ("gse/skeleton-forecast", "Compute calibrated probability via Satopaa-Tetlock log-odds pooling, Barber conformal weights, and Kadavath P(IK) gate."),
    ("gse/skeleton-council", "Run 4-voice adversarial council audit on Week 9 Sunday slate enforcing the 80-rule misleading-stat firewall and Stage 0 roster allowlist."),
    ("gse/skeleton-flash", "Navigate PageIndex hierarchical corpus tree for Cover 4 Quarters MOD/PUSH rules vs 3x1 Trips and 2-Jet pass protection."),
    ("gse/stealth-skeleton-alpha", "Verify Shin de-vigged fair probability on -110/-110 market and check FWL orthogonalized residual alpha."),
    ("gse/skeleton-v1", "Synthesize GSI biomechanical return-to-play degradation hazard curve and STM32H7 256KB SRAM kinematic filter bounds."),
    ("gse/skeleton-v1-fast", "Fast-path priority tier check on Week 9 DET @ GB outdoor Lambeau wind pass-rate penalty and L12->L13->L21 QB clean pocket EPA."),
]


def _percentile(sorted_vals: List[float], pct: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return round(sorted_vals[0], 4)
    k = (len(sorted_vals) - 1) * (pct / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return round(sorted_vals[int(k)], 4)
    d0 = sorted_vals[int(f)] * (c - k)
    d1 = sorted_vals[int(c)] * (k - f)
    return round(d0 + d1, 4)


def _compute_stat_distribution(vals: List[float]) -> Dict[str, float]:
    if not vals:
        return {"avg": 0.0, "min": 0.0, "max": 0.0, "p50": 0.0, "p90": 0.0, "p95": 0.0, "p99": 0.0, "std": 0.0}
    s = sorted(vals)
    avg = sum(s) / len(s)
    std = statistics.pstdev(s) if len(s) > 1 else 0.0
    return {
        "avg": round(avg, 4),
        "min": round(s[0], 4),
        "max": round(s[-1], 4),
        "p50": _percentile(s, 50.0),
        "p90": _percentile(s, 90.0),
        "p95": _percentile(s, 95.0),
        "p99": _percentile(s, 99.0),
        "std": round(std, 4),
    }


def _estimate_tokens(text: str) -> int:
    words = text.split()
    return max(1, int(round(len(words) * 1.35)))


def probe_endpoint_once(model_id: str, prompt: str, stream: bool) -> Dict[str, Any]:
    payload = {
        "model": model_id,
        "stream": stream,
        "temperature": 0.0,
        "messages": [
            {"role": "system", "content": "You are GSE Stealth-Skeleton executing an NVIDIA NIM GenAI-Perf empirical benchmark."},
            {"role": "user", "content": prompt},
        ],
    }
    body_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT_URL,
        data=body_bytes,
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream" if stream else "application/json",
            "User-Agent": "GSE-NIM-GenAI-Perf/1.0.0",
        },
        method="POST",
    )

    t_start = time.perf_counter()
    started_utc = datetime.now(timezone.utc).isoformat()
    first_token_t: float | None = None
    chunk_timestamps_ms: List[float] = []
    content_pieces: List[str] = []
    usage_in_tokens = _estimate_tokens(prompt) + 16
    usage_out_tokens = 0
    x_request_id = ""
    http_status = 0

    with urllib.request.urlopen(req, timeout=30) as resp:
        http_status = int(resp.status)
        x_request_id = str(resp.headers.get("x-request-id") or resp.headers.get("X-Request-Id") or "")
        if stream:
            for raw_line in resp:
                now_t = time.perf_counter()
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line or line.startswith(":"):
                    continue
                if line.startswith("data:"):
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_obj = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    choices = chunk_obj.get("choices") or []
                    delta_text = ""
                    if choices:
                        delta = choices[0].get("delta") or {}
                        delta_text = str(delta.get("content") or "")
                    if delta_text:
                        if first_token_t is None:
                            first_token_t = now_t
                        chunk_timestamps_ms.append(round((now_t - t_start) * 1000.0, 4))
                        content_pieces.append(delta_text)
                    usage = chunk_obj.get("usage") or {}
                    if usage.get("prompt_tokens"):
                        usage_in_tokens = int(usage["prompt_tokens"])
                    if usage.get("completion_tokens"):
                        usage_out_tokens = int(usage["completion_tokens"])
        else:
            raw_body = resp.read().decode("utf-8", errors="replace")
            first_token_t = time.perf_counter()
            obj = json.loads(raw_body)
            choices = obj.get("choices") or []
            if choices:
                msg = choices[0].get("message") or {}
                content_pieces.append(str(msg.get("content") or ""))
            usage = obj.get("usage") or {}
            if usage.get("prompt_tokens"):
                usage_in_tokens = int(usage["prompt_tokens"])
            if usage.get("completion_tokens"):
                usage_out_tokens = int(usage["completion_tokens"])

    t_end = time.perf_counter()
    full_text = "".join(content_pieces)
    if usage_out_tokens <= 0:
        usage_out_tokens = _estimate_tokens(full_text)

    req_latency_ms = round((t_end - t_start) * 1000.0, 4)
    ttft_ms = round(((first_token_t or t_end) - t_start) * 1000.0, 4)
    if usage_out_tokens > 1:
        itl_ms = round(max(0.001, (req_latency_ms - ttft_ms) / float(usage_out_tokens - 1)), 4)
    else:
        itl_ms = 0.0
    tps = round(usage_out_tokens / max(1e-6, (t_end - t_start)), 4)

    return {
        "timestamp_utc": started_utc,
        "endpoint": ENDPOINT_URL,
        "model": model_id,
        "stream": stream,
        "http_status": http_status,
        "x_request_id": x_request_id,
        "input_sequence_length_tokens": usage_in_tokens,
        "output_sequence_length_tokens": usage_out_tokens,
        "time_to_first_token_ms": ttft_ms,
        "inter_token_latency_ms": itl_ms,
        "request_latency_ms": req_latency_ms,
        "output_token_throughput_tps": tps,
        "sse_chunk_timestamps_ms": chunk_timestamps_ms,
        "response_preview": full_text[:240],
    }


def run_nim_genai_perf_suite() -> Dict[str, Any]:
    traces: List[Dict[str, Any]] = []
    suite_t0 = time.perf_counter()

    for model_id, prompt in MODELS_TO_BENCHMARK:
        # Test both SSE streaming (stream=True) and non-streaming JSON (stream=False)
        traces.append(probe_endpoint_once(model_id=model_id, prompt=prompt, stream=True))
        traces.append(probe_endpoint_once(model_id=model_id, prompt=prompt, stream=False))

    suite_elapsed_s = max(1e-6, time.perf_counter() - suite_t0)

    RAW_TRACES_OUT.parent.mkdir(parents=True, exist_ok=True)
    with RAW_TRACES_OUT.open("w", encoding="utf-8") as fh:
        for tr in traces:
            fh.write(json.dumps(tr) + "\n")

    stream_traces = [t for t in traces if t["stream"] is True]
    all_ttft = [float(t["time_to_first_token_ms"]) for t in stream_traces]
    all_itl = [float(t["inter_token_latency_ms"]) for t in stream_traces]
    all_lat = [float(t["request_latency_ms"]) for t in traces]
    all_tps = [float(t["output_token_throughput_tps"]) for t in traces]
    all_isl = [float(t["input_sequence_length_tokens"]) for t in traces]
    all_osl = [float(t["output_sequence_length_tokens"]) for t in traces]

    total_out_tokens = sum(int(t["output_sequence_length_tokens"]) for t in traces)
    summary = {
        "schema": "nvidia_nim_genai_perf_llm_benchmark_v1",
        "specification_url": "https://docs.nvidia.com/nim/large-language-models/1.0.0/benchmarking.html",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "endpoint_url": ENDPOINT_URL,
        "raw_traces_path": "data/audits/stealth_skeleton_nim_genai_perf_raw_traces_2026_11_07.jsonl",
        "models_tested_count": len(MODELS_TO_BENCHMARK),
        "total_requests_executed": len(traces),
        "successful_http_200_count": sum(1 for t in traces if t["http_status"] == 200),
        "wall_clock_duration_seconds": round(suite_elapsed_s, 4),
        "metrics": {
            "time_to_first_token_ms": _compute_stat_distribution(all_ttft),
            "inter_token_latency_ms": _compute_stat_distribution(all_itl),
            "request_latency_ms": _compute_stat_distribution(all_lat),
            "output_token_throughput_per_request_tps": _compute_stat_distribution(all_tps),
            "input_sequence_length_tokens": _compute_stat_distribution(all_isl),
            "output_sequence_length_tokens": _compute_stat_distribution(all_osl),
            "aggregate_output_token_throughput_tps": round(total_out_tokens / suite_elapsed_s, 4),
            "request_throughput_rps": round(len(traces) / suite_elapsed_s, 4),
        },
        "per_model_results": [
            {
                "model": tr["model"],
                "stream": tr["stream"],
                "http_status": tr["http_status"],
                "x_request_id": tr["x_request_id"],
                "isl_tokens": tr["input_sequence_length_tokens"],
                "osl_tokens": tr["output_sequence_length_tokens"],
                "ttft_ms": tr["time_to_first_token_ms"],
                "itl_ms": tr["inter_token_latency_ms"],
                "request_latency_ms": tr["request_latency_ms"],
                "output_tps": tr["output_token_throughput_tps"],
            }
            for tr in traces
        ],
    }
    SUMMARY_OUT.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    return summary


if __name__ == "__main__":
    res = run_nim_genai_perf_suite()
    print(
        json.dumps(
            {
                "status": "NIM_GENAI_PERF_COMPLETE",
                "models_tested": res["models_tested_count"],
                "total_requests": res["total_requests_executed"],
                "http_200_count": res["successful_http_200_count"],
                "ttft_p50_ms": res["metrics"]["time_to_first_token_ms"]["p50"],
                "itl_p50_ms": res["metrics"]["inter_token_latency_ms"]["p50"],
                "request_latency_p50_ms": res["metrics"]["request_latency_ms"]["p50"],
                "aggregate_output_tps": res["metrics"]["aggregate_output_token_throughput_tps"],
            },
            indent=2,
        )
    )
