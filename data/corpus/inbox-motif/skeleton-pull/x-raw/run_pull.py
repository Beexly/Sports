#!/usr/bin/env python3
"""Skeleton pull 2026-11-06 — X lane via Grok x_search (custom.x-ai, grok-4.3).
House method mirrors x-for-you-sweep run_watchlist.py. Stops on 429."""
import json, subprocess, time, os, sys
RAW = os.path.dirname(os.path.abspath(__file__))
BIN = "/home/hatch/workspace/custom-connectors/custom.x-ai/bin/x-ai"

FMT = ("For each post return exactly: (1) status ID, (2) timestamp in GMT, "
       "(3) full verbatim post text, (4) outbound links or 'none', "
       "(5) whether it has an image/chart/video and if so write "
       "'Has image/chart -> IMAGE VALUES UNREADABLE' (do not invent chart values). "
       "Number the posts Post 1 to Post N, newest first. Return nothing else.")

JOBS = [
  # name, prompt
  ("topic-benchmarks",
   "Use x_keyword_search (mode Latest) with query: LLM benchmark evaluation MMLU GPQA lm-eval. "
   "Fetch the 8 most recent substantive posts (this week) about LLM benchmark scores, evaluation harnesses, or leaderboard results. " + FMT),
  ("topic-training",
   "Use x_keyword_search (mode Latest) with query: LLM training RLHF DPO GRPO post-training. "
   "Fetch the 8 most recent substantive posts (this week) about model training methods, RLHF, DPO, GRPO, or fine-tuning research. " + FMT),
  ("topic-continual",
   "Use x_keyword_search (mode Latest) with query: continual learning online learning LLM test-time training. "
   "Fetch the 8 most recent substantive posts (this week) about continual learning, online learning, lifelong learning, or test-time training for language models. " + FMT),
  ("topic-retrieval",
   "Use x_keyword_search (mode Latest) with query: RAG retrieval augmented generation vectorless PageIndex. "
   "Fetch the 8 most recent substantive posts (this week) about retrieval-augmented generation, retrieval systems, or RAG architectures. " + FMT),
  ("topic-forecasting",
   "Use x_keyword_search (mode Latest) with query: forecasting calibration prediction markets Brier conformal prediction. "
   "Fetch the 8 most recent substantive posts (this week) about probabilistic forecasting, calibration, prediction markets, or conformal prediction. " + FMT),
  ("topic-frontier",
   "Use x_keyword_search (mode Latest) with query: frontier model release GPT Claude Gemini Grok benchmark. "
   "Fetch the 8 most recent substantive posts (this week) about frontier model releases, model teardowns, or capability evaluations. " + FMT),
  ("topic-agents",
   "Use x_keyword_search (mode Latest) with query: AI agents framework multi-agent orchestration MCP. "
   "Fetch the 8 most recent substantive posts (this week) about agent systems, agent frameworks, or multi-agent orchestration. " + FMT),
  ("acct-SumerSports",
   "Fetch the 8 most recent posts from @SumerSports in Latest mode using x_keyword_search with query \"from:SumerSports\" and mode Latest. " + FMT),
  ("acct-KoalatyStats",
   "Fetch the 8 most recent posts from @KoalatyStats in Latest mode using x_keyword_search with query \"from:KoalatyStats\" and mode Latest. " + FMT),
  ("acct-The_Coach_A",
   "Fetch the 8 most recent posts from @The_Coach_A in Latest mode using x_keyword_search with query \"from:The_Coach_A\" and mode Latest. " + FMT),
]

for name, prompt in JOBS:
    out_path = os.path.join(RAW, name + ".json")
    err_path = os.path.join(RAW, name + ".err")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 500:
        print(f"SKIP {name} (already pulled)", flush=True)
        continue
    body = json.dumps({"model": "grok-4.3", "input": prompt, "tools": [{"type": "x_search"}]})
    print(f"PULL {name} ...", flush=True)
    try:
        r = subprocess.run([BIN, "POST", "/v1/responses", body], capture_output=True, text=True, timeout=300)
        open(out_path, "w").write(r.stdout)
        open(err_path, "w").write(r.stderr)
        print(f"  -> rc={r.returncode} bytes={len(r.stdout)}", flush=True)
        if "429" in r.stdout or "429" in r.stderr or "rate" in (r.stdout + r.stderr).lower() and "limit" in (r.stdout + r.stderr).lower():
            print("RATE LIMIT DETECTED — STOPPING ALL CALLS", flush=True)
            sys.exit(3)
    except Exception as e:
        open(err_path, "w").write(str(e))
        print(f"  -> EXC {e}", flush=True)
    time.sleep(2)
print("DONE", flush=True)
