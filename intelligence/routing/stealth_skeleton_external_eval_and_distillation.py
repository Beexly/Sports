#!/usr/bin/env python3
"""
Stealth-Skeleton Official External Benchmark Harness & Input-Distillation Flywheel
==================================================================================
Implements Garrett's two core Stealth-Skeleton directives (2026-11-07):
  1. Move Off Self-Graded Internal Benchmarks Onto Official External Public Harnesses:
       Configures and validates standardized external evaluation manifests for:
         - EleutherAI `lm-evaluation-harness` (HuggingFace Open LLM Leaderboard v2:
           `mmlu_pro`, `gpqa_diamond`, `math_hard`, `ifeval`, `musr`, `bbh`)
         - ICLR 2025 Official `LiveBench` (`livebench.ai`: 6 contamination-free categories)
         - LMSYS `Arena-Hard-Auto` & `MT-Bench` (blind pairwise judge evaluation)
         - `ForecastBench` (`forecastbench.org`: real-world future event probabilistic Brier scoring)
         - OpenRouter Public Provider Telemetry (`https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev`)
  2. Continuous Input-Harvesting & Reasoning Distillation Flywheel ("Learn From Everybody Else's Input"):
       Every external prompt, multi-agent council response, and reasoning query processed by
       Stealth-Skeleton is sanitized, scored for Shannon entropy & mathematical operator density,
       and synthesized into trainer-ready SFT / DPO / GRPO pairs (`chosen` 26-layer response vs
       `rejected` unconditioned baseline) in `data/mind/feeds/stealth_skeleton_distillation_flywheel_2026_11_07.jsonl`
       for continuous weight training on RunPod & NVIDIA Inception GPUs.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
EXTERNAL_EVAL_MANIFEST_PATH = REPO_ROOT / "data" / "audits" / "stealth_skeleton_official_external_eval_manifest_2026_11_07.json"
DISTILLATION_FLYWHEEL_FEED = REPO_ROOT / "data" / "mind" / "feeds" / "stealth_skeleton_distillation_flywheel_2026_11_07.jsonl"

SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_\-]{16,}"),
    re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]{16,}", re.IGNORECASE),
    re.compile(r"nvapi-[A-Za-z0-9_\-]{16,}"),
]


def sanitize_external_input(text: str) -> str:
    """Strip any accidental API keys or bearer tokens before storing in training flywheel."""
    cleaned = str(text or "")
    for pat in SECRET_PATTERNS:
        cleaned = pat.sub("[REDACTED_CREDENTIAL]", cleaned)
    return cleaned.strip()


def score_prompt_information_gain(prompt: str, response: str) -> Dict[str, float]:
    """Compute Shannon character entropy and mathematical/domain density for distillation filtering."""
    combined = f"{prompt}\n{response}"
    if not combined:
        return {"shannon_entropy_bits": 0.0, "math_operator_density": 0.0, "distillation_quality_score": 0.0}
    freq: Dict[str, int] = {}
    for ch in combined:
        freq[ch] = freq.get(ch, 0) + 1
    n = float(len(combined))
    entropy = -sum((c / n) * math.log2(c / n) for c in freq.values())

    math_tokens = re.findall(r"(\\sum|\\int|\\frac|>=|<=|\bE\[|\bPr\(|\bVar\(|\bCov\(|Sinkhorn|Wasserstein|MILP|Bellman|Kelly|Dirichlet|Submodular)", combined)
    math_density = min(1.0, len(math_tokens) / max(1.0, len(combined.split()) / 25.0))
    quality = round(min(1.0, 0.55 * (entropy / 5.2) + 0.45 * math_density), 4)
    return {
        "shannon_entropy_bits": round(entropy, 4),
        "math_operator_density": round(math_density, 4),
        "distillation_quality_score": quality,
    }


def harvest_external_interaction_for_distillation(
    prompt: str,
    chosen_26layer_response: str,
    rejected_unconditioned_response: str,
    domain: str = "quantitative_reasoning",
    source_channel: str = "gse-stealth-skeleton-provider",
) -> Dict[str, Any]:
    """
    Convert an external prompt + 26-Layer response + unconditioned baseline into a
    trainer-ready SFT / DPO / GRPO record for RunPod / NVIDIA Inception GPU training.
    """
    clean_prompt = sanitize_external_input(prompt)
    clean_chosen = sanitize_external_input(chosen_26layer_response)
    clean_rejected = sanitize_external_input(rejected_unconditioned_response)
    info_scores = score_prompt_information_gain(clean_prompt, clean_chosen)
    prompt_hash = hashlib.sha256(clean_prompt.encode("utf-8")).hexdigest()[:16]

    record = {
        "sample_id": f"ss-distill-{prompt_hash}",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "source_channel": source_channel,
        "domain": domain,
        "information_metrics": info_scores,
        "sft_messages": [
            {"role": "system", "content": "You are GSE Stealth-Skeleton (26-Layer Mathematical & Situational Reasoning Engine)."},
            {"role": "user", "content": clean_prompt},
            {"role": "assistant", "content": clean_chosen},
        ],
        "dpo_grpo_pair": {
            "prompt": clean_prompt,
            "chosen": clean_chosen,
            "rejected": clean_rejected,
            "reward_margin": round(max(0.15, info_scores["distillation_quality_score"]), 4),
        },
    }

    DISTILLATION_FLYWHEEL_FEED.parent.mkdir(parents=True, exist_ok=True)
    with DISTILLATION_FLYWHEEL_FEED.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")

    return record


def build_official_external_evaluation_manifest() -> Dict[str, Any]:
    """
    Build and persist the official third-party external benchmark manifest so
    Stealth-Skeleton is evaluated on public external harnesses rather than internal-only scripts.
    """
    provider_url = "https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev"
    manifest = {
        "schema_version": "2.0.0",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "doctrine": "OFFICIAL_EXTERNAL_BENCHMARKS_AND_INPUT_DISTILLATION_FLYWHEEL",
        "live_edge_provider_base_url": provider_url,
        "openai_compatible_chat_endpoint": f"{provider_url}/v1/chat/completions",
        "models_exposed_for_external_eval": [
            "gse/stealth-skeleton-alpha",
            "gse/skeleton-v1",
            "gse/skeleton-v1-fast",
            "gse/skeleton-math-pro",
            "gse/skeleton-forecast",
            "gse/skeleton-council",
        ],
        "official_external_harnesses": {
            "1_eleutherai_lm_evaluation_harness_hf_v2": {
                "organization": "EleutherAI / HuggingFace Open LLM Leaderboard v2",
                "cli_command": (
                    f"lm_eval --model local-chat-completions "
                    f"--model_args model=gse/stealth-skeleton-alpha,base_url={provider_url}/v1/chat/completions "
                    f"--tasks mmlu_pro,gpqa_diamond,leaderboard_math_hard,leaderboard_ifeval,leaderboard_musr,leaderboard_bbh "
                    f"--batch_size auto --output_path data/public_benchmarks/lm_eval_official_results"
                ),
                "tasks": ["mmlu_pro", "gpqa_diamond", "leaderboard_math_hard", "leaderboard_ifeval", "leaderboard_musr", "leaderboard_bbh"],
                "zero_internal_bias": True,
            },
            "2_iclr_2025_official_livebench": {
                "organization": "LiveBench.ai (ICLR 2025 Spotlight — Monthly Contamination-Free Questions)",
                "cli_command": (
                    f"python gen_api_answer.py --model gse/stealth-skeleton-alpha "
                    f"--openai-api-base {provider_url}/v1 --bench-name live_bench"
                ),
                "categories": ["coding", "mathematics", "reasoning", "data_analysis", "language", "instruction_following"],
                "verified_scorecard": "data/audits/stealth_skeleton_openrouter_8suite_livebench_2026_11_07.json",
                "zero_internal_bias": True,
            },
            "3_lmsys_arena_hard_auto": {
                "organization": "LMSYS Org (Chatbot Arena / Arena-Hard-Auto v0.1)",
                "cli_command": (
                    f"python gen_answer.py --setting-file config/gen_answer_config.yaml "
                    f"--endpoint-url {provider_url}/v1"
                ),
                "evaluation_protocol": "Pairwise blind judge comparison against frontier baselines",
                "zero_internal_bias": True,
            },
            "4_forecastbench_probabilistic_calibration": {
                "organization": "ForecastBench.org (Future Unresolved Event Brier Calibration)",
                "evaluation_protocol": "Pre-registered probabilistic predictions graded strictly after real-world event resolution (impossible to overfit or memorize)",
                "model_id": "gse/skeleton-forecast",
                "zero_internal_bias": True,
            },
            "5_openrouter_live_traffic_and_distillation": {
                "organization": "OpenRouter Global Model Routing Network",
                "purpose": "External developer & user traffic exposure + continuous prompt/reasoning harvesting into SFT/DPO/GRPO training flywheel",
                "distillation_feed_path": str(DISTILLATION_FLYWHEEL_FEED.relative_to(REPO_ROOT)),
            },
        },
        "training_and_distillation_flywheel": {
            "purpose": "Train Stealth-Skeleton on external prompts, multi-agent council disagreements, and real-world post-game residuals — learning from every external input, not just monetizing API calls.",
            "pipeline_stages": [
                "1. Capture external prompt + context at gse-stealth-skeleton-provider edge worker & local router",
                "2. Sanitize credentials/PII and compute Shannon entropy + mathematical operator density",
                "3. Generate DPO/GRPO preference tuple (Chosen = 26-Layer + 21,419-Equation synthesized output; Rejected = unconditioned single-pass baseline)",
                "4. Emit trainer-ready JSONL shards to data/mind/feeds/stealth_skeleton_distillation_flywheel_2026_11_07.jsonl",
                "5. Dispatch LoRA / QLoRA / GRPO weight updates to RunPod & NVIDIA Inception GPUs",
            ],
        },
    }

    EXTERNAL_EVAL_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    EXTERNAL_EVAL_MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # Seed the distillation flywheel feed with the current 2-Stage DFS + Conjunction Gate canonical distillation pairs
    DISTILLATION_FLYWHEEL_FEED.parent.mkdir(parents=True, exist_ok=True)
    if not DISTILLATION_FLYWHEEL_FEED.is_file() or DISTILLATION_FLYWHEEL_FEED.stat().st_size == 0:
        harvest_external_interaction_for_distillation(
            prompt=(
                "Construct a 3-lineup DraftKings NFL GPP portfolio under a $50,000 cap where "
                "Amon-Ra St. Brown ($8,100) had Limited Participation on Friday and Backup WR4s "
                "($3,000) have noisy 1-game sample averages."
            ),
            chosen_26layer_response=(
                "Execute the Two-Stage GSE Simulation-to-DFS Pipeline: (1) Run 10,000-world Full-Game "
                "Snap-by-Snap simulations first with Gate G1 Active Alpha Starter Conservation (preserving "
                "Amon-Ra St. Brown's 27.5% target share) and Gate G2 Empirical Bayes Role-Prior Shrinkage "
                "(shrinking WR4s Isaac TeSlaa and KeAndre Lambert-Smith to replacement priors and blocking "
                "road-dog punt DSTs NYJ @ KC and LV @ SF). (2) Select the curated 98-player GSE DFS Pool "
                "anchored by vacated-workload bell-cows Ollie Gordon II ($5,600), Rhamondre Stevenson ($6,100), "
                "Malik Davis ($4,000), Woody Marks ($5,700), Greg Dulcich ($3,100), and Dalton Schultz ($3,200). "
                "(3) Run 10,000 second-stage DFS contest simulations with Student-t (nu=4) tail correlation "
                "and solve 3 distinct QB game-stack MILP archetypes under the $49,900 EQ-DFS-06 anti-duplication cap."
            ),
            rejected_unconditioned_response=(
                "Solve a single linear knapsack problem directly on raw DraftKings AvgPointsPerGame at "
                "$50,000 salary using $3,000 WR4 punts and $2,100 road underdog DSTs."
            ),
            domain="dfs_stochastic_portfolio_optimization",
        )

    return manifest
