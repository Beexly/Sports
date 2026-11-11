#!/usr/bin/env python3
"""
Quote-verified parameter extraction — FULL COVERAGE, every paper.

No prefilter and no shortcut: every paper in the catalog gets its real PDF text
extracted locally and sent to the model. A value is accepted only if the model's
quoted sentence appears verbatim in that paper's own text.

Why the containment gate: a regex pass over summary fields produced 37 "shrinkage_k"
hits that were `k = 17` keypoint counts in computer-vision papers. Pattern matching
fabricates; quoting plus verification does not.
"""
from __future__ import annotations

import json
import os
import re
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

CATALOG = Path(r"C:\Users\Garrett\jev-pipeline\extracted_research_data.jsonl")
OUTDIR = Path(r"C:\Users\Garrett\Sports\packages\prediction-engine\src\research")
VERIFIED = OUTDIR / "research-params-verified.jsonl"
FAILED = OUTDIR / "research-params-failed.jsonl"
TRACKER = OUTDIR / "processed_params.txt"

SLOTS = ["regression_games", "league_prior_ppr", "shrinkage_k",
         "recency_half_life", "calibration_bins", "brier_target"]

MAX_CHARS = 60000
WORKERS = 8
LOCK = threading.Lock()

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
        if line.startswith("OPENROUTER_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("OPENROUTER_API_KEY not found")


def extract_text(path: str) -> str:
    import pymupdf
    doc = pymupdf.open(path)
    try:
        parts = []
        for page in doc:
            parts.append(page.get_text())
            if sum(len(p) for p in parts) > MAX_CHARS:
                break
        return "\n".join(parts).strip()
    finally:
        doc.close()


def model_call(text: str, key: str) -> dict:
    payload = {
        "model": "deepseek/deepseek-v4.1-flash-1017",
        "messages": [{"role": "user", "content": PROMPT.replace("{text}", text)}],
        "temperature": 0,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
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
    return re.sub(r"\s+", " ", s or "").strip().lower()


def append(path: Path, obj: dict) -> None:
    with LOCK:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(obj, ensure_ascii=False) + "\n")


def work(row: dict, key: str) -> dict:
    path = row["file_path"]
    out = {"path": path, "ok": True, "accepted": 0, "rejected": 0, "error": None}
    try:
        text = extract_text(path)
        if len(text) < 200:
            out["error"] = f"no extractable text ({len(text)} chars)"
            out["ok"] = False
            return out
        result = model_call(text, key)
        src = norm(text)
        for item in result.get("parameters", []):
            slot = item.get("slot")
            val = item.get("value")
            quote = item.get("quote") or ""
            if slot not in SLOTS or not isinstance(val, (int, float)):
                continue
            if quote and norm(quote) in src:
                append(VERIFIED, {"file_path": path,
                                  "paper_title": (row.get("data") or {}).get("paper_title"),
                                  "parameters": [{"name": slot, "value": float(val),
                                                  "unit": "verified", "sourceText": quote[:300]}]})
                out["accepted"] += 1
            else:
                append(FAILED, {"path": path, "slot": slot, "value": val,
                                "reason": "quote not found verbatim", "quote": quote[:200]})
                out["rejected"] += 1
    except Exception as e:
        out["ok"] = False
        out["error"] = str(e)[:200]
        append(FAILED, {"path": path, "error": str(e)[:200]})
    return out


def main() -> None:
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
        if r["file_path"] not in done:
            rows.append(r)

    print(f"papers to examine (full coverage): {len(rows)}", flush=True)
    ok = bad = acc = rej = 0
    started = time.time()

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(work, r, key): r for r in rows}
        for i, fut in enumerate(as_completed(futs), 1):
            try:
                res = fut.result()
            except Exception as e:
                res = {"path": str(futs[fut]["file_path"]), "ok": False, "error": str(e)[:200],
                       "accepted": 0, "rejected": 0}
            with LOCK:
                with open(TRACKER, "a", encoding="utf-8") as fh:
                    fh.write(res["path"] + "\n")
            if res["ok"]:
                ok += 1
            else:
                bad += 1
            acc += res["accepted"]
            rej += res["rejected"]
            if i % 25 == 0:
                el = time.time() - started
                rate = i / el * 60 if el else 0
                print(f"  ... {i}/{len(rows)} ok={ok} failed={bad} params={acc} "
                      f"rejected={rej} rate={rate:.1f}/min", flush=True)

    print(f"\nSUMMARY examined={len(rows)} ok={ok} failed={bad} "
          f"verified_params={acc} rejected_quotes={rej} "
          f"elapsed={time.time()-started:.0f}s", flush=True)


if __name__ == "__main__":
    main()
