"""Deep-corpus harvester: open-access books, Zenodo records, dataset inventories.

Different job from harvest_overnight_500.py. That one chased volume of football /
sports-vision papers. This one chases *analytical depth* -- the theory the engine's
equation layer actually consumes: stochastic control, Bayesian nonparametrics,
causal inference, conformal prediction, copulas and tail dependence, filtering and
state space, information theory, off-policy evaluation, optimal transport, rating
systems, survival models.

Three source families:

  * OpenAlex `type:book` + `type:dataset` -- books are the depth play (a monograph
    on copula theory beats 40 conference abstracts), datasets are inventoried so we
    know what exists even when it is not downloadable.
  * Zenodo -- hosts real files, including open datasets and book-length PDFs.
  * Hugging Face datasets -- metadata inventory only; no auth needed for listing.

Rules carried over from the volume harvester because they were right:
  * %PDF magic bytes or it did not happen.
  * Resumable: manifest source_id set + existing files.
  * Per-attempt status logged; no silent skips.
  * Datasets are inventoried, not downloaded, unless they expose a direct PDF.

Usage:
  python scripts/research/harvest_deep_corpus.py --out <staging> \
      --target-pdfs 150 --max-seconds 330
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = "GSE-Deep-Corpus/1.0 (research; contact: galaxysportsedge)"
MAILTO = "[EMAIL]"
MIN_BYTES = 20_000

# Analytical depth, not topic breadth. Each is a field the engine's equation layer
# can actually use.
DEEP_QUERIES: list[tuple[str, str]] = [
    ("stochastic_control", "stochastic optimal control dynamic programming"),
    ("stochastic_control", "Bellman equation Hamilton-Jacobi-Bellman solution"),
    ("stochastic_control", "Markov decision process exact solution"),
    ("bayesian_nonparam", "Bayesian nonparametrics Dirichlet process"),
    ("bayesian_nonparam", "Gaussian process regression convergence"),
    ("bayesian_nonparam", "hierarchical Bayesian partial pooling shrinkage"),
    ("causal_inference", "causal inference do-calculus identifiability"),
    ("causal_inference", "instrumental variables difference-in-differences"),
    ("causal_inference", "causal discovery structural equation models"),
    ("causal_inference", "potential outcomes sensitivity analysis"),
    ("conformal", "conformal prediction distribution-free inference"),
    ("conformal", "quantile regression coverage guarantee"),
    ("copula_tail", "copula theory tail dependence multivariate"),
    ("copula_tail", "extreme value theory multivariate regular variation"),
    ("filtering", "particle filtering sequential Monte Carlo"),
    ("filtering", "Kalman filter state space estimation"),
    ("filtering", "hidden Markov model exact inference"),
    ("information_theory", "information theory entropy rate-distortion"),
    ("information_theory", "f-divergence KL divergence estimation"),
    ("rl_theory", "off-policy evaluation reinforcement learning bounds"),
    ("rl_theory", "inverse reinforcement learning max entropy"),
    ("rl_theory", "multi-armed bandits Thompson sampling regret"),
    ("rl_theory", "contextual bandits exploration exploitation"),
    ("high_dim_stats", "high-dimensional statistics sparse estimation minimax"),
    ("high_dim_stats", "concentration inequalities random matrices"),
    ("graphical_models", "graphical models variational inference"),
    ("graphical_models", "Markov chain Monte Carlo convergence"),
    ("stochastic_calculus", "Ito calculus risk-neutral pricing martingale"),
    ("stochastic_calculus", "stochastic differential equation simulation"),
    ("stochastic_calculus", "jump diffusion Lévy process option pricing"),
    ("timeseries", "changepoint detection sequential analysis"),
    ("timeseries", "spectral analysis nonstationary time series"),
    ("timeseries", "state space forecasting structural model"),
    ("optimal_transport", "optimal transport Wasserstein distance"),
    ("optimal_transport", "Sinkhorn algorithm entropic regularization"),
    ("rating_systems", "Bradley-Terry paired comparison model"),
    ("rating_systems", "Elo rating system statistical properties"),
    ("rating_systems", "ranking models Plackett-Luce estimation"),
    ("survival", "survival analysis hazard model censoring"),
    ("survival", "competing risks cumulative incidence"),
    ("game_theory", "mechanism design auction theory incentive compatibility"),
    ("game_theory", "Nash equilibrium computation complexity"),
    ("decision_theory", "decision theory expected utility ambiguity"),
    ("decision_theory", "proper scoring rules forecast evaluation"),
    ("causal_inference", "difference in differences staggered adoption"),
    ("seasonality", "seasonal adjustment structural time series decomposition"),
]


def _get(url: str, tries: int = 3, timeout: int = 45) -> bytes | None:
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 410, 401):
                return None
            if i == tries - 1:
                return None
            time.sleep(1.3 * (i + 1))
        except Exception:
            if i == tries - 1:
                return None
            time.sleep(1.3 * (i + 1))
    return None


def _j(url: str) -> dict | None:
    raw = _get(url)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _inv_abstract(inv: dict | None) -> str:
    if not inv:
        return ""
    pos = sorted((i, w) for w, idxs in inv.items() for i in idxs)
    return " ".join(w for _, w in pos)[:4000]


def openalex_page(query: str, cursor: str, work_type: str, per_page: int = 200):
    filt = f"is_oa:true,type:{work_type}" if work_type else "is_oa:true"
    url = (f"https://api.openalex.org/works?search={urllib.parse.quote(query)}"
           f"&filter={filt}&per-page={per_page}"
           f"&cursor={urllib.parse.quote(cursor)}&mailto={MAILTO}")
    d = _j(url)
    if not d:
        return [], None
    now = datetime.now(timezone.utc).isoformat()
    out = []
    for w in d.get("results", []):
        loc = w.get("best_oa_location") or {}
        pdf = loc.get("pdf_url") or (w.get("open_access") or {}).get("oa_url")
        if not pdf:
            continue
        out.append({
            "source": "openalex",
            "source_id": (w.get("id") or "").rsplit("/", 1)[-1],
            "doi": w.get("doi"),
            "title": w.get("title") or "",
            "year": w.get("publication_year"),
            "venue": ((w.get("primary_location") or {}).get("source") or {}).get("display_name"),
            "authors": [a.get("author", {}).get("display_name")
                        for a in (w.get("authorships") or [])][:8],
            "cited_by": w.get("cited_by_count"),
            "url": w.get("id"),
            "pdf_url": pdf,
            "abstract": _inv_abstract(w.get("abstract_inverted_index")),
            "work_type": w.get("type"),
            "topic": query,
            "retrieved_at": now,
        })
    return out, (d.get("meta") or {}).get("next_cursor")


def zenodo_page(query: str, page: int = 1, size: int = 50):
    url = (f"https://zenodo.org/api/records?q={urllib.parse.quote(query)}"
           f"&size={size}&page={page}&type=publication&access_status=open")
    d = _j(url)
    if not d:
        return []
    now = datetime.now(timezone.utc).isoformat()
    out = []
    for h in d.get("hits", {}).get("hits", []):
        meta = h.get("metadata") or {}
        pdf = None
        for f in h.get("files", []) or []:
            key = (f.get("key") or "").lower()
            if key.endswith(".pdf"):
                pdf = (f.get("links") or {}).get("self")
                break
        if not pdf:
            continue
        out.append({
            "source": "zenodo",
            "source_id": str(h.get("id")),
            "doi": meta.get("doi"),
            "title": (meta.get("title") or "").strip(),
            "year": int(str(meta.get("publication_date") or "")[:4] or 0) or None,
            "venue": "Zenodo",
            "authors": [c.get("name") for c in (meta.get("creators") or [])][:8],
            "cited_by": None,
            "url": h.get("links", {}).get("self_html"),
            "pdf_url": pdf,
            "abstract": re.sub(r"<[^>]+>", " ", meta.get("description") or "")[:4000],
            "work_type": meta.get("resource_type", {}).get("title"),
            "topic": query,
            "retrieved_at": now,
        })
    return out


def hf_datasets(query: str, limit: int = 50) -> list[dict]:
    url = f"https://huggingface.co/api/datasets?search={urllib.parse.quote(query)}&limit={limit}"
    raw = _get(url)
    if not raw:
        return []
    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        return []
    now = datetime.now(timezone.utc).isoformat()
    return [{
        "source": "huggingface_dataset",
        "source_id": it.get("id"),
        "title": it.get("id"),
        "year": None,
        "authors": [],
        "url": f"https://huggingface.co/datasets/{it.get('id')}",
        "downloads": it.get("downloads"),
        "likes": it.get("likes"),
        "topic": query,
        "retrieved_at": now,
        "inventory_only": True,
    } for it in items]


def openalex_datasets(query: str, cursor: str = "*", per_page: int = 100):
    url = (f"https://api.openalex.org/works?search={urllib.parse.quote(query)}"
           f"&filter=type:dataset&per-page={per_page}&cursor={urllib.parse.quote(cursor)}"
           f"&mailto={MAILTO}")
    d = _j(url)
    if not d:
        return [], None
    now = datetime.now(timezone.utc).isoformat()
    out = [{
        "source": "openalex_dataset",
        "source_id": (w.get("id") or "").rsplit("/", 1)[-1],
        "doi": w.get("doi"),
        "title": w.get("title") or "",
        "year": w.get("publication_year"),
        "venue": "dataset",
        "authors": [a.get("author", {}).get("display_name")
                    for a in (w.get("authorships") or [])][:8],
        "url": w.get("id"),
        "cited_by": w.get("cited_by_count"),
        "topic": query,
        "retrieved_at": now,
        "inventory_only": True,
    } for w in d.get("results", [])]
    return out, (d.get("meta") or {}).get("next_cursor")


def download(rec: dict, pdf_dir: Path) -> tuple[bool, str]:
    url = rec.get("pdf_url")
    if not url:
        return False, "no_url"
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", f"{rec['source']}_{rec['source_id']}")[:110]
    dest = pdf_dir / f"{safe}.pdf"
    if dest.exists() and dest.stat().st_size >= MIN_BYTES:
        rec["pdf_path"] = str(dest)
        rec["sha256"] = hashlib.sha256(dest.read_bytes()).hexdigest()
        return True, "exists"
    raw = _get(url, timeout=90)
    if not raw:
        return False, "fetch_failed"
    if not raw.startswith(b"%PDF"):
        return False, f"not_pdf:{raw[:4]!r}"
    if len(raw) < MIN_BYTES:
        return False, "too_small"
    dest.write_bytes(raw)
    rec["pdf_path"] = str(dest)
    rec["sha256"] = hashlib.sha256(raw).hexdigest()
    rec["pdf_bytes"] = len(raw)
    return True, "downloaded"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--target-pdfs", type=int, default=150)
    ap.add_argument("--max-seconds", type=int, default=330)
    ap.add_argument("--max-attempts", type=int, default=1200)
    ap.add_argument("--pages-per-query", type=int, default=2)
    ap.add_argument("--inventory-only", action="store_true")
    args = ap.parse_args(argv)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pdf_dir = out / "pdfs"
    pdf_dir.mkdir(exist_ok=True)
    manifest = out / "manifest.jsonl"
    inv_path = out / "datasets_inventory.jsonl"
    stats_path = out / "deep_progress.json"

    seen: set[str] = set()
    if manifest.exists():
        for line in manifest.read_text(encoding="utf-8").splitlines():
            try:
                seen.add(json.loads(line)["source_id"])
            except Exception:
                continue
    have = sum(1 for _ in pdf_dir.glob("*.pdf"))
    started = time.time()
    stats = {"started_at": datetime.now(timezone.utc).isoformat(),
             "target": args.target_pdfs, "pdfs_at_start": have,
             "new_records": 0, "attempts": 0, "pdf_ok": 0, "pdf_fail": 0,
             "dataset_inventory": 0, "by_source": {}, "stop_reason": ""}

    def save():
        stats["elapsed_s"] = round(time.time() - started, 1)
        stats["pdfs_total"] = have + stats["pdf_ok"]
        stats_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    def ok_budget():
        return (stats["pdf_ok"] < args.target_pdfs
                and stats["attempts"] < args.max_attempts
                and (time.time() - started) < args.max_seconds)

    with manifest.open("a", encoding="utf-8") as fh, \
         inv_path.open("a", encoding="utf-8") as inv:

        def handle(recs, download_pdfs=True):
            for r in recs:
                sid = r.get("source_id")
                if not sid or sid in seen:
                    continue
                seen.add(sid)
                if r.get("inventory_only"):
                    inv.write(json.dumps(r, ensure_ascii=False) + "\n")
                    stats["dataset_inventory"] += 1
                    continue
                if download_pdfs and not args.inventory_only and ok_budget():
                    stats["attempts"] += 1
                    ok, status = download(r, pdf_dir)
                    if ok:
                        stats["pdf_ok"] += 1
                        src = r["source"]
                        stats["by_source"][src] = stats["by_source"].get(src, 0) + 1
                    else:
                        stats["pdf_fail"] += 1
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                stats["new_records"] += 1
            fh.flush()
            inv.flush()

        # ---- 1. datasets inventory first (cheap, no downloads) ------------
        for tag in ("american football tracking", "sports video", "NFL"):
            for q in [tag]:
                recs, _ = openalex_datasets(q)
                handle(recs, download_pdfs=False)
                for hd in hf_datasets(q):
                    handle([hd], download_pdfs=False)
                save()
                print(f"  inventory[{q}]: {stats['dataset_inventory']} dataset records", flush=True)

        # ---- 2. books (depth) ---------------------------------------------
        for tag, query in DEEP_QUERIES:
            if not ok_budget():
                break
            cursor = "*"
            for _ in range(args.pages_per_query):
                if not ok_budget():
                    break
                recs, cursor = openalex_page(query, cursor, "book")
                if not recs:
                    break
                handle(recs)
                save()
                print(f"[book:{tag}] {query[:52]:<52} ok={stats['pdf_ok']} "
                      f"fail={stats['pdf_fail']}", flush=True)
                if not cursor:
                    break
                time.sleep(0.25)

            # ---- 3. Zenodo -------------------------------------------------
            if ok_budget():
                z = zenodo_page(query)
                if z:
                    handle(z)
                    save()
                    print(f"[zenodo:{tag}] {len(z)} recs ok={stats['pdf_ok']}", flush=True)
                time.sleep(0.4)

        # ---- 4. articles in the same deep topics ---------------------------
        for tag, query in DEEP_QUERIES:
            if not ok_budget():
                break
            recs, cursor = openalex_page(query, "*", "")
            if recs:
                handle(recs)
                save()
                print(f"[article:{tag}] {query[:48]:<48} ok={stats['pdf_ok']}", flush=True)
            time.sleep(0.25)

    stats["stop_reason"] = ("target_reached" if stats["pdf_ok"] >= args.target_pdfs
                            else "attempt_cap" if stats["attempts"] >= args.max_attempts
                            else "time_cap" if (time.time() - started) >= args.max_seconds
                            else "queries_exhausted")
    save()
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
