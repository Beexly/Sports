# Provenance: c06 deep research buildable-systems.md §2 (story_cluster_id) and B5.
# Research basis: LEAP dependency clustering (0440 — removing it drove
# ECE 0.088→0.158, the strongest ablation after the prior); registry post-ID
# dedup rule. sklearn allowed in v1.

"""Story clustering: near-duplicate items -> story_cluster_id.

One representative per cluster feeds the aggregator (LEAP dependency-clustering
analog). Method: TF-IDF cosine on quote_text/text + Jaccard on normalized
quotes, union-find, deterministic cluster IDs.
"""

from __future__ import annotations

import hashlib
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .models import TrustSignal

COSINE_THRESHOLD = 0.6   # INFERENCE: near-dup threshold on TF-IDF cosine
JACCARD_THRESHOLD = 0.8  # INFERENCE: near-dup threshold on normalized quotes


def normalize_quote(text: str | None) -> str:
    """Lowercase, strip punctuation/extra whitespace — Jaccard input."""
    if not text:
        return ""
    t = text.lower()
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    return " ".join(t.split())


def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a.split()), set(b.split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _cluster_text(sig: TrustSignal) -> str:
    return sig.quote_text or sig.text or ""


class _UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[max(ra, rb)] = min(ra, rb)


def assign_story_clusters(signals: list[TrustSignal],
                          cosine_threshold: float = COSINE_THRESHOLD,
                          jaccard_threshold: float = JACCARD_THRESHOLD
                          ) -> dict[str, str]:
    """Map signal_id -> story_cluster_id. Deterministic: same inputs -> same IDs.

    Cluster ID = "story_" + sha1 of the sorted member signal_ids (first 12).
    Singletons get their own cluster (they are still one voice — the r19 rule
    counts clusters, not sources).
    """
    n = len(signals)
    if n == 0:
        return {}
    if n == 1:
        return {signals[0].signal_id: _cid([signals[0].signal_id])}

    texts = [_cluster_text(s) for s in signals]
    quotes = [normalize_quote(_cluster_text(s)) for s in signals]

    uf = _UnionFind(n)
    try:
        tfidf = TfidfVectorizer(stop_words="english", max_features=2000).fit_transform(texts)
        cos = cosine_similarity(tfidf)
    except ValueError:
        # Empty vocabulary (all stop-words) — fall back to Jaccard only.
        cos = None

    for i in range(n):
        for j in range(i + 1, n):
            near = False
            if cos is not None and cos[i, j] >= cosine_threshold:
                near = True
            elif _jaccard(quotes[i], quotes[j]) >= jaccard_threshold:
                near = True
            if near:
                uf.union(i, j)

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(uf.find(i), []).append(i)

    out: dict[str, str] = {}
    for members in groups.values():
        member_ids = sorted(signals[i].signal_id for i in members)
        cid = _cid(member_ids)
        for i in members:
            out[signals[i].signal_id] = cid
    return out


def _cid(member_ids: list[str]) -> str:
    return "story_" + hashlib.sha1("|".join(member_ids).encode()).hexdigest()[:12]


def select_representative(cluster: list[TrustSignal],
                          weight_fn=None) -> TrustSignal:
    """One representative per story cluster: max weight, tie-break earliest
    observed_at. weight_fn defaults to magnitude; the pipeline passes
    provider.served_weight for the real τ."""
    weight_fn = weight_fn or (lambda s: s.magnitude)
    return min(cluster, key=lambda s: (-weight_fn(s), s.observed_at))
