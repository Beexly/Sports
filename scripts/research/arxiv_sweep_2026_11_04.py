
"""arXiv-only sweep using the working stdio bridge. Complements the OpenAlex v2 run."""
import json, os, sys, time, collections
from datetime import datetime, timezone

sys.path.insert(0, r"C:\c\wt-week8-forensic\scripts\research")
OUT = r"C:\c\wt-week8-forensic\data\research\arxiv_sweep_2026-11-04.jsonl"

QUERIES = [
    "NFL win probability",
    "football player tracking",
    "soccer pose estimation",
    "sports injury prediction",
    "conformal prediction sports",
    "Bayesian sports model",
    "expected points football",
    "sports betting market",
    "football coverage detection",
    "athlete workload monitoring",
    "sports field registration",
    "player performance forecasting",
    # --- expanded domains: second wave (2026-11-04, new topics only) ---
    "large language model alignment safety",
    "quantum computing algorithm optimization",
    "biological modeling machine learning",
    "causal inference large datasets",
    "neuro-symbolic AI hybrid architectures",
    "climate prediction machine learning",
    "federated learning privacy guarantees",
    "compiler optimization deep learning",
    "generative model quantization efficiency",
    "synthetic data computer vision",
    "graph neural network drug discovery",
    "reinforcement learning exploration",
    "foundation model emergent properties",
    "explainable AI robust methods",
    "decentralized autonomous organization governance",
    "retrieval augmented generation knowledge graph",
    "time series anomaly detection",
    "optimal transport machine learning",
    "self-supervised representation learning",
    "multi-agent reinforcement learning cooperation",
    # --- third wave: intersections of AI/OR with sports decision-making ---
    "combinatorial optimization fantasy sports lineup",
    "portfolio optimization sports betting",
    "graph neural network spatiotemporal sports",
    "transformer trajectory prediction sports",
    "diffusion model player movement",
    "causal machine learning player evaluation",
    "counterfactual policy evaluation sports",
    "inverse reinforcement learning coaching",
    "constrained optimization salary cap",
    "stochastic optimization game strategy",
    "Bayesian decision theory sports",
    "multi-objective optimization team selection",
    "market microstructure betting exchange",
    "news sentiment sports prediction",
    "transfer learning cross-sport",
    "domain adaptation sports analytics",
    "semi-supervised learning sports video",
    "weak supervision sports annotation",
    "active learning sports labeling",
    "uncertainty quantification player projection",
    "distribution shift sports modeling",
    "offline reinforcement learning sports",
    "bandit algorithms betting",
    "monte carlo tree search game",
]

def _load_seen_ids(path: str) -> set:
    """Source ids already written to OUT, so re-runs append only new records."""
    seen: set = set()
    if not os.path.exists(path):
        return seen
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except (ValueError, TypeError):
                continue
            sid = str(rec.get("source_id") or "").strip()
            if sid:
                seen.add(sid)
    return seen


def main():
    from arxiv_bridge import ArxivBridge
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    seen_ids = _load_seen_ids(OUT)
    print(f"already seen ids: {len(seen_ids)}")
    total = 0
    per_q = {}
    with ArxivBridge() as ax:
        with open(OUT, "a", encoding="utf-8") as fh:
            for q in QUERIES:
                try:
                    hits = ax.search(q, max_results=25)
                except Exception as e:
                    print(f"  ERROR {q!r}: {e}")
                    per_q[q] = 0
                    continue
                kept = 0
                # arxiv_bridge returns {"papers": [...]} on success, but _unwrap()
                # falls back to a raw string when the server replies with plain
                # text (rate-limit notice, error message). Guard all three shapes
                # so we never iterate a string character-by-character.
                if isinstance(hits, dict):
                    papers = hits.get("papers") or hits.get("results") or []
                elif isinstance(hits, list):
                    papers = hits
                else:
                    print(f"  SKIP {q!r}: non-list reply ({type(hits).__name__}) {str(hits)[:120]}")
                    per_q[q] = 0
                    continue
                for h in papers:
                    if isinstance(h, str):
                        try:
                            h = json.loads(h)
                        except (ValueError, TypeError):
                            continue
                    if not isinstance(h, dict):
                        continue
                    rec = {
                        "source": "arxiv",
                        "source_id": h.get("id") or h.get("arxiv_id") or "",
                        "doi": h.get("doi") or "",
                        "title": h.get("title", ""),
                        "year": (h.get("published") or "")[:4] or None,
                        "venue": "arXiv",
                        "authors": h.get("authors", [])[:6] if isinstance(h.get("authors"), list) else [],
                        "cited_by": 0,
                        "url": h.get("url") or h.get("link") or "",
                        "pdf_url": h.get("pdf_url") or "",
                        "abstract": (h.get("summary") or h.get("abstract") or "")[:2000],
                        "topics": h.get("categories", []) if isinstance(h.get("categories"), list) else [],
                        "query": q,
                        "retrieved_at": datetime.now(timezone.utc).isoformat(),
                        "full_text": None,
                    }
                    sid = str(rec.get("source_id") or "").strip()
                    if sid and sid in seen_ids:
                        continue  # idempotent: already captured on a prior run
                    fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    if sid:
                        seen_ids.add(sid)
                    kept += 1
                per_q[q] = kept
                total += kept
                print(f"[{q}] {kept}")
                time.sleep(0.5)
    print()
    print("TOTAL arXiv records:", total)
    print(per_q)

if __name__ == "__main__":
    main()
