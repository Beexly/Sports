#!/usr/bin/env python3
"""
Quote-verified parameter extraction for the engine research wiring.

Why this exists: a regex over `key_metrics_and_variables` produced 37 "shrinkage_k"
hits that were actually `k = 17` keypoint counts in computer-vision papers. Pattern
matching fabricates. This pass asks the model, then VERIFIES the answer against the
source text:

  a value is accepted only if the model's quoted sentence appears verbatim in the
  paper text we extracted.

Anything that fails the containment check is dropped, no matter how plausible.
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path

CATALOG = Path(r"C:\Users\Garrett\jev-pipeline\extracted_research_data.jsonl")
OUTDIR = Path(r"C:\Users\Garrett\Sports\packages\prediction-engine\src\research")
EVIDENCE = OUTDIR / "research-evidence.json"
VERIFIED = OUTDIR / "research-params-verified.jsonl"
FAILED = OUTDIR / "research-params-failed.jsonl"
TRACKER = OUTDIR / "processed_params.txt"
PDF_ROOT = r"G:\My Drive\GSE-Ultra-30TB-Vault"

SLOTS = ["regression_games", "league_prior_ppr", "shrinkage_k",
         "recency_half_life", "calibration_bins", "brier_target"]

# A paper that never mentions one of these cannot state one of our slots.
PREFILTER = re.compile(
    r"shrink|empirical bayes|empirical-bayes|prior|half[- ]life|"
    r"brier|reliability bin|calibration bin|regression to|regress(ed)? toward",
    re.IGNORECASE,
)

PROMPT = """You extract numeric parameters from a research paper for a sports projection engine.

Read the text and report ONLY parameters the paper explicitly states with a number.

Target slots (report only these, exact names):
- regression_games: a pseudo-count / pseudo-games constant used to regress an estimate toward a prior
- league_prior_ppr: a league-average prior value used as a shrinkage target
- shrinkage_k: an empirical-Bayes or Bayesian shrinkage constant k
- recency_half_life: a half-life for exponential recency weighting
- calibration_bins: number of bins used in a reliability/calibration analysis
- brier_target: a stated Brier score or Brier skill score value

RULES:
- Report a slot ONLY if the paper states a number for it. Otherwise omit it entirely.
- For each reported slot you MUST quote, verbatim and contiguously, the sentence from
  the text that contains the number. The quote is checked against the source; a quote
  that does not appear verbatim invalidates the entry.
- Never infer, average, round, or convert. Copy the number as printed.

Return a JSON object: {"parameters": [{"slot": "...", "value": 0.0, "quote": "..."}]}
If nothing qualifies, return {"parameters": []}.

TEXT:
---
{text}
---
"""


def load_key() -> str:
    env = Path(r"C:\Users\Garrett\AppData\Local\hermes\.env")
    for line in env.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.startswith("DEEPSEEK_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("DEEPSEEK_API_KEY not found")


def model_call(text: str, key: str) -> dict:
    import urllib.request
    payload = {
        "model": "deepseek-flash",
        "messages": [{"role": "user", "content": PROMPT.format(text=text[:60000])}],
        "temperature": 0,
    }
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        body = json.loads(r.read())
    content = body["choices"][0]["message"]["content"]
    start, end = content.find("{"), content.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON in model output")
    return json.loads(content[start:end + 1])


def norm(s: str) -> str:
    """Whitespace-collapsed comparison text: quotes may differ only in spacing."""
    return re.sub(r"\s+", " ", s or "").strip().lower()


def main() -> None:
    import sys
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    key = load_key()
    OUTDIR.mkdir(parents=True, exist_ok=True)
    for p in (VERIFIED, FAILED):
        p.touch()

    done = set()
    if TRACKER.exists():
        done = {l.strip() for l in TRACKER.read_text(encoding="utf-8").splitlines() if l.strip()}

    rows = []
    for line in CATALOG.read_text(encoding="utf-8", errors="ignore").splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r["file_path"] in done:
            continue
        rows.append(r)
    if limit:
        rows = rows[:limit]

    print(f"candidates to consider: {len(rows)}", flush=True)
    tried = skipped = verified_rows = verified_params = 0

    for i, r in enumerate(rows, 1):
        path = r["file_path"]
        rel = os.path.relpath(path, PDF_ROOT).replace("\\", "/")
        text = (r.get("data") or {})
        blob = " ".join(str(text.get(k) or "") for k in
                        ("paper_title", "core_methodology", "key_metrics_and_variables"))
        tried += 1
        try:
            if not PREFILTER.search(blob):
                skipped += 1
                with open(TRACKER, "a", encoding="utf-8") as fh:
                    fh.write(path + "\n")
                continue

            result = model_call(blob, key)
            accepted = []
            for item in result.get("parameters", []):
                slot = item.get("slot")
                val = item.get("value")
                quote = item.get("quote") or ""
                if slot not in SLOTS or not isinstance(val, (int, float)):
                    continue
                # THE GATE: the quote must exist verbatim (whitespace-normalised) in the source
                if quote and norm(quote) and norm(quote) in norm(blob):
                    accepted.append({"name": slot, "value": float(val), "unit": "verified",
                                     "sourceText": quote[:300]})
                else:
                    with open(FAILED, "a", encoding="utf-8") as fh:
                        fh.write(json.dumps({"path": path, "slot": slot, "value": val,
                                             "reason": "quote not found verbatim",
                                             "quote": quote[:200]}, ensure_ascii=False) + "\n")
            if accepted:
                with open(VERIFIED, "a", encoding="utf-8") as fh:
                    fh.write(json.dumps({"file_path": path, "paper_title": text.get("paper_title"),
                                         "parameters": accepted}, ensure_ascii=False) + "\n")
                verified_rows += 1
                verified_params += len(accepted)
                print(f"  OK {Path(path).name}: {[a['name'] for a in accepted]}", flush=True)
        except Exception as e:
            with open(FAILED, "a", encoding="utf-8") as fh:
                fh.write(json.dumps({"path": path, "error": str(e)[:200]}, ensure_ascii=False) + "\n")
            print(f"  FAIL {Path(path).name}: {e}", flush=True)
        finally:
            with open(TRACKER, "a", encoding="utf-8") as fh:
                fh.write(path + "\n")
            time.sleep(0.2)

        if i % 25 == 0:
            print(f"  ... {i}/{len(rows)} verified_rows={verified_rows} params={verified_params}", flush=True)

    print(f"\nSUMMARY examined={tried} prefiter_skipped={skipped} "
          f"rows_with_verified={verified_rows} params={verified_params}", flush=True)


if __name__ == "__main__":
    main()
