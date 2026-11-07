#!/usr/bin/env python3
"""Skeleton pull 2026-11-06 — X lane, pass 2: OR-syntax topic queries + accounts."""
import json, subprocess, time, os, sys
RAW = os.path.dirname(os.path.abspath(__file__))
BIN = "/home/hatch/workspace/custom-connectors/custom.x-ai/bin/x-ai"
FMT = ("For each post return exactly: (1) status ID, (2) timestamp in GMT, "
       "(3) full verbatim post text, (4) outbound links or 'none', "
       "(5) whether it has an image/chart/video and if so write "
       "'Has image/chart -> IMAGE VALUES UNREADABLE' (do not invent chart values). "
       "Number the posts Post 1 to Post N, newest first. Return nothing else. "
       "Use the query string EXACTLY as given, do not add date filters. If Latest mode returns nothing, retry the same query in Top mode.")
def topic(name, q, desc):
    return (name, f"Use x_keyword_search with query: {q}. Fetch the 8 most recent substantive posts about {desc}. " + FMT)
def acct(name, h):
    return (name, f"Fetch the 8 most recent posts from @{h} in Latest mode using x_keyword_search with query \"from:{h}\" and mode Latest. " + FMT)
JOBS = [
  topic("topic-benchmarks", "MMLU OR GPQA OR SWE-bench OR HumanEval OR leaderboard", "LLM benchmark scores, evaluation harnesses, or leaderboard results"),
  topic("topic-training", "RLHF OR DPO OR GRPO OR \"fine-tuning\" LLM", "model training methods, RLHF, DPO, GRPO, or fine-tuning research"),
  topic("topic-continual", "\"continual learning\" OR \"test-time training\" OR \"lifelong learning\" LLM", "continual learning, online learning, lifelong learning, or test-time training for language models"),
  topic("topic-retrieval", "RAG OR \"retrieval-augmented\" OR PageIndex", "retrieval-augmented generation, retrieval systems, or RAG architectures"),
  topic("topic-frontier", "\"GPT-5\" OR \"Gemini 3\" OR \"Claude Opus\" OR \"Grok 4\" model", "frontier model releases, model teardowns, or capability evaluations"),
  topic("topic-agents", "\"AI agents\" OR \"agent framework\" OR MCP OR orchestration", "agent systems, agent frameworks, or multi-agent orchestration"),
  acct("acct-SumerSports", "SumerSports"),
  acct("acct-KoalatyStats", "KoalatyStats"),
  acct("acct-The_Coach_A", "The_Coach_A"),
]
for name, prompt in JOBS:
    out_path = os.path.join(RAW, name + ".json")
    err_path = os.path.join(RAW, name + ".err")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 500:
        print(f"SKIP {name} (already pulled)", flush=True); continue
    body = json.dumps({"model": "grok-4.3", "input": prompt, "tools": [{"type": "x_search"}]})
    print(f"PULL {name} ...", flush=True)
    try:
        r = subprocess.run([BIN, "POST", "/v1/responses", body], capture_output=True, text=True, timeout=300)
        open(out_path, "w").write(r.stdout); open(err_path, "w").write(r.stderr)
        print(f"  -> rc={r.returncode} bytes={len(r.stdout)}", flush=True)
        blob = (r.stdout + r.stderr).lower()
        if "429" in blob or "rate limit" in blob or "rate_limit" in blob:
            print("RATE LIMIT DETECTED — STOPPING ALL CALLS", flush=True); sys.exit(3)
    except Exception as e:
        open(err_path, "w").write(str(e)); print(f"  -> EXC {e}", flush=True)
    time.sleep(2)
print("DONE", flush=True)
