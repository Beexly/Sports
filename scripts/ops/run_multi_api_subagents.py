"""
Multi-API Subagent Dispatcher for Galaxy Sports Edge & Galaxy Science Institute
Dispatches parallel worker subagents across 3 distinct APIs/models:
1. DeepSeek 4.1 Flash (deepseek/deepseek-v4.1-flash)
2. OpenRouter Crouton (stealth/crouton-alpha)
3. Nvidia Nemotron VL (nvidia/nemotron-3.5-super-vl)
"""

import os
import sys
import json
import time
import ssl
import urllib.request
from concurrent.futures import ThreadPoolExecutor

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
CTX = ssl.create_default_context()

def call_openrouter(model_id: str, prompt: str, system_prompt: str, max_tokens: int = 1500) -> dict:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://galaxysportsedge.com",
        "X-Title": "GSE Autonomous Agent Fleet"
    }
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2
    }
    t0 = time.time()
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120, context=CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - t0
            choice = data["choices"][0]["message"]
            content = choice.get("content")
            if not content or len(content.strip()) == 0:
                content = choice.get("reasoning") or ""
            return {
                "model": model_id,
                "status": "SUCCESS",
                "elapsed_sec": round(elapsed, 2),
                "tokens": data.get("usage", {}).get("total_tokens", 0),
                "response": content
            }
    except Exception as e:
        return {
            "model": model_id,
            "status": "ERROR",
            "elapsed_sec": round(time.time() - t0, 2),
            "error": str(e)
        }

def run_fleet():
    tasks = [
        {
            "id": "agent-deepseek41-engine",
            "model": "deepseek/deepseek-v4.1-flash",
            "role": "Engine Total Wiring & Equation Verification Subagent",
            "system": "You are the Senior Mathematics & Systems Verification Agent for Galaxy Sports Edge. You enforce zero synthetic equations, strict grounding in peer-reviewed literature, and clean mathematical coupling across cognitive router stages.",
            "prompt": """
Audit the equation ingestion architecture for the 1,000-equation matrix in scripts/ops/build_thousand_equation_matrix.py:
1. Explain how to cleanly map the 1,098 CITABLE_VERIFIED records in packages/prediction-engine/data/MIND_CORPUS_3000.jsonl (using parsed_float_magnitude, domain, title, and evidence_quote) to replace all 1,256 placeholder EQ-EXP-* synthetic loops.
2. Specify the mathematical mapping between domain names (e.g., trench_warfare, market_microstructure, qb_decision_tree, coverage_schemes) and the 6 signal family bitmask indices (0..278) in the 288-bit context vector.
3. Validate the positive-part James-Stein shrinkage shrinkage cap (|delta log-odds| <= 0.35) and how it guarantees mathematical stability when aggregating over 1,000 equations.
Provide actionable mathematical specifications for implementation.
""",
            "max_tokens": 3000
        },
        {
            "id": "agent-crouton-x-content",
            "model": "stealth/crouton-alpha",
            "role": "Muse/Motif X/Twitter Bot & Content Lanes Subagent",
            "system": "You are Motif/Muse, the official autonomous voice and distribution director for @GalaxySportsHQ. You write sharp, authoritative, zero-fluff analytics content. You NEVER use emojis except for a single settlement glyph on settlement leads. You NEVER put external links in root tweets (links only in sub-replies). You respect the official 16-5 (+10.45u) / 38-13-1 (+22.85u) verified record.",
            "prompt": """
Design 3 sniper reply drafts for @GalaxySportsHQ targeting high-traffic NFL analytics threads this week:
Target 1: Under a @SamHoppen chart on Pass Rate Over Expected (PROE) vs EPA/play.
Target 2: Under a @FantasyPtsData chart on first-read target share vs Cover-1 man blitz.
Target 3: Under a @PattonAnalytics chart on Pressure-to-Sack conversion rate vs offensive tackle pass block win rate.

For each target:
1. Identify the analytical counter-intuitive angle grounded in GSE 175-snap simulation or trench mechanics.
2. Write the exact tweet copy for Motif/Muse (concise, analytical, 0 emojis, 0 root links, citing verified mechanical film/data).
3. Write the follow-up sub-reply containing the Trench X-Ray link to galaxysportsedge.com.
""",
            "max_tokens": 3000
        },
        {
            "id": "agent-nemotron-gsi-grants",
            "model": "nvidia/nemotron-3.5-super-vl",
            "role": "GSI Research & Fast Grants Verification Subagent",
            "system": "You are the Principal Scientific Reviewer for the Galaxy Science Institute (GSI). You review mathematical proposals and clinical benchmarks for submission to Manifund, SFF, Cosmos, Emergent Ventures, and ONR SBIR.",
            "prompt": """
Audit the GSI research grant application and clinical benchmark package:
1. Review the clinical MIMIC-IV benchmark methodology in packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_real_benchmark.py:
   - Verify why the Cholesky whitening covariance matrix must be fit strictly on the calibration split D_cal rather than the combined dataset, and state the formal proof that fitting on test horizons induces non-exchangeability.
   - Confirm the mathematical guarantees of the Debiased Sinkhorn divergence under covariate shift.
2. Outline the institutional governance narrative for GSI: positioning our dual-use foundational work in Markovian state transitions, Schrodinger bridge trajectory estimation, and conformal inference across both high-frequency physiological monitoring and sports biomechanics.
Provide a clean, publication-grade executive summary for grant committees.
""",
            "max_tokens": 3000
        }
    ]

    print(f"[*] Dispatching {len(tasks)} parallel subagents across distinct APIs...")
    results = {}

    def execute_task(t):
        print(f" -> Starting {t['id']} ({t['model']})...")
        res = call_openrouter(t["model"], t["prompt"], t["system"], t["max_tokens"])
        print(f" <- Finished {t['id']} [{res['status']}] in {res.get('elapsed_sec')}s")
        return t["id"], {**t, "result": res}

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(execute_task, t) for t in tasks]
        for f in futures:
            task_id, data = f.result()
            results[task_id] = data

    # Save structured results
    out_dir = os.path.join("brain", "agent-bus")
    os.makedirs(out_dir, exist_ok=True)
    out_json = os.path.join(out_dir, "MULTI_AGENT_SYNTHESIS_2026_11_04.json")
    out_md = os.path.join(out_dir, "MULTI_AGENT_SYNTHESIS_2026_11_04.md")

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    with open(out_md, "w", encoding="utf-8") as f:
        f.write("# GSE Autonomous Subagent Fleet Synthesis (2026-11-04)\n\n")
        f.write("Executed across 3 distinct frontier model APIs in parallel:\n")
        f.write("- **DeepSeek 4.1 Flash** (`deepseek/deepseek-v4.1-flash`)\n")
        f.write("- **OpenRouter Crouton** (`stealth/crouton-alpha`)\n")
        f.write("- **Nvidia Nemotron VL** (`nvidia/nemotron-3.5-super-vl`)\n\n---\n\n")
        for tid, data in results.items():
            f.write(f"## {data['role']} (`{data['model']}`)\n\n")
            res = data["result"]
            f.write(f"- **Status**: {res['status']}\n")
            f.write(f"- **Elapsed**: {res.get('elapsed_sec')}s\n")
            f.write(f"- **Tokens**: {res.get('tokens')}\n\n")
            f.write(f"### Subagent Findings & Output\n\n")
            f.write(res.get("response", res.get("error", "No output")) + "\n\n---\n\n")

    print(f"[*] Fleet run complete. Saved synthesis to {out_json} and {out_md}")

if __name__ == "__main__":
    run_fleet()
