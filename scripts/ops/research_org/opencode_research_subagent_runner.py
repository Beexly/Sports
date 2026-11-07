#!/usr/bin/env python3
"""
scripts/ops/research_org/opencode_research_subagent_runner.py
============================================================
Automated Subagent Orchestrator for Galaxy Research Labs & Galaxy Science Institute.

Leverages local OpenCode credentials (~/.local/share/opencode/auth.json) to dispatch
background research tasks (arXiv mining, OpenAlex academic PI mapping, grant proposal
expansion, and Hugging Face dataset documentation) through low-cost/free models
(e.g., deepseek/deepseek-chat, qwen3.8-flash, meta/llama-3.3-70b-instruct).

Zero Gemini subscription token consumption.
"""

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

# Configure utf-8 stdout
sys.stdout.reconfigure(encoding="utf-8")

AUTH_PATH = Path.home() / ".local" / "share" / "opencode" / "auth.json"
REPO_ROOT = Path(__file__).resolve().parents[3]
DOCS_DIR = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-03"


def load_opencode_auth():
    """Load OpenCode provider credentials from ~/.local/share/opencode/auth.json."""
    if not AUTH_PATH.exists():
        return {}
    try:
        with open(AUTH_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[!] Warning: Could not parse {AUTH_PATH}: {e}")
        return {}


def dispatch_subagent_query(prompt: str, model: str = "deepseek/deepseek-chat", max_tokens: int = 1500) -> str:
    """Dispatches a prompt to configured OpenCode inference providers (OpenRouter, Nvidia, AIMLAPI)."""
    auth = load_opencode_auth()
    
    # Priority list of endpoints & providers
    providers = [
        ("openrouter", "https://openrouter.ai/api/v1/chat/completions", model),
        ("nvidia", "https://integrate.api.nvidia.com/v1/chat/completions", "meta/llama-3.3-70b-instruct"),
        ("aimlapi", "https://api.aimlapi.com/v1/chat/completions", "deepseek/deepseek-chat")
    ]
    
    for prov_name, endpoint, target_model in providers:
        if prov_name in auth:
            key = auth[prov_name].get("key") or auth[prov_name].get("apiKey") or auth[prov_name].get("access")
            if not key:
                continue
            try:
                body = json.dumps({
                    "model": target_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0.2
                }).encode("utf-8")
                
                req = urllib.request.Request(
                    endpoint,
                    data=body,
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "User-Agent": "GSE-OpenCode-Subagent/1.0"
                    }
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    rjson = json.loads(resp.read().decode("utf-8"))
                    content = rjson["choices"][0]["message"]["content"]
                    return content
            except Exception as e:
                print(f"[!] Provider {prov_name} error: {e}, falling back to next provider...")
                
    # Fallback to local offline mock / failure message
    return "[!] Error: No configured OpenCode provider succeeded. Verify keys in ~/.local/share/opencode/auth.json"


def run_self_test():
    """Verify connectivity to local OpenCode providers."""
    print("=== OpenCode Research Subagent Self-Test ===")
    auth = load_opencode_auth()
    print(f"Loaded {len(auth)} providers from {AUTH_PATH}: {list(auth.keys())}")
    
    test_prompt = "Return exactly: 'OPENCODE_SUBAGENT_ACTIVE' and the current year."
    res = dispatch_subagent_query(test_prompt, max_tokens=50)
    print(f"Response:\n{res.strip()}\n")
    if "OPENCODE_SUBAGENT_ACTIVE" in res:
        print("[+] Self-test PASSED successfully.")
        return 0
    else:
        print("[!] Self-test warning: expected token missing or fallback reached.")
        return 1


def query_openalex_collaborators(topic: str = "conformal prediction", limit: int = 5):
    """Query OpenAlex API for top prospective US university PIs."""
    print(f"Querying OpenAlex for top academic collaborators on '{topic}'...")
    enc_topic = urllib.parse.quote(topic)
    url = f"https://api.openalex.org/works?search={enc_topic}&filter=from_publication_date:2022-01-01&per_page=20"
    req = urllib.request.Request(url, headers={"User-Agent": "mailto:research@galaxysportsedge.com"})
    
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("results", [])
            print(f"Found {data.get('meta', {}).get('count')} works. Top candidates:")
            
            candidates = []
            for w in results:
                for auth in w.get("authorships", [])[:2]:
                    author_name = auth.get("author", {}).get("display_name")
                    for inst in auth.get("institutions", []):
                        if inst.get("country_code") == "US":
                            candidates.append({
                                "author": author_name,
                                "institution": inst.get("display_name"),
                                "title": w.get("title"),
                                "citations": w.get("cited_by_count", 0),
                                "doi": w.get("doi")
                            })
            
            # Print unique authors sorted by citations
            seen = set()
            count = 0
            for c in sorted(candidates, key=lambda x: -x["citations"]):
                if c["author"] not in seen and count < limit:
                    seen.add(c["author"])
                    count += 1
                    print(f"  * {c['author']} @ {c['institution']} ({c['citations']} cites) — {c['title'][:70]}")
    except Exception as e:
        print(f"[!] OpenAlex API error: {e}")


def main():
    parser = argparse.ArgumentParser(description="GSE OpenCode Research Subagent Runner")
    parser.add_argument("--self-test", action="store_true", help="Run provider connectivity self-test")
    parser.add_argument("--find-pis", type=str, default="", help="Query OpenAlex for academic collaborators by topic")
    parser.add_argument("--prompt", type=str, default="", help="Dispatch an ad-hoc research prompt to local subagent")
    args = parser.parse_args()
    
    if args.self_test:
        sys.exit(run_self_test())
    elif args.find_pis:
        query_openalex_collaborators(args.find_pis)
    elif args.prompt:
        res = dispatch_subagent_query(args.prompt)
        print("\nSubagent Output:\n", res)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
